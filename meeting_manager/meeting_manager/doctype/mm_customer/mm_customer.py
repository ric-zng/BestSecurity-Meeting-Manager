# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
import re


class MMCustomer(Document):
    def validate(self):
        """Validate customer before saving"""
        self.validate_customer_name()
        self.validate_primary_email()
        self.validate_primary_email_unique()
        self.validate_email_addresses()
        self.validate_emails_unique_across_customers()
        self.validate_phone_numbers()
        self.validate_phones_unique_across_customers()
        self.ensure_primary_email_in_list()
        self.ensure_single_primary_email()
        self.ensure_single_primary_phone()

    def validate_customer_name(self):
        """Validate customer name is not empty"""
        if not self.customer_name or not self.customer_name.strip():
            frappe.throw("Customer Name is required.")
        self.customer_name = self.customer_name.strip()

    def validate_primary_email(self):
        """Validate primary email format"""
        if not self.primary_email:
            frappe.throw("Primary Email is required.")

        email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        if not email_pattern.match(self.primary_email):
            frappe.throw(f"Invalid email format for Primary Email: '{self.primary_email}'")

    def validate_primary_email_unique(self):
        """Ensure primary email is not used by another customer"""
        if not self.primary_email:
            return

        email_lower = self.primary_email.lower()

        # Check if primary_email exists on another customer
        existing = frappe.db.sql("""
            SELECT name, customer_name
            FROM `tabMM Customer`
            WHERE LOWER(primary_email) = %s
            AND name != %s
            LIMIT 1
        """, (email_lower, self.name or ""), as_dict=True)

        if existing:
            frappe.throw(
                f"Primary email '{self.primary_email}' is already used by customer "
                f"'{existing[0].customer_name}' ({existing[0].name}). "
                f"Each email can only belong to one customer."
            )

        # Also check if this email exists in another customer's email_addresses child table
        existing_child = frappe.db.sql("""
            SELECT ce.parent, c.customer_name
            FROM `tabMM Customer Email` ce
            INNER JOIN `tabMM Customer` c ON c.name = ce.parent
            WHERE LOWER(ce.email_address) = %s
            AND ce.parent != %s
            LIMIT 1
        """, (email_lower, self.name or ""), as_dict=True)

        if existing_child:
            frappe.throw(
                f"Primary email '{self.primary_email}' is already associated with customer "
                f"'{existing_child[0].customer_name}' ({existing_child[0].parent}). "
                f"Each email can only belong to one customer."
            )

    def validate_email_addresses(self):
        """Validate all email addresses in the child table"""
        if not self.email_addresses:
            return

        seen_emails = set()
        for email_row in self.email_addresses:
            email_lower = email_row.email_address.lower()
            if email_lower in seen_emails:
                frappe.throw(f"Duplicate email address found: '{email_row.email_address}'")
            seen_emails.add(email_lower)

    def validate_phone_numbers(self):
        """Validate all phone numbers in the child table"""
        if not self.phone_numbers:
            return

        seen_phones = set()
        for phone_row in self.phone_numbers:
            # Normalize phone for comparison
            phone_digits = re.sub(r'[\s\-\(\)\+]', '', phone_row.phone_number)
            if phone_digits in seen_phones:
                frappe.throw(f"Duplicate phone number found: '{phone_row.phone_number}'")
            seen_phones.add(phone_digits)

    def validate_emails_unique_across_customers(self):
        """Ensure all email addresses in child table are not used by other customers"""
        if not self.email_addresses:
            return

        for email_row in self.email_addresses:
            if not email_row.email_address:
                continue

            email_lower = email_row.email_address.lower()

            # Check if email exists in another customer's email_addresses child table
            existing = frappe.db.sql("""
                SELECT ce.parent, c.customer_name
                FROM `tabMM Customer Email` ce
                INNER JOIN `tabMM Customer` c ON c.name = ce.parent
                WHERE LOWER(ce.email_address) = %s
                AND ce.parent != %s
                LIMIT 1
            """, (email_lower, self.name or ""), as_dict=True)

            if existing:
                frappe.throw(
                    f"Email '{email_row.email_address}' is already associated with customer "
                    f"'{existing[0].customer_name}' ({existing[0].parent}). "
                    f"Each email can only belong to one customer."
                )

            # Also check primary_email field on other MM Customers
            existing_primary = frappe.db.sql("""
                SELECT name, customer_name
                FROM `tabMM Customer`
                WHERE LOWER(primary_email) = %s
                AND name != %s
                LIMIT 1
            """, (email_lower, self.name or ""), as_dict=True)

            if existing_primary:
                frappe.throw(
                    f"Email '{email_row.email_address}' is already the primary email of customer "
                    f"'{existing_primary[0].customer_name}' ({existing_primary[0].name}). "
                    f"Each email can only belong to one customer."
                )

    def validate_phones_unique_across_customers(self):
        """Ensure all phone numbers in child table are not used by other customers"""
        if not self.phone_numbers:
            return

        for phone_row in self.phone_numbers:
            if not phone_row.phone_number:
                continue

            # Normalize phone for comparison
            phone_digits = re.sub(r'[\s\-\(\)\+]', '', phone_row.phone_number)

            # Check if phone exists in another customer's phone_numbers child table
            existing = frappe.db.sql("""
                SELECT cp.parent, c.customer_name
                FROM `tabMM Customer Phone` cp
                INNER JOIN `tabMM Customer` c ON c.name = cp.parent
                WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(cp.phone_number, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = %s
                AND cp.parent != %s
                LIMIT 1
            """, (phone_digits, self.name or ""), as_dict=True)

            if existing:
                frappe.throw(
                    f"Phone number '{phone_row.phone_number}' is already associated with customer "
                    f"'{existing[0].customer_name}' ({existing[0].parent}). "
                    f"Each phone number can only belong to one customer."
                )

    def ensure_primary_email_in_list(self):
        """Ensure primary_email is also in the email_addresses list"""
        if not self.email_addresses:
            # Auto-add primary email to list
            self.append("email_addresses", {
                "email_address": self.primary_email,
                "email_type": "Primary",
                "is_primary": 1
            })
        else:
            # Check if primary email exists in list
            primary_exists = any(
                email.email_address.lower() == self.primary_email.lower()
                for email in self.email_addresses
            )
            if not primary_exists:
                # Add primary email to list
                self.append("email_addresses", {
                    "email_address": self.primary_email,
                    "email_type": "Primary",
                    "is_primary": 1
                })

    def ensure_single_primary_email(self):
        """Ensure only one email is marked as primary"""
        if not self.email_addresses:
            return

        primary_count = sum(1 for email in self.email_addresses if email.is_primary)

        if primary_count == 0:
            # Mark the first email as primary
            self.email_addresses[0].is_primary = 1
        elif primary_count > 1:
            # Keep only the first primary, unset others
            found_primary = False
            for email in self.email_addresses:
                if email.is_primary:
                    if found_primary:
                        email.is_primary = 0
                    else:
                        found_primary = True

    def ensure_single_primary_phone(self):
        """Ensure only one phone is marked as primary"""
        if not self.phone_numbers:
            return

        primary_count = sum(1 for phone in self.phone_numbers if phone.is_primary)

        if primary_count == 0:
            # Mark the first phone as primary
            self.phone_numbers[0].is_primary = 1
        elif primary_count > 1:
            # Keep only the first primary, unset others
            found_primary = False
            for phone in self.phone_numbers:
                if phone.is_primary:
                    if found_primary:
                        phone.is_primary = 0
                    else:
                        found_primary = True

    def get_primary_phone(self):
        """Get the primary phone number"""
        if not self.phone_numbers:
            return None

        for phone in self.phone_numbers:
            if phone.is_primary:
                return phone.phone_number

        # Return first phone if no primary set
        return self.phone_numbers[0].phone_number if self.phone_numbers else None

    def update_booking_stats(self):
        """Update booking statistics for this customer"""
        count = frappe.db.count(
            "MM Meeting Booking",
            filters={"customer": self.name}
        )
        self.total_bookings = count

        # Get last booking date
        last_booking = frappe.db.get_value(
            "MM Meeting Booking",
            filters={"customer": self.name},
            fieldname="start_datetime",
            order_by="start_datetime desc"
        )
        if last_booking:
            self.last_booking_date = last_booking.date() if hasattr(last_booking, 'date') else last_booking

        self.db_update()

    @staticmethod
    def find_by_email(email):
        """
        Find customer by email address.
        Searches both primary_email and email_addresses child table.

        Args:
            email (str): Email address to search for

        Returns:
            str or None: Customer name (ID) if found, None otherwise
        """
        if not email:
            return None

        email_lower = email.lower()

        # Check primary_email first
        customer = frappe.db.get_value(
            "MM Customer",
            filters={"primary_email": ["like", email_lower]},
            fieldname="name"
        )
        if customer:
            return customer

        # Check email_addresses child table
        result = frappe.db.sql("""
            SELECT parent FROM `tabMM Customer Email`
            WHERE LOWER(email_address) = %s
            LIMIT 1
        """, (email_lower,), as_dict=True)

        if result:
            return result[0]['parent']

        return None

    @staticmethod
    def find_by_phone(phone):
        """
        Find customer by phone number.
        Searches phone_numbers child table.

        Args:
            phone (str): Phone number to search for

        Returns:
            str or None: Customer name (ID) if found, None otherwise
        """
        if not phone:
            return None

        # Normalize phone for comparison
        phone_digits = re.sub(r'[\s\-\(\)\+]', '', phone)

        # Search in phone_numbers child table
        result = frappe.db.sql("""
            SELECT parent FROM `tabMM Customer Phone`
            WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone_number, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = %s
            LIMIT 1
        """, (phone_digits,), as_dict=True)

        if result:
            return result[0]['parent']

        return None
