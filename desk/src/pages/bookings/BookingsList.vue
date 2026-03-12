<template>
  <div class="relative flex h-full flex-col">
      <!-- Header -->
      <div class="flex flex-col gap-4 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-lg font-semibold text-gray-900 dark:text-white">Bookings</h1>
          <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {{ totalLabel }}
          </p>
        </div>
        <router-link
          to="/book"
          class="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          <FeatherIcon name="plus" class="h-4 w-4" />
          New Booking
        </router-link>
      </div>

      <!-- Filters -->
      <div class="border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-900">
        <!-- Mobile filter toggle -->
        <button
          @click="showFilters = !showFilters"
          class="mb-2 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 sm:hidden"
        >
          <FeatherIcon name="filter" class="h-4 w-4" />
          Filters
          <FeatherIcon :name="showFilters ? 'chevron-up' : 'chevron-down'" class="h-3 w-3" />
        </button>

        <div
          :class="[
            'flex flex-col gap-3 sm:flex sm:flex-row sm:flex-wrap sm:items-center',
            showFilters ? '' : 'hidden sm:flex',
          ]"
        >
          <!-- Search -->
          <div class="relative min-w-[200px] flex-1 sm:max-w-xs">
            <FeatherIcon
              name="search"
              class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search customer or reference..."
              class="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-gray-500 dark:focus:ring-gray-500"
            />
          </div>

          <!-- Status filter -->
          <div class="relative" ref="statusDropdownRef">
            <button
              @click="showStatusDropdown = !showStatusDropdown"
              class="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <FeatherIcon name="tag" class="h-3.5 w-3.5" />
              Status
              <span
                v-if="selectedStatuses.length"
                class="ml-0.5 rounded-full bg-gray-900 px-1.5 text-[10px] text-white dark:bg-gray-100 dark:text-gray-900"
              >
                {{ selectedStatuses.length }}
              </span>
              <FeatherIcon name="chevron-down" class="h-3 w-3" />
            </button>
            <div
              v-if="showStatusDropdown"
              class="absolute left-0 z-30 mt-1 max-h-64 w-64 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
            >
              <label
                v-for="status in BOOKING_STATUSES"
                :key="status"
                class="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <input
                  type="checkbox"
                  :checked="selectedStatuses.includes(status)"
                  @change="toggleStatus(status)"
                  class="h-3.5 w-3.5 rounded border-gray-300 text-gray-900 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-700"
                />
                {{ status }}
              </label>
              <div v-if="selectedStatuses.length" class="border-t border-gray-200 px-3 py-1.5 dark:border-gray-700">
                <button
                  @click="selectedStatuses = []; showStatusDropdown = false"
                  class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>

          <!-- Service type filter -->
          <select
            v-model="selectedServiceType"
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-gray-500 dark:focus:ring-gray-500"
          >
            <option value="">All Service Types</option>
            <option v-for="svc in SERVICE_TYPES" :key="svc" :value="svc">{{ svc }}</option>
          </select>

          <!-- Department filter (leaders/admins only) -->
          <select
            v-if="auth.isDepartmentLeader"
            v-model="selectedDepartment"
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-gray-500 dark:focus:ring-gray-500"
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

          <!-- Date range -->
          <div class="flex items-center gap-1.5">
            <input
              v-model="dateFrom"
              type="date"
              class="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-gray-500 dark:focus:ring-gray-500"
            />
            <span class="text-xs text-gray-400 dark:text-gray-500">to</span>
            <input
              v-model="dateTo"
              type="date"
              class="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-gray-500 dark:focus:ring-gray-500"
            />
          </div>

          <!-- Clear filters -->
          <button
            v-if="hasActiveFilters"
            @click="clearAllFilters"
            class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FeatherIcon name="x" class="h-3 w-3" />
            Clear filters
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-auto">
        <!-- Loading -->
        <LoadingSpinner v-if="bookings.loading && !bookings.data?.length" />

        <!-- Empty state -->
        <EmptyState
          v-else-if="!bookings.data?.length"
          icon="calendar"
          title="No bookings found"
          :description="hasActiveFilters ? 'Try adjusting your filters' : 'Create your first booking to get started'"
        >
          <template #action>
            <router-link
              v-if="!hasActiveFilters"
              to="/book"
              class="mt-3 inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              <FeatherIcon name="plus" class="h-4 w-4" />
              New Booking
            </router-link>
            <button
              v-else
              @click="clearAllFilters"
              class="mt-3 inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Clear filters
            </button>
          </template>
        </EmptyState>

        <!-- Desktop table -->
        <div v-else class="hidden sm:block">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th v-if="auth.isDepartmentLeader" class="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    :checked="allVisibleSelected"
                    :indeterminate="someVisibleSelected && !allVisibleSelected"
                    @change="toggleSelectAll"
                    class="h-3.5 w-3.5 rounded border-gray-300 text-gray-900 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Reference</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Customer / Title</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Date / Time</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Duration</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Assigned To</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Service Type</th>
                <th class="w-10 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr
                v-for="row in bookings.data"
                :key="row.name"
                @click="goToBooking(row.name)"
                class="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                :class="[
                  selectedRows.has(row.name) ? '!bg-blue-50 dark:!bg-blue-900/30' : '',
                ]"
              >
                <td v-if="auth.isDepartmentLeader" class="px-4 py-3" @click.stop>
                  <input
                    type="checkbox"
                    :checked="selectedRows.has(row.name)"
                    @change="toggleRowSelect(row.name)"
                    class="h-3.5 w-3.5 rounded border-gray-300 text-gray-900 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                  {{ row.booking_reference || row.name }}
                </td>
                <td class="px-4 py-3">
                  <div class="text-sm text-gray-900 dark:text-white">
                    {{ row.customer || row.meeting_title || '-' }}
                  </div>
                  <div v-if="row.customer_email_at_booking" class="text-xs text-gray-500 dark:text-gray-400">
                    {{ row.customer_email_at_booking }}
                  </div>
                </td>
                <td class="whitespace-nowrap px-4 py-3">
                  <StatusBadge :label="row.booking_status" :status="row.booking_status" />
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  <div>{{ formatDate(row.start_datetime) }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ formatTime(row.start_datetime) }} - {{ formatTime(row.end_datetime) }}</div>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {{ row.duration ? `${row.duration} min` : '-' }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {{ row._assigned_display || '-' }}
                </td>
                <td class="whitespace-nowrap px-4 py-3">
                  <span
                    v-if="row.select_mkru"
                    class="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  >
                    {{ row.select_mkru }}
                  </span>
                  <span v-else class="text-sm text-gray-400 dark:text-gray-500">-</span>
                </td>
                <td class="px-4 py-3 text-right" @click.stop>
                  <button
                    @click="goToBooking(row.name)"
                    class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  >
                    <FeatherIcon name="chevron-right" class="h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile card view -->
        <div v-if="bookings.data?.length" class="space-y-2 p-4 sm:hidden">
          <div
            v-for="row in bookings.data"
            :key="row.name"
            @click="goToBooking(row.name)"
            class="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
            :class="[selectedRows.has(row.name) ? '!border-blue-300 !bg-blue-50 dark:!border-blue-700 dark:!bg-blue-900/30' : '']"
          >
            <div class="flex items-start justify-between">
              <div class="flex items-start gap-2">
                <input
                  v-if="auth.isDepartmentLeader"
                  type="checkbox"
                  :checked="selectedRows.has(row.name)"
                  @change.stop="toggleRowSelect(row.name)"
                  @click.stop
                  class="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-gray-900 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ row.customer || row.meeting_title || row.booking_reference || row.name }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {{ row.booking_reference || row.name }}
                  </p>
                </div>
              </div>
              <StatusBadge :label="row.booking_status" :status="row.booking_status" />
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
              <span class="flex items-center gap-1">
                <FeatherIcon name="calendar" class="h-3 w-3" />
                {{ formatDate(row.start_datetime) }}
              </span>
              <span class="flex items-center gap-1">
                <FeatherIcon name="clock" class="h-3 w-3" />
                {{ formatTime(row.start_datetime) }} - {{ formatTime(row.end_datetime) }}
              </span>
              <span v-if="row.duration">{{ row.duration }} min</span>
              <span
                v-if="row.select_mkru"
                class="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800 dark:text-gray-400"
              >
                {{ row.select_mkru }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="bookings.data?.length"
        class="flex flex-col items-center justify-between gap-3 border-t border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-900 sm:flex-row"
      >
        <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Show</span>
          <select
            :value="pageLength"
            @change="changePageLength(Number($event.target.value))"
            class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
          <span>per page</span>
        </div>

        <div class="flex items-center gap-1">
          <button
            @click="goToPage(1)"
            :disabled="currentPage <= 1"
            class="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <FeatherIcon name="chevrons-left" class="h-4 w-4" />
          </button>
          <button
            @click="goToPage(currentPage - 1)"
            :disabled="currentPage <= 1"
            class="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <FeatherIcon name="chevron-left" class="h-4 w-4" />
          </button>
          <span class="px-3 text-sm text-gray-700 dark:text-gray-300">
            Page {{ currentPage }} of {{ totalPages }}
          </span>
          <button
            @click="goToPage(currentPage + 1)"
            :disabled="currentPage >= totalPages"
            class="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <FeatherIcon name="chevron-right" class="h-4 w-4" />
          </button>
          <button
            @click="goToPage(totalPages)"
            :disabled="currentPage >= totalPages"
            class="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <FeatherIcon name="chevrons-right" class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Loading overlay for pagination/filter changes -->
      <div
        v-if="bookings.loading && bookings.data?.length"
        class="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-950/50"
      >
        <LoadingSpinner size="lg" />
      </div>

      <!-- Floating Bulk Action Bar -->
      <BulkActionBar
        v-if="auth.isDepartmentLeader"
        :selected-count="selectedRows.size"
        :all-selected="allVisibleSelected"
        @select-all="selectAllRows"
        @deselect-all="deselectAllRows"
      >
        <template #actions>
          <Menu as="div" class="relative">
            <MenuButton class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
              <FeatherIcon name="more-horizontal" class="h-4 w-4" />
            </MenuButton>
            <MenuItems class="absolute bottom-full left-0 mb-1 w-48 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <!-- Change Status submenu -->
              <MenuItem v-slot="{ active }">
                <button
                  @click="applyBulkStatus('Confirmed')"
                  :class="active ? 'bg-gray-100 dark:bg-gray-700' : ''"
                  class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <FeatherIcon name="check-circle" class="h-4 w-4" />
                  Confirmed
                </button>
              </MenuItem>
              <MenuItem v-slot="{ active }">
                <button
                  @click="applyBulkStatus('Completed')"
                  :class="active ? 'bg-gray-100 dark:bg-gray-700' : ''"
                  class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <FeatherIcon name="check-circle" class="h-4 w-4" />
                  Completed
                </button>
              </MenuItem>
              <MenuItem v-slot="{ active }">
                <button
                  @click="applyBulkStatus('Cancelled')"
                  :class="active ? 'bg-gray-100 dark:bg-gray-700' : ''"
                  class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <FeatherIcon name="x-circle" class="h-4 w-4" />
                  Cancelled
                </button>
              </MenuItem>
              <MenuItem v-slot="{ active }">
                <button
                  @click="applyBulkStatus('No-Show')"
                  :class="active ? 'bg-gray-100 dark:bg-gray-700' : ''"
                  class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <FeatherIcon name="user-x" class="h-4 w-4" />
                  No-Show
                </button>
              </MenuItem>

              <!-- Divider -->
              <div class="my-1 border-t border-gray-200 dark:border-gray-700"></div>

              <!-- Delete -->
              <MenuItem v-slot="{ active }">
                <button
                  @click="bulkDelete"
                  :class="active ? 'bg-red-50 dark:bg-red-900/30' : ''"
                  class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 dark:text-red-400"
                >
                  <FeatherIcon name="trash-2" class="h-4 w-4" />
                  Delete
                </button>
              </MenuItem>
            </MenuItems>
          </Menu>
        </template>
      </BulkActionBar>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { createListResource, call } from 'frappe-ui'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { useAuthStore } from '@/stores/auth'
import StatusBadge from '@/components/shared/StatusBadge.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import BulkActionBar from '@/components/shared/BulkActionBar.vue'

const router = useRouter()
const auth = useAuthStore()

// --- Constants ---
const BOOKING_STATUSES = [
  'New Appointment',
  'New Booking',
  'Booking Started',
  'Sale Approved',
  'Booking Approved Not Sale',
  'Call Customer About Sale',
  'No Answer 1',
  'No Answer 2',
  'No Answer 3',
  'No Answer 4-5',
  'Customer Unsure',
  'No Contact About Offer',
  'Cancelled',
  'Optimising Not Possible',
  'Not Possible',
  'Rebook',
  'Rebook Earlier',
  'Consent Sent Awaiting',
]

const SERVICE_TYPES = [
  'Business',
  'Business Extended',
  'Business Rebook',
  'New Setup Business',
  'Private/Business Customer',
  'Private New Sale',
  'Private Self Book',
  'Microsoft 365 Backup',
  'Website Security',
]

// --- Filter state ---
const searchQuery = ref('')
const selectedStatuses = ref([])
const selectedServiceType = ref('')
const selectedDepartment = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const showFilters = ref(false)
const showStatusDropdown = ref(false)
const statusDropdownRef = ref(null)

// --- Pagination state ---
const pageLength = ref(20)
const currentPage = ref(1)

// --- Selection state ---
const selectedRows = ref(new Set())

// --- Debounced search ---
let searchTimeout = null
const debouncedSearch = ref('')
watch(searchQuery, (val) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = val
    currentPage.value = 1
  }, 300)
})

