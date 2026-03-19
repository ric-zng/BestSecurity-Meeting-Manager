# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

"""
OAuth Callbacks API
Handles OAuth 2.0 redirect callbacks for calendar integrations
"""

import frappe
from frappe import _
from frappe.utils import get_url, now_datetime, add_to_date
import secrets
import json


@frappe.whitelist()
def get_google_oauth_url():
	"""
	Return Google OAuth authorization URL

	Returns:
		dict: Contains 'authorization_url' key
	"""
	# Generate state parameter for CSRF protection
	state = secrets.token_urlsafe(32)
	frappe.cache().set_value(
		f"google_oauth_state_{frappe.session.user}",
		state,
		expires_in_sec=600  # 10 minutes
	)

	# Build redirect URI
	redirect_uri = f"{get_url()}/api/method/meeting_manager.api.oauth_callbacks.google_calendar_callback"

	try:
		from frappe.integrations.google_oauth import GoogleOAuth
		google_oauth = GoogleOAuth()
		auth_url = google_oauth.get_authentication_url({
			'state': state,
			'redirect_uri': redirect_uri,
			'scope': 'https://www.googleapis.com/auth/calendar'
		})

		return {'authorization_url': auth_url.get('url')}

	except Exception as e:
		frappe.log_error(title="Google OAuth URL Error", message=str(e))
		frappe.throw(_("Failed to generate Google OAuth URL. Please ensure Google Settings are configured in your Frappe site (Setup > Integrations > Google Settings)."))


@frappe.whitelist(allow_guest=True, methods=['GET'])
def google_calendar_callback(code=None, state=None, error=None):
	"""
	OAuth callback for Google Calendar — renders HTML page that posts result to opener window
	"""
	# Handle error from Google
	if error:
		frappe.respond_as_web_page(
			"Calendar Connection",
			_render_callback_html(error=f"Google OAuth error: {error}"),
			http_status_code=200,
			fullpage=True
		)
		return

	# Validate state parameter (CSRF protection)
	user = frappe.session.user
	if user == "Guest":
		# Try to find user from state
		frappe.respond_as_web_page(
			"Calendar Connection",
			_render_callback_html(error="Session expired. Please log in and try again."),
			http_status_code=200,
			fullpage=True
		)
		return

	cached_state = frappe.cache().get_value(f"google_oauth_state_{user}")

	if not cached_state or cached_state != state:
		frappe.respond_as_web_page(
			"Calendar Connection",
			_render_callback_html(error="Invalid state parameter (CSRF check failed). Please try again."),
			http_status_code=200,
			fullpage=True
		)
		return

	# Exchange code for tokens
	try:
		redirect_uri = f"{get_url()}/api/method/meeting_manager.api.oauth_callbacks.google_calendar_callback"

		from frappe.integrations.google_oauth import GoogleOAuth
		google_oauth = GoogleOAuth()
		tokens = google_oauth.authorize(code, redirect_uri)

		# Check if user already has a Google Calendar integration
		existing = frappe.db.exists("MM Calendar Integration", {
			"user": user,
			"integration_type": "Google Calendar"
		})

		if existing:
			# Update existing integration with new tokens
			doc = frappe.get_doc("MM Calendar Integration", existing)
			doc.access_token = tokens['access_token']
			doc.refresh_token = tokens.get('refresh_token') or doc.refresh_token
			doc.token_expiry = add_to_date(now_datetime(), seconds=tokens.get('expires_in', 3600))
			doc.is_active = 1
			doc.save(ignore_permissions=True)
			integration_name = doc.name
		else:
			# Create new MM Calendar Integration
			integration = frappe.get_doc({
				'doctype': 'MM Calendar Integration',
				'user': user,
				'integration_type': 'Google Calendar',
				'integration_name': 'Google Calendar',
				'access_token': tokens['access_token'],
				'refresh_token': tokens.get('refresh_token'),
				'token_expiry': add_to_date(now_datetime(), seconds=tokens.get('expires_in', 3600)),
				'is_active': 1,
				'sync_direction': 'One-way (Read Only)',
				'auto_sync_enabled': 1,
				'sync_past_days': 30,
				'sync_future_days': 90,
				'sync_interval_minutes': 10
			})
			integration.insert(ignore_permissions=True)
			integration_name = integration.name

		frappe.db.commit()

		# Clear the state token
		frappe.cache().delete_value(f"google_oauth_state_{user}")

		frappe.respond_as_web_page(
			"Calendar Connection",
			_render_callback_html(success=True, integration_id=integration_name),
			http_status_code=200,
			fullpage=True
		)

	except Exception as e:
		frappe.log_error(title="Google OAuth Callback Error", message=str(e))
		frappe.respond_as_web_page(
			"Calendar Connection",
			_render_callback_html(error="Failed to connect Google Calendar. Please try again."),
			http_status_code=200,
			fullpage=True
		)


# ============================================================================
# Microsoft Outlook Calendar OAuth
# ============================================================================

