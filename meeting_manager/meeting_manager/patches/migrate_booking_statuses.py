# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

"""
Migration Patch: Migrate old booking statuses to new status codes

This patch converts existing booking statuses from the old system to the new
comprehensive status/color code system.

Run with: bench migrate

Status Mapping:
- Pending -> New Booking
- Confirmed -> New Booking
- Completed -> Sale Approved
- No-Show -> No Answer 1-3
- Rescheduled -> Rebook
- Cancelled -> Cancelled (unchanged)
"""

import frappe


def execute():
    """Main migration function"""
    frappe.flags.in_migrate = True

    try:
        migrate_booking_statuses()
    finally:
        frappe.flags.in_migrate = False


def migrate_booking_statuses():
    """
    Migrate all existing MM Meeting Booking statuses to new status codes
    """
    # Status mapping from old to new
    status_mapping = {
        "Pending": "New Booking",
        "Confirmed": "New Booking",
        "Completed": "Sale Approved",
        "No-Show": "No Answer 1-3",
        "Rescheduled": "Rebook",
        "Cancelled": "Cancelled"  # Keep the same
    }

    migration_stats = {
        "total_updated": 0,
        "by_status": {},
        "errors": []
    }

    for old_status, new_status in status_mapping.items():
        try:
            # Count bookings with this status
            count = frappe.db.count(
                "MM Meeting Booking",
                filters={"booking_status": old_status}
            )

            if count > 0:
                # Update all bookings with this status
                frappe.db.sql("""
                    UPDATE `tabMM Meeting Booking`
                    SET booking_status = %s, modified = NOW()
                    WHERE booking_status = %s
                """, (new_status, old_status))

                migration_stats["total_updated"] += count
                migration_stats["by_status"][f"{old_status} -> {new_status}"] = count
                print(f"Migrated {count} bookings from '{old_status}' to '{new_status}'")

        except Exception as e:
            error_msg = f"Error migrating status {old_status}: {str(e)}"
            print(error_msg)
            migration_stats["errors"].append(error_msg)
            frappe.log_error(error_msg, "Booking Status Migration Error")

    # Commit all changes
    frappe.db.commit()

    # Print summary
    print(f"\nStatus Migration Summary:")
    print(f"  Total bookings updated: {migration_stats['total_updated']}")

    if migration_stats["by_status"]:
        print("\n  Breakdown by status:")
        for mapping, count in migration_stats["by_status"].items():
            print(f"    {mapping}: {count}")

    if migration_stats["errors"]:
        print(f"\n  Errors: {len(migration_stats['errors'])}")
        for error in migration_stats["errors"]:
            print(f"    - {error}")
