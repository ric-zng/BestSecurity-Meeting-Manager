# MM Customer - DocType Documentation

## Overview

**MM Customer** is the central DocType for managing customer records in the Meeting Manager system. It replaces the previously embedded customer data in MM Meeting Booking with a separate, reusable entity that enables customer deduplication, multiple contact methods per customer, and booking history tracking.

**Auto-naming Format**: `MC-{####}`

Example: `MC-0001`, `MC-0042`

## Business Context

### Why Separate Customer Management?

Previously, customer data (name, email, phone) was stored inline within each MM Meeting Booking record. This approach had several limitations:

1. **No Deduplication**: The same customer booking multiple times would create duplicate data
2. **No Booking History**: Couldn't easily see all bookings for a specific customer
3. **No Multiple Contacts**: Each customer could only have one email and one phone per booking
4. **Data Inconsistency**: Customer updating their contact info wouldn't reflect in past bookings

The new Customer Management System solves these problems by:

1. **Automatic Deduplication**: When a customer books, the system first checks if they already exist (by email, then by phone)
2. **Centralized Customer Records**: One customer record linked to all their bookings
3. **Multiple Contact Methods**: Customers can have multiple email addresses and phone numbers
4. **Audit Trail**: Cached fields in bookings preserve contact info at booking time

---

## Key Features

### 1. **Customer Identification**
- **Primary Email**: Unique identifier used for customer lookup (required, unique)
- **Customer Name**: Full name for display and communication

### 2. **Multiple Contact Methods**
- **Email Addresses**: Child table allowing multiple emails per customer
- **Phone Numbers**: Child table allowing multiple phones per customer
- **Primary Designation**: One email and one phone can be marked as "primary"

### 3. **Booking Statistics**
- **Total Bookings**: Auto-calculated count of all bookings for this customer
- **Last Booking Date**: Date of the most recent booking

### 4. **Customer Lookup**
Static helper methods for finding customers:
- `find_by_email(email)`: Search by email (primary_email and child table)
- `find_by_phone(phone)`: Search by phone number (child table)

---

## Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customer_name` | Data | Yes | Customer's full name |
| `primary_email` | Data (Email) | Yes | Primary email address (unique, used for identification) |
| `is_active` | Check | No | Whether customer is active (default: 1) |
| `email_addresses` | Table (MM Customer Email) | No | List of all email addresses |
| `phone_numbers` | Table (MM Customer Phone) | No | List of all phone numbers |
| `customer_notes` | Text | No | General notes about the customer |
| `total_bookings` | Int | Auto | Total number of bookings (read-only) |
| `last_booking_date` | Date | Auto | Date of most recent booking (read-only) |

---

## Child Tables

### MM Customer Email

Stores multiple email addresses per customer.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email_address` | Data (Email) | Yes | Email address |
| `email_type` | Select | No | Type: Primary, Work, Personal (default: Primary) |
| `is_primary` | Check | No | Is this the primary email (only one per customer) |

### MM Customer Phone

Stores multiple phone numbers per customer.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone_number` | Data (Phone) | Yes | Phone number |
| `phone_type` | Select | No | Type: Mobile, Work, Home (default: Mobile) |
| `is_primary` | Check | No | Is this the primary phone (only one per customer) |

---

## Validation Rules

### 1. Customer Name Validation (`validate_customer_name`)
- Customer name must not be empty or whitespace-only
- Name is automatically trimmed

### 2. Primary Email Validation (`validate_primary_email`)
- Primary email is required
- Must match valid email format pattern

### 3. Email Addresses Validation (`validate_email_addresses`)
- No duplicate email addresses allowed in the child table

### 4. Phone Numbers Validation (`validate_phone_numbers`)
- No duplicate phone numbers allowed (comparison ignores formatting)

### 5. Primary Email in List (`ensure_primary_email_in_list`)
- Primary email is automatically added to email_addresses child table if not present

### 6. Single Primary Email (`ensure_single_primary_email`)
- Only one email can be marked as primary
- If none marked, first email becomes primary
- If multiple marked, only first is kept as primary

### 7. Single Primary Phone (`ensure_single_primary_phone`)
- Only one phone can be marked as primary
- Same logic as email primary handling

---

## Customer Lookup Logic

The customer service module (`services/customer_service.py`) provides the `find_or_create_customer()` function used during public booking:

### Lookup Priority (Email takes precedence)

