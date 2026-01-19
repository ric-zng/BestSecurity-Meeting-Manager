# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

"""
Customer Service Module

Provides utilities for finding, creating, and managing MM Customer records.
Used by public booking API to deduplicate customers based on email/phone.
"""

import frappe
import re


def find_or_create_customer(email, phone=None, name=None):
    """
    Find existing customer by email or phone, or create a new one.

    Lookup Priority (Email takes priority over phone):
    1. Search by email in primary_email field
    2. Search by email in email_addresses child table
    3. If email not found, search by phone in phone_numbers child table
    4. If no match, create new customer

    Args:
        email (str): Customer email (primary identifier, required)
        phone (str, optional): Phone number
        name (str, optional): Customer name (defaults to email prefix if not provided)

    Returns:
        dict: {
            "customer_id": str,      # MM Customer document name
            "created": bool,         # True if new customer was created
            "customer": Document     # MM Customer document object
        }
    """
    if not email:
        frappe.throw("Email is required to find or create a customer.")

    email = email.strip().lower()

    # 1. Search by email (primary_email field)
    customer_id = frappe.db.get_value(
        "MM Customer",
        filters={"primary_email": ["like", email]},
        fieldname="name"
    )

    if customer_id:
        return {
            "customer_id": customer_id,
            "created": False,
            "customer": frappe.get_doc("MM Customer", customer_id)
        }

    # 2. Search by email in email_addresses child table
    result = frappe.db.sql("""
        SELECT parent FROM `tabMM Customer Email`
        WHERE LOWER(email_address) = %s
        LIMIT 1
    """, (email,), as_dict=True)

    if result:
        customer_id = result[0]['parent']
        return {
            "customer_id": customer_id,
            "created": False,
            "customer": frappe.get_doc("MM Customer", customer_id)
        }

    # 3. Search by phone if email not found
    if phone:
        phone_digits = re.sub(r'[\s\-\(\)\+]', '', phone)

        result = frappe.db.sql("""
            SELECT parent FROM `tabMM Customer Phone`
            WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone_number, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = %s
            LIMIT 1
        """, (phone_digits,), as_dict=True)

        if result:
            customer_id = result[0]['parent']
            customer = frappe.get_doc("MM Customer", customer_id)

            # Add the new email to this customer's email list
            customer.append("email_addresses", {
                "email_address": email,
                "email_type": "Personal",
                "is_primary": 0
            })
            customer.save(ignore_permissions=True)

            return {
                "customer_id": customer_id,
                "created": False,
                "customer": customer
            }

    # 4. Create new customer
    customer_name = name.strip() if name else email.split('@')[0].replace('.', ' ').title()

    customer = frappe.get_doc({
        "doctype": "MM Customer",
        "customer_name": customer_name,
        "primary_email": email,
        "is_active": 1
    })

    # Add email to child table
    customer.append("email_addresses", {
        "email_address": email,
        "email_type": "Primary",
        "is_primary": 1
    })

    # Add phone if provided
    if phone:
        customer.append("phone_numbers", {
            "phone_number": phone,
            "phone_type": "Mobile",
            "is_primary": 1
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
    Get customer by email address.

    Args:
        email (str): Email address to search for

    Returns:
        Document or None: MM Customer document if found
    """
    if not email:
        return None

    email = email.strip().lower()

    # Check primary_email first
    customer_id = frappe.db.get_value(
        "MM Customer",
        filters={"primary_email": ["like", email]},
        fieldname="name"
    )

    if customer_id:
        return frappe.get_doc("MM Customer", customer_id)

    # Check email_addresses child table
    result = frappe.db.sql("""
        SELECT parent FROM `tabMM Customer Email`
        WHERE LOWER(email_address) = %s
        LIMIT 1
    """, (email,), as_dict=True)

    if result:
        return frappe.get_doc("MM Customer", result[0]['parent'])

    return None


def get_customer_by_phone(phone):
    """
    Get customer by phone number.

    Args:
        phone (str): Phone number to search for

    Returns:
        Document or None: MM Customer document if found
    """
    if not phone:
        return None

    phone_digits = re.sub(r'[\s\-\(\)\+]', '', phone)

    result = frappe.db.sql("""
        SELECT parent FROM `tabMM Customer Phone`
        WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone_number, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = %s
        LIMIT 1
    """, (phone_digits,), as_dict=True)

    if result:
        return frappe.get_doc("MM Customer", result[0]['parent'])

    return None


def update_customer_booking_stats(customer_id):
    """
    Update booking statistics for a customer.

    Args:
        customer_id (str): MM Customer document name
    """
    if not customer_id:
        return

    if not frappe.db.exists("MM Customer", customer_id):
        return

    customer = frappe.get_doc("MM Customer", customer_id)
    customer.update_booking_stats()


def get_customer_bookings(customer_id, limit=10):
    """
    Get recent bookings for a customer.

    Args:
        customer_id (str): MM Customer document name
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
