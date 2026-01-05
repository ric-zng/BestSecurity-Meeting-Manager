# Copyright (c) 2025, Best Security and contributors
# For license information, please see license.txt

"""
Internal Booking Management APIs

These APIs are for authenticated users (System Managers, Department Leaders,
and Department Members) to manage bookings internally:
- Create internal meetings
- Create customer bookings for specific members
- Reassign bookings (drag-and-drop)
- Update booking status
- Manage approvals
"""

import frappe
from frappe import _
from frappe.utils import getdate, get_time, get_datetime, now_datetime
from datetime import datetime, timedelta
from meeting_manager.meeting_manager.utils.validation import check_member_availability
from meeting_manager.meeting_manager.api.assignment import update_member_assignment_tracking
from meeting_manager.meeting_manager.utils.email_notifications import send_booking_confirmation_email


@frappe.whitelist()
def create_internal_meeting(meeting_data):
	"""
	Create an internal meeting between team members

	Permissions:
	- System Manager: Can create meetings for any users
	- Department Leader: Can create meetings involving their department members

	Args:
		meeting_data (dict): {
			"meeting_type": str (Meeting Type ID),
			"participants": list of user IDs,
			"scheduled_date": str (YYYY-MM-DD),
			"scheduled_start_time": str (HH:MM),
			"meeting_agenda": str (optional),
			"meeting_notes": str (optional),
			"location_type": str (optional),
			"meeting_link": str (optional)
		}

	Returns:
		dict: {
			"success": bool,
			"booking_id": str,
			"message": str
		}
	"""
	# Parse data
	if isinstance(meeting_data, str):
		import json
		meeting_data = json.loads(meeting_data)

	# Validate required fields
	required_fields = ["meeting_type", "participants", "scheduled_date", "scheduled_start_time"]
	for field in required_fields:
		if not meeting_data.get(field):
			frappe.throw(_(f"Missing required field: {field}"))

	# Get meeting type
	meeting_type = frappe.get_doc("MM Meeting Type", meeting_data["meeting_type"])

	if not meeting_type.is_internal:
		frappe.throw(_("This meeting type is not configured for internal meetings"))

	# Validate permissions
	if not has_permission_to_create_meeting(meeting_data["participants"]):
		frappe.throw(_("You don't have permission to create meetings for these participants"))

	# Validate date and time
	scheduled_date = getdate(meeting_data["scheduled_date"])
	scheduled_start_time = get_time(meeting_data["scheduled_start_time"])

	if scheduled_date < getdate():
		frappe.throw(_("Cannot schedule meetings in the past"))

	# Calculate end time
	start_datetime = datetime.combine(scheduled_date, scheduled_start_time)
	end_datetime = start_datetime + timedelta(minutes=meeting_type.duration)
	scheduled_end_time = end_datetime.time()

	# Check availability for all participants
	unavailable_participants = []
	for participant_id in meeting_data["participants"]:
		availability = check_member_availability(
			participant_id,
			scheduled_date,
			scheduled_start_time,
			meeting_type.duration
		)

		if not availability["available"]:
			participant_name = frappe.get_value("User", participant_id, "full_name")
			unavailable_participants.append({
				"name": participant_name,
				"reason": availability["reason"]
			})

	if unavailable_participants:
		reasons = ", ".join([f"{p['name']}: {p['reason']}" for p in unavailable_participants])
		frappe.throw(_(f"Some participants are not available: {reasons}"))

	# Primary participant (first in list or current user if not in list)
	primary_participant = meeting_data["participants"][0] if meeting_data["participants"] else frappe.session.user

	# Create booking
	booking = frappe.get_doc({
		"doctype": "MM Meeting Booking",
		"booking_type": "Internal Meeting",
		"department": meeting_type.department,
		"meeting_type": meeting_type.name,
		"assigned_to": primary_participant,

		# Scheduling
		"scheduled_date": scheduled_date,
		"scheduled_start_time": scheduled_start_time,
		"scheduled_end_time": scheduled_end_time,
		"duration": meeting_type.duration,
		"timezone": frappe.get_value("MM Department", meeting_type.department, "timezone") or "UTC",

		# Meeting details
		"location_type": meeting_data.get("location_type", meeting_type.location_type),
		"video_platform": meeting_type.video_platform,
		"meeting_link": meeting_data.get("meeting_link"),
		"meeting_agenda": meeting_data.get("meeting_agenda"),
		"meeting_notes": meeting_data.get("meeting_notes"),

		# Status
		"status": "Confirmed",

		# Assignment
		"assignment_method": "Manual (Internal)"
	})

	# Add participants to child table
	for participant_id in meeting_data["participants"]:
		booking.append("meeting_participants", {
			"participant": participant_id,
			"attendance_status": "Invited"
		})

	# Insert booking
	booking.insert()

	return {
		"success": True,
		"booking_id": booking.name,
		"message": _("Internal meeting created successfully. Invitations will be sent to all participants.")
	}


