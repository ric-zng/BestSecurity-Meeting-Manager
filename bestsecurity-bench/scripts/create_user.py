#!/usr/bin/env python3
import os
import frappe

# Assumes this script is run from the repo root (bench repo), so sites are in ./sites
sites_path = os.path.join(os.getcwd(), "sites")

frappe.init(site='localhost', sites_path=sites_path)
frappe.connect()

try:
    email = 'jb@gmail.com'
    full_name = 'Justus Buyu'
    password = 'Test123'
    role = 'System Manager'

    existing = frappe.db.exists('User', email)
    if existing:
        user = frappe.get_doc('User', existing)
        user.enabled = 1
        user.save(ignore_permissions=True)
        user.add_roles(role)
        # Try to set requested password (via new_password); if it fails password
        # strength validation, fall back to a generated strong password and show it.
        try:
            user.new_password = password
            user.save(ignore_permissions=True)
            print('Updated existing user:', user.name)
        except Exception as e:
            from frappe import exceptions
            if isinstance(e, exceptions.ValidationError):
                import secrets
                import string
                alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+"
                strong = ''.join(secrets.choice(alphabet) for _ in range(20))
                # reload to avoid TimestampMismatchError and set fallback password
                user.reload()
                user.new_password = strong
                user.save(ignore_permissions=True)
                print('Updated existing user (password too weak). Temporary password:', strong)
            else:
                raise
    else:
        user = frappe.get_doc({
            'doctype': 'User',
            'email': email,
            'first_name': full_name,
            'enabled': 1
        })
        user.insert(ignore_permissions=True)
        user.add_roles(role)
        try:
            user.new_password = password
            user.save(ignore_permissions=True)
            print('Created user:', user.name)
        except Exception as e:
            from frappe import exceptions
            if isinstance(e, exceptions.ValidationError):
                import secrets
                import string
                alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+"
                strong = ''.join(secrets.choice(alphabet) for _ in range(20))
                user.reload()
                user.new_password = strong
                user.save(ignore_permissions=True)
                print('Created user (password too weak). Temporary password:', strong)
            else:
                raise

    frappe.db.commit()
finally:
    frappe.destroy()
