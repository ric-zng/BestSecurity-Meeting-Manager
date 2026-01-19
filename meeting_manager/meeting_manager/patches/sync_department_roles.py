# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

"""
Migration patch to sync MM Department Leader and MM Department Member roles
for all existing department leaders and active members.

This patch should be run after:
1. The roles have been created (via setup.py or fixtures)
2. Departments with leaders and members already exist

Run with: bench migrate
Or manually: bench --site [site] execute meeting_manager.meeting_manager.patches.sync_department_roles.execute
"""

import frappe


def execute():
    """
    Sync MM roles for all existing department leaders and active members.
    """
    print("=" * 60)
    print("Syncing MM Department roles for existing users...")
    print("=" * 60)

    # Import role service functions
    from meeting_manager.meeting_manager.services.role_service import (
        create_mm_roles,
        assign_department_leader_role,
        assign_department_member_role,
        MM_DEPARTMENT_LEADER_ROLE,
        MM_DEPARTMENT_MEMBER_ROLE
    )

    # Ensure roles exist first
    print("\n1. Ensuring roles exist...")
    create_mm_roles()

    # Get all departments
    departments = frappe.get_all(
        "MM Department",
        fields=["name", "department_leader"],
        filters={}
    )

    if not departments:
        print("\nNo departments found. Nothing to sync.")
        return

    print(f"\n2. Found {len(departments)} department(s)")

    # Track unique users to avoid duplicate assignments
    leaders_processed = set()
    members_processed = set()

    # Process each department
    for dept in departments:
        print(f"\n   Processing: {dept.name}")

        # Assign leader role
        if dept.department_leader and dept.department_leader not in leaders_processed:
            if assign_department_leader_role(dept.department_leader):
                print(f"      + Assigned {MM_DEPARTMENT_LEADER_ROLE} to {dept.department_leader}")
            else:
                print(f"      = {dept.department_leader} already has {MM_DEPARTMENT_LEADER_ROLE}")
            leaders_processed.add(dept.department_leader)

        # Get active members for this department
        active_members = frappe.get_all(
            "MM Department Member",
            filters={
                "parent": dept.name,
                "is_active": 1
            },
            pluck="member"
        )

        # Assign member role to each active member
        for member in active_members:
            if member not in members_processed:
                if assign_department_member_role(member):
                    print(f"      + Assigned {MM_DEPARTMENT_MEMBER_ROLE} to {member}")
                else:
                    print(f"      = {member} already has {MM_DEPARTMENT_MEMBER_ROLE}")
                members_processed.add(member)

    frappe.db.commit()

    print("\n" + "=" * 60)
    print(f"Role sync complete!")
    print(f"   Leaders with role: {len(leaders_processed)}")
    print(f"   Members with role: {len(members_processed)}")
    print("=" * 60)
