# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
import re


class MMCustomerEmail(Document):
    def validate(self):
        """Validate email before saving"""
        self.validate_email_format()
        self.validate_email_unique_across_customers()

    def validate_email_format(self):
        """Validate email format"""
        if not self.email_address:
            frappe.throw("Email Address is required.")

        # Email format validation
        email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        if not email_pattern.match(self.email_address):
            frappe.throw(f"Invalid email format: '{self.email_address}'")

    def validate_email_unique_across_customers(self):
        """Ensure email address is not used by another customer"""
        if not self.email_address:
            return

        email_lower = self.email_address.lower()

        # Check if email exists in another customer's email_addresses child table
        existing = frappe.db.sql("""
            SELECT ce.parent, c.customer_name
            FROM `tabMM Customer Email` ce
            INNER JOIN `tabMM Customer` c ON c.name = ce.parent
            WHERE LOWER(ce.email_address) = %s
            AND ce.parent != %s
            AND ce.name != %s
            LIMIT 1
        """, (email_lower, self.parent or "", self.name or ""), as_dict=True)

        if existing:
            frappe.throw(
                f"Email '{self.email_address}' is already associated with customer "
                f"'{existing[0].customer_name}' ({existing[0].parent}). "
                f"Each email can only belong to one customer."
            )

        # Also check primary_email field on MM Customer
        existing_primary = frappe.db.sql("""
            SELECT name, customer_name
            FROM `tabMM Customer`
            WHERE LOWER(primary_email) = %s
            AND name != %s
            LIMIT 1
        """, (email_lower, self.parent or ""), as_dict=True)

        if existing_primary:
            frappe.throw(
                f"Email '{self.email_address}' is already the primary email of customer "
                f"'{existing_primary[0].customer_name}' ({existing_primary[0].name}). "
                f"Each email can only belong to one customer."
            )
