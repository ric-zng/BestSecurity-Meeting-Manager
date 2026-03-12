<template>
  <div class="flex h-full flex-col">
    <!-- Header -->
    <div class="flex flex-col gap-4 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-lg font-semibold text-gray-900 dark:text-white">Email Templates</h1>
        <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{{ totalLabel }}</p>
      </div>
      <button
        @click="openNewTemplate"
        class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        <FeatherIcon name="plus" class="h-4 w-4" />
        New Template
      </button>
    </div>

    <!-- Filters -->
    <div class="border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-900">
      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <!-- Search -->
        <div class="relative min-w-[200px] flex-1 sm:max-w-xs">
          <FeatherIcon
            name="search"
            class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search templates..."
            class="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        <!-- Email type filter -->
        <select
          v-model="selectedEmailType"
          class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="">All Email Types</option>
          <option v-for="et in EMAIL_TYPES" :key="et" :value="et">{{ et }}</option>
        </select>

        <!-- Recipient type filter -->
        <select
          v-model="selectedRecipientType"
          class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="">All Recipients</option>
          <option value="Customer">Customer</option>
          <option value="Internal">Internal</option>
          <option value="Both">Both</option>
        </select>

        <!-- Service type filter -->
        <select
          v-model="selectedServiceType"
          class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="">All Service Types</option>
          <option value="Booking">Booking</option>
          <option value="Meeting">Meeting</option>
          <option value="Team">Team</option>
        </select>

        <!-- Clear -->
        <button
          v-if="hasActiveFilters"
          @click="clearFilters"
          class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <FeatherIcon name="x" class="h-3 w-3" />
          Clear filters
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto">
      <LoadingSpinner v-if="templates.loading && !templates.data?.length" />

      <ErrorState
        v-else-if="templates.error"
        :message="templates.error"
        @retry="templates.reload()"
      />

      <EmptyState
        v-else-if="!templates.data?.length"
        icon="mail"
        title="No email templates found"
        :description="hasActiveFilters ? 'Try adjusting your filters' : 'Create your first email template'"
      >
        <template #action>
          <button
            v-if="!hasActiveFilters"
            @click="openNewTemplate"
            class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <FeatherIcon name="plus" class="h-4 w-4" />
            New Template
          </button>
          <button
            v-else
            @click="clearFilters"
            class="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Clear filters
          </button>
        </template>
      </EmptyState>

      <!-- Desktop table -->
      <div v-else class="hidden sm:block">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50 text-left dark:border-gray-800 dark:bg-gray-900/50">
              <th class="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Template Name</th>
              <th class="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Email Type</th>
              <th class="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Recipient</th>
              <th class="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Service</th>
              <th class="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Language</th>
              <th class="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Priority</th>
              <th class="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
              <th class="w-24 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(tpl, idx) in templates.data"
              :key="tpl.name"
              class="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800/50 dark:hover:bg-gray-800/50"
              :class="idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-900/70'"
            >
              <td class="px-4 py-3">
                <div class="text-sm font-medium text-gray-900 dark:text-white">{{ tpl.template_name }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">{{ tpl.name }}</div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                  {{ tpl.email_type || '-' }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                {{ tpl.recipient_type || '-' }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                {{ tpl.service_type || '-' }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                {{ tpl.language || '-' }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                {{ tpl.priority ?? '-' }}
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="tpl.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'"
                >
                  {{ tpl.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-1">
                  <button
                    @click="previewTemplate(tpl.name)"
                    class="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800 dark:hover:text-blue-400"
                    title="Preview"
                  >
                    <FeatherIcon name="eye" class="h-4 w-4" />
                  </button>
                  <button
                    @click="editTemplate(tpl)"
                    class="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    title="Edit"
                  >
                    <FeatherIcon name="edit-2" class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile card view -->
      <div v-if="templates.data?.length" class="space-y-2 p-4 sm:hidden">
        <div
          v-for="tpl in templates.data"
          :key="tpl.name"
          @click="editTemplate(tpl)"
          class="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ tpl.template_name }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ tpl.email_type }}</p>
            </div>
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              :class="tpl.is_active
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'"
            >
              {{ tpl.is_active ? 'Active' : 'Inactive' }}
            </span>
          </div>
          <div class="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span v-if="tpl.recipient_type">{{ tpl.recipient_type }}</span>
            <span v-if="tpl.service_type">{{ tpl.service_type }}</span>
            <span v-if="tpl.language">{{ tpl.language }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit/Create Template Modal -->
    <teleport to="body">
      <div
        v-if="showTemplateModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showTemplateModal = false"
      >
        <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ editingTemplate ? 'Edit Template' : 'New Template' }}
          </h2>

          <div class="mt-4 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Template Name</label>
              <input
                v-model="templateForm.template_name"
                type="text"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Type</label>
                <select
                  v-model="templateForm.email_type"
                  class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select type</option>
                  <option v-for="et in EMAIL_TYPES" :key="et" :value="et">{{ et }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Recipient Type</label>
                <select
                  v-model="templateForm.recipient_type"
                  class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select recipient</option>
                  <option value="Customer">Customer</option>
                  <option value="Internal">Internal</option>
                  <option value="Both">Both</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Service Type</label>
                <select
                  v-model="templateForm.service_type"
                  class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select service</option>
                  <option value="Booking">Booking</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Team">Team</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                <input
                  v-model="templateForm.language"
                  type="text"
                  placeholder="e.g. en, da"
                  class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                <input
                  v-model.number="templateForm.priority"
                  type="number"
                  min="0"
                  class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div class="flex items-end">
                <label class="flex items-center gap-2 pb-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    v-model="templateForm.is_active"
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  Active
                </label>
              </div>
            </div>
          </div>

          <div class="mt-6 flex items-center justify-end gap-3">
            <button
              @click="showTemplateModal = false"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-750"
            >
              Cancel
            </button>
            <button
              @click="saveTemplate"
              :disabled="savingTemplate"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {{ savingTemplate ? 'Saving...' : (editingTemplate ? 'Update' : 'Create') }}
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Preview Modal -->
    <teleport to="body">
      <div
        v-if="showPreviewModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showPreviewModal = false"
      >
        <div class="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Template Preview</h2>
            <button
              @click="showPreviewModal = false"
              class="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <FeatherIcon name="x" class="h-5 w-5" />
            </button>
          </div>

          <div v-if="previewLoading" class="py-12">
            <LoadingSpinner />
          </div>
          <div v-else-if="previewError" class="py-8 text-center text-sm text-red-500 dark:text-red-400">
            {{ previewError }}
          </div>
          <div v-else-if="previewHtml" class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div v-if="previewSubject" class="mb-3 border-b border-gray-200 pb-3 dark:border-gray-700">
              <span class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Subject:</span>
              <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ previewSubject }}</p>
            </div>
            <div v-html="previewHtml" class="prose prose-sm max-w-none dark:prose-invert" />
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { createListResource, call } from 'frappe-ui'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import ErrorState from '@/components/shared/ErrorState.vue'

const auth = useAuthStore()

const EMAIL_TYPES = [
  'Booking Confirmation',
  'Reschedule Notification',
  'Reassignment Notification',
  'Extension Notification',
  'Cancellation',
  'Team Meeting Invitation',
  'Reminder',
  'Follow-up',
]

// Filter state
const searchQuery = ref('')
const selectedEmailType = ref('')
const selectedRecipientType = ref('')
const selectedServiceType = ref('')
let searchTimeout = null
const debouncedSearch = ref('')

watch(searchQuery, (val) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = val
  }, 300)
})

