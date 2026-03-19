<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-x-full"
    enter-to-class="translate-x-0"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="translate-x-0"
    leave-to-class="translate-x-full"
  >
    <div
      v-if="bookingId"
      class="fixed inset-0 z-50 flex justify-end"
    >
      <div class="absolute inset-0 bg-black/30" @click="$emit('close')" />
      <div class="relative flex w-full max-w-md flex-col overflow-hidden bg-white shadow-xl dark:bg-gray-800">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-200 px-5 py-3.5 dark:border-gray-700">
          <div class="flex items-center gap-2">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">Booking Details</h2>
            <span v-if="booking" class="font-mono text-xs text-gray-400 dark:text-gray-500">{{ booking.name }}</span>
          </div>
          <div class="flex items-center gap-1">
            <button
              v-if="booking"
              @click="$emit('view-full', booking.name)"
              class="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              title="Open full page"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
            <button @click="$emit('close')" class="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex flex-1 items-center justify-center">
          <div class="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>

        <!-- Error -->
        <div v-else-if="error" class="flex flex-1 flex-col items-center justify-center gap-2 p-6">
          <svg class="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p class="text-sm text-red-500 dark:text-red-400">{{ error }}</p>
          <button @click="fetchDetails" class="text-sm text-blue-600 hover:underline dark:text-blue-400">Retry</button>
        </div>

        <!-- Content -->
        <div v-else-if="booking" class="flex-1 overflow-y-auto">

          <!-- ═══ Status Section ═══ -->
          <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  :style="statusBadgeStyle"
                >
                  {{ booking.booking_status }}
                </span>
                <span v-if="booking.is_internal" class="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  Team
                </span>
              </div>
              <button
                v-if="permissions?.can_edit"
                @click="togglePanel('status')"
                class="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                Change
              </button>
            </div>

            <!-- Inline status change with notes -->
            <transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div v-if="activePanel === 'status'" class="mt-3 space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <!-- Status dropdown -->
                <div>
                  <label class="sidebar-label">New Status</label>
                  <div class="relative" ref="statusDropdownRef">
                    <button @click="statusDropdownOpen = !statusDropdownOpen" class="sidebar-select">
                      <span class="flex items-center gap-2">
                        <span v-if="statusForm.status" class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: getStatusColor(statusForm.status) }" />
                        <span :class="statusForm.status ? 'text-gray-900 dark:text-white' : 'text-gray-400'">
                          {{ statusForm.status || 'Select status...' }}
                        </span>
                      </span>
                      <svg class="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    <transition enter-active-class="transition duration-100" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-75" leave-from-class="opacity-100" leave-to-class="opacity-0 scale-95">
                      <div v-if="statusDropdownOpen" class="sidebar-dropdown">
                        <button
                          v-for="s in BOOKING_STATUSES.filter(st => st !== booking.booking_status)"
                          :key="s"
                          @click="statusForm.status = s; statusDropdownOpen = false"
                          class="sidebar-dropdown-item"
                        >
                          <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: getStatusColor(s) }" />
                          <span>{{ s }}</span>
                        </button>
                      </div>
                    </transition>
                  </div>
                </div>
                <!-- Notes -->
                <div>
                  <label class="sidebar-label">Notes (optional)</label>
                  <textarea
                    v-model="statusForm.notes"
                    rows="2"
                    placeholder="Add a note about this status change..."
                    class="fld resize-none"
                  />
                </div>
                <div class="flex gap-2">
                  <button @click="activePanel = null" class="sidebar-btn-secondary">Cancel</button>
                  <button
                    @click="changeStatus"
                    :disabled="!statusForm.status || actionLoading === 'status'"
                    class="sidebar-btn-primary"
                  >
                    {{ actionLoading === 'status' ? 'Saving...' : 'Update Status' }}
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <!-- ═══ Title & Meeting Info ═══ -->
          <div class="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ booking.meeting_title || meetingType?.meeting_name || 'Meeting' }}
            </h3>
            <p v-if="meetingType?.meeting_name" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {{ meetingType.meeting_name }} &middot; {{ department?.department_name }}
            </p>
          </div>

          <!-- ═══ Schedule Section ═══ -->
          <div class="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <div class="flex items-center justify-between">
              <h4 class="sidebar-label mb-0">Schedule</h4>
              <button
                v-if="permissions?.can_reschedule && !isFinalized"
                @click="togglePanel('reschedule')"
                class="rounded px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                Reschedule
              </button>
            </div>
            <div class="mt-2 space-y-1.5">
              <div class="flex items-center gap-2 text-sm">
                <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span class="text-gray-900 dark:text-white">{{ formatDate(booking.start_datetime) }}</span>
              </div>
              <div class="flex items-center gap-2 text-sm">
                <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-gray-900 dark:text-white">{{ formatTimeRange(booking.start_datetime, booking.end_datetime) }}</span>
                <span class="text-xs text-gray-400">({{ booking.duration_minutes || booking.duration }} min)</span>
              </div>
            </div>

            <!-- Inline reschedule form -->
            <transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div v-if="activePanel === 'reschedule'" class="mt-3 space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <!-- Mini calendar -->
                <div class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                  <div class="mb-2 flex items-center justify-between">
                    <button @click="calChangeMonth(-1)" class="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ calMonthLabel }}</span>
                    <button @click="calChangeMonth(1)" class="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    </button>
                  </div>
                  <div class="grid grid-cols-7 gap-0.5 text-center">
                    <div v-for="d in ['Mo','Tu','We','Th','Fr','Sa','Su']" :key="d" class="py-1 text-[10px] font-medium text-gray-400 dark:text-gray-500">{{ d }}</div>
                    <template v-for="(day, idx) in calDays" :key="idx">
                      <button
                        v-if="day.date"
                        @click="rescheduleForm.date = day.date"
                        class="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors"
                        :class="calDayClass(day)"
                      >{{ day.day }}</button>
                      <div v-else class="h-8 w-8" />
                    </template>
                  </div>
                  <div class="mt-2 flex items-center justify-between">
                    <button @click="calGoToday" class="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">Today</button>
                    <span v-if="rescheduleForm.date" class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(rescheduleForm.date + 'T12:00:00') }}</span>
                  </div>
                </div>

                <!-- Time spinners (24hr, step 15min) + editable inputs -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="sidebar-label">Start Time</label>
                    <div class="flex items-center gap-1">
                      <button @click="adjustTime('start', -15)" class="time-btn">
                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
                      </button>
                      <input
                        :value="rescheduleForm.startTime"
                        @change="onTimeInput('start', $event)"
                        class="time-input"
                        placeholder="HH:MM"
                        maxlength="5"
                      />
                      <button @click="adjustTime('start', 15)" class="time-btn">
                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label class="sidebar-label">End Time</label>
                    <div class="flex items-center gap-1">
                      <button @click="adjustTime('end', -15)" class="time-btn">
                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
                      </button>
                      <input
                        :value="rescheduleForm.endTime"
                        @change="onTimeInput('end', $event)"
                        class="time-input"
                        placeholder="HH:MM"
                        maxlength="5"
                      />
                      <button @click="adjustTime('end', 15)" class="time-btn">
                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
                <p v-if="timeError" class="text-center text-[11px] font-medium text-red-500">{{ timeError }}</p>
                <p v-else-if="rescheduleDuration" class="text-center text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  Duration: {{ rescheduleDuration }} min
                </p>

                <div class="flex gap-2">
                  <button @click="activePanel = null" class="sidebar-btn-secondary">Cancel</button>
                  <button
                    @click="rescheduleBooking"
                    :disabled="!rescheduleForm.date || !rescheduleForm.startTime || !rescheduleForm.endTime || !!timeError || actionLoading === 'reschedule'"
                    class="sidebar-btn-primary"
                  >
                    {{ actionLoading === 'reschedule' ? 'Saving...' : 'Save' }}
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <!-- ═══ Service Section ═══ -->
          <div class="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <div class="flex items-center justify-between">
              <h4 class="sidebar-label mb-0">Service</h4>
              <button
                v-if="permissions?.can_edit && !isFinalized"
                @click="togglePanel('service')"
                class="rounded px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                Change
              </button>
            </div>
            <p class="mt-1.5 text-sm text-gray-900 dark:text-white">{{ booking.service_type || 'Not set' }}</p>

            <!-- Inline service change -->
            <transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div v-if="activePanel === 'service'" class="mt-3 space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <div class="space-y-1">
                  <button
                    v-for="svc in SERVICE_TYPES"
                    :key="svc"
                    @click="serviceForm.value = svc"
                    class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors"
                    :class="serviceForm.value === svc
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'"
                  >
                    <svg v-if="serviceForm.value === svc" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    <span v-else class="h-4 w-4 shrink-0" />
                    {{ svc }}
                  </button>
                </div>
                <div class="flex gap-2 pt-1">
                  <button @click="activePanel = null" class="sidebar-btn-secondary">Cancel</button>
                  <button
                    @click="changeService"
                    :disabled="!serviceForm.value || serviceForm.value === booking.service_type || actionLoading === 'service'"
                    class="sidebar-btn-primary"
                  >
                    {{ actionLoading === 'service' ? 'Saving...' : 'Update' }}
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <!-- ═══ Customer Section ═══ -->
          <div v-if="customer && !booking.is_internal" class="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h4 class="sidebar-label">Customer</h4>
            <div class="mt-2">
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ customer.customer_name || customer.name }}</p>
              <p v-if="customer.primary_email || customer.email_id" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {{ customer.primary_email || customer.email_id }}
              </p>
            </div>
          </div>

          <!-- ═══ Hosts Section ═══ -->
          <div class="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <div class="flex items-center justify-between">
              <h4 class="sidebar-label mb-0">Assigned To</h4>
              <button
                v-if="permissions?.can_reassign && !isFinalized && !booking.is_internal"
                @click="openReassignPanel"
                class="rounded px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                Reassign
              </button>
            </div>
            <div class="mt-2 space-y-2">
              <div v-for="h in hosts" :key="h.user" class="flex items-center gap-2.5">
                <div
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  :class="h.is_primary_host
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'"
                >
                  {{ h.full_name?.charAt(0)?.toUpperCase() || '?' }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ h.full_name }}</p>
                  <p v-if="h.is_primary_host" class="text-[10px] text-blue-600 dark:text-blue-400">Primary host</p>
                </div>
              </div>
            </div>

            <!-- Inline reassign - clickable list -->
            <transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div v-if="activePanel === 'reassign'" class="mt-3 space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <label class="sidebar-label">Assign to</label>
                <div v-if="membersLoading" class="flex items-center gap-2 py-3 text-xs text-gray-400">
                  <div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                  Loading team members...
                </div>
                <div v-else-if="departmentMembers.length === 0" class="py-3 text-center text-xs text-gray-400">
                  No other team members available
                </div>
                <div v-else class="max-h-48 space-y-1 overflow-y-auto">
                  <button
                    v-for="m in departmentMembers"
                    :key="m.user_id"
                    @click="reassignForm.user = m.user_id"
                    class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors"
                    :class="reassignForm.user === m.user_id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'"
                  >
                    <div
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                      :class="reassignForm.user === m.user_id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'"
                    >
                      {{ m.full_name?.charAt(0)?.toUpperCase() || '?' }}
                    </div>
                    <span class="text-sm font-medium">{{ m.full_name || m.user_id }}</span>
                    <svg v-if="reassignForm.user === m.user_id" class="ml-auto h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  </button>
                </div>
                <div class="flex gap-2 pt-1">
                  <button @click="activePanel = null" class="sidebar-btn-secondary">Cancel</button>
                  <button
                    @click="reassignBooking"
                    :disabled="!reassignForm.user || actionLoading === 'reassign'"
                    class="sidebar-btn-primary"
                  >
                    {{ actionLoading === 'reassign' ? 'Saving...' : 'Reassign' }}
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <!-- ═══ Notes/Description ═══ -->
          <div v-if="booking.notes || booking.meeting_description" class="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h4 class="sidebar-label">Notes</h4>
            <p class="mt-1.5 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{{ booking.notes || booking.meeting_description }}</p>
          </div>

          <!-- ═══ Send Reminder ═══ -->
          <div class="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <div class="flex items-center justify-between">
              <h4 class="sidebar-label mb-0">Reminders</h4>
              <button
                @click="togglePanel('reminder')"
                class="rounded px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                Send
              </button>
            </div>
            <p v-if="booking.last_reminder_sent" class="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Last sent: {{ formatDate(booking.last_reminder_sent) }}
            </p>
            <p v-else class="mt-1 text-xs text-gray-400 dark:text-gray-500">No reminders sent yet</p>
            <button @click="showReminderHelp = !showReminderHelp" class="mt-1 text-[11px] text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">
              {{ showReminderHelp ? 'Hide info' : 'How it works' }}
            </button>
            <transition enter-active-class="transition duration-150" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div v-if="showReminderHelp" class="mt-2 rounded-lg bg-blue-50 p-2.5 text-[11px] leading-relaxed text-gray-600 dark:bg-blue-900/20 dark:text-gray-400">
                <p><strong class="text-gray-800 dark:text-gray-200">Manual:</strong> Click "Send" to choose recipients and add a custom note. Logged in history.</p>
                <p class="mt-1"><strong class="text-gray-800 dark:text-gray-200">Automated:</strong> Sent automatically based on the meeting type's reminder schedule (e.g. 24h before). Configure under Meeting Types.</p>
              </div>
            </transition>

            <transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div v-if="activePanel === 'reminder'" class="mt-3 space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                <div>
                  <label class="sidebar-label">Send to</label>
                  <div class="space-y-2">
                    <label v-if="!booking.is_internal" class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input type="checkbox" v-model="reminderForm.notifyCustomer" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800" />
                      Customer
                      <span v-if="customerEmail" class="text-xs text-gray-400">({{ customerEmail }})</span>
                    </label>
                    <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input type="checkbox" v-model="reminderForm.notifyHost" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800" />
                      Host(s)
                    </label>
                    <label v-if="booking.is_internal" class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input type="checkbox" v-model="reminderForm.notifyParticipants" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800" />
                      Participants
                    </label>
                  </div>
                </div>
                <div>
                  <label class="sidebar-label">Message (optional)</label>
                  <textarea
                    v-model="reminderForm.message"
                    rows="2"
                    placeholder="Add a custom note to the reminder..."
                    class="fld resize-none"
                  />
                </div>
                <div class="flex gap-2">
                  <button @click="activePanel = null" class="sidebar-btn-secondary">Cancel</button>
                  <button
                    @click="sendReminder"
                    :disabled="!canSendReminder || actionLoading === 'reminder'"
                    class="sidebar-btn-primary"
                  >
                    {{ actionLoading === 'reminder' ? 'Sending...' : 'Send Reminder' }}
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <!-- ═══ Action Buttons ═══ -->
          <div class="px-5 py-4">
            <div class="flex gap-2">
              <button
                @click="$emit('view-full', booking.name)"
                class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Full Details
              </button>
              <button
                v-if="permissions?.can_cancel && !isFinalized"
                @click="togglePanel('cancel')"
                class="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Cancel
              </button>
            </div>

            <!-- Cancel confirmation -->
            <transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div v-if="activePanel === 'cancel'" class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <p class="text-xs font-medium text-red-700 dark:text-red-400">
                  Cancel this booking? This cannot be undone.
                </p>
                <div>
                  <label class="sidebar-label mt-2">Notes (optional)</label>
                  <textarea
                    v-model="cancelNotes"
                    rows="2"
                    placeholder="Reason for cancellation..."
                    class="fld resize-none"
                  />
                </div>
                <div class="mt-2 flex gap-2">
                  <button @click="activePanel = null" class="sidebar-btn-secondary">Keep</button>
                  <button
                    @click="cancelBooking"
                    :disabled="actionLoading === 'cancel'"
                    class="flex-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {{ actionLoading === 'cancel' ? 'Cancelling...' : 'Confirm Cancel' }}
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>

        <!-- Toast overlays -->
        <transition enter-active-class="transition duration-300" enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0">
          <div v-if="successMsg" class="absolute bottom-4 left-4 right-4 rounded-lg bg-green-600 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg">
            {{ successMsg }}
          </div>
        </transition>
        <transition enter-active-class="transition duration-300" enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0">
          <div v-if="errorMsg" class="absolute bottom-4 left-4 right-4 rounded-lg bg-red-600 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg">
            {{ errorMsg }}
          </div>
        </transition>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { call } from "frappe-ui";
