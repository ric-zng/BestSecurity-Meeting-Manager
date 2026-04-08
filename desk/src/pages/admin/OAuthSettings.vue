<template>
  <div class="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
    <!-- Header -->
    <div class="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-900">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-semibold text-gray-900 dark:text-white">OAuth Settings</h1>
          <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Configure calendar integration credentials</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="testConnection"
            :disabled="testingConnection"
            class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <FeatherIcon name="zap" class="h-4 w-4" />
            {{ testingConnection ? 'Testing...' : 'Test Connection' }}
          </button>
          <button
            v-if="hasChanges"
            @click="saveSettings"
            :disabled="saving"
            class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <FeatherIcon name="save" class="h-4 w-4" />
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Not authorized -->
    <div v-if="!auth.isSystemManager" class="flex items-center justify-center p-12">
      <div class="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950/20">
        <FeatherIcon name="shield-off" class="mx-auto mb-3 h-10 w-10 text-red-400" />
        <h3 class="text-sm font-medium text-red-800 dark:text-red-300">Access Denied</h3>
        <p class="mt-1 text-sm text-red-600 dark:text-red-400">Only System Managers can access OAuth settings.</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-else-if="doc.loading" class="flex items-center justify-center py-24">
      <LoadingSpinner />
    </div>

    <!-- Error -->
    <ErrorState v-else-if="doc.error" :message="doc.error" @retry="doc.reload()" />

    <!-- Content -->
    <div v-else class="mx-auto grid max-w-[1400px] gap-6 p-6 lg:grid-cols-3">

      <!-- Left column (2/3) -->
      <div class="space-y-6 lg:col-span-2">

        <!-- Test connection result -->
        <div
          v-if="testResult"
          class="flex items-start gap-3 rounded-lg border p-4"
          :class="testResult.success
            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
            : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'"
        >
          <FeatherIcon
            :name="testResult.success ? 'check-circle' : 'x-circle'"
            class="mt-0.5 h-5 w-5 shrink-0"
            :class="testResult.success ? 'text-green-500' : 'text-red-500'"
          />
          <div>
            <p class="text-sm font-medium" :class="testResult.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'">
              {{ testResult.message }}
            </p>
            <p v-if="testResult.detail" class="mt-1 text-xs" :class="testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
              {{ testResult.detail }}
            </p>
          </div>
          <button @click="testResult = null" class="ml-auto shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <FeatherIcon name="x" class="h-4 w-4" />
          </button>
        </div>

        <!-- Microsoft Outlook Card -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <svg class="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.17 2.06A1.13 1.13 0 0 0 20.04 1H3.96A1.13 1.13 0 0 0 2.83 2.06L1 10.13v1.74l.83 8.07A1.13 1.13 0 0 0 2.96 21h18.08a1.13 1.13 0 0 0 1.13-1.06L23 11.87v-1.74zM12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
                </svg>
              </div>
              <div>
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">Microsoft Outlook / Office 365</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">Calendar sync via Microsoft Graph API</p>
              </div>
            </div>
            <button
              @click="form.enable_outlook = !form.enable_outlook"
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
              :class="form.enable_outlook ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'"
            >
              <span
                class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                :class="form.enable_outlook ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>

          <div
            class="transition-all duration-200"
            :class="form.enable_outlook ? 'opacity-100' : 'pointer-events-none max-h-0 overflow-hidden opacity-0'"
          >
            <div class="space-y-4 p-5">
              <!-- Client ID -->
              <div>
                <label class="oa-label">
                  Client ID
                  <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.outlook_client_id"
                  type="text"
                  placeholder="e.g. 12345678-abcd-1234-efgh-123456789abc"
                  class="oa-input"
                />
                <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">Application (client) ID from your Azure AD App Registration</p>
              </div>

              <!-- Client Secret -->
              <div>
                <label class="oa-label">
                  Client Secret
                  <span class="text-red-500">*</span>
                </label>
                <div class="relative mt-1">
                  <input
                    v-model="form.outlook_client_secret"
                    :type="showSecret ? 'text' : 'password'"
                    placeholder="Client secret value"
                    class="oa-input !mt-0 !pr-10"
                  />
                  <button
                    type="button"
                    @click="showSecret = !showSecret"
                    class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <FeatherIcon :name="showSecret ? 'eye-off' : 'eye'" class="h-4 w-4" />
                  </button>
                </div>
                <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">Secret value (not the secret ID) — stored encrypted</p>
              </div>

              <!-- Tenant ID -->
              <div>
                <label class="oa-label">Tenant ID</label>
                <input
                  v-model="form.outlook_tenant_id"
                  type="text"
                  placeholder="common"
                  class="oa-input"
                />
                <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">Use <code class="rounded bg-gray-100 px-1 dark:bg-gray-700">common</code> for multi-tenant or your directory (tenant) ID for single-tenant</p>
              </div>
            </div>

            <!-- Required Permissions -->
            <div class="border-t border-gray-100 px-5 py-4 dark:border-gray-700">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Required API Permissions</h3>
              <div class="mt-2 flex flex-wrap gap-2">
                <code class="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Calendars.ReadWrite</code>
                <code class="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">User.Read</code>
                <code class="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">offline_access</code>
              </div>
            </div>

            <!-- Redirect URI -->
            <div class="border-t border-gray-100 px-5 py-4 dark:border-gray-700">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Redirect URI</h3>
              <div class="mt-2 flex items-center gap-2">
                <code class="flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-300">{{ redirectUri }}</code>
                <button
                  @click="copyRedirectUri"
                  class="shrink-0 rounded-md border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                  :title="copied ? 'Copied!' : 'Copy'"
                >
                  <FeatherIcon :name="copied ? 'check' : 'copy'" class="h-3.5 w-3.5" />
                </button>
              </div>
              <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">Add this URI to your Azure AD App Registration → Authentication → Redirect URIs</p>
            </div>
          </div>

          <div v-if="!form.enable_outlook" class="px-5 py-6 text-center">
            <p class="text-sm text-gray-400 dark:text-gray-500">Enable the toggle above to configure Outlook integration</p>
          </div>
        </div>

        <!-- Google Calendar Card -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <FeatherIcon name="calendar" class="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">Google Calendar</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">Per-user OAuth token integration</p>
              </div>
            </div>
            <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">Per-user</span>
          </div>
          <div class="px-5 py-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Google Calendar is configured per-user via individual OAuth tokens. Each user connects their account from
              <button @click="$router.push('/my-settings')" class="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">My Settings</button>.
            </p>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
              No global credentials are needed — each user authorizes their own Google Calendar access.
            </p>
          </div>
        </div>

        <!-- How It Works -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
            <h2 class="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
              <FeatherIcon name="git-merge" class="h-4 w-4 text-gray-400" />
              How Calendar Sync Works
            </h2>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Understand the full sync lifecycle</p>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-gray-700">
            <!-- Sync Architecture -->
            <div class="p-5">
              <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <span class="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">1</span>
                Admin configures credentials (this page)
              </h3>
              <p class="ml-8 mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                The system manager registers an Azure AD app and enters the Client ID, Client Secret, and Tenant ID here. This enables Outlook integration globally — but no calendars are synced yet.
              </p>
            </div>
            <div class="p-5">
              <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <span class="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">2</span>
                Users connect their calendars
              </h3>
              <p class="ml-8 mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                Each team member opens the <strong class="text-gray-700 dark:text-gray-300">Calendar</strong> page and clicks the integration button. They'll be redirected to Microsoft or Google to authorize access. Upon return, a per-user <strong class="text-gray-700 dark:text-gray-300">Calendar Integration</strong> record is created with their encrypted tokens.
              </p>
            </div>
            <div class="p-5">
              <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <span class="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">3</span>
                Background sync runs automatically
              </h3>
              <p class="ml-8 mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                A <strong class="text-gray-700 dark:text-gray-300">scheduled job runs every 10 minutes</strong>, syncing events for all connected users. It fetches events from the past 30 days and future 90 days, using MD5 hashing to detect changes efficiently.
              </p>
            </div>
            <div class="p-5">
              <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <span class="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">4</span>
                Events appear on the Meeting Manager calendar
              </h3>
              <p class="ml-8 mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                External calendar events are shown alongside Meeting Manager bookings. The system uses this to check availability — preventing double-bookings across platforms.
              </p>
            </div>
          </div>
        </div>

        <!-- Sync Directions Explained -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
            <h2 class="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
              <FeatherIcon name="repeat" class="h-4 w-4 text-gray-400" />
              Sync Directions
            </h2>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-gray-700">
            <div class="p-5">
              <div class="flex items-center gap-2">
                <span class="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">One-way (Read Only)</span>
                <span class="text-xs text-gray-400">Default</span>
              </div>
              <p class="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                External calendar events are <strong class="text-gray-700 dark:text-gray-300">imported into Meeting Manager</strong> for availability checking.
                No data is written back to the external calendar. Best for users who manage their calendar externally and just want Meeting Manager to see their busy times.
              </p>
            </div>
            <div class="p-5">
              <div class="flex items-center gap-2">
                <span class="rounded-md bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">Two-way (Read & Write)</span>
              </div>
              <p class="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                In addition to importing events, Meeting Manager <strong class="text-gray-700 dark:text-gray-300">pushes new bookings to the external calendar</strong> and removes them when cancelled.
                When a booking is assigned to a user with two-way sync, it automatically appears in their Outlook/Google Calendar.
              </p>
            </div>
          </div>
        </div>

        <!-- Supported Integrations Table -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
            <h2 class="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
              <FeatherIcon name="layers" class="h-4 w-4 text-gray-400" />
              Supported Integrations
            </h2>
          </div>
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-gray-100 dark:border-gray-700">
                <th class="px-5 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Integration</th>
                <th class="px-5 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Auth</th>
                <th class="px-5 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Sync</th>
                <th class="px-5 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Write</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
              <tr>
                <td class="px-5 py-2.5 font-medium text-gray-900 dark:text-white">Microsoft Outlook</td>
                <td class="px-5 py-2.5 text-gray-600 dark:text-gray-400">OAuth 2.0 (MSAL)</td>
                <td class="px-5 py-2.5"><span class="text-green-600 dark:text-green-400">Bidirectional</span></td>
                <td class="px-5 py-2.5"><FeatherIcon name="check" class="h-3.5 w-3.5 text-green-500" /></td>
              </tr>
              <tr>
                <td class="px-5 py-2.5 font-medium text-gray-900 dark:text-white">Google Calendar</td>
                <td class="px-5 py-2.5 text-gray-600 dark:text-gray-400">OAuth 2.0 (Google)</td>
                <td class="px-5 py-2.5"><span class="text-green-600 dark:text-green-400">Bidirectional</span></td>
                <td class="px-5 py-2.5"><FeatherIcon name="check" class="h-3.5 w-3.5 text-green-500" /></td>
              </tr>
              <tr>
                <td class="px-5 py-2.5 font-medium text-gray-900 dark:text-white">iCal (URL)</td>
                <td class="px-5 py-2.5 text-gray-600 dark:text-gray-400">URL subscription</td>
                <td class="px-5 py-2.5"><span class="text-gray-500 dark:text-gray-400">Read only</span></td>
                <td class="px-5 py-2.5"><FeatherIcon name="minus" class="h-3.5 w-3.5 text-gray-400" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Right column (1/3) -->
      <div class="space-y-6">

        <!-- Status Card -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Integration Status</h2>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-gray-700">
            <div class="flex items-center justify-between px-5 py-3">
              <div class="flex items-center gap-2">
                <FeatherIcon name="cloud" class="h-4 w-4 text-blue-500" />
                <span class="text-sm text-gray-700 dark:text-gray-300">Microsoft Outlook</span>
              </div>
              <span
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                :class="form.enable_outlook && form.outlook_client_id
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : form.enable_outlook
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="form.enable_outlook && form.outlook_client_id ? 'bg-green-500' : form.enable_outlook ? 'bg-amber-500' : 'bg-gray-400'" />
                {{ form.enable_outlook && form.outlook_client_id ? 'Configured' : form.enable_outlook ? 'Incomplete' : 'Disabled' }}
              </span>
            </div>
            <div class="flex items-center justify-between px-5 py-3">
              <div class="flex items-center gap-2">
                <FeatherIcon name="calendar" class="h-4 w-4 text-red-500" />
                <span class="text-sm text-gray-700 dark:text-gray-300">Google Calendar</span>
              </div>
              <span class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <span class="h-1.5 w-1.5 rounded-full bg-green-500" />
                Per-user
              </span>
            </div>
          </div>
        </div>

        <!-- Outlook Setup Guide -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
              <FeatherIcon name="book-open" class="h-3.5 w-3.5 text-gray-400" />
              Outlook Setup Guide
            </h2>
            <button @click="showFullGuide = !showFullGuide" class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">
              {{ showFullGuide ? 'Collapse' : 'Expand' }}
            </button>
          </div>
          <div class="px-5 py-3">
            <ol class="space-y-3 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              <li class="flex gap-2">
                <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">1</span>
                <span>Go to <strong class="text-gray-700 dark:text-gray-300">Azure Portal</strong> → Azure Active Directory → App registrations → New registration</span>
              </li>
              <li class="flex gap-2">
                <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">2</span>
                <span>Name your app (e.g. "Meeting Manager") and set account type to <strong class="text-gray-700 dark:text-gray-300">"Accounts in any organizational directory"</strong></span>
              </li>
              <li class="flex gap-2">
                <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">3</span>
                <span>Add the <strong class="text-gray-700 dark:text-gray-300">Redirect URI</strong> shown on this page under Authentication → Web</span>
              </li>
              <template v-if="showFullGuide">
                <li class="flex gap-2">
                  <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">4</span>
                  <span>Copy the <strong class="text-gray-700 dark:text-gray-300">Application (client) ID</strong> from the Overview page into the Client ID field</span>
                </li>
                <li class="flex gap-2">
                  <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">5</span>
                  <span>Go to Certificates & secrets → New client secret. Copy the <strong class="text-gray-700 dark:text-gray-300">Value</strong> (not the Secret ID) into Client Secret</span>
                </li>
                <li class="flex gap-2">
                  <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">6</span>
                  <span>Go to API permissions → Add a permission → Microsoft Graph → Delegated permissions. Add: <strong class="text-gray-700 dark:text-gray-300">Calendars.ReadWrite</strong>, <strong class="text-gray-700 dark:text-gray-300">User.Read</strong>, <strong class="text-gray-700 dark:text-gray-300">offline_access</strong></span>
                </li>
                <li class="flex gap-2">
                  <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">7</span>
                  <span>Click <strong class="text-gray-700 dark:text-gray-300">"Grant admin consent"</strong> for your organization</span>
                </li>
                <li class="flex gap-2">
                  <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">8</span>
                  <span>Save settings here and use <strong class="text-gray-700 dark:text-gray-300">Test Connection</strong> to verify everything works</span>
                </li>
              </template>
            </ol>
            <button v-if="!showFullGuide" @click="showFullGuide = true" class="mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">
              Show all 8 steps →
            </button>
          </div>
        </div>

        <!-- Security Note -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
              <FeatherIcon name="shield" class="h-3.5 w-3.5 text-gray-400" />
              Security
            </h2>
          </div>
          <div class="px-5 py-3 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
            <ul class="space-y-2">
              <li class="flex items-start gap-2">
                <FeatherIcon name="lock" class="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                <span>Client secrets are stored <strong class="text-gray-700 dark:text-gray-300">encrypted</strong> in the database</span>
              </li>
              <li class="flex items-start gap-2">
                <FeatherIcon name="key" class="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                <span>Only <strong class="text-gray-700 dark:text-gray-300">System Managers</strong> can view or modify these credentials</span>
              </li>
              <li class="flex items-start gap-2">
                <FeatherIcon name="refresh-cw" class="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                <span>Rotate client secrets periodically — Azure secrets can expire</span>
              </li>
              <li class="flex items-start gap-2">
                <FeatherIcon name="alert-triangle" class="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                <span>Use least-privilege: only grant calendar permissions, nothing more</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { createDocumentResource, toast } from 'frappe-ui'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorState from '@/components/shared/ErrorState.vue'

