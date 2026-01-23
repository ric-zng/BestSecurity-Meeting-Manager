# Copyright (c) 2025, Best Security and contributors
# For license information, please see license.txt

"""
Conflict Detection and Availability Validation Utilities

This module provides core validation functions for checking member availability,
detecting scheduling conflicts, and validating booking requests.
"""

import frappe
from frappe.utils import getdate, get_time, get_datetime, add_to_date, now_datetime
from datetime import datetime, timedelta, time
import json


def check_blocked_slots(member, scheduled_date, start_time, end_time):
	"""
	Check if the requested time falls within any blocked slots.

	CRITICAL: Blocked slots have HIGHEST PRIORITY - they override everything.

	Args:
		member (str): User ID
		scheduled_date (date): Date to check
		start_time (time): Start time of requested slot
		end_time (time): End time of requested slot

	Returns:
		dict: {
			"available": bool,
			"reason": str,
			"has_blocked_slot": bool
		}
	"""
	blocked_slots = frappe.get_all(
		"MM User Blocked Slot",
		filters={
			"user": member,
			"blocked_date": scheduled_date
		},
		fields=["name", "start_time", "end_time", "reason"]
	)

	if not blocked_slots:
		return {"available": True, "reason": None, "has_blocked_slot": False}

	for slot in blocked_slots:
		slot_start = get_time(slot.start_time)
		slot_end = get_time(slot.end_time)

		# Check for overlap: NOT (end_time <= slot_start OR start_time >= slot_end)
		if not (end_time <= slot_start or start_time >= slot_end):
			reason = slot.reason or "Time slot is blocked"
			return {
				"available": False,
				"reason": f"Blocked: {reason} ({slot.start_time} - {slot.end_time})",
				"has_blocked_slot": True
			}

	return {"available": True, "reason": None, "has_blocked_slot": False}


def check_member_availability(member, scheduled_date, scheduled_start_time, duration_minutes, exclude_booking=None):
	"""
	Check if a member is available at the specified date/time

	Args:
		member (str): User ID of the member
		scheduled_date (date or str): Date of the booking
		scheduled_start_time (time or str): Start time of the booking
		duration_minutes (int): Duration of the meeting in minutes
		exclude_booking (str, optional): Booking ID to exclude from conflict check (for updates)

	Returns:
		dict: {
			"available": bool,
			"conflicts": list of conflict details,
			"reason": str (if not available)
		}
	"""
	# Convert inputs to proper types
	scheduled_date = getdate(scheduled_date)
	scheduled_start_time = get_time(scheduled_start_time)

	# Calculate end time
	start_datetime = datetime.combine(scheduled_date, scheduled_start_time)
	end_datetime = start_datetime + timedelta(minutes=duration_minutes)
	scheduled_end_time = end_datetime.time()

	conflicts = []

	# 0. Check BLOCKED SLOTS FIRST (highest priority)
	blocked_slot_check = check_blocked_slots(member, scheduled_date, scheduled_start_time, scheduled_end_time)
	if not blocked_slot_check["available"]:
		conflicts.append({
			"type": "blocked_slot",
			"message": blocked_slot_check["reason"]
		})
		# Return immediately - blocked slots are absolute
		return {
			"available": False,
			"conflicts": conflicts,
			"reason": conflicts[0]["message"]
		}

	# 1. Check date overrides (vacations, special availability)
	# Date overrides take FULL PRIORITY over regular working hours
	date_override_check = check_date_overrides(member, scheduled_date, scheduled_start_time, scheduled_end_time)

	# If date override exists and has a decision (available or not), use it
	# Otherwise, fall back to regular working hours check
	if date_override_check.get("has_override", False):
		# Date override exists - use ONLY this check, ignore working hours
		if not date_override_check["available"]:
			conflicts.append({
				"type": "date_override",
				"message": date_override_check["reason"]
			})
	else:
		# No date override - check regular working hours
		working_hours_check = check_working_hours(member, scheduled_date, scheduled_start_time, scheduled_end_time)
		if not working_hours_check["available"]:
			conflicts.append({
				"type": "working_hours",
				"message": working_hours_check["reason"]
			})

	# 3. Check existing bookings
	booking_conflicts = check_booking_conflicts(member, scheduled_date, scheduled_start_time, scheduled_end_time, exclude_booking)
	if booking_conflicts:
		conflicts.extend([{
			"type": "booking_conflict",
			"booking_id": conflict["booking_id"],
			"message": conflict["message"]
		} for conflict in booking_conflicts])

	# 4. Check synced calendar events
	calendar_conflicts = check_calendar_event_conflicts(member, start_datetime, end_datetime)
	if calendar_conflicts:
		conflicts.extend([{
			"type": "calendar_event",
			"event_title": conflict["event_title"],
			"message": conflict["message"]
		} for conflict in calendar_conflicts])

	# 5. Check buffer times
	buffer_conflicts = check_buffer_time_conflicts(member, start_datetime, end_datetime, exclude_booking)
	if buffer_conflicts:
		conflicts.extend([{
			"type": "buffer_time",
			"message": conflict["message"]
		} for conflict in buffer_conflicts])

	# 6. Check availability rules (max bookings per day/week)
	availability_rule_check = check_availability_rules(member, scheduled_date)
	if not availability_rule_check["available"]:
		conflicts.append({
			"type": "availability_rule",
			"message": availability_rule_check["reason"]
		})

	return {
		"available": len(conflicts) == 0,
		"conflicts": conflicts,
		"reason": conflicts[0]["message"] if conflicts else None
	}


