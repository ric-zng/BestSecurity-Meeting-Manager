<template>
  <div class="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
    <!-- Sticky Header -->
    <div class="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-900">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ greeting }}, {{ firstName }}
          </h1>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {{ formattedToday }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <!-- Scope filter -->
          <div class="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-950">
            <button
              v-for="s in availableScopes"
              :key="s.key"
              @click="setScope(s.key)"
              class="rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors"
              :class="scope === s.key
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
            >{{ s.label }}</button>
          </div>

          <span
            class="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold"
            :class="roleBadgeClass"
          >
            {{ authStore.userContext?.role_display || 'Member' }}
          </span>
          <button
            @click="refreshAll"
            :disabled="loading"
            class="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Refresh"
          >
            <FeatherIcon name="refresh-cw" class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="mx-auto max-w-[1400px] p-6">
      <!-- Scope description -->
      <div v-if="scope !== 'my'" class="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-2 dark:border-blue-800 dark:bg-blue-950/20">
        <FeatherIcon name="info" class="h-3.5 w-3.5 shrink-0 text-blue-500 dark:text-blue-400" />
        <span class="text-xs text-blue-800 dark:text-blue-300">
          <template v-if="scope === 'team'">Showing meetings for your team ({{ authStore.departmentNames.join(', ') || 'your departments' }})</template>
          <template v-else>Showing all meetings across the organization</template>
        </span>
      </div>

      <!-- Stats Cards -->
      <div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div
          v-for="stat in statsCards"
          :key="stat.label"
          class="rounded-lg border bg-white p-4 transition-all hover:shadow-sm dark:bg-gray-900"
          :class="stat.borderClass"
        >
          <div class="flex items-center justify-between">
            <div :class="stat.iconBg" class="flex h-9 w-9 items-center justify-center rounded-lg">
              <FeatherIcon :name="stat.icon" class="h-4 w-4" :class="stat.iconColor" />
            </div>
            <span v-if="!loading" class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ stat.value }}
            </span>
            <div v-else class="h-7 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <p class="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">{{ stat.label }}</p>
        </div>
      </div>

      <!-- Main Grid -->
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Left: 2/3 -->
        <div class="space-y-6 lg:col-span-2">
          <!-- Today's Schedule -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Today's Schedule</h2>
              <span class="text-[10px] text-gray-400 dark:text-gray-500">{{ todayMeetings.length }} meeting{{ todayMeetings.length !== 1 ? 's' : '' }}</span>
            </div>

            <div v-if="loading" class="flex items-center justify-center py-12">
              <FeatherIcon name="loader" class="h-5 w-5 animate-spin text-gray-300" />
            </div>

            <div v-else-if="!todayMeetings.length" class="flex flex-col items-center justify-center py-12">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <FeatherIcon name="sun" class="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <p class="mt-3 text-sm font-medium text-gray-900 dark:text-white">No meetings today</p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ scope === 'my' ? 'Enjoy your free day or schedule a new meeting.' : 'No meetings scheduled for today.' }}
              </p>
            </div>

            <div v-else class="divide-y divide-gray-50 dark:divide-gray-700/50">
              <router-link
                v-for="(meeting, i) in todayMeetings"
                :key="meeting.name"
                :to="`/bookings/${meeting.name}`"
                class="flex gap-3 px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30"
              >
                <div class="flex w-14 shrink-0 flex-col items-end pt-0.5">
                  <span class="text-xs font-semibold text-gray-900 dark:text-white">{{ fmtTime(meeting.start_datetime) }}</span>
                  <span class="text-[10px] text-gray-400">{{ fmtTime(meeting.end_datetime) }}</span>
                </div>
                <div class="flex flex-col items-center pt-1">
                  <div class="h-2.5 w-2.5 rounded-full" :style="dotStyle(meeting)"></div>
                  <div v-if="i < todayMeetings.length - 1" class="mt-0.5 w-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {{ meeting.meeting_title || meeting.name }}
                    </p>
                    <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" :style="statusBadgeStyle(meeting.booking_status)">
                      {{ meeting.booking_status }}
                    </span>
                  </div>
                  <div class="mt-0.5 flex flex-wrap items-center gap-2">
                    <span v-if="meeting.customer" class="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                      <FeatherIcon name="user" class="h-3 w-3" />
                      {{ meeting.customer }}
                    </span>
                    <span v-if="meeting.is_internal" class="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">Internal</span>
                    <span v-if="meeting.select_mkru" class="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                      <FeatherIcon name="map-pin" class="h-3 w-3" />
                      {{ meeting.select_mkru }}
                    </span>
                    <span class="text-[10px] text-gray-400 dark:text-gray-500">{{ calcDuration(meeting) }}</span>
                    <!-- Show user's role in My view -->
                    <span v-if="scope === 'my' && meeting.my_role" class="rounded px-1.5 py-0.5 text-[10px] font-medium" :class="roleTagClass(meeting.my_role)">
                      {{ meeting.my_role }}
                    </span>
                    <!-- Show who it belongs to in team/all view -->
                    <span v-if="scope !== 'my' && meeting.created_by && meeting.created_by !== authStore.user" class="flex items-center gap-1 text-[10px] text-blue-500 dark:text-blue-400">
                      <FeatherIcon name="user" class="h-2.5 w-2.5" />
                      {{ meeting.created_by_name || meeting.created_by }}
                    </span>
                  </div>
                </div>
              </router-link>
            </div>
          </div>

          <!-- Upcoming This Week -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Upcoming This Week</h2>
              <router-link to="/bookings" class="text-[10px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">View all</router-link>
            </div>

            <div v-if="loading" class="flex items-center justify-center py-8">
              <FeatherIcon name="loader" class="h-5 w-5 animate-spin text-gray-300" />
            </div>

            <div v-else-if="!upcomingMeetings.length" class="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
              No more meetings this week
            </div>

            <div v-else class="divide-y divide-gray-50 dark:divide-gray-700/50">
              <router-link
                v-for="meeting in upcomingMeetings"
                :key="meeting.name"
                :to="`/bookings/${meeting.name}`"
                class="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30"
              >
                <div class="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <span class="text-[10px] font-medium uppercase text-gray-400 dark:text-gray-500">{{ fmtDayShort(meeting.start_datetime) }}</span>
                  <span class="text-sm font-bold text-gray-900 dark:text-white">{{ fmtDayNum(meeting.start_datetime) }}</span>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ meeting.meeting_title || meeting.name }}</p>
                  <p class="text-[11px] text-gray-500 dark:text-gray-400">
                    {{ fmtTime(meeting.start_datetime) }} – {{ fmtTime(meeting.end_datetime) }}
                    <span v-if="meeting.customer"> · {{ meeting.customer }}</span>
                    <span v-if="scope === 'my' && meeting.my_role" class="font-medium" :class="roleTextClass(meeting.my_role)"> · {{ meeting.my_role }}</span>
                    <span v-if="scope !== 'my' && meeting.created_by && meeting.created_by !== authStore.user" class="text-blue-500 dark:text-blue-400"> · {{ meeting.created_by_name || meeting.created_by }}</span>
                  </p>
                </div>
                <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" :style="statusBadgeStyle(meeting.booking_status)">
                  {{ meeting.booking_status }}
                </span>
              </router-link>
            </div>
          </div>
        </div>

        <!-- Right: 1/3 -->
        <div class="space-y-4">
          <!-- Quick Actions -->
          <div class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Quick Actions</h3>
            <div class="space-y-1.5">
              <router-link to="/book" class="dash-action">
                <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FeatherIcon name="plus" class="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                Book Meeting
              </router-link>
              <router-link v-if="authStore.isDepartmentLeader" to="/book/team" class="dash-action">
                <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <FeatherIcon name="users" class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                Team Meeting
              </router-link>
              <router-link to="/calendar" class="dash-action">
                <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                  <FeatherIcon name="calendar" class="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                View Calendar
              </router-link>
              <router-link to="/my-blocked-slots" class="dash-action">
                <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                  <FeatherIcon name="slash" class="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                Block Time
              </router-link>
            </div>
          </div>

          <!-- Recent Bookings -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Recent Bookings</h3>
              <router-link to="/bookings" class="text-[10px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">View all</router-link>
            </div>

            <div v-if="loading" class="flex items-center justify-center py-8">
              <FeatherIcon name="loader" class="h-5 w-5 animate-spin text-gray-300" />
            </div>

            <div v-else-if="!recentBookings.length" class="flex flex-col items-center justify-center py-8">
              <FeatherIcon name="inbox" class="h-6 w-6 text-gray-300 dark:text-gray-600" />
              <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">No recent bookings</p>
            </div>

            <div v-else class="divide-y divide-gray-50 dark:divide-gray-700/50">
              <router-link
                v-for="b in recentBookings"
                :key="b.name"
                :to="`/bookings/${b.name}`"
                class="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30"
              >
                <div class="min-w-0 flex-1">
                  <p class="truncate text-xs font-medium text-gray-900 dark:text-white">{{ b.meeting_title || b.name }}</p>
                  <p class="text-[10px] text-gray-400 dark:text-gray-500">
                    {{ fmtDateTime(b.start_datetime) }}
                    <span v-if="scope === 'my' && b.my_role" class="font-medium" :class="roleTextClass(b.my_role)"> · {{ b.my_role }}</span>
                    <span v-if="scope !== 'my' && b.created_by && b.created_by !== authStore.user" class="text-blue-500"> · {{ b.created_by_name || b.created_by }}</span>
                  </p>
                </div>
                <span class="ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" :style="statusBadgeStyle(b.booking_status)">
                  {{ b.booking_status }}
                </span>
              </router-link>
            </div>
          </div>

          <!-- Blocked Slots Today (only in "My" scope) -->
          <div v-if="scope === 'my' && todayBlockedSlots.length > 0" class="rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-800 dark:bg-red-950/20">
            <h3 class="mb-2 text-xs font-semibold text-red-800 dark:text-red-300">Blocked Today</h3>
            <div class="space-y-1.5">
              <div v-for="slot in todayBlockedSlots" :key="slot.name" class="flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
                <FeatherIcon name="slash" class="h-3 w-3 shrink-0" />
                <span class="font-medium">{{ slot.start_time?.slice(0,5) }} – {{ slot.end_time?.slice(0,5) }}</span>
                <span v-if="slot.reason" class="truncate text-red-600/70 dark:text-red-400/70">{{ slot.reason }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { call } from 'frappe-ui'
import { useAuthStore } from '@/stores/auth'
import { getStatusColor } from '@/composables/useCalendarState'

const authStore = useAuthStore()
const loading = ref(true)

// Scope: my | team | all
const scope = ref('my')

const availableScopes = computed(() => {
  const scopes = [{ key: 'my', label: 'My' }]
  if (authStore.isDepartmentLeader) {
    scopes.push({ key: 'team', label: 'Team' })
  }
  if (authStore.isSystemManager) {
    scopes.push({ key: 'all', label: 'All' })
  }
  return scopes
})

function setScope(s) {
  scope.value = s
  loadDashboard()
}

// Data
const stats = ref({ today: 0, week: 0, pending: 0, month: 0 })
const todayMeetings = ref([])
const upcomingMeetings = ref([])
const recentBookings = ref([])
const todayBlockedSlots = ref([])

// Date helpers
const now = new Date()

// Greeting
const greeting = computed(() => {
  const h = now.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
})

const firstName = computed(() => {
  const name = authStore.fullName || ''
  return name.split(' ')[0] || 'there'
})

const formattedToday = computed(() => {
  return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
})

const roleBadgeClass = computed(() => {
  if (authStore.isSystemManager) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
  if (authStore.isDepartmentLeader) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
})

// Stats cards
const statsCards = computed(() => [
  {
    label: "Today's Meetings", value: stats.value.today, icon: 'calendar',
    iconBg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400',
    borderClass: 'border-gray-200 dark:border-gray-700',
  },
  {
    label: 'This Week', value: stats.value.week, icon: 'trending-up',
    iconBg: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderClass: 'border-gray-200 dark:border-gray-700',
  },
  {
    label: 'Pending', value: stats.value.pending, icon: 'clock',
    iconBg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600 dark:text-amber-400',
    borderClass: stats.value.pending > 0 ? 'border-amber-200 dark:border-amber-800' : 'border-gray-200 dark:border-gray-700',
  },
  {
    label: 'This Month', value: stats.value.month, icon: 'bar-chart-2',
    iconBg: 'bg-violet-50 dark:bg-violet-900/20', iconColor: 'text-violet-600 dark:text-violet-400',
    borderClass: 'border-gray-200 dark:border-gray-700',
  },
])

// Formatting
function fmtTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtDateTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtDayShort(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('en-US', { weekday: 'short' })
}

function fmtDayNum(dt) {
  if (!dt) return ''
  return new Date(dt).getDate()
}

function calcDuration(meeting) {
  if (!meeting.start_datetime || !meeting.end_datetime) return ''
  const mins = Math.round((new Date(meeting.end_datetime) - new Date(meeting.start_datetime)) / 60000)
  if (mins <= 0) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function dotStyle(meeting) {
  return { backgroundColor: getStatusColor(meeting.booking_status) }
}

function statusBadgeStyle(status) {
  const color = getStatusColor(status)
  return { backgroundColor: color + '1a', color }
}

function roleTagClass(role) {
  if (role === 'Host') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
  if (role === 'Co-host') return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
  if (role === 'Participant') return 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400'
  return ''
}

function roleTextClass(role) {
  if (role === 'Host') return 'text-emerald-600 dark:text-emerald-400'
  if (role === 'Co-host') return 'text-blue-600 dark:text-blue-400'
  if (role === 'Participant') return 'text-violet-600 dark:text-violet-400'
  return ''
}

// Data fetching — single server call handles scope filtering
async function loadDashboard() {
  loading.value = true
  try {
    const data = await call(
      'meeting_manager.meeting_manager.api.dashboard.get_dashboard_data',
      { scope: scope.value }
    )

    stats.value = data.stats || { today: 0, week: 0, pending: 0, month: 0 }
    todayMeetings.value = data.today_meetings || []
    upcomingMeetings.value = data.upcoming_meetings || []
    recentBookings.value = data.recent_bookings || []
    todayBlockedSlots.value = data.blocked_slots || []
  } catch (e) {
    console.error('Dashboard load error:', e)
  } finally {
    loading.value = false
  }
}

async function refreshAll() {
  await loadDashboard()
}

onMounted(async () => {
  if (!authStore.isInitialized) await authStore.initialize()
  await loadDashboard()
})
</script>

<style scoped>
.dash-action {
  @apply flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50;
}
</style>