import { getStatusColor, isFinalizedStatus, useCalendarState } from "@/composables/useCalendarState";

const API_BASE = "meeting_manager.meeting_manager.page.mm_enhanced_calendar.api";
const BOOKING_API = "meeting_manager.meeting_manager.api.booking";

const SERVICE_TYPES = [
  "Business",
  "Business Extended",
  "Business Rebook",
  "New Setup Business",
  "Private / Business Customer",
  "Private New Sale",
  "Private Self Book",
];

const BOOKING_STATUSES = computed(() =>
  allStatuses.value.map(s => s.value)
);

const props = defineProps({
  bookingId: { type: String, default: null },
});

const emit = defineEmits(["close", "view-full", "refresh"]);

// State
const loading = ref(false);
const error = ref(null);
const booking = ref(null);
const meetingType = ref(null);
const department = ref(null);
const customer = ref(null);
const hosts = ref([]);
const permissions = ref(null);
const activePanel = ref(null);
const actionLoading = ref(null);
const successMsg = ref(null);

// Reassign state
const departmentMembers = ref([]);
const membersLoading = ref(false);

// Dropdown refs
const statusDropdownOpen = ref(false);
const statusDropdownRef = ref(null);

// Forms
const rescheduleForm = ref({ date: "", startTime: "", endTime: "" });
const reassignForm = ref({ user: "" });
const statusForm = ref({ status: "", notes: "" });
const serviceForm = ref({ value: "" });
const cancelNotes = ref("");

