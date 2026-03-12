# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

"""
Migration Patch: Previously migrated embedded customer data to MM Customer doctype.
MM Customer has been replaced by Frappe's built-in Contact doctype.
This patch is now a no-op (kept for patch registry compatibility).
"""


def execute():
	pass