def check_working_hours(member, scheduled_date, start_time, end_time):
	"""
	Check if the time falls within member's working hours

	Returns:
		dict: {"available": bool, "reason": str}
	"""
	# Get user settings
	user_settings = frappe.get_value(
		"MM User Settings",
		{"user": member},
		["working_hours_json"],
		as_dict=True
	)

	if not user_settings or not user_settings.working_hours_json:
		# No working hours defined - assume 24/7 availability
		return {"available": True, "reason": None}

	try:
		working_hours = json.loads(user_settings.working_hours_json)
	except (json.JSONDecodeError, TypeError):
		# Invalid JSON - assume 24/7 availability
		return {"available": True, "reason": None}

	# Get day of week (0 = Monday, 6 = Sunday)
	day_of_week = scheduled_date.weekday()
	day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
	day_name = day_names[day_of_week]

	day_config = working_hours.get(day_name, {})

	# Check if day is enabled
	if not day_config.get("enabled", False):
		return {
			"available": False,
			"reason": f"Member is not available on {day_name.capitalize()}s"
		}

	# Check if time is within working hours
	work_start = get_time(day_config.get("start", "00:00"))
	work_end = get_time(day_config.get("end", "23:59"))

	if start_time < work_start or end_time > work_end:
		return {
			"available": False,
			"reason": f"Time is outside working hours ({work_start.strftime('%H:%M')} - {work_end.strftime('%H:%M')})"
		}

	return {"available": True, "reason": None}


