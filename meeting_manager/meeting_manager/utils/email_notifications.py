"""
MM Email Notifications
Template-based email notification system for Meeting Manager
"""

import frappe
from frappe import _
from frappe.utils import get_datetime, format_datetime, format_time, get_url


def check_email_configured():
	"""Check if outgoing email is configured in Frappe"""
	try:
		email_account = frappe.get_doc("Email Account", frappe.get_value("Email Account", {"default_outgoing": 1}))
		if email_account:
			return True, None
	except Exception as e:
		return False, str(e)
	return False, "No default outgoing email account configured"


def get_template(email_type: str, recipient_type: str, service_type: str = None):
	"""
	Get the appropriate email template.

	Args:
		email_type: Type of email (Booking Confirmation, Reschedule Notification, etc.)
		recipient_type: Who receives it (Customer, Host, Participant, Team Member)
		service_type: Service type from booking.select_mkru (optional)

	Returns:
		MM Email Template document or None
	"""
	filters = {
		"email_type": email_type,
		"recipient_type": recipient_type,
		"is_active": 1
	}

	# Try to find template matching service type first
	if service_type:
		filters["service_type"] = service_type
		template = frappe.db.get_value(
			"MM Email Template",
			filters,
			["name", "priority"],
			as_dict=True,
			order_by="priority desc"
		)
		if template:
			return frappe.get_doc("MM Email Template", template.name)

	# Fall back to default template (no service type)
	if "service_type" in filters:
		del filters["service_type"]
	filters["service_type"] = ["in", ["", None]]

	template = frappe.db.get_value(
		"MM Email Template",
		filters,
		["name", "priority"],
		as_dict=True,
		order_by="priority desc"
	)

	if template:
		return frappe.get_doc("MM Email Template", template.name)

	return None


def build_booking_context(booking, recipient_name: str = None, extra_context: dict = None) -> dict:
	"""
	Build template context from a booking document.

	Args:
		booking: MM Meeting Booking document or booking_id string
		recipient_name: Name of the email recipient
		extra_context: Additional context variables

	Returns:
		Dictionary with all template variables
	"""
	if isinstance(booking, str):
		booking = frappe.get_doc("MM Meeting Booking", booking)

	# Get customer information
	customer = None
	customer_name = ""
	customer_firstname = ""
	customer_email = ""
	customer_phone = ""
	company = ""

	if booking.customer:
		customer = frappe.get_doc("MM Customer", booking.customer)
		customer_name = customer.customer_name or ""
		customer_firstname = customer_name.split()[0] if customer_name else ""
		company = customer.company_name or ""
		customer_email = customer.primary_email or booking.customer_email_at_booking or ""
		# Use get_primary_phone() method if available, otherwise fall back
		customer_phone = (customer.get_primary_phone() if hasattr(customer, 'get_primary_phone') else "") or booking.customer_phone_at_booking or ""
	else:
		customer_email = booking.customer_email_at_booking or ""
		customer_phone = booking.customer_phone_at_booking or ""

	# Get provider (primary host)
	provider = ""
	if booking.assigned_users and len(booking.assigned_users) > 0:
		primary_assigned = None
		for au in booking.assigned_users:
			if au.is_primary:
				primary_assigned = au
				break
		if not primary_assigned:
			primary_assigned = booking.assigned_users[0]
		provider = frappe.db.get_value("User", primary_assigned.user, "full_name") or primary_assigned.user

	# Get booker information
	booker = frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user

	# Format date and time
	start_dt = get_datetime(booking.start_datetime) if booking.start_datetime else None
	end_dt = get_datetime(booking.end_datetime) if booking.end_datetime else None

	event_date = format_datetime(start_dt, "EEEE, MMMM d, yyyy") if start_dt else ""
	event_time = format_time(start_dt, "HH:mm") if start_dt else ""
	end_time = format_time(end_dt, "HH:mm") if end_dt else ""
	event_datetime = f"{event_date} at {event_time}" if start_dt else ""

	# Calculate duration
	duration = booking.duration_minutes if hasattr(booking, 'duration_minutes') and booking.duration_minutes else ""
	if not duration and start_dt and end_dt:
		duration = int((end_dt - start_dt).total_seconds() / 60)

	# Get meeting type info
	meeting_type = None
	if booking.meeting_type:
		meeting_type = frappe.get_doc("MM Meeting Type", booking.meeting_type)

	# Build context
	context = {
		# Recipient
		"recipient_name": recipient_name or "",

		# Customer info
		"customer_name": customer_name,
		"customer_firstname": customer_firstname,
		"company": company,
		"customer_email": customer_email,
		"customer_phone": customer_phone,

		# Meeting info
		"provider": provider,
		"event_date": event_date,
		"event_time": event_time,
		"end_time": end_time,
		"event_datetime": event_datetime,
		"duration": duration,
		"booker": booker,
		"booking_reference": booking.booking_reference or booking.name,
		"service_type": booking.select_mkru or "",
		"meeting_title": booking.meeting_title or "",
		"meeting_description": booking.meeting_description or "",

		# Links
		"cancel_link": booking.cancel_link or "",
		"reschedule_link": booking.reschedule_link or "",
		"remote_support_link": "https://rmmeu-bestsecurity.screenconnect.com/",
		"booking_url": f"{get_url()}/app/mm-meeting-booking/{booking.name}",

		# Raw objects for advanced templates
		"booking": booking,
		"customer": customer,
		"meeting_type": meeting_type,
	}

	# Merge extra context
	if extra_context:
		context.update(extra_context)

	return context


