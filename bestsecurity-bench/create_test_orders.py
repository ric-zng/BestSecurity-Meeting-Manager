#!/usr/bin/env python3
"""
Create test orders for customers via Frappe console
"""

import os
os.chdir('/Users/justus/Desktop/projects/zng/test/bestsecurity-bench')

import frappe
from datetime import datetime, timedelta
import random

frappe.init(site='localhost')
frappe.connect()
frappe.set_user('Administrator')

print("\n🛒 Creating test sales orders...\n")

# Get customers
customers = frappe.db.sql("""
    SELECT name, customer_name, email_id
    FROM `tabCustomer`
    WHERE disabled = 0
    AND email_id IN ('john.smith@email.com', 'sarah.j@company.com', 'mchen@techcorp.com')
    LIMIT 3
""", as_dict=True)

# Get items
items = frappe.db.sql("""
    SELECT item_code, item_name, standard_rate
    FROM `tabItem`
    WHERE item_code IN ('LAPTOP-TEST', 'MOUSE-TEST', 'MONITOR-TEST')
""", as_dict=True)

if not customers:
    print("❌ No customers found!")
    frappe.db.close()
    exit()

if not items:
    print("❌ No items found!")
    frappe.db.close()
    exit()

orders_created = 0

for customer in customers:
    num_orders = random.randint(2, 4)
    print(f"Creating {num_orders} orders for {customer.customer_name}...")

    for i in range(num_orders):
        try:
            # Generate order date
            days_ago = random.randint(1, 120)
            order_date = datetime.now() - timedelta(days=days_ago)
            delivery_date = order_date + timedelta(days=7)

            # Format dates as YYYY-MM-DD
            order_date_str = order_date.strftime("%Y-%m-%d")
            delivery_date_str = delivery_date.strftime("%Y-%m-%d")

            # Create order
            order = frappe.get_doc({
                "doctype": "Sales Order",
                "customer": customer.name,
                "transaction_date": order_date_str,
                "delivery_date": delivery_date_str,
                "contact_email": customer.email_id,
            })

            # Add 1-2 items randomly
            selected_items = random.sample(items, min(2, len(items)))
            for item in selected_items:
                order.append("items", {
                    "item_code": item.item_code,
                    "item_name": item.item_name,
                    "qty": random.randint(1, 3),
                    "rate": item.standard_rate,
                    "delivery_date": delivery_date_str,
                })

            # Save and submit
            order.insert(ignore_permissions=True)
            order.submit()

            print(f"  ✓ Created order {order.name}")
            orders_created += 1

        except Exception as e:
            print(f"  ✗ Failed to create order: {str(e)}")
            continue

frappe.db.commit()
print(f"\n✅ Created {orders_created} orders total!\n")
frappe.db.close()
