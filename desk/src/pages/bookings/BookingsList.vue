<template>
  <div class="relative flex h-full flex-col bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-800">
      <div>
        <h1 class="text-lg font-semibold text-gray-900 dark:text-white">Bookings</h1>
        <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{{ totalLabel }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="fetchBookings"
          class="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          title="Reload"
        >
          <FeatherIcon name="refresh-cw" class="h-4 w-4" />
        </button>
        <router-link
          to="/book"
          class="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          <FeatherIcon name="plus" class="h-4 w-4" />
          New Booking
        </router-link>
      </div>
    </div>

    <!-- Filters bar (matching calendar toolbar style) -->
    <div class="border-b border-gray-200 bg-white px-6 py-2.5 dark:border-gray-800 dark:bg-gray-800">
      <div class="flex flex-wrap items-center gap-2">
        <!-- Search -->
        <div class="relative min-w-[220px] flex-1 sm:max-w-sm">
          <FeatherIcon
            name="search"
            class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search name, email, reference, phone, notes..."
            class="h-8 w-full rounded-md border border-gray-300 bg-white pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        <!-- Status multi-select -->
        <MultiSelectDropdown
          :items="statusItems"
          :selected="selectedStatuses"
          all-label="All Statuses"
          value-field="value"
          label-field="value"
          color-field="color"
          @update:selected="selectedStatuses = $event; currentPage = 1"
        />

        <!-- Service multi-select -->
        <MultiSelectDropdown
          :items="SERVICE_TYPES"
          :selected="selectedServices"
          all-label="All Services"
          @update:selected="selectedServices = $event; currentPage = 1"
        />

        <!-- Department multi-select -->
        <MultiSelectDropdown
          v-if="auth.isDepartmentLeader"
          :items="auth.accessibleDepartments"
          :selected="selectedDepartments"
          all-label="All Departments"
          value-field="name"
          label-field="department_name"
          @update:selected="selectedDepartments = $event; currentPage = 1"
        />

        <!-- Date range -->
        <DateRangePicker
          :from="dateFrom"
          :to="dateTo"
          @update="onDateRangeUpdate"
        />

        <!-- Clear filters -->
        <button
          v-if="hasActiveFilters"
          @click="clearAllFilters"
          class="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <FeatherIcon name="x" class="h-3 w-3" />
          Clear
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto bg-white dark:bg-gray-800">
      <!-- Loading -->
      <LoadingSpinner v-if="loading && !rows.length" />

      <!-- Empty state -->
      <EmptyState
        v-else-if="!rows.length"
        icon="calendar"
        title="No bookings found"
        :description="hasActiveFilters ? 'Try adjusting your filters' : 'Create your first booking to get started'"
      >
        <template #action>
          <router-link
            v-if="!hasActiveFilters"
            to="/book"
            class="mt-3 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <FeatherIcon name="plus" class="h-4 w-4" />
            New Booking
          </router-link>
          <button
            v-else
            @click="clearAllFilters"
            class="mt-3 inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Clear filters
          </button>
        </template>
      </EmptyState>

      <!-- Desktop table -->
      <div v-else class="hidden sm:block">
        <table class="w-full bg-white dark:bg-gray-800">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th v-if="auth.isDepartmentLeader" class="w-10 px-4 py-3 bg-gray-50 dark:bg-gray-800">
                <input
                  type="checkbox"
                  :checked="allVisibleSelected"
                  :indeterminate="someVisibleSelected && !allVisibleSelected"
                  @change="toggleSelectAll"
                  class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-400">Reference</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-400">Customer / Title</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-400">Status</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-400">Date / Time</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-400">Duration</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-400">Assigned To</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-400">Service Type</th>
              <th class="w-10 px-4 py-3 bg-gray-50 dark:bg-gray-800"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="row in rows"
              :key="row.name"
              @click="goToBooking(row.name)"
              class="cursor-pointer bg-white transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-800"
              :class="selectedRows.has(row.name) ? '!bg-blue-50 dark:!bg-blue-900/20' : ''"
            >
              <td v-if="auth.isDepartmentLeader" class="px-4 py-3" @click.stop>
                <input
                  type="checkbox"
                  :checked="selectedRows.has(row.name)"
                  @change="toggleRowSelect(row.name)"
                  class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                {{ row.booking_reference || row.name }}
              </td>
              <td class="px-4 py-3">
                <div class="text-sm text-gray-900 dark:text-white">
                  {{ row.customer_name || row.meeting_title || '-' }}
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
                {{ row.assigned_to_name || '-' }}
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <span
                  v-if="row.select_mkru"
                  class="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                >
                  {{ row.select_mkru }}
                </span>
                <span v-else class="text-sm text-gray-400 dark:text-gray-500">-</span>
              </td>
              <td class="px-4 py-3 text-right" @click.stop>
                <button
                  @click="goToBooking(row.name)"
                  class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                >
                  <FeatherIcon name="chevron-right" class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile card view -->
      <div v-if="rows.length" class="space-y-2 p-4 sm:hidden">
        <div
          v-for="row in rows"
          :key="row.name"
          @click="goToBooking(row.name)"
          class="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
          :class="selectedRows.has(row.name) ? '!border-blue-300 !bg-blue-50 dark:!border-blue-700 dark:!bg-blue-900/20' : ''"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ row.customer_name || row.meeting_title || row.booking_reference || row.name }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ row.booking_reference || row.name }}</p>
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
              class="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700 dark:text-gray-300"
            >{{ row.select_mkru }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="rows.length"
      class="flex flex-col items-center justify-between gap-3 border-t border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-800 sm:flex-row"
    >
      <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span>Show</span>
        <select
          :value="pageLength"
          @change="changePageLength(Number($event.target.value))"
          class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
        </select>
        <span>per page</span>
      </div>
      <div class="flex items-center gap-1">
        <button @click="goToPage(1)" :disabled="currentPage <= 1" class="pg-btn"><FeatherIcon name="chevrons-left" class="h-4 w-4" /></button>
        <button @click="goToPage(currentPage - 1)" :disabled="currentPage <= 1" class="pg-btn"><FeatherIcon name="chevron-left" class="h-4 w-4" /></button>
        <span class="px-3 text-sm text-gray-700 dark:text-gray-300">Page {{ currentPage }} of {{ totalPages }}</span>
        <button @click="goToPage(currentPage + 1)" :disabled="currentPage >= totalPages" class="pg-btn"><FeatherIcon name="chevron-right" class="h-4 w-4" /></button>
        <button @click="goToPage(totalPages)" :disabled="currentPage >= totalPages" class="pg-btn"><FeatherIcon name="chevrons-right" class="h-4 w-4" /></button>
      </div>
    </div>

    <!-- Loading overlay -->
    <div
      v-if="loading && rows.length"
      class="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50"
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
            <MenuItem v-slot="{ active }">
              <button @click="confirmStatusChange('Confirmed')" :class="active ? 'bg-gray-100 dark:bg-gray-700' : ''" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                <FeatherIcon name="check-circle" class="h-4 w-4" /> Confirmed
              </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
              <button @click="confirmStatusChange('Cancelled')" :class="active ? 'bg-gray-100 dark:bg-gray-700' : ''" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                <FeatherIcon name="x-circle" class="h-4 w-4" /> Cancelled
              </button>
            </MenuItem>
            <div class="my-1 border-t border-gray-200 dark:border-gray-700" />
            <MenuItem v-slot="{ active }">
              <button @click="confirmBulkDelete" :class="active ? 'bg-red-50 dark:bg-red-900/30' : ''" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 dark:text-red-400">
                <FeatherIcon name="trash-2" class="h-4 w-4" /> Delete
              </button>
            </MenuItem>
          </MenuItems>
        </Menu>
      </template>
    </BulkActionBar>

    <!-- Confirm Status Change Modal -->
    <ConfirmModal
      :show="confirmModal.show"
      :title="confirmModal.title"
      :message="confirmModal.message"
      :confirm-label="confirmModal.confirmLabel"
      :loading-text="confirmModal.loadingText"
      :icon="confirmModal.icon"
      :variant="confirmModal.variant"
      :loading="confirmModal.loading"
      @confirm="executeConfirmedAction"
      @cancel="confirmModal.show = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { call, toast } from 'frappe-ui'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { useAuthStore } from '@/stores/auth'
import { getStatusColor, useCalendarState } from '@/composables/useCalendarState'
import MultiSelectDropdown from '@/components/calendar/MultiSelectDropdown.vue'
import DateRangePicker from '@/components/shared/DateRangePicker.vue'
import StatusBadge from '@/components/shared/StatusBadge.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import BulkActionBar from '@/components/shared/BulkActionBar.vue'
import ConfirmModal from '@/components/shared/ConfirmModal.vue'

const BOOKING_API = 'meeting_manager.meeting_manager.api.booking'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { allStatuses } = useCalendarState()

const SERVICE_TYPES = [
  'Business', 'Business Extended', 'Business Rebook', 'New Setup Business',
  'Private / Business Customer', 'Private New Sale', 'Private Self Book',
]

// Status items with colors for the MultiSelectDropdown
const statusItems = computed(() => allStatuses.value)

// --- Filter state ---
const searchQuery = ref('')
const selectedStatuses = ref([])
const selectedServices = ref([])
const selectedDepartments = ref([])
const dateFrom = ref('')
const dateTo = ref('')

// --- Pagination ---
const pageLength = ref(20)
const currentPage = ref(1)

// --- Data ---
const rows = ref([])
const totalCount = ref(0)
const loading = ref(false)

// --- Selection ---
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

// --- Computed ---
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageLength.value)))
const totalLabel = computed(() => {
  if (loading.value && !rows.value.length) return 'Loading...'
  const c = totalCount.value
  return `${c} booking${c !== 1 ? 's' : ''}${hasActiveFilters.value ? ' (filtered)' : ''}`
})

