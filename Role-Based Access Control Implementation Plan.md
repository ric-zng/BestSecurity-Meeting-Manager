# Role-Based Access Control Implementation Plan

## Overview
Implement a comprehensive role-based access control system for the Meeting Manager app that automatically creates roles on installation and assigns/revokes roles when users are assigned as department leaders or members.

## Roles to Create

| Role | Description | Auto-assigned when |
|------|-------------|-------------------|
| **MM Department Leader** | Full management of their department | User set as `department_leader` in MM Department |
| **MM Department Member** | Basic member access to bookings | User added to `department_members` child table |

---

## Current State Analysis

### Existing Permission Structure
- **System Manager**: Full CRUD on all doctypes
- **MM Department Leader**: Already referenced in `mm_meeting_booking.json` permissions but role NOT created
- Code references "Department Leader" role in multiple files (`permissions.py`, `booking.py`, page files)

### Current Issues
1. Role "MM Department Leader" referenced in DocType permissions but never created
2. No automatic role assignment when leader/member changes
3. `permissions.py` checks for "Department Leader" (missing "MM" prefix)
4. No "MM Department Member" role exists

---

## Implementation Plan

### Step 1: Create Role Fixtures
**Path:** `meeting_manager/meeting_manager/fixtures/`

Create JSON fixtures for roles that get installed with the app.

**Files to create:**
- `mm_department_leader_role.json`
- `mm_department_member_role.json`

### Step 2: Update hooks.py - Add Fixtures
Add role fixtures to `hooks.py` so they're created on install/migrate.

```python
fixtures = [
    {
        "doctype": "Page",
        "filters": [["name", "in", ["mm-calendar-view", "mm-self-book-meeting", "mm-team-meeting", "mm-timeline-calendar"]]]
    },
    {
        "doctype": "Role",
        "filters": [["name", "in", ["MM Department Leader", "MM Department Member"]]]
    }
]
```

### Step 3: Create Role Service Module
**Path:** `meeting_manager/meeting_manager/services/role_service.py`

Central module for role management:

```python
def assign_department_leader_role(user):
    """Add MM Department Leader role to user"""

def revoke_department_leader_role(user):
    """Remove MM Department Leader role from user (if no longer leader of any dept)"""

def assign_department_member_role(user):
    """Add MM Department Member role to user"""

def revoke_department_member_role(user):
    """Remove MM Department Member role from user (if no longer member of any dept)"""

def sync_user_roles(user):
    """Sync all MM roles for a user based on current department assignments"""
```

### Step 4: Update MM Department DocType
**Path:** `meeting_manager/meeting_manager/doctype/mm_department/mm_department.py`

Add hooks to assign/revoke roles:

```python
def on_update(self):
    """Called after save - sync roles for affected users"""
    self.sync_leader_role()
    self.sync_member_roles()

def on_trash(self):
    """Called before delete - revoke roles if needed"""
    self.revoke_all_roles_on_delete()

def sync_leader_role(self):
    """Assign/revoke leader role based on department_leader field"""
    # Compare with previous value (db_get)
    # If leader changed: revoke from old, assign to new

def sync_member_roles(self):
    """Assign/revoke member roles based on department_members table"""
    # Get previous members from DB
    # Assign role to new members
    # Check if removed members should lose role
```

### Step 5: Update DocType Permissions
Update JSON files to use correct role names and add member permissions.

**mm_department.json:**
```json
"permissions": [
    {"role": "System Manager", "create": 1, "read": 1, "write": 1, "delete": 1, ...},
    {"role": "MM Department Leader", "read": 1, "write": 1, "export": 1, ...}
]
```

**mm_meeting_booking.json:**
```json
"permissions": [
    {"role": "System Manager", "create": 1, "read": 1, "write": 1, "delete": 1, ...},
    {"role": "MM Department Leader", "create": 1, "read": 1, "write": 1, ...},
    {"role": "MM Department Member", "read": 1, "write": 1, ...}
]
```

**mm_meeting_type.json:**
```json
"permissions": [
    {"role": "System Manager", ...},
    {"role": "MM Department Leader", "read": 1, "write": 1, ...},
    {"role": "MM Department Member", "read": 1, ...}
]
```

### Step 6: Update permissions.py
**Path:** `meeting_manager/meeting_manager/utils/permissions.py`

Fix role name references:

```python
# Change "Department Leader" to "MM Department Leader"
if "MM Department Leader" in roles:
    return True

# Add check for MM Department Member
if "MM Department Member" in roles:
    return True
```

### Step 7: Update setup.py - Role Creation on Install
**Path:** `meeting_manager/meeting_manager/setup.py`

Add function to create roles programmatically:

