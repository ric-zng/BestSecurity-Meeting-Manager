# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class MMOAuthSettings(Document):
	def validate(self):
		"""Validate OAuth settings before saving"""
		self.validate_outlook_settings()

	def validate_outlook_settings(self):
		"""Ensure Outlook OAuth credentials are provided if enabled"""
		if self.enable_outlook:
			if not self.outlook_client_id or not self.outlook_client_id.strip():
				frappe.throw(_("Outlook Client ID is mandatory when Outlook integration is enabled"))

			if not self.outlook_client_secret:
				frappe.throw(_("Outlook Client Secret is mandatory when Outlook integration is enabled"))

			if not self.outlook_tenant_id or not self.outlook_tenant_id.strip():
				frappe.throw(_("Outlook Tenant ID is mandatory when Outlook integration is enabled"))
