"""
API endpoints for Timeline Calendar page
Provides resources (team members) and events (meetings) for FullCalendar
"""

import frappe
from frappe import _
from datetime import datetime


@frappe.whitelist()
def get_resources(department=None):
	"""
	Get team members to display as calendar resources

	Args:
		department (str, optional): Filter by department

	Returns:
		list: Resources in FullCalendar format
		[
			{"id": "user@example.com", "title": "John Doe"},
			...
		]
	"""
	try:
		user_roles = frappe.get_roles()
		resources = []

		if department:
			# Get members from specific department
			members = frappe.get_all(
				"MM Department Member",
				filters={"parent": department, "is_active": 1},
				fields=["member"],
				order_by="member asc"
			)

			for member in members:
				user_name = frappe.get_value("User", member.member, "full_name")
				resources.append({
					"id": member.member,
					"title": user_name or member.member
				})

		elif "System Manager" in user_roles:
			# System managers see all users with meeting access
			# Get all unique users who are assigned to meetings or are department members
			users = frappe.db.sql("""
				SELECT DISTINCT user.name, user.full_name
				FROM `tabUser` user
				WHERE user.enabled = 1
					AND user.name NOT IN ('Guest', 'Administrator')
				ORDER BY user.full_name ASC
			""", as_dict=True)

			for user in users:
				resources.append({
					"id": user.name,
					"title": user.full_name or user.name
				})

		else:
			# For department leaders and team members, get their accessible users
			if "Department Leader" in user_roles:
				# Get departments led by current user
				led_departments = frappe.get_all(
					"MM Department",
					filters={"department_leader": frappe.session.user, "is_active": 1},
					pluck="name"
				)

				# Get members from these departments
				if led_departments:
					members = frappe.get_all(
						"MM Department Member",
						filters={"parent": ["in", led_departments], "is_active": 1},
						fields=["member"],
						order_by="member asc"
					)

					for member in members:
						user_name = frappe.get_value("User", member.member, "full_name")
						resources.append({
							"id": member.member,
							"title": user_name or member.member
						})
			else:
				# Regular team members see only themselves
				user_name = frappe.get_value("User", frappe.session.user, "full_name")
				resources.append({
					"id": frappe.session.user,
					"title": user_name or frappe.session.user
				})

		# Remove duplicates
		seen = set()
		unique_resources = []
		for resource in resources:
			if resource["id"] not in seen:
				seen.add(resource["id"])
				unique_resources.append(resource)

		return unique_resources

	except Exception as e:
		frappe.log_error(f"Error fetching resources: {str(e)}", "Timeline Calendar API")
		frappe.throw(_("Failed to load resources. Please try again."))


@frappe.whitelist()
def get_meeting_types(department=None):
	"""
	Get meeting types for a department (for filter dropdown)

	Args:
		department (str, optional): Filter by department

	Returns:
		list: Meeting types
		[
			{"name": "MM-MT-support-30min", "meeting_name": "30-min Call"},
			...
		]
	"""
	try:
		filters = {"is_active": 1}

		if department:
			filters["department"] = department

		meeting_types = frappe.get_all(
			"MM Meeting Type",
			filters=filters,
			fields=["name", "meeting_name", "department"],
			order_by="meeting_name asc"
		)

		return meeting_types

	except Exception as e:
		frappe.log_error(f"Error fetching meeting types: {str(e)}", "Timeline Calendar API")
		return []


