<template>
  <div class="min-h-full bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button
            @click="router.push('/meeting-types')"
            class="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <FeatherIcon name="arrow-left" class="h-5 w-5" />
          </button>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ doc.doc?.meeting_name || 'Meeting Type' }}
              </h1>
              <span
                v-if="doc.doc"
                class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                :class="doc.doc.is_active
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'"
              >{{ doc.doc.is_active ? 'Active' : 'Inactive' }}</span>
              <span v-if="doc.doc?.is_internal" class="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Internal</span>
              <span v-if="doc.doc?.is_public" class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Public</span>
            </div>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ currentId }}</p>
          </div>
        </div>
        <!-- Circular nav -->
        <div class="flex items-center gap-1">
          <Tooltip :text="prevId ? 'Previous' : 'No previous'">
            <button @click="goToPrevious" :disabled="!hasPrevious"
              class="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            ><FeatherIcon name="chevron-left" class="h-4 w-4" /></button>
          </Tooltip>
          <Tooltip :text="nextId ? 'Next' : 'No next'">
            <button @click="goToNext" :disabled="!hasNext"
              class="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            ><FeatherIcon name="chevron-right" class="h-4 w-4" /></button>
          </Tooltip>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-6">
      <LoadingSpinner v-if="doc.loading" />
      <ErrorState v-else-if="doc.error" :message="doc.error" @retry="doc.reload()" />

      <div v-else-if="doc.doc" class="grid gap-6 lg:grid-cols-3">
        <!-- Left column -->
        <div class="space-y-6 lg:col-span-2">

          <!-- Basic Info -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Basic Information</h2>
              <transition name="fade">
                <button v-if="hasBasicChanges" @click="saveSection('basic')" :disabled="saving" class="mtd-save-btn">
                  {{ saving ? 'Saving...' : 'Save' }}
                </button>
              </transition>
            </div>
            <div class="p-5">
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mtd-label">Meeting Name</label>
                  <input v-model="form.meeting_name" type="text" class="mtd-input" />
                </div>
                <div>
                  <label class="mtd-label">Slug</label>
                  <input v-model="form.meeting_slug" type="text" class="mtd-input" />
                </div>
                <div>
                  <label class="mtd-label">Department</label>
                  <div class="relative" ref="deptDropdownRef">
                    <button @click="deptDropdownOpen = !deptDropdownOpen" type="button" class="mtd-select">
                      <span>{{ selectedDeptName || 'Select department' }}</span>
                      <FeatherIcon name="chevron-down" class="h-4 w-4 shrink-0 text-gray-400 transition-transform" :class="deptDropdownOpen ? 'rotate-180' : ''" />
                    </button>
                    <div v-if="deptDropdownOpen" class="mtd-dropdown">
                      <button @click="form.department = ''; deptDropdownOpen = false" class="mtd-dropdown-item" :class="!form.department ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''">
                        No department
                      </button>
                      <button
                        v-for="dept in auth.accessibleDepartments" :key="dept.name"
                        @click="form.department = dept.name; deptDropdownOpen = false"
                        class="mtd-dropdown-item"
                        :class="form.department === dept.name ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''"
                      >{{ dept.department_name }}</button>
                    </div>
                  </div>
                </div>
                <div>
                  <label class="mtd-label">Duration (minutes)</label>
                  <input v-model.number="form.duration" type="number" min="5" step="5" class="mtd-input" />
                </div>
                <div class="sm:col-span-2">
                  <label class="mtd-label">Description</label>
                  <textarea v-model="form.description" rows="3" class="mtd-input" />
                </div>
              </div>
            </div>
          </div>

          <!-- Location -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Location Settings</h2>
              <transition name="fade">
                <button v-if="hasLocationChanges" @click="saveSection('location')" :disabled="saving" class="mtd-save-btn">
                  {{ saving ? 'Saving...' : 'Save' }}
                </button>
              </transition>
            </div>
            <div class="p-5">
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mtd-label">Location Type</label>
                  <div class="relative" ref="locDropdownRef">
                    <button @click="locDropdownOpen = !locDropdownOpen" type="button" class="mtd-select">
                      <span>{{ form.location_type }}</span>
                      <FeatherIcon name="chevron-down" class="h-4 w-4 shrink-0 text-gray-400 transition-transform" :class="locDropdownOpen ? 'rotate-180' : ''" />
                    </button>
                    <div v-if="locDropdownOpen" class="mtd-dropdown">
                      <button
                        v-for="lt in ['Video Call', 'Phone Call', 'Physical Location', 'Custom']" :key="lt"
                        @click="form.location_type = lt; locDropdownOpen = false"
                        class="mtd-dropdown-item"
                        :class="form.location_type === lt ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''"
                      >{{ lt }}</button>
                    </div>
                  </div>
                </div>
                <div v-if="form.location_type === 'Video Call'">
                  <label class="mtd-label">Video Platform</label>
                  <div class="relative" ref="platDropdownRef">
                    <button @click="platDropdownOpen = !platDropdownOpen" type="button" class="mtd-select">
                      <span>{{ form.video_platform || 'Select platform' }}</span>
                      <FeatherIcon name="chevron-down" class="h-4 w-4 shrink-0 text-gray-400 transition-transform" :class="platDropdownOpen ? 'rotate-180' : ''" />
                    </button>
                    <div v-if="platDropdownOpen" class="mtd-dropdown">
                      <button
                        v-for="vp in ['Google Meet', 'Zoom', 'Microsoft Teams', 'Custom']" :key="vp"
                        @click="form.video_platform = vp; platDropdownOpen = false"
                        class="mtd-dropdown-item"
                        :class="form.video_platform === vp ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''"
                      >{{ vp }}</button>
                    </div>
                  </div>
                </div>
                <div v-if="form.location_type === 'Custom' || form.location_type === 'Physical Location'" class="sm:col-span-2">
                  <label class="mtd-label">Custom Location</label>
                  <input v-model="form.custom_location" type="text" placeholder="e.g. Conference Room A" class="mtd-input" />
                </div>
              </div>
            </div>
          </div>

          <!-- Visibility -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Visibility & Options</h2>
              <transition name="fade">
                <button v-if="hasVisibilityChanges" @click="saveSection('visibility')" :disabled="saving" class="mtd-save-btn">
                  {{ saving ? 'Saving...' : 'Save' }}
                </button>
              </transition>
            </div>
            <div class="p-5">
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label class="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  :class="form.is_active ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'">
                  <input v-model="form.is_active" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700" />
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">Active</p>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400">Can be booked</p>
                  </div>
                </label>
                <label class="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  :class="form.is_public ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'">
                  <input v-model="form.is_public" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700" />
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">Public</p>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400">Public booking</p>
                  </div>
                </label>
                <label class="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  :class="form.is_internal ? 'border-purple-300 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700'">
                  <input v-model="form.is_internal" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700" />
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">Internal</p>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400">Team meetings</p>
                  </div>
                </label>
                <label class="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  :class="form.requires_approval ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20' : 'border-gray-200 dark:border-gray-700'">
                  <input v-model="form.requires_approval" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500 dark:border-gray-600 dark:bg-gray-700" />
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">Approval</p>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400">Needs approval</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <!-- Reminder Schedule -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
                Reminder Schedule
                <span v-if="reminderRows.length" class="ml-1 text-xs font-normal text-gray-400">({{ reminderRows.length }})</span>
              </h2>
              <div class="flex items-center gap-2">
                <transition name="fade">
                  <button v-if="hasReminderChanges" @click="saveReminders" :disabled="savingReminders" class="mtd-save-btn">
                    {{ savingReminders ? 'Saving...' : 'Save' }}
                  </button>
                </transition>
                <button @click="addReminderRow" class="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700">
                  + Add
                </button>
              </div>
            </div>
            <!-- Guide -->
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <button @click="showReminderGuide = !showReminderGuide" class="flex w-full items-center gap-2 text-left text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                <FeatherIcon :name="showReminderGuide ? 'chevron-up' : 'info'" class="h-3.5 w-3.5" />
                {{ showReminderGuide ? 'Hide guide' : 'How do reminders work?' }}
              </button>
              <transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                <div v-if="showReminderGuide" class="mt-3 space-y-3 rounded-lg bg-blue-50 p-4 text-xs text-gray-700 dark:bg-blue-900/20 dark:text-gray-300">
                  <div>
                    <h4 class="mb-1 font-semibold text-gray-900 dark:text-white">Automated Reminders</h4>
                    <p>The system checks every <strong>5 minutes</strong> for upcoming bookings that use this meeting type. For each active reminder row configured below, it calculates the send time:</p>
                    <p class="mt-1 rounded bg-white px-2 py-1 font-mono text-[11px] dark:bg-gray-800">send_time = meeting start &minus; hours before</p>
                    <p class="mt-1">When the current time passes the send time, the reminder is sent automatically. Each reminder fires only once per booking (tracked by a unique key like <code class="rounded bg-white px-1 dark:bg-gray-800">auto_24h</code>).</p>
                  </div>
                  <div>
                    <h4 class="mb-1 font-semibold text-gray-900 dark:text-white">Who receives automated reminders?</h4>
                    <ul class="ml-4 list-disc space-y-0.5">
                      <li><strong>External bookings:</strong> Customer + Host(s)</li>
                      <li><strong>Internal meetings:</strong> Host(s) + Participants</li>
                    </ul>
                  </div>
                  <div>
                    <h4 class="mb-1 font-semibold text-gray-900 dark:text-white">Manual Reminders</h4>
                    <p>Users can also send reminders manually from the <strong>Booking Detail</strong> page or the <strong>Calendar Sidebar</strong>. Manual reminders let you choose exactly who to notify (customer, hosts, and/or participants) and include a custom message. Each manual send is logged in the booking's history.</p>
                  </div>
                  <div>
                    <h4 class="mb-1 font-semibold text-gray-900 dark:text-white">Logging</h4>
                    <p>Every reminder (automated or manual) is recorded in the booking's <strong>History</strong> timeline as a "Reminder Sent" event, showing who was notified and when. The <code class="rounded bg-white px-1 dark:bg-gray-800">reminders_sent</code> and <code class="rounded bg-white px-1 dark:bg-gray-800">last_reminder_sent</code> fields are also updated on the booking.</p>
                  </div>
                  <div>
                    <h4 class="mb-1 font-semibold text-gray-900 dark:text-white">Configuration Tips</h4>
                    <ul class="ml-4 list-disc space-y-0.5">
                      <li>Common setups: <strong>24h</strong> + <strong>1h</strong> before meeting</li>
                      <li>Use the <strong>On/Off</strong> toggle to temporarily disable a reminder without deleting it</li>
                      <li>SMS requires a gateway integration &mdash; only <strong>Email</strong> is active currently</li>
                      <li>Reminders use the <strong>Email Templates</strong> system &mdash; customize them under Management &rarr; Email Templates (type: Reminder)</li>
                    </ul>
                  </div>
                </div>
              </transition>
            </div>

            <div class="p-5">
              <p v-if="reminderRows.length === 0" class="text-center text-sm text-gray-400 dark:text-gray-500">
                No reminders configured. Add a reminder to automatically notify participants before meetings.
              </p>
              <div v-else class="space-y-3">
                <div
                  v-for="(row, idx) in reminderRows" :key="idx"
                  class="flex items-center gap-3 rounded-lg border p-3 transition-colors"
                  :class="row.is_active
                    ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                    : 'border-gray-100 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-900'"
                >
                  <div class="flex-1">
                    <div class="flex items-center gap-3">
                      <div class="flex items-center gap-1.5">
                        <FeatherIcon name="bell" class="h-4 w-4 text-yellow-500" />
                        <input
                          v-model.number="row.hours_before_meeting"
                          type="number"
                          min="0"
                          max="720"
                          class="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                        <span class="text-xs text-gray-500 dark:text-gray-400">hours before</span>
                      </div>
                      <div class="relative" :ref="el => reminderDropdownRefs[idx] = el">
                        <button
                          @click="toggleReminderDropdown(idx)"
                          class="flex items-center gap-1 rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          {{ row.notification_type }}
                          <FeatherIcon name="chevron-down" class="h-3 w-3" />
                        </button>
                        <div v-if="reminderDropdownIdx === idx" class="absolute left-0 top-full z-10 mt-1 w-28 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                          <button
                            v-for="nt in ['Email', 'SMS', 'Both']" :key="nt"
                            @click="row.notification_type = nt; reminderDropdownIdx = null"
                            class="flex w-full items-center px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            :class="row.notification_type === nt ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''"
                          >{{ nt }}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <label class="flex cursor-pointer items-center gap-1.5" :title="row.is_active ? 'Active' : 'Inactive'">
                    <input type="checkbox" v-model="row.is_active" class="rounded border-gray-300 text-green-600 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700" />
                    <span class="text-[10px] text-gray-400">{{ row.is_active ? 'On' : 'Off' }}</span>
                  </label>
                  <button @click="removeReminderRow(idx)" class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400" title="Remove">
                    <FeatherIcon name="trash-2" class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Bookings -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
                Recent Bookings
                <span v-if="recentBookings.length" class="ml-1 text-xs font-normal text-gray-400">({{ recentBookings.length }})</span>
              </h2>
              <button v-if="recentBookings.length" @click="router.push('/bookings')" class="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">View all</button>
            </div>
            <div v-if="bookingsLoading" class="flex justify-center py-8"><LoadingSpinner /></div>
            <div v-else-if="recentBookings.length === 0" class="py-8 text-center">
              <svg class="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">No bookings yet</p>
            </div>
            <ul v-else class="divide-y divide-gray-100 dark:divide-gray-700">
              <li v-for="b in recentBookings" :key="b.name" @click="router.push(`/bookings/${b.name}`)"
                class="flex cursor-pointer items-center justify-between px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ b.meeting_title || b.name }}</p>
                  <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {{ formatBookingDate(b.start_datetime) }}
                    <span v-if="b.customer" class="ml-1">&middot; {{ b.customer }}</span>
                  </p>
                </div>
                <span class="ml-3 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" :class="bookingStatusClass(b.booking_status)">
                  {{ b.booking_status }}
                </span>
              </li>
            </ul>
          </div>

          <!-- Activity -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Activity</h2>
              <button v-if="activities.length > 5 && !showAllActivities" @click="showAllActivities = true" class="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                Show all ({{ activities.length }})
              </button>
              <button v-else-if="showAllActivities" @click="showAllActivities = false" class="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                Show less
              </button>
            </div>
            <div v-if="activitiesLoading" class="flex justify-center py-8"><LoadingSpinner /></div>
            <div v-else-if="activities.length === 0" class="py-8 text-center">
              <p class="text-sm text-gray-500 dark:text-gray-400">No activity yet</p>
            </div>
            <ol v-else class="relative m-5 border-l border-gray-200 dark:border-gray-700">
              <li v-for="(a, idx) in visibleActivities" :key="idx" class="mb-4 ml-5 last:mb-0">
                <div class="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-gray-300 dark:border-gray-800 dark:bg-gray-600"></div>
                <p class="text-sm text-gray-700 dark:text-gray-300">{{ a.content }}</p>
                <time class="mt-0.5 block text-[11px] text-gray-400 dark:text-gray-500">{{ a.time }}</time>
              </li>
            </ol>
          </div>

          <!-- Danger Zone -->
          <div class="rounded-lg border border-red-200 bg-white shadow-sm dark:border-red-900/50 dark:bg-gray-800">
            <div class="px-5 py-4">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-sm font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
                  <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Permanently delete this meeting type and all associated settings.</p>
                </div>
                <button @click="showDeleteModal = true"
                  class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30">
                  <FeatherIcon name="trash-2" class="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right sidebar -->
        <div class="space-y-6">
          <!-- Stats -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Statistics</h2>
            </div>
            <div class="grid grid-cols-2 gap-px bg-gray-100 dark:bg-gray-700">
              <div class="bg-white p-4 dark:bg-gray-800">
                <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.total }}</p>
                <p class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Total Bookings</p>
              </div>
              <div class="bg-white p-4 dark:bg-gray-800">
                <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ stats.upcoming }}</p>
                <p class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Upcoming</p>
              </div>
              <div class="bg-white p-4 dark:bg-gray-800">
                <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ stats.completed }}</p>
                <p class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Completed</p>
              </div>
              <div class="bg-white p-4 dark:bg-gray-800">
                <p class="text-2xl font-bold text-red-600 dark:text-red-400">{{ stats.cancelled }}</p>
                <p class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Cancelled</p>
              </div>
            </div>
          </div>

          <!-- Details -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Details</h2>
            </div>
            <dl class="divide-y divide-gray-100 dark:divide-gray-700">
              <div class="flex items-center justify-between px-5 py-2.5">
                <dt class="text-xs text-gray-500 dark:text-gray-400">Duration</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ doc.doc.duration }} min</dd>
              </div>
              <div class="flex items-center justify-between px-5 py-2.5">
                <dt class="text-xs text-gray-500 dark:text-gray-400">Location</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ doc.doc.location_type }}</dd>
              </div>
              <div v-if="doc.doc.video_platform" class="flex items-center justify-between px-5 py-2.5">
                <dt class="text-xs text-gray-500 dark:text-gray-400">Platform</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ doc.doc.video_platform }}</dd>
              </div>
              <div class="flex items-center justify-between px-5 py-2.5">
                <dt class="text-xs text-gray-500 dark:text-gray-400">Department</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ selectedDeptName || '-' }}</dd>
              </div>
              <div v-if="doc.doc.created_by" class="flex items-center justify-between px-5 py-2.5">
                <dt class="text-xs text-gray-500 dark:text-gray-400">Created by</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ doc.doc.created_by }}</dd>
              </div>
            </dl>
          </div>

          <!-- Public URL -->
          <div v-if="doc.doc.is_public && doc.doc.public_booking_url" class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Public Booking URL</h2>
            </div>
            <div class="px-5 py-3">
              <div class="flex items-center gap-2">
                <input :value="doc.doc.public_booking_url" readonly class="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400" />
                <button @click="copyUrl(doc.doc.public_booking_url)" class="shrink-0 rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700">
                  <FeatherIcon :name="copied ? 'check' : 'copy'" class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Modal -->
    <teleport to="body">
      <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showDeleteModal = false">
        <div class="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Delete Meeting Type</h3>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Are you sure you want to delete "{{ doc.doc?.meeting_name }}"? This action cannot be undone.
          </p>
          <div class="mt-6 flex items-center justify-end gap-3">
            <button @click="showDeleteModal = false" class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
            <button @click="deleteMeetingType" :disabled="deleting" class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { createDocumentResource, call, Tooltip } from 'frappe-ui'
