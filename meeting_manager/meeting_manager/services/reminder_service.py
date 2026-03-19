"""
Automated Reminder Service for Meeting Manager

Runs on a schedule (cron) to send reminders for upcoming bookings
based on each meeting type's reminder_schedule configuration.
"""

import json
import frappe
from frappe.utils import now_datetime, add_to_date, get_datetime
from meeting_manager.meeting_manager.utils.email_notifications import (
	send_notification,
	build_booking_context,
)


def process_scheduled_reminders():
	"""
	Main entry point called by the scheduler.

	For each upcoming non-finalized booking:
	  1. Look up the meeting type's reminder_schedule (child table rows)
	  2. For each active reminder row, calculate send_time = start_datetime - hours_before
	  3. If send_time <= now AND this specific reminder hasn't been sent yet, send it
	  4. Log to booking_history, update reminders_sent JSON and last_reminder_sent
	"""
	now = now_datetime()

	# Look ahead: find bookings starting within the next 30 days that aren't finalized
	max_lookahead = add_to_date(now, days=30)

	# Get finalized statuses to exclude
	from meeting_manager.meeting_manager.doctype.mm_booking_status.mm_booking_status import (
		get_finalized_statuses,
	)
	finalized = get_finalized_statuses()

	filters = {
		"docstatus": ["!=", 2],
		"start_datetime": ["between", [now, max_lookahead]],
	}
	if finalized:
		filters["booking_status"] = ["not in", finalized]

	bookings = frappe.get_all(
		"MM Meeting Booking",
		filters=filters,
		fields=["name", "meeting_type", "start_datetime", "reminders_sent"],
		order_by="start_datetime asc",
		limit_page_length=500,
	)

	if not bookings:
		return

	# Cache meeting type reminder schedules
	mt_cache = {}
	sent_count = 0

	for b in bookings:
		if not b.meeting_type:
			continue

		# Get reminder schedule for this meeting type
		if b.meeting_type not in mt_cache:
			mt_cache[b.meeting_type] = _get_active_reminders(b.meeting_type)

		reminders = mt_cache[b.meeting_type]
		if not reminders:
			continue

		# Parse already-sent reminders for this booking
		already_sent = _parse_reminders_sent(b.reminders_sent)
		already_sent_keys = {r.get("reminder_key") for r in already_sent if r.get("reminder_key")}

		start_dt = get_datetime(b.start_datetime)
		booking_changed = False

		for reminder in reminders:
			hours_before = reminder.hours_before_meeting
			reminder_key = f"auto_{hours_before}h"

			# Skip if already sent
			if reminder_key in already_sent_keys:
				continue

			# Calculate when this reminder should fire
			send_time = add_to_date(start_dt, hours=-hours_before)

			# Is it time to send?
			if send_time > now:
				continue

			# Send the reminder
			try:
				result = _send_automated_reminder(b.name, reminder)
				if result.get("sent_count", 0) > 0:
					sent_count += result["sent_count"]
					booking_changed = True

					# Record in the already_sent list
					already_sent.append({
						"reminder_key": reminder_key,
						"sent_at": str(now),
						"sent_by": "System (Automated)",
						"hours_before": hours_before,
						"recipients": result.get("sent_to", []),
						"type": "automated",
					})
			except Exception:
				frappe.log_error(
					f"Failed to send automated reminder for {b.name} ({reminder_key})",
					"Reminder Service Error",
				)

		# Persist changes if any reminders were sent
		if booking_changed:
			frappe.db.set_value(
				"MM Meeting Booking",
				b.name,
				{
					"reminders_sent": json.dumps(already_sent),
					"last_reminder_sent": now,
				},
				update_modified=False,
			)

	if sent_count:
		frappe.db.commit()
		frappe.logger().info(f"Reminder service: sent {sent_count} reminder(s) across {len(bookings)} booking(s)")


def _get_active_reminders(meeting_type_name):
	"""Get active reminder schedule rows for a meeting type."""
	return frappe.get_all(
		"MM Meeting Type Reminder",
		filters={
			"parent": meeting_type_name,
			"parenttype": "MM Meeting Type",
			"is_active": 1,
		},
		fields=["hours_before_meeting", "notification_type"],
		order_by="hours_before_meeting desc",
	)


def _parse_reminders_sent(reminders_sent_json):
	"""Parse the reminders_sent JSON field safely."""
	if not reminders_sent_json:
		return []
	try:
		data = json.loads(reminders_sent_json)
		return data if isinstance(data, list) else []
	except (json.JSONDecodeError, TypeError):
		return []


def _send_automated_reminder(booking_id, reminder_config):
	"""
	Send an automated reminder for a booking.

	Sends to customer (external bookings) and hosts always.
	For internal meetings, also sends to participants.

	Returns dict with sent_count and sent_to list.
	"""
	booking = frappe.get_doc("MM Meeting Booking", booking_id)
	service_type = booking.select_mkru or ""
	notification_type = reminder_config.notification_type or "Email"
	hours_before = reminder_config.hours_before_meeting

	sent_to = []
	extra_context = {
		"custom_message": "",
		"reminder_sent_by": "Automated Reminder System",
		"hours_before": hours_before,
	}

	# Only handle Email for now (SMS requires gateway integration)
	if notification_type not in ("Email", "Both"):
		return {"sent_count": 0, "sent_to": []}

	# Send to customer (non-internal bookings)
	if not booking.is_internal:
		customer_email = booking.customer_email_at_booking
		if not customer_email and booking.customer:
			customer_email = frappe.db.get_value("Contact", booking.customer, "email_id")

		if customer_email:
			context = build_booking_context(booking, extra_context=extra_context)
			result = send_notification(
				customer_email, "Reminder", "Customer",
				context, service_type, booking_id,
			)
			if result.get("success"):
				sent_to.append(f"Customer ({customer_email})")

	# Send to host(s)
	if booking.assigned_users:
		for assignment in booking.assigned_users:
			user_email = frappe.db.get_value("User", assignment.user, ["email", "full_name"], as_dict=True)
			if user_email and user_email.email:
				context = build_booking_context(
					booking, recipient_name=user_email.full_name,
					extra_context=extra_context,
				)
				result = send_notification(
					user_email.email, "Reminder", "Host",
					context, service_type, booking_id,
				)
				if result.get("success"):
					sent_to.append(f"Host ({user_email.full_name or user_email.email})")

	# Send to participants (internal meetings)
	if booking.is_internal and booking.participants:
		host_users = {au.user for au in booking.assigned_users} if booking.assigned_users else set()
		for participant in booking.participants:
			if not participant.user or participant.user in host_users:
				continue
			user_email = frappe.db.get_value("User", participant.user, ["email", "full_name"], as_dict=True)
			if user_email and user_email.email:
				context = build_booking_context(
					booking, recipient_name=user_email.full_name,
					extra_context=extra_context,
				)
				result = send_notification(
					user_email.email, "Reminder", "Participant",
					context, service_type, booking_id,
				)
				if result.get("success"):
					sent_to.append(f"Participant ({user_email.full_name or user_email.email})")

	# Log to booking history
	if sent_to:
		description = (
			f"Automated reminder ({hours_before}h before meeting) sent to: "
			f"{', '.join(sent_to)}"
		)
		booking.append("booking_history", {
			"event_type": "Reminder Sent",
			"event_datetime": now_datetime(),
			"event_by": "Administrator",
			"event_description": description,
		})
		booking.flags.ignore_validate = True
		booking.save(ignore_permissions=True)

	return {"sent_count": len(sent_to), "sent_to": sent_to}