@frappe.whitelist()
def get_events(start, end, department=None, status=None, meeting_type=None, service=None, status_color=None, assigned_to=None):
	"""
	Get meetings for calendar display

	Args:
		start (str): Start datetime (ISO format)
		end (str): End datetime (ISO format)
		department (str, optional): Filter by department
		status (str, optional): Filter by booking status
		meeting_type (str, optional): Filter by meeting type
		service (str, optional): Filter by service
		status_color (str, optional): Filter by status color
		assigned_to (str, optional): Filter by assigned user

	Returns:
		list: Events in FullCalendar format
		[
			{
				"id": "MM-MB-0001",
				"resourceId": "user@example.com",
				"title": "John Doe - 30-min Call",
				"start": "2025-12-17T14:00:00",
				"end": "2025-12-17T14:30:00",
				"backgroundColor": "#10b981",
				"borderColor": "#10b981",
				"textColor": "#ffffff",
				"extendedProps": {...}
			},
			...
		]
	"""
	try:
		user_roles = frappe.get_roles()

		# Build base filters
		filters = {
			"start_datetime": [">=", start],
			"end_datetime": ["<=", end]
		}

		if status:
			filters["booking_status"] = status

		if meeting_type:
			filters["meeting_type"] = meeting_type

		if service:
			filters["select_mkru"] = service

		if status_color:
			filters["status_color"] = status_color

		# Permission-based filtering
		accessible_users = None

		if "System Manager" not in user_roles:
			if "Department Leader" in user_roles:
				# Get departments led by current user
				led_departments = frappe.get_all(
					"MM Department",
					filters={"department_leader": frappe.session.user, "is_active": 1},
					pluck="name"
				)

				# Get members from these departments
				if led_departments:
					accessible_users = frappe.get_all(
						"MM Department Member",
						filters={"parent": ["in", led_departments], "is_active": 1},
						pluck="member"
					)
			else:
				# Regular team members see only their bookings
				accessible_users = [frappe.session.user]

		# Fetch meetings
		meetings = frappe.get_all(
			"MM Meeting Booking",
			filters=filters,
			fields=[
				"name",
				"booking_reference",
				"is_internal",
				"meeting_type",
				"customer_name",
				"customer_email",
				"customer_phone",
				"start_datetime",
				"end_datetime",
				"duration",
				"booking_status",
				"location_type",
				"video_meeting_url",
				"meeting_title"
			],
			order_by="start_datetime asc",
			limit=500  # Limit for performance
		)

		# Color mapping based on status
		color_map = {
			"Confirmed": "#10b981",   # Green
			"Pending": "#f59e0b",     # Yellow/Orange
			"Cancelled": "#ef4444",   # Red
			"Completed": "#3b82f6",   # Blue
			"No-Show": "#6b7280",     # Gray
			"Rescheduled": "#8b5cf6"  # Purple
		}

		# Build events list
		events = []
		for meeting in meetings:
			# Get assigned users from child table
			assigned_users = frappe.get_all(
				"MM Meeting Booking Assigned User",
				filters={"parent": meeting.name},
				fields=["user", "is_primary_host"],
				order_by="is_primary_host desc"
			)

			# Filter by permission if needed
			if accessible_users:
				# Check if any assigned user is in accessible_users
				meeting_users = [au.user for au in assigned_users]
				if not any(user in accessible_users for user in meeting_users):
					continue  # Skip this meeting

			# Get meeting type name
			meeting_type_name = frappe.get_value(
				"MM Meeting Type",
				meeting.meeting_type,
				"meeting_name"
			) if meeting.meeting_type else "Meeting"

			# Determine event title
			customer_name = meeting.customer_name or meeting.customer_email or "Guest"
			event_title = f"{customer_name} - {meeting_type_name}"

			# Get status color
			event_color = color_map.get(meeting.booking_status, "#6b7280")

			# Create event for each assigned user (resource)
			for assigned_user in assigned_users:
				# Format datetime for FullCalendar
				start_dt = meeting.start_datetime
				end_dt = meeting.end_datetime

				if isinstance(start_dt, str):
					start_dt = datetime.fromisoformat(start_dt.replace('Z', '+00:00'))
				if isinstance(end_dt, str):
					end_dt = datetime.fromisoformat(end_dt.replace('Z', '+00:00'))

				event = {
					"id": meeting.name,
					"resourceId": assigned_user.user,
					"title": event_title,
					"start": start_dt.isoformat(),
					"end": end_dt.isoformat(),
					"backgroundColor": event_color,
					"borderColor": event_color,
					"textColor": "#ffffff",
					"extendedProps": {
						"booking_reference": meeting.booking_reference,
						"customer_name": meeting.customer_name or "N/A",
						"customer_email": meeting.customer_email or "N/A",
						"customer_phone": meeting.customer_phone or "N/A",
						"status": meeting.booking_status,
						"meeting_type": meeting_type_name,
						"location_type": meeting.location_type or "N/A",
						"video_meeting_url": meeting.video_meeting_url or "",
						"is_primary_host": assigned_user.is_primary_host,
						"duration": meeting.duration or 0
					}
				}

				events.append(event)

		return events

	except Exception as e:
		frappe.log_error(f"Error fetching events: {str(e)}", "Timeline Calendar API")
		frappe.throw(_("Failed to load events. Please try again."))


