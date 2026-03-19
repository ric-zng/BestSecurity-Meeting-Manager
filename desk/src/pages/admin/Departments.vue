<template>
  <div class="relative flex h-full flex-col bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-800">
      <div>
        <h1 class="text-lg font-semibold text-gray-900 dark:text-white">Departments</h1>
        <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{{ totalLabel }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="fetchDepartments"
          class="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          title="Reload"
        >
          <FeatherIcon name="refresh-cw" class="h-4 w-4" />
        </button>
        <button
          v-if="auth.isSystemManager"
          @click="showNewModal = true"
          class="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          <FeatherIcon name="plus" class="h-4 w-4" />
          New Department
        </button>
      </div>
    </div>

    <!-- Filters bar -->
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
            placeholder="Search departments..."
            class="h-8 w-full rounded-md border border-gray-300 bg-white pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        <!-- Status filter -->
        <MultiSelectDropdown
          :items="STATUS_ITEMS"
          :selected="selectedStatuses"
          all-label="All Status"
          value-field="value"
          label-field="label"
          @update:selected="selectedStatuses = $event; currentPage = 1; fetchDepartments()"
        />

        <!-- Algorithm filter -->
        <MultiSelectDropdown
          :items="ALGORITHM_ITEMS"
          :selected="selectedAlgorithms"
          all-label="All Algorithms"
          value-field="value"
          label-field="label"
          @update:selected="selectedAlgorithms = $event; currentPage = 1; fetchDepartments()"
        />

        <!-- Clear filters -->
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
      <!-- Loading -->
      <LoadingSpinner v-if="loading && rows.length === 0" />

      <!-- Empty -->
      <EmptyState
        v-else-if="!loading && rows.length === 0"
        icon="layers"
        title="No departments found"
        :description="hasActiveFilters ? 'Try adjusting your filters' : 'Create your first department to get started'"
      >
        <template #action>
          <button
            v-if="!hasActiveFilters && auth.isSystemManager"
            @click="showNewModal = true"
            class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <FeatherIcon name="plus" class="h-4 w-4" />
            New Department
          </button>
          <button
            v-else-if="hasActiveFilters"
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
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Department</th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Leader</th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Algorithm</th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Timezone</th>
              <th class="bg-gray-50 px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Members</th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Status</th>
              <th class="w-10 bg-gray-50 px-4 py-3 dark:bg-gray-800/50"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="dept in rows"
              :key="dept.name"
              @click="goToDepartment(dept.name)"
              class="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              :class="selectedRows.has(dept.name) ? '!bg-blue-50 dark:!bg-blue-900/20' : ''"
            >
              <td class="px-4 py-3" @click.stop>
                <input
                  type="checkbox"
                  :checked="selectedRows.has(dept.name)"
                  @change="toggleRowSelect(dept.name)"
                  class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
              </td>
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900 dark:text-white">{{ dept.department_name }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">{{ dept.department_slug }}</div>
              </td>
              <td class="px-4 py-3 text-gray-700 dark:text-gray-300">
                {{ dept.department_leader || '—' }}
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  {{ dept.assignment_algorithm || 'Round Robin' }}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-500 dark:text-gray-400">
                {{ dept.timezone || '—' }}
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex min-w-[24px] items-center justify-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  {{ dept.member_count ?? '—' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="dept.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'"
                >
                  {{ dept.is_active ? 'Active' : 'Inactive' }}
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
      <div v-if="rows.length" class="space-y-2 p-4 sm:hidden">
        <div
          v-for="dept in rows"
          :key="dept.name"
          @click="goToDepartment(dept.name)"
          class="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
          :class="selectedRows.has(dept.name) ? '!border-blue-300 !bg-blue-50 dark:!border-blue-700 dark:!bg-blue-900/20' : ''"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-start gap-2">
              <input
                type="checkbox"
                :checked="selectedRows.has(dept.name)"
                @change.stop="toggleRowSelect(dept.name)"
                @click.stop
                class="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ dept.department_name }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ dept.department_slug }}</p>
              </div>
            </div>
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              :class="dept.is_active
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'"
            >
              {{ dept.is_active ? 'Active' : 'Inactive' }}
            </span>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-6 text-xs text-gray-500 dark:text-gray-400">
            <span v-if="dept.department_leader" class="flex items-center gap-1">
              <FeatherIcon name="user" class="h-3 w-3" />
              {{ dept.department_leader }}
            </span>
            <span class="flex items-center gap-1">
              <FeatherIcon name="git-branch" class="h-3 w-3" />
              {{ dept.assignment_algorithm || 'Round Robin' }}
            </span>
            <span class="flex items-center gap-1">
              <FeatherIcon name="users" class="h-3 w-3" />
              {{ dept.member_count ?? 0 }} members
            </span>
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

    <!-- New Department Modal -->
    <teleport to="body">
      <div
        v-if="showNewModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showNewModal = false"
      >
        <div class="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">New Department</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Create a new department</p>

          <div class="mt-4 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Department Name</label>
              <input
                v-model="newDept.department_name"
                type="text"
                placeholder="e.g. Sales"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Slug</label>
              <input
                v-model="newDept.department_slug"
                type="text"
                placeholder="e.g. sales"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              />
            </div>
            <!-- Timezone Listbox -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
              <Listbox v-model="newDept.timezone">
                <div class="relative mt-1">
                  <ListboxButton class="relative w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-left text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <span>{{ newDept.timezone || 'Select timezone' }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <FeatherIcon name="chevron-down" class="h-4 w-4 text-gray-400" />
                    </span>
                  </ListboxButton>
                  <ListboxOptions class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-700">
                    <ListboxOption
                      v-for="tz in TIMEZONES"
                      :key="tz"
                      :value="tz"
                      v-slot="{ active, selected }"
                    >
                      <li class="relative cursor-pointer select-none px-3 py-2 text-sm" :class="[
                        active ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200',
                        selected ? 'font-medium' : ''
                      ]">
                        <span>{{ tz }}</span>
                        <span v-if="selected" class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 dark:text-blue-400">
                          <FeatherIcon name="check" class="h-4 w-4" />
                        </span>
                      </li>
                    </ListboxOption>
                  </ListboxOptions>
                </div>
              </Listbox>
            </div>
          </div>

          <div class="mt-6 flex items-center justify-end gap-3">
            <button
              @click="showNewModal = false"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              @click="createDepartment"
              :disabled="creatingDept"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {{ creatingDept ? 'Creating...' : 'Create' }}
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
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { useAuthStore } from '@/stores/auth'
import MultiSelectDropdown from '@/components/calendar/MultiSelectDropdown.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import BulkActionBar from '@/components/shared/BulkActionBar.vue'
import ConfirmModal from '@/components/shared/ConfirmModal.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Copenhagen',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
]

const STATUS_ITEMS = [
  { value: '1', label: 'Active' },
  { value: '0', label: 'Inactive' },
]

const ALGORITHM_ITEMS = [
  { value: 'Round Robin', label: 'Round Robin' },
  { value: 'Least Busy', label: 'Least Busy' },
]

// State
const rows = ref([])
const totalCount = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = 20
const searchQuery = ref('')
const selectedStatuses = ref([])
const selectedAlgorithms = ref([])
let searchTimeout = null

// Selection
const selectedRows = ref(new Set())

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize)))
const hasActiveFilters = computed(() => searchQuery.value || selectedStatuses.value.length || selectedAlgorithms.value.length)

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
  return `${totalCount.value} department${totalCount.value !== 1 ? 's' : ''}${hasActiveFilters.value ? ' (filtered)' : ''}`
})

