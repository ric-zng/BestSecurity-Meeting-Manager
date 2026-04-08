<template>
  <TransitionRoot :show="show" as="template">
    <HDialog class="relative z-50" @close="$emit('close')">
      <TransitionChild as="template"
        enter="duration-200 ease-out" enter-from="opacity-0" enter-to="opacity-100"
        leave="duration-150 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/30 dark:bg-black/50" />
      </TransitionChild>
      <div class="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <TransitionChild as="template"
          enter="duration-200 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100"
          leave="duration-150 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
          <DialogPanel class="w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-gray-900">
            <!-- Header with slot info -->
            <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <DialogTitle class="text-base font-semibold text-gray-900 dark:text-white">
                Create Customer Booking
              </DialogTitle>
              <div class="mt-3 rounded-md bg-blue-50 p-3 dark:bg-blue-950">
                <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                  <div>
                    <span class="text-blue-600/70 dark:text-blue-400/70">Date</span>
                    <p class="font-medium text-blue-900 dark:text-blue-200">{{ formattedDate }}</p>
                  </div>
                  <div>
                    <span class="text-blue-600/70 dark:text-blue-400/70">Time</span>
                    <p class="font-medium text-blue-900 dark:text-blue-200">{{ formatTime(slotInfo?.start) }} &ndash; {{ formatTime(slotInfo?.end) }}</p>
                  </div>
                  <div>
                    <span class="text-blue-600/70 dark:text-blue-400/70">Host</span>
                    <p class="font-medium text-blue-900 dark:text-blue-200">{{ slotInfo?.resourceTitle || 'Unassigned' }}</p>
                  </div>
                  <div>
                    <span class="text-blue-600/70 dark:text-blue-400/70">Duration</span>
                    <p class="font-medium text-blue-900 dark:text-blue-200">{{ computedDuration }} min</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step indicator -->
            <div class="border-b border-gray-200 px-6 py-3 dark:border-gray-700">
              <div class="flex items-center gap-1">
                <template v-for="(s, i) in steps" :key="s.key">
                  <button
                    class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                    :class="stepClass(i)"
                    :disabled="i > step"
                    @click="i < step && goToStep(i)"
                  >
                    <span
                      class="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                      :class="stepBadgeClass(i)"
                    >
                      <svg v-if="i < step" class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                      <span v-else>{{ i + 1 }}</span>
                    </span>
                    <span class="hidden sm:inline">{{ s.label }}</span>
                  </button>
                  <svg v-if="i < steps.length - 1" class="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
                  </svg>
                </template>
              </div>
            </div>

            <!-- Step content -->
            <div class="px-6 py-5" style="min-height: 200px;">
              <!-- Step 1: Department -->
              <div v-if="step === 0">
                <label class="lbl mb-2">Select Department <span class="text-red-500">*</span></label>
                <div class="space-y-2">
                  <button
                    v-for="dept in departments"
                    :key="dept.name"
                    class="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors"
                    :class="form.department === dept.name
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/40'
                      : 'border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50 dark:hover:bg-gray-800'"
                    @click="selectDepartment(dept.name)"
                  >
                    <div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 16.5v-13h-.25a.75.75 0 010-1.5h12.5a.75.75 0 010 1.5H16v13h.25a.75.75 0 010 1.5H3.75a.75.75 0 010-1.5H4zm3-11a.75.75 0 00-.75.75v.5c0 .414.336.75.75.75h.5a.75.75 0 00.75-.75v-.5A.75.75 0 007.5 5.5H7zm3 0a.75.75 0 00-.75.75v.5c0 .414.336.75.75.75h.5a.75.75 0 00.75-.75v-.5a.75.75 0 00-.75-.75H10zm3 0a.75.75 0 00-.75.75v.5c0 .414.336.75.75.75h.5a.75.75 0 00.75-.75v-.5a.75.75 0 00-.75-.75H13zM7 9a.75.75 0 00-.75.75v.5c0 .414.336.75.75.75h.5a.75.75 0 00.75-.75v-.5A.75.75 0 007.5 9H7zm3 0a.75.75 0 00-.75.75v.5c0 .414.336.75.75.75h.5a.75.75 0 00.75-.75v-.5A.75.75 0 0010.5 9H10zm3 0a.75.75 0 00-.75.75v.5c0 .414.336.75.75.75h.5a.75.75 0 00.75-.75v-.5A.75.75 0 0013.5 9H13z" />
                      </svg>
                    </div>
                    <div class="flex-1">
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ dept.department_name }}</span>
                    </div>
                    <svg v-if="form.department === dept.name" class="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Step 2: Meeting Type -->
              <div v-else-if="step === 1">
                <label class="lbl mb-2">Select Meeting Type <span class="text-red-500">*</span></label>
                <div v-if="loadingMeetingTypes" class="flex items-center justify-center py-8">
                  <svg class="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span class="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading meeting types...</span>
                </div>
                <div v-else-if="meetingTypes.length === 0" class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No meeting types found for this department.
                </div>
                <div v-else class="space-y-2">
                  <button
                    v-for="mt in meetingTypes"
                    :key="mt.name"
                    class="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors"
                    :class="form.meetingType === mt.name
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/40'
                      : 'border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50 dark:hover:bg-gray-800'"
                    @click="form.meetingType = mt.name"
                  >
                    <div class="flex-1">
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ mt.meeting_name }}</span>
                      <p v-if="mt.description" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ mt.description }}</p>
                    </div>
                    <svg v-if="form.meetingType === mt.name" class="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Step 3: Service Type -->
              <div v-else-if="step === 2">
                <label class="lbl mb-2">Select Service Type <span class="text-red-500">*</span></label>
                <div v-if="loadingServices" class="flex items-center justify-center py-8">
                  <svg class="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span class="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading services...</span>
                </div>
                <div v-else class="space-y-2">
                  <button
                    v-for="svc in serviceOptions"
                    :key="svc.value"
                    class="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors"
                    :class="form.serviceType === svc.value
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/40'
                      : 'border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50 dark:hover:bg-gray-800'"
                    @click="form.serviceType = svc.value"
                  >
                    <div class="flex-1">
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ svc.label }}</span>
                    </div>
                    <svg v-if="form.serviceType === svc.value" class="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Step 4: Customer -->
              <div v-else-if="step === 3">
                <label class="lbl mb-2">Customer Details</label>
                <div class="space-y-3">
                  <div class="relative">
                    <label class="sub-lbl">Search by name, email, phone, or CVR</label>
                    <input
                      v-model="customerSearch"
                      type="text"
                      placeholder="Type name, email, phone, or CVR to search..."
                      class="fld"
                      @input="debouncedSearch"
                    />
                    <div v-if="searching" class="pointer-events-none absolute right-3 top-[1.75rem]">
                      <svg class="h-4 w-4 animate-spin text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                    <ul v-if="customerResults.length" class="mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-900">
                      <li
                        v-for="c in customerResults"
                        :key="`${c.source}-${c.name}`"
                        class="cursor-pointer px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        @click="selectCustomer(c)"
                      >
                        <div class="flex items-center gap-2">
                          <span
                            class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                            :class="c.source === 'Contact'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'"
                          >
                            {{ c.source === 'Contact' ? 'Contact' : 'Customer' }}
                          </span>
                          <span class="text-sm font-medium text-gray-900 dark:text-white">{{ c.customer_name }}</span>
                        </div>
                        <div class="mt-0.5 flex flex-wrap gap-x-3 pl-[4.5rem] text-xs text-gray-500 dark:text-gray-400">
                          <span v-if="c.email">{{ c.email }}</span>
                          <span v-if="c.phone">{{ c.phone }}</span>
                          <span v-if="c.company">{{ c.company }}</span>
                          <span v-if="c.cvr" class="text-amber-600 dark:text-amber-400">CVR: {{ c.cvr }}</span>
                        </div>
                      </li>
                    </ul>
                    <p v-if="customerSearch.length >= 2 && !searching && customerResults.length === 0 && searchDone" class="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      No results found. Enter details manually below.
                    </p>
                  </div>
                  <div class="text-center text-xs text-gray-400 dark:text-gray-500">&mdash; or enter manually &mdash;</div>
                  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label class="sub-lbl">Name</label>
                      <input v-model="form.customerName" type="text" class="fld" placeholder="Full name" />
                    </div>
                    <div>
                      <label class="sub-lbl">Email <span class="text-red-500">*</span></label>
                      <input v-model="form.customerEmail" type="email" class="fld" placeholder="email@example.com" />
                    </div>
                    <div>
                      <label class="sub-lbl">Phone</label>
                      <input v-model="form.customerPhone" type="tel" class="fld" placeholder="Phone number" />
                    </div>
                    <div>
                      <label class="sub-lbl">Company</label>
                      <input v-model="form.customerCompany" type="text" class="fld" placeholder="Company name" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Step 5: Agenda & Confirm -->
              <div v-else-if="step === 4">
                <label class="lbl mb-2">Meeting Agenda</label>
                <textarea v-model="form.agenda" rows="3" class="fld" placeholder="Brief description of the meeting purpose..." />

                <!-- Summary card -->
                <div class="mt-4 rounded-md border border-gray-200 p-3 dark:border-gray-700">
                  <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Summary</h4>
                  <dl class="space-y-1.5 text-sm">
                    <div class="flex justify-between">
                      <dt class="text-gray-500 dark:text-gray-400">Department</dt>
                      <dd class="font-medium text-gray-900 dark:text-white">{{ selectedDepartmentName }}</dd>
                    </div>
                    <div class="flex justify-between">
                      <dt class="text-gray-500 dark:text-gray-400">Meeting Type</dt>
                      <dd class="font-medium text-gray-900 dark:text-white">{{ selectedMeetingTypeName }}</dd>
                    </div>
                    <div class="flex justify-between">
                      <dt class="text-gray-500 dark:text-gray-400">Service</dt>
                      <dd class="font-medium text-gray-900 dark:text-white">{{ form.serviceType }}</dd>
                    </div>
                    <div class="flex justify-between">
                      <dt class="text-gray-500 dark:text-gray-400">Customer</dt>
                      <dd class="font-medium text-gray-900 dark:text-white">{{ form.customerName || form.customerEmail }}</dd>
                    </div>
                  </dl>
                </div>

                <!-- Notifications -->
                <div class="mt-4 flex flex-wrap gap-4">
                  <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input v-model="form.notifyCustomer" type="checkbox" class="rounded border-gray-300 text-blue-600 dark:border-gray-600 dark:bg-gray-900" />
                    Notify Customer
                  </label>
                  <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input v-model="form.notifyHost" type="checkbox" class="rounded border-gray-300 text-blue-600 dark:border-gray-600 dark:bg-gray-900" />
                    Notify Host
                  </label>
                </div>
              </div>

              <!-- Error message -->
              <p v-if="errorMessage" class="mt-3 text-sm text-red-500">{{ errorMessage }}</p>
            </div>

            <!-- Footer actions -->
            <div class="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                v-if="step > 0"
                class="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                @click="step--"
              >
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
                </svg>
                Back
              </button>
              <div v-else />

              <div class="flex gap-2">
                <button
                  class="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  @click="handleClose"
                >
                  Cancel
                </button>

                <button
                  v-if="step < steps.length - 1"
                  class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="!canAdvance"
                  @click="nextStep"
                >
                  Next
                </button>

                <button
                  v-else
                  class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="submitting"
                  @click="handleSubmit"
                >
                  <span v-if="submitting" class="flex items-center gap-1.5">
                    <svg class="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating...
                  </span>
                  <span v-else>Create Booking</span>
                </button>
              </div>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </HDialog>
  </TransitionRoot>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { call } from 'frappe-ui'
