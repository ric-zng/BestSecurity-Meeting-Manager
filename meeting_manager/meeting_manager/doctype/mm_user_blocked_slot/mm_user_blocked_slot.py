# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_time, getdate, nowdate, get_datetime, now_datetime


class MMUserBlockedSlot(Document):
	def validate(self):
		"""Validate blocked slot before saving"""
		self.validate_reason()
		self.validate_times()
		self.validate_not_past()
		self.validate_no_overlap_with_own_blocked_slots()
		self.validate_no_overlap_with_meetings()
		self.validate_user_permission()

	def before_delete(self):
		"""Prevent deletion of past blocked slots"""
		self.validate_not_past_for_delete()

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

	def validate_not_past(self):
		"""Prevent editing past blocked slots"""
		if self.is_new():
			return

		# Check if the original (saved) date is in the past
		original = self.get_doc_before_save()
		if original and getdate(original.blocked_date) < getdate(nowdate()):
			frappe.throw(
				_("Cannot modify a past blocked slot (date: {0}). Past slots are kept for audit purposes.").format(
					original.blocked_date
				)
			)

		# Also prevent creating new blocks in the past
		if getdate(self.blocked_date) < getdate(nowdate()):
			frappe.throw(_("Cannot create a blocked slot for a past date."))

	def validate_not_past_for_delete(self):
		"""Prevent deletion of past blocked slots"""
		if getdate(self.blocked_date) < getdate(nowdate()):
			frappe.throw(
				_("Cannot delete a past blocked slot (date: {0}). Past slots are kept for audit purposes.").format(
					self.blocked_date
				)
			)

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

	def validate_no_overlap_with_meetings(self):
		"""Ensure blocked slot does not overlap with any existing meetings for this user"""
		block_date = getdate(self.blocked_date)
		block_start = get_datetime(f"{self.blocked_date} {self.start_time}")
		block_end = get_datetime(f"{self.blocked_date} {self.end_time}")

		# Find meetings where the user is the creator
		creator_meetings = frappe.get_all(
			"MM Meeting Booking",
			filters={
				"created_by": self.user,
				"booking_status": ["not in", ["Cancelled", "No-Show"]],
				"start_datetime": ["<=", block_end],
				"end_datetime": [">=", block_start],
			},
			fields=["name", "start_datetime", "end_datetime", "booking_status"]
		)

		# Find meetings where the user is an assigned member
		assigned_meetings = frappe.db.sql("""
			SELECT b.name, b.start_datetime, b.end_datetime, b.booking_status
			FROM `tabMM Meeting Booking` b
			INNER JOIN `tabMM Meeting Booking Assigned User` a ON a.parent = b.name
			WHERE a.user = %(user)s
			AND b.booking_status NOT IN ('Cancelled', 'No-Show')
			AND b.start_datetime <= %(block_end)s
			AND b.end_datetime >= %(block_start)s
			AND b.name NOT IN %(exclude_names)s
		""", {
			"user": self.user,
			"block_end": block_end,
			"block_start": block_start,
			"exclude_names": [m.name for m in creator_meetings] if creator_meetings else ["__none__"],
		}, as_dict=True)

		conflicting = creator_meetings + assigned_meetings

		if conflicting:
			meeting = conflicting[0]
			start_str = frappe.utils.format_datetime(meeting.start_datetime, "HH:mm")
			end_str = frappe.utils.format_datetime(meeting.end_datetime, "HH:mm")
			frappe.throw(
				_("Cannot block this time — it conflicts with meeting {0} ({1} – {2}, status: {3}). "
				  "Please cancel or reschedule the meeting first.").format(
					meeting.name, start_str, end_str, meeting.booking_status
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
