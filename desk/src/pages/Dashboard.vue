<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Loading State -->
    <LoadingSpinner v-if="authStore.isLoading" fullPage />

    <!-- Error State -->
    <ErrorState
      v-else-if="authStore.error"
      :message="authStore.error"
      @retry="authStore.initialize()"
    />

    <!-- Dashboard Content -->
    <div v-else class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <!-- Greeting Header -->
      <div class="mb-8">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ greeting }}, {{ firstName }}
            </h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Here's your meeting overview for today.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
              :class="roleBadgeClass"
            >
              {{ authStore.userContext?.role_display || 'Member' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Quick Stats Cards -->
      <div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Today's Meetings -->
        <div
          class="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        >
          <div class="flex items-center justify-between">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20"
            >
              <FeatherIcon name="calendar" class="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span
              v-if="!statsLoading"
              class="text-2xl font-bold text-gray-900 dark:text-white"
            >
              {{ todayCount }}
            </span>
            <div v-else class="h-8 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <p class="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
            Today's Meetings
          </p>
        </div>

        <!-- This Week's Meetings -->
        <div
          class="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        >
          <div class="flex items-center justify-between">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20"
            >
              <FeatherIcon name="trending-up" class="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span
              v-if="!statsLoading"
              class="text-2xl font-bold text-gray-900 dark:text-white"
            >
              {{ weekCount }}
            </span>
            <div v-else class="h-8 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <p class="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
            This Week
          </p>
        </div>

        <!-- Pending Approvals -->
        <div
          class="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        >
          <div class="flex items-center justify-between">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20"
            >
              <FeatherIcon name="clock" class="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span
              v-if="!statsLoading"
              class="text-2xl font-bold text-gray-900 dark:text-white"
            >
              {{ pendingCount }}
            </span>
            <div v-else class="h-8 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <p class="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
            Pending Approvals
          </p>
        </div>

        <!-- Total Bookings (this month) -->
        <div
          class="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        >
          <div class="flex items-center justify-between">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/20"
            >
              <FeatherIcon name="bar-chart-2" class="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <span
              v-if="!statsLoading"
              class="text-2xl font-bold text-gray-900 dark:text-white"
            >
              {{ monthCount }}
            </span>
            <div v-else class="h-8 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <p class="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
            Total This Month
          </p>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Today's Schedule (2 cols) -->
        <div class="lg:col-span-2">
          <div
            class="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div class="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">
                Today's Schedule
              </h2>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ formattedToday }}
              </span>
            </div>

            <!-- Loading -->
            <div v-if="todayBookings.list?.loading" class="p-6">
              <LoadingSpinner size="sm" />
            </div>

            <!-- Empty State -->
            <div
              v-else-if="!todayMeetings.length"
              class="flex flex-col items-center justify-center px-5 py-12 text-center"
            >
              <div
                class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
              >
                <FeatherIcon name="sun" class="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">No meetings today</p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enjoy your free day or schedule a new meeting.
              </p>
            </div>

            <!-- Timeline -->
            <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
              <div
                v-for="meeting in todayMeetings"
                :key="meeting.name"
                class="flex gap-4 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <!-- Time Column -->
                <div class="flex w-16 shrink-0 flex-col items-end">
                  <span class="text-sm font-semibold text-gray-900 dark:text-white">
                    {{ formatTime(meeting.start_datetime) }}
                  </span>
                  <span class="text-xs text-gray-400 dark:text-gray-500">
                    {{ formatTime(meeting.end_datetime) }}
                  </span>
                </div>

                <!-- Timeline Bar -->
                <div class="flex flex-col items-center">
                  <div
                    class="h-3 w-3 rounded-full border-2"
                    :class="timelineDotClass(meeting)"
                  />
                  <div class="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700" />
                </div>

                <!-- Meeting Details -->
                <div class="min-w-0 flex-1 pb-2">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <router-link
                        :to="`/bookings/${meeting.name}`"
                        class="text-sm font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                      >
                        {{ meeting.meeting_title || meeting.name }}
                      </router-link>
                      <div class="mt-1 flex flex-wrap items-center gap-2">
                        <span
                          v-if="meeting.customer"
                          class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
                        >
                          <FeatherIcon name="user" class="h-3 w-3" />
                          {{ meeting.customer }}
                        </span>
                        <span
                          v-if="meeting.is_internal"
                          class="inline-flex items-center rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"
                        >
                          Internal
                        </span>
                        <span
                          v-if="meeting.select_mkru"
                          class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
                        >
                          <FeatherIcon name="map-pin" class="h-3 w-3" />
                          {{ meeting.select_mkru }}
                        </span>
                      </div>
                    </div>
                    <StatusBadge
                      :label="meeting.booking_status"
                      :status="meeting.booking_status"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Sidebar -->
        <div class="space-y-6">
          <!-- Quick Actions -->
          <div
            class="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">
                Quick Actions
              </h2>
            </div>
            <div class="space-y-2 p-4">
              <router-link
                to="/bookings/new"
                class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              >
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30"
                >
                  <FeatherIcon name="plus" class="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                New Booking
              </router-link>
              <router-link
                to="/bookings/new?type=internal"
                class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:text-gray-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
              >
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30"
                >
                  <FeatherIcon name="users" class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                Team Meeting
              </router-link>
              <router-link
                to="/calendar"
                class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-violet-50 hover:text-violet-700 dark:text-gray-300 dark:hover:bg-violet-900/20 dark:hover:text-violet-400"
              >
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30"
                >
                  <FeatherIcon name="calendar" class="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                View Calendar
              </router-link>
            </div>
          </div>

          <!-- Recent Bookings -->
          <div
            class="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div class="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">
                Recent Bookings
              </h2>
              <router-link
                to="/bookings"
                class="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View all
              </router-link>
            </div>

            <!-- Loading -->
            <div v-if="recentBookings.list?.loading" class="p-6">
              <LoadingSpinner size="sm" />
            </div>

            <!-- Empty State -->
            <div
              v-else-if="!recentBookingsList.length"
              class="flex flex-col items-center justify-center px-5 py-10 text-center"
            >
              <FeatherIcon name="inbox" class="mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p class="text-sm text-gray-500 dark:text-gray-400">No recent bookings</p>
            </div>

            <!-- List -->
            <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
              <router-link
                v-for="booking in recentBookingsList"
                :key="booking.name"
                :to="`/bookings/${booking.name}`"
                class="flex items-center justify-between px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {{ booking.meeting_title || booking.name }}
                  </p>
                  <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {{ formatDateTime(booking.start_datetime) }}
                  </p>
                </div>
                <StatusBadge
                  :label="booking.booking_status"
                  :status="booking.booking_status"
                  class="ml-2 shrink-0"
                />
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { createResource, createListResource } from 'frappe-ui'
import { useAuthStore } from '@/stores/auth'
import StatusBadge from '@/components/shared/StatusBadge.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorState from '@/components/shared/ErrorState.vue'

