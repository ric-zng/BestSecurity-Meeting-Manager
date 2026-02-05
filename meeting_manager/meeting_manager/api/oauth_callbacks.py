# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

"""
OAuth Callbacks API
Handles OAuth 2.0 redirect callbacks for calendar integrations
"""

import frappe
from frappe import _
from frappe.integrations.google_oauth import GoogleOAuth
from frappe.utils import get_url, now_datetime, add_to_date
import secrets


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
		google_oauth = GoogleOAuth()
		auth_url = google_oauth.get_authentication_url({
			'state': state,
			'redirect_uri': redirect_uri,
			'scope': 'https://www.googleapis.com/auth/calendar'
		})

		return {'authorization_url': auth_url.get('url')}

	except Exception as e:
		frappe.log_error(title="Google OAuth URL Error", message=str(e))
		frappe.throw(_("Failed to generate Google OAuth URL. Please check Google Settings."))


@frappe.whitelist(allow_guest=True, methods=['GET'])
def google_calendar_callback(code=None, state=None, error=None):
	"""
	OAuth callback for Google Calendar

	Args:
		code (str): Authorization code from Google
		state (str): State parameter for CSRF protection
		error (str): Error message from Google (if any)

	Returns:
		str: HTML page that posts message to opener window
	"""
	# Handle error from Google
	if error:
		return _callback_html_response(error=f"Google OAuth error: {error}")

	# Validate state parameter (CSRF protection)
	user = frappe.session.user
	cached_state = frappe.cache().get_value(f"google_oauth_state_{user}")

	if not cached_state or cached_state != state:
		return _callback_html_response(error="Invalid state parameter (CSRF check failed)")

	# Exchange code for tokens
	try:
		redirect_uri = f"{get_url()}/api/method/meeting_manager.api.oauth_callbacks.google_calendar_callback"

		google_oauth = GoogleOAuth()
		tokens = google_oauth.authorize(code, redirect_uri)

		# Create MM Calendar Integration
		integration = frappe.get_doc({
			'doctype': 'MM Calendar Integration',
			'user': user,
			'integration_type': 'Google Calendar',
			'integration_name': 'Google Calendar',
			'access_token': tokens['access_token'],
			'refresh_token': tokens.get('refresh_token'),
			'token_expiry': add_to_date(now_datetime(), seconds=tokens.get('expires_in', 3600)),
			'is_active': 1,
			'sync_direction': 'One-way (Read Only)',  # Default per user requirement
			'auto_sync_enabled': 1,
			'sync_past_days': 30,
			'sync_future_days': 90,
			'sync_interval_minutes': 10
		})
		integration.insert(ignore_permissions=True)
		frappe.db.commit()

		return _callback_html_response(success=True, integration_id=integration.name)

	except Exception as e:
		frappe.log_error(title="Google OAuth Callback Error", message=str(e))
		return _callback_html_response(error="Failed to connect Google Calendar. Please try again.")


def _callback_html_response(success=False, integration_id=None, error=None):
	"""
	Generate HTML response for OAuth callback

	Args:
		success (bool): Whether OAuth flow succeeded
		integration_id (str): Integration ID (if successful)
		error (str): Error message (if failed)

	Returns:
		str: HTML page with postMessage script
	"""
	if success:
		message = f"{{'success': true, 'integration_id': '{integration_id}'}}"
	else:
		message = f"{{'error': '{error}'}}"

	html = f"""
	<html>
	<head>
		<title>Calendar Connection</title>
		<style>
			body {{
				font-family: Arial, sans-serif;
				display: flex;
				justify-content: center;
				align-items: center;
				height: 100vh;
				margin: 0;
				background-color: #f5f5f5;
			}}
			.message {{
				text-align: center;
				padding: 20px;
			}}
		</style>
	</head>
	<body>
		<div class="message">
			<p>{'✓ Calendar connected successfully!' if success else '✗ Connection failed'}</p>
			<p>This window will close automatically...</p>
		</div>
		<script>
			window.opener.postMessage({message}, '*');
			setTimeout(function() {{
				window.close();
			}}, 2000);
		</script>
	</body>
	</html>
	"""

	return html


# ============================================================================
# Microsoft Outlook Calendar OAuth
# ============================================================================