def check_date_overrides(member, scheduled_date, start_time, end_time):
	"""
	Check date-specific overrides (vacations, special availability)

	CRITICAL: Date overrides take FULL PRIORITY over regular working hours.
	When a date override exists, it REPLACES the working hours check completely.

	Returns:
		dict: {
			"available": bool,
			"reason": str,
			"has_override": bool  # NEW: Indicates if override exists for this date
		}
	"""
	# Get user's availability rules with date overrides
	availability_rules = frappe.get_all(
		"MM User Availability Rule",
		filters={"user": member},
		fields=["name", "is_default"]
	)

	if not availability_rules:
		return {"available": True, "reason": None, "has_override": False}

	# Check all rules for date overrides
	# Collect all overrides for this date across all rules
	all_overrides = []
	for rule in availability_rules:
		# Get date overrides for this rule
		overrides = frappe.get_all(
			"MM User Date Overrides",
			filters={
				"parent": rule.name,
				"parenttype": "MM User Availability Rule",
				"date": scheduled_date
			},
			fields=["available", "custom_hours_start", "custom_hours_end", "reason"],
			order_by="custom_hours_start"
		)
		all_overrides.extend(overrides)

	# If no overrides for this date, return without override flag
	if not all_overrides:
		return {"available": True, "reason": None, "has_override": False}

	# Override exists! From this point on, has_override=True
	# This tells the caller to IGNORE regular working hours

	# Check if ANY override marks the day as unavailable
	if any(not override.available for override in all_overrides):
		unavailable_override = next(o for o in all_overrides if not o.available)
		reason = unavailable_override.reason or "Member is not available on this date"
		return {
			"available": False,
			"reason": reason,
			"has_override": True
		}

	# Collect all available time slots
	available_slots = []
	for override in all_overrides:
		if override.available and override.custom_hours_start and override.custom_hours_end:
			custom_start = get_time(override.custom_hours_start)
			custom_end = get_time(override.custom_hours_end)
			available_slots.append((custom_start, custom_end))

	# If no custom hours defined, member is available all day (override with no time restrictions)
	if not available_slots:
		return {"available": True, "reason": None, "has_override": True}

	# Check if the requested time falls within ANY available slot
	for slot_start, slot_end in available_slots:
		if start_time >= slot_start and end_time <= slot_end:
			# Time falls within this slot - available!
			return {"available": True, "reason": None, "has_override": True}

	# Time doesn't fall within any available slot - format error message
	slot_strings = [f"{s.strftime('%H:%M')}-{e.strftime('%H:%M')}" for s, e in available_slots]
	return {
		"available": False,
		"reason": f"Time is outside available slots for this date: {', '.join(slot_strings)}",
		"has_override": True
	}


def check_booking_conflicts(member, scheduled_date, start_time, end_time, exclude_booking=None):
	"""
	Check for overlapping bookings where the member is either:
	1. An assigned user (host)
	2. An internal participant

	Returns:
		list: List of conflicting bookings
	"""
	# Convert date + time to datetime for comparison
	scheduled_start_datetime = datetime.combine(scheduled_date, start_time)
	scheduled_end_datetime = datetime.combine(scheduled_date, end_time)

	# Query bookings where member is assigned (host) via child table
	host_query = """
		SELECT DISTINCT
			mb.name,
			mb.start_datetime,
			mb.end_datetime,
			mb.meeting_type,
			'host' as role
		FROM `tabMM Meeting Booking` mb
		INNER JOIN `tabMM Meeting Booking Assigned User` au
			ON au.parent = mb.name AND au.parenttype = 'MM Meeting Booking'
		WHERE au.user = %(member)s
			AND mb.booking_status IN ('Confirmed', 'Pending')
			AND mb.start_datetime < %(end_datetime)s
			AND mb.end_datetime > %(start_datetime)s
			{exclude_condition}
	""".format(
		exclude_condition=f"AND mb.name != %(exclude_booking)s" if exclude_booking else ""
	)

	# Query bookings where member is an internal participant
	participant_query = """
		SELECT DISTINCT
			mb.name,
			mb.start_datetime,
			mb.end_datetime,
			mb.meeting_type,
			'participant' as role
		FROM `tabMM Meeting Booking` mb
		INNER JOIN `tabMM Meeting Booking Participant` p
			ON p.parent = mb.name AND p.parenttype = 'MM Meeting Booking'
		WHERE p.user = %(member)s
			AND p.participant_type = 'Internal'
			AND mb.booking_status IN ('Confirmed', 'Pending')
			AND mb.start_datetime < %(end_datetime)s
			AND mb.end_datetime > %(start_datetime)s
			{exclude_condition}
	""".format(
		exclude_condition=f"AND mb.name != %(exclude_booking)s" if exclude_booking else ""
	)

	params = {
		"member": member,
		"start_datetime": scheduled_start_datetime,
		"end_datetime": scheduled_end_datetime
	}

	if exclude_booking:
		params["exclude_booking"] = exclude_booking

	# Execute both queries
	host_bookings = frappe.db.sql(host_query, params, as_dict=True)
	participant_bookings = frappe.db.sql(participant_query, params, as_dict=True)

	# Combine results (avoid duplicates by using booking name as key)
	existing_bookings_dict = {}
	for booking in host_bookings:
		existing_bookings_dict[booking.name] = booking
	for booking in participant_bookings:
		if booking.name not in existing_bookings_dict:
			existing_bookings_dict[booking.name] = booking

	conflicts = []
	for booking in existing_bookings_dict.values():
		# Convert to time for display
		booking_start = get_datetime(booking.start_datetime).time()
		booking_end = get_datetime(booking.end_datetime).time()

		role_info = " (as participant)" if booking.role == "participant" else ""
		conflicts.append({
			"booking_id": booking.name,
			"message": f"Conflicts with existing booking {booking.name}{role_info} ({booking_start.strftime('%H:%M')} - {booking_end.strftime('%H:%M')})"
		})

	return conflicts