def send_notification(
	recipient_email: str,
	email_type: str,
	recipient_type: str,
	context: dict,
	service_type: str = None,
	booking_id: str = None
) -> dict:
	"""
	Send a notification email using the template system.

	Args:
		recipient_email: Email address to send to
		email_type: Type of email template
		recipient_type: Type of recipient (Customer, Host, etc.)
		context: Template context dictionary
		service_type: Service type for template selection
		booking_id: Booking ID for reference

	Returns:
		Dict with success status and message
	"""
	try:
		frappe.logger().info(f"send_notification called: email_type={email_type}, recipient_type={recipient_type}, recipient={recipient_email}")

		# Check email configuration
		is_configured, error_msg = check_email_configured()
		if not is_configured:
			frappe.logger().warning(f"Email not configured: {error_msg}")
			return {"success": False, "message": f"Email not configured: {error_msg}"}

		if not recipient_email:
			frappe.logger().warning("No recipient email provided")
			return {"success": False, "message": "No recipient email provided"}

		# Get template
		template = get_template(email_type, recipient_type, service_type)
		frappe.logger().info(f"Template lookup: found={template is not None}, service_type={service_type}")
		if not template:
			frappe.log_error(
				f"No template found for email_type={email_type}, recipient_type={recipient_type}, service_type={service_type}",
				"Email Template Not Found"
			)
			return {"success": False, "message": f"No template found for {email_type} - {recipient_type}"}

		# Add remote support link from template
		if template.include_remote_support_link and template.remote_support_url:
			context["remote_support_link"] = template.remote_support_url

		# Render template
		subject = frappe.render_template(template.subject, context)
		body = frappe.render_template(template.email_body, context)

		# Send email
		frappe.sendmail(
			recipients=[recipient_email],
			subject=subject,
			message=body,
			reference_doctype="MM Meeting Booking" if booking_id else None,
			reference_name=booking_id,
			now=True
		)

		frappe.logger().info(f"Email sent to {recipient_email} ({email_type} - {recipient_type})")
		return {"success": True, "message": f"Email sent to {recipient_email}"}

	except Exception as e:
		frappe.log_error(f"Error sending email: {str(e)}\n{frappe.get_traceback()}", "Email Notification Error")
		return {"success": False, "message": str(e)}


# ==========================================
# Booking Confirmation Notifications
# ==========================================