// --- Computed filters ---
const computedFilters = computed(() => {
  const filters = {}

  if (selectedStatuses.value.length === 1) {
    filters.booking_status = selectedStatuses.value[0]
  } else if (selectedStatuses.value.length > 1) {
    filters.booking_status = ['in', selectedStatuses.value]
  }

  if (selectedServiceType.value) {
    filters.select_mkru = selectedServiceType.value
  }

  if (debouncedSearch.value) {
    const q = `%${debouncedSearch.value}%`
    filters.booking_reference = ['like', q]
    // We apply an or_filters approach via the backend; for createListResource,
    // we search on booking_reference. Customer name search handled below.
  }

  if (dateFrom.value) {
    filters.start_datetime = ['>=', `${dateFrom.value} 00:00:00`]
  }
  if (dateTo.value) {
    if (filters.start_datetime) {
      // Need both >= and <= so use between-like approach
      filters.start_datetime = ['between', [`${dateFrom.value} 00:00:00`, `${dateTo.value} 23:59:59`]]
    } else {
      filters.start_datetime = ['<=', `${dateTo.value} 23:59:59`]
    }
  }

  return filters
})

const hasActiveFilters = computed(() => {
  return (
    searchQuery.value ||
    selectedStatuses.value.length > 0 ||
    selectedServiceType.value ||
    selectedDepartment.value ||
    dateFrom.value ||
    dateTo.value
  )
})

