<template>
  <div class="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
    <!-- Header -->
    <div class="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-900">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-semibold text-gray-900 dark:text-white">My Availability</h1>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Manage your availability rules and date overrides.</p>
        </div>
        <button
          @click="showCreateModal = true"
          class="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <FeatherIcon name="plus" class="h-3.5 w-3.5" />
          New Rule
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <LoadingSpinner />
    </div>

    <!-- Error -->
    <ErrorState v-else-if="error" :message="error" @retry="loadRules" />

    <!-- Empty State -->
    <div v-else-if="rules.length === 0" class="flex flex-col items-center justify-center py-24">
      <div class="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
        <FeatherIcon name="sliders" class="h-7 w-7 text-gray-400" />
      </div>
      <h3 class="mt-4 text-sm font-semibold text-gray-900 dark:text-white">No availability rules</h3>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Create your first rule to control how meetings are booked.</p>
      <button @click="showCreateModal = true" class="mt-4 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
        <FeatherIcon name="plus" class="h-3.5 w-3.5" />
        Create Rule
      </button>
    </div>

    <!-- Content -->
    <div v-else class="mx-auto grid max-w-[1400px] gap-6 p-6 lg:grid-cols-3">
      <!-- Left column (2/3) -->
      <div class="space-y-4 lg:col-span-2">

        <!-- Availability Rules -->
        <div
          v-for="rule in rules"
          :key="rule.name"
          class="rounded-lg border bg-white shadow-sm dark:bg-gray-900"
          :class="rule.is_active ? 'border-gray-200 dark:border-gray-700' : 'border-gray-200 opacity-70 dark:border-gray-700'"
        >
          <!-- Rule Header -->
          <div class="flex items-center justify-between px-5 py-3">
            <div class="flex items-center gap-2.5">
              <div class="h-2 w-2 rounded-full" :class="rule.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'" />
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ rule.rule_name }}</h3>
              <span v-if="rule.is_default" class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Default</span>
            </div>
            <button
              @click="toggleRule(rule.name)"
              class="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <FeatherIcon :name="expandedRule === rule.name ? 'chevron-up' : 'edit-2'" class="h-3.5 w-3.5" />
            </button>
          </div>

          <!-- Collapsed summary -->
          <div v-if="expandedRule !== rule.name" class="border-t border-gray-100 px-5 py-3 dark:border-gray-700">
            <div class="flex flex-wrap gap-x-6 gap-y-1.5">
              <div class="flex items-center gap-1.5">
                <FeatherIcon name="clock" class="h-3 w-3 text-gray-400" />
                <span class="text-xs text-gray-500 dark:text-gray-400">Buffer: <span class="font-medium text-gray-700 dark:text-gray-300">{{ rule.buffer_time_before || 0 }}min before, {{ rule.buffer_time_after || 0 }}min after</span></span>
              </div>
              <div class="flex items-center gap-1.5">
                <FeatherIcon name="calendar" class="h-3 w-3 text-gray-400" />
                <span class="text-xs text-gray-500 dark:text-gray-400">Max: <span class="font-medium text-gray-700 dark:text-gray-300">{{ rule.max_bookings_per_day || '∞' }}/day, {{ rule.max_bookings_per_week || '∞' }}/week</span></span>
              </div>
              <div class="flex items-center gap-1.5">
                <FeatherIcon name="alert-circle" class="h-3 w-3 text-gray-400" />
                <span class="text-xs text-gray-500 dark:text-gray-400">Notice: <span class="font-medium text-gray-700 dark:text-gray-300">{{ rule.min_notice_hours || 0 }}h min, {{ rule.max_days_advance || 0 }}d max</span></span>
              </div>
              <div v-if="rule._overrides?.length" class="flex items-center gap-1.5">
                <FeatherIcon name="shield" class="h-3 w-3 text-gray-400" />
                <span class="text-xs text-gray-500 dark:text-gray-400"><span class="font-medium text-gray-700 dark:text-gray-300">{{ rule._overrides.length }}</span> override{{ rule._overrides.length > 1 ? 's' : '' }}</span>
              </div>
            </div>
          </div>

          <!-- Expanded edit form -->
          <div v-if="expandedRule === rule.name" class="border-t border-gray-100 dark:border-gray-700">
            <div class="space-y-5 p-5">
              <!-- Name + status -->
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="av-label">Rule Name</label>
                  <input v-model="rule.rule_name" type="text" class="av-input" />
                </div>
                <div class="flex items-end gap-3">
                  <button
                    @click="rule.is_default = !rule.is_default"
                    class="av-toggle-btn"
                    :class="rule.is_default ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400'"
                  >
                    <FeatherIcon name="star" class="h-3 w-3" /> Default
                  </button>
                  <button
                    @click="rule.is_active = !rule.is_active"
                    class="av-toggle-btn"
                    :class="rule.is_active ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400'"
                  >
                    <div class="h-2 w-2 rounded-full" :class="rule.is_active ? 'bg-emerald-500' : 'bg-gray-400'" />
                    {{ rule.is_active ? 'Active' : 'Inactive' }}
                  </button>
                </div>
              </div>

              <!-- Buffers -->
              <div>
                <h4 class="av-section-title">Buffer Times</h4>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="av-label">Before meeting (min)</label>
                    <div class="flex items-center gap-1.5">
                      <button @click="dec(rule, 'buffer_time_before', 5)" class="av-adj-btn"><FeatherIcon name="minus" class="h-3 w-3" /></button>
                      <input v-model.number="rule.buffer_time_before" type="number" min="0" class="av-num-input" />
                      <button @click="inc(rule, 'buffer_time_before', 5)" class="av-adj-btn"><FeatherIcon name="plus" class="h-3 w-3" /></button>
                    </div>
                  </div>
                  <div>
                    <label class="av-label">After meeting (min)</label>
                    <div class="flex items-center gap-1.5">
                      <button @click="dec(rule, 'buffer_time_after', 5)" class="av-adj-btn"><FeatherIcon name="minus" class="h-3 w-3" /></button>
                      <input v-model.number="rule.buffer_time_after" type="number" min="0" class="av-num-input" />
                      <button @click="inc(rule, 'buffer_time_after', 5)" class="av-adj-btn"><FeatherIcon name="plus" class="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Limits -->
              <div>
                <h4 class="av-section-title">Booking Limits</h4>
                <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <label class="av-label">Max / Day</label>
                    <div class="flex items-center gap-1.5">
                      <button @click="dec(rule, 'max_bookings_per_day', 1)" class="av-adj-btn"><FeatherIcon name="minus" class="h-3 w-3" /></button>
                      <input v-model.number="rule.max_bookings_per_day" type="number" min="0" class="av-num-input" />
                      <button @click="inc(rule, 'max_bookings_per_day', 1)" class="av-adj-btn"><FeatherIcon name="plus" class="h-3 w-3" /></button>
                    </div>
                    <p class="mt-0.5 text-[10px] text-gray-400">0 = unlimited</p>
                  </div>
                  <div>
                    <label class="av-label">Max / Week</label>
                    <div class="flex items-center gap-1.5">
                      <button @click="dec(rule, 'max_bookings_per_week', 1)" class="av-adj-btn"><FeatherIcon name="minus" class="h-3 w-3" /></button>
                      <input v-model.number="rule.max_bookings_per_week" type="number" min="0" class="av-num-input" />
                      <button @click="inc(rule, 'max_bookings_per_week', 1)" class="av-adj-btn"><FeatherIcon name="plus" class="h-3 w-3" /></button>
                    </div>
                    <p class="mt-0.5 text-[10px] text-gray-400">0 = unlimited</p>
                  </div>
                  <div>
                    <label class="av-label">Min Notice (hrs)</label>
                    <div class="flex items-center gap-1.5">
                      <button @click="dec(rule, 'min_notice_hours', 1)" class="av-adj-btn"><FeatherIcon name="minus" class="h-3 w-3" /></button>
                      <input v-model.number="rule.min_notice_hours" type="number" min="0" class="av-num-input" />
                      <button @click="inc(rule, 'min_notice_hours', 1)" class="av-adj-btn"><FeatherIcon name="plus" class="h-3 w-3" /></button>
                    </div>
                  </div>
                  <div>
                    <label class="av-label">Max Advance (days)</label>
                    <div class="flex items-center gap-1.5">
                      <button @click="dec(rule, 'max_days_advance', 1)" class="av-adj-btn"><FeatherIcon name="minus" class="h-3 w-3" /></button>
                      <input v-model.number="rule.max_days_advance" type="number" min="0" class="av-num-input" />
                      <button @click="inc(rule, 'max_days_advance', 1)" class="av-adj-btn"><FeatherIcon name="plus" class="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-700">
                <button
                  v-if="!rule.is_default"
                  @click="confirmDeleteRule(rule)"
                  class="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  <FeatherIcon name="trash-2" class="h-3 w-3" /> Delete Rule
                </button>
                <span v-else class="text-[10px] italic text-gray-400 dark:text-gray-500">Default rule cannot be deleted</span>
                <div class="flex items-center gap-2">
                  <button @click="expandedRule = null" class="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
                  <button @click="saveRule(rule)" :disabled="savingRule === rule.name" class="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    <FeatherIcon v-if="savingRule === rule.name" name="loader" class="h-3 w-3 animate-spin" />
                    {{ savingRule === rule.name ? 'Saving...' : 'Save Rule' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Date Overrides Section (separate from rules) -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <div>
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Date Overrides</h2>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Block or open specific dates across your availability rules.</p>
            </div>
            <button @click="resetOverrideForm(); showAddOverrideModal = true" class="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-blue-700">
              <FeatherIcon name="plus" class="h-3 w-3" /> Add Override
            </button>
          </div>

          <!-- Filter tabs -->
          <div v-if="allOverrides.length > 0" class="flex items-center gap-2 border-b border-gray-100 px-5 py-2 dark:border-gray-700">
            <button
              v-for="f in overrideFilters" :key="f.value"
              @click="overrideFilter = f.value"
              class="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
              :class="overrideFilter === f.value
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'"
            >
              {{ f.label }} ({{ f.count }})
            </button>
          </div>

          <!-- Override list -->
          <div v-if="filteredOverrides.length === 0" class="py-10 text-center">
            <FeatherIcon name="calendar" class="mx-auto h-6 w-6 text-gray-300 dark:text-gray-600" />
            <p class="mt-2 text-xs text-gray-400 dark:text-gray-500">
              {{ allOverrides.length === 0 ? 'No date overrides configured' : 'No overrides match this filter' }}
            </p>
          </div>

          <div v-else class="divide-y divide-gray-100 dark:divide-gray-700">
            <div
              v-for="ov in paginatedOverrides"
              :key="ov._key"
              class="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              :class="ov._isPast ? 'opacity-50' : ''"
            >
              <!-- Date -->
              <div class="w-24 shrink-0">
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ formatOverrideDate(ov.date) }}</span>
                <span v-if="ov._isPast" class="ml-1 text-[9px] text-gray-400">(past)</span>
              </div>

              <!-- Status badge -->
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                :class="ov.available
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'"
              >
                {{ ov.available ? 'Available' : 'Unavailable' }}
              </span>

              <!-- Custom hours -->
              <span v-if="ov.available && ov.custom_hours_start" class="text-xs text-gray-500 dark:text-gray-400">
                {{ ov.custom_hours_start }} – {{ ov.custom_hours_end }}
              </span>

              <!-- Reason -->
              <span v-if="ov.reason" class="min-w-0 flex-1 truncate text-xs text-gray-500 dark:text-gray-400">{{ ov.reason }}</span>
              <span v-else class="flex-1" />

              <!-- Rule badge -->
              <span class="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">{{ ov._ruleName }}</span>

              <!-- Actions -->
              <button @click="editOverride(ov)" class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300">
                <FeatherIcon name="edit-2" class="h-3 w-3" />
              </button>
              <button @click="confirmDeleteOverride(ov)" class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400">
                <FeatherIcon name="x" class="h-3 w-3" />
              </button>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="filteredOverrides.length > overridesPerPage" class="flex items-center justify-between border-t border-gray-100 px-5 py-2.5 dark:border-gray-700">
            <span class="text-xs text-gray-500 dark:text-gray-400">
              Showing {{ overridePageStart + 1 }}–{{ Math.min(overridePageStart + overridesPerPage, filteredOverrides.length) }} of {{ filteredOverrides.length }}
            </span>
            <div class="flex items-center gap-1">
              <button @click="overridePage = Math.max(1, overridePage - 1)" :disabled="overridePage === 1" class="rounded-md border border-gray-300 p-1 text-gray-500 disabled:opacity-40 dark:border-gray-600 dark:text-gray-400">
                <FeatherIcon name="chevron-left" class="h-3.5 w-3.5" />
              </button>
              <button @click="overridePage = Math.min(overrideTotalPages, overridePage + 1)" :disabled="overridePage >= overrideTotalPages" class="rounded-md border border-gray-300 p-1 text-gray-500 disabled:opacity-40 dark:border-gray-600 dark:text-gray-400">
                <FeatherIcon name="chevron-right" class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right column (1/3) -->
      <div class="space-y-6">
        <!-- Summary -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Summary</h2>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-gray-700">
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Total rules</span>
              <span class="text-xs font-medium text-gray-900 dark:text-white">{{ rules.length }}</span>
            </div>
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Active rules</span>
              <span class="text-xs font-medium text-emerald-600 dark:text-emerald-400">{{ rules.filter(r => r.is_active).length }}</span>
            </div>
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Default rule</span>
              <span class="text-xs font-medium text-gray-900 dark:text-white">{{ defaultRuleName }}</span>
            </div>
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Upcoming overrides</span>
              <span class="text-xs font-medium text-gray-900 dark:text-white">{{ upcomingOverrideCount }}</span>
            </div>
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Past overrides</span>
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ pastOverrideCount }}</span>
            </div>
          </div>
        </div>

        <!-- How It Works -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">How It Works</h2>
          </div>
          <div class="space-y-3 p-5">
            <div class="av-guide-card">
              <div class="flex items-center gap-2">
                <div class="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">1</div>
                <p class="text-xs font-medium text-gray-700 dark:text-gray-300">Availability Rules</p>
              </div>
              <p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Rules define your general booking preferences — buffer times, daily/weekly limits, and advance scheduling windows. The <strong>default rule</strong> applies to all meeting types unless overridden.</p>
            </div>
            <div class="av-guide-card">
              <div class="flex items-center gap-2">
                <div class="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">2</div>
                <p class="text-xs font-medium text-gray-700 dark:text-gray-300">Buffer Times</p>
              </div>
              <p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Adds padding before and after each meeting. A 15-min buffer on a 1-hour meeting blocks 1h 30m total. This prevents back-to-back meetings and gives you transition time.</p>
            </div>
            <div class="av-guide-card">
              <div class="flex items-center gap-2">
                <div class="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">3</div>
                <p class="text-xs font-medium text-gray-700 dark:text-gray-300">Booking Limits</p>
              </div>
              <p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Set maximum bookings per day and per week. Set 0 for unlimited. When the limit is reached, no more slots will be shown to bookers for that period.</p>
            </div>
            <div class="av-guide-card">
              <div class="flex items-center gap-2">
                <div class="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">4</div>
                <p class="text-xs font-medium text-gray-700 dark:text-gray-300">Notice &amp; Advance Windows</p>
              </div>
              <p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400"><strong>Min notice</strong> prevents last-minute bookings (e.g., 2h means nobody can book less than 2 hours before). <strong>Max advance</strong> limits how far ahead people can book (e.g., 30 days means no bookings more than a month out).</p>
            </div>
            <div class="av-guide-card">
              <div class="flex items-center gap-2">
                <div class="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">5</div>
                <p class="text-xs font-medium text-gray-700 dark:text-gray-300">Date Overrides</p>
              </div>
              <p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Override availability for specific dates. Date overrides have <strong>full priority</strong> over regular working hours. Use them to:</p>
              <ul class="mt-1 space-y-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                <li class="flex items-start gap-1.5">
                  <span class="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-red-400" />
                  Block holidays, vacations, or personal days
                </li>
                <li class="flex items-start gap-1.5">
                  <span class="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                  Open extra hours on specific dates (with custom start/end times)
                </li>
                <li class="flex items-start gap-1.5">
                  <span class="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-gray-400" />
                  Past overrides are kept for records but don't affect future bookings
                </li>
              </ul>
            </div>
            <div class="av-guide-card">
              <div class="flex items-center gap-2">
                <div class="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">6</div>
                <p class="text-xs font-medium text-gray-700 dark:text-gray-300">Priority Order</p>
              </div>
              <p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">When checking if a slot is available, the system checks in this order:</p>
              <ol class="mt-1 space-y-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                <li>1. Date overrides (highest priority)</li>
                <li>2. Blocked slots</li>
                <li>3. Working hours</li>
                <li>4. Existing booking conflicts</li>
                <li>5. Calendar event conflicts</li>
                <li>6. Buffer time conflicts</li>
                <li>7. Availability rule limits</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Rule Modal -->
    <transition name="modal">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showCreateModal = false">
        <div class="mx-4 w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Create Availability Rule</h2>
            <button @click="showCreateModal = false" class="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
              <FeatherIcon name="x" class="h-4 w-4" />
            </button>
          </div>
          <div class="space-y-4 p-5">
            <div>
              <label class="av-label">Rule Name <span class="text-red-500">*</span></label>
              <input v-model="newRule.rule_name" type="text" placeholder="e.g., Standard Hours" class="av-input" />
            </div>
            <div class="flex gap-3">
              <button @click="newRule.is_default = !newRule.is_default" class="av-toggle-btn" :class="newRule.is_default ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-gray-300 bg-white text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400'">
                <FeatherIcon name="star" class="h-3 w-3" /> Default Rule
              </button>
              <button @click="newRule.is_active = !newRule.is_active" class="av-toggle-btn" :class="newRule.is_active ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'border-gray-300 bg-white text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400'">
                <div class="h-2 w-2 rounded-full" :class="newRule.is_active ? 'bg-emerald-500' : 'bg-gray-400'" />
                {{ newRule.is_active ? 'Active' : 'Inactive' }}
              </button>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="av-label">Buffer Before (min)</label>
                <div class="flex items-center gap-1.5">
                  <button @click="decNew('buffer_time_before', 5)" class="av-adj-btn"><FeatherIcon name="minus" class="h-3 w-3" /></button>
                  <input v-model.number="newRule.buffer_time_before" type="number" min="0" class="av-num-input" />
                  <button @click="incNew('buffer_time_before', 5)" class="av-adj-btn"><FeatherIcon name="plus" class="h-3 w-3" /></button>
                </div>
              </div>
              <div>
                <label class="av-label">Buffer After (min)</label>
                <div class="flex items-center gap-1.5">
                  <button @click="decNew('buffer_time_after', 5)" class="av-adj-btn"><FeatherIcon name="minus" class="h-3 w-3" /></button>
                  <input v-model.number="newRule.buffer_time_after" type="number" min="0" class="av-num-input" />
                  <button @click="incNew('buffer_time_after', 5)" class="av-adj-btn"><FeatherIcon name="plus" class="h-3 w-3" /></button>
                </div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="av-label">Max / Day <span class="text-[10px] text-gray-400">(0 = ∞)</span></label>
                <div class="flex items-center gap-1.5">
                  <button @click="decNew('max_bookings_per_day', 1)" class="av-adj-btn"><FeatherIcon name="minus" class="h-3 w-3" /></button>
                  <input v-model.number="newRule.max_bookings_per_day" type="number" min="0" class="av-num-input" />
                  <button @click="incNew('max_bookings_per_day', 1)" class="av-adj-btn"><FeatherIcon name="plus" class="h-3 w-3" /></button>
                </div>
              </div>
              <div>
                <label class="av-label">Max / Week <span class="text-[10px] text-gray-400">(0 = ∞)</span></label>
                <div class="flex items-center gap-1.5">
                  <button @click="decNew('max_bookings_per_week', 1)" class="av-adj-btn"><FeatherIcon name="minus" class="h-3 w-3" /></button>
                  <input v-model.number="newRule.max_bookings_per_week" type="number" min="0" class="av-num-input" />
                  <button @click="incNew('max_bookings_per_week', 1)" class="av-adj-btn"><FeatherIcon name="plus" class="h-3 w-3" /></button>
                </div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="av-label">Min Notice (hrs)</label>
                <div class="flex items-center gap-1.5">
                  <button @click="decNew('min_notice_hours', 1)" class="av-adj-btn"><FeatherIcon name="minus" class="h-3 w-3" /></button>
                  <input v-model.number="newRule.min_notice_hours" type="number" min="0" class="av-num-input" />
                  <button @click="incNew('min_notice_hours', 1)" class="av-adj-btn"><FeatherIcon name="plus" class="h-3 w-3" /></button>
                </div>
              </div>
              <div>
                <label class="av-label">Max Advance (days)</label>
                <div class="flex items-center gap-1.5">
                  <button @click="decNew('max_days_advance', 1)" class="av-adj-btn"><FeatherIcon name="minus" class="h-3 w-3" /></button>
                  <input v-model.number="newRule.max_days_advance" type="number" min="0" class="av-num-input" />
                  <button @click="incNew('max_days_advance', 1)" class="av-adj-btn"><FeatherIcon name="plus" class="h-3 w-3" /></button>
                </div>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-gray-700">
            <button @click="showCreateModal = false" class="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
            <button @click="createRule" :disabled="!newRule.rule_name || creatingRule" class="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              <FeatherIcon v-if="creatingRule" name="loader" class="h-3 w-3 animate-spin" />
              {{ creatingRule ? 'Creating...' : 'Create Rule' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Add/Edit Override Modal -->
    <transition name="modal">
      <div v-if="showAddOverrideModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showAddOverrideModal = false">
        <div class="mx-4 w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">{{ overrideForm._editing ? 'Edit' : 'Add' }} Date Override</h2>
            <button @click="showAddOverrideModal = false" class="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
              <FeatherIcon name="x" class="h-4 w-4" />
            </button>
          </div>
          <div class="space-y-4 p-5">
            <!-- Rule selector (custom dropdown) -->
            <div>
              <label class="av-label">Availability Rule <span class="text-red-500">*</span></label>
              <div class="relative" ref="ruleDropdownRef">
                <button
                  type="button"
                  @click="!overrideForm._editing && (ruleDropdownOpen = !ruleDropdownOpen)"
                  class="av-select"
                  :class="overrideForm._editing ? 'opacity-60 cursor-not-allowed' : ''"
                >
                  <span :class="overrideForm.ruleName ? '' : 'text-gray-400 dark:text-gray-500'">
                    {{ overrideForm.ruleName ? getRuleName(overrideForm.ruleName) : 'Select rule...' }}
                  </span>
                  <FeatherIcon name="chevron-down" class="h-4 w-4 shrink-0 text-gray-400 transition-transform" :class="ruleDropdownOpen ? 'rotate-180' : ''" />
                </button>
                <div v-if="ruleDropdownOpen" class="av-dropdown">
                  <button
                    v-for="r in rules" :key="r.name"
                    @click="overrideForm.ruleName = r.name; ruleDropdownOpen = false"
                    class="av-dropdown-item"
                    :class="overrideForm.ruleName === r.name ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''"
                  >
                    <span>{{ r.rule_name }}</span>
                    <span v-if="r.is_default" class="ml-auto rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">Default</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Date picker (custom calendar) -->
            <div>
              <label class="av-label">Date <span class="text-red-500">*</span></label>
              <DatePicker
                v-model="overrideForm.date"
                :minDate="overrideForm._editing ? '' : todayStr"
                placeholder="Select date..."
              />
              <p v-if="overrideForm.date && isDatePast(overrideForm.date) && !overrideForm._editing" class="mt-1 text-[11px] text-red-500">Past dates are not allowed for new overrides.</p>
            </div>

            <!-- Available toggle -->
            <div>
              <label class="av-label">Availability</label>
              <div class="flex gap-2">
                <button
                  @click="overrideForm.available = false"
                  class="flex-1 rounded-lg border-2 px-3 py-2.5 text-center text-xs font-medium transition-colors"
                  :class="!overrideForm.available
                    ? 'border-red-500 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-900/20 dark:text-red-400'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400'"
                >
                  <FeatherIcon name="x-circle" class="mx-auto mb-1 h-5 w-5" />
                  Unavailable
                  <p class="mt-0.5 text-[10px] font-normal opacity-70">Block this day entirely</p>
                </button>
                <button
                  @click="overrideForm.available = true"
                  class="flex-1 rounded-lg border-2 px-3 py-2.5 text-center text-xs font-medium transition-colors"
                  :class="overrideForm.available
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400'"
                >
                  <FeatherIcon name="check-circle" class="mx-auto mb-1 h-5 w-5" />
                  Available
                  <p class="mt-0.5 text-[10px] font-normal opacity-70">Open with custom hours</p>
                </button>
              </div>
            </div>

            <!-- Custom hours (when available) -->
            <div v-if="overrideForm.available" class="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-800 dark:bg-emerald-900/10">
              <label class="av-label">Custom Hours <span class="text-red-500">*</span></label>
              <div class="flex items-center gap-2">
                <div class="flex items-center gap-1.5">
                  <button @click="adjustOverrideTime('custom_hours_start', -15)" class="av-adj-btn"><FeatherIcon name="minus" class="h-3 w-3" /></button>
                  <input
                    :value="overrideForm.custom_hours_start"
                    @change="onCustomTimeInput('custom_hours_start', $event.target.value)"
                    type="text" placeholder="09:00"
                    class="av-num-input w-20"
                  />
                  <button @click="adjustOverrideTime('custom_hours_start', 15)" class="av-adj-btn"><FeatherIcon name="plus" class="h-3 w-3" /></button>
                </div>
                <span class="text-xs text-gray-400">to</span>
                <div class="flex items-center gap-1.5">
                  <button @click="adjustOverrideTime('custom_hours_end', -15)" class="av-adj-btn"><FeatherIcon name="minus" class="h-3 w-3" /></button>
                  <input
                    :value="overrideForm.custom_hours_end"
                    @change="onCustomTimeInput('custom_hours_end', $event.target.value)"
                    type="text" placeholder="17:00"
                    class="av-num-input w-20"
                  />
                  <button @click="adjustOverrideTime('custom_hours_end', 15)" class="av-adj-btn"><FeatherIcon name="plus" class="h-3 w-3" /></button>
                </div>
              </div>
              <p v-if="customHoursError" class="mt-1.5 text-[11px] text-red-500">{{ customHoursError }}</p>
              <p v-else-if="overrideForm.custom_hours_start && overrideForm.custom_hours_end" class="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                Duration: {{ getCustomHoursDuration() }}
              </p>
            </div>

            <!-- Reason -->
            <div>
              <label class="av-label">Reason <span class="text-red-500">*</span></label>
              <input v-model="overrideForm.reason" type="text" placeholder="e.g., Holiday, Conference, Personal day" class="av-input" />
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-gray-700">
            <button @click="showAddOverrideModal = false" class="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
            <button @click="saveOverride" :disabled="!overrideForm.ruleName || !overrideForm.date || !overrideForm.reason || savingOverride || (overrideForm.date && isDatePast(overrideForm.date) && !overrideForm._editing) || (overrideForm.available && !!customHoursError)" class="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              <FeatherIcon v-if="savingOverride" name="loader" class="h-3 w-3 animate-spin" />
              {{ savingOverride ? 'Saving...' : (overrideForm._editing ? 'Update' : 'Add Override') }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Delete Confirmation -->
    <ConfirmModal
      :show="deleteConfirm.show"
      :title="deleteConfirm.title"
      :message="deleteConfirm.message"
      :confirmLabel="'Delete'"
      :loading="deleteConfirm.loading"
      variant="danger"
      @confirm="executeDelete"
      @cancel="deleteConfirm.show = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { call, toast } from 'frappe-ui'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorState from '@/components/shared/ErrorState.vue'
import ConfirmModal from '@/components/shared/ConfirmModal.vue'
import DatePicker from '@/components/shared/DatePicker.vue'

const auth = useAuthStore()

const loading = ref(true)
const error = ref(null)
const rules = reactive([])
const expandedRule = ref(null)
const showCreateModal = ref(false)
const creatingRule = ref(false)
const savingRule = ref(null)
const showAddOverrideModal = ref(false)
const savingOverride = ref(false)

// Today string for date min
const todayStr = new Date().toISOString().split('T')[0]

function isDatePast(dateStr) {
  if (!dateStr) return false
  return dateStr < todayStr
}

// Rule dropdown for override modal
const ruleDropdownOpen = ref(false)
const ruleDropdownRef = ref(null)

function getRuleName(docName) {
  const r = rules.find(r => r.name === docName)
  return r ? r.rule_name : docName
}

// Delete state
const deleteConfirm = reactive({ show: false, title: '', message: '', loading: false, type: '', payload: null })

// Override filter/pagination
const overrideFilter = ref('all')
const overridePage = ref(1)
const overridesPerPage = 10

// New rule form
const newRule = reactive({
  rule_name: '', is_default: false, is_active: true,
  buffer_time_before: 0, buffer_time_after: 0,
  max_bookings_per_day: 0, max_bookings_per_week: 0,
  min_notice_hours: 0, max_days_advance: 30,
})

// Override form
const overrideForm = reactive({
  ruleName: '', date: '', available: false, reason: '',
  custom_hours_start: '09:00', custom_hours_end: '17:00',
  _editing: false, _ruleIndex: -1, _overrideIndex: -1,
})

function resetOverrideForm() {
  Object.assign(overrideForm, {
    ruleName: rules.length === 1 ? rules[0].name : '',
    date: '', available: false, reason: '',
    custom_hours_start: '09:00', custom_hours_end: '17:00',
    _editing: false, _ruleIndex: -1, _overrideIndex: -1,
  })
}

// Computed: all overrides across all rules (flattened)
const allOverrides = computed(() => {
  const result = []
  for (const rule of rules) {
    if (!rule._overrides) continue
    for (let i = 0; i < rule._overrides.length; i++) {
      const ov = rule._overrides[i]
      result.push({
        ...ov,
        _ruleName: rule.rule_name,
        _ruleDocName: rule.name,
        _ruleIndex: rules.indexOf(rule),
        _overrideIndex: i,
        _isPast: ov.date ? ov.date < todayStr : false,
        _key: `${rule.name}-${i}`,
      })
    }
  }
  return result.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
})

const overrideFilters = computed(() => [
  { label: 'All', value: 'all', count: allOverrides.value.length },
  { label: 'Upcoming', value: 'upcoming', count: allOverrides.value.filter(o => !o._isPast).length },
  { label: 'Past', value: 'past', count: allOverrides.value.filter(o => o._isPast).length },
  { label: 'Unavailable', value: 'unavailable', count: allOverrides.value.filter(o => !o.available).length },
  { label: 'Available', value: 'available', count: allOverrides.value.filter(o => o.available).length },
])

const filteredOverrides = computed(() => {
  let list = allOverrides.value
  if (overrideFilter.value === 'upcoming') list = list.filter(o => !o._isPast)
  else if (overrideFilter.value === 'past') list = list.filter(o => o._isPast)
  else if (overrideFilter.value === 'unavailable') list = list.filter(o => !o.available)
  else if (overrideFilter.value === 'available') list = list.filter(o => o.available)
  return list
})

const overridePageStart = computed(() => (overridePage.value - 1) * overridesPerPage)
const overrideTotalPages = computed(() => Math.ceil(filteredOverrides.value.length / overridesPerPage))
const paginatedOverrides = computed(() => filteredOverrides.value.slice(overridePageStart.value, overridePageStart.value + overridesPerPage))

const defaultRuleName = computed(() => { const d = rules.find(r => r.is_default); return d ? d.rule_name : '—' })
const upcomingOverrideCount = computed(() => allOverrides.value.filter(o => !o._isPast).length)
const pastOverrideCount = computed(() => allOverrides.value.filter(o => o._isPast).length)

// Helpers
function inc(rule, field, step) { rule[field] = (rule[field] || 0) + step }
function dec(rule, field, step) { rule[field] = Math.max(0, (rule[field] || 0) - step) }
function incNew(field, step) { newRule[field] = (newRule[field] || 0) + step }
function decNew(field, step) { newRule[field] = Math.max(0, (newRule[field] || 0) - step) }

function adjustOverrideTime(field, delta) {
  const current = overrideForm[field] || '09:00'
  const [h, m] = current.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) { overrideForm[field] = '09:00'; return }
  let totalMins = h * 60 + m + delta
  if (totalMins < 0) totalMins = 0
  if (totalMins > 23 * 60 + 45) totalMins = 23 * 60 + 45
  overrideForm[field] = `${String(Math.floor(totalMins / 60)).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`
}

function onCustomTimeInput(field, value) {
  // Validate HH:MM format
  if (/^\d{1,2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(':').map(Number)
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      overrideForm[field] = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      return
    }
  }
  // If invalid, revert to last good value or default
  toast({ title: 'Invalid time format. Use HH:MM (e.g., 09:00)', icon: 'x' })
}

const customHoursError = computed(() => {
  if (!overrideForm.available) return ''
  const s = overrideForm.custom_hours_start
  const e = overrideForm.custom_hours_end
  if (!s || !e) return ''
  if (!/^\d{2}:\d{2}$/.test(s)) return 'Invalid start time format'
  if (!/^\d{2}:\d{2}$/.test(e)) return 'Invalid end time format'
  const [sh, sm] = s.split(':').map(Number)
  const [eh, em] = e.split(':').map(Number)
  if (sh > 23 || sm > 59) return 'Start time is invalid'
  if (eh > 23 || em > 59) return 'End time is invalid'
  if (eh * 60 + em <= sh * 60 + sm) return 'End time must be after start time'
  return ''
})

function getCustomHoursDuration() {
  const [sh, sm] = (overrideForm.custom_hours_start || '09:00').split(':').map(Number)
  const [eh, em] = (overrideForm.custom_hours_end || '17:00').split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return '—'
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  return remMins === 0 ? `${hours}h` : `${hours}h ${remMins}m`
}

function toggleRule(name) {
  expandedRule.value = expandedRule.value === name ? null : name
}

function resetNewRule() {
  Object.assign(newRule, {
    rule_name: '', is_default: false, is_active: true,
    buffer_time_before: 0, buffer_time_after: 0,
    max_bookings_per_day: 0, max_bookings_per_week: 0,
    min_notice_hours: 0, max_days_advance: 30,
  })
}

function formatOverrideDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Override CRUD
function editOverride(ov) {
  Object.assign(overrideForm, {
    ruleName: ov._ruleDocName,
    date: ov.date,
    available: !!ov.available,
    reason: ov.reason || '',
    custom_hours_start: ov.custom_hours_start || '09:00',
    custom_hours_end: ov.custom_hours_end || '17:00',
    _editing: true,
    _ruleIndex: ov._ruleIndex,
    _overrideIndex: ov._overrideIndex,
  })
  showAddOverrideModal.value = true
}

async function saveOverride() {
  if (!overrideForm.ruleName || !overrideForm.date) return
  if (!overrideForm._editing && isDatePast(overrideForm.date)) {
    toast({ title: 'Cannot add override for a past date', icon: 'x' })
    return
  }
  if (overrideForm.available && (!overrideForm.custom_hours_start || !overrideForm.custom_hours_end)) {
    toast({ title: 'Custom hours are required when marking as available', icon: 'x' })
    return
  }
  if (overrideForm.available && customHoursError.value) {
    toast({ title: customHoursError.value, icon: 'x' })
    return
  }

  savingOverride.value = true
  try {
    const rule = rules.find(r => r.name === overrideForm.ruleName)
    if (!rule) throw new Error('Rule not found')

    if (overrideForm._editing) {
      // Update existing override
      rule._overrides[overrideForm._overrideIndex] = {
        ...rule._overrides[overrideForm._overrideIndex],
        date: overrideForm.date,
        available: overrideForm.available,
        reason: overrideForm.reason,
        custom_hours_start: overrideForm.available ? overrideForm.custom_hours_start : null,
        custom_hours_end: overrideForm.available ? overrideForm.custom_hours_end : null,
      }
    } else {
      // Add new override
      if (!rule._overrides) rule._overrides = []
      rule._overrides.push({
        date: overrideForm.date,
        available: overrideForm.available,
        reason: overrideForm.reason,
        custom_hours_start: overrideForm.available ? overrideForm.custom_hours_start : null,
        custom_hours_end: overrideForm.available ? overrideForm.custom_hours_end : null,
      })
    }

    // Save to backend — each child row needs doctype for Frappe to persist it
    const doc = await call('frappe.client.get', { doctype: 'MM User Availability Rule', name: rule.name })
    doc.date_overrides = rule._overrides.map(o => ({
      doctype: 'MM User Date Overrides',
      ...(o.name ? { name: o.name } : {}),
      date: o.date,
      available: o.available ? 1 : 0,
      reason: o.reason || 'Date override',
      custom_hours_start: o.custom_hours_start || null,
      custom_hours_end: o.custom_hours_end || null,
    }))
    await call('frappe.client.save', { doc })

    showAddOverrideModal.value = false
    toast({ title: overrideForm._editing ? 'Override updated' : 'Override added', icon: 'check' })
    await loadRules()
  } catch (e) {
    toast({ title: e.message || 'Failed to save override', icon: 'x' })
  } finally {
    savingOverride.value = false
  }
}

function confirmDeleteRule(rule) {
  deleteConfirm.title = 'Delete Rule'
  deleteConfirm.message = `Are you sure you want to delete "${rule.rule_name}"? This will also remove all its date overrides.`
  deleteConfirm.type = 'rule'
  deleteConfirm.payload = rule.name
  deleteConfirm.loading = false
  deleteConfirm.show = true
}

function confirmDeleteOverride(ov) {
  deleteConfirm.title = 'Remove Date Override'
  deleteConfirm.message = `Remove the override for ${formatOverrideDate(ov.date)}${ov.reason ? ` (${ov.reason})` : ''} from "${ov._ruleName}"?`
  deleteConfirm.type = 'override'
  deleteConfirm.payload = ov
  deleteConfirm.loading = false
  deleteConfirm.show = true
}

async function executeDelete() {
  deleteConfirm.loading = true
  try {
    if (deleteConfirm.type === 'rule') {
      await call('frappe.client.delete', { doctype: 'MM User Availability Rule', name: deleteConfirm.payload })
      const idx = rules.findIndex(r => r.name === deleteConfirm.payload)
      if (idx >= 0) rules.splice(idx, 1)
      if (expandedRule.value === deleteConfirm.payload) expandedRule.value = null
      toast({ title: 'Rule deleted', icon: 'check' })
    } else if (deleteConfirm.type === 'override') {
      const ov = deleteConfirm.payload
      const rule = rules[ov._ruleIndex]
      if (rule && rule._overrides) {
        rule._overrides.splice(ov._overrideIndex, 1)
        const doc = await call('frappe.client.get', { doctype: 'MM User Availability Rule', name: rule.name })
        doc.date_overrides = rule._overrides.map(o => ({
          doctype: 'MM User Date Overrides',
          ...(o.name ? { name: o.name } : {}),
          date: o.date, available: o.available ? 1 : 0, reason: o.reason || 'Date override',
          custom_hours_start: o.custom_hours_start || null, custom_hours_end: o.custom_hours_end || null,
        }))
        await call('frappe.client.save', { doc })
        toast({ title: 'Override removed', icon: 'check' })
      }
    }
  } catch (e) {
    toast({ title: e.message || 'Failed to delete', icon: 'x' })
  } finally {
    deleteConfirm.loading = false
    deleteConfirm.show = false
  }
}

// Load
async function loadRules() {
  loading.value = true
  error.value = null
  try {
    const list = await call('frappe.client.get_list', {
      doctype: 'MM User Availability Rule',
      filters: { user: auth.user },
      fields: [
        'name', 'rule_name', 'is_default', 'is_active',
        'buffer_time_before', 'buffer_time_after',
        'max_bookings_per_day', 'max_bookings_per_week',
        'min_notice_hours', 'max_days_advance',
      ],
      order_by: 'is_default desc, rule_name asc',
      limit_page_length: 50,
    })

    rules.length = 0
    for (const rule of list) {
      let overrides = []
      try {
        // Fetch full document to get child table (direct get_list on child tables is not allowed)
        const fullDoc = await call('frappe.client.get', {
          doctype: 'MM User Availability Rule',
          name: rule.name,
        })
        overrides = (fullDoc.date_overrides || [])
      } catch { overrides = [] }

      rules.push({
        ...rule,
        _overrides: overrides.map(o => ({
          name: o.name, date: o.date, available: !!o.available,
          reason: o.reason || '',
          custom_hours_start: o.custom_hours_start || null,
          custom_hours_end: o.custom_hours_end || null,
        })),
      })
    }
  } catch (e) {
    error.value = e.message || 'Failed to load rules'
  } finally {
    loading.value = false
  }
}

async function createRule() {
  if (!newRule.rule_name) return
  creatingRule.value = true
  try {
    await call('frappe.client.insert', {
      doc: {
        doctype: 'MM User Availability Rule', user: auth.user,
        rule_name: newRule.rule_name,
        is_default: newRule.is_default ? 1 : 0, is_active: newRule.is_active ? 1 : 0,
        buffer_time_before: newRule.buffer_time_before, buffer_time_after: newRule.buffer_time_after,
        max_bookings_per_day: newRule.max_bookings_per_day, max_bookings_per_week: newRule.max_bookings_per_week,
        min_notice_hours: newRule.min_notice_hours, max_days_advance: newRule.max_days_advance,
      },
    })
    resetNewRule()
    showCreateModal.value = false
    toast({ title: 'Rule created', icon: 'check' })
    await loadRules()
  } catch (e) {
    toast({ title: e.message || 'Failed to create rule', icon: 'x' })
  } finally {
    creatingRule.value = false
  }
}

async function saveRule(rule) {
  savingRule.value = rule.name
  try {
    await call('frappe.client.set_value', {
      doctype: 'MM User Availability Rule', name: rule.name,
      fieldname: {
        rule_name: rule.rule_name,
        is_default: rule.is_default ? 1 : 0, is_active: rule.is_active ? 1 : 0,
        buffer_time_before: rule.buffer_time_before, buffer_time_after: rule.buffer_time_after,
        max_bookings_per_day: rule.max_bookings_per_day, max_bookings_per_week: rule.max_bookings_per_week,
        min_notice_hours: rule.min_notice_hours, max_days_advance: rule.max_days_advance,
      },
    })
    expandedRule.value = null
    toast({ title: 'Rule saved', icon: 'check' })
    await loadRules()
  } catch (e) {
    toast({ title: e.message || 'Failed to save rule', icon: 'x' })
  } finally {
    savingRule.value = null
  }
}

// Click outside for rule dropdown
function onDocClick(e) {
  if (ruleDropdownRef.value && !ruleDropdownRef.value.contains(e.target)) {
    ruleDropdownOpen.value = false
  }
}

onMounted(async () => {
  document.addEventListener('click', onDocClick)
  if (!auth.isInitialized) await auth.initialize()
  await loadRules()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
})
</script>

<style scoped>
.av-label {
  @apply mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400;
}
.av-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500;
}
.av-num-input {
  @apply w-16 rounded border border-gray-300 bg-gray-50 px-2 py-1 text-center text-sm font-mono text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white;
}
.av-adj-btn {
  @apply flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200;
}
.av-toggle-btn {
  @apply flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors;
}
.av-section-title {
  @apply mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400;
}
.av-guide-card {
  @apply rounded-md bg-gray-50 px-3 py-2.5 dark:bg-gray-700/50;
}
.av-select {
  @apply flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-gray-500;
}
.av-dropdown {
  @apply absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-700;
}
.av-dropdown-item {
  @apply flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600;
}
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
</style>
