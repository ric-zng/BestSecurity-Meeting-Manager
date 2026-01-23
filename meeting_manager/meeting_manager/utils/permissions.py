# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

"""
Meeting Manager - Comprehensive Permission System

This module implements role-based access control with data filtering:

1. HIERARCHICAL PERMISSIONS:
   - System Manager: Full access to everything
   - MM Department Leader: Manage own department + team members
   - MM Department Member: Manage own data only

2. DATA FILTERING (get_permission_query_conditions):
   - Leaders see only their department's data
   - Members see only data they're assigned to

3. ROW-LEVEL SECURITY (has_permission):
   - Validates access to specific records
"""

import frappe
from frappe import _

# Role name constants
MM_DEPARTMENT_LEADER_ROLE = "MM Department Leader"
MM_DEPARTMENT_MEMBER_ROLE = "MM Department Member"


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def is_system_manager(user=None):
	"""Check if user is System Manager"""
	if not user:
		user = frappe.session.user
	return "System Manager" in frappe.get_roles(user)


def is_department_leader(user=None):
	"""Check if user is MM Department Leader"""
	if not user:
		user = frappe.session.user
	return MM_DEPARTMENT_LEADER_ROLE in frappe.get_roles(user)


def is_department_member(user=None):
	"""Check if user is MM Department Member"""
	if not user:
		user = frappe.session.user
	return MM_DEPARTMENT_MEMBER_ROLE in frappe.get_roles(user)


def get_user_departments(user=None, as_leader=False, as_member=False):
	"""
	Get list of departments the user belongs to.

	Args:
		user (str, optional): User ID. Defaults to current user.
		as_leader (bool): Only return departments where user is leader
		as_member (bool): Only return departments where user is active member

	Returns:
		list: List of department names
	"""
	if not user:
		user = frappe.session.user

	departments = set()

	if as_leader or (not as_leader and not as_member):
		# Get departments where user is leader
		leader_depts = frappe.db.get_all(
			"MM Department",
			filters={"department_leader": user, "is_active": 1},
			pluck="name"
		)
		departments.update(leader_depts)

	if as_member or (not as_leader and not as_member):
		# Get departments where user is active member
		member_depts = frappe.db.get_all(
			"MM Department Member",
			filters={"member": user, "is_active": 1},
			pluck="parent"
		)
		departments.update(member_depts)

	return list(departments)


def get_led_departments(user=None):
	"""Get departments where user is the leader"""
	if not user:
		user = frappe.session.user

	return frappe.get_all(
		"MM Department",
		filters={"department_leader": user, "is_active": 1},
		pluck="name"
	)


def get_team_members(user=None):
	"""Get all team members in departments led by user"""
	if not user:
		user = frappe.session.user

	led_depts = get_led_departments(user)
	if not led_depts:
		return [user]  # At least include themselves

	members = frappe.get_all(
		"MM Department Member",
		filters={"parent": ["in", led_depts], "is_active": 1},
		pluck="member"
	)

	# Include the leader themselves
	if user not in members:
		members.append(user)

	return list(set(members))


def has_app_permission(user=None):
	"""
	Check if user has permission to access Meeting Manager app

	Anyone with the following roles can access:
	- System Manager
	- MM Department Leader
	- MM Department Member
	- Any user who is an active member of at least one department
	"""
	if not user:
		user = frappe.session.user

	if user == "Guest":
		return False

	if user == "Administrator":
		return True

	roles = frappe.get_roles(user)

	if "System Manager" in roles:
		return True

	if MM_DEPARTMENT_LEADER_ROLE in roles:
		return True

	if MM_DEPARTMENT_MEMBER_ROLE in roles:
		return True

	# Fallback: Check if user is an active member of any department
	is_member = frappe.db.exists(
		"MM Department Member",
		{"member": user, "is_active": 1}
	)

	return bool(is_member)