@frappe.whitelist()
def send_booking_confirmation(booking_id: str, notify_customer: bool = True, notify_host: bool = True) -> dict:
	"""
	Send booking confirmation emails to customer and/or host.

	Args:
		booking_id: MM Meeting Booking ID
		notify_customer: Send email to customer
		notify_host: Send email to host(s)

	Returns:
		Dict with results
	"""
	try:
		booking = frappe.get_doc("MM Meeting Booking", booking_id)
		service_type = booking.select_mkru or ""
		results = {"customer": None, "hosts": []}

		# Send to customer
		if notify_customer and not booking.is_internal:
			customer_email = booking.customer_email_at_booking
			if not customer_email and booking.customer:
				customer = frappe.get_doc("MM Customer", booking.customer)
				customer_email = customer.primary_email

			if customer_email:
				context = build_booking_context(booking)
				results["customer"] = send_notification(
					customer_email,
					"Booking Confirmation",
					"Customer",
					context,
					service_type,
					booking_id
				)

		# Send to host(s)
		if notify_host and booking.assigned_users:
			for assignment in booking.assigned_users:
				user = frappe.get_doc("User", assignment.user)
				if user.email:
					context = build_booking_context(booking, recipient_name=user.full_name)
					result = send_notification(
						user.email,
						"Booking Confirmation",
						"Host" if assignment.is_primary else "Team Member",
						context,
						service_type,
						booking_id
					)
					results["hosts"].append({"user": user.email, "result": result})

		return {
			"success": True,
			"results": results
		}

	except Exception as e:
		frappe.log_error(f"Error in send_booking_confirmation: {str(e)}\n{frappe.get_traceback()}")
		return {"success": False, "message": str(e)}


# ==========================================
# Reschedule Notifications
# ==========================================

@frappe.whitelist()
def send_reschedule_notification(
	booking_id: str,
	old_datetime: str = None,
	notify_customer: bool = True,
	notify_host: bool = True,
	changed_by: str = None
) -> dict:
	"""
	Send reschedule notifications to customer and/or host.

	Args:
		booking_id: MM Meeting Booking ID
		old_datetime: Previous datetime string
		notify_customer: Send email to customer
		notify_host: Send email to host(s)
		changed_by: Name of person who made the change

	Returns:
		Dict with results
	"""
	try:
		booking = frappe.get_doc("MM Meeting Booking", booking_id)
		service_type = booking.select_mkru or ""
		results = {"customer": None, "hosts": [], "participants": []}

		extra_context = {
			"old_datetime": old_datetime or "",
			"changed_by": changed_by or frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user
		}

		# Send to customer (non-internal meetings)
		if notify_customer and not booking.is_internal:
			customer_email = booking.customer_email_at_booking
			if not customer_email and booking.customer:
				customer = frappe.get_doc("MM Customer", booking.customer)
				customer_email = customer.primary_email

			if customer_email:
				context = build_booking_context(booking, extra_context=extra_context)
				results["customer"] = send_notification(
					customer_email,
					"Reschedule Notification",
					"Customer",
					context,
					service_type,
					booking_id
				)

		# Send to host(s)
		if notify_host and booking.assigned_users:
			for assignment in booking.assigned_users:
				user = frappe.get_doc("User", assignment.user)
				if user.email:
					context = build_booking_context(booking, recipient_name=user.full_name, extra_context=extra_context)
					result = send_notification(
						user.email,
						"Reschedule Notification",
						"Host",
						context,
						service_type,
						booking_id
					)
					results["hosts"].append({"user": user.email, "result": result})

		# Send to participants (internal meetings)
		if booking.is_internal and booking.participants:
			for participant in booking.participants:
				if participant.user:
					user = frappe.get_doc("User", participant.user)
					if user.email:
						context = build_booking_context(booking, recipient_name=user.full_name, extra_context=extra_context)
						result = send_notification(
							user.email,
							"Reschedule Notification",
							"Participant",
							context,
							service_type,
							booking_id
						)
						results["participants"].append({"user": user.email, "result": result})

		return {"success": True, "results": results}

	except Exception as e:
		frappe.log_error(f"Error in send_reschedule_notification: {str(e)}\n{frappe.get_traceback()}")
		return {"success": False, "message": str(e)}


# ==========================================
# Reassignment Notifications
# ==========================================

