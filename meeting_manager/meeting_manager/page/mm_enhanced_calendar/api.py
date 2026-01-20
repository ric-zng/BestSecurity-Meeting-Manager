"""
Enhanced Calendar API Endpoints

Role-aware API endpoints for the Enhanced Timeline Calendar page.
Implements strict permission checks based on user roles:
- System Manager: Full access to all departments and bookings
- MM Department Leader: Access to led departments only
- MM Department Member: Access to own bookings only
"""

import frappe
from frappe import _
from frappe.utils import getdate, get_datetime, nowdate, now_datetime, add_days, get_time
import json
from datetime import datetime, timedelta
from meeting_manager.meeting_manager.utils.validation import check_member_availability


def get_user_role_level():
    """
    Determine the current user's highest role level.

    Returns:
        tuple: (role_level, role_name)
            role_level: 'system_manager' | 'department_leader' | 'department_member'
            role_name: Display name of the role
    """
    user = frappe.session.user
    roles = frappe.get_roles(user)

    if "System Manager" in roles:
        return ("system_manager", "System Manager")
    elif "MM Department Leader" in roles:
        return ("department_leader", "Department Leader")
    elif "MM Department Member" in roles:
        return ("department_member", "Department Member")
    else:
        return ("guest", "Guest")


def get_user_departments():
    """
    Get departments the current user has access to based on their role.

    Returns:
        list: List of department dicts with access info
    """
    user = frappe.session.user
    role_level, _role_name = get_user_role_level()

    departments = []

    if role_level == "system_manager":
        # System Manager sees all departments
        dept_list = frappe.get_all(
            "MM Department",
            filters={"is_active": 1},
            fields=["name", "department_name", "department_leader"]
        )
        for dept in dept_list:
            departments.append({
                "name": dept.name,
                "department_name": dept.department_name,
                "is_leader": True,  # System Manager has leader-level access
                "is_member": True
            })
    else:
        # Get departments where user is leader
        led_depts = frappe.get_all(
            "MM Department",
            filters={"department_leader": user, "is_active": 1},
            fields=["name", "department_name"]
        )
        led_dept_names = [d.name for d in led_depts]

        for dept in led_depts:
            departments.append({
                "name": dept.name,
                "department_name": dept.department_name,
                "is_leader": True,
                "is_member": True
            })

        # Get departments where user is active member (but not leader)
        member_depts = frappe.db.sql("""
            SELECT DISTINCT d.name, d.department_name
            FROM `tabMM Department` d
            INNER JOIN `tabMM Department Member` m ON m.parent = d.name
            WHERE m.member = %s
            AND m.is_active = 1
            AND d.is_active = 1
            AND d.name NOT IN %s
        """, (user, tuple(led_dept_names) if led_dept_names else ('',)), as_dict=True)

        for dept in member_depts:
            departments.append({
                "name": dept.name,
                "department_name": dept.department_name,
                "is_leader": False,
                "is_member": True
            })

    return departments


@frappe.whitelist()
def get_user_context():
    """
    Get current user's role context for the enhanced calendar.

    Returns:
        dict: {
            "user": str,
            "full_name": str,
            "role": str (system_manager|department_leader|department_member),
            "role_display": str,
            "accessible_departments": [...],
            "permissions": {
                "can_view_all_members": bool,
                "can_reassign": bool,
                "can_reschedule_team_meetings": bool
            }
        }
    """
    user = frappe.session.user
    role_level, role_display = get_user_role_level()

    # Get user's full name
    full_name = frappe.db.get_value("User", user, "full_name") or user

    # Get accessible departments
    departments = get_user_departments()

    # Determine permissions based on role
    permissions = {
        "can_view_all_members": role_level in ("system_manager", "department_leader"),
        "can_reassign": role_level in ("system_manager", "department_leader"),
        "can_reschedule_team_meetings": role_level in ("system_manager", "department_leader"),
        "can_extend_meetings": True,  # All roles can extend their own meetings
        "can_create_bookings": role_level in ("system_manager", "department_leader", "department_member")
    }

    return {
        "user": user,
        "full_name": full_name,
        "role": role_level,
        "role_display": role_display,
        "accessible_departments": departments,
        "permissions": permissions
    }


@frappe.whitelist()
def get_calendar_resources(departments=None, focus_department=None):
    """
    Get team members as calendar resources based on user role and filters.

    Args:
        departments (str): JSON array of department IDs to include (Mode 1)
        focus_department (str): Single department ID to focus on (Mode 2)

    Returns:
        list: Calendar resources
    """
    user = frappe.session.user
    role_level, _role_name = get_user_role_level()

    # Parse departments filter
    if departments:
        if isinstance(departments, str):
            departments = json.loads(departments)

    # Get user's accessible departments
    accessible_depts = get_user_departments()
    accessible_dept_names = [d["name"] for d in accessible_depts]

    # Determine which departments to query
    if focus_department:
        # Focus mode - single department
        if focus_department not in accessible_dept_names:
            frappe.throw(_("You don't have access to this department"))
        target_depts = [focus_department]
    elif departments:
        # Multi-department mode - filter by selection
        target_depts = [d for d in departments if d in accessible_dept_names]
    else:
        # Default - all accessible departments
        target_depts = accessible_dept_names

    if not target_depts:
        return []

    resources = []

    if role_level == "department_member":
        # Department members can only see themselves
        user_full_name = frappe.db.get_value("User", user, "full_name") or user

        # Find which of the target departments the user is in
        for dept_name in target_depts:
            is_member = frappe.db.exists("MM Department Member", {
                "parent": dept_name,
                "member": user,
                "is_active": 1
            })
            if is_member:
                dept_display = frappe.db.get_value("MM Department", dept_name, "department_name")
                resources.append({
                    "id": user,
                    "title": user_full_name,
                    "department": dept_name,
                    "department_name": dept_display,
                    "is_self": True
                })
                break  # Only show user once even if in multiple departments
    else:
        # System Manager and Department Leader can see all members
        for dept_name in target_depts:
            dept_display = frappe.db.get_value("MM Department", dept_name, "department_name")

            # Get active members of this department
            members = frappe.db.sql("""
                SELECT m.member, u.full_name
                FROM `tabMM Department Member` m
                INNER JOIN `tabUser` u ON u.name = m.member
                WHERE m.parent = %s
                AND m.is_active = 1
                AND u.enabled = 1
                ORDER BY u.full_name
            """, (dept_name,), as_dict=True)

            for member in members:
                # Check if already added (user might be in multiple departments)
                existing = next((r for r in resources if r["id"] == member.member), None)
                if not existing:
                    resources.append({
                        "id": member.member,
                        "title": member.full_name or member.member,
                        "department": dept_name,
                        "department_name": dept_display,
                        "is_self": member.member == user
                    })

    return resources


