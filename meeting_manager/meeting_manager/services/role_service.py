# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

"""
Role management service for Meeting Manager app.
Handles automatic assignment and revocation of MM Department Leader
and MM Department Member roles based on department assignments.
"""

import frappe

# Role names as constants
MM_DEPARTMENT_LEADER_ROLE = "MM Department Leader"
MM_DEPARTMENT_MEMBER_ROLE = "MM Department Member"


def assign_role_to_user(user, role_name):
    """
    Assign a role to a user if they don't already have it.

    Args:
        user (str): User ID (email)
        role_name (str): Name of the role to assign

    Returns:
        bool: True if role was assigned, False if user already had it
    """
    if not user or not role_name:
        return False

    # Check if user exists
    if not frappe.db.exists("User", user):
        frappe.log_error(
            f"Cannot assign role '{role_name}' - User '{user}' does not exist",
            "Role Service"
        )
        return False

    # Check if role exists
    if not frappe.db.exists("Role", role_name):
        frappe.log_error(
            f"Cannot assign role '{role_name}' - Role does not exist",
            "Role Service"
        )
        return False

    # Check if user already has the role
    has_role = frappe.db.exists(
        "Has Role",
        {"parent": user, "role": role_name, "parenttype": "User"}
    )

    if has_role:
        return False  # Already has role

    # Assign the role
    user_doc = frappe.get_doc("User", user)
    user_doc.append("roles", {"role": role_name})
    user_doc.save(ignore_permissions=True)

    frappe.msgprint(
        f"Role '{role_name}' has been assigned to {user}",
        indicator="green",
        alert=True
    )

    return True


def revoke_role_from_user(user, role_name):
    """
    Remove a role from a user.

    Args:
        user (str): User ID (email)
        role_name (str): Name of the role to revoke

    Returns:
        bool: True if role was revoked, False if user didn't have it
    """
    if not user or not role_name:
        return False

    # Check if user exists
    if not frappe.db.exists("User", user):
        return False

    # Check if user has the role
    has_role = frappe.db.get_value(
        "Has Role",
        {"parent": user, "role": role_name, "parenttype": "User"},
        "name"
    )

    if not has_role:
        return False  # Doesn't have role

    # Remove the role
    frappe.db.delete("Has Role", has_role)

    frappe.msgprint(
        f"Role '{role_name}' has been revoked from {user}",
        indicator="orange",
        alert=True
    )

    return True


def is_user_leader_of_any_department(user, exclude_department=None):
    """
    Check if user is a department leader of any department.

    Args:
        user (str): User ID (email)
        exclude_department (str, optional): Department name to exclude from check

    Returns:
        bool: True if user is leader of at least one department
    """
    if not user:
        return False

    filters = {"department_leader": user}
    if exclude_department:
        filters["name"] = ["!=", exclude_department]

    return bool(frappe.db.exists("MM Department", filters))


def is_user_active_member_of_any_department(user, exclude_department=None):
    """
    Check if user is an active member of any department.

    Args:
        user (str): User ID (email)
        exclude_department (str, optional): Department name to exclude from check

    Returns:
        bool: True if user is active member of at least one department
    """
    if not user:
        return False

    sql = """
        SELECT 1 FROM `tabMM Department Member` dm
        INNER JOIN `tabMM Department` d ON d.name = dm.parent
        WHERE dm.member = %s
        AND dm.is_active = 1
    """
    params = [user]

    if exclude_department:
        sql += " AND dm.parent != %s"
        params.append(exclude_department)

    sql += " LIMIT 1"

    result = frappe.db.sql(sql, params)
    return bool(result)


def assign_department_leader_role(user):
    """
    Assign MM Department Leader role to a user.

    Args:
        user (str): User ID (email)

    Returns:
        bool: True if role was assigned
    """
    return assign_role_to_user(user, MM_DEPARTMENT_LEADER_ROLE)


def revoke_department_leader_role(user, exclude_department=None):
    """
    Revoke MM Department Leader role from a user if they are no longer
    a leader of any department.

    Args:
        user (str): User ID (email)
        exclude_department (str, optional): Department to exclude from leader check

    Returns:
        bool: True if role was revoked
    """
    if not user:
        return False

    # Check if user is still a leader of any other department
    if is_user_leader_of_any_department(user, exclude_department):
        return False  # Still a leader elsewhere, keep role

    return revoke_role_from_user(user, MM_DEPARTMENT_LEADER_ROLE)