```
1. Search MM Customer by primary_email = submitted_email
   - If found: Use existing customer (DONE)

2. Search MM Customer Email child table by email_address = submitted_email
   - If found: Use parent customer (DONE)

3. If email not found, search MM Customer Phone by phone_number = submitted_phone
   - If found: Use that customer, add new email to their record

4. If no match at all: Create new MM Customer with email + phone

5. Link customer to booking
```

**Key Rule**: Email is the primary identifier. If email matches Customer A but phone matches Customer B, we use Customer A.

---

## Usage Examples

### Example 1: Find or Create Customer (Public Booking)

```python
from meeting_manager.meeting_manager.services.customer_service import find_or_create_customer

# Customer submits booking form with email and phone
result = find_or_create_customer(
    email="john@example.com",
    phone="+1-555-123-4567",
    name="John Doe"
)

print(f"Customer ID: {result['customer_id']}")  # e.g., "MC-0042"
print(f"Was created: {result['created']}")      # True if new, False if existing
print(f"Customer: {result['customer'].customer_name}")
```

### Example 2: Create Customer Manually

```python
import frappe

customer = frappe.get_doc({
    "doctype": "MM Customer",
    "customer_name": "Jane Smith",
    "primary_email": "jane@company.com",
    "email_addresses": [
        {
            "email_address": "jane@company.com",
            "email_type": "Work",
            "is_primary": 1
        },
        {
            "email_address": "jane.personal@gmail.com",
            "email_type": "Personal",
            "is_primary": 0
        }
    ],
    "phone_numbers": [
        {
            "phone_number": "+1-555-987-6543",
            "phone_type": "Mobile",
            "is_primary": 1
        }
    ]
})
customer.insert()
```

### Example 3: Find Customer by Email

```python
from meeting_manager.meeting_manager.doctype.mm_customer.mm_customer import MMCustomer

# Find by email (searches both primary_email and child table)
customer_id = MMCustomer.find_by_email("john@example.com")

if customer_id:
    customer = frappe.get_doc("MM Customer", customer_id)
    print(f"Found customer: {customer.customer_name}")
else:
    print("Customer not found")
```

### Example 4: Get Customer's Booking History

```python
from meeting_manager.meeting_manager.services.customer_service import get_customer_bookings

bookings = get_customer_bookings("MC-0042", limit=10)

for booking in bookings:
    print(f"Booking: {booking['name']} - {booking['meeting_title']} on {booking['start_datetime']}")
```

---

## Integration with MM Meeting Booking

When a customer books through the public interface:

1. **Customer Identification**: System calls `find_or_create_customer()` with submitted details
2. **Booking Creation**: Booking is created with `customer` field linking to MM Customer
3. **Cached Fields**: `customer_email_at_booking` and `customer_phone_at_booking` are populated from customer record
4. **Stats Update**: Customer's `total_bookings` and `last_booking_date` are updated

This preserves an audit trail: even if the customer updates their contact info later, the booking shows what email/phone was used at booking time.

---

## Permissions

| Role | Create | Read | Write | Delete | Notes |
|------|--------|------|-------|--------|-------|
| System Manager | Yes | Yes | Yes | Yes | Full access |

Additional permission configurations can be added based on business requirements.

---

## Database Indexes

Recommended indexes for optimal performance:

```sql
-- Unique index on primary email (already enforced by Frappe unique constraint)
CREATE UNIQUE INDEX idx_primary_email ON `tabMM Customer` (primary_email);

-- Index for customer name search
CREATE INDEX idx_customer_name ON `tabMM Customer` (customer_name);

-- Index for email lookup in child table
CREATE INDEX idx_email_address ON `tabMM Customer Email` (email_address, parent);

-- Index for phone lookup in child table
CREATE INDEX idx_phone_number ON `tabMM Customer Phone` (phone_number, parent);
```

---

## Migration

Existing bookings with inline customer data can be migrated using the provided migration patch:

```bash
bench migrate
```

This runs `meeting_manager.meeting_manager.patches.migrate_customers` which:
1. Finds all bookings with customer_email (external bookings)
2. Groups by email to deduplicate
3. Creates MM Customer records
4. Updates bookings with customer links
5. Populates cached fields

---

## See Also

- [MM Customer Email](../mm_customer_email/README.md) - Email addresses child table
- [MM Customer Phone](../mm_customer_phone/README.md) - Phone numbers child table
- [MM Meeting Booking](../mm_meeting_booking/README.md) - Booking records linked to customers
- [Customer Service](../../services/customer_service.py) - Customer lookup and creation utilities

---

**Last Updated**: 2026-01-13
**Version**: 1.0
**Maintainer**: Best Security Development Team