// Reminder form
const reminderForm = ref({ notifyCustomer: true, notifyHost: false, notifyParticipants: false, message: "" });
const showReminderHelp = ref(false);

const NOTIFICATION_API = "meeting_manager.meeting_manager.utils.email_notifications";

const customerEmail = computed(() => {
  if (booking.value?.is_internal) return "";
  return customer.value?.email || booking.value?.customer_email_at_booking || "";
});

const canSendReminder = computed(() => {
  return reminderForm.value.notifyCustomer || reminderForm.value.notifyHost || reminderForm.value.notifyParticipants;
});

// Computed
const { allStatuses } = useCalendarState();

const isFinalized = computed(() => {
  return isFinalizedStatus(booking.value?.booking_status || "");
});

const statusBadgeStyle = computed(() => {
  const color = getStatusColor(booking.value?.booking_status || "");
  return { backgroundColor: color + "1a", color };
});

const rescheduleDuration = computed(() => {
  if (!rescheduleForm.value.startTime || !rescheduleForm.value.endTime) return null;
  const [sh, sm] = rescheduleForm.value.startTime.split(":").map(Number);
  const [eh, em] = rescheduleForm.value.endTime.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff : null;
});

// Click-outside for status dropdown
function handleClickOutside(e) {
  if (statusDropdownOpen.value && statusDropdownRef.value && !statusDropdownRef.value.contains(e.target)) {
    statusDropdownOpen.value = false;
  }
}
onMounted(() => document.addEventListener("mousedown", handleClickOutside));
onBeforeUnmount(() => document.removeEventListener("mousedown", handleClickOutside));