import { useAuthStore } from '@/stores/auth'
import { useMeetingTypeNavigation } from '@/composables/useMeetingTypeNavigation'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorState from '@/components/shared/ErrorState.vue'

const props = defineProps({ id: String })
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

// Current ID (reactive to prop/route changes)
const currentId = computed(() => props.id || route.params.id)

// Navigation
const { loadMeetingTypes, updateCurrentIndex, goToNext, goToPrevious, hasNext, hasPrevious, nextId, prevId } = useMeetingTypeNavigation()
onMounted(() => { loadMeetingTypes() })
watch(currentId, () => { updateCurrentIndex() })

// Document resource
const doc = createDocumentResource({
  doctype: 'MM Meeting Type',
  name: currentId.value,
  auto: true,
})

watch(currentId, (newId) => {
  if (newId) {
    doc.name = newId
    doc.reload()
    loadRecentBookings()
    loadStats()
    loadActivities()
  }
})

// Form
const form = reactive({
  meeting_name: '', meeting_slug: '', department: '', duration: 30,
  description: '', location_type: 'Video Call', video_platform: '',
  custom_location: '', is_active: true, is_public: false,
  is_internal: false, requires_approval: false,
})
const original = reactive({ ...form })

watch(() => doc.doc, (d) => {
  if (d) {
    const vals = {
      meeting_name: d.meeting_name || '', meeting_slug: d.meeting_slug || '',
      department: d.department || '', duration: d.duration || 30,
      description: d.description || '', location_type: d.location_type || 'Video Call',
      video_platform: d.video_platform || '', custom_location: d.custom_location || '',
      is_active: !!d.is_active, is_public: !!d.is_public,
      is_internal: !!d.is_internal, requires_approval: !!d.requires_approval,
    }
    Object.assign(form, vals)
    Object.assign(original, vals)
  }
}, { immediate: true })