// --- List resource ---
const bookings = createListResource({
  doctype: 'MM Meeting Booking',
  fields: [
    'name',
    'booking_reference',
    'meeting_title',
    'booking_status',
    'start_datetime',
    'end_datetime',
    'duration',
    'customer',
    'customer_email_at_booking',
    'is_internal',
    'select_mkru',
    'booking_source',
    'status_color',
  ],
  filters: computedFilters,
  orderBy: 'start_datetime desc',
  pageLength: pageLength,
  start: computed(() => (currentPage.value - 1) * pageLength.value),
  auto: true,
})

// --- Derived data ---
const totalCount = computed(() => bookings.totalCount ?? bookings.data?.length ?? 0)
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageLength.value)))

const totalLabel = computed(() => {
  const count = totalCount.value
  if (bookings.loading && !bookings.data?.length) return 'Loading...'
  return `${count} booking${count !== 1 ? 's' : ''}${hasActiveFilters.value ? ' (filtered)' : ''}`
})

const allVisibleSelected = computed(() => {
  if (!bookings.data?.length) return false
  return bookings.data.every((row) => selectedRows.value.has(row.name))
})

const someVisibleSelected = computed(() => {
  if (!bookings.data?.length) return false
  return bookings.data.some((row) => selectedRows.value.has(row.name))
})

