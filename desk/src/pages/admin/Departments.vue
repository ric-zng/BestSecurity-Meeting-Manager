<template>
  <div class="flex h-full flex-col">
    <!-- Header -->
    <div class="flex flex-col gap-4 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-lg font-semibold text-gray-900 dark:text-white">Departments</h1>
        <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {{ totalLabel }}
        </p>
      </div>
      <button
        v-if="auth.isSystemManager"
        @click="showNewModal = true"
        class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        <FeatherIcon name="plus" class="h-4 w-4" />
        New Department
      </button>
    </div>

    <!-- Filters -->
    <div class="border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-800">
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
            placeholder="Search departments..."
            class="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
          />
        </div>

        <!-- Active filter -->
        <select
          v-model="activeFilter"
          class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-blue-400 dark:focus:ring-blue-400"
        >
          <option value="">All Status</option>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>

        <!-- Clear filters -->
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
      <!-- Loading -->
      <LoadingSpinner v-if="departments.loading && !departments.data?.length" />

      <!-- Error -->
      <ErrorState
        v-else-if="departments.error"
        :message="departments.error"
        @retry="departments.reload()"
      />

      <!-- Empty -->
      <EmptyState
        v-else-if="!departments.data?.length"
        icon="layers"
        title="No departments found"
        :description="hasActiveFilters ? 'Try adjusting your filters' : 'Create your first department to get started'"
      >
        <template #action>
          <button
            v-if="!hasActiveFilters && auth.isSystemManager"
            @click="showNewModal = true"
            class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
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
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Department</th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Leader</th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Algorithm</th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Timezone</th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Status</th>
              <th class="w-10 bg-gray-50 px-4 py-3 dark:bg-gray-800/50"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="(dept, idx) in departments.data"
              :key="dept.name"
              @click="goToDepartment(dept.name)"
              class="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900 dark:text-white">{{ dept.department_name }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">{{ dept.department_slug }}</div>
              </td>
              <td class="px-4 py-3 text-gray-700 dark:text-gray-300">
                {{ dept.department_leader || '-' }}
              </td>
              <td class="px-4 py-3 text-gray-700 dark:text-gray-300">
                <span class="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800 dark:text-gray-400">
                  {{ dept.assignment_algorithm || 'Round Robin' }}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-500 dark:text-gray-400">
                {{ dept.timezone || '-' }}
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="dept.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'"
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
      <div v-if="departments.data?.length" class="space-y-2 p-4 sm:hidden">
        <div
          v-for="dept in departments.data"
          :key="dept.name"
          @click="goToDepartment(dept.name)"
          class="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-gray-800 dark:hover:border-gray-700"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ dept.department_name }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ dept.department_slug }}</p>
            </div>
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              :class="dept.is_active
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'"
            >
              {{ dept.is_active ? 'Active' : 'Inactive' }}
            </span>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span v-if="dept.department_leader" class="flex items-center gap-1">
              <FeatherIcon name="user" class="h-3 w-3" />
              {{ dept.department_leader }}
            </span>
            <span class="flex items-center gap-1">
              <FeatherIcon name="git-branch" class="h-3 w-3" />
              {{ dept.assignment_algorithm || 'Round Robin' }}
            </span>
          </div>
        </div>
      </div>
    </div>

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
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Slug</label>
              <input
                v-model="newDept.department_slug"
                type="text"
                placeholder="e.g. sales"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
              <input
                v-model="newDept.timezone"
                type="text"
                placeholder="e.g. Europe/Copenhagen"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>
          </div>

          <div class="mt-6 flex items-center justify-end gap-3">
            <button
              @click="showNewModal = false"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              @click="createDepartment"
              :disabled="creatingDept"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
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
const activeFilter = ref('')
let searchTimeout = null
const debouncedSearch = ref('')

watch(searchQuery, (val) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = val
  }, 300)
})

const hasActiveFilters = computed(() => searchQuery.value || activeFilter.value !== '')

const computedFilters = computed(() => {
  const filters = {}
  if (debouncedSearch.value) {
    filters.department_name = ['like', `%${debouncedSearch.value}%`]
  }
  if (activeFilter.value !== '') {
    filters.is_active = parseInt(activeFilter.value)
  }
  return filters
})

// List resource
const departments = createListResource({
  doctype: 'MM Department',
  fields: ['name', 'department_name', 'department_slug', 'is_active', 'department_leader', 'assignment_algorithm', 'timezone'],
  filters: computedFilters,
  orderBy: 'department_name asc',
  pageLength: 50,
  auto: true,
})

const totalLabel = computed(() => {
  if (departments.loading && !departments.data?.length) return 'Loading...'
  const count = departments.data?.length ?? 0
  return `${count} department${count !== 1 ? 's' : ''}${hasActiveFilters.value ? ' (filtered)' : ''}`
})

// New department modal
const showNewModal = ref(false)
const creatingDept = ref(false)
const newDept = ref({
  department_name: '',
  department_slug: '',
  timezone: '',
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
    newDept.value = { department_name: '', department_slug: '', timezone: '' }
    router.push(`/admin/departments/${doc.name}`)
  } catch (e) {
    console.error('Failed to create department:', e)
  } finally {
    creatingDept.value = false
  }
}

function goToDepartment(name) {
  router.push(`/admin/departments/${name}`)
}

function clearFilters() {
  searchQuery.value = ''
  debouncedSearch.value = ''
  activeFilter.value = ''
}
</script>