// ── Time adjustment (24hr, 15min steps) ──────────────────────────────────────
function adjustTime(which, deltaMinutes) {
  const key = which === "start" ? "startTime" : "endTime";
  const current = rescheduleForm.value[key];
  if (!current) return;
  const [h, m] = current.split(":").map(Number);
  let total = h * 60 + m + deltaMinutes;
  if (total < 0) total = 0;
  if (total > 23 * 60 + 45) total = 23 * 60 + 45;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  rescheduleForm.value[key] = `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

// ── Direct time input (typed HH:MM) ──────────────────────────────────────────
function onTimeInput(which, event) {
  const raw = event.target.value.trim();
  const key = which === "start" ? "startTime" : "endTime";

  // Accept HH:MM or HHMM
  const match = raw.match(/^(\d{1,2}):?(\d{2})$/);
  if (!match) {
    // Reset to previous value
    event.target.value = rescheduleForm.value[key];
    return;
  }

  let h = parseInt(match[1], 10);
  let m = parseInt(match[2], 10);

  // Clamp to valid range
  if (h > 23) h = 23;
  if (m > 59) m = 59;

  rescheduleForm.value[key] = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ── Time validation ──────────────────────────────────────────────────────────
const timeError = computed(() => {
  if (!rescheduleForm.value.startTime || !rescheduleForm.value.endTime) return null;
  const [sh, sm] = rescheduleForm.value.startTime.split(":").map(Number);
  const [eh, em] = rescheduleForm.value.endTime.split(":").map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  if (endMins <= startMins) return "End time must be after start time";
  return null;
});

// Toggle panel helper
function togglePanel(panel) {
  if (activePanel.value === panel) {
    activePanel.value = null;
  } else {
    activePanel.value = panel;
    statusDropdownOpen.value = false;
  }
}

// Fetch booking details
async function fetchDetails() {
  if (!props.bookingId) return;
  loading.value = true;
  error.value = null;
  booking.value = null;
  activePanel.value = null;
  try {
    const res = await call(`${API_BASE}.get_booking_details`, {
      booking_id: props.bookingId,
    });
    if (res?.booking) {
      booking.value = res.booking;
      meetingType.value = res.meeting_type || null;
      department.value = res.department || null;
      customer.value = res.customer || null;
      hosts.value = res.hosts || [];
      permissions.value = res.permissions || null;
    } else {
      error.value = res?.message || "Booking not found";
    }
  } catch (err) {
    error.value = err?.message || "Failed to load booking";
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.bookingId,
  (id) => {
    if (id) fetchDetails();
    else { booking.value = null; error.value = null; }
  },
  { immediate: true }
);

// ── Actions ──────────────────────────────────────────────────────────────────

const errorMsg = ref(null);

function showSuccess(msg) {
  successMsg.value = msg;
  setTimeout(() => (successMsg.value = null), 2000);
}

function showError(msg) {
  errorMsg.value = msg;
  setTimeout(() => (errorMsg.value = null), 4000);
}

async function changeStatus() {
  actionLoading.value = "status";
  try {
    const params = {
      booking_id: booking.value.name,
      new_status: statusForm.value.status,
    };
    if (statusForm.value.notes?.trim()) {
      params.notes = statusForm.value.notes.trim();
    }
    const res = await call(`${BOOKING_API}.update_booking_status`, params);
    if (res?.success) {
      booking.value.booking_status = statusForm.value.status;
      activePanel.value = null;
      showSuccess(`Status: "${statusForm.value.status}"`);
      emit("refresh");
    } else {
      showError(res?.message || "Failed to update status");
    }
  } catch (err) {
    showError(err?.messages?.[0] || err?.message || "Failed to update status");
  } finally {
    actionLoading.value = null;
  }
}

async function rescheduleBooking() {
  actionLoading.value = "reschedule";
  try {
    const newStartDt = `${rescheduleForm.value.date} ${rescheduleForm.value.startTime}:00`;
    const newEndDt = `${rescheduleForm.value.date} ${rescheduleForm.value.endTime}:00`;
    const res = await call(`${API_BASE}.update_calendar_booking`, {
      booking_id: booking.value.name,
      start_datetime: newStartDt,
      end_datetime: newEndDt,
    });
    if (res?.success) {
      booking.value.start_datetime = newStartDt;
      booking.value.end_datetime = newEndDt;
      activePanel.value = null;
      showSuccess("Booking rescheduled");
      emit("refresh");
    } else {
      showError(res?.message || "Failed to reschedule");
    }
  } catch (err) {
    showError(err?.messages?.[0] || err?.message || "Failed to reschedule");
  } finally {
    actionLoading.value = null;
  }
}

async function changeService() {
  actionLoading.value = "service";
  try {
    const res = await call(`${API_BASE}.update_calendar_booking`, {
      booking_id: booking.value.name,
      service_type: serviceForm.value.value,
    });
    if (res?.success) {
      booking.value.service_type = serviceForm.value.value;
      activePanel.value = null;
      showSuccess(`Service: "${serviceForm.value.value}"`);
      emit("refresh");
    } else {
      showError(res?.message || "Failed to update service");
    }
  } catch (err) {
    showError(err?.messages?.[0] || err?.message || "Failed to update service");
  } finally {
    actionLoading.value = null;
  }
}

async function openReassignPanel() {
  activePanel.value = "reassign";
  statusDropdownOpen.value = false;
  reassignForm.value.user = "";
  departmentMembers.value = [];

  // Try department from details, fallback to meeting type lookup
  const deptName = department.value?.name;
  if (deptName) {
    membersLoading.value = true;
    try {
      const res = await call(`${BOOKING_API}.get_department_members`, {
        department: deptName,
      });
      // Show all members but exclude currently assigned hosts
      const currentHostUsers = new Set((hosts.value || []).map((h) => h.user));
      departmentMembers.value = (res || []).filter(
        (m) => !currentHostUsers.has(m.user_id)
      );
    } catch (e) {
      console.error("Failed to load members:", e);
      departmentMembers.value = [];
    } finally {
      membersLoading.value = false;
    }
  } else {
    membersLoading.value = false;
  }
}

async function reassignBooking() {
  actionLoading.value = "reassign";
  try {
    const res = await call(`${BOOKING_API}.reassign_booking`, {
      booking_id: booking.value.name,
      new_assigned_to: reassignForm.value.user,
    });
    if (res?.success) {
      activePanel.value = null;
      showSuccess("Booking reassigned");
      emit("refresh");
      await fetchDetails();
    } else {
      showError(res?.message || "Failed to reassign");
    }
  } catch (err) {
    showError(err?.messages?.[0] || err?.message || "Failed to reassign");
  } finally {
    actionLoading.value = null;
  }
}

async function cancelBooking() {
  actionLoading.value = "cancel";
  try {
    const params = {
      booking_id: booking.value.name,
      new_status: "Cancelled",
    };
    if (cancelNotes.value?.trim()) {
      params.notes = cancelNotes.value.trim();
    }
    const res = await call(`${BOOKING_API}.update_booking_status`, params);
    if (res?.success) {
      booking.value.booking_status = "Cancelled";
      activePanel.value = null;
      showSuccess("Booking cancelled");
      emit("refresh");
    } else {
      showError(res?.message || "Failed to cancel");
    }
  } catch (err) {
    showError(err?.messages?.[0] || err?.message || "Failed to cancel");
  } finally {
    actionLoading.value = null;
  }
}

async function sendReminder() {
  actionLoading.value = "reminder";
  try {
    const res = await call(`${NOTIFICATION_API}.send_booking_reminder`, {
      booking_id: booking.value.name,
      notify_customer: reminderForm.value.notifyCustomer ? 1 : 0,
      notify_host: reminderForm.value.notifyHost ? 1 : 0,
      notify_participants: reminderForm.value.notifyParticipants ? 1 : 0,
      custom_message: reminderForm.value.message?.trim() || "",
    });
    if (res?.success && res.sent_count > 0) {
      activePanel.value = null;
      reminderForm.value = { notifyCustomer: true, notifyHost: false, notifyParticipants: false, message: "" };
      showSuccess(`Reminder sent to ${res.sent_count} recipient(s)`);
      emit("refresh");
      await fetchDetails();
    } else if (res?.success && res.sent_count === 0) {
      showError("No recipients found to send reminder to");
    } else {
      showError(res?.message || "Failed to send reminder");
    }
  } catch (err) {
    showError(err?.messages?.[0] || err?.message || "Failed to send reminder");
  } finally {
    actionLoading.value = null;
  }
}

// ── Mini calendar ────────────────────────────────────────────────────────────
const calViewMonth = ref(new Date().getMonth());
const calViewYear = ref(new Date().getFullYear());

const calMonthLabel = computed(() => {
  const d = new Date(calViewYear.value, calViewMonth.value, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
});

const calDays = computed(() => {
  const year = calViewYear.value;
  const month = calViewMonth.value;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const todayStr = toLocalDateStr(new Date());

  const days = [];
  for (let i = 0; i < startDow; i++) days.push({ date: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ date: dateStr, day: d, isPast: dateStr < todayStr, isToday: dateStr === todayStr });
  }
  return days;
});

function calDayClass(day) {
  if (rescheduleForm.value.date === day.date) return "bg-blue-600 text-white font-semibold";
  if (day.isToday) return "bg-blue-100 text-blue-700 font-semibold dark:bg-blue-900/40 dark:text-blue-400";
  if (day.isPast) return "text-gray-300 dark:text-gray-600";
  return "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700";
}

function calChangeMonth(delta) {
  let m = calViewMonth.value + delta;
  let y = calViewYear.value;
  if (m > 11) { m = 0; y++; }
  if (m < 0) { m = 11; y--; }
  calViewMonth.value = m;
  calViewYear.value = y;
}

function calGoToday() {
  const now = new Date();
  calViewMonth.value = now.getMonth();
  calViewYear.value = now.getFullYear();
  rescheduleForm.value.date = toLocalDateStr(now);
}

function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Pre-fill forms when panels open
watch(activePanel, (panel) => {
  if (panel === "reschedule" && booking.value?.start_datetime) {
    const startDt = new Date(booking.value.start_datetime);
    const endDt = booking.value.end_datetime ? new Date(booking.value.end_datetime) : null;
    rescheduleForm.value.date = toLocalDateStr(startDt);
    rescheduleForm.value.startTime = `${String(startDt.getHours()).padStart(2, "0")}:${String(startDt.getMinutes()).padStart(2, "0")}`;
    rescheduleForm.value.endTime = endDt
      ? `${String(endDt.getHours()).padStart(2, "0")}:${String(endDt.getMinutes()).padStart(2, "0")}`
      : "";
    calViewMonth.value = startDt.getMonth();
    calViewYear.value = startDt.getFullYear();
  }
  if (panel === "status") {
    statusForm.value = { status: "", notes: "" };
  }
  if (panel === "service") {
    serviceForm.value.value = booking.value?.service_type || "";
  }
  if (panel === "cancel") {
    cancelNotes.value = "";
  }
  if (panel === "reminder") {
    reminderForm.value = {
      notifyCustomer: !booking.value?.is_internal,
      notifyHost: false,
      notifyParticipants: !!booking.value?.is_internal,
      message: "",
    };
  }
});

// ── Formatting (24hr) ────────────────────────────────────────────────────────
function formatDate(dt) {
  if (!dt) return "";
  return new Date(dt).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function formatTimeRange(start, end) {
  if (!start) return "";
  const fmt = (d) => {
    const date = new Date(d);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };
  return `${fmt(start)} – ${end ? fmt(end) : ""}`;
}
</script>

<style scoped>
.fld {
  @apply w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white;
}
.sidebar-label {
  @apply mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500;
}
.sidebar-btn-primary {
  @apply flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 hover:bg-blue-700 transition-colors;
}
.sidebar-btn-secondary {
  @apply flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors;
}
.sidebar-select {
  @apply flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm shadow-sm transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-gray-500;
}
.sidebar-dropdown {
  @apply absolute left-0 right-0 z-10 mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800;
}
.sidebar-dropdown-item {
  @apply flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700;
}
.time-btn {
  @apply flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200;
}
.time-input {
  @apply w-full rounded-lg border border-gray-300 bg-white py-2 text-center text-sm font-semibold tabular-nums text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white;
}
</style>