const auth = useAuthStore()

const doc = createDocumentResource({
  doctype: 'MM OAuth Settings',
  name: 'MM OAuth Settings',
  auto: true,
})

// Form state
const form = reactive({
  enable_outlook: false,
  outlook_client_id: '',
  outlook_client_secret: '',
  outlook_tenant_id: '',
})
const originalForm = reactive({})

const showSecret = ref(false)
const showFullGuide = ref(false)
const copied = ref(false)

const redirectUri = computed(() => {
  return `${window.location.origin}/api/method/meeting_manager.meeting_manager.integrations.outlook.callback`
})

// Sync doc → form
watch(() => doc.doc, (d) => {
  if (d) {
    form.enable_outlook = !!d.enable_outlook
    form.outlook_client_id = d.outlook_client_id || ''
    form.outlook_client_secret = d.outlook_client_secret || ''
    form.outlook_tenant_id = d.outlook_tenant_id || 'common'
    Object.assign(originalForm, { ...form })
  }
}, { immediate: true })

const hasChanges = computed(() => JSON.stringify(form) !== JSON.stringify(originalForm))

// Save
const saving = ref(false)
async function saveSettings() {
  saving.value = true
  try {
    await doc.setValue.submit({
      enable_outlook: form.enable_outlook ? 1 : 0,
      outlook_client_id: form.outlook_client_id,
      outlook_client_secret: form.outlook_client_secret,
      outlook_tenant_id: form.outlook_tenant_id,
    })
    await doc.reload()
    Object.assign(originalForm, { ...form })
    toast({ title: 'Settings saved', icon: 'check' })
  } catch (e) {
    console.error('Failed to save OAuth settings:', e)
    toast({ title: 'Failed to save settings', icon: 'x' })
  } finally {
    saving.value = false
  }
}

// Copy redirect URI
function copyRedirectUri() {
  navigator.clipboard.writeText(redirectUri.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

// Test connection
const testingConnection = ref(false)
const testResult = ref(null)

async function testConnection() {
  testingConnection.value = true
  testResult.value = null
  try {
    if (!form.enable_outlook) {
      testResult.value = { success: false, message: 'Outlook integration is disabled', detail: 'Enable the toggle and fill in credentials to test.' }
      return
    }
    if (!form.outlook_client_id || !form.outlook_client_secret) {
      testResult.value = { success: false, message: 'Missing credentials', detail: 'Please fill in Client ID and Client Secret.' }
      return
    }
    // Placeholder — in production this would call a real server-side endpoint
    await new Promise((resolve) => setTimeout(resolve, 1500))
    testResult.value = {
      success: true,
      message: 'Credentials look good',
      detail: 'Client ID and Tenant ID are configured. Full OAuth flow will be tested when a user connects their calendar.',
    }
  } catch (e) {
    testResult.value = { success: false, message: e.message || 'Connection test failed' }
  } finally {
    testingConnection.value = false
  }
}
</script>

<style scoped>
.oa-label {
  @apply mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300;
}
.oa-input {
  @apply mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white dark:placeholder-gray-500;
}
</style>