const hasActiveFilters = computed(() =>
  searchQuery.value || selectedEmailType.value || selectedRecipientType.value || selectedServiceType.value
)

const computedFilters = computed(() => {
  const filters = {}
  if (debouncedSearch.value) {
    filters.template_name = ['like', `%${debouncedSearch.value}%`]
  }
  if (selectedEmailType.value) {
    filters.email_type = selectedEmailType.value
  }
  if (selectedRecipientType.value) {
    filters.recipient_type = selectedRecipientType.value
  }
  if (selectedServiceType.value) {
    filters.service_type = selectedServiceType.value
  }
  return filters
})

// List resource
const templates = createListResource({
  doctype: 'MM Email Template',
  fields: ['name', 'template_name', 'email_type', 'recipient_type', 'service_type', 'is_active', 'language', 'priority'],
  filters: computedFilters,
  orderBy: 'template_name asc',
  pageLength: 100,
  auto: true,
})

const totalLabel = computed(() => {
  if (templates.loading && !templates.data?.length) return 'Loading...'
  const count = templates.data?.length ?? 0
  return `${count} template${count !== 1 ? 's' : ''}${hasActiveFilters.value ? ' (filtered)' : ''}`
})

// Template modal
const showTemplateModal = ref(false)
const editingTemplate = ref(null)
const savingTemplate = ref(false)
const templateForm = ref({
  template_name: '',
  email_type: '',
  recipient_type: '',
  service_type: '',
  language: '',
  priority: 0,
  is_active: true,
})

