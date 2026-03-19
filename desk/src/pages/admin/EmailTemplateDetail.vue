<template>
  <div class="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-800">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button @click="router.push('/email-templates')" class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300">
            <FeatherIcon name="arrow-left" class="h-5 w-5" />
          </button>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-semibold text-gray-900 dark:text-white">{{ doc.doc?.template_name || 'Loading...' }}</h1>
              <span v-if="doc.doc?.is_active" class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
              <span v-else-if="doc.doc" class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">Inactive</span>
              <span v-if="doc.doc?.email_type" class="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">{{ doc.doc.email_type }}</span>
            </div>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ currentId }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Tooltip v-if="hasPrevious" :text="`Previous: ${prevId}`">
            <button @click="goToPrevious" class="rounded-full border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700">
              <FeatherIcon name="chevron-left" class="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip v-if="hasNext" :text="`Next: ${nextId}`">
            <button @click="goToNext" class="rounded-full border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700">
              <FeatherIcon name="chevron-right" class="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="!doc.doc" class="flex items-center justify-center py-24">
      <LoadingSpinner />
    </div>

    <!-- Content -->
    <div v-else class="mx-auto grid max-w-[1400px] gap-6 p-6 lg:grid-cols-3">
      <!-- Left column (2/3) -->
      <div class="space-y-6 lg:col-span-2">

        <!-- Metadata Section -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Template Information</h2>
            <button v-if="hasMetaChanges" @click="saveMetadata" :disabled="savingMeta" class="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {{ savingMeta ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
          <div class="space-y-4 p-5">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="etd-label">Template Name</label>
                <input v-model="meta.template_name" type="text" class="etd-input" />
              </div>
              <div>
                <label class="etd-label">Email Type</label>
                <Listbox v-model="meta.email_type" as="div" class="relative mt-1">
                  <ListboxButton class="etd-listbox-btn">
                    <span class="block truncate">{{ meta.email_type || 'Select' }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><FeatherIcon name="chevron-down" class="h-4 w-4 text-gray-400" /></span>
                  </ListboxButton>
                  <transition leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions class="etd-listbox-options">
                      <ListboxOption v-for="et in EMAIL_TYPES" :key="et" :value="et" v-slot="{ active, selected }" as="template">
                        <li :class="[active ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300', 'relative cursor-pointer select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-medium' : '', 'block truncate']">{{ et }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-blue-600', 'absolute inset-y-0 right-0 flex items-center pr-3']"><FeatherIcon name="check" class="h-4 w-4" /></span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </Listbox>
              </div>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="etd-label">Recipient Type</label>
                <Listbox v-model="meta.recipient_type" as="div" class="relative mt-1">
                  <ListboxButton class="etd-listbox-btn">
                    <span class="block truncate">{{ meta.recipient_type || 'Select' }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><FeatherIcon name="chevron-down" class="h-4 w-4 text-gray-400" /></span>
                  </ListboxButton>
                  <transition leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions class="etd-listbox-options">
                      <ListboxOption v-for="r in RECIPIENT_TYPES" :key="r" :value="r" v-slot="{ active, selected }" as="template">
                        <li :class="[active ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300', 'relative cursor-pointer select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-medium' : '', 'block truncate']">{{ r }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-blue-600', 'absolute inset-y-0 right-0 flex items-center pr-3']"><FeatherIcon name="check" class="h-4 w-4" /></span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </Listbox>
              </div>
              <div>
                <label class="etd-label">Service Type</label>
                <Listbox v-model="meta.service_type" as="div" class="relative mt-1">
                  <ListboxButton class="etd-listbox-btn">
                    <span class="block truncate">{{ meta.service_type || 'None (Default)' }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><FeatherIcon name="chevron-down" class="h-4 w-4 text-gray-400" /></span>
                  </ListboxButton>
                  <transition leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions class="etd-listbox-options">
                      <ListboxOption value="" v-slot="{ active, selected }" as="template">
                        <li :class="[active ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300', 'relative cursor-pointer select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-medium' : '', 'block truncate']">None (Default)</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-blue-600', 'absolute inset-y-0 right-0 flex items-center pr-3']"><FeatherIcon name="check" class="h-4 w-4" /></span>
                        </li>
                      </ListboxOption>
                      <ListboxOption v-for="s in SERVICE_TYPES" :key="s" :value="s" v-slot="{ active, selected }" as="template">
                        <li :class="[active ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300', 'relative cursor-pointer select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-medium' : '', 'block truncate']">{{ s }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-blue-600', 'absolute inset-y-0 right-0 flex items-center pr-3']"><FeatherIcon name="check" class="h-4 w-4" /></span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </Listbox>
              </div>
            </div>
            <div class="grid gap-4 sm:grid-cols-3">
              <div>
                <label class="etd-label">Language</label>
                <input v-model="meta.language" type="text" placeholder="en" class="etd-input" />
              </div>
              <div>
                <label class="etd-label">Priority</label>
                <input v-model.number="meta.priority" type="number" min="0" class="etd-input" />
              </div>
              <div class="flex items-end pb-1">
                <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input v-model="meta.is_active" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700" />
                  Active
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Email Content Section -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Email Content</h2>
            <div class="flex items-center gap-2">
              <button @click="previewTemplate" class="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700">
                <FeatherIcon name="eye" class="mr-1 inline h-3 w-3" /> Preview
              </button>
              <button v-if="hasContentChanges" @click="saveContent" :disabled="savingContent" class="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {{ savingContent ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </div>
          <div class="space-y-4 p-5">
            <div>
              <label class="etd-label">Subject</label>
              <input v-model="content.subject" type="text" placeholder="Email subject line..." class="etd-input" />
            </div>
            <div>
              <label class="etd-label">Email Body (HTML / Jinja2)</label>
              <textarea v-model="content.email_body" rows="16" class="etd-input font-mono text-xs" placeholder="<p>Dear {{ customer_name }},</p>..." />
            </div>
          </div>
        </div>

        <!-- Settings Section -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Additional Settings</h2>
            <button v-if="hasSettingsChanges" @click="saveSettings" :disabled="savingSettings" class="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {{ savingSettings ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
          <div class="space-y-4 p-5">
            <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input v-model="settings.include_remote_support_link" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700" />
              Include Remote Support Link
            </label>
            <div v-if="settings.include_remote_support_link">
              <label class="etd-label">Remote Support URL</label>
              <input v-model="settings.remote_support_url" type="text" class="etd-input" />
            </div>
            <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input v-model="settings.include_brochure" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700" />
              Include Business Brochure
            </label>
          </div>
        </div>

        <!-- Activity Section -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
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

        <!-- Danger Zone -->
        <div class="rounded-lg border border-red-200 bg-white shadow-sm dark:border-red-900/50 dark:bg-gray-800">
          <div class="border-b border-red-100 px-5 py-3 dark:border-red-900/30">
            <h2 class="text-sm font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
          </div>
          <div class="flex items-center justify-between p-5">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">Delete this template</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
            </div>
            <button @click="confirmDelete" class="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20">
              <FeatherIcon name="trash-2" class="mr-1 inline h-3 w-3" /> Delete
            </button>
          </div>
        </div>
      </div>

      <!-- Right column (1/3) -->
      <div class="space-y-6">
        <!-- Details Card -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Details</h2>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-gray-700">
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Email Type</span>
              <span class="text-xs font-medium text-gray-900 dark:text-white">{{ doc.doc?.email_type || '-' }}</span>
            </div>
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Recipient</span>
              <span class="text-xs font-medium text-gray-900 dark:text-white">{{ doc.doc?.recipient_type || '-' }}</span>
            </div>
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Service</span>
              <span class="text-xs font-medium text-gray-900 dark:text-white">{{ doc.doc?.service_type || '-' }}</span>
            </div>
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Language</span>
              <span class="text-xs font-medium text-gray-900 dark:text-white">{{ doc.doc?.language || '-' }}</span>
            </div>
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Priority</span>
              <span class="text-xs font-medium text-gray-900 dark:text-white">{{ doc.doc?.priority ?? 0 }}</span>
            </div>
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Created by</span>
              <span class="text-xs font-medium text-gray-900 dark:text-white">{{ doc.doc?.owner || '-' }}</span>
            </div>
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Modified</span>
              <span class="text-xs font-medium text-gray-900 dark:text-white">{{ formatDate(doc.doc?.modified) }}</span>
            </div>
          </div>
        </div>

        <!-- Usage Info -->
        <div v-if="usageInfo" class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
              <FeatherIcon name="zap" class="h-3.5 w-3.5" />
              When This Email Is Sent
            </h2>
          </div>
          <div class="px-5 py-3">
            <p class="text-xs leading-relaxed text-gray-700 dark:text-gray-300">{{ usageInfo.trigger }}</p>
            <div class="mt-2 flex items-center gap-1.5">
              <FeatherIcon name="user" class="h-3 w-3 text-gray-500 dark:text-gray-400" />
              <span class="text-[11px] font-medium text-gray-600 dark:text-gray-300">Sent to: {{ usageInfo.sentTo }}</span>
            </div>
            <div v-if="usageInfo.note" class="mt-2 rounded-md bg-gray-50 px-3 py-1.5 dark:bg-gray-700/50">
              <p class="text-[11px] text-gray-600 dark:text-gray-400">{{ usageInfo.note }}</p>
            </div>
          </div>
        </div>

        <!-- Template Variables Reference -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Template Variables</h2>
            <button @click="showAllVars = !showAllVars" class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">
              {{ showAllVars ? 'Collapse' : 'Expand' }}
            </button>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-gray-700" :class="{ 'max-h-48 overflow-hidden': !showAllVars }">
            <div v-for="v in TEMPLATE_VARS" :key="v.name" class="px-5 py-2">
              <code class="text-xs font-medium text-indigo-600 dark:text-indigo-400" v-text="'{{ ' + v.name + ' }}'"></code>
              <p class="text-[11px] text-gray-500 dark:text-gray-400">{{ v.desc }}</p>
            </div>
          </div>
          <div v-if="!showAllVars && TEMPLATE_VARS.length > 6" class="border-t border-gray-100 px-5 py-2 dark:border-gray-700">
            <button @click="showAllVars = true" class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">
              Show all {{ TEMPLATE_VARS.length }} variables
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Preview Modal -->
    <teleport to="body">
      <div v-if="showPreview" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showPreview = false">
        <div class="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Template Preview</h2>
            <button @click="showPreview = false" class="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <FeatherIcon name="x" class="h-5 w-5" />
            </button>
          </div>
          <div v-if="previewLoading" class="py-12"><LoadingSpinner /></div>
          <div v-else-if="previewError" class="py-8 text-center text-sm text-red-500">{{ previewError }}</div>
          <div v-else class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div v-if="previewSubject" class="mb-3 border-b border-gray-200 pb-3 dark:border-gray-700">
              <span class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Subject:</span>
              <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ previewSubject }}</p>
            </div>
            <div v-html="previewHtml" class="prose prose-sm max-w-none dark:prose-invert" />
          </div>
        </div>
      </div>
    </teleport>

    <!-- Delete Confirm -->
    <ConfirmModal
      :show="deleteConfirm.show"
      title="Delete Template"
      :message="`Delete '${doc.doc?.template_name}'? This cannot be undone.`"
      confirm-label="Delete"
      loading-text="Deleting..."
      icon="trash-2"
      variant="danger"
      :loading="deleteConfirm.loading"
      @confirm="executeDelete"
      @cancel="deleteConfirm.show = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { createDocumentResource, call, Tooltip } from 'frappe-ui'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/vue'
import { useEmailTemplateNavigation } from '@/composables/useEmailTemplateNavigation'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ConfirmModal from '@/components/shared/ConfirmModal.vue'

const props = defineProps({ id: String })
const router = useRouter()
const route = useRoute()

const currentId = computed(() => props.id || route.params.id)

// Navigation
const { loadTemplates, updateCurrentIndex, goToNext, goToPrevious, hasNext, hasPrevious, nextId, prevId } = useEmailTemplateNavigation()
onMounted(() => { loadTemplates() })
watch(currentId, () => { updateCurrentIndex() })

// Document
const doc = createDocumentResource({
  doctype: 'MM Email Template',
  name: currentId.value,
  auto: true,
})

watch(currentId, (newId) => {
  if (newId) {
    doc.name = newId
    doc.reload()
    loadActivities()
  }
})

// Constants
const EMAIL_TYPES = [
  'Booking Confirmation', 'Reschedule Confirmation', 'Reschedule Notification',
  'Reassignment Notification', 'Extension Notification', 'Cancellation',
  'Team Meeting Invitation', 'Reminder', 'Follow-up',
]
const RECIPIENT_TYPES = ['Customer', 'Host', 'Participant', 'Team Member']
const SERVICE_TYPES = [
  'Business', 'Business Extended', 'Business Rebook', 'New Setup Business',
  'Private / Business Customer', 'Private New Sale', 'Private Self Book',
  'Microsoft 365 Backup', 'Website Security',
]
const TEMPLATE_VARS = [
  { name: 'customer_name', desc: 'Full customer name' },
  { name: 'customer_firstname', desc: 'Customer first name' },
  { name: 'customer_email', desc: 'Customer email address' },
  { name: 'customer_phone', desc: 'Customer phone number' },
  { name: 'company', desc: 'Company name' },
  { name: 'provider', desc: 'Service provider name' },
  { name: 'event_date', desc: 'Booking date (formatted)' },
  { name: 'event_time', desc: 'Booking start time' },
  { name: 'end_time', desc: 'Booking end time' },
  { name: 'event_datetime', desc: 'Full date and time string' },
  { name: 'duration', desc: 'Meeting duration in minutes' },
  { name: 'booker', desc: 'Name of the booker' },
  { name: 'booking_reference', desc: 'Booking reference code' },
  { name: 'meeting_type', desc: 'Meeting type name' },
  { name: 'remote_support_link', desc: 'Remote support URL' },
  { name: 'cancel_link', desc: 'Cancellation link' },
  { name: 'reschedule_link', desc: 'Reschedule link' },
]

// --- Usage info based on email_type ---
const EMAIL_USAGE = {
  'Booking Confirmation': {
    trigger: 'Sent automatically when a new booking is created, either by a customer via the public booking page or internally by staff.',
    sentTo: 'Customer (and optionally Host)',
    note: 'If a service_type is set, the system picks the most specific template matching that service. Falls back to the default template (no service_type) if none match.',
  },
  'Reschedule Confirmation': {
    trigger: 'Sent when a booking is rescheduled to a new date/time, confirming the updated schedule to the customer.',
    sentTo: 'Customer',
    note: 'Triggered by the "Reschedule" action in the booking sidebar.',
  },
  'Reschedule Notification': {
    trigger: 'Sent when a booking is rescheduled, notifying the customer about the change in date/time.',
    sentTo: 'Customer',
    note: 'Different from Reschedule Confirmation — this is an informational notice rather than a confirmation.',
  },
  'Reassignment Notification': {
    trigger: 'Sent when a booking is reassigned from one host to another.',
    sentTo: 'Customer',
    note: 'Triggered by the "Reassign" action. The customer is informed who their new consultant will be.',
  },
  'Extension Notification': {
    trigger: 'Sent when a booking\'s duration is extended beyond the original end time.',
    sentTo: 'Customer',
    note: 'Triggered by the "Extend" action in the booking sidebar.',
  },
  'Cancellation': {
    trigger: 'Sent when a booking is cancelled, notifying the relevant party about the cancellation.',
    sentTo: 'Customer and/or Host',
    note: 'Separate templates can exist for Customer and Host recipients.',
  },
  'Team Meeting Invitation': {
    trigger: 'Sent when a team meeting is created and the host chooses to notify participants.',
    sentTo: 'Internal team members (participants)',
    note: 'The host can selectively choose which participants to notify during team meeting creation.',
  },
  'Reminder': {
    trigger: 'Sent as a reminder before an upcoming booking, typically 24 hours or 1 hour before.',
    sentTo: 'Customer and/or Host',
    note: 'Requires a scheduled job or manual trigger to send reminders at the configured interval.',
  },
  'Follow-up': {
    trigger: 'Sent after a booking is completed as a follow-up to gather feedback or next steps.',
    sentTo: 'Customer',
    note: 'Typically triggered manually or by a scheduled job after the meeting ends.',
  },
}

const usageInfo = computed(() => {
  const emailType = doc.doc?.email_type
  if (!emailType || !EMAIL_USAGE[emailType]) return null
  return EMAIL_USAGE[emailType]
})

// --- Form state (per-section change detection) ---
const meta = reactive({ template_name: '', email_type: '', recipient_type: '', service_type: '', language: '', priority: 0, is_active: true })
const originalMeta = reactive({})
const content = reactive({ subject: '', email_body: '' })
const originalContent = reactive({})
const settings = reactive({ include_remote_support_link: true, remote_support_url: '', include_brochure: false })
const originalSettings = reactive({})

function syncFromDoc() {
  const d = doc.doc
  if (!d) return
  Object.assign(meta, { template_name: d.template_name || '', email_type: d.email_type || '', recipient_type: d.recipient_type || '', service_type: d.service_type || '', language: d.language || '', priority: d.priority ?? 0, is_active: !!d.is_active })
  Object.assign(originalMeta, { ...meta })
  Object.assign(content, { subject: d.subject || '', email_body: d.email_body || '' })
  Object.assign(originalContent, { ...content })
  Object.assign(settings, { include_remote_support_link: !!d.include_remote_support_link, remote_support_url: d.remote_support_url || '', include_brochure: !!d.include_brochure })
  Object.assign(originalSettings, { ...settings })
}

watch(() => doc.doc, syncFromDoc, { immediate: true })

const hasMetaChanges = computed(() => JSON.stringify(meta) !== JSON.stringify(originalMeta))
const hasContentChanges = computed(() => JSON.stringify(content) !== JSON.stringify(originalContent))
const hasSettingsChanges = computed(() => JSON.stringify(settings) !== JSON.stringify(originalSettings))

// --- Save handlers ---
const savingMeta = ref(false)
const savingContent = ref(false)
const savingSettings = ref(false)

async function saveMetadata() {
  savingMeta.value = true
  try {
    await call('frappe.client.set_value', {
      doctype: 'MM Email Template', name: currentId.value,
      fieldname: { template_name: meta.template_name, email_type: meta.email_type, recipient_type: meta.recipient_type, service_type: meta.service_type, language: meta.language, priority: meta.priority, is_active: meta.is_active ? 1 : 0 },
    })
    await doc.reload()
    Object.assign(originalMeta, { ...meta })
  } catch (e) { console.error(e) }
  finally { savingMeta.value = false }
}

async function saveContent() {
  savingContent.value = true
  try {
    await call('frappe.client.set_value', {
      doctype: 'MM Email Template', name: currentId.value,
      fieldname: { subject: content.subject, email_body: content.email_body },
    })
    await doc.reload()
    Object.assign(originalContent, { ...content })
  } catch (e) { console.error(e) }
  finally { savingContent.value = false }
}

async function saveSettings() {
  savingSettings.value = true
  try {
    await call('frappe.client.set_value', {
      doctype: 'MM Email Template', name: currentId.value,
      fieldname: { include_remote_support_link: settings.include_remote_support_link ? 1 : 0, remote_support_url: settings.remote_support_url, include_brochure: settings.include_brochure ? 1 : 0 },
    })
    await doc.reload()
    Object.assign(originalSettings, { ...settings })
  } catch (e) { console.error(e) }
  finally { savingSettings.value = false }
}

// --- Preview ---
const showPreview = ref(false)
const previewLoading = ref(false)
const previewError = ref('')
const previewHtml = ref('')
const previewSubject = ref('')

async function previewTemplate() {
  showPreview.value = true
  previewLoading.value = true
  previewError.value = ''
  previewHtml.value = ''
  previewSubject.value = ''
  try {
    const result = await call('meeting_manager.meeting_manager.utils.email_notifications.preview_template', { template_name: currentId.value })
    previewSubject.value = result.subject || ''
    previewHtml.value = result.body || result.html || result.message || '<p>No preview available</p>'
  } catch (e) {
    previewError.value = e.message || 'Failed to load preview'
  } finally {
    previewLoading.value = false
  }
}

// --- Activities ---
const activities = ref([])
const activitiesLoading = ref(false)
const showAllActivities = ref(false)
const visibleActivities = computed(() => showAllActivities.value ? activities.value : activities.value.slice(0, 5))

async function loadActivities() {
  activitiesLoading.value = true
  try {
    const versions = await call('frappe.client.get_list', {
      doctype: 'Version',
      filters: { ref_doctype: 'MM Email Template', docname: currentId.value },
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

onMounted(() => { loadActivities() })

// --- Delete ---
const deleteConfirm = ref({ show: false, loading: false })
function confirmDelete() { deleteConfirm.value = { show: true, loading: false } }
async function executeDelete() {
  deleteConfirm.value.loading = true
  try {
    await call('frappe.client.delete', { doctype: 'MM Email Template', name: currentId.value })
    router.push('/email-templates')
  } catch (e) { console.error(e) }
  finally { deleteConfirm.value.loading = false; deleteConfirm.value.show = false }
}

// --- Misc ---
const showAllVars = ref(false)

function formatDate(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatRelativeDate(dt) {
  if (!dt) return ''
  const diff = Date.now() - new Date(dt).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(dt)
}
</script>

<style scoped>
.etd-label {
  @apply mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400;
}
.etd-input {
  @apply mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500;
}
.etd-listbox-btn {
  @apply relative w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-left text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white;
}
.etd-listbox-options {
  @apply absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg focus:outline-none dark:border-gray-600 dark:bg-gray-900;
}
</style>
