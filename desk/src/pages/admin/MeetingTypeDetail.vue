<template>
  <div class="flex h-full flex-col overflow-auto">
    <!-- Header -->
    <div class="flex flex-col gap-4 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <button
          @click="router.push('/meeting-types')"
          class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <FeatherIcon name="arrow-left" class="h-5 w-5" />
        </button>
        <div>
          <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ doc.doc?.meeting_name || 'Meeting Type' }}
          </h1>
          <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{{ id }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="saveMeetingType"
          :disabled="saving"
          class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          <FeatherIcon name="save" class="h-4 w-4" />
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
        <button
          @click="showDeleteModal = true"
          class="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          <FeatherIcon name="trash-2" class="h-4 w-4" />
          Delete
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-6">
      <LoadingSpinner v-if="doc.loading" />
      <ErrorState v-else-if="doc.error" :message="doc.error" @retry="doc.reload()" />

      <div v-else-if="doc.doc" class="mx-auto max-w-4xl space-y-6">
        <!-- Basic Info Card -->
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <h2 class="mb-4 text-base font-semibold text-gray-900 dark:text-white">Basic Information</h2>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Meeting Name</label>
              <input
                v-model="form.meeting_name"
                type="text"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Slug</label>
              <input
                v-model="form.meeting_slug"
                type="text"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
              <select
                v-model="form.department"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">No department</option>
                <option
                  v-for="dept in auth.accessibleDepartments"
                  :key="dept.name"
                  :value="dept.name"
                >
                  {{ dept.department_name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Duration (minutes)</label>
              <input
                v-model.number="form.duration"
                type="number"
                min="5"
                step="5"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                v-model="form.description"
                rows="3"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        <!-- Location Card -->
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <h2 class="mb-4 text-base font-semibold text-gray-900 dark:text-white">Location Settings</h2>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Location Type</label>
              <select
                v-model="form.location_type"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="Video Call">Video Call</option>
                <option value="Phone Call">Phone Call</option>
                <option value="Physical Location">Physical Location</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            <div v-if="form.location_type === 'Video Call'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Video Platform</label>
              <select
                v-model="form.video_platform"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Select platform</option>
                <option value="Google Meet">Google Meet</option>
                <option value="Zoom">Zoom</option>
                <option value="Microsoft Teams">Microsoft Teams</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            <div v-if="form.location_type === 'Custom' || form.location_type === 'Physical Location'" class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Custom Location</label>
              <input
                v-model="form.custom_location"
                type="text"
                placeholder="e.g. Conference Room A or custom URL"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        <!-- Visibility & Options Card -->
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <h2 class="mb-4 text-base font-semibold text-gray-900 dark:text-white">Visibility & Options</h2>
          <div class="flex flex-wrap items-center gap-6">
            <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                v-model="form.is_active"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              Active
            </label>
            <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                v-model="form.is_public"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              Public
            </label>
            <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                v-model="form.is_internal"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              Internal
            </label>
            <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                v-model="form.requires_approval"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              Requires Approval
            </label>
          </div>
        </div>

        <!-- Public Booking URL Card -->
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <h2 class="mb-4 text-base font-semibold text-gray-900 dark:text-white">Public Booking URL</h2>
          <div class="flex items-center gap-2">
            <input
              :value="doc.doc.public_booking_url || 'Not generated yet'"
              readonly
              class="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            />
            <button
              @click="copyUrl(doc.doc.public_booking_url)"
              :disabled="!doc.doc.public_booking_url"
              class="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              title="Copy URL"
            >
              <FeatherIcon :name="copied ? 'check' : 'copy'" class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <teleport to="body">
      <div
        v-if="showDeleteModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showDeleteModal = false"
      >
        <div class="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Delete Meeting Type</h3>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Are you sure you want to delete "{{ doc.doc?.meeting_name }}"? This action cannot be undone.
          </p>
          <div class="mt-6 flex items-center justify-end gap-3">
            <button
              @click="showDeleteModal = false"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              @click="deleteMeetingType"
              :disabled="deleting"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createDocumentResource } from 'frappe-ui'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorState from '@/components/shared/ErrorState.vue'

const props = defineProps({ id: String })
const router = useRouter()
const auth = useAuthStore()

// Document resource
const doc = createDocumentResource({
  doctype: 'MM Meeting Type',
  name: props.id,
  auto: true,
})

// Form state
const form = reactive({
  meeting_name: '',
  meeting_slug: '',
  department: '',
  duration: 30,
  description: '',
  location_type: 'Video Call',
  video_platform: '',
  custom_location: '',
  is_active: true,
  is_public: false,
  is_internal: false,
  requires_approval: false,
})

// Sync doc -> form
watch(() => doc.doc, (d) => {
  if (d) {
    form.meeting_name = d.meeting_name || ''
    form.meeting_slug = d.meeting_slug || ''
    form.department = d.department || ''
    form.duration = d.duration || 30
    form.description = d.description || ''
    form.location_type = d.location_type || 'Video Call'
    form.video_platform = d.video_platform || ''
    form.custom_location = d.custom_location || ''
    form.is_active = !!d.is_active
    form.is_public = !!d.is_public
    form.is_internal = !!d.is_internal
    form.requires_approval = !!d.requires_approval
  }
}, { immediate: true })

// Save
const saving = ref(false)
async function saveMeetingType() {
  saving.value = true
  try {
    await doc.setValue.submit({
      meeting_name: form.meeting_name,
      meeting_slug: form.meeting_slug,
      department: form.department,
      duration: form.duration,
      description: form.description,
      location_type: form.location_type,
      video_platform: form.video_platform,
      custom_location: form.custom_location,
      is_active: form.is_active ? 1 : 0,
      is_public: form.is_public ? 1 : 0,
      is_internal: form.is_internal ? 1 : 0,
      requires_approval: form.requires_approval ? 1 : 0,
    })
    doc.reload()
  } catch (e) {
    console.error('Failed to save meeting type:', e)
  } finally {
    saving.value = false
  }
}

// Delete
const showDeleteModal = ref(false)
const deleting = ref(false)

async function deleteMeetingType() {
  deleting.value = true
  try {
    await doc.delete.submit()
    router.push('/meeting-types')
  } catch (e) {
    console.error('Failed to delete meeting type:', e)
  } finally {
    deleting.value = false
  }
}

// Copy URL
const copied = ref(false)
function copyUrl(url) {
  if (!url) return
  navigator.clipboard.writeText(url)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>