@frappe.whitelist()
def get_calendar_events(start, end, departments=None, focus_department=None,
                        meeting_types=None, statuses=None, services=None):
    """
    Get bookings as calendar events based on user role and filters.

    Args:
        start (str): Start date (YYYY-MM-DD)
        end (str): End date (YYYY-MM-DD)
        departments (str): JSON array of department IDs
        focus_department (str): Single department ID for focus mode
        meeting_types (str): JSON array of meeting type IDs
        statuses (str): JSON array of status values
        services (str): JSON array of service type values

    Returns:
        list: FullCalendar event objects
    """
    from datetime import datetime as dt

    user = frappe.session.user
    role_level, _role_name = get_user_role_level()

    # Parse JSON parameters
    if departments and isinstance(departments, str):
        departments = json.loads(departments)
    if meeting_types and isinstance(meeting_types, str):
        meeting_types = json.loads(meeting_types)
    if statuses and isinstance(statuses, str):
        statuses = json.loads(statuses)
    if services and isinstance(services, str):
        services = json.loads(services)

    # Get user's accessible departments
    accessible_depts = get_user_departments()
    accessible_dept_names = [d["name"] for d in accessible_depts]
    led_dept_names = [d["name"] for d in accessible_depts if d["is_leader"]]

    # Determine target departments
    if focus_department:
        if focus_department not in accessible_dept_names:
            frappe.throw(_("You don't have access to this department"))
        target_depts = [focus_department]
    elif departments:
        target_depts = [d for d in departments if d in accessible_dept_names]
    else:
        target_depts = accessible_dept_names

    if not target_depts:
        return []

    # Build filters for get_all query
    filters = {
        "start_datetime": [">=", start],
        "end_datetime": ["<=", end]
    }

    # Add meeting type filter (for focus mode)
    if meeting_types:
        filters["meeting_type"] = ["in", meeting_types]

    # Add status filter
    if statuses:
        filters["booking_status"] = ["in", statuses]
    # Note: No default filter - show all statuses. Old statuses from before migration
    # will still be shown until the migration patch runs.

    # Add service filter
    if services:
        filters["select_mkru"] = ["in", services]

    # Fetch meetings
    meetings = frappe.get_all(
        "MM Meeting Booking",
        filters=filters,
        fields=[
            "name",
            "booking_date",
            "start_datetime",
            "end_datetime",
            "duration",
            "booking_status",
            "meeting_type",
            "customer",
            "customer_email_at_booking",
            "meeting_title",
            "meeting_description",
            "is_internal",
            "select_mkru"
        ],
        order_by="start_datetime asc",
        limit=500
    )

    # Color mapping based on status
    color_map = {
        # New statuses
        "New Appointment": "#ec4899",        # Pink/Purple
        "New Booking": "#1e40af",            # Dark Blue
        "Booking Started": "#60a5fa",        # Light Blue
        "Sale Approved": "#22c55e",          # Green
        "Booking Approved Not Sale": "#ef4444",  # Red
        "Call Customer About Sale": "#f97316",   # Orange
        "No Answer 1-3": "#9ca3af",          # Grey
        "No Answer 4-5": "#a3a33a",          # Light Brown/Olive
        "Customer Unsure": "#7dd3fc",        # Baby Blue
        "No Contact About Offer": "#b91c1c", # Dark Red
        "Cancelled": "#d1d5db",              # Light Grey
        "Optimising Not Possible": "#fbbf24", # Yellow
        "Not Possible": "#dc2626",           # Another Red
        "Rebook": "#a855f7",                 # Purple
        "Rebook Earlier": "#9333ea",         # Darker Purple
        "Consent Sent Awaiting": "#3b82f6",  # Another Blue
        # Legacy statuses (for backwards compatibility until migration runs)
        "Confirmed": "#10b981",              # Green
        "Pending": "#f59e0b",                # Yellow/Orange
        "Completed": "#3b82f6",              # Blue
        "No-Show": "#6b7280",                # Gray
        "Rescheduled": "#8b5cf6"             # Purple
    }

    # Build events list
    events = []
    for meeting in meetings:
        # Get meeting type details (including department)
        meeting_type_info = None
        department = None
        department_name = None
        meeting_type_name = "Meeting"

        if meeting.meeting_type:
            meeting_type_info = frappe.db.get_value(
                "MM Meeting Type",
                meeting.meeting_type,
                ["meeting_name", "department"],
                as_dict=True
            )
            if meeting_type_info:
                meeting_type_name = meeting_type_info.meeting_name
                department = meeting_type_info.department
                if department:
                    department_name = frappe.db.get_value("MM Department", department, "department_name")

        # Filter by department (since booking doesn't have direct department field)
        if department not in target_depts:
            continue

        # Get assigned users from child table
        assigned_users = frappe.get_all(
            "MM Meeting Booking Assigned User",
            filters={"parent": meeting.name},
            fields=["user", "is_primary_host"],
            order_by="is_primary_host desc"
        )

        # Get internal participants (team members invited to meeting)
        internal_participants = frappe.get_all(
            "MM Meeting Booking Participant",
            filters={
                "parent": meeting.name,
                "participant_type": "Internal"
            },
            fields=["user"]
        )
        participant_users = [p.user for p in internal_participants if p.user]

        # Combined list of users who can see this meeting
        meeting_users = [au.user for au in assigned_users]
        all_meeting_users = list(set(meeting_users + participant_users))

        # Role-based filtering
        if role_level == "department_member":
            # Members can see bookings where they are assigned OR a participant
            if user not in all_meeting_users:
                continue
        elif role_level == "department_leader":
            # Leaders can see all bookings in led departments
            # For other departments, only bookings where they are assigned or a participant
            if department not in led_dept_names:
                if user not in all_meeting_users:
                    continue

        # Get customer name
        customer_name = None
        if meeting.customer:
            customer_name = frappe.db.get_value("MM Customer", meeting.customer, "customer_name")
        if not customer_name:
            customer_name = meeting.customer_email_at_booking or "Guest"

        # Determine event title
        event_title = meeting.meeting_title or f"{customer_name} - {meeting_type_name}"

        # Get status color
        event_color = color_map.get(meeting.booking_status, "#6b7280")

        # Format datetime for FullCalendar
        start_dt = meeting.start_datetime
        end_dt = meeting.end_datetime

        if isinstance(start_dt, str):
            start_dt = dt.fromisoformat(start_dt.replace('Z', '+00:00'))
        if isinstance(end_dt, str):
            end_dt = dt.fromisoformat(end_dt.replace('Z', '+00:00'))

        # Determine if current user is a host (in assigned_users)
        is_current_user_host = user in meeting_users

        # Get primary host info for display
        primary_host_user = None
        primary_host_name = None
        for au in assigned_users:
            if au.is_primary_host:
                primary_host_user = au.user
                primary_host_name = frappe.db.get_value("User", au.user, "full_name") or au.user
                break
        if not primary_host_user and assigned_users:
            primary_host_user = assigned_users[0].user
            primary_host_name = frappe.db.get_value("User", assigned_users[0].user, "full_name") or assigned_users[0].user

        # Create event for each assigned user (host) resource
        for assigned_user in assigned_users:
            # Finalized bookings cannot be modified (Cancelled, Sale Approved, Not Possible, etc.)
            # Include legacy statuses for backwards compatibility
            finalized_statuses = ("Cancelled", "Sale Approved", "Booking Approved Not Sale", "Not Possible", "Completed")
            if meeting.booking_status in finalized_statuses:
                can_reschedule = False
                can_reassign = False
            else:
                # Determine if user can modify this booking
                can_reschedule = check_can_reschedule_event(
                    department, assigned_user.user, meeting.is_internal,
                    user, role_level, led_dept_names, is_host=is_current_user_host
                )
                can_reassign = check_can_reassign_event(
                    department, user, role_level, led_dept_names, is_internal=meeting.is_internal
                )

            user_full_name = frappe.db.get_value("User", assigned_user.user, "full_name") or assigned_user.user

            event = {
                "id": f"{meeting.name}-{assigned_user.user}",
                "resourceId": assigned_user.user,
                "title": event_title,
                "start": start_dt.isoformat(),
                "end": end_dt.isoformat(),
                "backgroundColor": event_color,
                "borderColor": event_color,
                "textColor": "#ffffff",
                "extendedProps": {
                    "booking_id": meeting.name,
                    "status": meeting.booking_status,
                    "customer_name": customer_name,
                    "customer_email": meeting.customer_email_at_booking,
                    "meeting_type": meeting.meeting_type,
                    "meeting_type_name": meeting_type_name,
                    "department": department,
                    "department_name": department_name,
                    "assigned_to": assigned_user.user,
                    "assigned_to_name": user_full_name,
                    "is_primary_host": assigned_user.is_primary_host,
                    "is_internal": meeting.is_internal,
                    "service_type": meeting.select_mkru,
                    "description": meeting.meeting_description,
                    "duration": meeting.duration or 0,
                    "can_reschedule": can_reschedule,
                    "can_reassign": can_reassign,
                    "is_participant": False,
                    "host_user": primary_host_user,
                    "host_name": primary_host_name
                },
                "editable": can_reschedule,
                "resourceEditable": can_reassign
            }

            # Add class for team meetings
            if meeting.is_internal:
                event["classNames"] = ["team-meeting"]

            events.append(event)

        # For team meetings (is_internal), also create events for internal participants
        # so they see the meeting on their calendar row
        if meeting.is_internal and participant_users:
            for participant_user in participant_users:
                # Skip if participant is also a host (already has an event)
                if participant_user in meeting_users:
                    continue

                # Participants cannot reschedule or reassign team meetings
                can_reschedule = False
                can_reassign = False

                participant_full_name = frappe.db.get_value("User", participant_user, "full_name") or participant_user

                participant_event = {
                    "id": f"{meeting.name}-participant-{participant_user}",
                    "resourceId": participant_user,
                    "title": event_title,
                    "start": start_dt.isoformat(),
                    "end": end_dt.isoformat(),
                    "backgroundColor": event_color,
                    "borderColor": event_color,
                    "textColor": "#ffffff",
                    "extendedProps": {
                        "booking_id": meeting.name,
                        "status": meeting.booking_status,
                        "customer_name": customer_name,
                        "customer_email": meeting.customer_email_at_booking,
                        "meeting_type": meeting.meeting_type,
                        "meeting_type_name": meeting_type_name,
                        "department": department,
                        "department_name": department_name,
                        "assigned_to": participant_user,
                        "assigned_to_name": participant_full_name,
                        "is_primary_host": False,
                        "is_internal": meeting.is_internal,
                        "service_type": meeting.select_mkru,
                        "description": meeting.meeting_description,
                        "duration": meeting.duration or 0,
                        "can_reschedule": can_reschedule,
                        "can_reassign": can_reassign,
                        "is_participant": True,  # Mark as participant, not host
                        "host_user": primary_host_user,
                        "host_name": primary_host_name
                    },
                    "editable": False,  # Participants cannot drag/drop
                    "resourceEditable": False  # Participants cannot reassign
                }

                # Add class for team meetings and participant
                participant_event["classNames"] = ["team-meeting", "participant-event"]

                events.append(participant_event)

    return events


