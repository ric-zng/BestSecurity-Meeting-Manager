# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

"""
Dashboard API
Returns scope-filtered dashboard data (My / Team / All).

Scope logic:
- My:   bookings where user is an assigned host OR an internal participant
- Team: bookings where any team member is an assigned host or participant
- All:  all bookings (system_manager only)
"""

import frappe
from frappe import _
from frappe.utils import nowdate, getdate, get_first_day, get_last_day, add_days
from meeting_manager.meeting_manager.doctype.mm_booking_status.mm_booking_status import get_finalized_statuses


@frappe.whitelist()
def get_dashboard_data(scope="my"):
	"""
	Return dashboard statistics and meeting lists filtered by scope.

	Args:
		scope: 'my' | 'team' | 'all'

	Returns:
		dict with stats, today_meetings, upcoming_meetings, recent_bookings, blocked_slots
	"""
	user = frappe.session.user
	today = nowdate()

	# Get booking names the user/team is involved in
	booking_names = _get_scoped_booking_names(scope, user)

	# Date boundaries
	weekday = getdate(today).weekday()  # Monday=0
	monday = add_days(today, -weekday)
	sunday = add_days(monday, 6)
	month_start = get_first_day(today)
	month_end = get_last_day(today)

	finalized = get_finalized_statuses()
	active_statuses = ["not in", finalized] if finalized else ["is", "set"]
	pending_statuses = ["in", ["New Booking", "New Appointment"]]

	# For "all" scope (system_manager), no name filter needed
	if booking_names is None:
		# None means "no restriction" (all scope)
		base = {}
	elif not booking_names:
		# Empty list means no matching bookings
		return _empty_response(scope, user, today)
	else:
		base = {"name": ["in", booking_names]}

	active_base = {**base, "booking_status": active_statuses}

	# Stats
	today_count = _count("MM Meeting Booking", {
		**active_base,
		"start_datetime": [">=", f"{today} 00:00:00"],
		"end_datetime": ["<=", f"{today} 23:59:59"],
	})

	week_count = _count("MM Meeting Booking", {
		**active_base,
		"start_datetime": [">=", f"{monday} 00:00:00"],
		"end_datetime": ["<=", f"{sunday} 23:59:59"],
	})

	pending_count = _count("MM Meeting Booking", {
		**base,
		"booking_status": pending_statuses,
	})

	month_count = _count("MM Meeting Booking", {
		**base,
		"start_datetime": [">=", f"{month_start} 00:00:00"],
		"end_datetime": ["<=", f"{month_end} 23:59:59"],
	})

	# Meeting fields
	fields = [
		"name", "meeting_title", "booking_status", "start_datetime",
		"end_datetime", "customer", "is_internal", "select_mkru",
		"created_by",
	]

	# Today's meetings
	today_meetings = frappe.get_all("MM Meeting Booking",
		filters={
			**active_base,
			"start_datetime": ["between", [f"{today} 00:00:00", f"{today} 23:59:59"]],
		},
		fields=fields,
		order_by="start_datetime asc",
		limit_page_length=20,
	)

	# Upcoming this week (after today, before end of week)
	upcoming_meetings = frappe.get_all("MM Meeting Booking",
		filters={
			**active_base,
			"start_datetime": [">", f"{today} 23:59:59"],
			"end_datetime": ["<=", f"{sunday} 23:59:59"],
		},
		fields=fields,
		order_by="start_datetime asc",
		limit_page_length=10,
	)

	# Recent bookings (any status, ordered by creation)
	recent_bookings = frappe.get_all("MM Meeting Booking",
		filters=base,
		fields=fields,
		order_by="creation desc",
		limit_page_length=5,
	)

	# Enrich with creator names and user's role in each meeting
	all_meetings = today_meetings + upcoming_meetings + recent_bookings
	_enrich_creator_names(all_meetings)

	if scope == "my":
		_enrich_user_role(all_meetings, user)

	# Blocked slots (only for 'my' scope)
	blocked_slots = []
	if scope == "my":
		blocked_slots = frappe.get_all("MM User Blocked Slot",
			filters={"user": user, "blocked_date": today},
			fields=["name", "start_time", "end_time", "reason"],
			order_by="start_time asc",
			limit_page_length=10,
		)

	return {
		"stats": {
			"today": today_count,
			"week": week_count,
			"pending": pending_count,
			"month": month_count,
		},
		"today_meetings": today_meetings,
		"upcoming_meetings": upcoming_meetings,
		"recent_bookings": recent_bookings,
		"blocked_slots": blocked_slots,
	}


def _get_scoped_booking_names(scope, user):
	"""
	Return list of booking names visible to the user for the given scope.
	Returns None for "all" scope (no restriction).

	- my:   assigned as host OR internal participant
	- team: any team member assigned as host or participant
	- all:  None (no restriction, system_manager only)
	"""
	if scope == "all":
		roles = frappe.get_roles(user)
		if "System Manager" not in roles:
			return _get_user_booking_names(user)
		return None  # no restriction

	if scope == "team":
		team_members = _get_team_members(user)
		return _get_users_booking_names(team_members)

	# "my" scope
	return _get_user_booking_names(user)


