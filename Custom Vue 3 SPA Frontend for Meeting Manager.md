# Plan: Custom Vue 3 SPA Frontend for Meeting Manager

## Context

The Meeting Manager Frappe app currently uses Frappe Desk pages (vanilla JS) and a React dashboard for its authenticated UI. These are functional but limited in UX — no unified navigation, no shared state, inconsistent styling, and CDN-loaded dependencies. The user wants a modern custom Vue 3 SPA (like Helpdesk's `/helpdesk/`) that replaces all desk pages with a unified, role-aware frontend at `/meeting-manager/`.

**What stays as-is:**
- All backend Python code (40+ whitelisted API endpoints) — zero backend changes
- Public www/ pages (guest booking at `/meeting-booking`, cancel, reschedule, confirmation) — these serve unauthenticated users and remain as Jinja templates
- All DocType definitions, permissions, hooks logic

**What gets replaced:**
- 5 Frappe Desk pages → Vue SPA pages
- 1 React dashboard → Vue equivalent
- All doctype admin interactions → Vue CRUD pages

---vscode-webview://104av3c52t5pou3ms107nvip9omlg1iisofsacio60brf2mfg0o5/index.html?id=c80441a0-82f5-43a3-94d2-e4e3a76f4ca7&parentId=3&origin=d7ba60fc-9dfd-429a-83c5-40677637426c&swVersion=4&extensionId=Anthropic.claude-code&platform=electron&vscode-resource-base-authority=vscode-resource.vscode-cdn.net&parentOrigin=vscode-file%3A%2F%2Fvscode-app&session=de7fff77-d14f-47a9-99d1-6006440c5032#

## Architecture

```
Browser requests /meeting-manager/calendar
        |
Frappe website_route_rules catches /meeting-manager/*
        |
Renders www/meeting-manager/index.html (Jinja + boot data)
        |
Vue app bundle loads from /assets/meeting_manager/desk/
Vue Router matches /calendar, renders EnhancedCalendar.vue
        |
Component calls existing Frappe APIs via frappe-ui (createResource, call)
        |
Backend returns JSON (permissions enforced server-side)
```

---

## Folder Structure

```
apps/meeting_manager/
├── package.json                          # NEW - Root workspace config
├── desk/                                 # NEW - Vue 3 SPA
│   ├── package.json                      # frappe-ui, vue, fullcalendar, etc.
│   ├── index.html                        # Dev entry (3 mount divs)
│   ├── vite.config.js                    # frappe-ui plugin + build paths
│   ├── tailwind.config.js                # frappe-ui preset
│   ├── postcss.config.js
│   ├── tsconfig.json
│   └── src/
│       ├── main.js                       # Bootstrap: FrappeUI + Pinia + Router
│       ├── App.vue                       # Root: <AppLayout><router-view/></AppLayout>
│       ├── index.css                     # Tailwind imports
│       ├── router/
│       │   └── index.ts                  # All routes + auth guard
│       ├── stores/
│       │   ├── auth.ts                   # Session, roles, departments
│       │   ├── calendar.ts               # Calendar view/filter state
│       │   └── departments.ts            # Department + meeting type cache
│       ├── composables/
│       │   ├── usePermissions.ts         # canEdit, canReassign, canDelete helpers
│       │   └── useNavigation.ts          # Role-filtered sidebar items
│       ├── layouts/
│       │   └── AppLayout.vue             # Sidebar + header + main content
│       ├── pages/                        # One .vue per route
│       │   ├── calendar/
│       │   │   └── EnhancedCalendar.vue  # FullCalendar timeline
│       │   ├── bookings/
│       │   │   ├── BookingsList.vue       # Filterable booking list
│       │   │   ├── BookingDetail.vue      # Card-based meeting view
│       │   │   ├── SelfBookMeeting.vue    # 5-step wizard
│       │   │   └── TeamMeeting.vue        # 6-step wizard (leaders)
│       │   ├── admin/
│       │   │   ├── Departments.vue        # CRUD departments (SM only)
│       │   │   ├── DepartmentDetail.vue   # Edit dept + members
│       │   │   ├── MeetingTypes.vue       # CRUD meeting types (leader+)
│       │   │   ├── MeetingTypeDetail.vue  # Edit meeting type
│       │   │   ├── EmailTemplates.vue     # List/edit templates
│       │   │   └── OAuthSettings.vue      # OAuth config (SM only)
│       │   ├── settings/
│       │   │   ├── MySettings.vue         # User settings + working hours
│       │   │   ├── MyAvailability.vue     # Availability rules CRUD
│       │   │   ├── MyBlockedSlots.vue     # Blocked slots CRUD
│       │   │   └── TeamSettings.vue       # Read team members (leaders)
│       │   ├── Dashboard.vue              # Stats + recent bookings
│       │   └── NotFound.vue
│       └── components/
│           ├── calendar/
│           │   ├── CalendarTimeline.vue    # FullCalendar wrapper
│           │   ├── DepartmentFilters.vue
│           │   ├── StatusFilters.vue
│           │   ├── BookingDetailModal.vue
│           │   ├── CreateBookingModal.vue
│           │   └── BlockedSlotModal.vue
│           ├── bookings/
│           │   ├── StepProgress.vue        # Reusable wizard stepper
│           │   ├── DepartmentSelect.vue    # Card grid selector
│           │   ├── MeetingTypeSelect.vue
│           │   ├── DatePicker.vue
│           │   ├── TimeSlotPicker.vue
│           │   ├── CustomerSearch.vue
│           │   ├── ParticipantSelect.vue
│           │   └── StatusBadge.vue
│           └── shared/
│               ├── LoadingSpinner.vue
│               ├── EmptyState.vue
│               └── ErrorState.vue
│
├── meeting_manager/                       # EXISTING Python package
│   ├── hooks.py                           # MODIFY: add SPA route + app screen
│   ├── public/desk/                       # NEW: build output (auto-generated)
│   └── www/
│       └── meeting-manager/               # NEW: SPA host
│           ├── __init__.py
│           └── index.py                   # Boot data provider
```

---

## Route Structure

| Vue Route | Page Component | Replaces | Min Role |
|---|---|---|---|
| `/` | Redirect → `/calendar` | — | member |
| `/dashboard` | Dashboard.vue | mm-manage-meetings | leader |
| `/calendar` | EnhancedCalendar.vue | mm-enhanced-calendar | member |
| `/bookings` | BookingsList.vue | (new list view) | member |
| `/bookings/:id` | BookingDetail.vue | mm-meeting-view | member |
| `/book` | SelfBookMeeting.vue | mm-self-book-meeting | member |
| `/book/team` | TeamMeeting.vue | mm-team-meeting | leader |
| `/my-settings` | MySettings.vue | (Desk form) | member |
| `/my-availability` | MyAvailability.vue | (Desk form) | member |
| `/my-blocked-slots` | MyBlockedSlots.vue | (Desk form) | member |
| `/team-settings` | TeamSettings.vue | (new, read team) | leader |
| `/meeting-types` | MeetingTypes.vue | (Desk list) | leader |
| `/meeting-types/:id` | MeetingTypeDetail.vue | (Desk form) | leader |
| `/email-templates` | EmailTemplates.vue | (Desk list) | leader (RO) / SM (RW) |
| `/admin/departments` | Departments.vue | (Desk list) | SM |
| `/admin/departments/:id` | DepartmentDetail.vue | (Desk form) | SM |
| `/admin/oauth-settings` | OAuthSettings.vue | (Desk form) | SM |

**Router guard**: Every route has `meta.minRole`. The `beforeEach` guard calls `auth.initialize()` once (which fetches `get_user_context()`), then checks `auth.hasMinRole(route.meta.minRole)`.

---

## Navigation Sidebar (Role-Adaptive)

**System Manager sees all sections. Department Leader sees Main + Management + Personal. Department Member sees Main + Personal.**

```
MAIN
  Dashboard          (leader+)
  Calendar           (all)
  Bookings           (all)
  Book Meeting       (all)
  Team Meeting       (leader+)

MANAGEMENT
  Meeting Types      (leader+)
  Email Templates    (leader+ RO, SM RW)
  Team Settings      (leader+)
  Departments        (SM)
  OAuth Settings     (SM)

PERSONAL
  My Settings        (all)
  My Availability    (all)
  My Blocked Slots   (all)
```

---

## Permission Model (Frontend)

**Principle: Trust the backend.** All 40+ API endpoints already enforce permissions server-side. The frontend permission layer is purely UX (hide buttons, redirect routes).

### Auth Store (`stores/auth.ts`)
- Calls existing `get_user_context()` API on init (returns role level, accessible departments, permissions)
- Exposes: `isSystemManager`, `isDepartmentLeader`, `isDepartmentMember`
- Exposes: `accessibleDepartments`, `ledDepartments`, `hasMinRole(role)`
- Exposes: `canAccessDepartment(dept)`, `leadsDepartment(dept)`

### Permission Composable (`composables/usePermissions.ts`)
- `canEditBooking(booking)` — SM always, leader if team booking, member if own
- `canReassign` — leader+ only
- `canManageMeetingTypes(dept)` — SM or leads dept
- `canEditUserSettings(targetUser)` — SM or self only
- `canReadUserSettings(targetUser)` — SM, self, or leader reading team member

### Admin DocType Pages
For CRUD pages (Departments, Meeting Types, Email Templates, etc.), use `createListResource` and `createDocumentResource` from frappe-ui. These automatically go through Frappe's `permission_query_conditions` and `has_permission` hooks, so the backend filters results by role.

---

## Key Dependencies (`desk/package.json`)

| Package | Version | Purpose |
|---|---|---|
| vue | ^3.5.14 | Framework |
| vue-router | ^4.2.2 | SPA routing |
| pinia | ^2.0.33 | State management |
| frappe-ui | 0.1.192 | Components + API layer |
| @fullcalendar/vue3 | ^6.1.10 | Calendar Vue adapter |
| @fullcalendar/resource-timeline | ^6.1.10 | Timeline view |
| @fullcalendar/resource-timegrid | ^6.1.10 | Time grid view |
| @fullcalendar/interaction | ^6.1.10 | Drag-drop |
| @fullcalendar/daygrid | ^6.1.10 | Month view |
| tailwindcss | ^3.4.15 | Styling |
| socket.io-client | ^4.7.2 | Real-time updates |
| @headlessui/vue | ^1.7.22 | Accessible UI primitives |

FullCalendar Scheduler is free for GPL projects (same license key as current: `'GPL-My-Project-Is-Open-Source'`).

---

## Backend Changes (Minimal)

### `hooks.py` — Add 2 entries:

```python
# Add to website_route_rules (AFTER existing meeting-booking routes):
{"from_route": "/meeting-manager/<path:app_path>", "to_route": "meeting-manager"},

# Add/update add_to_apps_screen:
add_to_apps_screen = [{
    "name": "meeting_manager",
    "logo": "/assets/meeting_manager/desk/favicon.svg",
    "title": "Meeting Manager",
    "route": "/meeting-manager",
    "has_permission": "meeting_manager.meeting_manager.utils.permissions.has_app_permission",
}]
```

### `www/meeting-manager/index.py` — New file (boot data):

```python
import frappe

no_cache = 1

def get_context(context):
    frappe.db.commit()
    context.boot = get_boot()
    return context

@frappe.whitelist(methods=["POST"], allow_guest=True)
def get_context_for_dev():
    if not frappe.conf.developer_mode:
        frappe.throw("This method is only for developer mode")
    return get_boot()

def get_boot():
    return frappe._dict({
        "default_route": "/meeting-manager",
        "site_name": frappe.local.site,
        "csrf_token": frappe.sessions.get_csrf_token(),
        "session_user": frappe.session.user,
    })
```

### `permissions.py` — Add 1 function:

```python
def has_app_permission():
    """Check if user can see Meeting Manager in app switcher."""
    user = frappe.session.user
    if user == "Administrator":
        return True
    roles = frappe.get_roles(user)
    return bool({"System Manager", "MM Department Leader", "MM Department Member"} & set(roles))
```

---

## API Mapping (All Existing — No New Endpoints)

| Vue Page | API Endpoints Used |
|---|---|
| EnhancedCalendar | `mm_enhanced_calendar.api.*` (16 endpoints: get_user_context, get_calendar_resources, get_calendar_events, update_calendar_booking, create_slot_booking, get/create/delete_blocked_slot, get_booking_details, get_filter_options, etc.) |
| BookingsList | `createListResource("MM Meeting Booking")` (auto-filtered by backend) |
| BookingDetail | `mm_enhanced_calendar.api.get_booking_details` |
| SelfBookMeeting | `booking.get_user_departments`, `booking.get_department_meeting_types_for_self_booking`, `booking.get_user_available_dates/slots`, `booking.search_customers`, `booking.create_self_booking` |
| TeamMeeting | `booking.get_led_departments`, `booking.get_department_members`, `booking.get_internal_meeting_types`, `booking.get_team_available_dates/slots`, `booking.create_team_meeting` |
| Dashboard | `mm_manage_meetings.api.get_meetings`, `booking.update_booking_status` |
| Departments | `createListResource("MM Department")`, `createDocumentResource("MM Department", name)` |
| MeetingTypes | `createListResource("MM Meeting Type")`, `createDocumentResource(...)` |
| EmailTemplates | `createListResource("MM Email Template")`, `createDocumentResource(...)` |
| MySettings | `createDocumentResource("MM User Settings", ...)` |
| MyAvailability | `createListResource("MM User Availability Rule")` |
| MyBlockedSlots | `createListResource("MM User Blocked Slot")` |
| OAuthSettings | `createDocumentResource("MM OAuth Settings", ...)` |
| CalendarIntegration | `oauth_callbacks.get_google_oauth_url`, `oauth_callbacks.get_outlook_oauth_url` |

---

## Implementation Phases

### Phase 0: Scaffold (creates the skeleton, proves SPA loads)
- Create `desk/` with all config files (vite.config.js, tailwind, postcss, tsconfig, package.json)
- Create root `package.json` workspace
- Create `meeting_manager/www/meeting-manager/` with `__init__.py` and `index.py`
- Create minimal `main.js`, `App.vue`, `router/index.ts`, `index.css`
- Update `hooks.py` with SPA route + `add_to_apps_screen`
- Add `has_app_permission()` to permissions.py
- `yarn install` + `yarn build` + verify `/meeting-manager/` loads

### Phase 1: Auth + Layout + Navigation
- Build `stores/auth.ts` (calls `get_user_context`, exposes role checks)
- Build `composables/usePermissions.ts` and `useNavigation.ts`
- Build `AppLayout.vue` with role-adaptive sidebar
- Build shared components: LoadingSpinner, EmptyState, ErrorState, StatusBadge
- Router guard with `minRole` meta

### Phase 2: Simple Pages First (BookingsList + BookingDetail + Dashboard)
- `BookingsList.vue` — `createListResource("MM Meeting Booking")` with filters
- `BookingDetail.vue` — card layout ported from mm_meeting_view.js
- `Dashboard.vue` — stats cards + recent bookings (port from mm_manage_meetings React)
- These prove the API integration pattern works

### Phase 3: Booking Wizards (SelfBook + TeamMeeting)
- Build reusable wizard components: StepProgress, DepartmentSelect, MeetingTypeSelect, DatePicker, TimeSlotPicker, CustomerSearch
- `SelfBookMeeting.vue` — 5-step wizard (port from mm_self_book_meeting.js)
- `TeamMeeting.vue` — 6-step wizard with ParticipantSelect (port from mm_team_meeting.js)

### Phase 4: Enhanced Calendar (most complex page)
- Install FullCalendar Vue packages
- `CalendarTimeline.vue` — wraps `<FullCalendar>` with reactive options
- Port from mm_enhanced_calendar.js (4,549 lines):
  - Resource timeline + time grid views with orientation toggle
  - Department/status/service/meeting-type filter panel
  - Drag-drop event move + resize
  - Click-to-book creation modal
  - Blocked slot management
  - Calendar integration OAuth button
- `stores/calendar.ts` for filter/view state

### Phase 5: Admin & Settings Pages
- `Departments.vue` + `DepartmentDetail.vue` — CRUD with member management
- `MeetingTypes.vue` + `MeetingTypeDetail.vue` — CRUD with reminder config
- `EmailTemplates.vue` — list (leader RO) + edit (SM)
- `OAuthSettings.vue` — singleton config (SM only)
- `MySettings.vue` — user profile + working hours JSON editor
- `MyAvailability.vue` — availability rules CRUD
- `MyBlockedSlots.vue` — blocked slots CRUD
- `TeamSettings.vue` — read-only view of team members' settings (leaders)

### Phase 6: Polish + Cutover
- Real-time updates via Socket.io (booking status changes)
- Test all flows end-to-end per role
- Optionally remove old desk page fixtures from hooks.py

---

## Verification

1. **SPA loads**: `/meeting-manager/` renders the Vue app with sidebar
2. **Auth guard**: Guest user redirected to `/login?redirect-to=/meeting-manager/...`
3. **Role filtering**: Member sees only Main + Personal nav items; Leader sees Management; SM sees all
4. **Calendar**: Events load, drag-drop works, filters work, blocked slots work
5. **Booking wizards**: Self-book and team meeting complete successfully
6. **Admin CRUD**: Create/edit/delete departments, meeting types, email templates
7. **Settings**: Edit own settings/availability/blocked slots; leader reads team settings
8. **Permission enforcement**: Member cannot navigate to `/admin/departments`; API calls that bypass frontend are still blocked by backend
9. **App switcher**: Meeting Manager icon appears in Frappe sidebar, opens `/meeting-manager/`
10. **Coexistence**: Old desk pages still work at `/app/mm-*` during transition; public booking at `/meeting-booking` unaffected

---

## Critical Files

| File | Action |
|---|---|
| `hooks.py` | Add SPA route rule + add_to_apps_screen |
| `utils/permissions.py` | Add `has_app_permission()` |
| `www/meeting-manager/index.py` | NEW: boot data provider |
| `www/meeting-manager/__init__.py` | NEW: empty |
| `page/mm_enhanced_calendar/api.py` | READ: 16 endpoints to call from Vue |
| `api/booking.py` | READ: 17 endpoints to call from Vue |
| `page/mm_enhanced_calendar/mm_enhanced_calendar.js` | READ: 4,549 lines to port to Vue |
| `page/mm_self_book_meeting/mm_self_book_meeting.js` | READ: ~2,000 lines to port |
| `page/mm_team_meeting/mm_team_meeting.js` | READ: ~2,000 lines to port |
| `page/mm_meeting_view/mm_meeting_view.js` | READ: 571 lines to port |
| `helpdesk/desk/*` | REFERENCE: exact pattern to follow for all config files |