@frappe.whitelist()
def get_outlook_oauth_url():
	"""
	Return Outlook OAuth authorization URL

	Returns:
		dict: Contains 'authorization_url' key
	"""
	import msal

	# Check if Outlook integration is enabled
	settings = frappe.get_single("MM OAuth Settings")
	if not settings.enable_outlook:
		frappe.throw(_("Outlook integration is not enabled. Please enable it in MM OAuth Settings."))

	# Generate state parameter for CSRF protection
	state = secrets.token_urlsafe(32)
	frappe.cache().set_value(
		f"outlook_oauth_state_{frappe.session.user}",
		state,
		expires_in_sec=600  # 10 minutes
	)

	# Build redirect URI
	redirect_uri = f"{get_url()}/api/method/meeting_manager.api.oauth_callbacks.outlook_calendar_callback"

	try:
		# Create MSAL client
		client = msal.ConfidentialClientApplication(
			settings.outlook_client_id,
			authority=f"https://login.microsoftonline.com/{settings.outlook_tenant_id}",
			client_credential=settings.get_password("outlook_client_secret")
		)

		# Get authorization URL
		auth_url = client.get_authorization_request_url(
			scopes=['Calendars.ReadWrite', 'offline_access'],
			state=state,
			redirect_uri=redirect_uri
		)

		return {'authorization_url': auth_url}

	except Exception as e:
		frappe.log_error(title="Outlook OAuth URL Error", message=str(e))
		frappe.throw(_("Failed to generate Outlook OAuth URL. Please check MM OAuth Settings."))


@frappe.whitelist(allow_guest=True, methods=['GET'])
def outlook_calendar_callback(code=None, state=None, error=None):
	"""
	OAuth callback for Microsoft Outlook

	Args:
		code (str): Authorization code from Microsoft
		state (str): State parameter for CSRF protection
		error (str): Error message from Microsoft (if any)

	Returns:
		str: HTML page that posts message to opener window
	"""
	import msal

	# Handle error from Microsoft
	if error:
		return _callback_html_response(error=f"Outlook OAuth error: {error}")

	# Validate state parameter (CSRF protection)
	user = frappe.session.user
	cached_state = frappe.cache().get_value(f"outlook_oauth_state_{user}")

	if not cached_state or cached_state != state:
		return _callback_html_response(error="Invalid state parameter (CSRF check failed)")

	# Exchange code for tokens
	try:
		settings = frappe.get_single("MM OAuth Settings")
		redirect_uri = f"{get_url()}/api/method/meeting_manager.api.oauth_callbacks.outlook_calendar_callback"

		# Create MSAL client
		client = msal.ConfidentialClientApplication(
			settings.outlook_client_id,
			authority=f"https://login.microsoftonline.com/{settings.outlook_tenant_id}",
			client_credential=settings.get_password("outlook_client_secret")
		)

		# Exchange authorization code for tokens
		result = client.acquire_token_by_authorization_code(
			code,
			scopes=['Calendars.ReadWrite', 'offline_access'],
			redirect_uri=redirect_uri
		)

		if 'access_token' not in result:
			error_msg = result.get('error_description', result.get('error', 'Unknown error'))
			raise Exception(f"Token exchange failed: {error_msg}")

		# Create MM Calendar Integration
		integration = frappe.get_doc({
			'doctype': 'MM Calendar Integration',
			'user': user,
			'integration_type': 'Outlook Calendar',
			'integration_name': 'Outlook Calendar',
			'access_token': result['access_token'],
			'refresh_token': result.get('refresh_token'),
			'token_expiry': add_to_date(now_datetime(), seconds=result.get('expires_in', 3600)),
			'is_active': 1,
			'sync_direction': 'One-way (Read Only)',  # Default per user requirement
			'auto_sync_enabled': 1,
			'sync_past_days': 30,
			'sync_future_days': 90,
			'sync_interval_minutes': 10
		})
		integration.insert(ignore_permissions=True)
		frappe.db.commit()

		return _callback_html_response(success=True, integration_id=integration.name)

	except Exception as e:
		frappe.log_error(title="Outlook OAuth Callback Error", message=str(e))
		return _callback_html_response(error="Failed to connect Outlook Calendar. Please try again.")