@frappe.whitelist()
def get_outlook_oauth_url():
	"""
	Return Outlook OAuth authorization URL
	"""
	import msal

	# Check if Outlook integration is enabled
	settings = frappe.get_single("MM OAuth Settings")
	if not settings.enable_outlook:
		frappe.throw(_("Outlook integration is not enabled. Please ask an admin to enable it in OAuth Settings."))

	# Generate state parameter for CSRF protection
	state = secrets.token_urlsafe(32)
	frappe.cache().set_value(
		f"outlook_oauth_state_{frappe.session.user}",
		state,
		expires_in_sec=600
	)

	redirect_uri = f"{get_url()}/api/method/meeting_manager.api.oauth_callbacks.outlook_calendar_callback"

	try:
		client = msal.ConfidentialClientApplication(
			settings.outlook_client_id,
			authority=f"https://login.microsoftonline.com/{settings.outlook_tenant_id}",
			client_credential=settings.get_password("outlook_client_secret")
		)

		auth_url = client.get_authorization_request_url(
			scopes=['Calendars.ReadWrite', 'offline_access'],
			state=state,
			redirect_uri=redirect_uri
		)

		return {'authorization_url': auth_url}

	except Exception as e:
		frappe.log_error(title="Outlook OAuth URL Error", message=str(e))
		frappe.throw(_("Failed to generate Outlook OAuth URL. Please check OAuth Settings."))


@frappe.whitelist(allow_guest=True, methods=['GET'])
def outlook_calendar_callback(code=None, state=None, error=None):
	"""
	OAuth callback for Microsoft Outlook
	"""
	import msal

	if error:
		frappe.respond_as_web_page(
			"Calendar Connection",
			_render_callback_html(error=f"Outlook OAuth error: {error}"),
			http_status_code=200,
			fullpage=True
		)
		return

	user = frappe.session.user
	if user == "Guest":
		frappe.respond_as_web_page(
			"Calendar Connection",
			_render_callback_html(error="Session expired. Please log in and try again."),
			http_status_code=200,
			fullpage=True
		)
		return

	cached_state = frappe.cache().get_value(f"outlook_oauth_state_{user}")

	if not cached_state or cached_state != state:
		frappe.respond_as_web_page(
			"Calendar Connection",
			_render_callback_html(error="Invalid state parameter (CSRF check failed). Please try again."),
			http_status_code=200,
			fullpage=True
		)
		return

	try:
		settings = frappe.get_single("MM OAuth Settings")
		redirect_uri = f"{get_url()}/api/method/meeting_manager.api.oauth_callbacks.outlook_calendar_callback"

		client = msal.ConfidentialClientApplication(
			settings.outlook_client_id,
			authority=f"https://login.microsoftonline.com/{settings.outlook_tenant_id}",
			client_credential=settings.get_password("outlook_client_secret")
		)

		result = client.acquire_token_by_authorization_code(
			code,
			scopes=['Calendars.ReadWrite', 'offline_access'],
			redirect_uri=redirect_uri
		)

		if 'access_token' not in result:
			error_msg = result.get('error_description', result.get('error', 'Unknown error'))
			raise Exception(f"Token exchange failed: {error_msg}")

		# Check if user already has an Outlook integration
		existing = frappe.db.exists("MM Calendar Integration", {
			"user": user,
			"integration_type": "Outlook Calendar"
		})

		if existing:
			doc = frappe.get_doc("MM Calendar Integration", existing)
			doc.access_token = result['access_token']
			doc.refresh_token = result.get('refresh_token') or doc.refresh_token
			doc.token_expiry = add_to_date(now_datetime(), seconds=result.get('expires_in', 3600))
			doc.is_active = 1
			doc.save(ignore_permissions=True)
			integration_name = doc.name
		else:
			integration = frappe.get_doc({
				'doctype': 'MM Calendar Integration',
				'user': user,
				'integration_type': 'Outlook Calendar',
				'integration_name': 'Outlook Calendar',
				'access_token': result['access_token'],
				'refresh_token': result.get('refresh_token'),
				'token_expiry': add_to_date(now_datetime(), seconds=result.get('expires_in', 3600)),
				'is_active': 1,
				'sync_direction': 'One-way (Read Only)',
				'auto_sync_enabled': 1,
				'sync_past_days': 30,
				'sync_future_days': 90,
				'sync_interval_minutes': 10
			})
			integration.insert(ignore_permissions=True)
			integration_name = integration.name

		frappe.db.commit()
		frappe.cache().delete_value(f"outlook_oauth_state_{user}")

		frappe.respond_as_web_page(
			"Calendar Connection",
			_render_callback_html(success=True, integration_id=integration_name),
			http_status_code=200,
			fullpage=True
		)

	except Exception as e:
		frappe.log_error(title="Outlook OAuth Callback Error", message=str(e))
		frappe.respond_as_web_page(
			"Calendar Connection",
			_render_callback_html(error="Failed to connect Outlook Calendar. Please try again."),
			http_status_code=200,
			fullpage=True
		)


# ============================================================================
# Shared callback HTML renderer
# ============================================================================

def _render_callback_html(success=False, integration_id=None, error=None):
	"""
	Generate HTML body for OAuth callback page.
	Uses postMessage to communicate result back to the opener window.
	"""
	if success:
		message_json = json.dumps({"success": True, "integration_id": integration_id})
		status_text = "Calendar connected successfully!"
		status_icon = "✓"
		status_color = "#16a34a"
	else:
		message_json = json.dumps({"error": error or "Unknown error"})
		status_text = error or "Connection failed"
		status_icon = "✗"
		status_color = "#dc2626"

	return f"""
	<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:2rem;">
		<div style="font-size:3rem;color:{status_color};margin-bottom:1rem;">{status_icon}</div>
		<h2 style="font-size:1.25rem;font-weight:600;color:#1f2937;margin:0 0 0.5rem 0;">{status_text}</h2>
		<p style="color:#6b7280;font-size:0.875rem;">This window will close automatically...</p>
	</div>
	<script>
		try {{
			if (window.opener) {{
				window.opener.postMessage({message_json}, window.location.origin);
			}}
		}} catch(e) {{
			console.error('postMessage failed:', e);
		}}
		setTimeout(function() {{ window.close(); }}, 2500);
	</script>
	"""
