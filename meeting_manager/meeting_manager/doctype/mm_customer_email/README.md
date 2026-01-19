# MM Customer Email - Child Table Documentation

## Overview

**MM Customer Email** is a child table DocType that stores multiple email addresses for a single customer. Each MM Customer record can have multiple email addresses with different types (Primary, Work, Personal).

**Parent DocType**: MM Customer

**Type**: Child Table (`istable: 1`)

---

## Purpose

This child table enables:

1. **Multiple Emails Per Customer**: Customers can have work email, personal email, etc.
2. **Primary Designation**: One email marked as primary for main communication
3. **Email Type Classification**: Categorize emails by purpose (Work, Personal)
4. **Customer Lookup**: System can find customers by any of their email addresses

---

## Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email_address` | Data (Email) | Yes | The email address |
| `email_type` | Select | No | Type: Primary, Work, Personal (default: Primary) |
| `is_primary` | Check | No | Is this the primary email for this customer |

### Email Type Options

- **Primary**: Main email address (usually first added)
- **Work**: Business/work email address
- **Personal**: Personal email address

---

## Validation Rules

### 1. Email Format Validation

The `mm_customer_email.py` controller validates email format:

```python
email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
```

**Error Message**: `"Invalid email format: '{email}'"`

### 2. Duplicate Prevention

The parent MM Customer validates no duplicate emails exist in the child table.

### 3. Single Primary Enforcement

The parent MM Customer ensures only one email is marked as primary:
- If no email is marked primary, the first one becomes primary
- If multiple are marked, only the first is kept as primary

---

## Usage Examples

### Adding Email to Customer

```python
import frappe

customer = frappe.get_doc("MM Customer", "MC-0042")

# Add a new work email
customer.append("email_addresses", {
    "email_address": "john.doe@company.com",
    "email_type": "Work",
    "is_primary": 0
})

customer.save()
```

### Finding Customer by Email

The system searches this child table when looking up customers by email:

```python
# SQL query used by find_by_email()
result = frappe.db.sql("""
    SELECT parent FROM `tabMM Customer Email`
    WHERE LOWER(email_address) = %s
    LIMIT 1
""", (email_lower,), as_dict=True)
```

---

## Integration with Customer Lookup

During public booking, the customer service checks:

1. First: `primary_email` field on MM Customer
2. Then: `email_address` in this child table

If a match is found in the child table, the parent customer is returned.

---

## See Also

- [MM Customer](../mm_customer/README.md) - Parent customer doctype
- [MM Customer Phone](../mm_customer_phone/README.md) - Phone numbers child table

---

**Last Updated**: 2026-01-13
**Version**: 1.0
**Maintainer**: Best Security Development Team
