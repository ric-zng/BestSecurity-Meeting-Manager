# MM Customer Phone - Child Table Documentation

## Overview

**MM Customer Phone** is a child table DocType that stores multiple phone numbers for a single customer. Each MM Customer record can have multiple phone numbers with different types (Mobile, Work, Home).

**Parent DocType**: MM Customer

**Type**: Child Table (`istable: 1`)

---

## Purpose

This child table enables:

1. **Multiple Phones Per Customer**: Customers can have mobile, work phone, home phone, etc.
2. **Primary Designation**: One phone marked as primary for main contact
3. **Phone Type Classification**: Categorize phones by purpose (Mobile, Work, Home)
4. **Customer Lookup**: System can find customers by any of their phone numbers

---

## Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone_number` | Data (Phone) | Yes | The phone number |
| `phone_type` | Select | No | Type: Mobile, Work, Home (default: Mobile) |
| `is_primary` | Check | No | Is this the primary phone for this customer |

### Phone Type Options

- **Mobile**: Mobile/cell phone number
- **Work**: Business/office phone number
- **Home**: Home/landline phone number

---

## Validation Rules

### 1. Phone Format Validation

The `mm_customer_phone.py` controller validates phone format:

```python
# Strip formatting characters and validate
phone_digits = re.sub(r'[\s\-\(\)\+]', '', self.phone_number)
if not phone_digits.isdigit() or len(phone_digits) < 7:
    frappe.throw(f"Invalid phone number format: '{self.phone_number}'")
```

**Valid Examples**:
- `+1-555-123-4567`
- `(555) 123-4567`
- `555.123.4567`
- `+44 20 7123 4567`

**Invalid Examples**:
- `123-456` (less than 7 digits)
- `call me` (not numeric)

**Error Message**: `"Invalid phone number format: '{phone}'"`

### 2. Duplicate Prevention

The parent MM Customer validates no duplicate phones exist in the child table. Phone comparison ignores formatting characters.

### 3. Single Primary Enforcement

The parent MM Customer ensures only one phone is marked as primary:
- If no phone is marked primary, the first one becomes primary
- If multiple are marked, only the first is kept as primary

---

## Usage Examples

### Adding Phone to Customer

```python
import frappe

customer = frappe.get_doc("MM Customer", "MC-0042")

# Add a work phone
customer.append("phone_numbers", {
    "phone_number": "+1-555-987-6543",
    "phone_type": "Work",
    "is_primary": 0
})

customer.save()
```

### Getting Primary Phone

```python
customer = frappe.get_doc("MM Customer", "MC-0042")

primary_phone = customer.get_primary_phone()
# Returns the primary phone number, or first phone if no primary set
```

### Finding Customer by Phone

The system searches this child table when looking up customers by phone:

```python
# SQL query used by find_by_phone()
# Normalizes phone by removing formatting characters before comparison
result = frappe.db.sql("""
    SELECT parent FROM `tabMM Customer Phone`
    WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone_number, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = %s
    LIMIT 1
""", (phone_digits,), as_dict=True)
```

---

## Integration with Customer Lookup

During public booking, the customer service uses phone as a secondary lookup:

1. First: Searches by email (primary identifier)
2. If email not found: Searches by phone in this child table
3. If phone matches: Uses that customer and adds the new email to their record

This approach handles the case where a customer books with a new email but the same phone number.

---

## Integration with MM Meeting Booking

When a booking is created:

1. The customer's primary phone is retrieved using `get_primary_phone()`
2. This value is cached in `customer_phone_at_booking` on the booking record
3. This preserves the phone used at booking time, even if customer updates their phone later

---

## See Also

- [MM Customer](../mm_customer/README.md) - Parent customer doctype
- [MM Customer Email](../mm_customer_email/README.md) - Email addresses child table

---

**Last Updated**: 2026-01-13
**Version**: 1.0
**Maintainer**: Best Security Development Team
