<template>
  <div class="flex h-full flex-col overflow-auto">
    <!-- Header -->
    <div class="flex flex-col gap-4 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <button
          @click="router.push('/admin/departments')"
          class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <FeatherIcon name="arrow-left" class="h-5 w-5" />
        </button>
        <div>
          <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ doc.doc?.department_name || 'Department' }}
          </h1>
          <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{{ id }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="saveDepartment"
          :disabled="saving"
          class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          <FeatherIcon name="save" class="h-4 w-4" />
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
        <button
          @click="confirmDelete"
          class="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          <FeatherIcon name="trash-2" class="h-4 w-4" />
          Delete
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-6">
      <!-- Loading -->
      <LoadingSpinner v-if="doc.loading" />

      <!-- Error -->
      <ErrorState v-else-if="doc.error" :message="doc.error" @retry="doc.reload()" />

      <div v-else-if="doc.doc" class="mx-auto max-w-4xl space-y-6">
        <!-- Basic Info Card -->
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 class="mb-4 text-base font-semibold text-gray-900 dark:text-white">Basic Information</h2>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Department Name</label>
              <input
                v-model="form.department_name"
                type="text"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Slug</label>
              <input
                v-model="form.department_slug"
                type="text"
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
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
              <input
                v-model="form.timezone"
                type="text"
                placeholder="e.g. Europe/Copenhagen"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Department Leader</label>
              <input
                v-model="form.department_leader"
                type="text"
                placeholder="user@example.com"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Assignment Algorithm</label>
              <select
                v-model="form.assignment_algorithm"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="Round Robin">Round Robin</option>
                <option value="Least Busy">Least Busy</option>
              </select>
            </div>
            <div class="flex items-center gap-6">
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
                  v-model="form.notify_leader_on_booking"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
                Notify Leader on Booking
              </label>
              <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  v-model="form.notify_admin_on_booking"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
                Notify Admin on Booking
              </label>
            </div>
          </div>
        </div>

        <!-- Public Booking URL Card -->
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
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
              class="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-750"
              title="Copy URL"
            >
              <FeatherIcon :name="copied ? 'check' : 'copy'" class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Department Members Card -->
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">
              Department Members
              <span class="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
                ({{ members.length }})
              </span>
            </h2>
            <button
              @click="showAddMember = true"
              class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <FeatherIcon name="user-plus" class="h-4 w-4" />
              Add Member
            </button>
          </div>

          <!-- Members Table -->
          <div v-if="members.length > 0" class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <table class="w-full">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <th class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">User</th>
                  <th class="w-16 px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(member, idx) in members"
                  :key="idx"
                  class="border-b border-gray-100 dark:border-gray-800/50"
                  :class="idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-900/70'"
                >
                  <td class="px-4 py-2.5 text-sm text-gray-900 dark:text-white">
                    {{ member.user }}
                  </td>
                  <td class="px-4 py-2.5 text-right">
                    <button
                      @click="removeMember(idx)"
                      class="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                      title="Remove member"
                    >
                      <FeatherIcon name="x" class="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <EmptyState
            v-else
            icon="users"
            title="No members yet"
            description="Add team members to this department"
          />

          <!-- Add Member Inline Form -->
          <div v-if="showAddMember" class="mt-4 flex items-end gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">User Email</label>
              <input
                v-model="newMemberEmail"
                type="text"
                placeholder="user@example.com"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                @keyup.enter="addMember"
              />
            </div>
            <button
              @click="addMember"
              :disabled="!newMemberEmail"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Add
            </button>
            <button
              @click="showAddMember = false; newMemberEmail = ''"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Cancel
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
        <div class="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Delete Department</h3>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Are you sure you want to delete "{{ doc.doc?.department_name }}"? This action cannot be undone.
          </p>
          <div class="mt-6 flex items-center justify-end gap-3">
            <button
              @click="showDeleteModal = false"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-750"
            >
              Cancel
            </button>
            <button
              @click="deleteDepartment"
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
import { ref, reactive, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { createDocumentResource, call } from 'frappe-ui'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import ErrorState from '@/components/shared/ErrorState.vue'

const props = defineProps({ id: String })
const router = useRouter()
const auth = useAuthStore()

// Document resource
const doc = createDocumentResource({
  doctype: 'MM Department',
  name: props.id,
  auto: true,
})

// Form state
const form = reactive({
  department_name: '',
  department_slug: '',
  description: '',
  timezone: '',
  department_leader: '',
  assignment_algorithm: 'Round Robin',
  is_active: true,
  notify_leader_on_booking: false,
  notify_admin_on_booking: false,
})

// Sync doc -> form on load
watch(() => doc.doc, (d) => {
  if (d) {
    form.department_name = d.department_name || ''
    form.department_slug = d.department_slug || ''
    form.description = d.description || ''
    form.timezone = d.timezone || ''
    form.department_leader = d.department_leader || ''
    form.assignment_algorithm = d.assignment_algorithm || 'Round Robin'
    form.is_active = !!d.is_active
    form.notify_leader_on_booking = !!d.notify_leader_on_booking
    form.notify_admin_on_booking = !!d.notify_admin_on_booking
  }
}, { immediate: true })

// Members
const members = computed(() => doc.doc?.department_members || [])
const showAddMember = ref(false)
const newMemberEmail = ref('')

function addMember() {
  if (!newMemberEmail.value) return
  const existing = members.value.find((m) => m.user === newMemberEmail.value)
  if (existing) {
    newMemberEmail.value = ''
    return
  }
  if (!doc.doc.department_members) {
    doc.doc.department_members = []
  }
  doc.doc.department_members.push({ user: newMemberEmail.value })
  newMemberEmail.value = ''
  showAddMember.value = false
}

function removeMember(idx) {
  doc.doc.department_members.splice(idx, 1)
}

// Save
const saving = ref(false)
async function saveDepartment() {
  saving.value = true
  try {
    await doc.setValue.submit({
      department_name: form.department_name,
      department_slug: form.department_slug,
      description: form.description,
      timezone: form.timezone,
      department_leader: form.department_leader,
      assignment_algorithm: form.assignment_algorithm,
      is_active: form.is_active ? 1 : 0,
      notify_leader_on_booking: form.notify_leader_on_booking ? 1 : 0,
      notify_admin_on_booking: form.notify_admin_on_booking ? 1 : 0,
      department_members: doc.doc.department_members || [],
    })
    doc.reload()
  } catch (e) {
    console.error('Failed to save department:', e)
  } finally {
    saving.value = false
  }
}

// Delete
const showDeleteModal = ref(false)
const deleting = ref(false)

function confirmDelete() {
  showDeleteModal.value = true
}

async function deleteDepartment() {
  deleting.value = true
  try {
    await doc.delete.submit()
    router.push('/admin/departments')
  } catch (e) {
    console.error('Failed to delete department:', e)
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