const hasActiveFilters = computed(() => {
  return searchQuery.value || selectedStatuses.value.length > 0 || selectedServices.value.length > 0 || selectedDepartments.value.length > 0 || dateFrom.value || dateTo.value
})

const allVisibleSelected = computed(() => {
  if (!rows.value.length) return false
  return rows.value.every((r) => selectedRows.value.has(r.name))
})
const someVisibleSelected = computed(() => {
  if (!rows.value.length) return false
  return rows.value.some((r) => selectedRows.value.has(r.name))
})

// --- Fetch data ---
async function fetchBookings() {
  loading.value = true
  try {
    const params = {
      search: debouncedSearch.value,
      page: currentPage.value,
      page_length: pageLength.value,
    }
    if (selectedStatuses.value.length) params.statuses = JSON.stringify(selectedStatuses.value)
    if (selectedServices.value.length) params.services = JSON.stringify(selectedServices.value)
    if (selectedDepartments.value.length) params.departments = JSON.stringify(selectedDepartments.value)
    if (dateFrom.value) params.date_from = dateFrom.value
    if (dateTo.value) params.date_to = dateTo.value

    const res = await call(`${BOOKING_API}.search_bookings`, params)
    rows.value = res.data || []
    totalCount.value = res.total || 0
  } catch (e) {
    console.error('Failed to fetch bookings:', e)
    rows.value = []
    totalCount.value = 0
  } finally {
    loading.value = false
  }
}

