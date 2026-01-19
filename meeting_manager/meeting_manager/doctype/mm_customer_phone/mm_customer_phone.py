# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
import re


class MMCustomerPhone(Document):
    def validate(self):
        """Validate phone before saving"""
        self.validate_phone_format()
        self.validate_phone_unique_across_customers()

    def validate_phone_format(self):
        """Validate phone number format"""
        if not self.phone_number:
            frappe.throw("Phone Number is required.")

        # Remove common phone formatting characters
        phone_digits = re.sub(r'[\s\-\(\)\+]', '', self.phone_number)

        if not phone_digits.isdigit() or len(phone_digits) < 7:
            frappe.throw(f"Invalid phone number format: '{self.phone_number}'. Please provide a valid phone number with at least 7 digits.")

    def validate_phone_unique_across_customers(self):
        """Ensure phone number is not used by another customer"""
        if not self.phone_number:
            return

        # Normalize phone for comparison (remove formatting)
        phone_digits = re.sub(r'[\s\-\(\)\+]', '', self.phone_number)

        # Check if phone exists in another customer's phone_numbers child table
        # Use SQL to normalize and compare phone numbers
        existing = frappe.db.sql("""
            SELECT cp.parent, c.customer_name, cp.phone_number
            FROM `tabMM Customer Phone` cp
            INNER JOIN `tabMM Customer` c ON c.name = cp.parent
            WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(cp.phone_number, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = %s
            AND cp.parent != %s
            AND cp.name != %s
            LIMIT 1
        """, (phone_digits, self.parent or "", self.name or ""), as_dict=True)

        if existing:
            frappe.throw(
                f"Phone number '{self.phone_number}' is already associated with customer "
                f"'{existing[0].customer_name}' ({existing[0].parent}). "
                f"Each phone number can only belong to one customer."
            )