@frappe.whitelist()
def create_customer_booking_for_member(booking_data):
	"""
	Create a customer booking for a specific member
	(Admin or Department Leader creates on behalf of customer)

	Permissions:
	- System Manager: Can create for any member
	- Department Leader: Can create for members in their departments

	Args:
		booking_data (dict): {
			"department": str (Department ID),
			"meeting_type": str (Meeting Type ID),
			"assigned_to": str (User ID),
			"scheduled_date": str (YYYY-MM-DD),
			"scheduled_start_time": str (HH:MM),
			"customer_name": str,
			"customer_email": str,
			"customer_phone": str,
			"customer_timezone": str (optional),
			"customer_notes": str (optional)
		}

	Returns:
		dict: {
			"success": bool,
			"booking_id": str,
			"message": str
		}
	"""
	# Parse data
	if isinstance(booking_data, str):
		import json
		booking_data = json.loads(booking_data)

	# Validate required fields
	required_fields = [
		"department", "meeting_type", "assigned_to",
		"scheduled_date", "scheduled_start_time",
		"customer_name", "customer_email", "customer_phone"
	]

	for field in required_fields:
		if not booking_data.get(field):
			frappe.throw(_(f"Missing required field: {field}"))

	# Validate permissions
	if not has_permission_to_create_booking_for_member(booking_data["department"], booking_data["assigned_to"]):
		frappe.throw(_("You don't have permission to create bookings for this member"))

	# Get department and meeting type
	department = frappe.get_doc("MM Department", booking_data["department"])
	meeting_type = frappe.get_doc("MM Meeting Type", booking_data["meeting_type"])

	# Validate date and time
	scheduled_date = getdate(booking_data["scheduled_date"])
	scheduled_start_time = get_time(booking_data["scheduled_start_time"])

	if scheduled_date < getdate():
		frappe.throw(_("Cannot schedule bookings in the past"))

	# Calculate end time
	start_datetime = datetime.combine(scheduled_date, scheduled_start_time)
	end_datetime = start_datetime + timedelta(minutes=meeting_type.duration)
	scheduled_end_time = end_datetime.time()

	# Check member availability
	availability = check_member_availability(
		booking_data["assigned_to"],
		scheduled_date,
		scheduled_start_time,
		meeting_type.duration
	)

	if not availability["available"]:
		frappe.throw(_(f"Member is not available at the requested time: {availability['reason']}"))

	# Create booking
	import secrets
	booking = frappe.get_doc({
		"doctype": "MM Meeting Booking",
		"booking_type": "Customer Booking",
		"department": department.name,
		"meeting_type": meeting_type.name,
		"assigned_to": booking_data["assigned_to"],

		# Customer information
		"customer_name": booking_data["customer_name"],
		"customer_email": booking_data["customer_email"],
		"customer_phone": booking_data["customer_phone"],
		"customer_timezone": booking_data.get("customer_timezone", department.timezone),
		"customer_notes": booking_data.get("customer_notes"),

		# Scheduling
		"scheduled_date": scheduled_date,
		"scheduled_start_time": scheduled_start_time,
		"scheduled_end_time": scheduled_end_time,
		"duration": meeting_type.duration,
		"timezone": department.timezone,

		# Meeting details
		"location_type": meeting_type.location_type,
		"video_platform": meeting_type.video_platform,

		# Status
		"status": "Confirmed",
		"requires_approval": False,  # Admin-created bookings don't need approval

		# Assignment
		"assignment_method": "Manual (Admin/Leader)",

		# Security tokens
		"cancel_token": secrets.token_urlsafe(32),
		"reschedule_token": secrets.token_urlsafe(32)
	})

	# Insert booking
	booking.insert()

	# Update member assignment tracking
	update_member_assignment_tracking(department.name, booking_data["assigned_to"])

	return {
		"success": True,
		"booking_id": booking.name,
		"message": _("Customer booking created successfully. Confirmation emails will be sent.")
	}


