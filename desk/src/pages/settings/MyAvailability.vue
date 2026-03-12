<template>
  <AppLayout>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
      <!-- Loading -->
      <LoadingSpinner v-if="loading" fullPage />

      <!-- Error -->
      <ErrorState
        v-else-if="error"
        :message="error"
        @retry="loadRules"
      />

      <!-- Content -->
      <div v-else class="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <!-- Header -->
        <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">My Availability</h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage your availability rules and date overrides.
            </p>
          </div>
          <button
            @click="showCreateForm = !showCreateForm"
            class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
          >
            <FeatherIcon :name="showCreateForm ? 'x' : 'plus'" class="h-4 w-4" />
            {{ showCreateForm ? 'Cancel' : 'New Rule' }}
          </button>
        </div>

        <!-- Create New Rule Form -->
        <div
          v-if="showCreateForm"
          class="mb-6 rounded-lg border border-blue-200 bg-blue-50/50 shadow-sm dark:border-blue-800 dark:bg-blue-950/30"
        >
          <div class="border-b border-blue-200 px-5 py-4 dark:border-blue-800">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">Create Availability Rule</h2>
          </div>
          <div class="space-y-4 p-5">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Rule Name *</label>
                <input
                  v-model="newRule.rule_name"
                  type="text"
                  placeholder="e.g., Standard Hours"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div class="flex items-end gap-6">
                <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input v-model="newRule.is_default" type="checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800" />
                  Default Rule
                </label>
                <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input v-model="newRule.is_active" type="checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800" />
                  Active
                </label>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Buffer Before (min)</label>
                <input v-model.number="newRule.buffer_time_before" type="number" min="0" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Buffer After (min)</label>
                <input v-model.number="newRule.buffer_time_after" type="number" min="0" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Max/Day</label>
                <input v-model.number="newRule.max_bookings_per_day" type="number" min="0" placeholder="0 = unlimited" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Max/Week</label>
                <input v-model.number="newRule.max_bookings_per_week" type="number" min="0" placeholder="0 = unlimited" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Min Notice (hrs)</label>
                <input v-model.number="newRule.min_notice_hours" type="number" min="0" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Max Advance (days)</label>
                <input v-model.number="newRule.max_days_advance" type="number" min="0" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
              </div>
            </div>

            <div class="flex justify-end">
              <button
                @click="createRule"
                :disabled="!newRule.rule_name || creatingRule"
                class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FeatherIcon v-if="creatingRule" name="loader" class="h-4 w-4 animate-spin" />
                {{ creatingRule ? 'Creating...' : 'Create Rule' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Rules List -->
        <div v-if="rules.length === 0 && !showCreateForm">
          <EmptyState
            icon="sliders"
            title="No availability rules"
            description="Create your first availability rule to control how meetings are booked with you."
          >
            <template #action>
              <button
                @click="showCreateForm = true"
                class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <FeatherIcon name="plus" class="h-4 w-4" />
                Create Rule
              </button>
            </template>
          </EmptyState>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="rule in rules"
            :key="rule.name"
            class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <!-- Rule Header -->
            <div
              class="flex cursor-pointer items-center justify-between px-5 py-4"
              @click="toggleRule(rule.name)"
            >
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-gray-900 dark:text-white">
                    {{ rule.rule_name }}
                  </span>
                  <span
                    v-if="rule.is_default"
                    class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  >
                    Default
                  </span>
                  <span
                    :class="rule.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'"
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  >
                    {{ rule.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-400 dark:text-gray-500">
                  Buffer: {{ rule.buffer_time_before || 0 }}/{{ rule.buffer_time_after || 0 }}min
                </span>
                <FeatherIcon
                  name="chevron-down"
                  class="h-4 w-4 text-gray-400 transition-transform duration-200"
                  :class="{ 'rotate-180': expandedRule === rule.name }"
                />
              </div>
            </div>

            <!-- Expanded Detail -->
            <div v-if="expandedRule === rule.name" class="border-t border-gray-200 dark:border-gray-800">
              <div class="space-y-4 p-5">
                <!-- Editable fields -->
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Rule Name</label>
                    <input
                      v-model="rule.rule_name"
                      type="text"
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div class="flex items-end gap-6">
                    <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input v-model="rule.is_default" type="checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800" />
                      Default
                    </label>
                    <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input v-model="rule.is_active" type="checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800" />
                      Active
                    </label>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Buffer Before (min)</label>
                    <input v-model.number="rule.buffer_time_before" type="number" min="0" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Buffer After (min)</label>
                    <input v-model.number="rule.buffer_time_after" type="number" min="0" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Max/Day</label>
                    <input v-model.number="rule.max_bookings_per_day" type="number" min="0" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Max/Week</label>
                    <input v-model.number="rule.max_bookings_per_week" type="number" min="0" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Min Notice (hrs)</label>
                    <input v-model.number="rule.min_notice_hours" type="number" min="0" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Max Advance (days)</label>
                    <input v-model.number="rule.max_days_advance" type="number" min="0" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  </div>
                </div>

                <!-- Date Overrides Section -->
                <div class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                  <div class="mb-3 flex items-center justify-between">
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Date Overrides</h3>
                    <button
                      @click="addOverrideRow(rule)"
                      class="inline-flex items-center gap-1 rounded-md bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      <FeatherIcon name="plus" class="h-3 w-3" />
                      Add Override
                    </button>
                  </div>

                  <div v-if="!rule._overrides || rule._overrides.length === 0" class="py-3 text-center text-xs text-gray-400 dark:text-gray-500">
                    No date overrides configured.
                  </div>

                  <div v-else class="space-y-2">
                    <div
                      v-for="(ov, oi) in rule._overrides"
                      :key="oi"
                      class="flex items-center gap-2"
                    >
                      <input
                        v-model="ov.date"
                        type="date"
                        class="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                      <label class="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                        <input v-model="ov.is_available" type="checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800" />
                        Available
                      </label>
                      <input
                        v-model="ov.reason"
                        type="text"
                        placeholder="Reason"
                        class="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                      <button
                        @click="rule._overrides.splice(oi, 1)"
                        class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      >
                        <FeatherIcon name="trash-2" class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex items-center justify-between pt-2">
                  <button
                    @click="deleteRule(rule.name)"
                    :disabled="deletingRule === rule.name"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <FeatherIcon name="trash-2" class="h-4 w-4" />
                    {{ deletingRule === rule.name ? 'Deleting...' : 'Delete Rule' }}
                  </button>
                  <button
                    @click="saveRule(rule)"
                    :disabled="savingRule === rule.name"
                    class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <FeatherIcon v-if="savingRule === rule.name" name="loader" class="h-4 w-4 animate-spin" />
                    {{ savingRule === rule.name ? 'Saving...' : 'Save Rule' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Status Message -->
        <p v-if="statusMessage" class="mt-4 text-center text-sm" :class="statusClass">{{ statusMessage }}</p>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { call } from 'frappe-ui'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/layouts/AppLayout.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorState from '@/components/shared/ErrorState.vue'
import EmptyState from '@/components/shared/EmptyState.vue'

const auth = useAuthStore()

const loading = ref(true)
const error = ref(null)
const rules = reactive([])
const expandedRule = ref(null)
const showCreateForm = ref(false)
const creatingRule = ref(false)
const savingRule = ref(null)
const deletingRule = ref(null)
const statusMessage = ref('')
const statusClass = ref('')

const newRule = reactive({
  rule_name: '',
  is_default: false,
  is_active: true,
  buffer_time_before: 0,
  buffer_time_after: 0,
  max_bookings_per_day: 0,
  max_bookings_per_week: 0,
  min_notice_hours: 0,
  max_days_advance: 30,
})

function resetNewRule() {
  Object.assign(newRule, {
    rule_name: '',
    is_default: false,
    is_active: true,
    buffer_time_before: 0,
    buffer_time_after: 0,
    max_bookings_per_day: 0,
    max_bookings_per_week: 0,
    min_notice_hours: 0,
    max_days_advance: 30,
  })
}

function toggleRule(name) {
  expandedRule.value = expandedRule.value === name ? null : name
}

function addOverrideRow(rule) {
  if (!rule._overrides) {
    rule._overrides = []
  }
  rule._overrides.push({ date: '', is_available: false, reason: '' })
}

function showStatus(msg, isError = false) {
  statusMessage.value = msg
  statusClass.value = isError
    ? 'text-red-600 dark:text-red-400'
    : 'text-emerald-600 dark:text-emerald-400'
  setTimeout(() => { statusMessage.value = '' }, 4000)
}

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
      // Load date overrides for each rule
      let overrides = []
      try {
        const overrideList = await call('frappe.client.get_list', {
          doctype: 'MM User Date Override',
          filters: { parent: rule.name, parenttype: 'MM User Availability Rule' },
          fields: ['name', 'date', 'is_available', 'reason'],
          order_by: 'date asc',
          limit_page_length: 100,
        })
        overrides = overrideList || []
      } catch (e) {
        // Child table might not exist or have different structure
        overrides = []
      }

      rules.push({
        ...rule,
        _overrides: overrides.map(o => ({
          name: o.name,
          date: o.date,
          is_available: !!o.is_available,
          reason: o.reason || '',
        })),
      })
    }
  } catch (e) {
    error.value = e.message || 'Failed to load availability rules'
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
        doctype: 'MM User Availability Rule',
        user: auth.user,
        rule_name: newRule.rule_name,
        is_default: newRule.is_default ? 1 : 0,
        is_active: newRule.is_active ? 1 : 0,
        buffer_time_before: newRule.buffer_time_before,
        buffer_time_after: newRule.buffer_time_after,
        max_bookings_per_day: newRule.max_bookings_per_day,
        max_bookings_per_week: newRule.max_bookings_per_week,
        min_notice_hours: newRule.min_notice_hours,
        max_days_advance: newRule.max_days_advance,
      },
    })
    resetNewRule()
    showCreateForm.value = false
    showStatus('Rule created successfully.')
    await loadRules()
  } catch (e) {
    showStatus(e.message || 'Failed to create rule.', true)
  } finally {
    creatingRule.value = false
  }
}

