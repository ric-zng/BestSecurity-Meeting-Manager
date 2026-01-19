# Copyright (c) 2025, Best Security and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import get_url


class MMDepartment(Document):
	def validate(self):
		"""Validate department before saving"""
		self.validate_department_leader()
		self.validate_active_members()
		self.validate_department_slug()
		self.set_public_booking_url()

	def before_save(self):
		"""Store previous values for role sync comparison"""
		if not self.is_new():
			# Get previous leader from database
			self._previous_leader = frappe.db.get_value(
				"MM Department", self.name, "department_leader"
			)
			# Get previous active members from database
			self._previous_active_members = set(
				frappe.db.get_all(
					"MM Department Member",
					filters={"parent": self.name, "is_active": 1},
					pluck="member"
				)
			)
		else:
			self._previous_leader = None
			self._previous_active_members = set()

	def on_update(self):
		"""Sync roles after department is saved"""
		self.sync_leader_role()
		self.sync_member_roles()

	def on_trash(self):
		"""Revoke roles when department is deleted"""
		self.revoke_all_roles_on_delete()

	def sync_leader_role(self):
		"""Assign/revoke leader role based on department_leader changes"""
		from meeting_manager.meeting_manager.services.role_service import (
			sync_leader_role_on_department_change
		)

		old_leader = getattr(self, "_previous_leader", None)
		new_leader = self.department_leader

		sync_leader_role_on_department_change(self.name, old_leader, new_leader)

	def sync_member_roles(self):
		"""Assign/revoke member roles based on department_members changes"""
		from meeting_manager.meeting_manager.services.role_service import (
			sync_member_roles_on_department_change
		)

		old_members = getattr(self, "_previous_active_members", set())
		new_members = set(
			m.member for m in self.department_members if m.is_active
		)

		sync_member_roles_on_department_change(self.name, old_members, new_members)

	def revoke_all_roles_on_delete(self):
		"""Revoke roles from leader and all members when department is deleted"""
		from meeting_manager.meeting_manager.services.role_service import (
			sync_all_roles_on_department_delete
		)

		leader = self.department_leader
		members = [m.member for m in self.department_members]

		sync_all_roles_on_department_delete(self.name, leader, members)
        

	def validate_department_leader(self):
		"""Ensure department leader is an active member of the department"""
		if not self.department_leader:
			return

		# Check if leader exists in department_members child table
		leader_found = False
		leader_is_active = False

		for member in self.department_members:
			if member.member == self.department_leader:
				leader_found = True
				if member.is_active:
					leader_is_active = True
				break

		if not leader_found:
			frappe.throw(
				f"Department Leader '{self.department_leader}' must be added as a member in the Department Members table."
			)

		if not leader_is_active:
			frappe.throw(
				f"Department Leader '{self.department_leader}' must be an active member. Please enable the 'Is Active' checkbox for this member."
			)

	def validate_active_members(self):
		"""Ensure at least one active member exists and validate member details"""
		if not self.department_members:
			frappe.throw("Department must have at least one member.")

		# Check for duplicate members
		member_list = [m.member for m in self.department_members]
		if len(member_list) != len(set(member_list)):
			frappe.throw("Duplicate members found. Each user can only be added once to the department.")

		# Validate each member exists and validate assignment_priority
		for member in self.department_members:
			if not frappe.db.exists("User", member.member):
				frappe.throw(f"User '{member.member}' does not exist.")

			# Validate assignment_priority is positive
			if member.assignment_priority is not None and member.assignment_priority <= 0:
				frappe.throw(f"Assignment Priority for member '{member.member}' must be greater than 0.")
    
			# Validate assignment_priority is not greater than 10
			if member.assignment_priority is not None and member.assignment_priority > 10:
				frappe.throw(f"Assignment Priority for member '{member.member}' must be less or equal to 10.")

		active_members = [m for m in self.department_members if m.is_active]

		if not active_members:
			frappe.throw("Department must have at least one active member. Please enable 'Is Active' for at least one member.")

	def validate_department_slug(self):
		"""Ensure department_slug is URL-safe and unique"""
		if not self.department_slug:
			frappe.throw("Department Slug is required.")

		import re

		# Convert to lowercase and strip leading/trailing whitespace
		self.department_slug = self.department_slug.lower().strip()

		# Replace spaces with hyphens
		self.department_slug = self.department_slug.replace(" ", "-")

		# Remove any characters that aren't lowercase letters, numbers, or hyphens
		self.department_slug = re.sub(r'[^a-z0-9\-]', '', self.department_slug)

		# Replace consecutive hyphens with a single hyphen
		self.department_slug = re.sub(r'-+', '-', self.department_slug)

		# Remove leading and trailing hyphens
		self.department_slug = self.department_slug.strip('-')

		# Ensure slug is not empty after cleaning
		if not self.department_slug:
			frappe.throw("Department Slug must contain at least one letter or number.")

		# Check uniqueness (excluding current document if updating)
		filters = {"department_slug": self.department_slug}
		if not self.is_new():
			filters["name"] = ["!=", self.name]

		existing = frappe.db.exists("MM Department", filters)
		if existing:
			frappe.throw(f"Department Slug '{self.department_slug}' already exists. Please use a unique slug.")

	def set_public_booking_url(self):
		"""Auto-generate public booking URL based on department slug"""
		site_url = get_url()
		self.public_booking_url = f"{site_url}/book/{self.department_slug}"