@frappe.whitelist()
def reassign_booking(booking_id, new_assigned_to, reason=None):
	"""
	Reassign a booking to a different member (drag-and-drop functionality)

	Permissions:
	- System Manager: Can reassign any booking
	- Department Leader: Can reassign bookings in their departments

	Args:
		booking_id (str): Booking ID
		new_assigned_to (str): New member user ID
		reason (str, optional): Reason for reassignment

	Returns:
		dict: {
			"success": bool,
			"message": str,
			"old_assigned_to": str,
			"new_assigned_to": str
		}
	"""
	# Get booking
	booking = frappe.get_doc("MM Meeting Booking", booking_id)

	# Validate permissions
	if not has_permission_to_manage_booking(booking):
		frappe.throw(_("You don't have permission to reassign this booking"))

	# Use booking_status (actual field name)
	if booking.booking_status in ["Cancelled", "Completed"]:
		frappe.throw(_(f"Cannot reassign {booking.booking_status.lower()} bookings"))

	# Get department from meeting type if not directly on booking
	# The 'department' parameter passed from frontend takes precedence
	department_to_check = booking.get("department")
	if not department_to_check and booking.meeting_type:
		department_to_check = frappe.get_value("MM Meeting Type", booking.meeting_type, "department")

	# Log for debugging
	frappe.logger().debug(f"Reassign booking - Department to check: {department_to_check}, New user: {new_assigned_to}")

	# Check if member is in the same department
	if department_to_check:
		# Query to find the member in department
		is_member = frappe.db.exists(
			"MM Department Member",
			{
				"parent": department_to_check,
				"parenttype": "MM Department",
				"member": new_assigned_to,
				"is_active": 1
			}
		)

		# Additional debugging - show what we found
		if not is_member:
			# Get all members to help debug
			all_members = frappe.get_all(
				"MM Department Member",
				filters={"parent": department_to_check, "parenttype": "MM Department"},
				fields=["member", "is_active"]
			)
			frappe.logger().debug(f"Department '{department_to_check}' members: {all_members}")
			frappe.throw(_(f"The new member '{new_assigned_to}' is not an active member of department '{department_to_check}'. Available members: {[m.member for m in all_members if m.is_active]}"))

	# Extract date and time from start_datetime for availability check
	start_dt = get_datetime(booking.start_datetime)
	scheduled_date = start_dt.date()
	scheduled_start_time = start_dt.time()

	# Check new member availability
	availability = check_member_availability(
		new_assigned_to,
		scheduled_date,
		scheduled_start_time,
		booking.duration,
		exclude_booking=booking.name
	)

	if not availability["available"]:
		frappe.throw(_(f"New member is not available at this time: {availability['reason']}"))

	# Get current primary assigned user
	old_assigned_to = None
	primary_host_row = None
	for au in booking.assigned_users:
		if au.is_primary_host:
			old_assigned_to = au.user
			primary_host_row = au
			break

	# Fallback to first user if no primary
	if not old_assigned_to and booking.assigned_users:
		old_assigned_to = booking.assigned_users[0].user
		primary_host_row = booking.assigned_users[0]

	# Update the primary host
	if primary_host_row:
		primary_host_row.user = new_assigned_to
	else:
		# No existing assigned users, create new one
		booking.append("assigned_users", {
			"user": new_assigned_to,
			"is_primary_host": 1,
			"assigned_by": frappe.session.user
		})

	# Add to booking history
	old_member_name = frappe.get_value("User", old_assigned_to, "full_name") if old_assigned_to else "Unknown"
	new_member_name = frappe.get_value("User", new_assigned_to, "full_name")

	booking.append("booking_history", {
		"action": "Reassigned",
		"description": f"Reassigned from {old_member_name} to {new_member_name}",
		"performed_by": frappe.session.user
	})

	booking.save()

	# Update assignment tracking for the new member
	if department_to_check:
		update_member_assignment_tracking(department_to_check, new_assigned_to)

	return {
		"success": True,
		"message": _("Booking reassigned successfully. Notifications will be sent to all parties."),
		"old_assigned_to": old_member_name,
		"new_assigned_to": new_member_name
	}


@frappe.whitelist()
def reschedule_booking_internal(booking_id, new_date, new_time, reason=None):
	"""
	Reschedule a booking to a different date/time (internal use)

	Permissions:
	- System Manager: Can reschedule any booking
	- Department Leader: Can reschedule bookings in their departments
	- Department Member: Can reschedule their own bookings

	Args:
		booking_id (str): Booking ID
		new_date (str): New date (YYYY-MM-DD)
		new_time (str): New time (HH:MM)
		reason (str, optional): Reason for rescheduling

	Returns:
		dict: {
			"success": bool,
			"message": str
		}
	"""
	# Get booking
	booking = frappe.get_doc("MM Meeting Booking", booking_id)

	# Validate permissions
	if not has_permission_to_manage_booking(booking):
		frappe.throw(_("You don't have permission to reschedule this booking"))

	# Use booking_status (actual field name in schema)
	if booking.booking_status in ["Cancelled", "Completed"]:
		frappe.throw(_(f"Cannot reschedule {booking.booking_status.lower()} bookings"))

	# Validate new date and time
	new_scheduled_date = getdate(new_date)
	new_scheduled_start_time = get_time(new_time)

	if new_scheduled_date < getdate():
		frappe.throw(_("Cannot reschedule to a date in the past"))

	# Calculate new end datetime
	new_start_datetime = datetime.combine(new_scheduled_date, new_scheduled_start_time)
	new_end_datetime = new_start_datetime + timedelta(minutes=booking.duration)

	# Get primary assigned user for availability check
	primary_user = None
	if booking.assigned_users:
		for au in booking.assigned_users:
			if au.is_primary_host:
				primary_user = au.user
				break
		# Fallback to first user if no primary
		if not primary_user and len(booking.assigned_users) > 0:
			primary_user = booking.assigned_users[0].user

	# Check availability for primary user
	if primary_user:
		availability = check_member_availability(
			primary_user,
			new_scheduled_date,
			new_scheduled_start_time,
			booking.duration,
			exclude_booking=booking.name
		)

		if not availability["available"]:
			frappe.throw(_(f"Member is not available at the new time: {availability['reason']}"))

	# Store old values
	old_start_datetime = booking.start_datetime
	old_end_datetime = booking.end_datetime

	# Update booking (use actual schema fields: start_datetime and end_datetime)
	booking.start_datetime = new_start_datetime
	booking.end_datetime = new_end_datetime

	# Add to booking history
	booking.append("booking_history", {
		"action": "Rescheduled",
		"description": f"Rescheduled from {old_start_datetime} to {new_start_datetime}",
		"performed_by": frappe.session.user
	})

	booking.save()

	return {
		"success": True,
		"message": _("Booking rescheduled successfully. Notifications will be sent to all parties.")
	}


