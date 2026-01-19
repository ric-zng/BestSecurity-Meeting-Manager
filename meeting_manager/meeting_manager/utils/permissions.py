# Copyright (c) 2025, Best Security and contributors
# For license information, please see license.txt

"""
Permission helpers for Meeting Manager app
"""

import frappe

# Role name constants
MM_DEPARTMENT_LEADER_ROLE = "MM Department Leader"
MM_DEPARTMENT_MEMBER_ROLE = "MM Department Member"


def has_app_permission(user=None):
	"""
	Check if user has permission to access Meeting Manager app

	Anyone with the following roles can access:
	- System Manager
	- MM Department Leader
	- MM Department Member
	- Any user who is an active member of at least one department

	Args:
		user (str, optional): User ID. Defaults to current user.

	Returns:
		bool: True if user has access, False otherwise
	"""
	if not user:
		user = frappe.session.user

	# Guest users cannot access
	if user == "Guest":
		return False

	# Get user roles
	roles = frappe.get_roles(user)

	# System Managers always have access
	if "System Manager" in roles:
		return True

	# MM Department Leaders have access
	if MM_DEPARTMENT_LEADER_ROLE in roles:
		return True

	# MM Department Members have access
	if MM_DEPARTMENT_MEMBER_ROLE in roles:
		return True

	# Fallback: Check if user is an active member of any department
	# (in case role assignment hasn't happened yet)
	is_member = frappe.db.exists(
		"MM Department Member",
		{
			"member": user,
			"is_active": 1
		}
	)

	if is_member:
		return True

	# No access
	return False


def is_department_leader(user=None):
	"""
	Check if user is a department leader.

	Args:
		user (str, optional): User ID. Defaults to current user.

	Returns:
		bool: True if user is a department leader
	"""
	if not user:
		user = frappe.session.user

	roles = frappe.get_roles(user)
	return MM_DEPARTMENT_LEADER_ROLE in roles


def is_department_member(user=None):
	"""
	Check if user is a department member.

	Args:
		user (str, optional): User ID. Defaults to current user.

	Returns:
		bool: True if user is a department member
	"""
	if not user:
		user = frappe.session.user

	roles = frappe.get_roles(user)
	return MM_DEPARTMENT_MEMBER_ROLE in roles


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
			filters={"department_leader": user},
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