def _get_user_booking_names(user):
	"""Get all booking names where user is assigned host or internal participant."""
	return _get_users_booking_names([user])


def _get_users_booking_names(users):
	"""
	Get all booking names where any of the given users is:
	1. An assigned host (in assigned_users child table)
	2. An internal participant (in participants child table)
	"""
	if not users:
		return []

	user_tuple = tuple(users) if len(users) > 1 else (users[0], users[0])

	names = frappe.db.sql("""
		SELECT DISTINCT booking.name
		FROM `tabMM Meeting Booking` booking
		WHERE booking.name IN (
			SELECT au.parent FROM `tabMM Meeting Booking Assigned User` au
			WHERE au.user IN %s
		)
		OR booking.name IN (
			SELECT p.parent FROM `tabMM Meeting Booking Participant` p
			WHERE p.user IN %s AND p.participant_type = 'Internal'
		)
	""", (user_tuple, user_tuple), as_dict=True)

	return [r.name for r in names]


def _get_team_members(user):
	"""
	Get all active members (including leaders) of departments
	the current user belongs to or leads.
	"""
	member_depts = frappe.db.sql("""
		SELECT DISTINCT d.name
		FROM `tabMM Department` d
		INNER JOIN `tabMM Department Member` dm ON dm.parent = d.name
		WHERE dm.member = %s AND dm.is_active = 1 AND d.is_active = 1
	""", (user,), as_dict=True)

	leader_depts = frappe.get_all("MM Department",
		filters={"department_leader": user, "is_active": 1},
		fields=["name"],
	)

	dept_names = list({d.name for d in member_depts + leader_depts})
	if not dept_names:
		return [user]

	members = frappe.db.sql("""
		SELECT DISTINCT dm.member
		FROM `tabMM Department Member` dm
		WHERE dm.parent IN %s AND dm.is_active = 1
	""", (tuple(dept_names),), as_dict=True)

	leaders = frappe.get_all("MM Department",
		filters={"name": ["in", dept_names]},
		fields=["department_leader"],
	)

	team = {m.member for m in members}
	team.update(l.department_leader for l in leaders if l.department_leader)
	team.add(user)

	return list(team)


def _enrich_creator_names(meetings):
	"""Add full_name for created_by users."""
	emails = {m.created_by for m in meetings if m.created_by}
	if not emails:
		return

	users = frappe.get_all("User",
		filters={"name": ["in", list(emails)]},
		fields=["name", "full_name"],
	)
	name_map = {u.name: u.full_name for u in users}

	for m in meetings:
		m["created_by_name"] = name_map.get(m.created_by, m.created_by)


def _enrich_user_role(meetings, user):
	"""
	Add 'my_role' field to each meeting indicating the user's involvement:
	'host' (primary), 'co-host', 'participant', or 'creator'.
	"""
	if not meetings:
		return

	booking_names = [m.name for m in meetings]
	name_tuple = tuple(booking_names) if len(booking_names) > 1 else (booking_names[0], booking_names[0])

	# Check assigned_users
	hosts = frappe.db.sql("""
		SELECT parent, is_primary_host
		FROM `tabMM Meeting Booking Assigned User`
		WHERE parent IN %s AND user = %s
	""", (name_tuple, user), as_dict=True)
	host_map = {h.parent: h.is_primary_host for h in hosts}

	# Check participants
	participants = frappe.db.sql("""
		SELECT parent
		FROM `tabMM Meeting Booking Participant`
		WHERE parent IN %s AND user = %s AND participant_type = 'Internal'
	""", (name_tuple, user), as_dict=True)
	participant_set = {p.parent for p in participants}

	for m in meetings:
		if m.name in host_map:
			m["my_role"] = "Host" if host_map[m.name] else "Co-host"
		elif m.name in participant_set:
			m["my_role"] = "Participant"
		else:
			m["my_role"] = ""


def _empty_response(scope, user, today):
	"""Return empty dashboard data."""
	blocked_slots = []
	if scope == "my":
		blocked_slots = frappe.get_all("MM User Blocked Slot",
			filters={"user": user, "blocked_date": today},
			fields=["name", "start_time", "end_time", "reason"],
			order_by="start_time asc",
			limit_page_length=10,
		)

	return {
		"stats": {"today": 0, "week": 0, "pending": 0, "month": 0},
		"today_meetings": [],
		"upcoming_meetings": [],
		"recent_bookings": [],
		"blocked_slots": blocked_slots,
	}


def _count(doctype, filters):
	"""Safe count wrapper."""
	try:
		return frappe.db.count(doctype, filters) or 0
	except Exception:
		return 0