@frappe.whitelist()
def update_booking_status(booking_id, new_status, notes=None):
	"""
	Update booking status (e.g., mark as completed, no-show)

	Permissions:
	- System Manager: Can update any booking
	- Department Leader: Can update bookings in their departments
	- Department Member: Can update their assigned bookings

	Args:
		booking_id (str): Booking ID
		new_status (str): New status (Confirmed, Cancelled, Completed, No-show)
		notes (str, optional): Notes about status change

	Returns:
		dict: {
			"success": bool,
			"message": str
		}
	"""
	# Get booking
	booking = frappe.get_doc("MM Meeting Booking", booking_id)

	# Validate permissions
	if not has_permission_to_manage_booking(booking):
		frappe.throw(_("You don't have permission to update this booking"))

	# Validate status transition
	valid_statuses = ["Confirmed", "Cancelled", "Completed", "No-show"]
	if new_status not in valid_statuses:
		frappe.throw(_(f"Invalid status. Must be one of: {', '.join(valid_statuses)}"))

	old_status = booking.status

	# Update status
	booking.status = new_status

	# Handle cancellation
	if new_status == "Cancelled":
		booking.cancellation_reason = "Other"
		booking.cancelled_by_role = get_user_role_for_booking(booking)
		booking.cancelled_datetime = now_datetime()
		booking.cancellation_notes = notes

	# Add to booking history
	booking.append("booking_history", {
		"action": f"Status changed to {new_status}",
		"action_by": frappe.session.user,
		"action_by_role": get_user_role_for_booking(booking),
		"action_datetime": now_datetime(),
		"old_value": old_status,
		"new_value": new_status,
		"notes": notes or f"Status changed from {old_status} to {new_status}"
	})

	booking.save()

	return {
		"success": True,
		"message": _(f"Booking status updated to {new_status}. Notifications will be sent as configured.")
	}


# Permission helper functions

def has_permission_to_create_meeting(participants):
	"""Check if current user can create meetings for given participants"""
	if "System Manager" in frappe.get_roles():
		return True

	# Department Leaders can create meetings for their department members
	if "Department Leader" in frappe.get_roles():
		led_departments = frappe.get_all(
			"MM Department",
			filters={"department_leader": frappe.session.user},
			pluck="name"
		)

		if led_departments:
			# Check if all participants are members of led departments
			for participant in participants:
				is_member = frappe.db.exists(
					"MM Department Member",
					{
						"parent": ["in", led_departments],
						"member": participant
					}
				)
				if not is_member:
					return False
			return True

	return False


def has_permission_to_create_booking_for_member(department, member):
	"""Check if current user can create bookings for a specific member"""
	if "System Manager" in frappe.get_roles():
		return True

	# Department Leaders can create bookings for their department members
	if "Department Leader" in frappe.get_roles():
		is_leader = frappe.db.exists(
			"MM Department",
			{"name": department, "department_leader": frappe.session.user}
		)

		if is_leader:
			is_member = frappe.db.exists(
				"MM Department Member",
				{"parent": department, "member": member, "is_active": 1}
			)
			return bool(is_member)

	return False


def has_permission_to_manage_booking(booking):
	"""Check if current user can manage (reassign, reschedule, update) a booking"""
	if "System Manager" in frappe.get_roles():
		return True

	# Get department from meeting type if not directly on booking
	department = booking.get("department")
	if not department and booking.meeting_type:
		department = frappe.get_value("MM Meeting Type", booking.meeting_type, "department")

	# Department Leaders can manage bookings in their departments
	if "Department Leader" in frappe.get_roles() and department:
		is_leader = frappe.db.exists(
			"MM Department",
			{"name": department, "department_leader": frappe.session.user}
		)
		if is_leader:
			return True

	# Department Members can manage their own bookings
	# Check if current user is assigned to this booking
	if booking.assigned_users:
		for au in booking.assigned_users:
			if au.user == frappe.session.user:
				return True

	return False


def get_user_role_for_booking(booking):
	"""Determine the user's role in relation to a booking"""
	if "System Manager" in frappe.get_roles():
		return "System Manager"

	# Get department from meeting type if not directly on booking
	department = booking.get("department")
	if not department and booking.meeting_type:
		department = frappe.get_value("MM Meeting Type", booking.meeting_type, "department")

	if department and frappe.db.exists("MM Department", {"name": department, "department_leader": frappe.session.user}):
		return "Department Leader"

	# Check if user is assigned to this booking
	if booking.assigned_users:
		for au in booking.assigned_users:
			if au.user == frappe.session.user:
				return "Host"

	return "User"


