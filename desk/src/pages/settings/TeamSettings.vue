<template>
  <div class="relative flex h-full flex-col bg-gray-50 dark:bg-gray-900">
    <!-- Loading -->
    <div v-if="auth.isLoading" class="flex flex-1 items-center justify-center">
      <LoadingSpinner />
    </div>

    <!-- Access Denied -->
    <div v-else-if="!auth.isDepartmentLeader" class="flex flex-1 items-center justify-center">
      <EmptyState icon="shield" title="Access Denied" description="You need to be a department leader to view this page." />
    </div>

    <template v-else>
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-800">
        <div>
          <h1 class="text-lg font-semibold text-gray-900 dark:text-white">Team Settings</h1>
          <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {{ departments.length }} department{{ departments.length !== 1 ? 's' : '' }}
            <span v-if="selectedDept"> &middot; {{ selectedDept._members?.length || 0 }} members</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="refreshCurrent"
            class="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            title="Reload"
          >
            <FeatherIcon name="refresh-cw" class="h-4 w-4" />
          </button>
          <router-link
            v-if="auth.isSystemManager && selectedDept"
            :to="`/admin/departments/${selectedDept.name}`"
            class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <FeatherIcon name="settings" class="h-4 w-4" />
            Department Settings
          </router-link>
        </div>
      </div>

      <!-- Department tabs + search bar -->
      <div class="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-800">
        <!-- Tabs row -->
        <div class="flex items-center gap-2 overflow-x-auto px-6 pt-2" v-if="departments.length > 1">
          <button
            v-for="dept in departments"
            :key="dept.name"
            @click="selectDept(dept)"
            class="relative shrink-0 rounded-t-md border border-b-0 px-4 py-2 text-sm font-medium transition-colors"
            :class="selectedDeptName === dept.name
              ? 'border-gray-200 bg-white text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
          >
            {{ dept.department_name }}
            <span class="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {{ dept._members?.length || 0 }}
            </span>
            <div v-if="selectedDeptName === dept.name" class="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
          </button>
        </div>

        <!-- Filter row -->
        <div class="flex flex-wrap items-center gap-2 px-6 py-2.5">
          <!-- Search members -->
          <div class="relative min-w-[220px] flex-1 sm:max-w-sm">
            <FeatherIcon name="search" class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              v-model="memberSearch"
              type="text"
              placeholder="Search members..."
              class="h-8 w-full rounded-md border border-gray-300 bg-white pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          <!-- Status filter -->
          <div class="flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600">
            <button
              @click="statusFilter = ''"
              class="rounded-l-md px-3 py-1 text-xs font-medium transition-colors"
              :class="statusFilter === '' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'"
            >All</button>
            <button
              @click="statusFilter = 'active'"
              class="px-3 py-1 text-xs font-medium transition-colors"
              :class="statusFilter === 'active' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'"
            >Active</button>
            <button
              @click="statusFilter = 'inactive'"
              class="rounded-r-md px-3 py-1 text-xs font-medium transition-colors"
              :class="statusFilter === 'inactive' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'"
            >Inactive</button>
          </div>

          <!-- Department info pills -->
          <div v-if="selectedDept" class="ml-auto flex items-center gap-2">
            <span class="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              <FeatherIcon name="cpu" class="mr-0.5 inline h-3 w-3" />
              {{ selectedDept._algorithm || 'Round Robin' }}
            </span>
            <span class="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {{ activeCount }} active
            </span>
            <span v-if="inactiveCount > 0" class="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
              {{ inactiveCount }} inactive
            </span>
            <span class="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
              {{ totalAssignments }} total assignments
            </span>
          </div>
        </div>
      </div>

      <!-- Content area -->
      <div class="flex-1 overflow-auto bg-white dark:bg-gray-800">
        <!-- No departments -->
        <div v-if="departments.length === 0" class="flex flex-1 items-center justify-center py-24">
          <EmptyState icon="users" title="No departments" description="You are not leading any departments." />
        </div>

        <!-- Loading members -->
        <div v-else-if="selectedDept?._loading" class="flex items-center justify-center py-24">
          <LoadingSpinner />
        </div>

        <!-- Error -->
        <div v-else-if="selectedDept?._error" class="flex items-center justify-center py-24">
          <ErrorState :message="selectedDept._error" @retry="loadMembers(selectedDept)" />
        </div>

        <!-- No members -->
        <EmptyState
          v-else-if="filteredMembers.length === 0 && !memberSearch && !statusFilter"
          icon="user-x"
          title="No members"
          description="This department has no members yet."
        />

        <!-- No results for search -->
        <EmptyState
          v-else-if="filteredMembers.length === 0"
          icon="search"
          title="No members found"
          description="Try adjusting your search or filters."
        >
          <template #action>
            <button @click="memberSearch = ''; statusFilter = ''" class="mt-3 inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
              Clear filters
            </button>
          </template>
        </EmptyState>

        <!-- Members table -->
        <div v-else class="hidden sm:block">
          <table class="w-full bg-white dark:bg-gray-800">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="bg-gray-50 px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Member</th>
                <th class="bg-gray-50 px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Email</th>
                <th class="bg-gray-50 px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Assignments</th>
                <th class="bg-gray-50 px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Workload</th>
                <th class="bg-gray-50 px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Status</th>
                <th class="bg-gray-50 px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr
                v-for="member in paginatedMembers"
                :key="member.user_id"
                class="bg-white transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-800/50"
              >
                <td class="px-5 py-3">
                  <div class="flex items-center gap-3">
                    <div class="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold"
                      :class="member.is_active
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'"
                    >
                      {{ getInitials(member.full_name) }}
                    </div>
                    <div>
                      <span class="font-medium text-gray-900 dark:text-white">{{ member.full_name }}</span>
                      <span v-if="member.is_leader" class="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Leader</span>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {{ member.email }}
                </td>
                <td class="px-5 py-3 text-center">
                  <span class="inline-flex min-w-[2rem] items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    :class="(member.total_assignments || 0) > 0
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'"
                  >
                    {{ member.total_assignments || 0 }}
                  </span>
                </td>
                <td class="px-5 py-3">
                  <div class="mx-auto w-24">
                    <div class="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        class="h-1.5 rounded-full transition-all"
                        :class="workloadColor(member)"
                        :style="{ width: workloadPercent(member) + '%' }"
                      />
                    </div>
                    <p class="mt-0.5 text-center text-[10px] text-gray-400">{{ workloadPercent(member) }}%</p>
                  </div>
                </td>
                <td class="px-5 py-3 text-center">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    :class="member.is_active
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'"
                  >
                    {{ member.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="px-5 py-3 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      @click="toggleMemberStatus(selectedDept, member)"
                      :disabled="togglingMember === member.user_id"
                      class="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                      :title="member.is_active ? 'Deactivate' : 'Activate'"
                    >
                      <FeatherIcon v-if="togglingMember === member.user_id" name="loader" class="h-4 w-4 animate-spin" />
                      <FeatherIcon v-else :name="member.is_active ? 'user-x' : 'user-check'" class="h-4 w-4" />
                    </button>
                    <router-link
                      v-if="auth.isSystemManager"
                      :to="`/admin/departments/${selectedDept.name}`"
                      class="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                      title="Department settings"
                    >
                      <FeatherIcon name="external-link" class="h-4 w-4" />
                    </router-link>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile card view -->
        <div v-if="paginatedMembers.length" class="space-y-2 p-4 sm:hidden">
          <div
            v-for="member in paginatedMembers"
            :key="member.user_id"
            class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
          >
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-2">
                <div class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
                  :class="member.is_active ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'"
                >{{ getInitials(member.full_name) }}</div>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{{ member.full_name }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ member.email }}</p>
                </div>
              </div>
              <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                :class="member.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'"
              >{{ member.is_active ? 'Active' : 'Inactive' }}</span>
            </div>
            <div class="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>{{ member.total_assignments || 0 }} assignments</span>
              <div class="h-1.5 w-16 rounded-full bg-gray-200 dark:bg-gray-700">
                <div class="h-1.5 rounded-full" :class="workloadColor(member)" :style="{ width: workloadPercent(member) + '%' }" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="filteredMembers.length > pageLength"
        class="flex flex-col items-center justify-between gap-3 border-t border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-800 sm:flex-row"
      >
        <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Show</span>
          <select
            :value="pageLength"
            @change="pageLength = Number($event.target.value); currentPage = 1"
            class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
          <span>per page</span>
        </div>
        <div class="flex items-center gap-1">
          <button @click="currentPage = 1" :disabled="currentPage <= 1" class="pg-btn"><FeatherIcon name="chevrons-left" class="h-4 w-4" /></button>
          <button @click="currentPage--" :disabled="currentPage <= 1" class="pg-btn"><FeatherIcon name="chevron-left" class="h-4 w-4" /></button>
          <span class="px-3 text-sm text-gray-700 dark:text-gray-300">Page {{ currentPage }} of {{ totalPages }}</span>
          <button @click="currentPage++" :disabled="currentPage >= totalPages" class="pg-btn"><FeatherIcon name="chevron-right" class="h-4 w-4" /></button>
          <button @click="currentPage = totalPages" :disabled="currentPage >= totalPages" class="pg-btn"><FeatherIcon name="chevrons-right" class="h-4 w-4" /></button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { call, toast } from 'frappe-ui'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorState from '@/components/shared/ErrorState.vue'
import EmptyState from '@/components/shared/EmptyState.vue'

const auth = useAuthStore()

const departments = reactive([])
const selectedDeptName = ref('')
const togglingMember = ref(null)
const memberSearch = ref('')
const statusFilter = ref('')
const pageLength = ref(20)
const currentPage = ref(1)

const selectedDept = computed(() => departments.find(d => d.name === selectedDeptName.value) || null)

// Filtered and paginated members
const filteredMembers = computed(() => {
  const members = selectedDept.value?._members || []
  let result = members
  if (memberSearch.value) {
    const q = memberSearch.value.toLowerCase()
    result = result.filter(m =>
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q)
    )
  }
  if (statusFilter.value === 'active') result = result.filter(m => m.is_active)
  else if (statusFilter.value === 'inactive') result = result.filter(m => !m.is_active)
  return result
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredMembers.value.length / pageLength.value)))
const paginatedMembers = computed(() => {
  const start = (currentPage.value - 1) * pageLength.value
  return filteredMembers.value.slice(start, start + pageLength.value)
})