// --- Methods ---
function goToBooking(id) {
  router.push(`/bookings/${id}`)
}

function toggleStatus(status) {
  const idx = selectedStatuses.value.indexOf(status)
  if (idx >= 0) {
    selectedStatuses.value.splice(idx, 1)
  } else {
    selectedStatuses.value.push(status)
  }
  currentPage.value = 1
}

function clearAllFilters() {
  searchQuery.value = ''
  debouncedSearch.value = ''
  selectedStatuses.value = []
  selectedServiceType.value = ''
  selectedDepartment.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  currentPage.value = 1
}

function changePageLength(val) {
  pageLength.value = val
  currentPage.value = 1
}

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  selectedRows.value.clear()
}

function toggleSelectAll() {
  if (allVisibleSelected.value) {
    bookings.data.forEach((row) => selectedRows.value.delete(row.name))
  } else {
    bookings.data.forEach((row) => selectedRows.value.add(row.name))
  }
}

function selectAllRows() {
  if (bookings.data?.length) {
    bookings.data.forEach((row) => selectedRows.value.add(row.name))
  }
}

function deselectAllRows() {
  selectedRows.value.clear()
}

function toggleRowSelect(name) {
  if (selectedRows.value.has(name)) {
    selectedRows.value.delete(name)
  } else {
    selectedRows.value.add(name)
  }
}