async function saveRule(rule) {
  savingRule.value = rule.name
  try {
    // Update the rule fields
    await call('frappe.client.set_value', {
      doctype: 'MM User Availability Rule',
      name: rule.name,
      fieldname: {
        rule_name: rule.rule_name,
        is_default: rule.is_default ? 1 : 0,
        is_active: rule.is_active ? 1 : 0,
        buffer_time_before: rule.buffer_time_before,
        buffer_time_after: rule.buffer_time_after,
        max_bookings_per_day: rule.max_bookings_per_day,
        max_bookings_per_week: rule.max_bookings_per_week,
        min_notice_hours: rule.min_notice_hours,
        max_days_advance: rule.max_days_advance,
      },
    })

    // Save date overrides via full doc update
    if (rule._overrides && rule._overrides.length >= 0) {
      try {
        const doc = await call('frappe.client.get', {
          doctype: 'MM User Availability Rule',
          name: rule.name,
        })
        doc.date_overrides = rule._overrides.map(o => ({
          date: o.date,
          is_available: o.is_available ? 1 : 0,
          reason: o.reason,
        }))
        await call('frappe.client.save', { doc })
      } catch (e) {
        // date_overrides child table may not exist yet -- ignore silently
        console.warn('Could not save date overrides:', e)
      }
    }

    showStatus('Rule saved successfully.')
  } catch (e) {
    showStatus(e.message || 'Failed to save rule.', true)
  } finally {
    savingRule.value = null
  }
}

async function deleteRule(name) {
  if (!confirm('Are you sure you want to delete this rule?')) return
  deletingRule.value = name
  try {
    await call('frappe.client.delete', {
      doctype: 'MM User Availability Rule',
      name,
    })
    const idx = rules.findIndex(r => r.name === name)
    if (idx >= 0) rules.splice(idx, 1)
    if (expandedRule.value === name) expandedRule.value = null
    showStatus('Rule deleted.')
  } catch (e) {
    showStatus(e.message || 'Failed to delete rule.', true)
  } finally {
    deletingRule.value = null
  }
}

onMounted(async () => {
  if (!auth.isInitialized) {
    await auth.initialize()
  }
  await loadRules()
})
</script>