// Change detection
const hasBasicChanges = computed(() =>
  form.meeting_name !== original.meeting_name || form.meeting_slug !== original.meeting_slug ||
  form.department !== original.department || form.duration !== original.duration ||
  form.description !== original.description
)
const hasLocationChanges = computed(() =>
  form.location_type !== original.location_type || form.video_platform !== original.video_platform ||
  form.custom_location !== original.custom_location
)
const hasVisibilityChanges = computed(() =>
  form.is_active !== original.is_active || form.is_public !== original.is_public ||
  form.is_internal !== original.is_internal || form.requires_approval !== original.requires_approval
)

// ── Reminder Schedule ──────────────────────────────────────────────────────

const reminderRows = ref([])
const originalReminders = ref([])
const savingReminders = ref(false)
const reminderDropdownIdx = ref(null)
const reminderDropdownRefs = ref({})
const showReminderGuide = ref(false)

// Load reminders from doc when it changes
watch(() => doc.doc, (d) => {
  if (d && d.reminder_schedule) {
    const rows = d.reminder_schedule.map(r => ({
      hours_before_meeting: r.hours_before_meeting,
      notification_type: r.notification_type || 'Email',
      is_active: !!r.is_active,
    }))
    reminderRows.value = JSON.parse(JSON.stringify(rows))
    originalReminders.value = JSON.parse(JSON.stringify(rows))
  } else {
    reminderRows.value = []
    originalReminders.value = []
  }
}, { immediate: true })

