# External Calendar Integration Guide

This guide covers setting up Google Calendar and Microsoft Outlook Calendar integration for the Meeting Manager app.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Google Calendar Setup](#google-calendar-setup)
- [Microsoft Outlook Setup](#microsoft-outlook-setup)
- [Installation & Configuration](#installation--configuration)
- [User Guide](#user-guide)
- [Troubleshooting](#troubleshooting)

---

## Overview

Meeting Manager supports bidirectional sync with external calendars to prevent double-booking:

- **Google Calendar** - OAuth 2.0 integration via Google Cloud Console
- **Microsoft Outlook Calendar** - OAuth 2.0 integration via Azure AD
- **iCal** - Read-only URL-based subscription (already implemented)

### Sync Modes

1. **One-way (Read Only)** - Default, safer option
   - External calendar events sync to Meeting Manager
   - Events block availability for bookings
   - MM bookings do NOT push to external calendar

2. **Two-way (Read & Write)** - Advanced users
   - External events sync to MM
   - MM bookings push to external calendar
   - Automatic sync every 10 minutes

---

## Features

✅ **OAuth 2.0 Authentication** - Secure token-based authentication
✅ **Automatic Token Refresh** - Tokens refresh automatically when <1 hour remaining
✅ **Conflict Prevention** - External events block MM booking slots
✅ **Bidirectional Sync** - Optional two-way sync for MM bookings
✅ **Multiple Calendars** - Users can connect multiple calendars (work + personal)
✅ **Scheduled Sync** - Automatic sync every 10 minutes via cron job

---

## Google Calendar Setup

### Prerequisites

- Google account with access to Google Cloud Console
- Admin access to your Frappe site

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. **Project Name**: `Meeting Manager Integration`
4. **Organization**: (Select your organization or leave as "No organization")
5. Click **"Create"**
6. Wait for project creation (you'll see a notification)

### Step 2: Enable Google Calendar API

1. In the Google Cloud Console, ensure your project is selected
2. Navigate to **"APIs & Services"** → **"Library"** (left sidebar)
3. Search for **"Google Calendar API"**
4. Click on **"Google Calendar API"** in the results
5. Click **"Enable"**
6. Wait for API to be enabled (~30 seconds)

### Step 3: Configure OAuth Consent Screen

1. Navigate to **"APIs & Services"** → **"OAuth consent screen"**
2. **User Type**: Select **"Internal"** (if using Google Workspace) or **"External"**
3. Click **"Create"**

**App Information:**
- **App name**: `Meeting Manager`
- **User support email**: Your email address
- **App logo**: (Optional) Upload Meeting Manager logo
- **Application home page**: Your site URL (e.g., `https://bs-infra.dk`)
- **Authorized domains**: Add your domain (e.g., `bs-infra.dk`)
- **Developer contact information**: Your email

4. Click **"Save and Continue"**

**Scopes:**
5. Click **"Add or Remove Scopes"**
6. Search for and select:
   - `https://www.googleapis.com/auth/calendar` - See, edit, share, and permanently delete all calendars
7. Click **"Update"** → **"Save and Continue"**

**Test Users** (if External):
8. Add test user email addresses
9. Click **"Save and Continue"**

10. Review summary and click **"Back to Dashboard"**

### Step 4: Create OAuth Credentials

1. Navigate to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. **Application type**: Select **"Web application"**
4. **Name**: `Meeting Manager Web Client`

**Authorized JavaScript origins:**
5. Click **"+ Add URI"**
6. Enter: `https://YOUR-SITE.com` (replace with your actual domain)
   - Example: `https://bs-infra.dk`

**Authorized redirect URIs:**
7. Click **"+ Add URI"**
8. Enter: `https://YOUR-SITE.com/api/method/meeting_manager.api.oauth_callbacks.google_calendar_callback`
   - Example: `https://bs-infra.dk/api/method/meeting_manager.api.oauth_callbacks.google_calendar_callback`

9. Click **"Create"**

### Step 5: Save OAuth Credentials

A popup will show your credentials:

- **Client ID**: `xxxxx.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-xxxxx`

**Important**: Copy both values immediately or click **"Download JSON"** to save them.

---

## Microsoft Outlook Setup

### Prerequisites

- Microsoft account (personal or organizational)
- Azure AD access (Global Administrator or Application Administrator role)
- Admin access to your Frappe site

### Step 1: Register Azure AD App

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **"Azure Active Directory"** (search in top bar)
3. In left sidebar, click **"App registrations"**
4. Click **"+ New registration"**

**Register an application:**
- **Name**: `Meeting Manager`
- **Supported account types**: Select one:
  - **Accounts in this organizational directory only** - Single tenant (most restrictive)
  - **Accounts in any organizational directory** - Multi-tenant (organizations only)
  - **Accounts in any organizational directory and personal Microsoft accounts** - Recommended for flexibility
- **Redirect URI**:
  - Platform: **Web**
  - URI: `https://YOUR-SITE.com/api/method/meeting_manager.api.oauth_callbacks.outlook_calendar_callback`
    - Example: `https://bs-infra.dk/api/method/meeting_manager.api.oauth_callbacks.outlook_calendar_callback`

5. Click **"Register"**

### Step 2: Copy Application (Client) ID

After registration, you'll see the app overview page:

1. Copy the **Application (client) ID** (UUID format)
   - Example: `12345678-1234-1234-1234-123456789abc`
2. Copy the **Directory (tenant) ID** (UUID format)
   - Example: `87654321-4321-4321-4321-cba987654321`
   - **Note**: For multi-tenant apps, you can use `common` as the tenant ID

**Save these values** - you'll need them later.

### Step 3: Create Client Secret

1. In left sidebar, click **"Certificates & secrets"**
2. Under **"Client secrets"**, click **"+ New client secret"**
3. **Description**: `Meeting Manager Secret`
4. **Expires**: Select **24 months** (recommended) or **Custom**
5. Click **"Add"**

**Important**: The secret **Value** is shown **only once**. Copy it immediately:
- **Value**: `xxx~xxxxxxxxxxxxxxxxxxxxxxxxx` (long random string)

**Never share this secret**. If lost, you'll need to create a new one.

### Step 4: Configure API Permissions

1. In left sidebar, click **"API permissions"**
2. You'll see **User.Read** (Microsoft Graph) already added
3. Click **"+ Add a permission"**
4. Select **"Microsoft Graph"**
5. Select **"Delegated permissions"**
6. Search for and check:
   - **Calendars.ReadWrite** - Read and write user calendars
   - **offline_access** - Maintain access to data you have given it access to
7. Click **"Add permissions"**

**Grant Admin Consent** (if you have admin rights):
8. Click **"✓ Grant admin consent for [Your Organization]"**
9. Click **"Yes"** to confirm
10. You should see green checkmarks under **Status** column

**If you don't have admin rights**, ask your Azure AD administrator to grant consent.

### Step 5: Optional - Add Branding

1. In left sidebar, click **"Branding & properties"**
2. **Name**: `Meeting Manager`
3. **Logo**: Upload Meeting Manager logo (256x256 PNG)
4. **Home page URL**: Your site URL (e.g., `https://bs-infra.dk`)
5. **Terms of service URL**: (Optional)
6. **Privacy statement URL**: (Optional)
7. Click **"Save"**

---

## Installation & Configuration

### Step 1: Install Python Dependencies

SSH into your Frappe server and run:

```bash
# Navigate to app directory
cd /home/frappeuser/bestsecurity/apps/meeting_manager

# Install dependencies (includes google-auth, msal, etc.)
bench pip install -e .

# Or install manually if needed
bench pip install google-auth google-auth-oauthlib google-api-python-client msal requests icalendar
```

**Verify installation**:
```bash
bench pip list | grep google
bench pip list | grep msal
```

### Step 2: Run Migrations

```bash
# Run migrations to create MM OAuth Settings doctype
bench --site bs-infra.dk migrate
```

You should see output indicating that `MM OAuth Settings` was created.

### Step 3: Configure Google Settings (Frappe)

1. Open your Frappe site in browser
2. Navigate to **"Google Settings"** doctype:
   - Search bar → Type "Google Settings"
   - Or go directly: `https://bs-infra.dk/app/google-settings`

3. Fill in the form:
   - **Enable**: ✓ Check this box
   - **Client ID**: Paste from Google Cloud Console (Step 5 above)
   - **Client Secret**: Paste from Google Cloud Console

4. Click **"Save"**

**Test**: Try to save - if successful, Google OAuth is configured.

### Step 4: Configure MM OAuth Settings (Outlook)

1. Navigate to **"MM OAuth Settings"** doctype:
   - Search bar → Type "MM OAuth Settings"
   - Or go directly: `https://bs-infra.dk/app/mm-oauth-settings`

2. Fill in the form:
   - **Enable Outlook**: ✓ Check this box
   - **Outlook Client ID**: Paste Application (client) ID from Azure Portal
   - **Outlook Client Secret**: Paste secret Value from Azure Portal
   - **Outlook Tenant ID**:
     - Use the Directory (tenant) ID from Azure Portal
     - Or use `common` for multi-tenant apps (recommended)

3. Click **"Save"**

**Test**: Try to save - if successful, Outlook OAuth is configured.

### Step 5: Clear Cache & Restart

```bash
# Clear Frappe cache
bench --site bs-infra.dk clear-cache

# Clear website cache (optional)
bench --site bs-infra.dk clear-website-cache

# Restart bench
bench restart
```

### Step 6: Verify Scheduler

The calendar sync job should already be configured. Verify:

```bash
# Check scheduler events in hooks.py
cat apps/meeting_manager/meeting_manager/hooks.py | grep -A 5 "scheduler_events"
```

You should see:
```python
scheduler_events = {
    "cron": {
        "*/10 * * * *": [
            "meeting_manager.meeting_manager.services.calendar_sync.sync_all_users_calendars"
        ],
    }
}
```

**Enable scheduler** (if not already running):
```bash
bench --site bs-infra.dk enable-scheduler
```

**Check scheduler status**:
```bash
bench --site bs-infra.dk doctor
```

---

## User Guide

### Connecting External Calendar

#### As a User:

1. **Navigate to Enhanced Calendar**:
   - Click **"Enhanced Calendar"** in Meeting Manager workspace
   - Or go to: `https://bs-infra.dk/app/mm-enhanced-calendar`

2. **Click "Connect Calendar" button** (top right, under "Calendar" dropdown)

3. **Choose Integration Type**:
   - **Google Calendar** - Click the Google button
   - **Outlook Calendar** - Click the Outlook button

4. **Authorize Access** (OAuth popup):
   - A popup window will open
   - Sign in to your Google/Microsoft account (if not already signed in)
   - Review permissions requested
   - Click **"Allow"** or **"Accept"**

5. **Success**:
   - Popup closes automatically
   - Green success message appears
   - Calendar will sync within 10 minutes

### Managing Integrations

#### View Connected Calendars:

1. Navigate to **"MM Calendar Integration"** list:
   - Search → "MM Calendar Integration"
   - Or: `https://bs-infra.dk/app/mm-calendar-integration`

2. You'll see all your connected calendars:
   - Integration Name (e.g., "Google Calendar")
   - Sync Status (Success/Failed)
   - Last Sync time
   - Sync Direction (One-way/Two-way)

#### Change Sync Direction:

1. Open an integration record (click on it)
2. Change **"Sync Direction"**:
   - **One-way (Read Only)** - Default, safer
   - **Two-way (Read & Write)** - Advanced
3. Click **"Save"**

**Warning**: Two-way sync will create events in your external calendar for every MM booking assigned to you.

#### Disconnect a Calendar:

1. Open the integration record
2. Uncheck **"Is Active"**
3. Click **"Save"**

Or delete the integration:
1. Click **"Menu"** → **"Delete"**
2. Confirm deletion

### How Sync Works

#### Sync Schedule:
- **Automatic**: Every 10 minutes (cron job)
- **Manual**: Edit and save an integration to trigger immediate sync

#### Sync Flow:

**One-way (Read Only)**:
1. Fetch events from external calendar (past 30 days, future 90 days)
2. Create/update `MM Calendar Event Sync` records
3. These events block availability in booking system
4. No data pushed to external calendar

**Two-way (Read & Write)**:
1. Same as one-way (fetch external events)
2. **Additionally**: When MM booking is created
   - Event created in your external calendar
   - Linked via `MM Calendar Event Sync` record
3. When MM booking is cancelled
   - Event deleted from external calendar

#### Conflict Prevention:
- If you have an event in Google Calendar from 2:00 PM - 3:00 PM
- Meeting Manager will NOT allow a booking to be created in that slot
- Enhanced Calendar will show the blocked time
- Booking form will show availability error

---

## Troubleshooting

### Google Calendar Issues

#### Error: "Access blocked: This app's request is invalid"

**Cause**: OAuth consent screen not configured or app not published.

**Solution**:
1. Go to Google Cloud Console → OAuth consent screen
2. If **Publishing status** is "Testing":
   - Add your email to **Test users**
   - Or click **"Publish App"** (requires verification for External apps)

#### Error: "redirect_uri_mismatch"

**Cause**: Redirect URI in Google Cloud Console doesn't match the callback URL.

**Solution**:
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Ensure **Authorized redirect URIs** contains:
   ```
   https://YOUR-ACTUAL-SITE.com/api/method/meeting_manager.api.oauth_callbacks.google_calendar_callback
   ```
4. No trailing slash
5. Must match your site URL exactly (including subdomain)

#### Error: "Insufficient Permission"

**Cause**: Required scopes not granted.

**Solution**:
1. Check OAuth consent screen → Scopes
2. Ensure `https://www.googleapis.com/auth/calendar` is added
3. User needs to re-authorize (disconnect and reconnect calendar)

---

### Outlook Calendar Issues

#### Error: "AADSTS50011: The reply URL specified in the request does not match"

**Cause**: Redirect URI in Azure AD doesn't match the callback URL.

**Solution**:
1. Go to Azure Portal → App registrations → Your app
2. Click **"Authentication"** (left sidebar)
3. Under **"Web"** → **"Redirect URIs"**, ensure it contains:
   ```
   https://YOUR-ACTUAL-SITE.com/api/method/meeting_manager.api.oauth_callbacks.outlook_calendar_callback
   ```
4. Click **"Save"**

#### Error: "AADSTS65001: The user or administrator has not consented"

**Cause**: API permissions not granted.

**Solution**:
1. Go to Azure Portal → App registrations → Your app → API permissions
2. Ensure **Calendars.ReadWrite** and **offline_access** are listed
3. Click **"Grant admin consent"** (requires admin role)
4. If you're not admin, ask your IT administrator to grant consent

#### Error: "Outlook integration is not enabled"

**Cause**: MM OAuth Settings not configured.

**Solution**:
1. Navigate to MM OAuth Settings doctype
2. Check **"Enable Outlook"** checkbox
3. Fill in Client ID, Client Secret, Tenant ID
4. Click **"Save"**

---

### Sync Issues

#### Events not syncing

**Check 1**: Verify scheduler is running
```bash
bench --site bs-infra.dk enable-scheduler
bench doctor  # Check scheduler status
```

**Check 2**: Check sync logs
```bash
# View recent logs
tail -f /home/frappeuser/bestsecurity/logs/frappe.log

# Search for calendar sync
grep "calendar sync" /home/frappeuser/bestsecurity/logs/frappe.log
```

**Check 3**: Check integration status
1. Open MM Calendar Integration record
2. Check **Sync Status** field
3. Check **Sync Error Log** field (if failed)

**Check 4**: Manually trigger sync
1. Open MM Calendar Integration
2. Change any field (e.g., add space to Integration Name)
3. Save (this triggers immediate sync)

#### Token expired errors

**Cause**: Access token expired and refresh failed.

**Solution**:
1. Disconnect the calendar integration
2. Reconnect (go through OAuth flow again)
3. Token refresh should work automatically going forward

#### Events blocking availability but not showing

**Check 1**: Verify `MM Calendar Event Sync` records exist
```bash
bench --site bs-infra.dk console
```
```python
import frappe
events = frappe.get_all("MM Calendar Event Sync",
    fields=["name", "event_title", "start_datetime", "sync_status"],
    limit=10)
print(events)
```

**Check 2**: Check if events are in valid date range
- Sync only fetches past 30 days + future 90 days
- Events outside this range won't sync

---

### Debugging

#### Enable debug logging

Add to `site_config.json`:
```json
{
  "developer_mode": 1,
  "logging": 1
}
```

Restart:
```bash
bench restart
```

#### Manual sync test

Run sync manually via console:
```bash
bench --site bs-infra.dk console
```
```python
from meeting_manager.meeting_manager.services.calendar_sync import sync_all_users_calendars
sync_all_users_calendars()
```

Check output for errors.

#### Check OAuth tokens

```python
import frappe
integrations = frappe.get_all("MM Calendar Integration",
    filters={"user": "user@example.com"},
    fields=["name", "integration_type", "token_expiry", "sync_status"])
print(integrations)
```

#### Test API endpoints

**Google OAuth URL**:
```bash
curl -X POST https://bs-infra.dk/api/method/meeting_manager.api.oauth_callbacks.get_google_oauth_url \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=YOUR_SESSION_COOKIE"
```

**Outlook OAuth URL**:
```bash
curl -X POST https://bs-infra.dk/api/method/meeting_manager.api.oauth_callbacks.get_outlook_oauth_url \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=YOUR_SESSION_COOKIE"
```

---

## Security Best Practices

1. **Never commit credentials to version control**
   - Client secrets should only be in Google Settings and MM OAuth Settings
   - Don't add to code or configuration files

2. **Use HTTPS only**
   - OAuth requires HTTPS for production
   - Development: Use `http://localhost` redirect URIs for testing

3. **Restrict OAuth scopes**
   - Only request minimum required permissions
   - Current scopes:
     - Google: `calendar` (read/write calendars)
     - Outlook: `Calendars.ReadWrite` + `offline_access`

4. **Rotate secrets regularly**
   - Google: Create new OAuth client annually
   - Outlook: Set secret expiration to 24 months, rotate before expiry

5. **Monitor failed auth attempts**
   - Check Error Log doctype regularly
   - Search for "OAuth" errors

6. **Limit test users** (Google External apps)
   - Add only authorized test users during testing phase
   - Publish app when ready for production

---

## FAQ

### Q: Can a user connect multiple Google accounts?

**A**: Yes! Users can create multiple integrations by clicking "Connect Calendar" multiple times. Each integration stores separate OAuth tokens.

### Q: What happens if user revokes access from Google/Outlook?

**A**:
1. Next sync will fail with "invalid_grant" or "unauthorized" error
2. Integration sync_status will show "Failed"
3. User needs to reconnect (go through OAuth flow again)

### Q: Do calendar events sync in real-time?

**A**: No, sync happens every 10 minutes via cron job. For immediate sync, edit and save the integration record.

### Q: Can admins connect calendars for other users?

**A**: No, OAuth requires user consent. Each user must connect their own calendar. System Managers can view integration records but can't create tokens for other users.

### Q: What data is stored?

**A**:
- OAuth tokens (encrypted via Frappe's Password field)
- Event metadata (title, start, end, description, location)
- Sync status and timestamps
- **Not stored**: Email body content, attachments, attendee details beyond name

### Q: Does deleting a booking delete the external calendar event?

**A**: Yes, if two-way sync is enabled. When a booking is cancelled, the `on_cancel` hook deletes the event from external calendars.

### Q: Can I sync past events?

**A**: Yes, adjust **Sync Past Days** field in MM Calendar Integration (default: 30 days). Maximum recommended: 365 days.

### Q: What if user has recurring events?

**A**:
- Google Calendar: Recurring events are expanded to individual instances (via `singleEvents=true`)
- Each instance creates a separate `MM Calendar Event Sync` record
- All instances block availability

---

## Support

For issues or questions:

1. **Check Error Logs**:
   - Frappe → Error Log doctype
   - Search for "Calendar Sync" or "OAuth"

2. **Check Scheduler Logs**:
   ```bash
   tail -f /home/frappeuser/bestsecurity/logs/frappe.log | grep "calendar"
   ```

3. **GitHub Issues**:
   - Report bugs: https://github.com/ric-zng/BestSecurity-Meeting-Manager/issues

4. **Email Support**: ric@zng.dk

---

## Changelog

### Version 1.0.0 (2026-02-05)
- ✨ Initial release
- ✅ Google Calendar OAuth 2.0 integration
- ✅ Microsoft Outlook OAuth 2.0 integration
- ✅ Automatic token refresh
- ✅ Bidirectional sync (optional)
- ✅ Scheduled sync every 10 minutes
- ✅ Conflict prevention in booking system

---

## License

MIT License - See LICENSE file for details.

---

## Credits

Developed by **Best Security ApS**
Project: Meeting Manager
Calendar Integration: Phase 4 Implementation