# =============================================================================
# MM MEETING BOOKING - Permission Query Conditions
# =============================================================================

def get_mm_meeting_booking_permission_query_conditions(user):
	"""
	Filter MM Meeting Booking list based on user role:
	- System Manager: See all
	- Department Leader: See bookings where assigned users are in their departments
	- Department Member: See bookings they are assigned to
	"""
	if not user:
		user = frappe.session.user

	if user == "Administrator" or is_system_manager(user):
		return ""

	if is_department_leader(user):
		team_members = get_team_members(user)
		if team_members:
			members_str = ", ".join([frappe.db.escape(m) for m in team_members])
			return f"""
				`tabMM Meeting Booking`.name IN (
					SELECT DISTINCT parent FROM `tabMM Meeting Booking Assigned User`
					WHERE user IN ({members_str})
				)
			"""
		return "1=0"

	if is_department_member(user):
		return f"""
			`tabMM Meeting Booking`.name IN (
				SELECT parent FROM `tabMM Meeting Booking Assigned User`
				WHERE user = {frappe.db.escape(user)}
			)
		"""

	return "1=0"


def has_mm_meeting_booking_permission(doc, ptype, user):
	"""Row-level permission check for MM Meeting Booking"""
	if not user:
		user = frappe.session.user

	if user == "Administrator" or is_system_manager(user):
		return True

	# Get assigned users for this booking
	assigned_users = [au.user for au in doc.assigned_users] if doc.assigned_users else []

	if is_department_leader(user):
		team_members = get_team_members(user)
		return any(au in team_members for au in assigned_users)

	if is_department_member(user):
		return user in assigned_users

	return False


# =============================================================================
# MM CUSTOMER - Permission Query Conditions
# =============================================================================

def get_mm_customer_permission_query_conditions(user):
	"""
	Filter MM Customer list based on user role:
	- System Manager: See all
	- Department Leader: See customers who have bookings with their team
	- Department Member: See customers from bookings they're assigned to
	"""
	if not user:
		user = frappe.session.user

	if user == "Administrator" or is_system_manager(user):
		return ""

	if is_department_leader(user):
		team_members = get_team_members(user)
		if team_members:
			members_str = ", ".join([frappe.db.escape(m) for m in team_members])
			return f"""
				`tabMM Customer`.name IN (
					SELECT DISTINCT mb.customer FROM `tabMM Meeting Booking` mb
					INNER JOIN `tabMM Meeting Booking Assigned User` au ON au.parent = mb.name
					WHERE au.user IN ({members_str}) AND mb.customer IS NOT NULL
				)
			"""
		return "1=0"

	if is_department_member(user):
		return f"""
			`tabMM Customer`.name IN (
				SELECT DISTINCT mb.customer FROM `tabMM Meeting Booking` mb
				INNER JOIN `tabMM Meeting Booking Assigned User` au ON au.parent = mb.name
				WHERE au.user = {frappe.db.escape(user)} AND mb.customer IS NOT NULL
			)
		"""

	return "1=0"


def has_mm_customer_permission(doc, ptype, user):
	"""Row-level permission check for MM Customer"""
	if not user:
		user = frappe.session.user

	if user == "Administrator" or is_system_manager(user):
		return True

	# For create permission, allow if user has the role
	if ptype == "create":
		return is_department_leader(user)

	# Check if user has access to any booking with this customer
	customer_bookings = frappe.get_all(
		"MM Meeting Booking",
		filters={"customer": doc.name},
		pluck="name"
	)

	if not customer_bookings:
		# New customer or no bookings - leaders can access
		return is_department_leader(user)

	if is_department_leader(user):
		team_members = get_team_members(user)
		booking_exists = frappe.db.exists(
			"MM Meeting Booking Assigned User",
			{
				"user": ["in", team_members],
				"parent": ["in", customer_bookings]
			}
		)
		return bool(booking_exists)

	if is_department_member(user):
		booking_exists = frappe.db.exists(
			"MM Meeting Booking Assigned User",
			{
				"user": user,
				"parent": ["in", customer_bookings]
			}
		)
		return bool(booking_exists)

	return False