const hasReminderChanges = computed(() => {
  return JSON.stringify(reminderRows.value) !== JSON.stringify(originalReminders.value)
})

function addReminderRow() {
  reminderRows.value.push({ hours_before_meeting: 24, notification_type: 'Email', is_active: true })
}

function removeReminderRow(idx) {
  reminderRows.value.splice(idx, 1)
}

function toggleReminderDropdown(idx) {
  reminderDropdownIdx.value = reminderDropdownIdx.value === idx ? null : idx
}

async function saveReminders() {
  savingReminders.value = true
  try {
    // Build child table rows for frappe
    const rows = reminderRows.value.map(r => ({
      hours_before_meeting: r.hours_before_meeting,
      notification_type: r.notification_type,
      is_active: r.is_active ? 1 : 0,
    }))

    await call('frappe.client.set_value', {
      doctype: 'MM Meeting Type',
      name: currentId.value,
      fieldname: 'reminder_schedule',
      value: rows,
    })

    // Reload doc to get updated child table with names
    doc.reload()
    loadActivities()
  } catch (e) {
    console.error('Failed to save reminders:', e)
  } finally {
    savingReminders.value = false
  }
}

// Close reminder dropdown on click outside
function handleReminderClickOutside(e) {
  if (reminderDropdownIdx.value !== null) {
    const ref = reminderDropdownRefs.value[reminderDropdownIdx.value]
    if (ref && !ref.contains(e.target)) {
      reminderDropdownIdx.value = null
    }
  }
}
onMounted(() => document.addEventListener('click', handleReminderClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleReminderClickOutside))

