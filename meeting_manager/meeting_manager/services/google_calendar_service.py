# Copyright (c) 2026, Best Security and contributors
# For license information, please see license.txt

"""
Google Calendar Service
Handles Google Calendar API integration via OAuth 2.0
"""

import frappe
from frappe import _
from frappe.integrations.google_oauth import GoogleOAuth
from frappe.utils import get_datetime, now_datetime
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials


class GoogleCalendarService:
	"""Service class for Google Calendar API operations"""

	def __init__(self, integration):
		"""
		Initialize Google Calendar service

		Args:
			integration: MM Calendar Integration document or name
		"""
		if isinstance(integration, str):
			self.integration = frappe.get_doc("MM Calendar Integration", integration)
		else:
			self.integration = integration

	def get_authenticated_service(self):
		"""
		Return authenticated Google Calendar API service

		Returns:
			Resource: Google Calendar API service object
		"""
		from meeting_manager.meeting_manager.services.token_manager import should_refresh_token

		# Check if token needs refresh
		if should_refresh_token(self.integration):
			self.refresh_token()

		# Build service
		access_token = self.integration.get_password("access_token")
		credentials = self._get_credentials(access_token)
		service = build('calendar', 'v3', credentials=credentials)

		return service

	def _get_credentials(self, access_token):
		"""
		Create credentials object from access token

		Args:
			access_token (str): OAuth access token

		Returns:
			Credentials: Google OAuth credentials object
		"""
		return Credentials(token=access_token)

	def fetch_events(self, time_min, time_max, calendar_id='primary'):
		"""
		Fetch events from Google Calendar

		Args:
			time_min (datetime): Start of date range
			time_max (datetime): End of date range
			calendar_id (str): Calendar ID (default: 'primary')

		Returns:
			list: List of standardized event dictionaries
		"""
		service = self.get_authenticated_service()

		try:
			events_result = service.events().list(
				calendarId=calendar_id,
				timeMin=time_min.isoformat() + 'Z',
				timeMax=time_max.isoformat() + 'Z',
				maxResults=2500,
				singleEvents=True,  # Expand recurring events
				orderBy='startTime'
			).execute()

			google_events = events_result.get('items', [])
			return self._standardize_events(google_events)

		except Exception as e:
			frappe.log_error(
				title=f"Google Calendar Fetch Error - {self.integration.user}",
				message=str(e)
			)
			raise

	def _standardize_events(self, google_events):
		"""
		Convert Google Calendar events to standard format

		Args:
			google_events (list): List of Google Calendar event objects

		Returns:
			list: List of standardized event dictionaries
		"""
		events = []

		for event in google_events:
			# Skip cancelled events
			if event.get('status') == 'cancelled':
				continue

			# Get start/end times (handle all-day events)
			start_datetime = event['start'].get('dateTime', event['start'].get('date'))
			end_datetime = event['end'].get('dateTime', event['end'].get('date'))

			events.append({
				'external_event_id': event['id'],
				'event_title': event.get('summary', 'Untitled'),
				'start_datetime': get_datetime(start_datetime),
				'end_datetime': get_datetime(end_datetime),
				'description': event.get('description', ''),
				'location': event.get('location', ''),
				'external_last_modified': get_datetime(event['updated'])
			})

		return events

	def refresh_token(self):
		"""Refresh Google OAuth token"""
		try:
			google_oauth = GoogleOAuth()
			refresh_token = self.integration.get_password("refresh_token")

			# Call Google OAuth token refresh
			new_tokens = google_oauth.refresh_access_token(refresh_token)

			# Update integration tokens
			from meeting_manager.meeting_manager.services.token_manager import update_integration_tokens
			update_integration_tokens(
				self.integration.name,
				new_tokens['access_token'],
				refresh_token,  # Google doesn't issue new refresh tokens on refresh
				new_tokens['expires_in']
			)

		except Exception as e:
			frappe.log_error(
				title=f"Google Token Refresh Error - {self.integration.user}",
				message=str(e)
			)
			raise

	def create_event(self, event_data):
		"""
		Create event in Google Calendar

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
		service = self.get_authenticated_service()

		try:
			event = {
				'summary': event_data['summary'],
				'start': {
					'dateTime': event_data['start'].isoformat(),
					'timeZone': 'UTC'
				},
				'end': {
					'dateTime': event_data['end'].isoformat(),
					'timeZone': 'UTC'
				},
				'description': event_data.get('description', '')
			}

			if event_data.get('location'):
				event['location'] = event_data['location']

			created = service.events().insert(
				calendarId='primary',
				body=event
			).execute()

			return created['id']

		except Exception as e:
			frappe.log_error(
				title=f"Google Calendar Create Event Error - {self.integration.user}",
				message=str(e)
			)
			raise

	def update_event(self, event_id, event_data):
		"""
		Update existing event in Google Calendar

		Args:
			event_id (str): External event ID
			event_data (dict): Updated event data

		Returns:
			str: External event ID
		"""
		service = self.get_authenticated_service()

		try:
			event = {
				'summary': event_data['summary'],
				'start': {
					'dateTime': event_data['start'].isoformat(),
					'timeZone': 'UTC'
				},
				'end': {
					'dateTime': event_data['end'].isoformat(),
					'timeZone': 'UTC'
				},
				'description': event_data.get('description', '')
			}

			if event_data.get('location'):
				event['location'] = event_data['location']

			updated = service.events().update(
				calendarId='primary',
				eventId=event_id,
				body=event
			).execute()

			return updated['id']

		except Exception as e:
			frappe.log_error(
				title=f"Google Calendar Update Event Error - {self.integration.user}",
				message=str(e)
			)
			raise

	def delete_event(self, event_id):
		"""
		Delete event from Google Calendar

		Args:
			event_id (str): External event ID
		"""
		service = self.get_authenticated_service()

		try:
			service.events().delete(
				calendarId='primary',
				eventId=event_id
			).execute()

		except Exception as e:
			frappe.log_error(
				title=f"Google Calendar Delete Event Error - {self.integration.user}",
				message=str(e)
			)
			raise

	def list_calendars(self):
		"""
		List user's available calendars

		Returns:
			list: List of calendar dictionaries with id and summary
		"""
		service = self.get_authenticated_service()

		try:
			calendar_list = service.calendarList().list().execute()
			calendars = []

			for calendar in calendar_list.get('items', []):
				calendars.append({
					'id': calendar['id'],
					'summary': calendar['summary'],
					'primary': calendar.get('primary', False)
				})

			return calendars

		except Exception as e:
			frappe.log_error(
				title=f"Google Calendar List Error - {self.integration.user}",
				message=str(e)
			)
			raise