# =============================================================================
# MM DEPARTMENT - Permission Query Conditions
# =============================================================================

def get_mm_department_permission_query_conditions(user):
	"""
	Filter MM Department list based on user role:
	- System Manager: See all
	- Department Leader: See departments they lead
	- Department Member: See departments they belong to
	"""
	if not user:
		user = frappe.session.user

	if user == "Administrator" or is_system_manager(user):
		return ""

	if is_department_leader(user):
		led_depts = get_led_departments(user)
		if led_depts:
			depts_str = ", ".join([frappe.db.escape(d) for d in led_depts])
			return f"`tabMM Department`.name IN ({depts_str})"
		return "1=0"

	if is_department_member(user):
		user_depts = get_user_departments(user, as_member=True)
		if user_depts:
			depts_str = ", ".join([frappe.db.escape(d) for d in user_depts])
			return f"`tabMM Department`.name IN ({depts_str})"
		return "1=0"

	return "1=0"


def has_mm_department_permission(doc, ptype, user):
	"""Row-level permission check for MM Department"""
	if not user:
		user = frappe.session.user

	if user == "Administrator" or is_system_manager(user):
		return True

	if is_department_leader(user):
		# Can only access departments they lead
		if ptype in ("write", "delete"):
			return doc.department_leader == user
		# Can read departments they lead
		return doc.department_leader == user

	if is_department_member(user):
		# Can only read departments they belong to
		if ptype != "read":
			return False
		is_member = frappe.db.exists("MM Department Member", {
			"parent": doc.name,
			"member": user,
			"is_active": 1
		})
		return bool(is_member)

	return False


# =============================================================================
# MM MEETING TYPE - Permission Query Conditions
# =============================================================================

def get_mm_meeting_type_permission_query_conditions(user):
	"""
	Filter MM Meeting Type:
	- System Manager: See all
	- Department Leader: See meeting types for their departments
	- Department Member: See meeting types for their departments
	"""
	if not user:
		user = frappe.session.user

	if user == "Administrator" or is_system_manager(user):
		return ""

	# Get user's departments (either as leader or member)
	all_depts = get_user_departments(user)

	if all_depts:
		depts_str = ", ".join([frappe.db.escape(d) for d in all_depts])
		return f"`tabMM Meeting Type`.department IN ({depts_str})"

	return "1=0"


def has_mm_meeting_type_permission(doc, ptype, user):
	"""Row-level permission check for MM Meeting Type"""
	if not user:
		user = frappe.session.user

	if user == "Administrator" or is_system_manager(user):
		return True

	all_depts = get_user_departments(user)

	if ptype in ("write", "delete", "create"):
		# Only leaders can modify meeting types
		if not is_department_leader(user):
			return False
		led_depts = get_led_departments(user)
		return doc.department in led_depts

	# Read access for any department member
	return doc.department in all_depts


# =============================================================================
# MM USER SETTINGS - Permission Query Conditions
# =============================================================================

def get_mm_user_settings_permission_query_conditions(user):
	"""
	Filter MM User Settings:
	- System Manager: See all
	- Department Leader: See own + team members' settings
	- Department Member: See only own settings
	"""
	if not user:
		user = frappe.session.user

	if user == "Administrator" or is_system_manager(user):
		return ""

	if is_department_leader(user):
		team_members = get_team_members(user)
		if team_members:
			members_str = ", ".join([frappe.db.escape(m) for m in team_members])
			return f"`tabMM User Settings`.user IN ({members_str})"
		return f"`tabMM User Settings`.user = {frappe.db.escape(user)}"

	return f"`tabMM User Settings`.user = {frappe.db.escape(user)}"


