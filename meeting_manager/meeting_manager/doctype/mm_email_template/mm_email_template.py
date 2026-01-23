# Copyright (c) 2026, BestSecurity and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import get_datetime, format_datetime, format_time


class MMEmailTemplate(Document):
    def validate(self):
        """Validate template content"""
        if not self.subject:
            frappe.throw("Subject is required")
        if not self.email_body:
            frappe.throw("Email body is required")

    @staticmethod
    def get_template(email_type: str, service_type: str = None, language: str = "en"):
        """
        Get the appropriate email template based on email type and service type.

        Args:
            email_type: Type of email (Booking Confirmation, Reschedule, etc.)
            service_type: Service type from booking (Business, Private, etc.)
            language: Language code (default: en)

        Returns:
            MMEmailTemplate document or None
        """
        filters = {
            "email_type": email_type,
            "is_active": 1
        }

        # Try to find template matching service type first
        if service_type:
            filters["service_type"] = service_type
            template = frappe.db.get_value(
                "MM Email Template",
                filters,
                ["name", "priority"],
                as_dict=True,
                order_by="priority desc"
            )
            if template:
                return frappe.get_doc("MM Email Template", template.name)

        # Fall back to default template (no service type specified)
        filters["service_type"] = ["in", ["", None]]
        template = frappe.db.get_value(
            "MM Email Template",
            filters,
            ["name", "priority"],
            as_dict=True,
            order_by="priority desc"
        )

        if template:
            return frappe.get_doc("MM Email Template", template.name)

        return None

    @staticmethod
    def render_template(template_doc, context: dict) -> dict:
        """
        Render the email template with the given context.

        Args:
            template_doc: MM Email Template document
            context: Dictionary with template variables

        Returns:
            Dict with rendered 'subject' and 'body'
        """
        rendered_subject = frappe.render_template(template_doc.subject, context)
        rendered_body = frappe.render_template(template_doc.email_body, context)

        # Add remote support link if enabled
        if template_doc.include_remote_support_link and template_doc.remote_support_url:
            context["remote_support_link"] = template_doc.remote_support_url

        return {
            "subject": rendered_subject,
            "body": rendered_body,
            "include_brochure": template_doc.include_brochure
        }

    @staticmethod
    def build_context_from_booking(booking_id: str, booker_user: str = None) -> dict:
        """
        Build template context from a booking document.

        Args:
            booking_id: MM Meeting Booking name/ID
            booker_user: User who made the booking (optional, defaults to current user)

        Returns:
            Dictionary with all template variables
        """
        booking = frappe.get_doc("MM Meeting Booking", booking_id)

        # Get customer information
        customer = None
        customer_name = ""
        customer_firstname = ""
        company = ""

        if booking.customer:
            customer = frappe.get_doc("MM Customer", booking.customer)
            customer_name = customer.customer_name or ""
            customer_firstname = customer_name.split()[0] if customer_name else ""
            company = customer.company_name or ""

        # Get provider (assigned user) information
        provider = ""
        if booking.assigned_users and len(booking.assigned_users) > 0:
            primary_assigned = None
            for au in booking.assigned_users:
                if au.is_primary:
                    primary_assigned = au
                    break
            if not primary_assigned:
                primary_assigned = booking.assigned_users[0]

            provider = frappe.db.get_value("User", primary_assigned.user, "full_name") or primary_assigned.user

        # Get booker information
        booker = ""
        if booker_user:
            booker = frappe.db.get_value("User", booker_user, "full_name") or booker_user
        else:
            booker = frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user

        # Format date and time
        start_dt = get_datetime(booking.start_datetime) if booking.start_datetime else None
        event_date = format_datetime(start_dt, "EEEE, MMMM d, yyyy") if start_dt else ""
        event_time = format_time(start_dt, "HH:mm") if start_dt else ""
        event_datetime = f"{event_date} at {event_time}" if start_dt else ""

        # Build context
        context = {
            "customer_name": customer_name,
            "customer_firstname": customer_firstname,
            "company": company,
            "provider": provider,
            "event_date": event_date,
            "event_time": event_time,
            "event_datetime": event_datetime,
            "booker": booker,
            "booking_reference": booking.booking_reference or booking.name,
            "cancel_link": booking.cancel_link or "",
            "reschedule_link": booking.reschedule_link or "",
            "remote_support_link": "https://rmmeu-bestsecurity.screenconnect.com/",
            # Additional booking data
            "booking": booking,
            "customer": customer,
        }

        return context


@frappe.whitelist()
def get_template_preview(template_name: str, booking_id: str = None) -> dict:
    """
    Get a preview of the rendered template.

    Args:
        template_name: Name of the MM Email Template
        booking_id: Optional booking ID to use for context

    Returns:
        Dict with rendered subject and body
    """
    template = frappe.get_doc("MM Email Template", template_name)

    if booking_id:
        context = MMEmailTemplate.build_context_from_booking(booking_id)
    else:
        # Use sample data for preview
        context = {
            "customer_name": "John Smith",
            "customer_firstname": "John",
            "company": "Acme Corporation",
            "provider": "Rasmus Berg",
            "event_date": "Monday, January 27, 2026",
            "event_time": "14:30",
            "event_datetime": "Monday, January 27, 2026 at 14:30",
            "booker": "Anna Jensen",
            "booking_reference": "BK-2026-00123",
            "cancel_link": "#",
            "reschedule_link": "#",
            "remote_support_link": "https://rmmeu-bestsecurity.screenconnect.com/",
        }

    return MMEmailTemplate.render_template(template, context)


@frappe.whitelist()
def send_booking_email(booking_id: str, template_name: str = None, email_type: str = "Booking Confirmation") -> dict:
    """
    Send an email for a booking using the appropriate template.

    Args:
        booking_id: MM Meeting Booking name/ID
        template_name: Specific template to use (optional)
        email_type: Type of email to send (default: Booking Confirmation)

    Returns:
        Dict with success status and message
    """
    try:
        booking = frappe.get_doc("MM Meeting Booking", booking_id)

        # Get recipient email
        recipient = booking.customer_email_at_booking
        if not recipient and booking.customer:
            customer = frappe.get_doc("MM Customer", booking.customer)
            recipient = customer.primary_email

        if not recipient:
            return {"success": False, "message": "No recipient email address found"}

        # Get template
        if template_name:
            template = frappe.get_doc("MM Email Template", template_name)
        else:
            service_type = booking.select_mkru or ""
            template = MMEmailTemplate.get_template(email_type, service_type)

        if not template:
            return {"success": False, "message": f"No active template found for {email_type}"}

        # Build context and render
        context = MMEmailTemplate.build_context_from_booking(booking_id)

        # Add remote support link from template settings
        if template.include_remote_support_link and template.remote_support_url:
            context["remote_support_link"] = template.remote_support_url

        rendered = MMEmailTemplate.render_template(template, context)

        # Send email
        frappe.sendmail(
            recipients=[recipient],
            subject=rendered["subject"],
            message=rendered["body"],
            reference_doctype="MM Meeting Booking",
            reference_name=booking_id,
            now=True
        )

        # Log the email in booking history if child table exists
        try:
            booking.append("booking_history", {
                "action": f"Email Sent: {email_type}",
                "action_by": frappe.session.user,
                "notes": f"Template: {template.template_name}, Sent to: {recipient}"
            })
            booking.save(ignore_permissions=True)
        except Exception:
            pass  # History logging is optional

        return {"success": True, "message": f"Email sent successfully to {recipient}"}

    except Exception as e:
        frappe.log_error(f"Error sending booking email: {str(e)}", "MM Email Template Error")
        return {"success": False, "message": str(e)}