@frappe.whitelist()
def create_self_booking(booking_data):
	"""
	Create a customer booking where the current user is the host
	User selects from their own available time slots to book a meeting with a customer

	Permissions:
	- Any authenticated user who is a member of at least one department

	Args:
		booking_data (dict): {
			"department": str (Department ID),
			"meeting_type": str (Meeting Type ID),
			"scheduled_date": str (YYYY-MM-DD),
			"scheduled_start_time": str (HH:MM),
			"customer_name": str,
			"customer_email": str,
			"customer_phone": str (optional),
			"customer_timezone": str (optional),
			"customer_notes": str (optional),
			"meeting_agenda": str (optional),
			"send_email_notification": bool (optional, default True)
		}

	Returns:
		dict: {
			"success": bool,
			"booking_id": str,
			"message": str
		}
	"""
	# Parse data
	if isinstance(booking_data, str):
		import json
		booking_data = json.loads(booking_data)

	# Validate required fields
	required_fields = [
		"department", "meeting_type",
		"scheduled_date", "scheduled_start_time",
		"customer_name", "customer_email"
	]

	for field in required_fields:
		if not booking_data.get(field):
			frappe.throw(_(f"Missing required field: {field}"))

	# Ensure user is logged in
	if frappe.session.user == "Guest":
		frappe.throw(_("You must be logged in to create self-bookings"))

	current_user = frappe.session.user

	# Check if user is a member of the specified department
	is_member = frappe.db.exists(
		"MM Department Member",
		{
			"parent": booking_data["department"],
			"parenttype": "MM Department",
			"member": current_user,
			"is_active": 1
		}
	)

	if not is_member:
		frappe.throw(_("You are not an active member of the selected department"))

	# Get department and meeting type
	department = frappe.get_doc("MM Department", booking_data["department"])
	meeting_type = frappe.get_doc("MM Meeting Type", booking_data["meeting_type"])

	# Validate that meeting type belongs to the department
	if meeting_type.department != department.name:
		frappe.throw(_("The selected meeting type does not belong to the selected department"))

	# Validate meeting type allows customer bookings
	if meeting_type.is_internal:
		frappe.throw(_("This meeting type is only for internal meetings"))

	# Validate date and time
	scheduled_date = getdate(booking_data["scheduled_date"])
	scheduled_start_time = get_time(booking_data["scheduled_start_time"])

	if scheduled_date < getdate():
		frappe.throw(_("Cannot schedule bookings in the past"))

	# Calculate end time
	start_datetime = datetime.combine(scheduled_date, scheduled_start_time)
	end_datetime = start_datetime + timedelta(minutes=meeting_type.duration)
	scheduled_end_time = end_datetime.time()

	# Check current user's availability
	availability = check_member_availability(
		current_user,
		scheduled_date,
		scheduled_start_time,
		meeting_type.duration
	)

	if not availability["available"]:
		frappe.throw(_(f"You are not available at the selected time: {availability['reason']}"))

	# Generate meeting title
	meeting_title = f"{meeting_type.meeting_name} with {booking_data['customer_name']}"

	# Create booking
	import secrets
	booking = frappe.get_doc({
		"doctype": "MM Meeting Booking",
		"booking_type": "Customer Booking",
		"meeting_title": meeting_title,
		"department": department.name,
		"meeting_type": meeting_type.name,
		"assigned_to": current_user,

		# Customer information
		"customer_name": booking_data["customer_name"],
		"customer_email": booking_data["customer_email"],
		"customer_phone": booking_data.get("customer_phone", ""),
		"customer_timezone": booking_data.get("customer_timezone", department.timezone),
		"customer_notes": booking_data.get("customer_notes"),

		# Scheduling
		"start_datetime": start_datetime,
		"end_datetime": end_datetime,
		"duration": meeting_type.duration,
		"timezone": department.timezone,

		# Meeting details
		"location_type": meeting_type.location_type,
		"video_platform": meeting_type.video_platform,
		"meeting_agenda": booking_data.get("meeting_agenda"),

		# Status
		"status": "Confirmed",
		"requires_approval": False,  # Self-created bookings don't need approval

		# Assignment
		"assignment_method": "Self-Booked",

		# Security tokens
		"cancel_token": secrets.token_urlsafe(32),
		"reschedule_token": secrets.token_urlsafe(32)
	})

	# Add current user as primary assigned user
	booking.append("assigned_users", {
		"user": current_user,
		"is_primary_host": 1,
		"assigned_by": current_user
	})

	# Insert booking
	booking.insert()

	# Update member assignment tracking
	update_member_assignment_tracking(department.name, current_user)

	# Send email notification if requested (default True)
	send_notification = booking_data.get("send_email_notification", True)
	email_result = None

	if send_notification:
		try:
			email_result = send_booking_confirmation_email(booking.name)
		except Exception as e:
			frappe.log_error(
				f"Failed to send confirmation email for self-booking {booking.name}: {str(e)}",
				"Self-Booking Email Error"
			)

	return {
		"success": True,
		"booking_id": booking.name,
		"message": _("Meeting booked successfully!" + (" Confirmation emails will be sent to you and the customer." if send_notification else "")),
		"email_sent": email_result.get("success") if email_result else False
	}


@frappe.whitelist()
def get_user_departments():
	"""
	Get all departments where the current user is an active member

	Returns:
		list: List of departments with details
	"""
	if frappe.session.user == "Guest":
		frappe.throw(_("You must be logged in"))

	# Get all departments where user is an active member
	departments = frappe.db.sql("""
		SELECT
			d.name,
			d.department_name,
			d.department_slug,
			d.timezone,
			dm.total_assignments,
			dm.last_assigned_datetime
		FROM `tabMM Department` d
		INNER JOIN `tabMM Department Member` dm
			ON dm.parent = d.name
			AND dm.parenttype = 'MM Department'
		WHERE dm.member = %s
			AND dm.is_active = 1
		ORDER BY d.department_name
	""", (frappe.session.user,), as_dict=True)

	return departments


