# Plan: Replace MM Customer with Frappe Contact Doctype

## Context
The MM Customer doctype (+ MM Customer Email, MM Customer Phone child tables) duplicates Frappe's built-in Contact doctype. ERPNext and Helpdesk are also on this bench and use Contact. No existing MM Customer data needs migration — this is a clean cutover.

## Decisions
- Add Custom Fields on Contact for MM-specific data (prefixed `mm_`)
- Permission hooks scoped by MM roles (passthrough for non-MM users to avoid breaking ERPNext/Helpdesk)
- Keep API response keys stable (`customer_name`, `primary_email`) to minimize JS changes

## Field Mapping

| MM Customer | Contact | Notes |
|---|---|---|
| `customer_name` | `first_name` → auto `full_name` | Put full name in first_name |
| `primary_email` | `email_id` (auto from email_ids) | Set is_primary on child row |
| `company_name` | `company_name` | Already exists |
| `email_addresses` (MM Customer Email) | `email_ids` (Contact Email) | `email_address` → `email_id` |
| `phone_numbers` (MM Customer Phone) | `phone_nos` (Contact Phone) | `phone_number` → `phone`, `is_primary` → `is_primary_phone` |
| `is_active` | **Custom Field** `mm_is_active` | Check, default 1 |
| `cvr_number` | **Custom Field** `mm_cvr_number` | Data |
| `customer_notes` | **Custom Field** `mm_customer_notes` | Text |
| `total_bookings` | **Custom Field** `mm_total_bookings` | Int, read_only |
| `last_booking_date` | **Custom Field** `mm_last_booking_date` | Date, read_only |

---

## Implementation Steps

### Step 1: Custom Fields on Contact
**Files:**
- `meeting_manager/meeting_manager/setup.py` — add `create_contact_custom_fields()` using `frappe.custom_field.create_custom_fields()` or manual doc creation
- `meeting_manager/hooks.py` — add Custom Field fixture export

Create 5 custom fields prefixed `mm_`: `mm_is_active`, `mm_cvr_number`, `mm_customer_notes`, `mm_total_bookings`, `mm_last_booking_date`.

### Step 2: Update MM Meeting Booking Link field
**File:** `meeting_manager/meeting_manager/doctype/mm_meeting_booking/mm_meeting_booking.json`
- Change `customer` field `"options": "MM Customer"` → `"options": "Contact"`

### Step 3: Rewrite customer_service.py
**File:** `meeting_manager/meeting_manager/services/customer_service.py`
- `find_or_create_customer()` — search Contact.email_id, then Contact Email child, then Contact Phone child; create Contact doc
- `get_customer_by_email()` — query `tabContact` and `tabContact Email`
- `get_customer_by_phone()` — query `tabContact Phone` (field: `phone`)
- `update_customer_booking_stats()` — set `mm_total_bookings` and `mm_last_booking_date` via `frappe.db.set_value("Contact", ...)`
- `get_customer_bookings()` — change exists check to Contact

### Step 4: Update MM Meeting Booking controller
**File:** `meeting_manager/meeting_manager/doctype/mm_meeting_booking/mm_meeting_booking.py`
- `validate_customer_details()`: `frappe.get_doc("Contact", ...)`, map `primary_email` → `email_id`, `phone_numbers` → `phone_nos`, `phone.phone_number` → `phone.phone`, `phone.is_primary` → `phone.is_primary_phone`
- Remove `get_primary_phone()` call — inline iteration of `phone_nos`

### Step 5: Update API modules
**File:** `meeting_manager/meeting_manager/api/public.py`
- Verify it delegates to customer_service (likely no direct changes needed after Step 3)

**File:** `meeting_manager/meeting_manager/api/booking.py` (heavy changes)
- Replace all `frappe.get_doc("MM Customer", ...)` → `frappe.get_doc("Contact", ...)`
- Replace `MMCustomer.find_by_email()` → `customer_service.get_customer_by_email()`
- SQL: `tabMM Customer` → `tabContact`, `c.customer_name` → `c.full_name` (or `CONCAT(c.first_name, ' ', IFNULL(c.last_name, ''))`), `c.primary_email` → `c.email_id`
- SQL: `tabMM Customer Email` → `tabContact Email` (`email_address` → `email_id`)
- SQL: `tabMM Customer Phone` → `tabContact Phone` (`phone_number` → `phone`)
- Custom fields: `c.cvr_number` → `c.mm_cvr_number`, `c.total_bookings` → `c.mm_total_bookings`, etc.
- Customer creation: build Contact doc instead of MM Customer

