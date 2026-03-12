# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

"""
Customer Service Module

Provides utilities for finding, creating, and managing Contact records
used as customers in Meeting Manager. Uses Frappe's built-in Contact doctype
instead of a custom MM Customer doctype.
"""

import frappe
import re


def find_or_create_customer(email, phone=None, name=None):
    """
    Find existing contact by email or phone, or create a new one.

    Lookup Priority (Email takes priority over phone):
    1. Search by email in Contact's email_id field
    2. Search by email in Contact Email child table
    3. If email not found, search by phone in Contact Phone child table
    4. If no match, create new Contact

    Args:
        email (str): Customer email (primary identifier, required)
        phone (str, optional): Phone number
        name (str, optional): Customer name (defaults to email prefix if not provided)

    Returns:
        dict: {
            "customer_id": str,      # Contact document name
            "created": bool,         # True if new contact was created
            "customer": Document     # Contact document object
        }
    """
    if not email:
        frappe.throw("Email is required to find or create a customer.")

    email = email.strip().lower()

    # 1. Search by email (Contact email_id field)
    customer_id = frappe.db.get_value(
        "Contact",
        filters={"email_id": ["like", email]},
        fieldname="name"
    )

    if customer_id:
        return {
            "customer_id": customer_id,
            "created": False,
            "customer": frappe.get_doc("Contact", customer_id)
        }

    # 2. Search by email in Contact Email child table
    result = frappe.db.sql("""
        SELECT parent FROM `tabContact Email`
        WHERE LOWER(email_id) = %s
        LIMIT 1
    """, (email,), as_dict=True)

    if result:
        customer_id = result[0]['parent']
        return {
            "customer_id": customer_id,
            "created": False,
            "customer": frappe.get_doc("Contact", customer_id)
        }

    # 3. Search by phone if email not found
    if phone:
        phone_digits = re.sub(r'[\s\-\(\)\+]', '', phone)

        result = frappe.db.sql("""
            SELECT parent FROM `tabContact Phone`
            WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = %s
            LIMIT 1
        """, (phone_digits,), as_dict=True)

        if result:
            customer_id = result[0]['parent']
            customer = frappe.get_doc("Contact", customer_id)

            # Add the new email to this contact's email list
            customer.append("email_ids", {
                "email_id": email,
                "is_primary": 0
            })
            customer.save(ignore_permissions=True)

            return {
                "customer_id": customer_id,
                "created": False,
                "customer": customer
            }

    # 4. Create new Contact
    customer_name = name.strip() if name else email.split('@')[0].replace('.', ' ').title()

    customer = frappe.get_doc({
        "doctype": "Contact",
        "first_name": customer_name,
        "mm_is_active": 1
    })

    # Add email to child table (Contact auto-sets email_id from primary row)
    customer.append("email_ids", {
        "email_id": email,
        "is_primary": 1
    })

    # Add phone if provided
    if phone:
        customer.append("phone_nos", {
            "phone": phone,
            "is_primary_phone": 1
        })

    customer.insert(ignore_permissions=True)
    frappe.db.commit()

    return {
        "customer_id": customer.name,
        "created": True,
        "customer": customer
    }


def get_customer_by_email(email):
    """
    Get contact by email address.

    Args:
        email (str): Email address to search for

    Returns:
        Document or None: Contact document if found
    """
    if not email:
        return None

    email = email.strip().lower()

    # Check email_id first (primary email on Contact)
    customer_id = frappe.db.get_value(
        "Contact",
        filters={"email_id": ["like", email]},
        fieldname="name"
    )

    if customer_id:
        return frappe.get_doc("Contact", customer_id)

    # Check Contact Email child table
    result = frappe.db.sql("""
        SELECT parent FROM `tabContact Email`
        WHERE LOWER(email_id) = %s
        LIMIT 1
    """, (email,), as_dict=True)

    if result:
        return frappe.get_doc("Contact", result[0]['parent'])

    return None


def get_customer_by_phone(phone):
    """
    Get contact by phone number.

    Args:
        phone (str): Phone number to search for

    Returns:
        Document or None: Contact document if found
    """
    if not phone:
        return None

    phone_digits = re.sub(r'[\s\-\(\)\+]', '', phone)

    result = frappe.db.sql("""
        SELECT parent FROM `tabContact Phone`
        WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = %s
        LIMIT 1
    """, (phone_digits,), as_dict=True)

    if result:
        return frappe.get_doc("Contact", result[0]['parent'])

    return None


def update_customer_booking_stats(customer_id):
    """
    Update booking statistics for a contact.

    Args:
        customer_id (str): Contact document name
    """
    if not customer_id:
        return

    if not frappe.db.exists("Contact", customer_id):
        return

    # Count total bookings
    total_bookings = frappe.db.count(
        "MM Meeting Booking",
        filters={"customer": customer_id}
    )

    # Get last booking date
    last_booking = frappe.db.get_value(
        "MM Meeting Booking",
        filters={"customer": customer_id},
        fieldname="start_datetime",
        order_by="start_datetime desc"
    )

    last_booking_date = last_booking.date() if last_booking else None

    frappe.db.set_value("Contact", customer_id, {
        "mm_total_bookings": total_bookings,
        "mm_last_booking_date": last_booking_date
    }, update_modified=False)


def get_customer_bookings(customer_id, limit=10):
    """
    Get recent bookings for a contact.

    Args:
        customer_id (str): Contact document name
        limit (int): Maximum number of bookings to return

    Returns:
        list: List of booking dictionaries
    """
    if not customer_id:
        return []

    return frappe.get_all(
        "MM Meeting Booking",
        filters={"customer": customer_id},
        fields=[
            "name", "meeting_title", "start_datetime", "end_datetime",
            "booking_status", "meeting_type"
        ],
        order_by="start_datetime desc",
        limit_page_length=limit
    )