def check_can_reschedule_event(department, assigned_user, is_internal, current_user, role_level, led_dept_names, is_host=False):
    """
    Check if current user can reschedule this event.

    For team meetings (is_internal=True):
        - Only hosts (assigned_users) can reschedule, not participants
        - System Manager and Department Leaders (for led depts) can reschedule
        - Department Members who are hosts can reschedule their own team meetings

    For customer bookings:
        - Normal permission rules apply
    """
    if role_level == "system_manager":
        return True
    elif role_level == "department_leader":
        # Can reschedule any booking in led departments
        return department in led_dept_names
    else:
        # Department member rules
        if is_internal:
            # Team meetings: only hosts can reschedule, participants cannot
            # A host is someone in the assigned_users table
            if not is_host:
                return False
            # Must be the assigned user (host) to reschedule
            return assigned_user == current_user
        else:
            # Customer bookings: can only reschedule own bookings
            if assigned_user != current_user:
                return False
            return True


def check_can_reassign_event(department, current_user, role_level, led_dept_names, is_internal=False):
    """
    Check if current user can reassign this event to another member.

    IMPORTANT: Team meetings (is_internal=True) can NEVER be reassigned by anyone.
    Only customer bookings can be reassigned.
    """
    # Team meetings can NEVER be reassigned
    if is_internal:
        return False

    if role_level == "system_manager":
        return True
    elif role_level == "department_leader":
        # Can reassign customer bookings in led departments
        return department in led_dept_names
    else:
        # Department members cannot reassign
        return False


def get_status_color(status):
    """Get color for booking status."""
    colors = {
        # New statuses
        "New Appointment": "#ec4899",        # Pink/Purple
        "New Booking": "#1e40af",            # Dark Blue
        "Booking Started": "#60a5fa",        # Light Blue
        "Sale Approved": "#22c55e",          # Green
        "Booking Approved Not Sale": "#ef4444",  # Red
        "Call Customer About Sale": "#f97316",   # Orange
        "No Answer 1-3": "#9ca3af",          # Grey
        "No Answer 4-5": "#a3a33a",          # Light Brown/Olive
        "Customer Unsure": "#7dd3fc",        # Baby Blue
        "No Contact About Offer": "#b91c1c", # Dark Red
        "Cancelled": "#d1d5db",              # Light Grey
        "Optimising Not Possible": "#fbbf24", # Yellow
        "Not Possible": "#dc2626",           # Another Red
        "Rebook": "#a855f7",                 # Purple
        "Rebook Earlier": "#9333ea",         # Darker Purple
        "Consent Sent Awaiting": "#3b82f6",  # Another Blue
        # Legacy statuses (for backwards compatibility)
        "Confirmed": "#10b981",              # Green
        "Pending": "#f59e0b",                # Yellow/Orange
        "Completed": "#3b82f6",              # Blue
        "No-Show": "#6b7280",                # Gray
        "Rescheduled": "#8b5cf6"             # Purple
    }
    return colors.get(status, "#6b7280")


@frappe.whitelist()
def get_department_meeting_types(department, customer_only=False):
    """
    Get meeting types for a specific department.

    Args:
        department (str): Department ID
        customer_only (bool): If True, only return customer-facing meeting types (is_internal=0)

    Returns:
        list: Meeting types with name, display name, and is_internal flag
    """
    # Verify user has access to this department
    accessible_depts = get_user_departments()
    accessible_dept_names = [d["name"] for d in accessible_depts]

    if department not in accessible_dept_names:
        frappe.throw(_("You don't have access to this department"))

    filters = {
        "department": department,
        "is_active": 1
    }

    # If customer_only is True, exclude internal meeting types
    if customer_only:
        filters["is_internal"] = 0

    meeting_types = frappe.get_all(
        "MM Meeting Type",
        filters=filters,
        fields=["name", "meeting_name", "is_internal", "duration"],
        order_by="meeting_name"
    )

    return meeting_types


