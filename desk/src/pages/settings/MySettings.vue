<template>
  <AppLayout>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
      <!-- Loading -->
      <LoadingSpinner v-if="loading" fullPage />

      <!-- Error -->
      <ErrorState
        v-else-if="error"
        :message="error"
        @retry="loadSettings"
      />

      <!-- Content -->
      <div v-else class="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">My Settings</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your personal preferences and working hours.
          </p>
        </div>

        <!-- Profile Card -->
        <div class="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">Profile</h2>
          </div>
          <div class="space-y-4 p-5">
            <!-- Timezone -->
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Timezone
              </label>
              <select
                v-model="form.timezone"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">-- Select timezone --</option>
                <option v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</option>
              </select>
            </div>

            <!-- Bio -->
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bio
              </label>
              <textarea
                v-model="form.bio"
                rows="3"
                placeholder="Tell us a little about yourself..."
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>

        <!-- Working Hours Card -->
        <div class="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">Working Hours</h2>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Define your typical working hours for each day of the week.
            </p>
          </div>
          <div class="overflow-x-auto p-5">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700">
                  <th class="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">Day</th>
                  <th class="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">Start</th>
                  <th class="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">End</th>
                  <th class="pb-2 text-center font-medium text-gray-500 dark:text-gray-400">Active</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(day, index) in workingHours"
                  :key="day.day"
                  class="border-b border-gray-100 last:border-0 dark:border-gray-800"
                  :class="{ 'opacity-40': !day.active }"
                >
                  <td class="py-3 pr-4 font-medium text-gray-900 dark:text-white">
                    {{ day.day }}
                  </td>
                  <td class="py-3 pr-4">
                    <input
                      v-model="workingHours[index].start"
                      type="time"
                      :disabled="!day.active"
                      class="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-700"
                    />
                  </td>
                  <td class="py-3 pr-4">
                    <input
                      v-model="workingHours[index].end"
                      type="time"
                      :disabled="!day.active"
                      class="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-700"
                    />
                  </td>
                  <td class="py-3 text-center">
                    <button
                      @click="workingHours[index].active = !workingHours[index].active"
                      class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                      :class="day.active ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
                      role="switch"
                      :aria-checked="day.active"
                    >
                      <span
                        class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                        :class="day.active ? 'translate-x-4' : 'translate-x-0'"
                      />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Save -->
        <div class="flex items-center justify-between">
          <p v-if="saveMessage" class="text-sm" :class="saveMessageClass">{{ saveMessage }}</p>
          <div v-else />
          <button
            @click="saveSettings"
            :disabled="saving"
            class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-950"
          >
            <FeatherIcon v-if="saving" name="loader" class="h-4 w-4 animate-spin" />
            <FeatherIcon v-else name="save" class="h-4 w-4" />
            {{ saving ? 'Saving...' : 'Save Settings' }}
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { call } from 'frappe-ui'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/layouts/AppLayout.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorState from '@/components/shared/ErrorState.vue'

const auth = useAuthStore()

const loading = ref(true)
const error = ref(null)
const saving = ref(false)
const saveMessage = ref('')
const saveMessageClass = ref('')
const settingsDocName = ref(null)

const timezones = [
  'Europe/Copenhagen',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Paris',
  'Europe/Amsterdam',
  'Europe/Stockholm',
  'Europe/Oslo',
  'Europe/Helsinki',
  'Europe/Zurich',
  'Europe/Vienna',
  'Europe/Warsaw',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Athens',
  'Europe/Bucharest',
  'Europe/Moscow',
  'Europe/Istanbul',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
]

const form = reactive({
  timezone: '',
  bio: '',
})

const DEFAULT_HOURS = [
  { day: 'Monday', start: '09:00', end: '17:00', active: true },
  { day: 'Tuesday', start: '09:00', end: '17:00', active: true },
  { day: 'Wednesday', start: '09:00', end: '17:00', active: true },
  { day: 'Thursday', start: '09:00', end: '17:00', active: true },
  { day: 'Friday', start: '09:00', end: '17:00', active: true },
  { day: 'Saturday', start: '09:00', end: '17:00', active: false },
  { day: 'Sunday', start: '09:00', end: '17:00', active: false },
]

const workingHours = reactive([...DEFAULT_HOURS.map(d => ({ ...d }))])

function parseWorkingHours(json) {
  if (!json) return
  try {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json
    if (Array.isArray(parsed)) {
      parsed.forEach((item, i) => {
        if (i < workingHours.length) {
          workingHours[i].start = item.start || '09:00'
          workingHours[i].end = item.end || '17:00'
          workingHours[i].active = item.active !== undefined ? item.active : true
        }
      })
    }
  } catch (e) {
    console.warn('Failed to parse working hours JSON:', e)
  }
}

function serializeWorkingHours() {
  return JSON.stringify(
    workingHours.map(d => ({
      day: d.day,
      start: d.start,
      end: d.end,
      active: d.active,
    }))
  )
}

async function loadSettings() {
  loading.value = true
  error.value = null
  try {
    // Find the user's settings doc
    const list = await call('frappe.client.get_list', {
      doctype: 'MM User Settings',
      filters: { user: auth.user },
      fields: ['name'],
      limit_page_length: 1,
    })

    if (list && list.length > 0) {
      settingsDocName.value = list[0].name
      const doc = await call('frappe.client.get', {
        doctype: 'MM User Settings',
        name: settingsDocName.value,
      })
      form.timezone = doc.timezone || ''
      form.bio = doc.bio || ''
      parseWorkingHours(doc.working_hours_json)
    } else {
      // No settings doc yet; will create on save
      settingsDocName.value = null
    }
  } catch (e) {
    error.value = e.message || 'Failed to load settings'
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  saving.value = true
  saveMessage.value = ''
  try {
    const values = {
      timezone: form.timezone,
      bio: form.bio,
      working_hours_json: serializeWorkingHours(),
    }

    if (settingsDocName.value) {
      await call('frappe.client.set_value', {
        doctype: 'MM User Settings',
        name: settingsDocName.value,
        fieldname: values,
      })
    } else {
      const newDoc = await call('frappe.client.insert', {
        doc: {
          doctype: 'MM User Settings',
          user: auth.user,
          ...values,
        },
      })
      settingsDocName.value = newDoc.name
    }

    saveMessage.value = 'Settings saved successfully.'
    saveMessageClass.value = 'text-emerald-600 dark:text-emerald-400'
  } catch (e) {
    saveMessage.value = e.message || 'Failed to save settings.'
    saveMessageClass.value = 'text-red-600 dark:text-red-400'
  } finally {
    saving.value = false
    setTimeout(() => { saveMessage.value = '' }, 4000)
  }
}

onMounted(async () => {
  if (!auth.isInitialized) {
    await auth.initialize()
  }
  await loadSettings()
})
</script>