@frappe.whitelist()
def send_reassignment_notification(
	booking_id: str,
	new_host_email: str,
	previous_host: str = None,
	notify_customer: bool = True,
	notify_new_host: bool = True,
	changed_by: str = None
) -> dict:
	"""
	Send reassignment notifications when a meeting is assigned to a different host.

	Args:
		booking_id: MM Meeting Booking ID
		new_host_email: Email of new host
		previous_host: Name of previous host
		notify_customer: Send email to customer
		notify_new_host: Send email to new host
		changed_by: Name of person who made the change

	Returns:
		Dict with results
	"""
	try:
		booking = frappe.get_doc("MM Meeting Booking", booking_id)
		service_type = booking.select_mkru or ""
		results = {"customer": None, "new_host": None}

		extra_context = {
			"previous_host": previous_host or "",
			"changed_by": changed_by or frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user
		}

		# Send to new host
		if notify_new_host and new_host_email:
			new_host_name = frappe.db.get_value("User", {"email": new_host_email}, "full_name") or new_host_email
			context = build_booking_context(booking, recipient_name=new_host_name, extra_context=extra_context)
			results["new_host"] = send_notification(
				new_host_email,
				"Reassignment Notification",
				"Host",
				context,
				service_type,
				booking_id
			)

		# Send to customer (non-internal meetings)
		if notify_customer and not booking.is_internal:
			customer_email = booking.customer_email_at_booking
			if not customer_email and booking.customer:
				customer = frappe.get_doc("MM Customer", booking.customer)
				customer_email = customer.primary_email

			if customer_email:
				context = build_booking_context(booking, extra_context=extra_context)
				results["customer"] = send_notification(
					customer_email,
					"Reassignment Notification",
					"Customer",
					context,
					service_type,
					booking_id
				)

		return {"success": True, "results": results}

	except Exception as e:
		frappe.log_error(f"Error in send_reassignment_notification: {str(e)}\n{frappe.get_traceback()}")
		return {"success": False, "message": str(e)}


# ==========================================
# Extension Notifications
# ==========================================

@frappe.whitelist()
def send_extension_notification(
	booking_id: str,
	old_duration: int = None,
	notify_host: bool = True,
	changed_by: str = None
) -> dict:
	"""
	Send extension notification when a meeting duration is extended.

	Args:
		booking_id: MM Meeting Booking ID
		old_duration: Previous duration in minutes
		notify_host: Send email to host(s)
		changed_by: Name of person who made the change

	Returns:
		Dict with results
	"""
	try:
		booking = frappe.get_doc("MM Meeting Booking", booking_id)
		service_type = booking.select_mkru or ""
		results = {"hosts": []}

		extra_context = {
			"old_duration": old_duration or "",
			"changed_by": changed_by or frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user
		}

		# Send to host(s)
		if notify_host and booking.assigned_users:
			for assignment in booking.assigned_users:
				user = frappe.get_doc("User", assignment.user)
				if user.email:
					context = build_booking_context(booking, recipient_name=user.full_name, extra_context=extra_context)
					result = send_notification(
						user.email,
						"Extension Notification",
						"Host",
						context,
						service_type,
						booking_id
					)
					results["hosts"].append({"user": user.email, "result": result})

		return {"success": True, "results": results}

	except Exception as e:
		frappe.log_error(f"Error in send_extension_notification: {str(e)}\n{frappe.get_traceback()}")
		return {"success": False, "message": str(e)}


# ==========================================
# Cancellation Notifications
# ==========================================