async function applyBulkStatus(status) {
  if (!status || selectedRows.value.size === 0) return

  const names = Array.from(selectedRows.value)
  try {
    for (const name of names) {
      await call('frappe.client.set_value', {
        doctype: 'MM Meeting Booking',
        name: name,
        fieldname: 'booking_status',
        value: status,
      })
    }
    selectedRows.value.clear()
    bookings.reload()
  } catch (e) {
    console.error('Bulk status change failed:', e)
  }
}

async function bulkDelete() {
  if (selectedRows.value.size === 0) return

  if (!confirm(`Are you sure you want to delete ${selectedRows.value.size} booking(s)? This action cannot be undone.`)) {
    return
  }

  const names = Array.from(selectedRows.value)
  try {
    for (const name of names) {
      await call('frappe.client.delete', {
        doctype: 'MM Meeting Booking',
        name: name,
      })
    }
    selectedRows.value.clear()
    bookings.reload()
  } catch (e) {
    console.error('Bulk delete failed:', e)
  }
}

function formatDate(datetime) {
  if (!datetime) return '-'
  const d = new Date(datetime)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(datetime) {
  if (!datetime) return ''
  const d = new Date(datetime)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// --- Close status dropdown on outside click ---
function handleClickOutside(event) {
  if (statusDropdownRef.value && !statusDropdownRef.value.contains(event.target)) {
    showStatusDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  clearTimeout(searchTimeout)
})

// --- Reset page on filter changes ---
watch([selectedStatuses, selectedServiceType, selectedDepartment, dateFrom, dateTo], () => {
  currentPage.value = 1
  selectedRows.value.clear()
})
</script>