def check_calendar_event_conflicts(member, start_datetime, end_datetime):
	"""
	Check for conflicts with synced external calendar events

	Returns:
		list: List of conflicting calendar events
	"""
	# Get calendar event syncs for this member (join with calendar_integration to get user)
	query = """
		SELECT
			ces.name,
			ces.event_title,
			ces.start_datetime,
			ces.end_datetime
		FROM `tabMM Calendar Event Sync` ces
		INNER JOIN `tabMM Calendar Integration` ci
			ON ces.calendar_integration = ci.name
		WHERE ci.user = %(member)s
			AND ces.is_blocking_availability = 1
			AND ces.event_type != 'All-Day Event'
			AND ces.sync_status = 'Synced'
			AND ces.start_datetime < %(end_datetime)s
			AND ces.end_datetime > %(start_datetime)s
	"""

	params = {
		"member": member,
		"start_datetime": start_datetime,
		"end_datetime": end_datetime
	}

	calendar_events = frappe.db.sql(query, params, as_dict=True)

	conflicts = []
	for event in calendar_events:
		event_start = get_datetime(event.start_datetime)
		event_end = get_datetime(event.end_datetime)

		conflicts.append({
			"event_title": event.event_title or "Busy",
			"message": f"Conflicts with calendar event: {event.event_title or 'Busy'} ({event_start.strftime('%H:%M')} - {event_end.strftime('%H:%M')})"
		})

	return conflicts