@frappe.whitelist()
def get_resource_business_hours(resource_id, start_date, end_date):
	"""
	Get business hours (available time ranges) for a resource (user) for FullCalendar

	IMPORTANT: This function now returns BOTH:
	1. Regular working hours (recurring weekly pattern)
	2. Date-specific overrides that REPLACE regular hours for specific dates

	Date overrides take FULL PRIORITY - they can extend or restrict hours beyond regular schedule.

	Args:
		resource_id (str): User ID
		start_date (str): Start date (YYYY-MM-DD)
		end_date (str): End date (YYYY-MM-DD)

	Returns:
		dict: {
			"businessHours": [...],  # Regular working hours + date-specific overrides
			"dateOverrides": [...]    # For frontend validation only
		}
	"""
	try:
		import json
		from frappe.utils import getdate
		from datetime import datetime, timedelta

		# Get user's working hours from MM User Settings
		user_settings = frappe.get_value(
			"MM User Settings",
			{"user": resource_id},
			["working_hours_json"],
			as_dict=True
		)

		business_hours = []

		if not user_settings or not user_settings.working_hours_json:
			# No working hours defined - return 24/7 availability
			business_hours = [{
				"daysOfWeek": [0, 1, 2, 3, 4, 5, 6],  # All days
				"startTime": "00:00",
				"endTime": "23:59"
			}]
		else:
			try:
				working_hours = json.loads(user_settings.working_hours_json)
			except (json.JSONDecodeError, TypeError):
				# Invalid JSON - return 24/7 availability
				business_hours = [{
					"daysOfWeek": [0, 1, 2, 3, 4, 5, 6],
					"startTime": "00:00",
					"endTime": "23:59"
				}]
			else:
				# Convert working hours to FullCalendar businessHours format
				day_mapping = {
					"monday": 1,
					"tuesday": 2,
					"wednesday": 3,
					"thursday": 4,
					"friday": 5,
					"saturday": 6,
					"sunday": 0
				}

				# Group days by their working hours
				hours_groups = {}
				for day_name, day_config in working_hours.items():
					if day_name in day_mapping and day_config.get("enabled", False):
						start_time = day_config.get("start", "09:00")
						end_time = day_config.get("end", "17:00")
						hours_key = f"{start_time}-{end_time}"

						if hours_key not in hours_groups:
							hours_groups[hours_key] = []
						hours_groups[hours_key].append(day_mapping[day_name])

				# Convert to FullCalendar format
				for hours_key, days in hours_groups.items():
					start_time, end_time = hours_key.split("-")
					business_hours.append({
						"daysOfWeek": days,
						"startTime": start_time,
						"endTime": end_time
					})

		# Now fetch date-specific overrides
		date_overrides = []

		# Get user's availability rules
		availability_rules = frappe.get_all(
			"MM User Availability Rule",
			filters={"user": resource_id},
			fields=["name"]
		)

		if availability_rules:
			# Parse date range
			start_dt = getdate(start_date)
			end_dt = getdate(end_date)

			# Collect all overrides, grouped by date
			overrides_by_date = {}

			# Get all date overrides in the range
			for rule in availability_rules:
				overrides = frappe.get_all(
					"MM User Date Overrides",
					filters={
						"parent": rule.name,
						"parenttype": "MM User Availability Rule",
						"date": ["between", [start_dt, end_dt]]
					},
					fields=["date", "available", "custom_hours_start", "custom_hours_end", "reason"],
					order_by="date, custom_hours_start"  # Sort by date and start time
				)

				for override in overrides:
					date_str = str(override.date)

					if date_str not in overrides_by_date:
						overrides_by_date[date_str] = []

					overrides_by_date[date_str].append(override)

			# Process each date's overrides
			for date_str, day_overrides in overrides_by_date.items():
				# Case 1: If ANY override marks the day as unavailable, entire day is blocked
				if any(not o.available for o in day_overrides):
					date_overrides.append({
						"date": date_str,
						"available": False,
						"reason": "Not available",
						"allDay": True
					})
					continue

				# Case 2: Collect all available time slots for this date
				# These can EXTEND or RESTRICT regular working hours
				available_slots = []
				for override in day_overrides:
					if override.available and override.custom_hours_start and override.custom_hours_end:
						available_slots.append({
							"start": str(override.custom_hours_start),
							"end": str(override.custom_hours_end),
							"reason": override.reason or "Custom hours"
						})

				# Store override info - frontend will handle visualization
				# If slots extend beyond regular hours, frontend creates white background events
				# If slots restrict regular hours, frontend creates red background blocks
				if available_slots:
					date_overrides.append({
						"date": date_str,
						"available": True,
						"availableSlots": available_slots,
						"allDay": False
					})

					# CRITICAL: Add date-specific business hours to prevent gray-out
					# This makes extended hours appear WHITE instead of gray non-business hours
					# FullCalendar will render these times as available (white background)
					# Using groupId to indicate these are date-specific overrides
					for i, slot in enumerate(available_slots):
						business_hours.append({
							"groupId": f"override-{date_str}",
							"daysOfWeek": [getdate(date_str).weekday() if getdate(date_str).weekday() != 6 else 0],  # Convert to FC format
							"startTime": slot["start"],
							"endTime": slot["end"],
							"startRecur": date_str,
							"endRecur": date_str
						})

		return {
			"businessHours": business_hours,
			"dateOverrides": date_overrides
		}

	except Exception as e:
		frappe.log_error(f"Error fetching business hours for {resource_id}: {str(e)}", "Timeline Calendar API")
		# Return empty structure on error
		return {
			"businessHours": [],
			"dateOverrides": []
		}