function openNewTemplate() {
  editingTemplate.value = null
  templateForm.value = {
    template_name: '',
    email_type: '',
    recipient_type: '',
    service_type: '',
    language: '',
    priority: 0,
    is_active: true,
  }
  showTemplateModal.value = true
}

function editTemplate(tpl) {
  editingTemplate.value = tpl.name
  templateForm.value = {
    template_name: tpl.template_name || '',
    email_type: tpl.email_type || '',
    recipient_type: tpl.recipient_type || '',
    service_type: tpl.service_type || '',
    language: tpl.language || '',
    priority: tpl.priority ?? 0,
    is_active: !!tpl.is_active,
  }
  showTemplateModal.value = true
}

async function saveTemplate() {
  if (!templateForm.value.template_name) return
  savingTemplate.value = true
  try {
    if (editingTemplate.value) {
      await call('frappe.client.set_value', {
        doctype: 'MM Email Template',
        name: editingTemplate.value,
        fieldname: {
          template_name: templateForm.value.template_name,
          email_type: templateForm.value.email_type,
          recipient_type: templateForm.value.recipient_type,
          service_type: templateForm.value.service_type,
          language: templateForm.value.language,
          priority: templateForm.value.priority,
          is_active: templateForm.value.is_active ? 1 : 0,
        },
      })
    } else {
      await call('frappe.client.insert', {
        doc: {
          doctype: 'MM Email Template',
          template_name: templateForm.value.template_name,
          email_type: templateForm.value.email_type,
          recipient_type: templateForm.value.recipient_type,
          service_type: templateForm.value.service_type,
          language: templateForm.value.language,
          priority: templateForm.value.priority,
          is_active: templateForm.value.is_active ? 1 : 0,
        },
      })
    }
    showTemplateModal.value = false
    templates.reload()
  } catch (e) {
    console.error('Failed to save template:', e)
  } finally {
    savingTemplate.value = false
  }
}

// Preview
const showPreviewModal = ref(false)
const previewLoading = ref(false)
const previewError = ref('')
const previewHtml = ref('')
const previewSubject = ref('')

async function previewTemplate(templateName) {
  showPreviewModal.value = true
  previewLoading.value = true
  previewError.value = ''
  previewHtml.value = ''
  previewSubject.value = ''

  try {
    const result = await call(
      'meeting_manager.meeting_manager.utils.email_notifications.preview_template',
      { template_name: templateName }
    )
    previewSubject.value = result.subject || ''
    previewHtml.value = result.html || result.message || '<p>No preview available</p>'
  } catch (e) {
    previewError.value = e.message || 'Failed to load preview'
  } finally {
    previewLoading.value = false
  }
}

function clearFilters() {
  searchQuery.value = ''
  debouncedSearch.value = ''
  selectedEmailType.value = ''
  selectedRecipientType.value = ''
  selectedServiceType.value = ''
}
</script>
