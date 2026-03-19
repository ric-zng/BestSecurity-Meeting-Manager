<template>
  <div class="relative flex h-full flex-col bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-800">
      <div>
        <h1 class="text-lg font-semibold text-gray-900 dark:text-white">Status Colors</h1>
        <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{{ totalLabel }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="fetchStatuses"
          class="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          title="Reload"
        >
          <FeatherIcon name="refresh-cw" class="h-4 w-4" />
        </button>
        <button
          @click="showAddModal = true"
          class="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          <FeatherIcon name="plus" class="h-4 w-4" />
          Add Status
        </button>
      </div>
    </div>

    <!-- Filters bar -->
    <div class="border-b border-gray-200 bg-white px-6 py-2.5 dark:border-gray-800 dark:bg-gray-800">
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative min-w-[220px] flex-1 sm:max-w-sm">
          <FeatherIcon
            name="search"
            class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search statuses..."
            class="h-8 w-full rounded-md border border-gray-300 bg-white pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        <MultiSelectDropdown
          :items="STATUS_FILTER_ITEMS"
          :selected="selectedStatuses"
          all-label="All Status"
          value-field="value"
          label-field="label"
          @update:selected="selectedStatuses = $event; currentPage = 1; fetchStatuses()"
        />

        <button
          v-if="hasActiveFilters"
          @click="clearFilters"
          class="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <FeatherIcon name="x" class="h-3 w-3" />
          Clear
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto">
      <LoadingSpinner v-if="loading && rows.length === 0" />

      <EmptyState
        v-else-if="!loading && rows.length === 0"
        icon="droplet"
        title="No status colors found"
        :description="hasActiveFilters ? 'Try adjusting your filters' : 'Create your first status color to get started'"
      >
        <template #action>
          <button
            v-if="!hasActiveFilters"
            @click="showAddModal = true"
            class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <FeatherIcon name="plus" class="h-4 w-4" />
            Add Status
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
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="w-10 bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
                <input
                  type="checkbox"
                  :checked="allVisibleSelected"
                  :indeterminate="someVisibleSelected && !allVisibleSelected"
                  @change="toggleSelectAll"
                  class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
              </th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Color</th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Status Name</th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Hex Code</th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Preview</th>
              <th class="bg-gray-50 px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Bookings</th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Status</th>
              <th class="w-10 bg-gray-50 px-4 py-3 dark:bg-gray-800/50"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="item in rows"
              :key="item.name"
              @click="goToDetail(item.name)"
              class="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              :class="selectedRows.has(item.name) ? '!bg-blue-50 dark:!bg-blue-900/20' : ''"
            >
              <td class="px-4 py-3" @click.stop>
                <input
                  type="checkbox"
                  :checked="selectedRows.has(item.name)"
                  @change="toggleRowSelect(item.name)"
                  class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
              </td>
              <td class="px-4 py-3">
                <div
                  class="h-7 w-7 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-200 dark:border-gray-700 dark:ring-gray-600"
                  :style="{ backgroundColor: item.color }"
                />
              </td>
              <td class="px-4 py-3">
                <span class="font-medium text-gray-900 dark:text-white">{{ item.status }}</span>
              </td>
              <td class="px-4 py-3">
                <code class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">{{ item.color }}</code>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :style="{ backgroundColor: item.color + '26', color: item.color }"
                >
                  {{ item.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex min-w-[24px] items-center justify-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  {{ item.booking_count ?? '—' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="item.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'"
                >
                  {{ item.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <FeatherIcon name="chevron-right" class="h-4 w-4 text-gray-400" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile cards -->
      <div v-if="rows.length" class="space-y-2 p-4 sm:hidden">
        <div
          v-for="item in rows"
          :key="item.name"
          @click="goToDetail(item.name)"
          class="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
          :class="selectedRows.has(item.name) ? '!border-blue-300 !bg-blue-50 dark:!border-blue-700 dark:!bg-blue-900/20' : ''"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <input
                type="checkbox"
                :checked="selectedRows.has(item.name)"
                @change.stop="toggleRowSelect(item.name)"
                @click.stop
                class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <div
                class="h-6 w-6 rounded-full ring-1 ring-gray-200 dark:ring-gray-600"
                :style="{ backgroundColor: item.color }"
              />
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{ item.status }}</span>
            </div>
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              :class="item.is_active
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'"
            >
              {{ item.is_active ? 'Active' : 'Inactive' }}
            </span>
          </div>
          <div class="mt-2 flex items-center gap-3 pl-9 text-xs text-gray-500 dark:text-gray-400">
            <code class="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">{{ item.color }}</code>
            <span>{{ item.booking_count ?? 0 }} bookings</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalCount > pageSize" class="border-t border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-800">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500 dark:text-gray-400">
          {{ (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, totalCount) }} of {{ totalCount }}
        </span>
        <div class="flex items-center gap-1">
          <button
            @click="goToPage(currentPage - 1)"
            :disabled="currentPage <= 1"
            class="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <FeatherIcon name="chevron-left" class="h-4 w-4" />
          </button>
          <span class="px-2 text-gray-700 dark:text-gray-300">{{ currentPage }} / {{ totalPages }}</span>
          <button
            @click="goToPage(currentPage + 1)"
            :disabled="currentPage >= totalPages"
            class="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <FeatherIcon name="chevron-right" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Floating Bulk Action Bar -->
    <BulkActionBar
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
              <button @click="bulkSetActive(true)" :class="active ? 'bg-gray-100 dark:bg-gray-700' : ''" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                <FeatherIcon name="check-circle" class="h-4 w-4" /> Activate
              </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
              <button @click="bulkSetActive(false)" :class="active ? 'bg-gray-100 dark:bg-gray-700' : ''" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                <FeatherIcon name="pause-circle" class="h-4 w-4" /> Deactivate
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

    <!-- Confirm Modal -->
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

    <!-- Add Status Modal -->
    <teleport to="body">
      <div
        v-if="showAddModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showAddModal = false"
      >
        <div class="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Add Status Color</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Create a new status color for bookings</p>

          <div class="mt-4 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status Name</label>
              <input
                v-model="newStatus.name"
                type="text"
                placeholder="e.g. New Booking"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
              <div class="mt-1">
                <ColorPicker v-model="newStatus.color" />
              </div>
            </div>
          </div>

          <p v-if="addError" class="mt-2 text-xs text-red-500">{{ addError }}</p>

          <div class="mt-6 flex items-center justify-end gap-3">
            <button
              @click="showAddModal = false"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              @click="addNewStatus"
              :disabled="saving"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {{ saving ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { call, toast } from 'frappe-ui'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import MultiSelectDropdown from '@/components/calendar/MultiSelectDropdown.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import BulkActionBar from '@/components/shared/BulkActionBar.vue'
import ConfirmModal from '@/components/shared/ConfirmModal.vue'
import ColorPicker from '@/components/shared/ColorPicker.vue'

const router = useRouter()
const route = useRoute()

const STATUS_FILTER_ITEMS = [
  { value: '1', label: 'Active' },
  { value: '0', label: 'Inactive' },
]

// State
const rows = ref([])
const totalCount = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = 20
const searchQuery = ref('')
const selectedStatuses = ref([])
let searchTimeout = null

// Selection
const selectedRows = ref(new Set())

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize)))
const hasActiveFilters = computed(() => searchQuery.value || selectedStatuses.value.length)

const allVisibleSelected = computed(() => {
  if (!rows.value.length) return false
  return rows.value.every(r => selectedRows.value.has(r.name))
})
const someVisibleSelected = computed(() => {
  if (!rows.value.length) return false
  return rows.value.some(r => selectedRows.value.has(r.name))
})

const totalLabel = computed(() => {
  if (loading.value && rows.value.length === 0) return 'Loading...'
  return `${totalCount.value} status color${totalCount.value !== 1 ? 's' : ''}${hasActiveFilters.value ? ' (filtered)' : ''}`
})

// Debounced search
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchStatuses()
  }, 300)
})

// URL sync
function syncFromUrl() {
  const q = route.query
  if (q.search) searchQuery.value = q.search
  if (q.status) selectedStatuses.value = String(q.status).split(',')
  if (q.page) currentPage.value = parseInt(q.page) || 1
}

function syncToUrl() {
  const query = {}
  if (searchQuery.value) query.search = searchQuery.value
  if (selectedStatuses.value.length) query.status = selectedStatuses.value.join(',')
  if (currentPage.value > 1) query.page = String(currentPage.value)
  router.replace({ query })
}

// Fetch
async function fetchStatuses() {
  loading.value = true
  syncToUrl()
  try {
    const filters = {}
    if (searchQuery.value) filters.status = ['like', `%${searchQuery.value}%`]
    if (selectedStatuses.value.length === 1) filters.is_active = parseInt(selectedStatuses.value[0])

    const [list, count] = await Promise.all([
      call('frappe.client.get_list', {
        doctype: 'MM Status Color',
        fields: ['name', 'status', 'color', 'is_active'],
        filters,
        order_by: 'status asc',
        limit_start: (currentPage.value - 1) * pageSize,
        limit_page_length: pageSize,
      }),
      call('frappe.client.get_count', {
        doctype: 'MM Status Color',
        filters,
      }),
    ])

    totalCount.value = count

    // Fetch booking counts per status
    const withCounts = await Promise.all(
      list.map(async (item) => {
        try {
          const bc = await call('frappe.client.get_count', {
            doctype: 'MM Meeting Booking',
            filters: { booking_status: item.status },
          })
          return { ...item, booking_count: bc }
        } catch {
          return { ...item, booking_count: 0 }
        }
      })
    )

    rows.value = withCounts
  } catch (e) {
    console.error('Failed to fetch statuses:', e)
  } finally {
    loading.value = false
  }
}

// Pagination
function goToPage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  selectedRows.value.clear()
  fetchStatuses()
}

