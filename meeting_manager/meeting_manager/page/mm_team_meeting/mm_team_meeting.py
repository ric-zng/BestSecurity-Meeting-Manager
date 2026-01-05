"""
Meeting Manager Team Meeting Page
Allows Department Leaders to schedule internal meetings with team members
"""

import frappe

def get_context(context):
	"""
	Setup context for team meeting page
	"""
	context.no_cache = 1

	# Ensure user is logged in
	if frappe.session.user == "Guest":
		frappe.throw("You must be logged in to access this page", frappe.PermissionError)

	# Check if user is a department leader
	led_departments = frappe.get_all(
		"MM Department",
		filters={"department_leader": frappe.session.user},
		fields=["name", "department_name"]
	)

	if not led_departments and "System Manager" not in frappe.get_roles():
		frappe.throw("You must be a Department Leader or System Manager to access this page", frappe.PermissionError)

	return context