@frappe.whitelist()
def get_department_meeting_types_for_self_booking(department):
	"""
	Get all customer-facing meeting types for a department (for self-booking)

	Args:
		department (str): Department ID

	Returns:
		list: List of meeting types
	"""
	if frappe.session.user == "Guest":
		frappe.throw(_("You must be logged in"))

	# Verify user is member of department
	is_member = frappe.db.exists(
		"MM Department Member",
		{
			"parent": department,
			"parenttype": "MM Department",
			"member": frappe.session.user,
			"is_active": 1
		}
	)

	if not is_member:
		frappe.throw(_("You are not a member of this department"))

	# Get customer-facing meeting types
	meeting_types = frappe.get_all(
		"MM Meeting Type",
		filters={
			"department": department,
			"is_internal": 0,  # Only customer-facing types
			"is_active": 1
		},
		fields=[
			"name",
			"meeting_name",
			"meeting_slug",
			"duration",
			"location_type",
			"video_platform",
			"description"
		],
		order_by="meeting_name"
	)

	return meeting_types


@frappe.whitelist()
def get_user_available_slots(department, meeting_type, date):
	"""
	Get available time slots for the current user on a specific date

	Args:
		department (str): Department ID
		meeting_type (str): Meeting Type ID
		date (str): Date in YYYY-MM-DD format

	Returns:
		dict: {
			"available_slots": list of time slots,
			"date": str,
			"is_available": bool
		}
	"""
	from meeting_manager.meeting_manager.utils.validation import check_member_availability

	if frappe.session.user == "Guest":
		frappe.throw(_("You must be logged in"))

	current_user = frappe.session.user

	# Verify user is member of department
	is_member = frappe.db.exists(
		"MM Department Member",
		{
			"parent": department,
			"parenttype": "MM Department",
			"member": current_user,
			"is_active": 1
		}
	)

	if not is_member:
		frappe.throw(_("You are not a member of this department"))

	# Get meeting type details
	mt_doc = frappe.get_doc("MM Meeting Type", meeting_type)

	# Get department timezone
	dept_doc = frappe.get_doc("MM Department", department)
	timezone = dept_doc.timezone or "UTC"

	# Parse date
	check_date = getdate(date)

	# Generate time slots (9 AM to 5 PM in 30-minute intervals by default)
	from datetime import time
	available_slots = []

	# Start from 9:00 AM to 4:30 PM (last slot that can fit a meeting before 5 PM)
	start_hour = 9
	end_hour = 17
	interval_minutes = 30

	current_time = time(start_hour, 0)
	end_time = time(end_hour - 1, 60 - interval_minutes)

	while current_time <= end_time:
		# Check availability for this slot
		availability = check_member_availability(
			current_user,
			check_date,
			current_time,
			mt_doc.duration
		)

		if availability["available"]:
			# Format time as HH:MM
			time_str = current_time.strftime("%H:%M")
			available_slots.append({
				"time": time_str,
				"display": current_time.strftime("%I:%M %p")
			})

		# Move to next slot
		minutes = current_time.hour * 60 + current_time.minute + interval_minutes
		current_time = time(minutes // 60, minutes % 60)

	return {
		"available_slots": available_slots,
		"date": str(check_date),
		"is_available": len(available_slots) > 0,
		"timezone": timezone
	}


@frappe.whitelist()
def get_led_departments():
	"""
	Get all departments where the current user is a leader

	Returns:
		list: List of departments with details
	"""
	if frappe.session.user == "Guest":
		frappe.throw(_("You must be logged in"))

	# System Managers can see all departments
	if "System Manager" in frappe.get_roles():
		departments = frappe.get_all(
			"MM Department",
			fields=["name", "department_name", "department_slug", "timezone"],
			order_by="department_name"
		)
	else:
		# Get departments where user is the leader
		departments = frappe.get_all(
			"MM Department",
			filters={"department_leader": frappe.session.user},
			fields=["name", "department_name", "department_slug", "timezone"],
			order_by="department_name"
		)

	return departments


@frappe.whitelist()
def get_department_members(department):
	"""
	Get all active members of a department (excluding the leader if they want)

	Args:
		department (str): Department ID

	Returns:
		list: List of department members
	"""
	if frappe.session.user == "Guest":
		frappe.throw(_("You must be logged in"))

	# Verify user is leader of department or System Manager
	if "System Manager" not in frappe.get_roles():
		is_leader = frappe.db.exists(
			"MM Department",
			{"name": department, "department_leader": frappe.session.user}
		)
		if not is_leader:
			frappe.throw(_("You are not the leader of this department"))

	# Get department members
	members = frappe.db.sql("""
		SELECT
			dm.member as user_id,
			u.full_name,
			u.email,
			dm.total_assignments,
			dm.is_active
		FROM `tabMM Department Member` dm
		INNER JOIN `tabUser` u ON u.name = dm.member
		WHERE dm.parent = %s
			AND dm.parenttype = 'MM Department'
			AND dm.is_active = 1
		ORDER BY u.full_name
	""", (department,), as_dict=True)

	# Add current user if not already in the list (leader might not be a member)
	current_user_in_list = any(m.user_id == frappe.session.user for m in members)
	if not current_user_in_list:
		current_user_doc = frappe.get_doc("User", frappe.session.user)
		members.insert(0, {
			"user_id": frappe.session.user,
			"full_name": current_user_doc.full_name + " (You)",
			"email": current_user_doc.email,
			"total_assignments": 0,
			"is_active": 1
		})

	return members


@frappe.whitelist()
def get_internal_meeting_types(department):
	"""
	Get all internal meeting types for a department

	Args:
		department (str): Department ID

	Returns:
		list: List of internal meeting types
	"""
	if frappe.session.user == "Guest":
		frappe.throw(_("You must be logged in"))

	# Verify user is leader of department or System Manager
	if "System Manager" not in frappe.get_roles():
		is_leader = frappe.db.exists(
			"MM Department",
			{"name": department, "department_leader": frappe.session.user}
		)
		if not is_leader:
			frappe.throw(_("You are not the leader of this department"))

	# Get internal meeting types
	meeting_types = frappe.get_all(
		"MM Meeting Type",
		filters={
			"department": department,
			"is_internal": 1,  # Only internal meeting types
			"is_active": 1
		},
		fields=[
			"name",
			"meeting_name",
			"meeting_slug",
			"duration",
			"location_type",
			"video_platform",
			"description"
		],
		order_by="meeting_name"
	)

	return meeting_types


@frappe.whitelist()
def get_team_available_slots(department, meeting_type, date, participants):
	"""
	Get available time slots where ALL selected participants are available (AND operation)

	Args:
		department (str): Department ID
		meeting_type (str): Meeting Type ID
		date (str): Date in YYYY-MM-DD format
		participants (str or list): JSON string or list of participant user IDs

	Returns:
		dict: {
			"available_slots": list of time slots where ALL participants are available,
			"date": str,
			"is_available": bool,
			"participants_count": int
		}
	"""
	from meeting_manager.meeting_manager.utils.validation import check_member_availability
	import json

	if frappe.session.user == "Guest":
		frappe.throw(_("You must be logged in"))

	# Parse participants
	if isinstance(participants, str):
		participants = json.loads(participants)

	if not participants or len(participants) == 0:
		frappe.throw(_("Please select at least one participant"))

	# Verify user is leader of department or System Manager
	if "System Manager" not in frappe.get_roles():
		is_leader = frappe.db.exists(
			"MM Department",
			{"name": department, "department_leader": frappe.session.user}
		)
		if not is_leader:
			frappe.throw(_("You are not the leader of this department"))

	# Get meeting type details
	mt_doc = frappe.get_doc("MM Meeting Type", meeting_type)

	# Get department timezone
	dept_doc = frappe.get_doc("MM Department", department)
	timezone = dept_doc.timezone or "UTC"

	# Parse date
	check_date = getdate(date)

	# Generate time slots (9 AM to 5 PM in 30-minute intervals)
	from datetime import time
	available_slots = []

	start_hour = 9
	end_hour = 17
	interval_minutes = 30

	current_time = time(start_hour, 0)
	end_time = time(end_hour - 1, 60 - interval_minutes)

	while current_time <= end_time:
		# Check if ALL participants are available at this time slot (AND operation)
		all_available = True
		unavailable_participants = []

		for participant_id in participants:
			availability = check_member_availability(
				participant_id,
				check_date,
				current_time,
				mt_doc.duration
			)

			if not availability["available"]:
				all_available = False
				participant_name = frappe.get_value("User", participant_id, "full_name")
				unavailable_participants.append({
					"name": participant_name,
					"reason": availability["reason"]
				})

		# Only add slot if ALL participants are available
		if all_available:
			time_str = current_time.strftime("%H:%M")
			available_slots.append({
				"time": time_str,
				"display": current_time.strftime("%I:%M %p")
			})

		# Move to next slot
		minutes = current_time.hour * 60 + current_time.minute + interval_minutes
		current_time = time(minutes // 60, minutes % 60)

	return {
		"available_slots": available_slots,
		"date": str(check_date),
		"is_available": len(available_slots) > 0,
		"timezone": timezone,
		"participants_count": len(participants)
	}


@frappe.whitelist()
def create_team_meeting(meeting_data):
	"""
	Create an internal team meeting by a Department Leader

	Permissions:
	- Department Leader: Can create meetings for their department members
	- System Manager: Can create meetings for any department

	Args:
		meeting_data (dict): {
			"department": str (Department ID),
			"meeting_type": str (Meeting Type ID),
			"scheduled_date": str (YYYY-MM-DD),
			"scheduled_start_time": str (HH:MM),
			"participants": list of user IDs,
			"meeting_agenda": str (optional),
			"meeting_notes": str (optional),
			"location_type": str (optional),
			"meeting_link": str (optional),
			"send_email_notification": bool (optional, default True)
		}

	Returns:
		dict: {
			"success": bool,
			"booking_id": str,
			"message": str
		}
	"""
	# Parse data
	if isinstance(meeting_data, str):
		import json
		meeting_data = json.loads(meeting_data)

	# Validate required fields
	required_fields = ["department", "meeting_type", "scheduled_date", "scheduled_start_time", "participants"]
	for field in required_fields:
		if not meeting_data.get(field):
			frappe.throw(_(f"Missing required field: {field}"))

	# Ensure user is logged in
	if frappe.session.user == "Guest":
		frappe.throw(_("You must be logged in to create team meetings"))

	current_user = frappe.session.user
	department = meeting_data["department"]

	# Verify user is leader of department or System Manager
	if "System Manager" not in frappe.get_roles():
		is_leader = frappe.db.exists(
			"MM Department",
			{"name": department, "department_leader": current_user}
		)
		if not is_leader:
			frappe.throw(_("You are not the leader of this department"))

	# Get department and meeting type
	department_doc = frappe.get_doc("MM Department", department)
	meeting_type = frappe.get_doc("MM Meeting Type", meeting_data["meeting_type"])

	# Validate that meeting type belongs to the department
	if meeting_type.department != department:
		frappe.throw(_("The selected meeting type does not belong to the selected department"))

	# Validate meeting type is for internal meetings
	if not meeting_type.is_internal:
		frappe.throw(_("This meeting type is not configured for internal meetings"))

	# Validate date and time
	scheduled_date = getdate(meeting_data["scheduled_date"])
	scheduled_start_time = get_time(meeting_data["scheduled_start_time"])

	if scheduled_date < getdate():
		frappe.throw(_("Cannot schedule meetings in the past"))

	# Calculate end time
	start_datetime = datetime.combine(scheduled_date, scheduled_start_time)
	end_datetime = start_datetime + timedelta(minutes=meeting_type.duration)
	scheduled_end_time = end_datetime.time()

	participants = meeting_data["participants"]
	if not participants or len(participants) == 0:
		frappe.throw(_("Please select at least one participant"))

	# Check availability for all participants (AND operation)
	unavailable_participants = []
	for participant_id in participants:
		availability = check_member_availability(
			participant_id,
			scheduled_date,
			scheduled_start_time,
			meeting_type.duration
		)

		if not availability["available"]:
			participant_name = frappe.get_value("User", participant_id, "full_name")
			unavailable_participants.append({
				"name": participant_name,
				"reason": availability["reason"]
			})

	if unavailable_participants:
		reasons = ", ".join([f"{p['name']}: {p['reason']}" for p in unavailable_participants])
		frappe.throw(_(f"Some participants are not available: {reasons}"))

	# Generate meeting title
	participant_count = len(participants)
	meeting_title = f"{meeting_type.meeting_name} - Team Meeting ({participant_count} participants)"

	# Create booking with current user (leader) as the host
	import secrets
	booking = frappe.get_doc({
		"doctype": "MM Meeting Booking",
		"booking_type": "Internal Meeting",
		"is_internal": 1,  # Mark as internal meeting
		"meeting_title": meeting_title,
		"department": department,
		"meeting_type": meeting_type.name,
		"assigned_to": current_user,  # Leader is the host

		# Scheduling
		"start_datetime": start_datetime,
		"end_datetime": end_datetime,
		"duration": meeting_type.duration,
		"timezone": department_doc.timezone,

		# Meeting details
		"location_type": meeting_data.get("location_type", meeting_type.location_type),
		"video_platform": meeting_type.video_platform,
		"meeting_link": meeting_data.get("meeting_link"),
		"meeting_agenda": meeting_data.get("meeting_agenda"),
		"meeting_notes": meeting_data.get("meeting_notes"),

		# Status
		"status": "Confirmed",
		"requires_approval": False,

		# Assignment
		"assignment_method": "Team Meeting (Leader)",

		# Security tokens
		"cancel_token": secrets.token_urlsafe(32),
		"reschedule_token": secrets.token_urlsafe(32)
	})

	# Add all participants to the participants child table
	for participant_id in participants:
		participant_doc = frappe.get_doc("User", participant_id)
		booking.append("participants", {
			"participant_type": "Internal",
			"user": participant_id,
			"email": participant_doc.email,
			"response_status": "Pending"
		})

	# Add leader as primary assigned user
	booking.append("assigned_users", {
		"user": current_user,
		"is_primary_host": 1,
		"assigned_by": current_user
	})

	# Insert booking
	booking.insert()

	# Update assignment tracking for leader
	update_member_assignment_tracking(department, current_user)

	# Send email notifications if requested (default True)
	send_notification = meeting_data.get("send_email_notification", True)
	email_result = None

	if send_notification:
		try:
			# Send email to all participants
			from meeting_manager.meeting_manager.utils.email_notifications import send_booking_confirmation_email
			email_result = send_booking_confirmation_email(booking.name)
		except Exception as e:
			frappe.log_error(
				f"Failed to send notification emails for team meeting {booking.name}: {str(e)}",
				"Team Meeting Email Error"
			)

	return {
		"success": True,
		"booking_id": booking.name,
		"message": _("Team meeting created successfully!" + (" Notification emails will be sent to all participants." if send_notification else "")),
		"email_sent": email_result.get("success") if email_result else False
	}