// Selection
function toggleSelectAll() {
  if (allVisibleSelected.value) rows.value.forEach(r => selectedRows.value.delete(r.name))
  else rows.value.forEach(r => selectedRows.value.add(r.name))
}
function selectAllRows() { rows.value.forEach(r => selectedRows.value.add(r.name)) }
function deselectAllRows() { selectedRows.value.clear() }
function toggleRowSelect(name) {
  if (selectedRows.value.has(name)) selectedRows.value.delete(name)
  else selectedRows.value.add(name)
}

// Bulk actions
const confirmModal = ref({
  show: false, title: '', message: '', confirmLabel: '', loadingText: '',
  icon: 'alert-circle', variant: 'primary', loading: false, action: null, payload: null,
})

function bulkSetActive(active) {
  const count = selectedRows.value.size
  if (!count) return
  confirmModal.value = {
    show: true,
    title: active ? 'Activate Statuses' : 'Deactivate Statuses',
    message: `${active ? 'Activate' : 'Deactivate'} ${count} status${count > 1 ? 'es' : ''}?`,
    confirmLabel: active ? 'Activate' : 'Deactivate',
    loadingText: active ? 'Activating...' : 'Deactivating...',
    icon: active ? 'check-circle' : 'pause-circle',
    variant: 'primary',
    loading: false,
    action: 'toggle_active',
    payload: active,
  }
}

