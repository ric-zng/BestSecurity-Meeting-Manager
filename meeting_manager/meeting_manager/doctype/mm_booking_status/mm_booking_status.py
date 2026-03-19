import frappe
from frappe.model.document import Document


class MMBookingStatus(Document):
	pass


def get_status_color_map():
	"""Return {status: color} dict for active statuses."""
	rows = frappe.get_all(
		"MM Booking Status",
		filters={"is_active": 1},
		fields=["status", "color"],
	)
	return {r.status: r.color for r in rows}


def get_finalized_statuses():
	"""Return list of status names where is_final=1."""
	return frappe.get_all(
		"MM Booking Status",
		filters={"is_final": 1},
		pluck="name",
	)


def get_active_statuses():
	"""Return list of active status names."""
	return frappe.get_all(
		"MM Booking Status",
		filters={"is_active": 1},
		pluck="name",
	)


def seed_default_statuses():
	"""Create default booking status entries if none exist."""
	if frappe.db.count("MM Booking Status") > 0:
		return

	final_statuses = {"Cancelled", "Sale Approved", "Booking Approved Not Sale", "Not Possible", "Completed"}

	defaults = {
		"New Booking": "#1e40af",
		"New Appointment": "#ec4899",
		"Booking Started": "#60a5fa",
		"Sale Approved": "#22c55e",
		"Booking Approved Not Sale": "#ef4444",
		"Call Customer About Sale": "#f97316",
		"No Answer 1-3": "#9ca3af",
		"No Answer 4-5": "#964B00",
		"Customer Unsure": "#7dd3fc",
		"No Contact About Offer": "#b91c1c",
		"Cancelled": "#d1d5db",
		"Optimising Not Possible": "#fbbf24",
		"Not Possible": "#dc2626",
		"Rebook": "#a855f7",
		"Rebook Earlier": "#9333ea",
		"Consent Sent Awaiting": "#3b82f6",
	}

	for status, color in defaults.items():
		doc = frappe.new_doc("MM Booking Status")
		doc.status = status
		doc.color = color
		doc.is_active = 1
		doc.is_final = 1 if status in final_statuses else 0
		doc.insert(ignore_permissions=True)

	frappe.db.commit()
