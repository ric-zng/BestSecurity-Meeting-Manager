"""
Meeting Manager Self Book Meeting Page
Allows users to create meetings with customers on their own available time slots
"""

import frappe

def get_context(context):
	"""
	Setup context for self-booking page
	"""
	context.no_cache = 1

	# Ensure user is logged in
	if frappe.session.user == "Guest":
		frappe.throw("You must be logged in to access this page", frappe.PermissionError)

	return context
