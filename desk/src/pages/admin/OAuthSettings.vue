<template>
  <div class="flex h-full flex-col overflow-auto">
    <!-- Header -->
    <div class="flex flex-col gap-4 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-lg font-semibold text-gray-900 dark:text-white">OAuth Settings</h1>
        <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Configure calendar integration credentials
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="testConnection"
          :disabled="testingConnection"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-750"
        >
          <FeatherIcon name="zap" class="h-4 w-4" />
          {{ testingConnection ? 'Testing...' : 'Test Connection' }}
        </button>
        <button
          @click="saveSettings"
          :disabled="saving"
          class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          <FeatherIcon name="save" class="h-4 w-4" />
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-6">
      <!-- Not authorized -->
      <div
        v-if="!auth.isSystemManager"
        class="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950/20"
      >
        <FeatherIcon name="shield-off" class="mx-auto mb-3 h-10 w-10 text-red-400" />
        <h3 class="text-sm font-medium text-red-800 dark:text-red-300">Access Denied</h3>
        <p class="mt-1 text-sm text-red-600 dark:text-red-400">Only System Managers can access OAuth settings.</p>
      </div>

      <!-- Loading -->
      <LoadingSpinner v-else-if="doc.loading" />

      <!-- Error -->
      <ErrorState v-else-if="doc.error" :message="doc.error" @retry="doc.reload()" />

      <!-- Settings form -->
      <div v-else class="mx-auto max-w-2xl space-y-6">
        <!-- Test connection result -->
        <div
          v-if="testResult"
          class="rounded-lg border p-4"
          :class="testResult.success
            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
            : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20'"
        >
          <div class="flex items-center gap-2">
            <FeatherIcon
              :name="testResult.success ? 'check-circle' : 'x-circle'"
              class="h-5 w-5"
              :class="testResult.success ? 'text-green-500' : 'text-red-500'"
            />
            <p class="text-sm font-medium" :class="testResult.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'">
              {{ testResult.message }}
            </p>
          </div>
        </div>

        <!-- Outlook Settings Card -->
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="mb-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <FeatherIcon name="cloud" class="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">Microsoft Outlook / Office 365</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">Calendar integration via Microsoft Graph API</p>
              </div>
            </div>
            <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                v-model="form.enable_outlook"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              Enabled
            </label>
          </div>

          <div
            class="space-y-4 transition-opacity"
            :class="form.enable_outlook ? 'opacity-100' : 'pointer-events-none opacity-40'"
          >
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Client ID</label>
              <input
                v-model="form.outlook_client_id"
                type="text"
                placeholder="Application (client) ID from Azure AD"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Client Secret</label>
              <div class="relative mt-1">
                <input
                  v-model="form.outlook_client_secret"
                  :type="showSecret ? 'text' : 'password'"
                  placeholder="Client secret value"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
                <button
                  type="button"
                  @click="showSecret = !showSecret"
                  class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <FeatherIcon :name="showSecret ? 'eye-off' : 'eye'" class="h-4 w-4" />
                </button>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tenant ID</label>
              <input
                v-model="form.outlook_tenant_id"
                type="text"
                placeholder="Directory (tenant) ID from Azure AD"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>
          </div>

          <div v-if="form.enable_outlook" class="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
            <p class="text-xs text-blue-700 dark:text-blue-400">
              <strong>Setup guide:</strong> Register an application in Azure Active Directory, add the
              <code class="rounded bg-blue-100 px-1 dark:bg-blue-900/50">Calendars.ReadWrite</code> permission,
              and paste the credentials above.
            </p>
          </div>
        </div>

        <!-- Google Calendar Settings Card (placeholder for future) -->
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
              <FeatherIcon name="calendar" class="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">Google Calendar</h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">Google Calendar API integration</p>
            </div>
          </div>
          <div class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-800">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Google Calendar integration is configured via individual user OAuth tokens.
              Users can connect their Google Calendar from My Settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { createDocumentResource } from 'frappe-ui'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorState from '@/components/shared/ErrorState.vue'

const auth = useAuthStore()

// Single doctype - always named "MM OAuth Settings"
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

const showSecret = ref(false)

// Sync doc -> form
watch(() => doc.doc, (d) => {
  if (d) {
    form.enable_outlook = !!d.enable_outlook
    form.outlook_client_id = d.outlook_client_id || ''
    form.outlook_client_secret = d.outlook_client_secret || ''
    form.outlook_tenant_id = d.outlook_tenant_id || ''
  }
}, { immediate: true })

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
    doc.reload()
  } catch (e) {
    console.error('Failed to save OAuth settings:', e)
  } finally {
    saving.value = false
  }
}

// Test connection
const testingConnection = ref(false)
const testResult = ref(null)

async function testConnection() {
  testingConnection.value = true
  testResult.value = null
  try {
    // Placeholder - in production this would call a real endpoint
    await new Promise((resolve) => setTimeout(resolve, 1500))
    if (form.enable_outlook && form.outlook_client_id && form.outlook_client_secret && form.outlook_tenant_id) {
      testResult.value = { success: true, message: 'Outlook credentials are configured. Full connection test requires server-side validation.' }
    } else {
      testResult.value = { success: false, message: 'Please fill in all required Outlook fields and enable the integration.' }
    }
  } catch (e) {
    testResult.value = { success: false, message: e.message || 'Connection test failed' }
  } finally {
    testingConnection.value = false
  }
}
</script>