**File:** `meeting_manager/meeting_manager/page/mm_enhanced_calendar/api.py` (heavy changes)
- Same pattern as booking.py: all MM Customer references → Contact
- `get_booking_details()`: return `full_name` as `customer_name` key (stable API response)

### Step 6: Update permissions (scoped by MM roles)
**File:** `meeting_manager/meeting_manager/utils/permissions.py`
- Rename `get_mm_customer_permission_query_conditions` → `get_contact_permission_query_conditions`
- Rename `has_mm_customer_permission` → `has_contact_permission`
- **Critical**: At the top of each function, check if user has MM roles. If no MM roles, return `""` / `True` (passthrough — don't restrict ERPNext/Helpdesk users)
- Update SQL: `tabMM Customer` → `tabContact`

**File:** `meeting_manager/hooks.py`
- Remove `"MM Customer"` from `permission_query_conditions` and `has_permission`
- Add `"Contact"` entries pointing to renamed functions

### Step 7: Update email notifications
**File:** `meeting_manager/meeting_manager/utils/email_notifications.py`
- `frappe.get_doc("Contact", booking.customer)` instead of MM Customer
- `customer.full_name` instead of `customer.customer_name`
- `customer.email_id` instead of `customer.primary_email`
- Inline primary phone lookup from `customer.phone_nos`

**File:** `meeting_manager/meeting_manager/doctype/mm_email_template/mm_email_template.py`
- Update template variable injection to pull from Contact fields

### Step 8: Update JavaScript files
**File:** `meeting_manager/meeting_manager/doctype/mm_meeting_booking/mm_meeting_booking.js`
- `'MM Customer'` → `'Contact'`, `'primary_email'` → `'email_id'`

**File:** `meeting_manager/meeting_manager/page/mm_meeting_view/mm_meeting_view.js`
- Link URL: `/app/mm-customer/` → `/app/contact/`
- Field refs only if API response keys change (minimize by keeping stable keys in Step 5)

**Files (3 calendar variants):**
- `mm_enhanced_calendar.js` — `options: 'MM Customer'` → `options: 'Contact'`
- `mm_enhanced_calendar_native.js` — same
- `mm_enhanced_calendar_like_bifrost.js` — same

**File:** `meeting_manager/meeting_manager/page/mm_self_book_meeting/mm_self_book_meeting.js`
- Update any MM Customer references

### Step 9: Delete MM Customer doctypes
**Delete directories:**
- `meeting_manager/meeting_manager/doctype/mm_customer/`
- `meeting_manager/meeting_manager/doctype/mm_customer_email/`
- `meeting_manager/meeting_manager/doctype/mm_customer_phone/`

**Delete or no-op:** `meeting_manager/meeting_manager/patches/migrate_customers.py`
- Leave entry in patches.txt (Frappe tracks executed patches), but file can become no-op or be deleted

### Step 10: Run bench migrate
```bash
cd ~/Documents/FRAPPER_PROJECTS/bestsecurity-bench
bench --site bestsecurity.local migrate
```

---

## Verification

1. **Custom fields visible**: Open `/app/contact/new` and verify mm_cvr_number, mm_is_active, mm_customer_notes, mm_total_bookings, mm_last_booking_date appear
2. **Public booking flow**: Go to `/meeting-booking`, complete a booking with customer details → verify Contact record created with correct email/phone child tables
3. **Internal booking**: Create booking via enhanced calendar or self-book page → verify Contact link works
4. **Permissions**:
   - As MM Department Member: verify only Contacts linked to own bookings are visible
   - As non-MM user: verify full Contact access (ERPNext/Helpdesk unaffected)
5. **Email notifications**: Create a booking and verify confirmation email sends with correct customer name/email
6. **Enhanced calendar**: Open calendar, click a booking → verify customer card shows correctly with link to `/app/contact/`
7. **bench migrate**: Runs without errors