function confirmBulkDelete() {
  const count = selectedRows.value.size
  if (!count) return
  confirmModal.value = {
    show: true,
    title: 'Delete Statuses',
    message: `Delete ${count} status${count > 1 ? 'es' : ''}? This cannot be undone.`,
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
  confirmModal.value.loading = true
  const action = confirmModal.value.action
  const payload = confirmModal.value.payload
  const names = Array.from(selectedRows.value)
  try {
    if (action === 'toggle_active') {
      let succeeded = 0, failed = 0
      for (const name of names) {
        try {
          await call('frappe.client.set_value', {
            doctype: 'MM Status Color',
            name,
            fieldname: 'is_active',
            value: payload ? 1 : 0,
          })
          succeeded++
        } catch { failed++ }
      }
      // Optimistic UI
      const nameSet = new Set(names)
      rows.value = rows.value.map(r => nameSet.has(r.name) ? { ...r, is_active: payload ? 1 : 0 } : r)
      const label = payload ? 'activated' : 'deactivated'
      if (failed === 0) toast({ title: `${succeeded} status${succeeded > 1 ? 'es' : ''} ${label}`, icon: 'check' })
      else toast({ title: `${succeeded} ${label}, ${failed} failed`, icon: 'x' })
    } else if (action === 'delete') {
      let succeeded = 0, failed = 0
      for (const name of names) {
        try {
          await call('frappe.client.delete', { doctype: 'MM Status Color', name })
          succeeded++
        } catch { failed++ }
      }
      // Optimistic UI
      const nameSet = new Set(names)
      rows.value = rows.value.filter(r => !nameSet.has(r.name))
      totalCount.value = Math.max(0, totalCount.value - names.length)
      if (failed === 0) toast({ title: `${succeeded} status${succeeded > 1 ? 'es' : ''} deleted`, icon: 'check' })
      else toast({ title: `${succeeded} deleted, ${failed} failed`, icon: 'x' })
    }
    selectedRows.value.clear()
  } catch (e) {
    toast({ title: `Action failed: ${e.message || 'Unknown error'}`, icon: 'x' })
  } finally {
    confirmModal.value.loading = false
    confirmModal.value.show = false
    fetchStatuses()
  }
}

// Add new status
const showAddModal = ref(false)
const saving = ref(false)
const addError = ref('')
const newStatus = ref({ name: '', color: '#3b82f6' })

async function addNewStatus() {
  addError.value = ''
  if (!newStatus.value.name.trim()) { addError.value = 'Status name is required'; return }
  saving.value = true
  try {
    const doc = await call('frappe.client.insert', {
      doc: {
        doctype: 'MM Status Color',
        status: newStatus.value.name.trim(),
        color: newStatus.value.color,
        is_active: 1,
      },
    })
    showAddModal.value = false
    newStatus.value = { name: '', color: '#3b82f6' }
    toast({ title: `Added "${doc.status}"`, icon: 'check' })
    router.push(`/admin/status-colors/${doc.name}`)
  } catch (err) {
    addError.value = err.messages?.[0] || err.message || 'Failed to add status'
  } finally {
    saving.value = false
  }
}

function goToDetail(name) {
  router.push(`/admin/status-colors/${name}`)
}

function clearFilters() {
  searchQuery.value = ''
  selectedStatuses.value = []
  currentPage.value = 1
  fetchStatuses()
}

onMounted(() => {
  syncFromUrl()
  fetchStatuses()
})
</script>
