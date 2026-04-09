#!/usr/bin/env python3
import os
os.chdir('/Users/justus/Desktop/projects/zng/test/bestsecurity-bench')

import frappe
from datetime import datetime, timedelta
import random

frappe.init(site='localhost')
frappe.connect()
frappe.set_user('Administrator')

# Get John Smith
john = frappe.get_doc("Customer", {"email_id": "john.smith@email.com"})
sarah = frappe.get_doc("Customer", {"email_id": "sarah.j@company.com"})
michael = frappe.get_doc("Customer", {"email_id": "mchen@techcorp.com"})

customers = [john, sarah, michael]
items = ["LAPTOP-TEST", "MOUSE-TEST", "MONITOR-TEST"]

print("Creating orders...\n")

total = 0
for customer in customers:
    print(f"Creating 10 orders for {customer.customer_name}...")
    for i in range(10):
        try:
            days_ago = random.randint(10, 200)
            order_date = datetime.now() - timedelta(days=days_ago)

            order = frappe.get_doc({
                "doctype": "Sales Order",
                "customer": customer.name,
                "transaction_date": order_date.strftime("%Y-%m-%d"),
                "delivery_date": (order_date + timedelta(days=7)).strftime("%Y-%m-%d"),
            })

            for item_code in random.sample(items, random.randint(1, 2)):
                rate = frappe.db.get_value("Item", item_code, "standard_rate")
                order.append("items", {
                    "item_code": item_code,
                    "qty": random.randint(1, 2),
                    "rate": rate,
                    "delivery_date": (order_date + timedelta(days=7)).strftime("%Y-%m-%d"),
                })

            order.insert(ignore_permissions=True)
            order.submit()
            total += 1
            print(f"  ✓ {order.name}")
        except Exception as e:
            print(f"  ✗ Error: {e}")

frappe.db.commit()

print(f"\n✅ Created {total} orders!")

# Show summary
for customer in customers:
    count = frappe.db.count("Sales Order", {"customer": customer.name, "docstatus": 1})
    print(f"  {customer.customer_name}: {count} orders")

frappe.db.close()