def assign_department_member_role(user):
    """
    Assign MM Department Member role to a user.

    Args:
        user (str): User ID (email)

    Returns:
        bool: True if role was assigned
    """
    return assign_role_to_user(user, MM_DEPARTMENT_MEMBER_ROLE)


def revoke_department_member_role(user, exclude_department=None):
    """
    Revoke MM Department Member role from a user if they are no longer
    an active member of any department.

    Args:
        user (str): User ID (email)
        exclude_department (str, optional): Department to exclude from member check

    Returns:
        bool: True if role was revoked
    """
    if not user:
        return False

    # Check if user is still an active member of any other department
    if is_user_active_member_of_any_department(user, exclude_department):
        return False  # Still a member elsewhere, keep role

    return revoke_role_from_user(user, MM_DEPARTMENT_MEMBER_ROLE)


def sync_leader_role_on_department_change(department_name, old_leader, new_leader):
    """
    Sync leader role when department leader changes.

    Args:
        department_name (str): Name of the department being updated
        old_leader (str): Previous department leader (may be None)
        new_leader (str): New department leader (may be None)
    """
    # Revoke from old leader if they're no longer leading any department
    if old_leader and old_leader != new_leader:
        revoke_department_leader_role(old_leader, exclude_department=department_name)

    # Assign to new leader
    if new_leader:
        assign_department_leader_role(new_leader)


def sync_member_roles_on_department_change(department_name, old_members, new_members):
    """
    Sync member roles when department members change.

    Args:
        department_name (str): Name of the department being updated
        old_members (set): Set of previous active member user IDs
        new_members (set): Set of current active member user IDs
    """
    # Find removed members (were active, now removed or inactive)
    removed_members = old_members - new_members

    # Find added members (new active members)
    added_members = new_members - old_members

    # Revoke roles from removed members (if not active elsewhere)
    for member in removed_members:
        revoke_department_member_role(member, exclude_department=department_name)

    # Assign roles to new active members
    for member in added_members:
        assign_department_member_role(member)


def sync_all_roles_on_department_delete(department_name, leader, members):
    """
    Sync roles when a department is deleted.

    Args:
        department_name (str): Name of the department being deleted
        leader (str): Department leader user ID
        members (list): List of member user IDs
    """
    # Revoke leader role if not leading other departments
    if leader:
        revoke_department_leader_role(leader, exclude_department=department_name)

    # Revoke member roles if not active in other departments
    for member in members:
        revoke_department_member_role(member, exclude_department=department_name)


def sync_user_roles(user):
    """
    Fully sync all Meeting Manager roles for a user based on their
    current department assignments. Useful for manual corrections.

    Args:
        user (str): User ID (email)
    """
    if not user:
        return

    # Check leader status
    is_leader = is_user_leader_of_any_department(user)
    has_leader_role = frappe.db.exists(
        "Has Role",
        {"parent": user, "role": MM_DEPARTMENT_LEADER_ROLE, "parenttype": "User"}
    )

    if is_leader and not has_leader_role:
        assign_department_leader_role(user)
    elif not is_leader and has_leader_role:
        revoke_role_from_user(user, MM_DEPARTMENT_LEADER_ROLE)

    # Check member status
    is_member = is_user_active_member_of_any_department(user)
    has_member_role = frappe.db.exists(
        "Has Role",
        {"parent": user, "role": MM_DEPARTMENT_MEMBER_ROLE, "parenttype": "User"}
    )

    if is_member and not has_member_role:
        assign_department_member_role(user)
    elif not is_member and has_member_role:
        revoke_role_from_user(user, MM_DEPARTMENT_MEMBER_ROLE)


def create_mm_roles():
    """
    Create the MM Department Leader and MM Department Member roles
    if they don't exist. Called during app installation.
    """
    roles = [
        {
            "role_name": MM_DEPARTMENT_LEADER_ROLE,
            "desk_access": 1,
            "is_custom": 0,
            "disabled": 0
        },
        {
            "role_name": MM_DEPARTMENT_MEMBER_ROLE,
            "desk_access": 1,
            "is_custom": 0,
            "disabled": 0
        }
    ]

    for role_data in roles:
        if not frappe.db.exists("Role", role_data["role_name"]):
            role = frappe.new_doc("Role")
            role.update(role_data)
            role.insert(ignore_permissions=True)
            print(f"Created role: {role_data['role_name']}")
        else:
            print(f"Role already exists: {role_data['role_name']}")

    frappe.db.commit()