@frappe.whitelist()
def send_cancellation_notification(
	booking_id: str,
	notify_customer: bool = True,
	notify_host: bool = True,
	changed_by: str = None
) -> dict:
	"""
	Send cancellation notifications to customer and/or host.

	Args:
		booking_id: MM Meeting Booking ID
		notify_customer: Send email to customer
		notify_host: Send email to host(s)
		changed_by: Name of person who cancelled

	Returns:
		Dict with results
	"""
	try:
		booking = frappe.get_doc("MM Meeting Booking", booking_id)
		service_type = booking.select_mkru or ""
		results = {"customer": None, "hosts": [], "participants": []}

		extra_context = {
			"changed_by": changed_by or frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user
		}

		# Send to customer (non-internal meetings)
		if notify_customer and not booking.is_internal:
			customer_email = booking.customer_email_at_booking
			if not customer_email and booking.customer:
				customer = frappe.get_doc("MM Customer", booking.customer)
				customer_email = customer.primary_email

			if customer_email:
				context = build_booking_context(booking, extra_context=extra_context)
				results["customer"] = send_notification(
					customer_email,
					"Cancellation",
					"Customer",
					context,
					service_type,
					booking_id
				)

		# Send to host(s)
		if notify_host and booking.assigned_users:
			for assignment in booking.assigned_users:
				user = frappe.get_doc("User", assignment.user)
				if user.email:
					context = build_booking_context(booking, recipient_name=user.full_name, extra_context=extra_context)
					result = send_notification(
						user.email,
						"Cancellation",
						"Host",
						context,
						service_type,
						booking_id
					)
					results["hosts"].append({"user": user.email, "result": result})

		# Send to participants (internal meetings)
		if booking.is_internal and booking.participants:
			for participant in booking.participants:
				if participant.user:
					user = frappe.get_doc("User", participant.user)
					if user.email:
						context = build_booking_context(booking, recipient_name=user.full_name, extra_context=extra_context)
						result = send_notification(
							user.email,
							"Cancellation",
							"Participant",
							context,
							service_type,
							booking_id
						)
						results["participants"].append({"user": user.email, "result": result})

		return {"success": True, "results": results}

	except Exception as e:
		frappe.log_error(f"Error in send_cancellation_notification: {str(e)}\n{frappe.get_traceback()}")
		return {"success": False, "message": str(e)}


# ==========================================
# Team Meeting Notifications
# ==========================================

@frappe.whitelist()
def send_team_meeting_invitations(booking_id: str, notify_participants: bool = True) -> dict:
	"""
	Send team meeting invitations to all participants.

	Args:
		booking_id: MM Meeting Booking ID
		notify_participants: Send emails to participants

	Returns:
		Dict with results
	"""
	try:
		booking = frappe.get_doc("MM Meeting Booking", booking_id)
		results = {"hosts": [], "participants": []}

		if not booking.is_internal:
			return {"success": False, "message": "Not a team meeting"}

		# Get hosts list for context
		hosts_list = []
		if booking.assigned_users:
			for assignment in booking.assigned_users:
				host_name = frappe.db.get_value("User", assignment.user, "full_name") or assignment.user
				hosts_list.append(host_name)

		extra_context = {
			"hosts": ", ".join(hosts_list)
		}

		# Send to hosts
		if booking.assigned_users:
			for assignment in booking.assigned_users:
				user = frappe.get_doc("User", assignment.user)
				if user.email:
					context = build_booking_context(booking, recipient_name=user.full_name, extra_context=extra_context)
					result = send_notification(
						user.email,
						"Team Meeting Invitation",
						"Participant",
						context,
						None,
						booking_id
					)
					results["hosts"].append({"user": user.email, "result": result})

		# Send to participants
		if notify_participants and booking.participants:
			for participant in booking.participants:
				if participant.user:
					user = frappe.get_doc("User", participant.user)
					if user.email:
						context = build_booking_context(booking, recipient_name=user.full_name, extra_context=extra_context)
						result = send_notification(
							user.email,
							"Team Meeting Invitation",
							"Participant",
							context,
							None,
							booking_id
						)
						results["participants"].append({"user": user.email, "result": result})

		return {"success": True, "results": results}

	except Exception as e:
		frappe.log_error(f"Error in send_team_meeting_invitations: {str(e)}\n{frappe.get_traceback()}")
		return {"success": False, "message": str(e)}


# ==========================================
# Legacy Functions (for backward compatibility)
# ==========================================

def send_booking_confirmation_email(booking_id):
	"""Legacy function - now uses template system"""
	return send_booking_confirmation(booking_id, notify_customer=True, notify_host=True)


def send_reschedule_confirmation_email(booking_id, old_datetime_dict=None, new_datetime_dict=None, member_changed=False, old_assigned_to=None, new_assigned_to=None):
	"""Legacy function - now uses template system"""
	old_datetime = ""
	if old_datetime_dict:
		old_datetime = f"{old_datetime_dict.get('date', '')} {old_datetime_dict.get('time', '')}"

	return send_reschedule_notification(
		booking_id,
		old_datetime=old_datetime,
		notify_customer=True,
		notify_host=True
	)


