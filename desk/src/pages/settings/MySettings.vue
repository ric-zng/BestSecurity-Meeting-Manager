<template>
  <div class="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
    <!-- Header -->
    <div class="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-900">
      <div>
        <h1 class="text-lg font-semibold text-gray-900 dark:text-white">My Settings</h1>
        <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Manage your personal preferences and working hours.</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <LoadingSpinner />
    </div>

    <!-- Error -->
    <ErrorState v-else-if="error" :message="error" @retry="loadSettings" />

    <!-- Content -->
    <div v-else class="mx-auto grid max-w-[1400px] gap-6 p-6 lg:grid-cols-3">
      <!-- Left column (2/3) -->
      <div class="space-y-6 lg:col-span-2">

        <!-- Profile -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Profile</h2>
          </div>
          <div class="space-y-4 p-5">
            <div class="grid gap-4 sm:grid-cols-2">
              <!-- Timezone searchable dropdown -->
              <div>
                <label class="ms-label">Timezone</label>
                <div class="relative" ref="tzDropdownRef">
                  <button @click="tzDropdownOpen = !tzDropdownOpen" type="button" class="ms-select">
                    <span>{{ form.timezone || 'Select timezone' }}</span>
                    <FeatherIcon name="chevron-down" class="h-4 w-4 shrink-0 text-gray-400 transition-transform" :class="tzDropdownOpen ? 'rotate-180' : ''" />
                  </button>
                  <div v-if="tzDropdownOpen" class="ms-dropdown">
                    <div class="sticky top-0 border-b border-gray-200 bg-white p-2 dark:border-gray-600 dark:bg-gray-700">
                      <input
                        v-model="tzSearch"
                        ref="tzSearchRef"
                        type="text"
                        placeholder="Search timezones..."
                        class="w-full rounded-md border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-500 dark:bg-gray-600 dark:text-white dark:placeholder-gray-400"
                        @click.stop
                      />
                    </div>
                    <div class="max-h-52 overflow-y-auto">
                      <button
                        v-for="tz in filteredTimezones" :key="tz"
                        @click="form.timezone = tz; tzDropdownOpen = false; tzSearch = ''"
                        class="ms-dropdown-item"
                        :class="form.timezone === tz ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''"
                      >{{ tz }}</button>
                      <div v-if="!filteredTimezones.length" class="px-3 py-4 text-center text-xs text-gray-400">No timezones found</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label class="ms-label">User</label>
                <input :value="auth.user" disabled class="ms-input disabled:cursor-not-allowed disabled:opacity-60" />
              </div>
            </div>
            <div>
              <label class="ms-label">Bio</label>
              <textarea
                v-model="form.bio"
                rows="3"
                placeholder="Tell us a little about yourself..."
                class="ms-input"
              />
            </div>
          </div>
        </div>

        <!-- Working Hours -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <div>
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Working Hours</h2>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Define your typical working hours (24h format).</p>
            </div>
            <button
              @click="resetToDefaults"
              class="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              title="Reset to defaults (Mon–Fri, 09:00–17:00)"
            >
              <FeatherIcon name="rotate-ccw" class="h-3 w-3" />
              Reset
            </button>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-gray-700">
            <div
              v-for="(day, index) in workingHours"
              :key="day.day"
              class="flex items-center gap-4 px-5 py-3 transition-colors"
              :class="day.enabled ? '' : 'opacity-40'"
            >
              <!-- Day name -->
              <div class="w-28 shrink-0">
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ capitalize(day.day) }}</span>
              </div>

              <!-- Start time -->
              <div class="flex items-center gap-1.5">
                <button @click="adjustTime(index, 'start', -15)" :disabled="!day.enabled" class="ms-time-btn">
                  <FeatherIcon name="minus" class="h-3 w-3" />
                </button>
                <input
                  :value="day.start"
                  @change="onTimeInput(index, 'start', $event.target.value)"
                  :disabled="!day.enabled"
                  class="ms-time-input"
                />
                <button @click="adjustTime(index, 'start', 15)" :disabled="!day.enabled" class="ms-time-btn">
                  <FeatherIcon name="plus" class="h-3 w-3" />
                </button>
              </div>

              <span class="text-xs text-gray-400">to</span>

              <!-- End time -->
              <div class="flex items-center gap-1.5">
                <button @click="adjustTime(index, 'end', -15)" :disabled="!day.enabled" class="ms-time-btn">
                  <FeatherIcon name="minus" class="h-3 w-3" />
                </button>
                <input
                  :value="day.end"
                  @change="onTimeInput(index, 'end', $event.target.value)"
                  :disabled="!day.enabled"
                  class="ms-time-input"
                />
                <button @click="adjustTime(index, 'end', 15)" :disabled="!day.enabled" class="ms-time-btn">
                  <FeatherIcon name="plus" class="h-3 w-3" />
                </button>
              </div>

              <!-- Duration badge -->
              <span v-if="day.enabled" class="hidden text-xs text-gray-400 dark:text-gray-500 sm:inline">
                {{ getDuration(day.start, day.end) }}
              </span>

              <!-- Spacer -->
              <div class="flex-1" />

              <!-- Toggle -->
              <button
                @click="workingHours[index].enabled = !workingHours[index].enabled"
                class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                :class="day.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
                role="switch"
                :aria-checked="day.enabled"
              >
                <span
                  class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition duration-200"
                  :class="day.enabled ? 'translate-x-4' : 'translate-x-0'"
                />
              </button>
            </div>
          </div>

          <!-- Save / Cancel inside card -->
          <transition name="fade">
            <div v-if="hasChanges" class="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-gray-700">
              <button @click="cancelChanges" class="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button
                @click="saveSettings"
                :disabled="saving"
                class="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <FeatherIcon v-if="saving" name="loader" class="h-3 w-3 animate-spin" />
                {{ saving ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </transition>
        </div>

        <!-- Calendar Integrations -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Calendar Integrations</h2>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Connect your external calendar to sync meetings automatically.</p>
          </div>

          <!-- Loading integrations -->
          <div v-if="integrationsLoading" class="flex justify-center py-6"><LoadingSpinner /></div>

          <div v-else class="p-5 space-y-4">
            <!-- Connected integrations -->
            <div v-if="integrations.length > 0" class="space-y-3">
              <div
                v-for="intg in integrations"
                :key="intg.name"
                class="flex items-center gap-3 rounded-lg border px-4 py-3"
                :class="intg.is_active
                  ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
                  : 'border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-700/30'"
              >
                <!-- Icon -->
                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  :class="intg.integration_type === 'Google Calendar'
                    ? 'bg-blue-100 dark:bg-blue-900/30'
                    : intg.integration_type === 'Outlook Calendar'
                      ? 'bg-sky-100 dark:bg-sky-900/30'
                      : 'bg-orange-100 dark:bg-orange-900/30'"
                >
                  <FeatherIcon
                    :name="intg.integration_type === 'iCal' ? 'link' : 'calendar'"
                    class="h-4 w-4"
                    :class="intg.integration_type === 'Google Calendar'
                      ? 'text-blue-600 dark:text-blue-400'
                      : intg.integration_type === 'Outlook Calendar'
                        ? 'text-sky-600 dark:text-sky-400'
                        : 'text-orange-600 dark:text-orange-400'"
                  />
                </div>

                <!-- Info -->
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{{ intg.integration_type }}</p>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span
                      class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                      :class="intg.is_active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'"
                    >{{ intg.is_active ? 'Connected' : 'Inactive' }}</span>
                    <span class="text-[10px] text-gray-400 dark:text-gray-500">{{ intg.sync_direction || 'One-way' }}</span>
                    <span v-if="intg.last_synced" class="text-[10px] text-gray-400 dark:text-gray-500">
                      Synced {{ formatRelativeDate(intg.last_synced) }}
                    </span>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-1">
                  <button
                    @click="toggleIntegration(intg)"
                    class="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    :title="intg.is_active ? 'Pause sync' : 'Resume sync'"
                  >
                    <FeatherIcon :name="intg.is_active ? 'pause' : 'play'" class="h-3.5 w-3.5" />
                  </button>
                  <button
                    @click="disconnectIntegration(intg)"
                    class="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    title="Disconnect"
                  >
                    <FeatherIcon name="trash-2" class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Connect buttons -->
            <div class="space-y-2">
              <p v-if="integrations.length === 0" class="text-xs text-gray-500 dark:text-gray-400 mb-3">
                No calendars connected. Connect one below to sync your meetings.
              </p>

              <!-- Google Calendar -->
              <button
                v-if="!hasGoogle"
                @click="connectGoogle"
                :disabled="connectingGoogle"
                class="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700 dark:hover:border-blue-700 dark:hover:bg-blue-950/20"
              >
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FeatherIcon name="calendar" class="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ connectingGoogle ? 'Connecting...' : 'Connect Google Calendar' }}
                  </p>
                  <p class="text-[11px] text-gray-500 dark:text-gray-400">Sync your Google Calendar events</p>
                </div>
                <FeatherIcon v-if="connectingGoogle" name="loader" class="h-4 w-4 animate-spin text-blue-500" />
                <FeatherIcon v-else name="external-link" class="h-4 w-4 text-gray-300 dark:text-gray-600" />
              </button>

              <!-- Outlook Calendar -->
              <button
                v-if="!hasOutlook"
                @click="connectOutlook"
                :disabled="connectingOutlook"
                class="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:border-sky-300 hover:bg-sky-50/50 dark:border-gray-700 dark:hover:border-sky-700 dark:hover:bg-sky-950/20"
              >
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                  <FeatherIcon name="calendar" class="h-4 w-4 text-sky-600 dark:text-sky-400" />
                </div>
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ connectingOutlook ? 'Connecting...' : 'Connect Outlook Calendar' }}
                  </p>
                  <p class="text-[11px] text-gray-500 dark:text-gray-400">Sync your Microsoft Outlook events</p>
                </div>
                <FeatherIcon v-if="connectingOutlook" name="loader" class="h-4 w-4 animate-spin text-sky-500" />
                <FeatherIcon v-else name="external-link" class="h-4 w-4 text-gray-300 dark:text-gray-600" />
              </button>

              <!-- iCal URL -->
              <div v-if="!hasICal">
                <button
                  v-if="!showICalForm"
                  @click="showICalForm = true"
                  class="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:border-orange-300 hover:bg-orange-50/50 dark:border-gray-700 dark:hover:border-orange-700 dark:hover:bg-orange-950/20"
                >
                  <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <FeatherIcon name="link" class="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">Add iCal Feed</p>
                    <p class="text-[11px] text-gray-500 dark:text-gray-400">Subscribe to any iCal/ICS calendar URL (read-only)</p>
                  </div>
                  <FeatherIcon name="plus" class="h-4 w-4 text-gray-300 dark:text-gray-600" />
                </button>

                <!-- iCal URL form -->
                <div v-else class="rounded-lg border border-orange-200 bg-orange-50/30 p-4 dark:border-orange-800 dark:bg-orange-950/10">
                  <label class="ms-label">iCal URL <span class="text-red-500">*</span></label>
                  <div class="flex gap-2">
                    <input
                      v-model="iCalUrl"
                      type="url"
                      placeholder="https://calendar.google.com/calendar/ical/..."
                      class="ms-input flex-1"
                    />
                    <button
                      @click="connectICal"
                      :disabled="!iCalUrl || connectingICal"
                      class="shrink-0 rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                    >{{ connectingICal ? 'Adding...' : 'Add' }}</button>
                    <button @click="showICalForm = false; iCalUrl = ''" class="shrink-0 rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Activity -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Activity</h2>
            <button v-if="activities.length > 5 && !showAllActivities" @click="showAllActivities = true" class="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              Show all ({{ activities.length }})
            </button>
          </div>
          <div v-if="activitiesLoading" class="flex justify-center py-6"><LoadingSpinner /></div>
          <div v-else-if="!activities.length" class="py-6 text-center text-sm text-gray-500 dark:text-gray-400">No activity recorded</div>
          <ul v-else class="divide-y divide-gray-100 dark:divide-gray-700">
            <li v-for="act in visibleActivities" :key="act.name" class="px-5 py-3">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-gray-900 dark:text-white">
                    <span class="font-medium">{{ act.owner_name || act.owner }}</span>
                    <span class="text-gray-500 dark:text-gray-400"> {{ act.action }}</span>
                  </p>
                  <ul v-if="act.changes?.length" class="mt-1 space-y-0.5">
                    <li v-for="(ch, i) in act.changes" :key="i" class="text-xs text-gray-500 dark:text-gray-400">
                      <span class="font-medium">{{ ch.field }}</span>: <span class="line-through text-red-400">{{ ch.old || '(empty)' }}</span> → <span class="text-green-500">{{ ch.new || '(empty)' }}</span>
                    </li>
                  </ul>
                </div>
                <span class="shrink-0 text-xs text-gray-400 dark:text-gray-500">{{ formatRelativeDate(act.creation) }}</span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Right column (1/3) -->
      <div class="space-y-6">
        <!-- Summary Card -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Summary</h2>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-gray-700">
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Active days</span>
              <span class="text-xs font-medium text-gray-900 dark:text-white">{{ activeDays }} / 7</span>
            </div>
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Weekly hours</span>
              <span class="text-xs font-medium text-gray-900 dark:text-white">{{ weeklyHours }}h</span>
            </div>
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Timezone</span>
              <span class="text-xs font-medium text-gray-900 dark:text-white">{{ form.timezone || '—' }}</span>
            </div>
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Settings ID</span>
              <span class="text-xs font-mono text-gray-500 dark:text-gray-400">{{ settingsDocName || 'New' }}</span>
            </div>
          </div>
        </div>

        <!-- Quick Reference -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Quick Reference</h2>
          </div>
          <div class="space-y-3 p-5">
            <div class="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
              <p class="text-xs font-medium text-gray-700 dark:text-gray-300">Working Hours</p>
              <p class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">Define when you're available for meetings. Inactive days won't show booking slots.</p>
            </div>
            <div class="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
              <p class="text-xs font-medium text-gray-700 dark:text-gray-300">Timezone</p>
              <p class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">All meeting times will be displayed in your selected timezone.</p>
            </div>
            <div class="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
              <p class="text-xs font-medium text-gray-700 dark:text-gray-300">Time Adjustment</p>
              <p class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">Use +/- buttons to adjust time in 15-minute increments, or type directly in HH:MM format.</p>
            </div>
            <div class="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
              <p class="text-xs font-medium text-gray-700 dark:text-gray-300">Calendar Sync</p>
              <p class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">Connect Google Calendar or Outlook to automatically sync meetings. Each user manages their own connection.</p>
            </div>
          </div>
        </div>

        <!-- Metadata -->
        <div v-if="settingsDocName" class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Details</h2>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-gray-700">
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Created</span>
              <span class="text-xs text-gray-700 dark:text-gray-300">{{ metadata.creation ? formatDate(metadata.creation) : '—' }}</span>
            </div>
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Last modified</span>
              <span class="text-xs text-gray-700 dark:text-gray-300">{{ metadata.modified ? formatDate(metadata.modified) : '—' }}</span>
            </div>
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Modified by</span>
              <span class="text-xs text-gray-700 dark:text-gray-300">{{ metadata.modified_by || '—' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { call } from 'frappe-ui'
import { toast } from 'frappe-ui'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorState from '@/components/shared/ErrorState.vue'

const auth = useAuthStore()

const loading = ref(true)
const error = ref(null)
const saving = ref(false)
const settingsDocName = ref(null)

const metadata = reactive({ creation: '', modified: '', modified_by: '' })

// Timezone dropdown
const tzDropdownOpen = ref(false)
const tzDropdownRef = ref(null)
const tzSearchRef = ref(null)
const tzSearch = ref('')

const timezones = [
  'Africa/Abidjan', 'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Algiers',
  'Africa/Cairo', 'Africa/Casablanca', 'Africa/Dar_es_Salaam', 'Africa/Harare',
  'Africa/Johannesburg', 'Africa/Kampala', 'Africa/Khartoum', 'Africa/Kinshasa',
  'Africa/Lagos', 'Africa/Maputo', 'Africa/Nairobi', 'Africa/Tunis',
  'America/Anchorage', 'America/Argentina/Buenos_Aires', 'America/Bogota',
  'America/Chicago', 'America/Denver', 'America/Halifax', 'America/Lima',
  'America/Los_Angeles', 'America/Mexico_City', 'America/New_York',
  'America/Santiago', 'America/Sao_Paulo', 'America/Toronto', 'America/Vancouver',
  'Asia/Almaty', 'Asia/Baghdad', 'Asia/Bangkok', 'Asia/Colombo', 'Asia/Dhaka',
  'Asia/Dubai', 'Asia/Hong_Kong', 'Asia/Istanbul', 'Asia/Jakarta', 'Asia/Karachi',
  'Asia/Kolkata', 'Asia/Kuala_Lumpur', 'Asia/Manila', 'Asia/Riyadh',
  'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Taipei', 'Asia/Tehran',
  'Asia/Tokyo', 'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Melbourne',
  'Australia/Perth', 'Australia/Sydney',
  'Europe/Amsterdam', 'Europe/Athens', 'Europe/Berlin', 'Europe/Brussels',
  'Europe/Bucharest', 'Europe/Budapest', 'Europe/Copenhagen', 'Europe/Dublin',
  'Europe/Helsinki', 'Europe/Istanbul', 'Europe/Lisbon', 'Europe/London',
  'Europe/Madrid', 'Europe/Moscow', 'Europe/Oslo', 'Europe/Paris', 'Europe/Prague',
  'Europe/Rome', 'Europe/Stockholm', 'Europe/Vienna', 'Europe/Warsaw', 'Europe/Zurich',
  'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Honolulu',
  'UTC',
]

const filteredTimezones = computed(() => {
  if (!tzSearch.value) return timezones
  const q = tzSearch.value.toLowerCase()
  return timezones.filter(tz => tz.toLowerCase().includes(q))
})

// Auto-focus search when dropdown opens
watch(tzDropdownOpen, (open) => {
  if (open) {
    tzSearch.value = ''
    nextTick(() => tzSearchRef.value?.focus())
  }
})

// Click outside to close dropdown
function onClickOutside(e) {
  if (tzDropdownRef.value && !tzDropdownRef.value.contains(e.target)) {
    tzDropdownOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))

const form = reactive({
  timezone: '',
  bio: '',
})

// Snapshot of original values for change detection
const originalForm = ref('')
const originalHours = ref('')

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DEFAULT_HOURS = DAYS.map(day => ({
  day,
  enabled: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day),
  start: '09:00',
  end: '17:00',
}))

const workingHours = reactive([...DEFAULT_HOURS.map(d => ({ ...d }))])

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Change detection
const hasChanges = computed(() => {
  return JSON.stringify(form) !== originalForm.value || serializeWorkingHours() !== originalHours.value
})

// Computed summary
const activeDays = computed(() => workingHours.filter(d => d.enabled).length)
const weeklyHours = computed(() => {
  let total = 0
  for (const d of workingHours) {
    if (!d.enabled) continue
    const [sh, sm] = d.start.split(':').map(Number)
    const [eh, em] = d.end.split(':').map(Number)
    const mins = (eh * 60 + em) - (sh * 60 + sm)
    if (mins > 0) total += mins
  }
  return Math.round(total / 60 * 10) / 10
})

// Time helpers
function adjustTime(index, field, deltaMinutes) {
  const current = workingHours[index][field]
  const [h, m] = current.split(':').map(Number)
  let totalMins = h * 60 + m + deltaMinutes
  if (totalMins < 0) totalMins = 0
  if (totalMins > 23 * 60 + 45) totalMins = 23 * 60 + 45
  const newH = Math.floor(totalMins / 60)
  const newM = totalMins % 60
  workingHours[index][field] = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}

function onTimeInput(index, field, value) {
  if (/^\d{1,2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(':').map(Number)
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      workingHours[index][field] = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
  }
}

function getDuration(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return '—'
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  if (remMins === 0) return `${hours}h`
  return `${hours}h ${remMins}m`
}

// Serialize to the dict format the backend expects:
// { "monday": { "enabled": true, "start": "09:00", "end": "17:00" }, ... }
function serializeWorkingHours() {
  const obj = {}
  for (const d of workingHours) {
    if (d.enabled) {
      obj[d.day] = { enabled: true, start: d.start, end: d.end }
    } else {
      obj[d.day] = { enabled: false }
    }
  }
  return JSON.stringify(obj)
}

// Parse from the dict format
function parseWorkingHours(json) {
  if (!json) return
  try {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json

    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Dict format: { monday: { enabled: true, start: "09:00", end: "17:00" } }
      for (let i = 0; i < workingHours.length; i++) {
        const dayKey = workingHours[i].day
        const config = parsed[dayKey]
        if (config) {
          workingHours[i].enabled = config.enabled !== undefined ? config.enabled : true
          workingHours[i].start = config.start || '09:00'
          workingHours[i].end = config.end || '17:00'
        }
      }
    } else if (Array.isArray(parsed)) {
      // Legacy array format fallback
      parsed.forEach((item, i) => {
        if (i < workingHours.length) {
          workingHours[i].start = item.start || '09:00'
          workingHours[i].end = item.end || '17:00'
          workingHours[i].enabled = item.enabled !== undefined ? item.enabled : (item.active !== undefined ? item.active : true)
        }
      })
    }
  } catch (e) {
    console.warn('Failed to parse working hours JSON:', e)
  }
}

// Calendar Integrations
const integrations = ref([])
const integrationsLoading = ref(false)
const connectingGoogle = ref(false)
const connectingOutlook = ref(false)
const connectingICal = ref(false)
const showICalForm = ref(false)
const iCalUrl = ref('')

const hasGoogle = computed(() => integrations.value.some(i => i.integration_type === 'Google Calendar'))
const hasOutlook = computed(() => integrations.value.some(i => i.integration_type === 'Outlook Calendar'))
const hasICal = computed(() => integrations.value.some(i => i.integration_type === 'iCal'))

async function loadIntegrations() {
  integrationsLoading.value = true
  try {
    const list = await call('frappe.client.get_list', {
      doctype: 'MM Calendar Integration',
      filters: { user: auth.user },
      fields: ['name', 'integration_type', 'is_active', 'sync_direction', 'last_synced', 'ical_url'],
      order_by: 'creation desc',
      limit_page_length: 10,
    })
    integrations.value = list || []
  } catch (e) {
    console.error('Failed to load integrations:', e)
    integrations.value = []
  } finally {
    integrationsLoading.value = false
  }
}

function openOAuthPopup(url, name, onSuccess, onError, onDone) {
  const popup = window.open(url, name, 'width=600,height=700,scrollbars=yes')
  let resolved = false

  // Listen for postMessage from callback page
  const handler = (e) => {
    // Parse data (could be string or object)
    let data = e.data
    if (typeof data === 'string') {
      try { data = JSON.parse(data) } catch { return }
    }
    if (!data || (!data.success && !data.error)) return

    resolved = true
    window.removeEventListener('message', handler)
    if (data.success) {
      onSuccess(data.integration_id)
    } else {
      onError(data.error || 'Connection failed')
    }
    onDone()
  }
  window.addEventListener('message', handler)

  // Poll for popup closed (user cancelled)
  const pollTimer = setInterval(() => {
    if (!popup || popup.closed) {
      clearInterval(pollTimer)
      if (!resolved) {
        window.removeEventListener('message', handler)
        // Reload integrations in case the callback worked but message failed
        loadIntegrations()
        onDone()
      }
    }
  }, 1000)

  // Safety timeout
  setTimeout(() => {
    clearInterval(pollTimer)
    if (!resolved) {
      window.removeEventListener('message', handler)
      loadIntegrations()
      onDone()
    }
  }, 120000)
}

async function connectGoogle() {
  connectingGoogle.value = true
  try {
    const res = await call('meeting_manager.api.oauth_callbacks.get_google_oauth_url')
    if (res?.authorization_url) {
      openOAuthPopup(
        res.authorization_url,
        'google_oauth',
        () => { toast({ title: 'Google Calendar connected!', icon: 'check' }); loadIntegrations() },
        (err) => { toast({ title: err, icon: 'x' }) },
        () => { connectingGoogle.value = false }
      )
    } else {
      connectingGoogle.value = false
    }
  } catch (e) {
    toast({ title: e.message || 'Failed to start Google OAuth', icon: 'x' })
    connectingGoogle.value = false
  }
}

async function connectOutlook() {
  connectingOutlook.value = true
  try {
    const res = await call('meeting_manager.api.oauth_callbacks.get_outlook_oauth_url')
    if (res?.authorization_url) {
      openOAuthPopup(
        res.authorization_url,
        'outlook_oauth',
        () => { toast({ title: 'Outlook Calendar connected!', icon: 'check' }); loadIntegrations() },
        (err) => { toast({ title: err, icon: 'x' }) },
        () => { connectingOutlook.value = false }
      )
    } else {
      connectingOutlook.value = false
    }
  } catch (e) {
    toast({ title: e.message || 'Failed to start Outlook OAuth', icon: 'x' })
    connectingOutlook.value = false
  }
}

async function connectICal() {
  if (!iCalUrl.value) return
  connectingICal.value = true
  try {
    await call('frappe.client.insert', {
      doc: {
        doctype: 'MM Calendar Integration',
        user: auth.user,
        integration_type: 'iCal',
        integration_name: 'iCal Feed',
        ical_url: iCalUrl.value,
        is_active: 1,
        sync_direction: 'One-way (Read Only)',
        auto_sync_enabled: 1,
        sync_past_days: 30,
        sync_future_days: 90,
        sync_interval_minutes: 10,
      },
    })
    toast({ title: 'iCal feed added!', icon: 'check' })
    showICalForm.value = false
    iCalUrl.value = ''
    await loadIntegrations()
  } catch (e) {
    toast({ title: e.message || 'Failed to add iCal feed', icon: 'x' })
  } finally {
    connectingICal.value = false
  }
}

async function toggleIntegration(intg) {
  try {
    const doc = await call('frappe.client.get', { doctype: 'MM Calendar Integration', name: intg.name })
    doc.is_active = intg.is_active ? 0 : 1
    await call('frappe.client.save', { doc })
    toast({ title: intg.is_active ? 'Integration paused' : 'Integration resumed', icon: 'check' })
    await loadIntegrations()
  } catch (e) {
    toast({ title: e.message || 'Failed to update integration', icon: 'x' })
  }
}

async function disconnectIntegration(intg) {
  if (!confirm(`Disconnect ${intg.integration_type}? This will stop syncing.`)) return
  try {
    await call('frappe.client.delete', { doctype: 'MM Calendar Integration', name: intg.name })
    toast({ title: `${intg.integration_type} disconnected`, icon: 'check' })
    await loadIntegrations()
  } catch (e) {
    toast({ title: e.message || 'Failed to disconnect', icon: 'x' })
  }
}

function takeSnapshot() {
  originalForm.value = JSON.stringify(form)
  originalHours.value = serializeWorkingHours()
}

function cancelChanges() {
  // Restore from snapshots
  const origForm = JSON.parse(originalForm.value)
  form.timezone = origForm.timezone
  form.bio = origForm.bio
  parseWorkingHours(originalHours.value)
}

function resetToDefaults() {
  for (let i = 0; i < workingHours.length; i++) {
    workingHours[i].start = '09:00'
    workingHours[i].end = '17:00'
    workingHours[i].enabled = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(workingHours[i].day)
  }
}

// Activity
const activities = ref([])
const activitiesLoading = ref(false)
const showAllActivities = ref(false)
const visibleActivities = computed(() => showAllActivities.value ? activities.value : activities.value.slice(0, 5))

async function loadActivities() {
  if (!settingsDocName.value) return
  activitiesLoading.value = true
  try {
    const versions = await call('frappe.client.get_list', {
      doctype: 'Version',
      filters: { ref_doctype: 'MM User Settings', docname: settingsDocName.value },
      fields: ['name', 'owner', 'creation', 'data'],
      order_by: 'creation desc',
      limit_page_length: 30,
    })
    const parsed = []
    for (const v of versions) {
      let ownerName = v.owner
      try {
        const u = await call('frappe.client.get_value', { doctype: 'User', filters: { name: v.owner }, fieldname: 'full_name' })
        ownerName = u?.full_name || v.owner
      } catch {}
      let changes = []
      let action = 'made changes'
      try {
        const data = JSON.parse(v.data)
        if (data.changed?.length) {
          changes = data.changed.map(c => ({ field: c[0], old: String(c[1] || ''), new: String(c[2] || '') }))
          action = `changed ${changes.length} field${changes.length > 1 ? 's' : ''}`
        }
      } catch {}
      parsed.push({ name: v.name, owner: v.owner, owner_name: ownerName, creation: v.creation, action, changes })
    }
    activities.value = parsed
  } catch (e) { console.error(e) }
  finally { activitiesLoading.value = false }
}

// Load
async function loadSettings() {
  loading.value = true
  error.value = null
  try {
    const list = await call('frappe.client.get_list', {
      doctype: 'MM User Settings',
      filters: { user: auth.user },
      fields: ['name'],
      limit_page_length: 1,
    })

    if (list && list.length > 0) {
      settingsDocName.value = list[0].name
      const doc = await call('frappe.client.get', {
        doctype: 'MM User Settings',
        name: settingsDocName.value,
      })
      form.timezone = doc.timezone || ''
      form.bio = doc.bio || ''
      metadata.creation = doc.creation || ''
      metadata.modified = doc.modified || ''
      metadata.modified_by = doc.modified_by || ''
      parseWorkingHours(doc.working_hours_json)
    } else {
      settingsDocName.value = null
    }
    takeSnapshot()
    loadActivities()
    loadIntegrations()
  } catch (e) {
    error.value = e.message || 'Failed to load settings'
  } finally {
    loading.value = false
  }
}

// Save
async function saveSettings() {
  saving.value = true
  try {
    const values = {
      timezone: form.timezone,
      bio: form.bio,
      working_hours_json: serializeWorkingHours(),
    }

    if (settingsDocName.value) {
      const doc = await call('frappe.client.set_value', {
        doctype: 'MM User Settings',
        name: settingsDocName.value,
        fieldname: values,
      })
      metadata.modified = doc?.modified || new Date().toISOString()
      metadata.modified_by = auth.user
    } else {
      const newDoc = await call('frappe.client.insert', {
        doc: {
          doctype: 'MM User Settings',
          user: auth.user,
          ...values,
        },
      })
      settingsDocName.value = newDoc.name
      metadata.creation = newDoc.creation
      metadata.modified = newDoc.modified
      metadata.modified_by = newDoc.modified_by || auth.user
    }

    takeSnapshot()
    toast({ title: 'Settings saved', icon: 'check' })
    loadActivities()
  } catch (e) {
    toast({ title: e.message || 'Failed to save settings', icon: 'x' })
  } finally {
    saving.value = false
  }
}

// Formatting
function formatDate(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatRelativeDate(dt) {
  if (!dt) return ''
  const now = new Date()
  const d = new Date(dt)
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d ago`
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

onMounted(async () => {
  if (!auth.isInitialized) {
    await auth.initialize()
  }
  await loadSettings()
})
</script>

<style scoped>
.ms-label {
  @apply mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400;
}
.ms-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500;
}
.ms-select {
  @apply flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-gray-500;
}
.ms-dropdown {
  @apply absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700;
}
.ms-dropdown-item {
  @apply flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600;
}
.ms-time-btn {
  @apply flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200;
}
.ms-time-input {
  @apply w-16 rounded border border-gray-300 bg-gray-50 px-2 py-1 text-center text-sm font-mono text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
