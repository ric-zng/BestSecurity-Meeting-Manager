<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
      <!-- Loading -->
      <LoadingSpinner v-if="auth.isLoading" fullPage />

      <!-- Access Denied -->
      <div v-else-if="!auth.isDepartmentLeader" class="flex h-screen items-center justify-center">
        <EmptyState
          icon="shield"
          title="Access Denied"
          description="You need to be a department leader or system manager to view this page."
        />
      </div>

      <!-- Content -->
      <div v-else class="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Team Settings</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your department teams and members.
          </p>
        </div>

        <!-- No Departments -->
        <div v-if="departments.length === 0">
          <EmptyState
            icon="users"
            title="No departments"
            description="You are not leading any departments."
          />
        </div>

        <!-- Department Cards -->
        <div v-else class="space-y-6">
          <div
            v-for="dept in departments"
            :key="dept.name"
            class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <!-- Department Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <FeatherIcon name="users" class="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 class="text-base font-semibold text-gray-900 dark:text-white">
                    {{ dept.department_name }}
                  </h2>
                  <div class="mt-0.5 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{{ dept._members?.length || 0 }} members</span>
                    <span v-if="dept._algorithm" class="flex items-center gap-1">
                      <FeatherIcon name="cpu" class="h-3 w-3" />
                      {{ dept._algorithm }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <router-link
                  v-if="auth.isSystemManager"
                  :to="`/admin/departments/${dept.name}`"
                  class="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <FeatherIcon name="settings" class="h-3 w-3" />
                  Full Settings
                </router-link>
                <button
                  @click="toggleDept(dept.name)"
                  class="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <FeatherIcon
                    name="chevron-down"
                    class="h-4 w-4 transition-transform duration-200"
                    :class="{ 'rotate-180': expandedDept === dept.name }"
                  />
                </button>
              </div>
            </div>

            <!-- Members List (always visible, collapsible detail) -->
            <div v-if="expandedDept === dept.name || expandedDept === null">
              <!-- Loading members -->
              <div v-if="dept._loading" class="p-6">
                <LoadingSpinner size="sm" />
              </div>

              <!-- Members error -->
              <div v-else-if="dept._error" class="p-5">
                <ErrorState
                  :message="dept._error"
                  @retry="loadMembers(dept)"
                />
              </div>

              <!-- No members -->
              <div v-else-if="!dept._members || dept._members.length === 0" class="p-5">
                <EmptyState
                  icon="user-x"
                  title="No members"
                  description="This department has no members yet."
                />
              </div>

              <!-- Members table -->
              <div v-else class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                      <th class="px-5 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Member</th>
                      <th class="px-5 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Email</th>
                      <th class="px-5 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Assignments</th>
                      <th class="px-5 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Status</th>
                      <th class="px-5 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="member in dept._members"
                      :key="member.user_id"
                      class="border-b border-gray-100 transition-colors hover:bg-gray-50 last:border-0 dark:border-gray-800 dark:hover:bg-gray-800/30"
                      :class="{ 'odd:bg-white even:bg-gray-50/50 dark:odd:bg-gray-900 dark:even:bg-gray-800/20': true }"
                    >
                      <td class="px-5 py-3">
                        <div class="flex items-center gap-3">
                          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                            {{ getInitials(member.full_name) }}
                          </div>
                          <span class="font-medium text-gray-900 dark:text-white">
                            {{ member.full_name }}
                          </span>
                        </div>
                      </td>
                      <td class="px-5 py-3 text-gray-600 dark:text-gray-400">
                        {{ member.email }}
                      </td>
                      <td class="px-5 py-3 text-center">
                        <span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {{ member.total_assignments || 0 }}
                        </span>
                      </td>
                      <td class="px-5 py-3 text-center">
                        <span
                          :class="member.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'"
                          class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        >
                          {{ member.is_active ? 'Active' : 'Inactive' }}
                        </span>
                      </td>
                      <td class="px-5 py-3 text-right">
                        <div class="flex items-center justify-end gap-1">
                          <button
                            @click="toggleMemberStatus(dept, member)"
                            :disabled="togglingMember === member.user_id"
                            class="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none dark:hover:bg-gray-800 dark:hover:text-gray-300"
                            :title="member.is_active ? 'Deactivate member' : 'Activate member'"
                          >
                            <FeatherIcon
                              v-if="togglingMember === member.user_id"
                              name="loader"
                              class="h-4 w-4 animate-spin"
                            />
                            <FeatherIcon
                              v-else
                              :name="member.is_active ? 'user-x' : 'user-check'"
                              class="h-4 w-4"
                            />
                          </button>
                          <router-link
                            v-if="auth.isSystemManager"
                            :to="`/admin/departments/${dept.name}`"
                            class="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                            title="View member settings"
                          >
                            <FeatherIcon name="external-link" class="h-4 w-4" />
                          </router-link>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Status Message -->
        <p v-if="statusMessage" class="mt-4 text-center text-sm" :class="statusMsgClass">{{ statusMessage }}</p>
      </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { call } from 'frappe-ui'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorState from '@/components/shared/ErrorState.vue'
import EmptyState from '@/components/shared/EmptyState.vue'

const auth = useAuthStore()

const departments = reactive([])
const expandedDept = ref(null)
const togglingMember = ref(null)
const statusMessage = ref('')
const statusMsgClass = ref('')

function getInitials(name) {
  if (!name) return '?'
  const parts = name.split(/[\s@]+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

function toggleDept(name) {
  expandedDept.value = expandedDept.value === name ? null : name
}

function showStatus(msg, isError = false) {
  statusMessage.value = msg
  statusMsgClass.value = isError
    ? 'text-red-600 dark:text-red-400'
    : 'text-emerald-600 dark:text-emerald-400'
  setTimeout(() => { statusMessage.value = '' }, 4000)
}

async function loadMembers(dept) {
  dept._loading = true
  dept._error = null
  try {
    const members = await call(
      'meeting_manager.meeting_manager.api.booking.get_department_members',
      { department: dept.name }
    )
    dept._members = members || []
  } catch (e) {
    dept._error = e.message || 'Failed to load members'
  } finally {
    dept._loading = false
  }
}

async function loadDepartmentAlgorithm(dept) {
  try {
    const doc = await call('frappe.client.get', {
      doctype: 'MM Department',
      name: dept.name,
    })
    dept._algorithm = doc.assignment_algorithm || 'Round Robin'
  } catch (e) {
    dept._algorithm = 'Unknown'
  }
}

async function toggleMemberStatus(dept, member) {
  const newStatus = !member.is_active
  const action = newStatus ? 'activate' : 'deactivate'
  if (!confirm(`Are you sure you want to ${action} ${member.full_name}?`)) return

  togglingMember.value = member.user_id
  try {
    // Find the child row in the department doc and update it
    const doc = await call('frappe.client.get', {
      doctype: 'MM Department',
      name: dept.name,
    })

    if (doc.members) {
      const memberRow = doc.members.find(m => m.member === member.user_id)
      if (memberRow) {
        memberRow.is_active = newStatus ? 1 : 0
        await call('frappe.client.save', { doc })
        member.is_active = newStatus ? 1 : 0
        showStatus(`${member.full_name} ${newStatus ? 'activated' : 'deactivated'}.`)
      } else {
        showStatus('Member not found in department.', true)
      }
    }
  } catch (e) {
    showStatus(e.message || `Failed to ${action} member.`, true)
  } finally {
    togglingMember.value = null
  }
}

async function initializeDepartments() {
  if (!auth.isInitialized) {
    await auth.initialize()
  }

  const ledDepts = auth.ledDepartments
  departments.length = 0

  for (const dept of ledDepts) {
    const deptObj = reactive({
      name: dept.name,
      department_name: dept.department_name,
      _members: [],
      _loading: false,
      _error: null,
      _algorithm: '',
    })
    departments.push(deptObj)
  }

  // Load all members and algorithms in parallel
  const promises = departments.flatMap(dept => [
    loadMembers(dept),
    loadDepartmentAlgorithm(dept),
  ])
  await Promise.allSettled(promises)

  // Auto-expand if only one department
  if (departments.length === 1) {
    expandedDept.value = departments[0].name
  }
}

onMounted(() => {
  initializeDepartments()
})
</script>