// Watch filters and refetch
watch(
  [debouncedSearch, selectedStatuses, selectedServices, selectedDepartments, dateFrom, dateTo, currentPage, pageLength],
  () => {
    fetchBookings()
    writeUrlState()
  },
  { deep: true }
)

onMounted(() => {
  readUrlState()
  fetchBookings()
})

onBeforeUnmount(() => clearTimeout(searchTimeout))

// --- URL sync ---
function readUrlState() {
  const q = route.query
  if (q.search) searchQuery.value = q.search
  if (q.statuses) selectedStatuses.value = q.statuses.split(',').filter(Boolean)
  if (q.services) selectedServices.value = q.services.split(',').filter(Boolean)
  if (q.departments) selectedDepartments.value = q.departments.split(',').filter(Boolean)
  if (q.from) dateFrom.value = q.from
  if (q.to) dateTo.value = q.to
  if (q.page) currentPage.value = parseInt(q.page) || 1
  if (q.per_page) pageLength.value = parseInt(q.per_page) || 20
  // Also set debouncedSearch immediately
  if (q.search) debouncedSearch.value = q.search
}

function writeUrlState() {
  const q = {}
  if (debouncedSearch.value) q.search = debouncedSearch.value
  if (selectedStatuses.value.length) q.statuses = selectedStatuses.value.join(',')
  if (selectedServices.value.length) q.services = selectedServices.value.join(',')
  if (selectedDepartments.value.length) q.departments = selectedDepartments.value.join(',')
  if (dateFrom.value) q.from = dateFrom.value
  if (dateTo.value) q.to = dateTo.value
  if (currentPage.value > 1) q.page = String(currentPage.value)
  if (pageLength.value !== 20) q.per_page = String(pageLength.value)
  router.replace({ query: q })
}

