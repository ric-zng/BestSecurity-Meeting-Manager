import frappe
from frappe.model.document import Document


class MMStatusColor(Document):
    pass


def get_status_colors():
    """Get all active status colors as a dict {status: color}."""
    colors = frappe.get_all(
        "MM Status Color",
        filters={"is_active": 1},
        fields=["status", "color"],
    )
    return {c["status"]: c["color"] for c in colors}


def seed_default_colors():
    """Create default status color entries if none exist."""
    if frappe.db.count("MM Status Color") > 0:
        return

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
        doc = frappe.new_doc("MM Status Color")
        doc.status = status
        doc.color = color
        doc.is_active = 1
        doc.insert(ignore_permissions=True)

    frappe.db.commit()