// Debounced search
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchDepartments()
  }, 300)
})

// URL sync
function syncFromUrl() {
  const q = route.query
  if (q.search) searchQuery.value = q.search
  if (q.status) selectedStatuses.value = String(q.status).split(',')
  if (q.algorithm) selectedAlgorithms.value = String(q.algorithm).split(',')
  if (q.page) currentPage.value = parseInt(q.page) || 1
}

function syncToUrl() {
  const query = {}
  if (searchQuery.value) query.search = searchQuery.value
  if (selectedStatuses.value.length) query.status = selectedStatuses.value.join(',')
  if (selectedAlgorithms.value.length) query.algorithm = selectedAlgorithms.value.join(',')
  if (currentPage.value > 1) query.page = String(currentPage.value)
  router.replace({ query })
}

// Fetch
async function fetchDepartments() {
  loading.value = true
  syncToUrl()
  try {
    const filters = {}
    if (searchQuery.value) filters.department_name = ['like', `%${searchQuery.value}%`]
    if (selectedStatuses.value.length === 1) filters.is_active = parseInt(selectedStatuses.value[0])
    if (selectedAlgorithms.value.length) {
      filters.assignment_algorithm = selectedAlgorithms.value.length === 1
        ? selectedAlgorithms.value[0]
        : ['in', selectedAlgorithms.value]
    }

    const [list, count] = await Promise.all([
      call('frappe.client.get_list', {
        doctype: 'MM Department',
        fields: ['name', 'department_name', 'department_slug', 'is_active', 'department_leader', 'assignment_algorithm', 'timezone'],
        filters,
        order_by: 'department_name asc',
        limit_start: (currentPage.value - 1) * pageSize,
        limit_page_length: pageSize,
      }),
      call('frappe.client.get_count', {
        doctype: 'MM Department',
        filters,
      }),
    ])

    totalCount.value = count

    // Fetch member counts for each department
    const withCounts = await Promise.all(
      list.map(async (dept) => {
        try {
          const mc = await call('frappe.client.get_count', {
            doctype: 'MM Department Member',
            filters: { parent: dept.name },
          })
          return { ...dept, member_count: mc }
        } catch {
          return { ...dept, member_count: 0 }
        }
      })
    )

    rows.value = withCounts
  } catch (e) {
    console.error('Failed to fetch departments:', e)
  } finally {
    loading.value = false
  }
}