const authStore = useAuthStore()

// --- Helpers ---

const now = new Date()

function todayStr() {
  return now.toISOString().slice(0, 10)
}

function startOfWeek() {
  const d = new Date(now)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday start
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function endOfWeek() {
  const d = new Date(now)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? 0 : 7) // Sunday end
  d.setDate(diff)
  d.setHours(23, 59, 59, 999)
  return d.toISOString().slice(0, 10)
}

function startOfMonth() {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function endOfMonth() {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

// --- Greeting ---

const greeting = computed(() => {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
})

const firstName = computed(() => {
  const name = authStore.fullName || ''
  return name.split(' ')[0] || 'there'
})

const formattedToday = computed(() => {
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const roleBadgeClass = computed(() => {
  if (authStore.isSystemManager) {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
  }
  if (authStore.isDepartmentLeader && authStore.roleLevel === 'department_leader') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  }
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
})

// --- Stats Resources ---

const userId = computed(() => authStore.user || '')

const todayBookingsCount = createListResource({
  doctype: 'MM Meeting Booking',
  fields: ['count(name) as count'],
  filters: computed(() => ({
    start_datetime: ['>=', `${todayStr()} 00:00:00`],
    end_datetime: ['<=', `${todayStr()} 23:59:59`],
    assigned_users: ['like', `%${userId.value}%`],
    booking_status: ['not in', ['Cancelled', 'Not Possible']],
  })),
  pageLength: 1,
  auto: true,
})

const weekBookingsCount = createListResource({
  doctype: 'MM Meeting Booking',
  fields: ['count(name) as count'],
  filters: computed(() => ({
    start_datetime: ['>=', `${startOfWeek()} 00:00:00`],
    end_datetime: ['<=', `${endOfWeek()} 23:59:59`],
    assigned_users: ['like', `%${userId.value}%`],
    booking_status: ['not in', ['Cancelled', 'Not Possible']],
  })),
  pageLength: 1,
  auto: true,
})

const pendingBookingsCount = createListResource({
  doctype: 'MM Meeting Booking',
  fields: ['count(name) as count'],
  filters: computed(() => ({
    booking_status: ['in', ['New Booking', 'New Appointment']],
    assigned_users: ['like', `%${userId.value}%`],
  })),
  pageLength: 1,
  auto: true,
})

const monthBookingsCount = createListResource({
  doctype: 'MM Meeting Booking',
  fields: ['count(name) as count'],
  filters: computed(() => ({
    start_datetime: ['>=', `${startOfMonth()} 00:00:00`],
    end_datetime: ['<=', `${endOfMonth()} 23:59:59`],
    assigned_users: ['like', `%${userId.value}%`],
  })),
  pageLength: 1,
  auto: true,
})

const statsLoading = computed(() => {
  return (
    todayBookingsCount.list?.loading ||
    weekBookingsCount.list?.loading ||
    pendingBookingsCount.list?.loading ||
    monthBookingsCount.list?.loading
  )
})

function extractCount(resource) {
  const data = resource.data
  if (data && data.length > 0) {
    return data[0].count || 0
  }
  return 0
}

const todayCount = computed(() => extractCount(todayBookingsCount))
const weekCount = computed(() => extractCount(weekBookingsCount))
const pendingCount = computed(() => extractCount(pendingBookingsCount))
const monthCount = computed(() => extractCount(monthBookingsCount))

// --- Today's Meetings (full list for timeline) ---

const todayBookings = createListResource({
  doctype: 'MM Meeting Booking',
  fields: [
    'name',
    'meeting_title',
    'booking_status',
    'start_datetime',
    'end_datetime',
    'customer',
    'is_internal',
    'select_mkru',
  ],
  filters: computed(() => ({
    start_datetime: ['between', [`${todayStr()} 00:00:00`, `${todayStr()} 23:59:59`]],
    assigned_users: ['like', `%${userId.value}%`],
    booking_status: ['not in', ['Cancelled', 'Not Possible']],
  })),
  orderBy: 'start_datetime asc',
  pageLength: 20,
  auto: true,
})

const todayMeetings = computed(() => {
  return todayBookings.data || []
})

// --- Recent Bookings ---

const recentBookings = createListResource({
  doctype: 'MM Meeting Booking',
  fields: [
    'name',
    'meeting_title',
    'booking_status',
    'start_datetime',
    'end_datetime',
    'customer',
    'is_internal',
    'select_mkru',
  ],
  filters: computed(() => ({
    assigned_users: ['like', `%${userId.value}%`],
  })),
  orderBy: 'start_datetime desc',
  pageLength: 5,
  auto: true,
})

const recentBookingsList = computed(() => {
  return recentBookings.data || []
})

// --- Formatting ---

function formatTime(datetime) {
  if (!datetime) return ''
  const d = new Date(datetime)
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatDateTime(datetime) {
  if (!datetime) return ''
  const d = new Date(datetime)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function timelineDotClass(meeting) {
  const status = meeting.booking_status
  if (status === 'Confirmed' || status === 'Sale Approved') {
    return 'border-emerald-500 bg-emerald-500'
  }
  if (status === 'Booking Started') {
    return 'border-indigo-500 bg-indigo-500'
  }
  if (status === 'New Booking' || status === 'New Appointment') {
    return 'border-blue-500 bg-blue-500'
  }
  if (status === 'Rebook') {
    return 'border-orange-500 bg-orange-500'
  }
  return 'border-gray-400 bg-gray-400 dark:border-gray-500 dark:bg-gray-500'
}

// --- Initialize ---

onMounted(async () => {
  if (!authStore.isInitialized) {
    await authStore.initialize()
  }
})
</script>