import { Dialog as HDialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue'
import { useAuthStore } from '@/stores/auth'

const API_BASE = 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api'

const props = defineProps({ show: Boolean, slotInfo: Object })
const emit = defineEmits(['close', 'success'])
const auth = useAuthStore()
const departments = computed(() => auth.accessibleDepartments)

const step = ref(0)
const meetingTypes = ref([])
const loadingMeetingTypes = ref(false)
const serviceOptions = ref([])
const loadingServices = ref(false)
const customerSearch = ref('')
const customerResults = ref([])
const searching = ref(false)
const searchDone = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
let searchTimeout = null

const steps = [
  { key: 'department', label: 'Department' },
  { key: 'meetingType', label: 'Meeting Type' },
  { key: 'serviceType', label: 'Service' },
  { key: 'customer', label: 'Customer' },
  { key: 'confirm', label: 'Confirm' },
]

const form = reactive({
  department: '', meetingType: '', serviceType: '',
  customerName: '', customerEmail: '', customerPhone: '',
  customerCompany: '', agenda: '', notifyCustomer: true, notifyHost: true,
})

// Computed display names for summary
const selectedDepartmentName = computed(() => {
  const d = departments.value.find(x => x.name === form.department)
  return d?.department_name || form.department
})

const selectedMeetingTypeName = computed(() => {
  const m = meetingTypes.value.find(x => x.name === form.meetingType)
  return m?.meeting_name || form.meetingType
})

// Step validation
const canAdvance = computed(() => {
  if (step.value === 0) return !!form.department
  if (step.value === 1) return !!form.meetingType
  if (step.value === 2) return !!form.serviceType
  if (step.value === 3) return !!form.customerEmail
  return true
})

// Step styling helpers
function stepClass(i) {
  if (i < step.value) return 'cursor-pointer text-blue-600 dark:text-blue-400'
  if (i === step.value) return 'text-blue-700 dark:text-blue-300 font-semibold'
  return 'text-gray-400 dark:text-gray-300 cursor-default'
}

function stepBadgeClass(i) {
  if (i < step.value) return 'bg-blue-600 text-white dark:bg-blue-500'
  if (i === step.value) return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
  return 'bg-gray-100 text-gray-400 dark:bg-gray-600 dark:text-gray-300'
}

function goToStep(i) {
  errorMessage.value = ''
  step.value = i
}

function nextStep() {
  errorMessage.value = ''
  step.value++
}

// Fetch service options from backend
async function fetchServiceOptions() {
  if (serviceOptions.value.length) return
  loadingServices.value = true
  try {
    const res = await call(`${API_BASE}.get_filter_options`)
    serviceOptions.value = (res?.services || []).map(s => ({ value: s.value, label: s.label || s.value }))
  } catch { serviceOptions.value = [] }
  finally { loadingServices.value = false }
}

// Reset on open
watch(() => props.show, (val) => {
  if (val) {
    step.value = 0
    Object.assign(form, {
      department: '', meetingType: '', serviceType: '', customerName: '',
      customerEmail: '', customerPhone: '', customerCompany: '',
      agenda: '', notifyCustomer: true, notifyHost: true,
    })
    meetingTypes.value = []; customerSearch.value = ''; customerResults.value = []; errorMessage.value = ''
    fetchServiceOptions()
  }
})

// Load meeting types when department changes
watch(() => form.department, async (dept) => {
  form.meetingType = ''; meetingTypes.value = []
  if (!dept) return
  loadingMeetingTypes.value = true
  try {
    const res = await call(`${API_BASE}.get_department_meeting_types`, { department: dept })
    meetingTypes.value = res || []
  } catch { meetingTypes.value = [] }
  finally { loadingMeetingTypes.value = false }
})

// Auto-advance when selecting department
function selectDepartment(name) {
  form.department = name
  // Small delay so user sees selection highlight
  setTimeout(() => { if (form.department === name) step.value = 1 }, 200)
}

// Helpers
function toDate(val) {
  if (!val) return null
  return val instanceof Date ? val : new Date(val)
}

function formatTime(val) {
  const d = toDate(val)
  if (!d) return ''
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function toDateStr(val) {
  const d = toDate(val)
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toTimeStr(val) {
  const d = toDate(val)
  if (!d) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const formattedDate = computed(() => {
  const d = toDate(props.slotInfo?.start)
  if (!d) return ''
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
})

const computedDuration = computed(() => {
  const s = toDate(props.slotInfo?.start)
  const e = toDate(props.slotInfo?.end)
  if (!s || !e) return '—'
  return Math.round((e.getTime() - s.getTime()) / 60000)
})

function debouncedSearch() {
  clearTimeout(searchTimeout)
  searchDone.value = false
  if (customerSearch.value.length < 2) { customerResults.value = []; return }
  searching.value = true
  searchTimeout = setTimeout(async () => {
    try {
      const res = await call(`${API_BASE}.search_customers`, { query: customerSearch.value })
      customerResults.value = res || []
    } catch { customerResults.value = [] }
    finally { searching.value = false; searchDone.value = true }
  }, 300)
}

function selectCustomer(c) {
  form.customerName = c.customer_name || ''
  form.customerEmail = c.email || ''
  form.customerPhone = c.phone || ''
  form.customerCompany = c.company || ''
  customerSearch.value = ''
  customerResults.value = []
  searchDone.value = false
}

function handleClose() { errorMessage.value = ''; emit('close') }

async function handleSubmit() {
  errorMessage.value = ''
  if (!form.customerEmail) { errorMessage.value = 'Customer email is required'; return }
  submitting.value = true
  try {
    await call(`${API_BASE}.create_slot_booking`, {
      assigned_to: props.slotInfo?.resourceId, date: toDateStr(props.slotInfo?.start),
      start_time: toTimeStr(props.slotInfo?.start), end_time: toTimeStr(props.slotInfo?.end),
      department: form.department, meeting_type: form.meetingType, service_type: form.serviceType,
      customer_name: form.customerName, customer_email: form.customerEmail,
      customer_phone: form.customerPhone || undefined, customer_company: form.customerCompany || undefined,
      agenda: form.agenda || undefined, notify_customer: form.notifyCustomer, notify_host: form.notifyHost,
    })
    emit('close'); emit('success')
  } catch (err) { errorMessage.value = err.messages?.[0] || err.message || 'Failed to create booking' }
  finally { submitting.value = false }
}
</script>

<style scoped>
.fld { @apply w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500; }
.lbl { @apply block text-xs font-medium text-gray-700 dark:text-gray-300; }
.sub-lbl { @apply block text-xs text-gray-500 dark:text-gray-400 mb-1; }
</style>
