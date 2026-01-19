# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

"""
Migration Patch: Migrate embedded customer data to MM Customer doctype

This patch migrates customer data from the old embedded fields in MM Meeting Booking
(customer_name, customer_email, customer_phone) to the new MM Customer doctype structure.

Run with: bench migrate

Migration Logic:
1. Find all bookings with embedded customer_email (external bookings)
2. Group by email to deduplicate customers
3. Create MM Customer records for unique emails
4. Update bookings to link to customer records
5. Populate cached fields (customer_email_at_booking, customer_phone_at_booking)

Conflict Resolution: Email takes priority over phone for customer matching
"""

import frappe


def execute():
    """Main migration function"""
    frappe.flags.in_migrate = True

    try:
        migrate_existing_customers()
    finally:
        frappe.flags.in_migrate = False


def migrate_existing_customers():
    """
    Migrate all existing MM Meeting Booking customer data to new MM Customer doctype
    """
    # Check if the old fields still exist in the database
    # (they may have been removed if schema is already updated)
    old_fields_exist = frappe.db.sql("""
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'tabMM Meeting Booking'
        AND COLUMN_NAME = 'customer_email'
    """)

    if not old_fields_exist:
        print("Old customer_email field not found. Migration may have already been completed.")
        return

    # Get all external bookings with customer_email
    existing_bookings = frappe.db.sql("""
        SELECT
            name,
            customer_name,
            customer_email,
            customer_phone,
            customer
        FROM `tabMM Meeting Booking`
        WHERE is_internal = 0
        AND customer_email IS NOT NULL
        AND customer_email != ''
        AND (customer IS NULL OR customer = '')
    """, as_dict=True)

    if not existing_bookings:
        print("No bookings found to migrate.")
        return

    print(f"Found {len(existing_bookings)} bookings to migrate")

    # Group bookings by email to create unique customers
    email_to_customer = {}
    migration_stats = {
        "customers_created": 0,
        "bookings_updated": 0,
        "errors": []
    }

    for booking in existing_bookings:
        email = booking.get("customer_email", "").strip().lower()

        if not email:
            continue

        try:
            # Check if we already created/found a customer for this email
            if email in email_to_customer:
                customer_id = email_to_customer[email]
            else:
                # Find or create customer
                customer_id = find_or_create_customer_for_migration(
                    email=email,
                    phone=booking.get("customer_phone"),
                    name=booking.get("customer_name")
                )
                email_to_customer[email] = customer_id
                migration_stats["customers_created"] += 1

            # Update booking with customer link
            update_booking_with_customer(booking["name"], customer_id)
            migration_stats["bookings_updated"] += 1

        except Exception as e:
            error_msg = f"Error migrating booking {booking['name']}: {str(e)}"
            print(error_msg)
            migration_stats["errors"].append(error_msg)
            frappe.log_error(error_msg, "Customer Migration Error")

    # Commit all changes
    frappe.db.commit()

    # Print summary
    print(f"\nMigration Summary:")
    print(f"  Customers created: {migration_stats['customers_created']}")
    print(f"  Bookings updated: {migration_stats['bookings_updated']}")
    print(f"  Errors: {len(migration_stats['errors'])}")

    if migration_stats["errors"]:
        print("\nErrors encountered:")
        for error in migration_stats["errors"][:10]:  # Show first 10 errors
            print(f"  - {error}")
        if len(migration_stats["errors"]) > 10:
            print(f"  ... and {len(migration_stats['errors']) - 10} more errors")


def find_or_create_customer_for_migration(email, phone=None, name=None):
    """
    Find existing customer or create new one during migration.

    Email takes priority for matching.
    """
    email = email.strip().lower()

    # Check if customer with this email already exists
    existing_customer = frappe.db.get_value(
        "MM Customer",
        {"primary_email": ["like", email]},
        "name"
    )

    if existing_customer:
        return existing_customer

    # Check in email child table
    result = frappe.db.sql("""
        SELECT parent FROM `tabMM Customer Email`
        WHERE LOWER(email_address) = %s
        LIMIT 1
    """, (email,), as_dict=True)

    if result:
        return result[0]["parent"]

    # Create new customer
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
    if phone and phone.strip():
        customer.append("phone_numbers", {
            "phone_number": phone.strip(),
            "phone_type": "Mobile",
            "is_primary": 1
        })

    customer.insert(ignore_permissions=True)

    return customer.name


def update_booking_with_customer(booking_name, customer_id):
    """
    Update a booking to link to a customer and populate cached fields.
    """
    customer = frappe.get_doc("MM Customer", customer_id)

    # Get primary phone
    primary_phone = None
    if customer.phone_numbers:
        for phone in customer.phone_numbers:
            if phone.is_primary:
                primary_phone = phone.phone_number
                break
        if not primary_phone:
            primary_phone = customer.phone_numbers[0].phone_number

    # Update booking directly in database (faster than loading doc)
    frappe.db.set_value(
        "MM Meeting Booking",
        booking_name,
        {
            "customer": customer_id,
            "customer_email_at_booking": customer.primary_email,
            "customer_phone_at_booking": primary_phone or ""
        },
        update_modified=False
    )
