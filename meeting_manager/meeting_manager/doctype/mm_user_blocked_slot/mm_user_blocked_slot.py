# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_time


class MMUserBlockedSlot(Document):
	def validate(self):
		"""Validate blocked slot before saving"""
		self.validate_reason()
		self.validate_times()
		self.validate_no_overlap_with_own_blocked_slots()
		self.validate_user_permission()

	def validate_reason(self):
		"""Ensure reason is provided and not empty"""
		if not self.reason or not self.reason.strip():
			frappe.throw(_("Reason is mandatory. Please provide a reason for blocking this time slot."))

	def validate_times(self):
		"""Ensure start_time < end_time"""
		start = get_time(self.start_time)
		end = get_time(self.end_time)

		if start >= end:
			frappe.throw(_("Start time must be before end time"))

	def validate_no_overlap_with_own_blocked_slots(self):
		"""Ensure no overlapping blocked slots for the same user on the same date"""
		existing_slots = frappe.get_all(
			"MM User Blocked Slot",
			filters={
				"user": self.user,
				"blocked_date": self.blocked_date,
				"name": ["!=", self.name or ""]
			},
			fields=["name", "start_time", "end_time"]
		)

		if not existing_slots:
			return

		new_start = get_time(self.start_time)
		new_end = get_time(self.end_time)

		for slot in existing_slots:
			existing_start = get_time(slot.start_time)
			existing_end = get_time(slot.end_time)

			# Check for overlap: NOT (new_end <= existing_start OR new_start >= existing_end)
			if not (new_end <= existing_start or new_start >= existing_end):
				frappe.throw(
					_("This blocked slot overlaps with existing slot {0} ({1} - {2})").format(
						slot.name, slot.start_time, slot.end_time
					)
				)

	def validate_user_permission(self):
		"""Validate user has permission to create/modify this blocked slot"""
		current_user = frappe.session.user

		# System Manager can manage any user's blocks
		if "System Manager" in frappe.get_roles(current_user):
			return

		# Department Leader can manage their team's blocks
		if "MM Department Leader" in frappe.get_roles(current_user):
			# Check if target user is in a department led by current user
			led_depts = frappe.get_all(
				"MM Department",
				filters={"department_leader": current_user, "is_active": 1},
				pluck="name"
			)

			if led_depts:
				user_in_led_dept = frappe.db.exists("MM Department Member", {
					"parent": ["in", led_depts],
					"member": self.user,
					"is_active": 1
				})

				if user_in_led_dept or self.user == current_user:
					return

		# Department Member can only manage their own blocks
		if self.user != current_user:
			frappe.throw(_("You can only manage your own blocked slots"))