@frappe.whitelist()
def get_resource_availability(resource_id, start_date, end_date):
    """
    Get business hours and date overrides for a resource.

    Args:
        resource_id (str): User ID
        start_date (str): Start date (YYYY-MM-DD)
        end_date (str): End date (YYYY-MM-DD)

    Returns:
        dict: {
            "business_hours": [...],
            "date_overrides": [...]
        }
    """
    # Get user's availability rules
    rules = frappe.get_all(
        "MM User Availability Rule",
        filters={
            "user": resource_id,
            "is_active": 1
        },
        fields=["day_of_week", "start_time", "end_time"]
    )

    # Convert to FullCalendar business hours format
    day_map = {
        "Monday": 1, "Tuesday": 2, "Wednesday": 3,
        "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 0
    }

    business_hours = []
    for rule in rules:
        bh = {
            "daysOfWeek": [day_map.get(rule.day_of_week, 1)],
            "startTime": str(rule.start_time)[:5],  # HH:MM format
            "endTime": str(rule.end_time)[:5]
        }
        business_hours.append(bh)

    # Get date overrides (holidays, special hours)
    # This would query a separate table if implemented
    date_overrides = []

    return {
        "business_hours": business_hours,
        "date_overrides": date_overrides
    }


@frappe.whitelist()
def update_calendar_booking(booking_id, start_datetime=None, end_datetime=None,
                           new_host=None, browser_timezone=None):
    """
    Update a booking with strict permission checks.

    Args:
        booking_id (str): Booking ID
        start_datetime (str): New start datetime (ISO format)
        end_datetime (str): New end datetime (ISO format)
        new_host (str): New assigned user (for reassignment)
        browser_timezone (str): Browser timezone for conversion

    Returns:
        dict: {success: bool, message: str}
    """
    user = frappe.session.user
    role_level, _role_name = get_user_role_level()

    # Get booking
    if not frappe.db.exists("MM Meeting Booking", booking_id):
        return {"success": False, "message": _("Booking not found")}

    booking = frappe.get_doc("MM Meeting Booking", booking_id)

    # Prevent modifications to finalized bookings
    finalized_statuses = ("Cancelled", "Sale Approved", "Booking Approved Not Sale", "Not Possible", "Completed")
    if booking.booking_status in finalized_statuses:
        return {
            "success": False,
            "message": _("Cannot modify a '{0}' booking. Only active bookings can be rescheduled, extended, or reassigned.").format(
                booking.booking_status
            )
        }

    # Get department from meeting type
    department = None
    if booking.meeting_type:
        department = frappe.db.get_value("MM Meeting Type", booking.meeting_type, "department")

    # Get assigned users from child table
    assigned_users = [au.user for au in booking.assigned_users]
    primary_host = next((au.user for au in booking.assigned_users if au.is_primary_host), None)
    if not primary_host and assigned_users:
        primary_host = assigned_users[0]

    # Get user's led departments
    accessible_depts = get_user_departments()
    led_dept_names = [d["name"] for d in accessible_depts if d["is_leader"]]

    # Check permissions for reassignment
    if new_host:
        # Team meetings can NEVER be reassigned
        if booking.is_internal:
            return {"success": False, "message": _("Team meetings cannot be reassigned. Only customer bookings can be reassigned.")}

        if role_level == "department_member":
            return {"success": False, "message": _("You don't have permission to reassign bookings")}

        if role_level == "department_leader" and department not in led_dept_names:
            return {"success": False, "message": _("You can only reassign bookings in departments you lead")}

        # Verify new host is a member of the department
        is_member = frappe.db.exists("MM Department Member", {
            "parent": department,
            "member": new_host,
            "is_active": 1
        })
        if not is_member:
            return {"success": False, "message": _("The selected user is not an active member of this department")}

        # Check if new host is available for this booking time
        duration_minutes = int((get_datetime(booking.end_datetime) - get_datetime(booking.start_datetime)).total_seconds() / 60)
        scheduled_date = getdate(booking.start_datetime)
        scheduled_time = get_datetime(booking.start_datetime).time()

        new_host_availability = check_member_availability(
            member=new_host,
            scheduled_date=scheduled_date,
            scheduled_start_time=scheduled_time,
            duration_minutes=duration_minutes,
            exclude_booking=booking.name
        )

        if not new_host_availability["available"]:
            conflict_reasons = []
            for conflict in new_host_availability.get("conflicts", []):
                conflict_reasons.append(conflict.get("message", "Unknown conflict"))

            return {
                "success": False,
                "message": _("Cannot reassign: {0} is not available at this time. {1}").format(
                    new_host,
                    "; ".join(conflict_reasons) if conflict_reasons else new_host_availability.get("reason", "")
                )
            }

        # Update assigned users - replace primary host
        for au in booking.assigned_users:
            if au.is_primary_host or au.user == primary_host:
                au.user = new_host
                break
        else:
            # No primary host found, add new one
            booking.append("assigned_users", {
                "user": new_host,
                "is_primary_host": 1
            })

    # Check permissions for reschedule
    if start_datetime or end_datetime:
        # Check if user can reschedule
        # For team meetings: only hosts (assigned_users) can reschedule, not participants
        if role_level == "department_member":
            if user not in assigned_users:
                if booking.is_internal:
                    return {"success": False, "message": _("Only meeting hosts can reschedule team meetings. Participants cannot reschedule.")}
                return {"success": False, "message": _("You can only reschedule your own bookings")}
        elif role_level == "department_leader":
            if department not in led_dept_names:
                if user not in assigned_users:
                    if booking.is_internal:
                        return {"success": False, "message": _("Only meeting hosts can reschedule team meetings. Participants cannot reschedule.")}
                    return {"success": False, "message": _("You can only reschedule bookings in departments you lead")}

        # Validate: Cannot reschedule to past date/time
        current_time = now_datetime()

        if start_datetime:
            new_start = get_datetime(start_datetime)
            if hasattr(new_start, 'tzinfo') and new_start.tzinfo is not None:
                new_start = new_start.replace(tzinfo=None)
            if new_start < current_time:
                return {"success": False, "message": _("Cannot reschedule a meeting to a past date/time.")}

        # Parse and update datetime
        # Handle ISO format with timezone (e.g., "2026-01-15T10:30:00.000Z")
        if start_datetime:
            parsed_start = get_datetime(start_datetime)
            # Make timezone-naive if needed (Frappe stores naive datetimes)
            if hasattr(parsed_start, 'tzinfo') and parsed_start.tzinfo is not None:
                parsed_start = parsed_start.replace(tzinfo=None)
            booking.start_datetime = parsed_start

        if end_datetime:
            parsed_end = get_datetime(end_datetime)
            # Make timezone-naive if needed (Frappe stores naive datetimes)
            if hasattr(parsed_end, 'tzinfo') and parsed_end.tzinfo is not None:
                parsed_end = parsed_end.replace(tzinfo=None)
            booking.end_datetime = parsed_end

        # Validate availability for all assigned users with new times
        new_start = booking.start_datetime
        new_end = booking.end_datetime
        duration_minutes = int((get_datetime(new_end) - get_datetime(new_start)).total_seconds() / 60)
        scheduled_date = getdate(new_start)
        scheduled_time = get_datetime(new_start).time()

        # Check availability for all hosts (assigned users)
        for assigned_user in booking.assigned_users:
            availability = check_member_availability(
                member=assigned_user.user,
                scheduled_date=scheduled_date,
                scheduled_start_time=scheduled_time,
                duration_minutes=duration_minutes,
                exclude_booking=booking.name  # Exclude current booking from conflict check
            )

            if not availability["available"]:
                # Format conflict message
                conflict_reasons = []
                for conflict in availability.get("conflicts", []):
                    conflict_reasons.append(conflict.get("message", "Unknown conflict"))

                user_name = frappe.db.get_value("User", assigned_user.user, "full_name") or assigned_user.user
                return {
                    "success": False,
                    "message": _("Cannot update booking: Host {0} is not available. {1}").format(
                        user_name,
                        "; ".join(conflict_reasons) if conflict_reasons else availability.get("reason", "")
                    )
                }

        # For team meetings, also check availability of all internal participants
        if booking.is_internal:
            internal_participants = frappe.get_all(
                "MM Meeting Booking Participant",
                filters={
                    "parent": booking.name,
                    "participant_type": "Internal"
                },
                fields=["user"]
            )

            for participant in internal_participants:
                if not participant.user:
                    continue

                # Skip if participant is also a host (already checked above)
                if participant.user in [au.user for au in booking.assigned_users]:
                    continue

                availability = check_member_availability(
                    member=participant.user,
                    scheduled_date=scheduled_date,
                    scheduled_start_time=scheduled_time,
                    duration_minutes=duration_minutes,
                    exclude_booking=booking.name  # Exclude current booking from conflict check
                )

                if not availability["available"]:
                    # Format conflict message
                    conflict_reasons = []
                    for conflict in availability.get("conflicts", []):
                        conflict_reasons.append(conflict.get("message", "Unknown conflict"))

                    participant_name = frappe.db.get_value("User", participant.user, "full_name") or participant.user
                    return {
                        "success": False,
                        "message": _("Cannot update team meeting: Participant {0} is not available. {1}").format(
                            participant_name,
                            "; ".join(conflict_reasons) if conflict_reasons else availability.get("reason", "")
                        )
                    }

    try:
        booking.save(ignore_permissions=True)
        frappe.db.commit()

        # Get updated primary host
        updated_primary_host = next((au.user for au in booking.assigned_users if au.is_primary_host), None)
        if not updated_primary_host and booking.assigned_users:
            updated_primary_host = booking.assigned_users[0].user

        return {
            "success": True,
            "message": _("Booking updated successfully"),
            "booking": {
                "name": booking.name,
                "start_datetime": str(booking.start_datetime),
                "end_datetime": str(booking.end_datetime),
                "assigned_to": updated_primary_host
            }
        }
    except Exception as e:
        frappe.db.rollback()
        import traceback
        frappe.log_error(traceback.format_exc(), "Calendar Booking Update Error")
        return {"success": False, "message": str(e)}


