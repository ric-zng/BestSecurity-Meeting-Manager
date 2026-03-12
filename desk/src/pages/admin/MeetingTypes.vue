<template>
  <div class="flex h-full flex-col">
    <!-- Header -->
    <div class="flex flex-col gap-4 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-lg font-semibold text-gray-900 dark:text-white">Meeting Types</h1>
        <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{{ totalLabel }}</p>
      </div>
      <button
        @click="showNewModal = true"
        class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        <FeatherIcon name="plus" class="h-4 w-4" />
        New Meeting Type
      </button>
    </div>

    <!-- Filters -->
    <div class="border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-900">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <!-- Search -->
        <div class="relative min-w-[200px] flex-1 sm:max-w-xs">
          <FeatherIcon
            name="search"
            class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search meeting types..."
            class="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        <!-- Department filter -->
        <select
          v-model="selectedDepartment"
          class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="">All Departments</option>
          <option
            v-for="dept in auth.accessibleDepartments"
            :key="dept.name"
            :value="dept.name"
          >
            {{ dept.department_name }}
          </option>
        </select>

        <!-- Active filter -->
        <select
          v-model="activeFilter"
          class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="">All Status</option>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>

        <!-- Clear -->
        <button
          v-if="hasActiveFilters"
          @click="clearFilters"
          class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <FeatherIcon name="x" class="h-3 w-3" />
          Clear filters
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto">
      <LoadingSpinner v-if="meetingTypes.loading && !meetingTypes.data?.length" />

      <ErrorState
        v-else-if="meetingTypes.error"
        :message="meetingTypes.error"
        @retry="meetingTypes.reload()"
      />

      <EmptyState
        v-else-if="!meetingTypes.data?.length"
        icon="video"
        title="No meeting types found"
        :description="hasActiveFilters ? 'Try adjusting your filters' : 'Create your first meeting type to get started'"
      >
        <template #action>
          <button
            v-if="!hasActiveFilters"
            @click="showNewModal = true"
            class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <FeatherIcon name="plus" class="h-4 w-4" />
            New Meeting Type
          </button>
          <button
            v-else
            @click="clearFilters"
            class="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Clear filters
          </button>
        </template>
      </EmptyState>

      <!-- Desktop table -->
      <div v-else class="hidden sm:block">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50 text-left dark:border-gray-800 dark:bg-gray-900/50">
              <th class="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Name</th>
              <th class="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Department</th>
              <th class="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Duration</th>
              <th class="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Location</th>
              <th class="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Visibility</th>
              <th class="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
              <th class="w-10 px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(mt, idx) in meetingTypes.data"
              :key="mt.name"
              @click="goToMeetingType(mt.name)"
              class="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800/50 dark:hover:bg-gray-800/50"
              :class="idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-900/70'"
            >
              <td class="px-4 py-3">
                <div class="text-sm font-medium text-gray-900 dark:text-white">{{ mt.meeting_name }}</div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                {{ mt.department || '-' }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                {{ mt.duration ? `${mt.duration} min` : '-' }}
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {{ mt.location_type || '-' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-1.5">
                  <span
                    v-if="mt.is_public"
                    class="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  >
                    Public
                  </span>
                  <span
                    v-if="mt.is_internal"
                    class="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                  >
                    Internal
                  </span>
                  <span
                    v-if="!mt.is_public && !mt.is_internal"
                    class="text-xs text-gray-400 dark:text-gray-500"
                  >
                    -
                  </span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="mt.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'"
                >
                  {{ mt.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <FeatherIcon name="chevron-right" class="h-4 w-4 text-gray-400" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile card view -->
      <div v-if="meetingTypes.data?.length" class="space-y-2 p-4 sm:hidden">
        <div
          v-for="mt in meetingTypes.data"
          :key="mt.name"
          @click="goToMeetingType(mt.name)"
          class="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ mt.meeting_name }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ mt.department || 'No department' }}</p>
            </div>
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              :class="mt.is_active
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'"
            >
              {{ mt.is_active ? 'Active' : 'Inactive' }}
            </span>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span v-if="mt.duration" class="flex items-center gap-1">
              <FeatherIcon name="clock" class="h-3 w-3" />
              {{ mt.duration }} min
            </span>
            <span class="flex items-center gap-1">
              <FeatherIcon name="map-pin" class="h-3 w-3" />
              {{ mt.location_type || '-' }}
            </span>
            <span v-if="mt.is_public" class="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Public</span>
            <span v-if="mt.is_internal" class="rounded bg-purple-100 px-1.5 py-0.5 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Internal</span>
          </div>
        </div>
      </div>
    </div>

    <!-- New Meeting Type Modal -->
    <teleport to="body">
      <div
        v-if="showNewModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showNewModal = false"
      >
        <div class="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">New Meeting Type</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Create a new meeting type</p>

          <div class="mt-4 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Meeting Name</label>
              <input
                v-model="newMT.meeting_name"
                type="text"
                placeholder="e.g. Initial Consultation"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
              <select
                v-model="newMT.department"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Select a department</option>
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
                v-model.number="newMT.duration"
                type="number"
                min="5"
                step="5"
                placeholder="30"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Location Type</label>
              <select
                v-model="newMT.location_type"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="Video Call">Video Call</option>
                <option value="Phone Call">Phone Call</option>
                <option value="Physical Location">Physical Location</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
          </div>

          <div class="mt-6 flex items-center justify-end gap-3">
            <button
              @click="showNewModal = false"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-750"
            >
              Cancel
            </button>
            <button
              @click="createMeetingType"
              :disabled="creatingMT"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {{ creatingMT ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createListResource, call } from 'frappe-ui'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import ErrorState from '@/components/shared/ErrorState.vue'

const router = useRouter()
const auth = useAuthStore()

// Filter state
const searchQuery = ref('')
const selectedDepartment = ref('')
const activeFilter = ref('')
let searchTimeout = null
const debouncedSearch = ref('')

watch(searchQuery, (val) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = val
  }, 300)
})

const hasActiveFilters = computed(() => searchQuery.value || selectedDepartment.value || activeFilter.value !== '')

const computedFilters = computed(() => {
  const filters = {}
  if (debouncedSearch.value) {
    filters.meeting_name = ['like', `%${debouncedSearch.value}%`]
  }
  if (selectedDepartment.value) {
    filters.department = selectedDepartment.value
  }
  if (activeFilter.value !== '') {
    filters.is_active = parseInt(activeFilter.value)
  }
  return filters
})

// List resource
const meetingTypes = createListResource({
  doctype: 'MM Meeting Type',
  fields: ['name', 'meeting_name', 'department', 'duration', 'is_active', 'is_public', 'is_internal', 'location_type'],
  filters: computedFilters,
  orderBy: 'meeting_name asc',
  pageLength: 50,
  auto: true,
})

const totalLabel = computed(() => {
  if (meetingTypes.loading && !meetingTypes.data?.length) return 'Loading...'
  const count = meetingTypes.data?.length ?? 0
  return `${count} meeting type${count !== 1 ? 's' : ''}${hasActiveFilters.value ? ' (filtered)' : ''}`
})

// New meeting type modal
const showNewModal = ref(false)
const creatingMT = ref(false)
const newMT = ref({
  meeting_name: '',
  department: '',
  duration: 30,
  location_type: 'Video Call',
})

async function createMeetingType() {
  if (!newMT.value.meeting_name) return
  creatingMT.value = true
  try {
    const doc = await call('frappe.client.insert', {
      doc: {
        doctype: 'MM Meeting Type',
        meeting_name: newMT.value.meeting_name,
        department: newMT.value.department,
        duration: newMT.value.duration,
        location_type: newMT.value.location_type,
        is_active: 1,
      },
    })
    showNewModal.value = false
    newMT.value = { meeting_name: '', department: '', duration: 30, location_type: 'Video Call' }
    router.push(`/meeting-types/${doc.name}`)
  } catch (e) {
    console.error('Failed to create meeting type:', e)
  } finally {
    creatingMT.value = false
  }
}

function goToMeetingType(name) {
  router.push(`/meeting-types/${name}`)
}

function clearFilters() {
  searchQuery.value = ''
  debouncedSearch.value = ''
  selectedDepartment.value = ''
  activeFilter.value = ''
}
</script>