@frappe.whitelist()
def update_booking(booking_id, start_datetime=None, end_datetime=None, new_host=None, department=None, browser_timezone=None):
	"""
	Update booking via drag-and-drop
	Handles both rescheduling (time change) and reassignment (host change)

	Integrates with existing Meeting Manager APIs:
	- Uses meeting_manager.meeting_manager.api.booking.reassign_booking for host changes
	- Uses meeting_manager.meeting_manager.api.booking.reschedule_booking_internal for time changes
	- Validates availability using meeting_manager.meeting_manager.utils.validation.check_member_availability

	Restrictions:
	- Cannot modify Cancelled or Completed bookings
	- Reassignment only works within the same department
	- New host must be available at the requested time
	- New time must be available for assigned host(s)

	Args:
		booking_id (str): Meeting Booking ID
		start_datetime (str, optional): New start datetime (ISO format)
		end_datetime (str, optional): New end datetime (ISO format)
		new_host (str, optional): New host user ID (for reassignment)
		department (str, optional): Department name (required for reassignment)

	Returns:
		dict: {"success": bool, "message": str}
	"""
	from meeting_manager.meeting_manager.api.booking import (
		reassign_booking,
		reschedule_booking_internal,
		has_permission_to_manage_booking
	)
	from datetime import datetime as dt

	try:
		# Check if booking exists
		if not frappe.db.exists("MM Meeting Booking", booking_id):
			return {
				"success": False,
				"message": f"Booking {booking_id} not found"
			}

		# Get the booking document
		booking = frappe.get_doc("MM Meeting Booking", booking_id)

		# Check permissions using existing permission system
		if not has_permission_to_manage_booking(booking):
			return {
				"success": False,
				"message": "You don't have permission to modify this booking"
			}

		# Check if booking status allows modification
		if booking.booking_status in ["Cancelled", "Completed"]:
			return {
				"success": False,
				"message": f"Cannot modify {booking.booking_status.lower()} meetings"
			}

		# Track changes for messaging
		changes = []

		# Determine what type of update this is
		is_rescheduling = start_datetime and end_datetime
		is_reassigning = new_host and department

		# CASE 1: REASSIGNMENT (with optional reschedule)
		if is_reassigning:
			# Use existing reassign_booking API which includes availability validation
			reassignment_result = reassign_booking(
				booking_id=booking_id,
				new_assigned_to=new_host,
				reason="Reassigned via drag-and-drop from timeline calendar"
			)

			if not reassignment_result["success"]:
				return reassignment_result

			changes.append(f"Reassigned from {reassignment_result['old_assigned_to']} to {reassignment_result['new_assigned_to']}")

			# Reload booking after reassignment
			booking.reload()

		# CASE 2: RESCHEDULING (time change)
		if is_rescheduling:
			# CRITICAL INSIGHT: The issue is that we're trying to match three different timezones:
			# 1. Browser timezone (e.g., Africa/Nairobi = UTC+3) - what the user sees in FullCalendar
			# 2. FullCalendar's UTC conversion via toISOString() - what we receive
			# 3. MM User Settings timezone (e.g., Copenhagen = UTC+1) - where working hours are defined
			#
			# THE SOLUTION: Convert from UTC (what FullCalendar sends) back to the browser timezone
			# (what the user actually saw and clicked), then use that for scheduling!
			import pytz
			from frappe.utils import get_datetime, get_system_timezone

			# Parse UTC datetime from FullCalendar (already in UTC after toISOString())
			start_dt_utc = dt.fromisoformat(start_datetime.replace('Z', '+00:00').replace('.000', ''))
			end_dt_utc = dt.fromisoformat(end_datetime.replace('Z', '+00:00').replace('.000', ''))

			# Use browser timezone if provided, otherwise fall back to system timezone
			if browser_timezone:
				target_tz_str = browser_timezone
			else:
				target_tz_str = get_system_timezone()

			target_tz = pytz.timezone(target_tz_str)

			# Convert UTC to target timezone (browser's timezone)
			start_dt_local = start_dt_utc.astimezone(target_tz)
			end_dt_local = end_dt_utc.astimezone(target_tz)

			# Extract date and time components in target timezone
			# This is the time the user actually saw in the calendar!
			new_date = start_dt_local.strftime('%Y-%m-%d')
			new_time = start_dt_local.strftime('%H:%M')

			# Verify duration hasn't changed (drag-and-drop should maintain duration)
			new_duration = int((end_dt_utc - start_dt_utc).total_seconds() / 60)
			if new_duration != booking.duration:
				frappe.msgprint(
					f"Warning: Duration changed from {booking.duration} to {new_duration} minutes",
					indicator="orange"
				)

			# Use existing reschedule_booking_internal API which includes availability validation
			reschedule_result = reschedule_booking_internal(
				booking_id=booking_id,
				new_date=new_date,
				new_time=new_time,
				reason="Rescheduled via drag-and-drop from timeline calendar"
			)

			if not reschedule_result["success"]:
				return reschedule_result

			old_datetime = f"{booking.start_datetime}"
			new_datetime = f"{new_date} {new_time}"
			changes.append(f"Rescheduled from {old_datetime} to {new_datetime}")

		# Build success message
		success_message = "Booking updated successfully"
		if changes:
			success_message = "; ".join(changes)

		return {
			"success": True,
			"message": success_message
		}

	except frappe.PermissionError as e:
		frappe.db.rollback()
		frappe.log_error(f"Permission error updating booking {booking_id}: {str(e)}", "Timeline Calendar Drag & Drop")
		return {
			"success": False,
			"message": f"Permission denied: {str(e)}"
		}
	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(f"Error updating booking {booking_id}: {str(e)}", "Timeline Calendar Drag & Drop")
		return {
			"success": False,
			"message": f"Error updating booking: {str(e)}"
		}