@frappe.whitelist()
def check_booking_permission(booking_id, action="view"):
    """
    Check if current user can perform action on booking.

    Args:
        booking_id (str): Booking ID
        action (str): view|reschedule|reassign|extend

    Returns:
        dict: {allowed: bool, reason: str}
    """
    user = frappe.session.user
    role_level, _role_name = get_user_role_level()

    if not frappe.db.exists("MM Meeting Booking", booking_id):
        return {"allowed": False, "reason": _("Booking not found")}

    booking = frappe.get_doc("MM Meeting Booking", booking_id)

    # Finalized bookings cannot be modified (but can be viewed)
    finalized_statuses = ("Cancelled", "Sale Approved", "Booking Approved Not Sale", "Not Possible", "Completed")
    if action in ("reschedule", "reassign", "extend") and booking.booking_status in finalized_statuses:
        return {
            "allowed": False,
            "reason": _("Cannot modify a '{0}' booking. Only active bookings can be modified.").format(
                booking.booking_status
            )
        }

    # Get department from meeting type
    department = None
    if booking.meeting_type:
        department = frappe.db.get_value("MM Meeting Type", booking.meeting_type, "department")

    # Get assigned users (hosts) from child table
    assigned_users = [au.user for au in booking.assigned_users]

    # Get internal participants (team members invited to meeting)
    internal_participants = frappe.get_all(
        "MM Meeting Booking Participant",
        filters={
            "parent": booking.name,
            "participant_type": "Internal"
        },
        fields=["user"]
    )
    participant_users = [p.user for p in internal_participants if p.user]

    # Combined list: hosts + participants can view the meeting
    all_meeting_users = list(set(assigned_users + participant_users))

    # Get user's departments
    accessible_depts = get_user_departments()
    accessible_dept_names = [d["name"] for d in accessible_depts]
    led_dept_names = [d["name"] for d in accessible_depts if d["is_leader"]]

    # Check department access
    if department not in accessible_dept_names:
        return {"allowed": False, "reason": _("No access to this department")}

    if action == "view":
        if role_level == "system_manager":
            return {"allowed": True, "reason": ""}
        elif role_level == "department_leader":
            if department in led_dept_names:
                return {"allowed": True, "reason": ""}
            elif user in all_meeting_users:
                return {"allowed": True, "reason": ""}
            else:
                return {"allowed": False, "reason": _("Not authorized to view this booking")}
        else:
            # Department members can view if they are host OR participant
            if user in all_meeting_users:
                return {"allowed": True, "reason": ""}
            else:
                return {"allowed": False, "reason": _("You can only view your own bookings")}

    elif action == "reschedule":
        if role_level == "system_manager":
            return {"allowed": True, "reason": ""}
        elif role_level == "department_leader":
            if department in led_dept_names:
                return {"allowed": True, "reason": ""}
            elif user in assigned_users and not booking.is_internal:
                return {"allowed": True, "reason": ""}
            else:
                if booking.is_internal and user not in assigned_users:
                    return {"allowed": False, "reason": _("Only meeting hosts can reschedule team meetings. Participants cannot reschedule.")}
                return {"allowed": False, "reason": _("Not authorized to reschedule this booking")}
        else:
            # Department members: only hosts can reschedule, not participants
            if user not in assigned_users:
                if booking.is_internal:
                    return {"allowed": False, "reason": _("Only meeting hosts can reschedule team meetings. Participants cannot reschedule.")}
                return {"allowed": False, "reason": _("You can only reschedule your own bookings")}
            return {"allowed": True, "reason": ""}

    elif action == "reassign":
        # Team meetings can NEVER be reassigned by anyone
        if booking.is_internal:
            return {"allowed": False, "reason": _("Team meetings cannot be reassigned. Only customer bookings can be reassigned.")}

        if role_level == "system_manager":
            return {"allowed": True, "reason": ""}
        elif role_level == "department_leader":
            if department in led_dept_names:
                return {"allowed": True, "reason": ""}
            else:
                return {"allowed": False, "reason": _("You can only reassign in departments you lead")}
        else:
            return {"allowed": False, "reason": _("You don't have permission to reassign bookings")}

    elif action == "extend":
        # Same rules as reschedule
        return check_booking_permission(booking_id, "reschedule")

    return {"allowed": False, "reason": _("Unknown action")}