// --- Actions ---
function goToBooking(id) {
  router.push(`/bookings/${id}`)
}

function onDateRangeUpdate({ from, to }) {
  dateFrom.value = from
  dateTo.value = to
  currentPage.value = 1
}

function clearAllFilters() {
  searchQuery.value = ''
  debouncedSearch.value = ''
  selectedStatuses.value = []
  selectedServices.value = []
  selectedDepartments.value = []
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
  if (allVisibleSelected.value) rows.value.forEach((r) => selectedRows.value.delete(r.name))
  else rows.value.forEach((r) => selectedRows.value.add(r.name))
}
function selectAllRows() { rows.value.forEach((r) => selectedRows.value.add(r.name)) }
function deselectAllRows() { selectedRows.value.clear() }
function toggleRowSelect(name) {
  if (selectedRows.value.has(name)) selectedRows.value.delete(name)
  else selectedRows.value.add(name)
}

// --- Confirmation Modal ---
const confirmModal = ref({
  show: false,
  title: '',
  message: '',
  confirmLabel: '',
  loadingText: '',
  icon: 'alert-circle',
  variant: 'primary',
  loading: false,
  action: null, // 'status' or 'delete'
  payload: null, // status name for status action
})

function confirmStatusChange(status) {
  const count = selectedRows.value.size
  if (!count) return
  confirmModal.value = {
    show: true,
    title: `Change Status to ${status}`,
    message: `Update ${count} booking${count > 1 ? 's' : ''} to "${status}"?`,
    confirmLabel: `Set ${status}`,
    loadingText: 'Updating...',
    icon: 'edit-3',
    variant: 'primary',
    loading: false,
    action: 'status',
    payload: status,
  }
}

function confirmBulkDelete() {
  const count = selectedRows.value.size
  if (!count) return
  confirmModal.value = {
    show: true,
    title: 'Delete Bookings',
    message: `Delete ${count} booking${count > 1 ? 's' : ''}? This cannot be undone.`,
    confirmLabel: 'Delete',
    loadingText: 'Deleting...',
    icon: 'trash-2',
    variant: 'danger',
    loading: false,
    action: 'delete',
    payload: null,
  }
}

async function executeConfirmedAction() {
  const modal = confirmModal.value
  modal.loading = true
  const names = Array.from(selectedRows.value)
  try {
    if (modal.action === 'status') {
      let succeeded = 0
      let failed = 0
      for (const name of names) {
        try {
          await call(`${BOOKING_API}.update_booking_status`, {
            booking_id: name,
            new_status: modal.payload,
          })
          succeeded++
        } catch {
          failed++
        }
      }
      if (failed === 0) {
        toast({ title: `${succeeded} booking${succeeded > 1 ? 's' : ''} updated to "${modal.payload}"`, icon: 'check' })
      } else {
        toast({ title: `${succeeded} updated, ${failed} failed to update`, icon: 'x' })
      }
    } else if (modal.action === 'delete') {
      let succeeded = 0
      let failed = 0
      for (const name of names) {
        try {
          await call('frappe.client.delete', { doctype: 'MM Meeting Booking', name })
          succeeded++
        } catch {
          failed++
        }
      }
      if (failed === 0) {
        toast({ title: `${succeeded} booking${succeeded > 1 ? 's' : ''} deleted`, icon: 'check' })
      } else {
        toast({ title: `${succeeded} deleted, ${failed} failed to delete`, icon: 'x' })
      }
    }
    selectedRows.value.clear()
    fetchBookings()
  } catch (e) {
    toast({ title: `Action failed: ${e.message || 'Unknown error'}`, icon: 'x' })
  } finally {
    modal.loading = false
    modal.show = false
  }
}

function formatDate(datetime) {
  if (!datetime) return '-'
  return new Date(datetime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(datetime) {
  if (!datetime) return ''
  const d = new Date(datetime)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.pg-btn {
  @apply rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800;
}
</style>
