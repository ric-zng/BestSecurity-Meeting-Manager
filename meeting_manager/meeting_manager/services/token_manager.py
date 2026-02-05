# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

"""
Token Manager Service
Handles OAuth token refresh and validation for calendar integrations
"""

import frappe
from frappe.utils import now_datetime, add_to_date


def should_refresh_token(integration):
	"""
	Check if token needs refresh (<1 hour remaining)

	Args:
		integration: MM Calendar Integration document

	Returns:
		bool: True if token should be refreshed
	"""
	if not integration.token_expiry:
		return True

	time_remaining = integration.token_expiry - now_datetime()
	return time_remaining.total_seconds() < 3600  # 1 hour


def update_integration_tokens(integration_id, access_token, refresh_token, expires_in):
	"""
	Update tokens in MM Calendar Integration

	Args:
		integration_id (str): Name of MM Calendar Integration
		access_token (str): New access token
		refresh_token (str): New refresh token (optional)
		expires_in (int): Token lifetime in seconds
	"""
	integration = frappe.get_doc("MM Calendar Integration", integration_id)

	integration.access_token = access_token
	if refresh_token:
		integration.refresh_token = refresh_token

	integration.token_expiry = add_to_date(now_datetime(), seconds=expires_in)
	integration.save(ignore_permissions=True)
	frappe.db.commit()


def validate_token_expiry(integration):
	"""
	Validate that token has not expired

	Args:
		integration: MM Calendar Integration document

	Returns:
		bool: True if token is valid, False if expired
	"""
	if not integration.token_expiry:
		return False

	return integration.token_expiry > now_datetime()