def has_mm_user_settings_permission(doc, ptype, user):
	"""Row-level permission check for MM User Settings"""
	if not user:
		user = frappe.session.user

	if user == "Administrator" or is_system_manager(user):
		return True

	# Own settings - always allowed
	if doc.user == user:
		return True

	if is_department_leader(user):
		team_members = get_team_members(user)
		# Leaders can read team settings, but only edit own
		if ptype in ("write", "delete"):
			return doc.user == user
		return doc.user in team_members

	return False


# =============================================================================
# MM USER AVAILABILITY RULE - Permission Query Conditions
# =============================================================================

def get_mm_user_availability_rule_permission_query_conditions(user):
	"""
	Filter MM User Availability Rule:
	- System Manager: See all
	- Department Leader: See own + team members' rules
	- Department Member: See only own rules
	"""
	if not user:
		user = frappe.session.user

	if user == "Administrator" or is_system_manager(user):
		return ""

	if is_department_leader(user):
		team_members = get_team_members(user)
		if team_members:
			members_str = ", ".join([frappe.db.escape(m) for m in team_members])
			return f"`tabMM User Availability Rule`.user IN ({members_str})"
		return f"`tabMM User Availability Rule`.user = {frappe.db.escape(user)}"

	return f"`tabMM User Availability Rule`.user = {frappe.db.escape(user)}"


def has_mm_user_availability_rule_permission(doc, ptype, user):
	"""Row-level permission check for MM User Availability Rule"""
	if not user:
		user = frappe.session.user

	if user == "Administrator" or is_system_manager(user):
		return True

	if doc.user == user:
		return True

	if is_department_leader(user):
		team_members = get_team_members(user)
		# Leaders can read team rules, but only edit own
		if ptype in ("write", "delete"):
			return doc.user == user
		return doc.user in team_members

	return False


# =============================================================================
# MM USER BLOCKED SLOT - Permission Query Conditions
# =============================================================================

def get_mm_user_blocked_slot_permission_query_conditions(user):
	"""
	Filter MM User Blocked Slot:
	- System Manager: See all
	- Department Leader: See own + team members' blocked slots
	- Department Member: See only own blocked slots
	"""
	if not user:
		user = frappe.session.user

	if user == "Administrator" or is_system_manager(user):
		return ""

	if is_department_leader(user):
		team_members = get_team_members(user)
		if team_members:
			members_str = ", ".join([frappe.db.escape(m) for m in team_members])
			return f"`tabMM User Blocked Slot`.user IN ({members_str})"
		return f"`tabMM User Blocked Slot`.user = {frappe.db.escape(user)}"

	return f"`tabMM User Blocked Slot`.user = {frappe.db.escape(user)}"


def has_mm_user_blocked_slot_permission(doc, ptype, user):
	"""Row-level permission check for MM User Blocked Slot"""
	if not user:
		user = frappe.session.user

	if user == "Administrator" or is_system_manager(user):
		return True

	if doc.user == user:
		return True

	if is_department_leader(user):
		team_members = get_team_members(user)
		return doc.user in team_members

	return False


# =============================================================================
# WHITELISTED API METHODS
# =============================================================================

@frappe.whitelist()
def get_my_permissions():
	"""Get current user's permissions summary"""
	user = frappe.session.user

	return {
		"user": user,
		"is_system_manager": is_system_manager(user),
		"is_department_leader": is_department_leader(user),
		"is_department_member": is_department_member(user),
		"departments": get_user_departments(user),
		"led_departments": get_led_departments(user),
		"team_members": get_team_members(user) if is_department_leader(user) else []
	}


@frappe.whitelist()
def can_access_user_data(target_user):
	"""Check if current user can access another user's data (settings, availability, blocked slots)"""
	user = frappe.session.user

	if user == "Administrator" or is_system_manager(user):
		return True

	if user == target_user:
		return True

	if is_department_leader(user):
		team_members = get_team_members(user)
		return target_user in team_members

	return False