@frappe.whitelist()
def get_filter_options():
    """
    Get available options for status and service filters.

    Returns:
        dict: {
            "statuses": [...],
            "services": [...]
        }
    """
    statuses = [
        {"value": "New Appointment", "label": "New Appointment", "color": "#ec4899"},
        {"value": "New Booking", "label": "New Booking", "color": "#1e40af"},
        {"value": "Booking Started", "label": "Booking Started", "color": "#60a5fa"},
        {"value": "Sale Approved", "label": "Sale Approved", "color": "#22c55e"},
        {"value": "Booking Approved Not Sale", "label": "Booking Approved Not Sale", "color": "#ef4444"},
        {"value": "Call Customer About Sale", "label": "Call Customer About Sale", "color": "#f97316"},
        {"value": "No Answer 1-3", "label": "No Answer 1-3", "color": "#9ca3af"},
        {"value": "No Answer 4-5", "label": "No Answer 4-5", "color": "#a3a33a"},
        {"value": "Customer Unsure", "label": "Customer Unsure", "color": "#7dd3fc"},
        {"value": "No Contact About Offer", "label": "No Contact About Offer", "color": "#b91c1c"},
        {"value": "Cancelled", "label": "Cancelled", "color": "#d1d5db"},
        {"value": "Optimising Not Possible", "label": "Optimising Not Possible", "color": "#fbbf24"},
        {"value": "Not Possible", "label": "Not Possible", "color": "#dc2626"},
        {"value": "Rebook", "label": "Rebook", "color": "#a855f7"},
        {"value": "Rebook Earlier", "label": "Rebook Earlier", "color": "#9333ea"},
        {"value": "Consent Sent Awaiting", "label": "Consent Sent Awaiting", "color": "#3b82f6"}
    ]

    services = [
        {"value": "Business", "label": "Business"},
        {"value": "Business Extended", "label": "Business Extended"},
        {"value": "Business Rebook", "label": "Business Rebook"},
        {"value": "New Setup Business", "label": "New Setup Business"},
        {"value": "Private / Business Customer", "label": "Private / Business Customer"},
        {"value": "Private New Sale", "label": "Private New Sale"},
        {"value": "Private Self Book", "label": "Private Self Book"}
    ]

    return {
        "statuses": statuses,
        "services": services
    }


@frappe.whitelist()
def get_resource_business_hours(resource_id, start_date, end_date):
    """
    Get business hours (available time ranges) for a resource (user) for FullCalendar.

    This function returns BOTH:
    1. Regular working hours (recurring weekly pattern)
    2. Date-specific overrides that REPLACE regular hours for specific dates

    Date overrides take FULL PRIORITY - they can extend or restrict hours beyond regular schedule.

    Args:
        resource_id (str): User ID
        start_date (str): Start date (YYYY-MM-DD)
        end_date (str): End date (YYYY-MM-DD)

    Returns:
        dict: {
            "businessHours": [...],  # Regular working hours + date-specific overrides
            "dateOverrides": [...]    # For frontend validation only
        }
    """
    try:
        business_hours = []

        # Get user's working hours from MM User Settings
        user_settings = frappe.get_value(
            "MM User Settings",
            {"user": resource_id},
            ["working_hours_json"],
            as_dict=True
        )

        if not user_settings or not user_settings.working_hours_json:
            # No working hours defined - default to standard 9-5 weekday schedule
            business_hours = [{
                "daysOfWeek": [1, 2, 3, 4, 5],  # Monday to Friday
                "startTime": "09:00",
                "endTime": "17:00"
            }]
        else:
            try:
                working_hours = json.loads(user_settings.working_hours_json)
            except (json.JSONDecodeError, TypeError):
                # Invalid JSON - default to standard 9-5 weekday schedule
                business_hours = [{
                    "daysOfWeek": [1, 2, 3, 4, 5],  # Monday to Friday
                    "startTime": "09:00",
                    "endTime": "17:00"
                }]
            else:
                # Convert working hours to FullCalendar businessHours format
                day_mapping = {
                    "monday": 1,
                    "tuesday": 2,
                    "wednesday": 3,
                    "thursday": 4,
                    "friday": 5,
                    "saturday": 6,
                    "sunday": 0
                }

                # Group days by their working hours
                hours_groups = {}
                for day_name, day_config in working_hours.items():
                    if day_name in day_mapping and day_config.get("enabled", False):
                        start_time = day_config.get("start", "09:00")
                        end_time = day_config.get("end", "17:00")
                        hours_key = f"{start_time}-{end_time}"

                        if hours_key not in hours_groups:
                            hours_groups[hours_key] = []
                        hours_groups[hours_key].append(day_mapping[day_name])

                # Convert to FullCalendar format
                for hours_key, days in hours_groups.items():
                    start_time, end_time = hours_key.split("-")
                    business_hours.append({
                        "daysOfWeek": days,
                        "startTime": start_time,
                        "endTime": end_time
                    })

        # Now fetch date-specific overrides
        date_overrides = []

        # Get user's availability rules
        availability_rules = frappe.get_all(
            "MM User Availability Rule",
            filters={"user": resource_id},
            fields=["name"]
        )

        if availability_rules:
            # Parse date range
            start_dt = getdate(start_date)
            end_dt = getdate(end_date)

            # Collect all overrides, grouped by date
            overrides_by_date = {}

            # Get all date overrides in the range
            for rule in availability_rules:
                overrides = frappe.get_all(
                    "MM User Date Overrides",
                    filters={
                        "parent": rule.name,
                        "parenttype": "MM User Availability Rule",
                        "date": ["between", [start_dt, end_dt]]
                    },
                    fields=["date", "available", "custom_hours_start", "custom_hours_end", "reason"],
                    order_by="date, custom_hours_start"  # Sort by date and start time
                )

                for override in overrides:
                    date_str = str(override.date)

                    if date_str not in overrides_by_date:
                        overrides_by_date[date_str] = []

                    overrides_by_date[date_str].append(override)

            # Process each date's overrides
            for date_str, day_overrides in overrides_by_date.items():
                # Case 1: If ANY override marks the day as unavailable, entire day is blocked
                if any(not o.available for o in day_overrides):
                    date_overrides.append({
                        "date": date_str,
                        "available": False,
                        "reason": "Not available",
                        "allDay": True
                    })
                    continue

                # Case 2: Collect all available time slots for this date
                # These can EXTEND or RESTRICT regular working hours
                available_slots = []
                for override in day_overrides:
                    if override.available and override.custom_hours_start and override.custom_hours_end:
                        available_slots.append({
                            "start": str(override.custom_hours_start),
                            "end": str(override.custom_hours_end),
                            "reason": override.reason or "Custom hours"
                        })

                # Store override info - frontend will handle visualization
                if available_slots:
                    date_overrides.append({
                        "date": date_str,
                        "available": True,
                        "availableSlots": available_slots,
                        "allDay": False
                    })

                    # Add date-specific business hours to prevent gray-out
                    # This makes extended hours appear WHITE instead of gray non-business hours
                    for slot in available_slots:
                        # Convert Python weekday (Mon=0) to FullCalendar (Sun=0)
                        override_date = getdate(date_str)
                        fc_weekday = (override_date.weekday() + 1) % 7

                        business_hours.append({
                            "groupId": f"override-{date_str}",
                            "daysOfWeek": [fc_weekday],
                            "startTime": slot["start"],
                            "endTime": slot["end"],
                            "startRecur": date_str,
                            "endRecur": date_str
                        })

        return {
            "businessHours": business_hours,
            "dateOverrides": date_overrides
        }

    except Exception as e:
        frappe.log_error(f"Error fetching business hours for {resource_id}: {str(e)}", "Enhanced Calendar API")
        # Return empty structure on error
        return {
            "businessHours": [],
            "dateOverrides": []
        }