def check_buffer_time_conflicts(member, start_datetime, end_datetime, exclude_booking=None):
	"""
	Check if buffer times are respected between meetings.
	Includes bookings where member is a host OR an internal participant.

	Returns:
		list: List of buffer time violations
	"""
	# Get user's availability rules for buffer times
	availability_rules = frappe.get_all(
		"MM User Availability Rule",
		filters={"user": member},
		fields=["buffer_time_before", "buffer_time_after", "is_default"],
		order_by="is_default desc",
		limit=1
	)

	if not availability_rules:
		return []

	rule = availability_rules[0]
	buffer_before = rule.buffer_time_before or 0
	buffer_after = rule.buffer_time_after or 0

	if buffer_before == 0 and buffer_after == 0:
		return []

	# Calculate buffer windows
	buffer_start = start_datetime - timedelta(minutes=buffer_before)
	buffer_end = end_datetime + timedelta(minutes=buffer_after)

	# Check for bookings within buffer windows where member is a host
	host_query = """
		SELECT DISTINCT
			mb.name,
			mb.start_datetime,
			mb.end_datetime
		FROM `tabMM Meeting Booking` mb
		INNER JOIN `tabMM Meeting Booking Assigned User` au
			ON au.parent = mb.name AND au.parenttype = 'MM Meeting Booking'
		WHERE au.user = %(member)s
			AND DATE(mb.start_datetime) = %(scheduled_date)s
			AND mb.booking_status IN ('Confirmed', 'Pending')
			AND (
				(mb.start_datetime >= %(buffer_start)s AND mb.start_datetime < %(buffer_end)s)
				OR (mb.end_datetime > %(buffer_start)s AND mb.end_datetime <= %(buffer_end)s)
			)
			{exclude_condition}
	""".format(
		exclude_condition="AND mb.name != %(exclude_booking)s" if exclude_booking else ""
	)

	# Check for bookings within buffer windows where member is an internal participant
	participant_query = """
		SELECT DISTINCT
			mb.name,
			mb.start_datetime,
			mb.end_datetime
		FROM `tabMM Meeting Booking` mb
		INNER JOIN `tabMM Meeting Booking Participant` p
			ON p.parent = mb.name AND p.parenttype = 'MM Meeting Booking'
		WHERE p.user = %(member)s
			AND p.participant_type = 'Internal'
			AND DATE(mb.start_datetime) = %(scheduled_date)s
			AND mb.booking_status IN ('Confirmed', 'Pending')
			AND (
				(mb.start_datetime >= %(buffer_start)s AND mb.start_datetime < %(buffer_end)s)
				OR (mb.end_datetime > %(buffer_start)s AND mb.end_datetime <= %(buffer_end)s)
			)
			{exclude_condition}
	""".format(
		exclude_condition="AND mb.name != %(exclude_booking)s" if exclude_booking else ""
	)

	params = {
		"member": member,
		"scheduled_date": start_datetime.date(),
		"buffer_start": buffer_start,
		"buffer_end": buffer_end
	}

	if exclude_booking:
		params["exclude_booking"] = exclude_booking

	# Execute both queries and combine results
	host_bookings = frappe.db.sql(host_query, params, as_dict=True)
	participant_bookings = frappe.db.sql(participant_query, params, as_dict=True)

	# Combine results (avoid duplicates)
	nearby_bookings_dict = {}
	for booking in host_bookings:
		nearby_bookings_dict[booking.name] = booking
	for booking in participant_bookings:
		if booking.name not in nearby_bookings_dict:
			nearby_bookings_dict[booking.name] = booking

	nearby_bookings = list(nearby_bookings_dict.values())

	conflicts = []
	for booking in nearby_bookings:
		booking_start = get_datetime(booking.start_datetime)
		booking_end = get_datetime(booking.end_datetime)

		# Check if booking violates buffer zones
		if not (booking_end <= buffer_start or booking_start >= buffer_end):
			if booking_end > buffer_start and booking_end <= start_datetime:
				conflicts.append({
					"message": f"Violates {buffer_before}-minute buffer before meeting (conflicts with {booking.name})"
				})
			elif booking_start < buffer_end and booking_start >= end_datetime:
				conflicts.append({
					"message": f"Violates {buffer_after}-minute buffer after meeting (conflicts with {booking.name})"
				})

	return conflicts


