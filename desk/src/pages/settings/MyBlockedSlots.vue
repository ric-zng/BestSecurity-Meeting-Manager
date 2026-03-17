<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- Loading -->
      <LoadingSpinner v-if="loading" fullPage />

      <!-- Error -->
      <ErrorState
        v-else-if="error"
        :message="error"
        @retry="loadSlots"
      />

      <!-- Content -->
      <div v-else class="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <!-- Header -->
        <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">My Blocked Slots</h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Block out times when you are unavailable for meetings.
            </p>
          </div>
          <button
            @click="showAddForm = !showAddForm"
            class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            <FeatherIcon :name="showAddForm ? 'x' : 'plus'" class="h-4 w-4" />
            {{ showAddForm ? 'Cancel' : 'Block Time' }}
          </button>
        </div>

        <!-- Add Slot Form -->
        <div
          v-if="showAddForm"
          class="mb-6 rounded-lg border border-blue-200 bg-blue-50/50 shadow-sm dark:border-blue-800 dark:bg-blue-950/30"
        >
          <div class="border-b border-blue-200 px-5 py-4 dark:border-blue-800">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">Block a Time Slot</h2>
          </div>
          <div class="space-y-4 p-5">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Date *</label>
                <input
                  v-model="newSlot.blocked_date"
                  type="date"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time *</label>
                <input
                  v-model="newSlot.start_time"
                  type="time"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">End Time *</label>
                <input
                  v-model="newSlot.end_time"
                  type="time"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Reason</label>
                <input
                  v-model="newSlot.reason"
                  type="text"
                  placeholder="Optional"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                />
              </div>
            </div>
            <div class="flex justify-end">
              <button
                @click="createSlot"
                :disabled="!canCreateSlot || creating"
                class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FeatherIcon v-if="creating" name="loader" class="h-4 w-4 animate-spin" />
                {{ creating ? 'Adding...' : 'Add Blocked Slot' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Filter -->
        <div class="mb-4 flex items-center gap-3">
          <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              v-model="showUpcomingOnly"
              type="checkbox"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
            />
            Show upcoming only
          </label>
          <span class="text-xs text-gray-400 dark:text-gray-500">
            {{ filteredSlots.length }} slot{{ filteredSlots.length !== 1 ? 's' : '' }}
          </span>
        </div>

        <!-- Empty State -->
        <div v-if="filteredSlots.length === 0 && !showAddForm">
          <EmptyState
            icon="clock"
            :title="showUpcomingOnly ? 'No upcoming blocked slots' : 'No blocked slots'"
            :description="showUpcomingOnly ? 'You have no upcoming blocked time slots.' : 'Block out times when you are unavailable for meetings.'"
          >
            <template #action>
              <button
                @click="showAddForm = true"
                class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <FeatherIcon name="plus" class="h-4 w-4" />
                Block Time
              </button>
            </template>
          </EmptyState>
        </div>

        <!-- Slots Table -->
        <div v-else class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700">
                  <th class="bg-gray-50 px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Date</th>
                  <th class="bg-gray-50 px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Time</th>
                  <th class="bg-gray-50 px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Reason</th>
                  <th class="bg-gray-50 px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Status</th>
                  <th class="bg-gray-50 px-5 py-3 text-right dark:bg-gray-800/50"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                <tr
                  v-for="slot in filteredSlots"
                  :key="slot.name"
                  class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td class="px-5 py-3 font-medium text-gray-900 dark:text-white">
                    <div class="flex items-center gap-2">
                      <FeatherIcon name="calendar" class="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      {{ formatDate(slot.blocked_date) }}
                    </div>
                    <span class="mt-0.5 block text-xs text-gray-400 dark:text-gray-500">
                      {{ dayOfWeek(slot.blocked_date) }}
                    </span>
                  </td>
                  <td class="px-5 py-3 text-gray-700 dark:text-gray-300">
                    {{ formatTimeStr(slot.start_time) }} - {{ formatTimeStr(slot.end_time) }}
                  </td>
                  <td class="px-5 py-3 text-gray-600 dark:text-gray-400">
                    {{ slot.reason || '--' }}
                  </td>
                  <td class="px-5 py-3">
                    <span
                      :class="isPast(slot.blocked_date)
                        ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        : isToday(slot.blocked_date)
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'"
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    >
                      {{ isPast(slot.blocked_date) ? 'Past' : isToday(slot.blocked_date) ? 'Today' : 'Upcoming' }}
                    </span>
                  </td>
                  <td class="px-5 py-3 text-right">
                    <button
                      @click="deleteSlot(slot.name)"
                      :disabled="deletingSlot === slot.name"
                      class="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 focus:outline-none dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      title="Delete slot"
                    >
                      <FeatherIcon v-if="deletingSlot === slot.name" name="loader" class="h-4 w-4 animate-spin" />
                      <FeatherIcon v-else name="trash-2" class="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Status Message -->
        <p v-if="statusMessage" class="mt-4 text-center text-sm" :class="statusMsgClass">{{ statusMessage }}</p>
      </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { call } from 'frappe-ui'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorState from '@/components/shared/ErrorState.vue'
import EmptyState from '@/components/shared/EmptyState.vue'

const auth = useAuthStore()

const loading = ref(true)
const error = ref(null)
const slots = ref([])
const showAddForm = ref(false)
const showUpcomingOnly = ref(true)
const creating = ref(false)
const deletingSlot = ref(null)
const statusMessage = ref('')
const statusMsgClass = ref('')

const newSlot = reactive({
  blocked_date: '',
  start_time: '09:00',
  end_time: '17:00',
  reason: '',
})

const canCreateSlot = computed(() => {
  return newSlot.blocked_date && newSlot.start_time && newSlot.end_time
})

const todayStr = computed(() => {
  const d = new Date()
  return d.toISOString().slice(0, 10)
})

const filteredSlots = computed(() => {
  let list = [...slots.value]
  if (showUpcomingOnly.value) {
    list = list.filter(s => s.blocked_date >= todayStr.value)
  }
  // Sort by date descending
  list.sort((a, b) => (b.blocked_date > a.blocked_date ? 1 : b.blocked_date < a.blocked_date ? -1 : 0))
  return list
})

function isPast(date) {
  return date < todayStr.value
}

function isToday(date) {
  return date === todayStr.value
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function dayOfWeek(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long' })
}

function formatTimeStr(time) {
  if (!time) return ''
  // time is HH:mm or HH:mm:ss
  return time.slice(0, 5)
}

function showStatus(msg, isError = false) {
  statusMessage.value = msg
  statusMsgClass.value = isError
    ? 'text-red-600 dark:text-red-400'
    : 'text-emerald-600 dark:text-emerald-400'
  setTimeout(() => { statusMessage.value = '' }, 4000)
}

async function loadSlots() {
  loading.value = true
  error.value = null
  try {
    const list = await call('frappe.client.get_list', {
      doctype: 'MM User Blocked Slot',
      filters: { user: auth.user },
      fields: ['name', 'blocked_date', 'start_time', 'end_time', 'reason'],
      order_by: 'blocked_date desc',
      limit_page_length: 200,
    })
    slots.value = list || []
  } catch (e) {
    error.value = e.message || 'Failed to load blocked slots'
  } finally {
    loading.value = false
  }
}

async function createSlot() {
  if (!canCreateSlot.value) return
  creating.value = true
  try {
    await call('frappe.client.insert', {
      doc: {
        doctype: 'MM User Blocked Slot',
        user: auth.user,
        blocked_date: newSlot.blocked_date,
        start_time: newSlot.start_time,
        end_time: newSlot.end_time,
        reason: newSlot.reason,
      },
    })
    // Reset form
    newSlot.blocked_date = ''
    newSlot.start_time = '09:00'
    newSlot.end_time = '17:00'
    newSlot.reason = ''
    showAddForm.value = false
    showStatus('Blocked slot added.')
    await loadSlots()
  } catch (e) {
    showStatus(e.message || 'Failed to create blocked slot.', true)
  } finally {
    creating.value = false
  }
}

async function deleteSlot(name) {
  if (!confirm('Delete this blocked slot?')) return
  deletingSlot.value = name
  try {
    await call('frappe.client.delete', {
      doctype: 'MM User Blocked Slot',
      name,
    })
    slots.value = slots.value.filter(s => s.name !== name)
    showStatus('Blocked slot removed.')
  } catch (e) {
    showStatus(e.message || 'Failed to delete blocked slot.', true)
  } finally {
    deletingSlot.value = null
  }
}

onMounted(async () => {
  if (!auth.isInitialized) {
    await auth.initialize()
  }
  await loadSlots()
})
</script>