@frappe.whitelist()
def get_all_resources_business_hours(resource_ids, start_date, end_date):
    """
    Get business hours for multiple resources at once.

    This is more efficient than calling get_resource_business_hours multiple times.

    Args:
        resource_ids (str): JSON array of User IDs
        start_date (str): Start date (YYYY-MM-DD)
        end_date (str): End date (YYYY-MM-DD)

    Returns:
        dict: {resource_id: {"businessHours": [...], "dateOverrides": [...]}}
    """
    try:
        if isinstance(resource_ids, str):
            resource_ids = json.loads(resource_ids)

        result = {}
        for resource_id in resource_ids:
            result[resource_id] = get_resource_business_hours(resource_id, start_date, end_date)

        return result

    except Exception as e:
        frappe.log_error(f"Error fetching business hours for resources: {str(e)}", "Enhanced Calendar API")
        return {}


@frappe.whitelist()
def get_booking_details(booking_id):
    """
    Get comprehensive details for a meeting booking for the detail modal.

    Args:
        booking_id (str): Booking ID

    Returns:
        dict: Full booking details with permissions
    """
    user = frappe.session.user
    role_level, role_display = get_user_role_level()

    if not frappe.db.exists("MM Meeting Booking", booking_id):
        return {"success": False, "message": _("Booking not found")}

    booking = frappe.get_doc("MM Meeting Booking", booking_id)

    # Get department from meeting type
    department = None
    department_name = None
    meeting_type_name = None
    if booking.meeting_type:
        meeting_type_info = frappe.db.get_value(
            "MM Meeting Type",
            booking.meeting_type,
            ["meeting_name", "department", "is_internal"],
            as_dict=True
        )
        if meeting_type_info:
            meeting_type_name = meeting_type_info.meeting_name
            department = meeting_type_info.department
            if department:
                department_name = frappe.db.get_value("MM Department", department, "department_name")

    # Get assigned users (hosts)
    assigned_users = []
    primary_host = None
    for au in booking.assigned_users:
        user_info = frappe.db.get_value("User", au.user, ["full_name", "email"], as_dict=True)
        host_data = {
            "user": au.user,
            "full_name": user_info.full_name if user_info else au.user,
            "email": user_info.email if user_info else "",
            "is_primary_host": au.is_primary_host
        }
        assigned_users.append(host_data)
        if au.is_primary_host:
            primary_host = host_data

    if not primary_host and assigned_users:
        primary_host = assigned_users[0]

    # Get internal participants
    internal_participants = []
    for p in booking.participants:
        if p.participant_type == "Internal" and p.user:
            user_info = frappe.db.get_value("User", p.user, ["full_name", "email"], as_dict=True)
            internal_participants.append({
                "user": p.user,
                "full_name": user_info.full_name if user_info else p.user,
                "email": p.email or (user_info.email if user_info else ""),
                "response_status": p.response_status
            })

    # Get external participants
    external_participants = []
    for p in booking.participants:
        if p.participant_type == "External":
            external_participants.append({
                "name": p.name1,
                "email": p.email,
                "response_status": p.response_status
            })

    # Get customer details
    customer_data = None
    if booking.customer:
        customer_info = frappe.db.get_value(
            "MM Customer",
            booking.customer,
            ["customer_name", "primary_email"],
            as_dict=True
        )
        if customer_info:
            customer_data = {
                "name": booking.customer,
                "customer_name": customer_info.customer_name,
                "primary_email": customer_info.primary_email
            }

    # Check permissions
    host_users = [au.user for au in booking.assigned_users]
    participant_users = [p.user for p in booking.participants if p.participant_type == "Internal" and p.user]
    all_meeting_users = list(set(host_users + participant_users))

    accessible_depts = get_user_departments()
    led_dept_names = [d["name"] for d in accessible_depts if d["is_leader"]]

    # Determine user's role in this meeting
    is_host = user in host_users
    is_participant = user in participant_users and user not in host_users

    # Calculate permissions
    can_edit = False
    can_reschedule = False
    can_reassign = False
    can_cancel = False

    # Finalized bookings cannot be modified
    finalized_statuses = ("Cancelled", "Sale Approved", "Booking Approved Not Sale", "Not Possible", "Completed")
    if booking.booking_status not in finalized_statuses:
        if role_level == "system_manager":
            can_edit = True
            can_reschedule = True
            can_reassign = not booking.is_internal  # Team meetings cannot be reassigned
            can_cancel = True
        elif role_level == "department_leader":
            if department in led_dept_names:
                can_edit = True
                can_reschedule = True
                can_reassign = not booking.is_internal
                can_cancel = True
            elif is_host:
                can_edit = True
                can_reschedule = True
                can_cancel = True
        else:  # department_member
            if is_host:
                can_edit = True
                can_reschedule = True
                can_cancel = True
            # Participants cannot modify team meetings

    # Format datetime
    start_dt = booking.start_datetime
    end_dt = booking.end_datetime

    # Calculate duration in minutes
    duration_minutes = 0
    if start_dt and end_dt:
        duration_minutes = int((get_datetime(end_dt) - get_datetime(start_dt)).total_seconds() / 60)

    return {
        "success": True,
        "booking": {
            "name": booking.name,
            "meeting_title": booking.meeting_title,
            "meeting_description": booking.meeting_description,
            "booking_date": str(booking.booking_date) if booking.booking_date else None,
            "start_datetime": str(start_dt) if start_dt else None,
            "end_datetime": str(end_dt) if end_dt else None,
            "duration": booking.duration,
            "duration_minutes": duration_minutes,
            "booking_status": booking.booking_status,
            "is_internal": booking.is_internal,
            "service_type": booking.select_mkru,
            "customer_email_at_booking": booking.customer_email_at_booking,
            "notes": booking.meeting_description
        },
        "meeting_type": {
            "name": booking.meeting_type,
            "meeting_name": meeting_type_name
        },
        "department": {
            "name": department,
            "department_name": department_name
        },
        "customer": customer_data,
        "hosts": assigned_users,
        "primary_host": primary_host,
        "internal_participants": internal_participants,
        "external_participants": external_participants,
        "user_context": {
            "user": user,
            "role": role_level,
            "role_display": role_display,
            "is_host": is_host,
            "is_participant": is_participant
        },
        "permissions": {
            "can_edit": can_edit,
            "can_reschedule": can_reschedule,
            "can_reassign": can_reassign,
            "can_cancel": can_cancel
        }
    }