def send_cancellation_email(booking_id):
	"""Legacy function - now uses template system"""
	return send_cancellation_notification(booking_id, notify_customer=True, notify_host=True)


# ==========================================
# Utility Functions
# ==========================================

@frappe.whitelist()
def get_available_templates(email_type: str = None, recipient_type: str = None, service_type: str = None) -> list:
	"""Get list of available email templates."""
	filters = {"is_active": 1}

	if email_type:
		filters["email_type"] = email_type

	if recipient_type:
		filters["recipient_type"] = recipient_type

	if service_type:
		filters["service_type"] = ["in", [service_type, "", None]]

	return frappe.get_all(
		"MM Email Template",
		filters=filters,
		fields=["name", "template_name", "email_type", "recipient_type", "service_type", "subject"],
		order_by="priority desc, template_name asc"
	)


@frappe.whitelist()
def preview_template(template_name: str, booking_id: str = None) -> dict:
	"""Preview a rendered template."""
	template = frappe.get_doc("MM Email Template", template_name)

	if booking_id:
		booking = frappe.get_doc("MM Meeting Booking", booking_id)
		context = build_booking_context(booking, recipient_name="Preview Recipient")
	else:
		context = {
			"recipient_name": "John Doe",
			"customer_name": "John Smith",
			"customer_firstname": "John",
			"company": "Acme Corporation",
			"customer_email": "john@example.com",
			"customer_phone": "+45 12 34 56 78",
			"provider": "Rasmus Berg",
			"event_date": "Monday, January 27, 2026",
			"event_time": "14:30",
			"end_time": "15:30",
			"event_datetime": "Monday, January 27, 2026 at 14:30",
			"duration": 60,
			"booker": "Anna Jensen",
			"booking_reference": "BK-2026-00123",
			"service_type": "Business",
			"meeting_title": "Security Review Meeting",
			"meeting_description": "Review of IT security measures",
			"cancel_link": "#",
			"reschedule_link": "#",
			"booking_url": "#",
			"remote_support_link": template.remote_support_url or "https://rmmeu-bestsecurity.screenconnect.com/",
			"old_datetime": "Friday, January 24, 2026 at 10:00",
			"changed_by": "Anna Jensen",
			"previous_host": "Lars Nielsen",
			"old_duration": 30,
			"hosts": "Rasmus Berg, Lars Nielsen",
		}

	return {
		"subject": frappe.render_template(template.subject, context),
		"body": frappe.render_template(template.email_body, context),
		"include_brochure": template.include_brochure
	}


@frappe.whitelist()
def send_template_email(booking_id: str, template_name: str = None, email_type: str = "Booking Confirmation") -> dict:
	"""Send a specific template email to customer."""
	try:
		booking = frappe.get_doc("MM Meeting Booking", booking_id)

		customer_email = booking.customer_email_at_booking
		if not customer_email and booking.customer:
			customer = frappe.get_doc("MM Customer", booking.customer)
			customer_email = customer.primary_email

		if not customer_email:
			return {"success": False, "message": "No recipient email found"}

		if template_name:
			template = frappe.get_doc("MM Email Template", template_name)
			context = build_booking_context(booking)
			if template.include_remote_support_link and template.remote_support_url:
				context["remote_support_link"] = template.remote_support_url

			subject = frappe.render_template(template.subject, context)
			body = frappe.render_template(template.email_body, context)

			frappe.sendmail(
				recipients=[customer_email],
				subject=subject,
				message=body,
				reference_doctype="MM Meeting Booking",
				reference_name=booking_id,
				now=True
			)
			return {"success": True, "message": f"Email sent to {customer_email}"}
		else:
			return send_booking_confirmation(booking_id, notify_customer=True, notify_host=False)

	except Exception as e:
		frappe.log_error(f"Error in send_template_email: {str(e)}\n{frappe.get_traceback()}")
		return {"success": False, "message": str(e)}