// Department name
const selectedDeptName = computed(() => {
  if (!form.department) return ''
  const dept = auth.accessibleDepartments.find(d => d.name === form.department)
  return dept?.department_name || form.department
})

// Custom dropdowns
const deptDropdownOpen = ref(false)
const deptDropdownRef = ref(null)
const locDropdownOpen = ref(false)
const locDropdownRef = ref(null)
const platDropdownOpen = ref(false)
const platDropdownRef = ref(null)

function handleClickOutside(e) {
  if (deptDropdownOpen.value && deptDropdownRef.value && !deptDropdownRef.value.contains(e.target)) deptDropdownOpen.value = false
  if (locDropdownOpen.value && locDropdownRef.value && !locDropdownRef.value.contains(e.target)) locDropdownOpen.value = false
  if (platDropdownOpen.value && platDropdownRef.value && !platDropdownRef.value.contains(e.target)) platDropdownOpen.value = false
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

// Save
const saving = ref(false)
async function saveSection() {
  saving.value = true
  try {
    await doc.setValue.submit({
      meeting_name: form.meeting_name, meeting_slug: form.meeting_slug,
      department: form.department, duration: form.duration,
      description: form.description, location_type: form.location_type,
      video_platform: form.video_platform, custom_location: form.custom_location,
      is_active: form.is_active ? 1 : 0, is_public: form.is_public ? 1 : 0,
      is_internal: form.is_internal ? 1 : 0, requires_approval: form.requires_approval ? 1 : 0,
    })
    doc.reload()
    loadActivities()
  } catch (e) { console.error('Failed to save:', e) }
  finally { saving.value = false }
}

// Delete
const showDeleteModal = ref(false)
const deleting = ref(false)
async function deleteMeetingType() {
  deleting.value = true
  try { await doc.delete.submit(); router.push('/meeting-types') }
  catch (e) { console.error('Failed to delete:', e) }
  finally { deleting.value = false }
}

// Copy URL
const copied = ref(false)
function copyUrl(url) {
  if (!url) return
  navigator.clipboard.writeText(url)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

// Recent bookings
const recentBookings = ref([])
const bookingsLoading = ref(false)

async function loadRecentBookings() {
  bookingsLoading.value = true
  try {
    const id = currentId.value
    const result = await call('frappe.client.get_list', {
      doctype: 'MM Meeting Booking',
      filters: { meeting_type: id },
      fields: ['name', 'meeting_title', 'start_datetime', 'booking_status', 'customer'],
      order_by: 'start_datetime desc',
      limit_page_length: 5,
    })
    recentBookings.value = result
  } catch (e) { console.error('Failed to load bookings:', e) }
  finally { bookingsLoading.value = false }
}

// Statistics
const stats = reactive({ total: 0, upcoming: 0, completed: 0, cancelled: 0 })

async function loadStats() {
  try {
    const id = currentId.value
    const [total, upcoming, completed, cancelled] = await Promise.all([
      call('frappe.client.get_count', { doctype: 'MM Meeting Booking', filters: { meeting_type: id } }),
      call('frappe.client.get_count', { doctype: 'MM Meeting Booking', filters: { meeting_type: id, booking_status: ['in', ['New Booking', 'New Appointment', 'Booking Started']] } }),
      call('frappe.client.get_count', { doctype: 'MM Meeting Booking', filters: { meeting_type: id, booking_status: ['in', ['Sale Approved', 'Booking Approved Not Sale']] } }),
      call('frappe.client.get_count', { doctype: 'MM Meeting Booking', filters: { meeting_type: id, booking_status: 'Cancelled' } }),
    ])
    stats.total = total; stats.upcoming = upcoming; stats.completed = completed; stats.cancelled = cancelled
  } catch (e) { console.error('Failed to load stats:', e) }
}

// Activities (Frappe Version log for field changes)
const activities = ref([])
const activitiesLoading = ref(false)
const showAllActivities = ref(false)

const visibleActivities = computed(() => showAllActivities.value ? activities.value : activities.value.slice(0, 5))

async function loadActivities() {
  activitiesLoading.value = true
  try {
    const id = currentId.value
    // Get Version docs (field change tracking)
    const versions = await call('frappe.client.get_list', {
      doctype: 'Version',
      filters: { ref_doctype: 'MM Meeting Type', docname: id },
      fields: ['name', 'owner', 'creation', 'data'],
      order_by: 'creation desc',
      limit_page_length: 20,
    })

    const entries = []

    for (const v of versions) {
      let data
      try { data = JSON.parse(v.data) } catch { continue }

      // Field changes
      if (data.changed && data.changed.length) {
        for (const [field, oldVal, newVal] of data.changed) {
          const label = field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          const ownerName = await resolveUserName(v.owner)
          entries.push({
            content: `${ownerName} changed ${label} from "${oldVal || 'empty'}" to "${newVal || 'empty'}"`,
            time: formatActivityDate(v.creation),
          })
        }
      }

      // Row changes
      if (data.added && data.added.length) {
        const ownerName = await resolveUserName(v.owner)
        entries.push({
          content: `${ownerName} added ${data.added.length} row(s)`,
          time: formatActivityDate(v.creation),
        })
      }
      if (data.removed && data.removed.length) {
        const ownerName = await resolveUserName(v.owner)
        entries.push({
          content: `${ownerName} removed ${data.removed.length} row(s)`,
          time: formatActivityDate(v.creation),
        })
      }
    }

    // Also get creation event
    if (doc.doc) {
      const creatorName = await resolveUserName(doc.doc.owner)
      entries.push({
        content: `${creatorName} created this meeting type`,
        time: formatActivityDate(doc.doc.creation),
      })
    }

    activities.value = entries
  } catch (e) { console.error('Failed to load activities:', e) }
  finally { activitiesLoading.value = false }
}

// User name cache
const userNameCache = {}
async function resolveUserName(user) {
  if (!user) return 'Unknown'
  if (userNameCache[user]) return userNameCache[user]
  try {
    const u = await call('frappe.client.get_value', { doctype: 'User', filters: { name: user }, fieldname: 'full_name' })
    userNameCache[user] = u?.full_name || user
  } catch { userNameCache[user] = user }
  return userNameCache[user]
}

onMounted(() => {
  loadRecentBookings()
  loadStats()
  loadActivities()
})

function formatBookingDate(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatActivityDate(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function bookingStatusClass(status) {
  const map = {
    'New Booking': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'New Appointment': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Booking Started': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Sale Approved': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Booking Approved Not Sale': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Cancelled': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return map[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
}
</script>

<style scoped>
.mtd-label {
  @apply mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400;
}
.mtd-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500;
}
.mtd-select {
  @apply flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-gray-500;
}
.mtd-dropdown {
  @apply absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-700;
}
.mtd-dropdown-item {
  @apply flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600;
}
.mtd-save-btn {
  @apply cursor-pointer rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