```python
def create_roles():
    """Create MM Department Leader and MM Department Member roles"""
    roles = [
        {
            "role_name": "MM Department Leader",
            "desk_access": 1,
            "is_custom": 0,
            "disabled": 0
        },
        {
            "role_name": "MM Department Member",
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
            print(f"✅ Created role: {role_data['role_name']}")

def after_install():
    create_roles()  # Add this call
    create_calendar_page()
    ...
```

### Step 8: Create Migration Patch for Existing Data
**Path:** `meeting_manager/patches/sync_existing_roles.py`

Sync roles for users already assigned in existing departments:

```python
def execute():
    """Sync roles for all existing department leaders and members"""
    # Get all departments
    # For each department:
    #   - Assign leader role to department_leader
    #   - Assign member role to all active members
```

---

## Files to Create

| File | Description |
|------|-------------|
| `services/role_service.py` | Role assignment/revocation logic |
| `patches/sync_existing_roles.py` | Migration patch for existing users |

## Files to Modify

| File | Changes |
|------|---------|
| `hooks.py` | Add Role fixtures |
| `setup.py` | Add `create_roles()` function and call in `after_install()` |
| `doctype/mm_department/mm_department.py` | Add `on_update()`, `on_trash()` hooks for role sync |
| `doctype/mm_department/mm_department.json` | Add MM Department Leader permissions |
| `doctype/mm_meeting_booking/mm_meeting_booking.json` | Add MM Department Member permissions |
| `doctype/mm_meeting_type/mm_meeting_type.json` | Add member read permissions |
| `doctype/mm_customer/mm_customer.json` | Add role permissions |
| `utils/permissions.py` | Fix role name to "MM Department Leader" |

---

## Permission Matrix

| DocType | System Manager | MM Department Leader | MM Department Member |
|---------|---------------|---------------------|---------------------|
| MM Department | CRUD + All | Read + Write (own dept) | Read (own dept) |
| MM Meeting Booking | CRUD + All | CRUD (dept bookings) | Read + Write (assigned) |
| MM Meeting Type | CRUD + All | Read + Write (dept types) | Read |
| MM Customer | CRUD + All | Read + Write | Read |
| MM User Settings | CRUD + All | Read + Write (own) | Read + Write (own) |
| MM User Availability Rule | CRUD + All | Read + Write | Read + Write (own) |

---

## Role Assignment Logic

### On MM Department Save (`on_update`)

```
1. Get previous department_leader from DB
2. Get current department_leader from form
3. If leader changed:
   a. If old_leader exists and is no longer leader of ANY department:
      - Revoke "MM Department Leader" role
   b. Assign "MM Department Leader" role to new_leader

4. Get previous department_members from DB
5. Get current department_members from form
6. For removed members:
   - If user is not active member of ANY department:
     - Revoke "MM Department Member" role
7. For added members:
   - Assign "MM Department Member" role
```

### On MM Department Delete (`on_trash`)

```
1. For department_leader:
   - If not leader of other departments, revoke leader role
2. For each member:
   - If not member of other departments, revoke member role
```

---

## Verification Plan

### 1. Installation Test
```bash
# Fresh install
bench --site testsite install-app meeting_manager

# Verify roles created
bench --site testsite console
>>> frappe.db.exists("Role", "MM Department Leader")
>>> frappe.db.exists("Role", "MM Department Member")
```

### 2. Leader Assignment Test
```bash
# Create department with leader
# Verify leader has "MM Department Leader" role
# Change leader
# Verify old leader loses role (if not leader elsewhere)
# Verify new leader gets role
```

### 3. Member Assignment Test
```bash
# Add member to department
# Verify member has "MM Department Member" role
# Remove member
# Verify member loses role (if not member elsewhere)
```

### 4. Multi-Department Test
```bash
# User is leader of Dept A
# User becomes leader of Dept B
# Remove from Dept A leadership
# Verify user still has leader role (still leads Dept B)
```

### 5. Permission Test
```bash
# Login as department leader
# Verify can access workspace
# Verify can create/edit bookings for their department
# Verify cannot delete bookings (only System Manager)
```

---

## Key Decision: Active Members Only

**MM Department Member role is assigned ONLY to active members (`is_active=1`)**
- Role assigned when member added with `is_active=1`
- Role revoked when member's `is_active` set to 0 (if not active elsewhere)
- Role revoked when member removed from department (if not active elsewhere)

---

## Edge Cases Handled

1. **User is leader AND member** - Gets both roles
2. **User leads multiple departments** - Role not removed until removed from ALL
3. **User is active member of multiple departments** - Role not removed until inactive/removed from ALL
4. **Department deleted** - Roles revoked if user has no other dept assignments
5. **User disabled in Frappe** - Roles remain but user can't login anyway
6. **Member marked inactive (`is_active=0`)** - Role revoked (if not active member elsewhere)