@frappe.whitelist()
def create_slot_booking(booking_data):
    """
    Create a customer booking from a calendar slot selection.

    This is used when a user clicks on an empty time slot in the calendar to create
    a new booking for a customer.

    Permission rules:
    - System Manager: Can create bookings for any team member in any department
    - Department Leader: Can create bookings for team members in their led departments
    - Department Member: Can only create bookings for themselves

    Args:
        booking_data (str): JSON string containing:
            - department (str): Department ID
            - meeting_type (str): Meeting Type ID
            - assigned_to (str): User ID of the team member to assign
            - start_datetime (str): Start datetime (YYYY-MM-DD HH:MM:SS)
            - end_datetime (str): End datetime (YYYY-MM-DD HH:MM:SS)
            - customer_id (str, optional): Existing customer ID
            - customer_name (str, optional): New customer name
            - customer_email (str, optional): New customer email
            - customer_phone (str, optional): New customer phone
            - customer_cvr (str, optional): CVR number
            - customer_company (str, optional): Company name
            - service_type (str): Service type
            - meeting_agenda (str, optional): Meeting notes/agenda
            - send_notification (int): 1 to send email notification

    Returns:
        dict: {success: bool, message: str, booking: dict}
    """
    user = frappe.session.user
    role_level, _role_name = get_user_role_level()

    # Parse booking data
    if isinstance(booking_data, str):
        booking_data = json.loads(booking_data)

    # Extract required fields
    department = booking_data.get("department")
    meeting_type = booking_data.get("meeting_type")
    assigned_to = booking_data.get("assigned_to")
    start_datetime = booking_data.get("start_datetime")
    end_datetime = booking_data.get("end_datetime")
    customer_id = booking_data.get("customer_id")
    customer_name = booking_data.get("customer_name")
    customer_email = booking_data.get("customer_email")
    customer_phone = booking_data.get("customer_phone")
    customer_cvr = booking_data.get("customer_cvr")
    customer_company = booking_data.get("customer_company")
    service_type = booking_data.get("service_type")
    meeting_agenda = booking_data.get("meeting_agenda")
    send_notification = booking_data.get("send_notification", 0)

    # Validate required fields
    if not department:
        return {"success": False, "message": _("Department is required")}
    if not meeting_type:
        return {"success": False, "message": _("Meeting type is required")}
    if not assigned_to:
        return {"success": False, "message": _("Assigned user is required")}
    if not start_datetime or not end_datetime:
        return {"success": False, "message": _("Start and end times are required")}
    if not service_type:
        return {"success": False, "message": _("Service type is required")}
    if not customer_id and not (customer_name and customer_email):
        return {"success": False, "message": _("Customer information is required")}

    # Verify user has permission to create bookings
    accessible_depts = get_user_departments()
    accessible_dept_names = [d["name"] for d in accessible_depts]
    led_dept_names = [d["name"] for d in accessible_depts if d["is_leader"]]

    if department not in accessible_dept_names:
        return {"success": False, "message": _("You don't have access to this department")}

    # Check permission to assign to the specified user
    if role_level == "system_manager":
        # Can assign to anyone
        pass
    elif role_level == "department_leader":
        # Can assign to team members in led departments
        if department not in led_dept_names:
            return {"success": False, "message": _("You can only create bookings in departments you lead")}
    else:
        # Department member can only assign to themselves
        if assigned_to != user:
            return {"success": False, "message": _("You can only create bookings for yourself")}

    # Verify the meeting type belongs to the department and is not internal
    mt_info = frappe.db.get_value(
        "MM Meeting Type",
        meeting_type,
        ["department", "is_internal", "meeting_name", "duration"],
        as_dict=True
    )
    if not mt_info:
        return {"success": False, "message": _("Invalid meeting type")}
    if mt_info.department != department:
        return {"success": False, "message": _("Meeting type does not belong to the selected department")}
    if mt_info.is_internal:
        return {"success": False, "message": _("Cannot create customer bookings with internal meeting types")}

    # Parse datetime
    start_dt = get_datetime(start_datetime)
    end_dt = get_datetime(end_datetime)

    # Check that start is not in the past
    if start_dt < now_datetime():
        return {"success": False, "message": _("Cannot create bookings in the past")}

    # Calculate duration
    duration_minutes = int((end_dt - start_dt).total_seconds() / 60)

    # Check availability of the assigned user
    scheduled_date = getdate(start_dt)
    scheduled_time = start_dt.time()

    availability = check_member_availability(
        member=assigned_to,
        scheduled_date=scheduled_date,
        scheduled_start_time=scheduled_time,
        duration_minutes=duration_minutes
    )

    if not availability["available"]:
        conflict_reasons = []
        for conflict in availability.get("conflicts", []):
            conflict_reasons.append(conflict.get("message", "Unknown conflict"))

        user_name = frappe.db.get_value("User", assigned_to, "full_name") or assigned_to
        return {
            "success": False,
            "message": _("Cannot create booking: {0} is not available. {1}").format(
                user_name,
                "; ".join(conflict_reasons) if conflict_reasons else availability.get("reason", "")
            )
        }

    # Handle customer
    customer_doc = None
    customer_name_display = None
    customer_email_display = None

    if customer_id:
        # Use existing customer
        if not frappe.db.exists("MM Customer", customer_id):
            return {"success": False, "message": _("Customer not found")}
        customer_doc = frappe.get_doc("MM Customer", customer_id)
        customer_name_display = customer_doc.customer_name
        customer_email_display = customer_doc.primary_email

        # Update CVR and company name if provided
        customer_updated = False
        if customer_cvr and customer_doc.cvr_number != customer_cvr:
            customer_doc.cvr_number = customer_cvr
            customer_updated = True
        if customer_company and customer_doc.company_name != customer_company:
            customer_doc.company_name = customer_company
            customer_updated = True
        if customer_updated:
            customer_doc.save(ignore_permissions=True)
    else:
        # Check if customer already exists by email
        from meeting_manager.meeting_manager.doctype.mm_customer.mm_customer import MMCustomer
        existing_customer_id = MMCustomer.find_by_email(customer_email)

        if existing_customer_id:
            # Link to existing customer
            customer_doc = frappe.get_doc("MM Customer", existing_customer_id)
            customer_name_display = customer_doc.customer_name
            customer_email_display = customer_doc.primary_email
        else:
            # Create new customer
            new_customer = frappe.get_doc({
                "doctype": "MM Customer",
                "customer_name": customer_name,
                "primary_email": customer_email,
                "cvr_number": customer_cvr,
                "company_name": customer_company
            })

            # Add phone if provided
            if customer_phone:
                new_customer.append("phone_numbers", {
                    "phone_number": customer_phone,
                    "phone_type": "Primary",
                    "is_primary": 1
                })

            new_customer.insert(ignore_permissions=True)
            customer_doc = new_customer
            customer_name_display = new_customer.customer_name
            customer_email_display = new_customer.primary_email

    # Create the booking
    try:
        booking = frappe.get_doc({
            "doctype": "MM Meeting Booking",
            "meeting_type": meeting_type,
            "customer": customer_doc.name if customer_doc else None,
            "customer_email_at_booking": customer_email_display,
            "booking_date": scheduled_date,
            "start_datetime": start_dt,
            "end_datetime": end_dt,
            "duration": duration_minutes,
            "booking_status": "New Booking",
            "select_mkru": service_type,
            "meeting_title": f"{customer_name_display} - {mt_info.meeting_name}",
            "meeting_description": meeting_agenda,
            "is_internal": 0,
            "booked_by": user
        })

        # Add host as assigned user
        booking.append("assigned_users", {
            "user": assigned_to,
            "is_primary_host": 1
        })

        booking.insert(ignore_permissions=True)
        frappe.db.commit()

        # Update customer booking stats
        if customer_doc:
            customer_doc.total_bookings = (customer_doc.total_bookings or 0) + 1
            customer_doc.last_booking_date = scheduled_date
            customer_doc.save(ignore_permissions=True)
            frappe.db.commit()

        # TODO: Send email notification if requested
        # if send_notification:
        #     send_booking_notification(booking.name)

        host_name = frappe.db.get_value("User", assigned_to, "full_name") or assigned_to

        return {
            "success": True,
            "message": _("Booking created successfully"),
            "booking": {
                "name": booking.name,
                "meeting_title": booking.meeting_title,
                "start_datetime": str(booking.start_datetime),
                "end_datetime": str(booking.end_datetime),
                "host": host_name,
                "customer_name": customer_name_display
            }
        }

    except Exception as e:
        frappe.db.rollback()
        import traceback
        frappe.log_error(traceback.format_exc(), "Calendar Slot Booking Error")
        return {"success": False, "message": str(e)}