def check_availability_rules(member, scheduled_date):
	"""
	Check if member has reached max bookings per day/week limits.
	Includes bookings where member is a host OR an internal participant.

	Returns:
		dict: {"available": bool, "reason": str}
	"""
	# Get user's availability rules
	availability_rules = frappe.get_all(
		"MM User Availability Rule",
		filters={"user": member},
		fields=["max_bookings_per_day", "max_bookings_per_week", "is_default"],
		order_by="is_default desc",
		limit=1
	)

	if not availability_rules:
		return {"available": True, "reason": None}

	rule = availability_rules[0]

	# Check max bookings per day
	if rule.max_bookings_per_day:
		# Count bookings where member is host OR internal participant
		# Use UNION to combine both queries and then count distinct
		query = """
			SELECT COUNT(*) as count FROM (
				SELECT DISTINCT mb.name
				FROM `tabMM Meeting Booking` mb
				INNER JOIN `tabMM Meeting Booking Assigned User` au
					ON au.parent = mb.name AND au.parenttype = 'MM Meeting Booking'
				WHERE au.user = %(member)s
					AND DATE(mb.start_datetime) = %(scheduled_date)s
					AND mb.booking_status IN ('Confirmed', 'Pending')
				UNION
				SELECT DISTINCT mb.name
				FROM `tabMM Meeting Booking` mb
				INNER JOIN `tabMM Meeting Booking Participant` p
					ON p.parent = mb.name AND p.parenttype = 'MM Meeting Booking'
				WHERE p.user = %(member)s
					AND p.participant_type = 'Internal'
					AND DATE(mb.start_datetime) = %(scheduled_date)s
					AND mb.booking_status IN ('Confirmed', 'Pending')
			) as all_bookings
		"""
		result = frappe.db.sql(query, {"member": member, "scheduled_date": scheduled_date}, as_dict=True)
		day_bookings = result[0].count if result else 0

		if day_bookings >= rule.max_bookings_per_day:
			return {
				"available": False,
				"reason": f"Member has reached maximum bookings per day ({rule.max_bookings_per_day})"
			}

	# Check max bookings per week
	if rule.max_bookings_per_week:
		# Calculate week start (Monday) and end (Sunday)
		week_start = scheduled_date - timedelta(days=scheduled_date.weekday())
		week_end = week_start + timedelta(days=6)

		# Count bookings where member is host OR internal participant
		query = """
			SELECT COUNT(*) as count FROM (
				SELECT DISTINCT mb.name
				FROM `tabMM Meeting Booking` mb
				INNER JOIN `tabMM Meeting Booking Assigned User` au
					ON au.parent = mb.name AND au.parenttype = 'MM Meeting Booking'
				WHERE au.user = %(member)s
					AND DATE(mb.start_datetime) BETWEEN %(week_start)s AND %(week_end)s
					AND mb.booking_status IN ('Confirmed', 'Pending')
				UNION
				SELECT DISTINCT mb.name
				FROM `tabMM Meeting Booking` mb
				INNER JOIN `tabMM Meeting Booking Participant` p
					ON p.parent = mb.name AND p.parenttype = 'MM Meeting Booking'
				WHERE p.user = %(member)s
					AND p.participant_type = 'Internal'
					AND DATE(mb.start_datetime) BETWEEN %(week_start)s AND %(week_end)s
					AND mb.booking_status IN ('Confirmed', 'Pending')
			) as all_bookings
		"""
		result = frappe.db.sql(query, {"member": member, "week_start": week_start, "week_end": week_end}, as_dict=True)
		week_bookings = result[0].count if result else 0

		if week_bookings >= rule.max_bookings_per_week:
			return {
				"available": False,
				"reason": f"Member has reached maximum bookings per week ({rule.max_bookings_per_week})"
			}

	return {"available": True, "reason": None}


def validate_minimum_notice(member, scheduled_datetime):
	"""
	Check if booking respects minimum notice period

	Args:
		member (str): User ID
		scheduled_datetime (datetime): Scheduled start datetime

	Returns:
		dict: {"valid": bool, "reason": str}
	"""
	# Get user's availability rules
	availability_rules = frappe.get_all(
		"MM User Availability Rule",
		filters={"user": member},
		fields=["min_notice_hours", "is_default"],
		order_by="is_default desc",
		limit=1
	)

	if not availability_rules or not availability_rules[0].min_notice_hours:
		return {"valid": True, "reason": None}

	min_notice_hours = availability_rules[0].min_notice_hours
	min_allowed_datetime = now_datetime() + timedelta(hours=min_notice_hours)

	if scheduled_datetime < min_allowed_datetime:
		return {
			"valid": False,
			"reason": f"Booking requires at least {min_notice_hours} hours notice"
		}

	return {"valid": True, "reason": None}


def validate_advance_booking_window(member, scheduled_date):
	"""
	Check if booking is within the allowed advance booking window

	Args:
		member (str): User ID
		scheduled_date (date): Scheduled date

	Returns:
		dict: {"valid": bool, "reason": str}
	"""
	# Get user's availability rules
	availability_rules = frappe.get_all(
		"MM User Availability Rule",
		filters={"user": member},
		fields=["max_days_advance", "is_default"],
		order_by="is_default desc",
		limit=1
	)

	if not availability_rules or not availability_rules[0].max_days_advance:
		return {"valid": True, "reason": None}

	max_days_advance = availability_rules[0].max_days_advance
	max_allowed_date = getdate() + timedelta(days=max_days_advance)

	if scheduled_date > max_allowed_date:
		return {
			"valid": False,
			"reason": f"Booking is too far in advance (maximum {max_days_advance} days)"
		}

	return {"valid": True, "reason": None}