// Stats
const activeCount = computed(() => (selectedDept.value?._members || []).filter(m => m.is_active).length)
const inactiveCount = computed(() => (selectedDept.value?._members || []).filter(m => !m.is_active).length)
const totalAssignments = computed(() => (selectedDept.value?._members || []).reduce((sum, m) => sum + (m.total_assignments || 0), 0))
const maxAssignments = computed(() => Math.max(1, ...((selectedDept.value?._members || []).map(m => m.total_assignments || 0))))

// Reset page when filters change
watch([memberSearch, statusFilter], () => { currentPage.value = 1 })

function getInitials(name) {
  if (!name) return '?'
  const parts = name.split(/[\s@]+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

function workloadPercent(member) {
  if (maxAssignments.value <= 0) return 0
  return Math.round(((member.total_assignments || 0) / maxAssignments.value) * 100)
}

function workloadColor(member) {
  const pct = workloadPercent(member)
  if (pct >= 80) return 'bg-red-500'
  if (pct >= 50) return 'bg-amber-500'
  if (pct > 0) return 'bg-blue-500'
  return 'bg-gray-300 dark:bg-gray-600'
}

function selectDept(dept) {
  selectedDeptName.value = dept.name
  memberSearch.value = ''
  statusFilter.value = ''
  currentPage.value = 1
}

async function refreshCurrent() {
  if (selectedDept.value) {
    await Promise.all([loadMembers(selectedDept.value), loadDepartmentAlgorithm(selectedDept.value)])
  }
}

async function loadMembers(dept) {
  dept._loading = true
  dept._error = null
  try {
    const members = await call('meeting_manager.meeting_manager.api.booking.get_department_members', { department: dept.name })
    dept._members = members || []
  } catch (e) {
    dept._error = e.message || 'Failed to load members'
  } finally {
    dept._loading = false
  }
}

async function loadDepartmentAlgorithm(dept) {
  try {
    const doc = await call('frappe.client.get', { doctype: 'MM Department', name: dept.name })
    dept._algorithm = doc.assignment_algorithm || 'Round Robin'
  } catch {
    dept._algorithm = 'Unknown'
  }
}

async function toggleMemberStatus(dept, member) {
  const newStatus = !member.is_active
  const action = newStatus ? 'activate' : 'deactivate'

  togglingMember.value = member.user_id
  try {
    const doc = await call('frappe.client.get', { doctype: 'MM Department', name: dept.name })
    if (doc.members) {
      const memberRow = doc.members.find(m => m.member === member.user_id)
      if (memberRow) {
        memberRow.is_active = newStatus ? 1 : 0
        await call('frappe.client.save', { doc })
        member.is_active = newStatus ? 1 : 0
        toast({ title: `${member.full_name} ${newStatus ? 'activated' : 'deactivated'}`, icon: 'check' })
      } else {
        toast({ title: 'Member not found in department', icon: 'x' })
      }
    }
  } catch (e) {
    toast({ title: e.message || `Failed to ${action} member`, icon: 'x' })
  } finally {
    togglingMember.value = null
  }
}

async function initializeDepartments() {
  if (!auth.isInitialized) await auth.initialize()

  const ledDepts = auth.ledDepartments
  departments.length = 0

  for (const dept of ledDepts) {
    departments.push(reactive({
      name: dept.name,
      department_name: dept.department_name,
      _members: [],
      _loading: false,
      _error: null,
      _algorithm: '',
    }))
  }

  // Auto-select first
  if (departments.length > 0) {
    selectedDeptName.value = departments[0].name
  }

  // Load all in parallel
  await Promise.allSettled(departments.flatMap(d => [loadMembers(d), loadDepartmentAlgorithm(d)]))
}

onMounted(() => { initializeDepartments() })
</script>

<style scoped>
.pg-btn {
  @apply rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800;
}
</style>
