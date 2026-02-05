# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

"""
Outlook Calendar Service
Handles Microsoft Outlook Calendar API integration via OAuth 2.0
"""

import frappe
from frappe import _
from frappe.utils import get_datetime, now_datetime, add_to_date
import msal
import requests


class OutlookCalendarService:
	"""Service class for Microsoft Outlook Calendar API operations"""

	GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0'

	def __init__(self, integration):
		"""
		Initialize Outlook Calendar service

		Args:
			integration: MM Calendar Integration document or name
		"""
		if isinstance(integration, str):
			self.integration = frappe.get_doc("MM Calendar Integration", integration)
		else:
			self.integration = integration

		self.settings = frappe.get_single("MM OAuth Settings")

	def get_authenticated_client(self):
		"""
		Return MSAL confidential client

		Returns:
			ConfidentialClientApplication: MSAL client for token operations
		"""
		if not self.settings.enable_outlook:
			frappe.throw(_("Outlook integration is not enabled in MM OAuth Settings"))

		return msal.ConfidentialClientApplication(
			self.settings.outlook_client_id,
			authority=f"https://login.microsoftonline.com/{self.settings.outlook_tenant_id}",
			client_credential=self.settings.get_password("outlook_client_secret")
		)

	def fetch_events(self, time_min, time_max, calendar_id=None):
		"""
		Fetch events from Microsoft Graph API

		Args:
			time_min (datetime): Start of date range
			time_max (datetime): End of date range
			calendar_id (str): Calendar ID (optional, uses default calendar if not specified)

		Returns:
			list: List of standardized event dictionaries
		"""
		from meeting_manager.meeting_manager.services.token_manager import should_refresh_token

		# Check if token needs refresh
		if should_refresh_token(self.integration):
			self.refresh_token()

		access_token = self.integration.get_password("access_token")
		headers = {
			'Authorization': f'Bearer {access_token}',
			'Content-Type': 'application/json'
		}

		# Build request
		url = f"{self.GRAPH_API_ENDPOINT}/me/calendar/events"
		params = {
			'$filter': f"start/dateTime ge '{time_min.isoformat()}' and end/dateTime le '{time_max.isoformat()}'",
			'$select': 'id,subject,start,end,bodyPreview,location,lastModifiedDateTime,isCancelled',
			'$top': 1000,
			'$orderby': 'start/dateTime'
		}

		try:
			all_events = []

			# Handle pagination
			while url:
				response = requests.get(url, headers=headers, params=params)
				response.raise_for_status()
				data = response.json()

				all_events.extend(data.get('value', []))

				# Get next page URL
				url = data.get('@odata.nextLink')
				params = None  # Next link already includes params

			return self._standardize_events(all_events)

		except Exception as e:
			frappe.log_error(
				title=f"Outlook Fetch Error - {self.integration.user}",
				message=str(e)
			)
			raise

	def _standardize_events(self, outlook_events):
		"""
		Convert Outlook events to standard format

		Args:
			outlook_events (list): List of Outlook event objects

		Returns:
			list: List of standardized event dictionaries
		"""
		events = []

		for event in outlook_events:
			# Skip cancelled events
			if event.get('isCancelled'):
				continue

			events.append({
				'external_event_id': event['id'],
				'event_title': event.get('subject', 'Untitled'),
				'start_datetime': get_datetime(event['start']['dateTime']),
				'end_datetime': get_datetime(event['end']['dateTime']),
				'description': event.get('bodyPreview', ''),
				'location': event.get('location', {}).get('displayName', ''),
				'external_last_modified': get_datetime(event['lastModifiedDateTime'])
			})

		return events

	def refresh_token(self):
		"""Refresh Outlook OAuth token using MSAL"""
		try:
			client = self.get_authenticated_client()
			refresh_token = self.integration.get_password("refresh_token")

			result = client.acquire_token_by_refresh_token(
				refresh_token,
				scopes=['Calendars.ReadWrite', 'offline_access']
			)

			if 'access_token' in result:
				from meeting_manager.meeting_manager.services.token_manager import update_integration_tokens
				update_integration_tokens(
					self.integration.name,
					result['access_token'],
					result.get('refresh_token', refresh_token),  # Use new refresh token if provided
					result['expires_in']
				)
			else:
				error_msg = result.get('error_description', result.get('error', 'Unknown error'))
				raise Exception(f"Token refresh failed: {error_msg}")

		except Exception as e:
			frappe.log_error(
				title=f"Outlook Token Refresh Error - {self.integration.user}",
				message=str(e)
			)
			raise

	def create_event(self, event_data):
		"""
		Create event via Graph API

		Args:
			event_data (dict): Event data with keys:
				- summary (str): Event title
				- start (datetime): Start time
				- end (datetime): End time
				- description (str): Event description (optional)
				- location (str): Event location (optional)

		Returns:
			str: External event ID
		"""
		access_token = self.integration.get_password("access_token")
		headers = {
			'Authorization': f'Bearer {access_token}',
			'Content-Type': 'application/json'
		}

		event = {
			'subject': event_data['summary'],
			'start': {
				'dateTime': event_data['start'].isoformat(),
				'timeZone': 'UTC'
			},
			'end': {
				'dateTime': event_data['end'].isoformat(),
				'timeZone': 'UTC'
			},
			'body': {
				'contentType': 'text',
				'content': event_data.get('description', '')
			}
		}

		if event_data.get('location'):
			event['location'] = {'displayName': event_data['location']}

		try:
			response = requests.post(
				f"{self.GRAPH_API_ENDPOINT}/me/calendar/events",
				headers=headers,
				json=event
			)
			response.raise_for_status()
			created = response.json()

			return created['id']

		except Exception as e:
			frappe.log_error(
				title=f"Outlook Create Event Error - {self.integration.user}",
				message=str(e)
			)
			raise

	def update_event(self, event_id, event_data):
		"""
		Update existing event via Graph API

		Args:
			event_id (str): External event ID
			event_data (dict): Updated event data

		Returns:
			str: External event ID
		"""
		access_token = self.integration.get_password("access_token")
		headers = {
			'Authorization': f'Bearer {access_token}',
			'Content-Type': 'application/json'
		}

		event = {
			'subject': event_data['summary'],
			'start': {
				'dateTime': event_data['start'].isoformat(),
				'timeZone': 'UTC'
			},
			'end': {
				'dateTime': event_data['end'].isoformat(),
				'timeZone': 'UTC'
			},
			'body': {
				'contentType': 'text',
				'content': event_data.get('description', '')
			}
		}

		if event_data.get('location'):
			event['location'] = {'displayName': event_data['location']}

		try:
			response = requests.patch(
				f"{self.GRAPH_API_ENDPOINT}/me/calendar/events/{event_id}",
				headers=headers,
				json=event
			)
			response.raise_for_status()
			updated = response.json()

			return updated['id']

		except Exception as e:
			frappe.log_error(
				title=f"Outlook Update Event Error - {self.integration.user}",
				message=str(e)
			)
			raise

	def delete_event(self, event_id):
		"""
		Delete event from Outlook Calendar

		Args:
			event_id (str): External event ID
		"""
		access_token = self.integration.get_password("access_token")
		headers = {
			'Authorization': f'Bearer {access_token}'
		}

		try:
			response = requests.delete(
				f"{self.GRAPH_API_ENDPOINT}/me/calendar/events/{event_id}",
				headers=headers
			)
			response.raise_for_status()

		except Exception as e:
			frappe.log_error(
				title=f"Outlook Delete Event Error - {self.integration.user}",
				message=str(e)
			)
			raise

	def list_calendars(self):
		"""
		List user's available calendars

		Returns:
			list: List of calendar dictionaries with id and name
		"""
		access_token = self.integration.get_password("access_token")
		headers = {
			'Authorization': f'Bearer {access_token}'
		}

		try:
			response = requests.get(
				f"{self.GRAPH_API_ENDPOINT}/me/calendars",
				headers=headers
			)
			response.raise_for_status()
			data = response.json()

			calendars = []
			for calendar in data.get('value', []):
				calendars.append({
					'id': calendar['id'],
					'name': calendar['name'],
					'is_default': calendar.get('isDefaultCalendar', False)
				})

			return calendars

		except Exception as e:
			frappe.log_error(
				title=f"Outlook List Calendars Error - {self.integration.user}",
				message=str(e)
			)
			raise
