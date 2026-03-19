<template>
  <div class="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
    <!-- Sticky Header -->
    <div class="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-800">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-semibold text-gray-900 dark:text-white">My Blocked Slots</h1>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Block out times when you are unavailable for meetings.</p>
        </div>
        <button
          @click="openAddModal()"
          class="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <FeatherIcon name="plus" class="h-3.5 w-3.5" />
          Block Time
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <LoadingSpinner />
    </div>

    <!-- Error -->
    <ErrorState v-else-if="error" :message="error" @retry="loadSlots" />

    <!-- Empty -->
    <div v-else-if="slots.length === 0" class="flex flex-col items-center justify-center py-24">
      <div class="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <FeatherIcon name="slash" class="h-7 w-7 text-gray-400" />
      </div>
      <h3 class="mt-4 text-sm font-semibold text-gray-900 dark:text-white">No blocked slots</h3>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Block times when you're unavailable for meetings.</p>
      <button @click="openAddModal()" class="mt-4 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
        <FeatherIcon name="plus" class="h-3.5 w-3.5" />
        Block Time
      </button>
    </div>

    <!-- Content -->
    <div v-else class="mx-auto grid max-w-[1400px] gap-6 p-6 lg:grid-cols-3">
      <!-- Left: Slots list -->
      <div class="space-y-4 lg:col-span-2">
        <!-- Filter tabs -->
        <div class="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
          <button
            v-for="tab in filterTabs"
            :key="tab.key"
            @click="activeFilter = tab.key"
            class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            :class="activeFilter === tab.key
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
          >
            {{ tab.label }} ({{ tab.count }})
          </button>
        </div>

        <!-- Grouped by date -->
        <div v-if="groupedSlots.length > 0" class="space-y-3">
          <div v-for="group in paginatedGroups" :key="group.date">
            <!-- Date header -->
            <div class="flex items-center gap-2 px-1">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-semibold text-gray-900 dark:text-white">{{ formatDateFull(group.date) }}</span>
                <span
                  :class="group.statusClass"
                  class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                >{{ group.statusLabel }}</span>
              </div>
              <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
              <span class="text-[10px] text-gray-400 dark:text-gray-500">{{ group.slots.length }} slot{{ group.slots.length !== 1 ? 's' : '' }}</span>
            </div>

            <!-- Slot cards for this date -->
            <div class="space-y-2">
              <div
                v-for="slot in group.slots"
                :key="slot.name"
                class="group flex items-center gap-4 rounded-lg border bg-white px-4 py-3 transition-all hover:shadow-sm dark:bg-gray-800"
                :class="isPast(slot.blocked_date)
                  ? 'border-gray-200 opacity-60 dark:border-gray-700'
                  : isToday(slot.blocked_date)
                    ? 'border-amber-200 dark:border-amber-800'
                    : 'border-gray-200 dark:border-gray-700'"
              >
                <!-- Time block -->
                <div class="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
                  <FeatherIcon name="clock" class="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ fmtTime(slot.start_time) }}
                  </span>
                  <FeatherIcon name="arrow-right" class="h-3 w-3 text-gray-300 dark:text-gray-600" />
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ fmtTime(slot.end_time) }}
                  </span>
                </div>

                <!-- Duration -->
                <span class="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                  {{ calcDuration(slot.start_time, slot.end_time) }}
                </span>

                <!-- Reason -->
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm text-gray-700 dark:text-gray-300">{{ slot.reason || '--' }}</p>
                </div>

                <!-- Actions -->
                <div v-if="isPast(slot.blocked_date)" class="flex items-center gap-1.5 text-gray-300 dark:text-gray-600" title="Past slots are locked for audit purposes">
                  <FeatherIcon name="lock" class="h-3.5 w-3.5" />
                </div>
                <div v-else class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    @click="openEditModal(slot)"
                    class="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                    title="Edit"
                  >
                    <FeatherIcon name="edit-2" class="h-3.5 w-3.5" />
                  </button>
                  <button
                    @click="confirmDelete(slot)"
                    class="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    title="Delete"
                  >
                    <FeatherIcon name="trash-2" class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No results for filter -->
        <div v-else class="rounded-lg border border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <FeatherIcon name="search" class="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">No {{ activeFilter === 'all' ? '' : activeFilter }} blocked slots found.</p>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800">
          <span class="text-xs text-gray-500 dark:text-gray-400">
            Page {{ currentPage }} of {{ totalPages }} &middot; {{ filteredSlots.length }} slot{{ filteredSlots.length !== 1 ? 's' : '' }}
          </span>
          <div class="flex items-center gap-1">
            <button @click="currentPage--" :disabled="currentPage <= 1" class="rounded-md p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700">
              <FeatherIcon name="chevron-left" class="h-4 w-4" />
            </button>
            <button @click="currentPage++" :disabled="currentPage >= totalPages" class="rounded-md p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700">
              <FeatherIcon name="chevron-right" class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Right: Guide -->
      <div class="space-y-4">
        <!-- Quick Stats -->
        <div class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Overview</h3>
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-md bg-gray-50 p-3 dark:bg-gray-700/50">
              <p class="text-lg font-bold text-gray-900 dark:text-white">{{ upcomingCount }}</p>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">Upcoming</p>
            </div>
            <div class="rounded-md bg-gray-50 p-3 dark:bg-gray-700/50">
              <p class="text-lg font-bold text-gray-900 dark:text-white">{{ todayCount }}</p>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">Today</p>
            </div>
            <div class="rounded-md bg-gray-50 p-3 dark:bg-gray-700/50">
              <p class="text-lg font-bold text-gray-900 dark:text-white">{{ thisWeekCount }}</p>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">This Week</p>
            </div>
            <div class="rounded-md bg-gray-50 p-3 dark:bg-gray-700/50">
              <p class="text-lg font-bold text-gray-900 dark:text-white">{{ slots.length }}</p>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">Total</p>
            </div>
          </div>
        </div>

        <!-- Guide -->
        <div class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">How It Works</h3>
          <div class="space-y-3">
            <div class="flex gap-2.5">
              <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">1</div>
              <div>
                <p class="text-xs font-medium text-gray-900 dark:text-white">Block a time slot</p>
                <p class="text-[11px] text-gray-500 dark:text-gray-400">Choose a date, time range, and reason.</p>
              </div>
            </div>
            <div class="flex gap-2.5">
              <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">2</div>
              <div>
                <p class="text-xs font-medium text-gray-900 dark:text-white">Time becomes unavailable</p>
                <p class="text-[11px] text-gray-500 dark:text-gray-400">Others cannot book meetings during your blocked times.</p>
              </div>
            </div>
            <div class="flex gap-2.5">
              <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">3</div>
              <div>
                <p class="text-xs font-medium text-gray-900 dark:text-white">Shows on your calendar</p>
                <p class="text-[11px] text-gray-500 dark:text-gray-400">Blocked slots appear as unavailable on the shared calendar.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Tips -->
        <div class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Tips</h3>
          <ul class="space-y-2 text-[11px] text-gray-600 dark:text-gray-300">
            <li class="flex items-start gap-2">
              <FeatherIcon name="coffee" class="mt-0.5 h-3 w-3 shrink-0 text-gray-400 dark:text-gray-500" />
              <span>Use blocked slots for lunch breaks, focus time, or personal appointments.</span>
            </li>
            <li class="flex items-start gap-2">
              <FeatherIcon name="repeat" class="mt-0.5 h-3 w-3 shrink-0 text-gray-400 dark:text-gray-500" />
              <span>For recurring unavailability, use <strong class="text-gray-900 dark:text-white">My Availability</strong> rules instead.</span>
            </li>
            <li class="flex items-start gap-2">
              <FeatherIcon name="shield" class="mt-0.5 h-3 w-3 shrink-0 text-gray-400 dark:text-gray-500" />
              <span>Blocked slots override your availability rules for that specific time.</span>
            </li>
            <li class="flex items-start gap-2">
              <FeatherIcon name="alert-triangle" class="mt-0.5 h-3 w-3 shrink-0 text-amber-500 dark:text-amber-400" />
              <span>You cannot block time that conflicts with existing meetings.</span>
            </li>
            <li class="flex items-start gap-2">
              <FeatherIcon name="lock" class="mt-0.5 h-3 w-3 shrink-0 text-gray-400 dark:text-gray-500" />
              <span>Past blocked slots are locked and cannot be edited or deleted (audit trail).</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <transition name="bs-fade">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @mousedown.self="showModal = false">
        <div class="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
          <!-- Modal header -->
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 dark:border-gray-700">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ editingSlot ? 'Edit Blocked Slot' : 'Block a Time Slot' }}
            </h3>
            <button @click="showModal = false" class="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
              <FeatherIcon name="x" class="h-4 w-4" />
            </button>
          </div>

          <!-- Form -->
          <div class="space-y-4 px-5 py-4">
            <!-- Date -->
            <div>
              <label class="bs-label">Date <span class="text-red-500">*</span></label>
              <DatePicker v-model="form.blocked_date" placeholder="Select date..." :minDate="editingSlot ? '' : todayStr" />
            </div>

            <!-- Time range -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="bs-label">Start Time <span class="text-red-500">*</span></label>
                <div class="flex items-center gap-1">
                  <button @click="stepTime('start', -15)" type="button" class="bs-step-btn">
                    <FeatherIcon name="minus" class="h-3 w-3" />
                  </button>
                  <div class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm font-medium text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    {{ form.start_time }}
                  </div>
                  <button @click="stepTime('start', 15)" type="button" class="bs-step-btn">
                    <FeatherIcon name="plus" class="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div>
                <label class="bs-label">End Time <span class="text-red-500">*</span></label>
                <div class="flex items-center gap-1">
                  <button @click="stepTime('end', -15)" type="button" class="bs-step-btn">
                    <FeatherIcon name="minus" class="h-3 w-3" />
                  </button>
                  <div class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm font-medium text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    {{ form.end_time }}
                  </div>
                  <button @click="stepTime('end', 15)" type="button" class="bs-step-btn">
                    <FeatherIcon name="plus" class="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Duration display -->
            <div v-if="form.start_time && form.end_time && !timeError" class="flex items-center gap-1.5 rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
              <FeatherIcon name="clock" class="h-3.5 w-3.5 text-gray-400" />
              <span class="text-xs text-gray-600 dark:text-gray-400">Duration: <strong class="text-gray-900 dark:text-white">{{ calcDuration(form.start_time, form.end_time) }}</strong></span>
            </div>

            <!-- Time error -->
            <p v-if="timeError" class="flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
              <FeatherIcon name="alert-circle" class="h-3.5 w-3.5 shrink-0" />
              {{ timeError }}
            </p>

            <!-- Reason -->
            <div>
              <label class="bs-label">Reason <span class="text-red-500">*</span></label>
              <input
                v-model="form.reason"
                type="text"
                placeholder="e.g., Lunch break, Doctor appointment, Focus time"
                class="bs-input"
              />
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-gray-700">
            <button @click="showModal = false" class="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button
              @click="saveSlot"
              :disabled="!canSave || saving"
              class="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <FeatherIcon v-if="saving" name="loader" class="h-3 w-3 animate-spin" />
              {{ saving ? 'Saving...' : (editingSlot ? 'Update' : 'Block Time') }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Confirm Delete Modal -->
    <ConfirmModal
      v-if="deleteTarget.show"
      :title="'Delete Blocked Slot'"
      :message="`Remove the block on ${formatDateFull(deleteTarget.slot?.blocked_date)} (${fmtTime(deleteTarget.slot?.start_time)} – ${fmtTime(deleteTarget.slot?.end_time)})?`"
      confirmLabel="Delete"
      :loading="deleteTarget.loading"
      @confirm="executeDelete"
      @cancel="deleteTarget.show = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { call } from 'frappe-ui'
import { toast } from 'frappe-ui'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorState from '@/components/shared/ErrorState.vue'
import DatePicker from '@/components/shared/DatePicker.vue'
import ConfirmModal from '@/components/shared/ConfirmModal.vue'

const auth = useAuthStore()

const loading = ref(true)
const error = ref(null)
const slots = ref([])
const showModal = ref(false)
const editingSlot = ref(null)
const saving = ref(false)
const activeFilter = ref('upcoming')
const currentPage = ref(1)
const perPage = 10

const deleteTarget = reactive({ show: false, slot: null, loading: false })

const form = reactive({
  blocked_date: '',
  start_time: '09:00',
  end_time: '10:00',
  reason: '',
})

const todayStr = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const endOfWeekStr = computed(() => {
  const d = new Date()
  const dayOfWeek = d.getDay()
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek
  const end = new Date(d)
  end.setDate(d.getDate() + daysUntilSunday)
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
})

// Counts
const upcomingCount = computed(() => slots.value.filter(s => s.blocked_date >= todayStr.value).length)
const todayCount = computed(() => slots.value.filter(s => s.blocked_date === todayStr.value).length)
const pastCount = computed(() => slots.value.filter(s => s.blocked_date < todayStr.value).length)
const thisWeekCount = computed(() => slots.value.filter(s => s.blocked_date >= todayStr.value && s.blocked_date <= endOfWeekStr.value).length)

const filterTabs = computed(() => [
  { key: 'all', label: 'All', count: slots.value.length },
  { key: 'upcoming', label: 'Upcoming', count: upcomingCount.value },
  { key: 'today', label: 'Today', count: todayCount.value },
  { key: 'past', label: 'Past', count: pastCount.value },
])

const filteredSlots = computed(() => {
  let list = [...slots.value]
  if (activeFilter.value === 'upcoming') list = list.filter(s => s.blocked_date >= todayStr.value)
  else if (activeFilter.value === 'today') list = list.filter(s => s.blocked_date === todayStr.value)
  else if (activeFilter.value === 'past') list = list.filter(s => s.blocked_date < todayStr.value)
  // Sort: upcoming dates ascending, past dates descending
  list.sort((a, b) => {
    if (activeFilter.value === 'past') return b.blocked_date > a.blocked_date ? 1 : -1
    return a.blocked_date > b.blocked_date ? 1 : -1
  })
  return list
})

// Group by date
const groupedSlots = computed(() => {
  const map = {}
  for (const s of filteredSlots.value) {
    if (!map[s.blocked_date]) map[s.blocked_date] = []
    map[s.blocked_date].push(s)
  }
  return Object.keys(map).map(date => {
    const dateSlots = map[date].sort((a, b) => (a.start_time > b.start_time ? 1 : -1))
    return {
      date,
      slots: dateSlots,
      statusLabel: isPast(date) ? 'Past' : isToday(date) ? 'Today' : 'Upcoming',
      statusClass: isPast(date)
        ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
        : isToday(date)
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    }
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(groupedSlots.value.length / perPage)))
const paginatedGroups = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return groupedSlots.value.slice(start, start + perPage)
})

// Reset page when filter changes
watch(activeFilter, () => { currentPage.value = 1 })

const timeError = computed(() => {
  if (!form.start_time || !form.end_time) return ''
  const [sh, sm] = form.start_time.split(':').map(Number)
  const [eh, em] = form.end_time.split(':').map(Number)
  if (eh * 60 + em <= sh * 60 + sm) return 'End time must be after start time'
  return ''
})

const canSave = computed(() => {
  return form.blocked_date && form.start_time && form.end_time && form.reason && !timeError.value
})

function isPast(date) { return date < todayStr.value }
function isToday(date) { return date === todayStr.value }

function fmtTime(t) {
  if (!t) return ''
  return t.slice(0, 5)
}

function formatDateFull(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function calcDuration(start, end) {
  if (!start || !end) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

function stepTime(field, delta) {
  const key = field === 'start' ? 'start_time' : 'end_time'
  const [h, m] = form[key].split(':').map(Number)
  let total = h * 60 + m + delta
  if (total < 0) total = 0
  if (total > 23 * 60 + 45) total = 23 * 60 + 45
  const nh = Math.floor(total / 60)
  const nm = total % 60
  form[key] = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

function openAddModal() {
  editingSlot.value = null
  form.blocked_date = ''
  form.start_time = '09:00'
  form.end_time = '10:00'
  form.reason = ''
  showModal.value = true
}

function openEditModal(slot) {
  editingSlot.value = slot
  form.blocked_date = slot.blocked_date
  form.start_time = fmtTime(slot.start_time)
  form.end_time = fmtTime(slot.end_time)
  form.reason = slot.reason || ''
  showModal.value = true
}

function confirmDelete(slot) {
  deleteTarget.slot = slot
  deleteTarget.loading = false
  deleteTarget.show = true
}

// Data operations
async function loadSlots() {
  loading.value = true
  error.value = null
  try {
    const list = await call('frappe.client.get_list', {
      doctype: 'MM User Blocked Slot',
      filters: { user: auth.user },
      fields: ['name', 'blocked_date', 'start_time', 'end_time', 'reason'],
      order_by: 'blocked_date desc',
      limit_page_length: 500,
    })
    slots.value = list || []
  } catch (e) {
    error.value = e.message || 'Failed to load blocked slots'
  } finally {
    loading.value = false
  }
}

async function saveSlot() {
  if (!canSave.value) return
  saving.value = true
  try {
    if (editingSlot.value) {
      // Update via get+save to trigger full validation (meeting conflict check)
      const doc = await call('frappe.client.get', {
        doctype: 'MM User Blocked Slot',
        name: editingSlot.value.name,
      })
      doc.blocked_date = form.blocked_date
      doc.start_time = form.start_time
      doc.end_time = form.end_time
      doc.reason = form.reason
      await call('frappe.client.save', { doc })
      toast({ title: 'Blocked slot updated', icon: 'check' })
    } else {
      // Create
      await call('frappe.client.insert', {
        doc: {
          doctype: 'MM User Blocked Slot',
          user: auth.user,
          blocked_date: form.blocked_date,
          start_time: form.start_time,
          end_time: form.end_time,
          reason: form.reason,
        },
      })
      toast({ title: 'Time blocked successfully', icon: 'check' })
    }
    showModal.value = false
    await loadSlots()
  } catch (e) {
    toast({ title: e.message || 'Failed to save', icon: 'x' })
  } finally {
    saving.value = false
  }
}

async function executeDelete() {
  deleteTarget.loading = true
  try {
    await call('frappe.client.delete', {
      doctype: 'MM User Blocked Slot',
      name: deleteTarget.slot.name,
    })
    slots.value = slots.value.filter(s => s.name !== deleteTarget.slot.name)
    toast({ title: 'Blocked slot removed', icon: 'check' })
  } catch (e) {
    toast({ title: e.message || 'Failed to delete', icon: 'x' })
  } finally {
    deleteTarget.loading = false
    deleteTarget.show = false
  }
}

onMounted(async () => {
  if (!auth.isInitialized) await auth.initialize()
  await loadSlots()
})
</script>

<style scoped>
.bs-label {
  @apply mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300;
}
.bs-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500;
}
.bs-step-btn {
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700;
}
.bs-fade-enter-active, .bs-fade-leave-active {
  transition: opacity 0.15s ease;
}
.bs-fade-enter-from, .bs-fade-leave-to {
  opacity: 0;
}
</style>