// Pagination
function goToPage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  selectedRows.value.clear()
  fetchDepartments()
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

// Bulk Actions
const confirmModal = ref({
  show: false, title: '', message: '', confirmLabel: '', loadingText: '',
  icon: 'alert-circle', variant: 'primary', loading: false, action: null, payload: null,
})

function bulkSetActive(active) {
  const count = selectedRows.value.size
  if (!count) return
  confirmModal.value = {
    show: true,
    title: active ? 'Activate Departments' : 'Deactivate Departments',
    message: `${active ? 'Activate' : 'Deactivate'} ${count} department${count > 1 ? 's' : ''}?`,
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
    title: 'Delete Departments',
    message: `Delete ${count} department${count > 1 ? 's' : ''}? This cannot be undone.`,
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
            doctype: 'MM Department',
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
      if (failed === 0) toast({ title: `${succeeded} department${succeeded > 1 ? 's' : ''} ${label}`, icon: 'check' })
      else toast({ title: `${succeeded} ${label}, ${failed} failed`, icon: 'x' })
    } else if (action === 'delete') {
      let succeeded = 0, failed = 0
      for (const name of names) {
        try {
          await call('frappe.client.delete', { doctype: 'MM Department', name })
          succeeded++
        } catch { failed++ }
      }
      // Optimistic UI
      const nameSet = new Set(names)
      rows.value = rows.value.filter(r => !nameSet.has(r.name))
      totalCount.value = Math.max(0, totalCount.value - names.length)
      if (failed === 0) toast({ title: `${succeeded} department${succeeded > 1 ? 's' : ''} deleted`, icon: 'check' })
      else toast({ title: `${succeeded} deleted, ${failed} failed`, icon: 'x' })
    }
    selectedRows.value.clear()
  } catch (e) {
    toast({ title: `Action failed: ${e.message || 'Unknown error'}`, icon: 'x' })
  } finally {
    confirmModal.value.loading = false
    confirmModal.value.show = false
    fetchDepartments()
  }
}

// New department modal
const showNewModal = ref(false)
const creatingDept = ref(false)
const newDept = ref({
  department_name: '',
  department_slug: '',
  timezone: 'Europe/Copenhagen',
})

async function createDepartment() {
  if (!newDept.value.department_name) return
  creatingDept.value = true
  try {
    const doc = await call('frappe.client.insert', {
      doc: {
        doctype: 'MM Department',
        department_name: newDept.value.department_name,
        department_slug: newDept.value.department_slug,
        timezone: newDept.value.timezone,
        is_active: 1,
      },
    })
    showNewModal.value = false
    newDept.value = { department_name: '', department_slug: '', timezone: 'Europe/Copenhagen' }
    toast({ title: 'Department created', icon: 'check' })
    router.push(`/admin/departments/${doc.name}`)
  } catch (e) {
    console.error('Failed to create department:', e)
    toast({ title: 'Failed to create department', icon: 'x' })
  } finally {
    creatingDept.value = false
  }
}

function goToDepartment(name) {
  router.push(`/admin/departments/${name}`)
}

function clearFilters() {
  searchQuery.value = ''
  selectedStatuses.value = []
  selectedAlgorithms.value = []
  currentPage.value = 1
  fetchDepartments()
}

onMounted(() => {
  syncFromUrl()
  fetchDepartments()
})
</script>
