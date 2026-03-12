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
          <DialogPanel class="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
            <DialogTitle class="text-base font-semibold text-gray-900 dark:text-white">Create Customer Booking</DialogTitle>
            <!-- Slot info card -->
            <div class="mt-4 rounded-md bg-blue-50 p-3 dark:bg-blue-950">
              <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                <div><span class="text-blue-600/70 dark:text-blue-400/70">Date</span>
                  <p class="font-medium text-blue-900 dark:text-blue-200">{{ formattedDate }}</p></div>
                <div><span class="text-blue-600/70 dark:text-blue-400/70">Time</span>
                  <p class="font-medium text-blue-900 dark:text-blue-200">{{ slotInfo?.startTime }} &ndash; {{ slotInfo?.endTime }}</p></div>
                <div><span class="text-blue-600/70 dark:text-blue-400/70">Host</span>
                  <p class="font-medium text-blue-900 dark:text-blue-200">{{ slotInfo?.resourceTitle || 'Unassigned' }}</p></div>
                <div><span class="text-blue-600/70 dark:text-blue-400/70">Duration</span>
                  <p class="font-medium text-blue-900 dark:text-blue-200">{{ slotInfo?.duration || '&mdash;' }} min</p></div>
              </div>
            </div>
            <!-- Form -->
            <div class="mt-5 space-y-4">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="lbl">Department <span class="text-red-500">*</span></label>
                  <select v-model="form.department" class="fld">
                    <option value="" disabled>Select department...</option>
                    <option v-for="dept in departments" :key="dept.name" :value="dept.name">{{ dept.department_name }}</option>
                  </select>
                </div>
                <div>
                  <label class="lbl">Meeting Type <span class="text-red-500">*</span></label>
                  <select v-model="form.meetingType" class="fld" :disabled="!form.department || loadingMeetingTypes">
                    <option value="" disabled>{{ loadingMeetingTypes ? 'Loading...' : 'Select meeting type...' }}</option>
                    <option v-for="mt in meetingTypes" :key="mt.name" :value="mt.name">{{ mt.title }}</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="lbl">Service Type <span class="text-red-500">*</span></label>
                <select v-model="form.serviceType" class="fld">
                  <option value="" disabled>Select service type...</option>
                  <option value="In-Person">In-Person</option>
                  <option value="Video Call">Video Call</option>
                  <option value="Phone Call">Phone Call</option>
                </select>
              </div>
              <!-- Customer section -->
              <fieldset class="rounded-md border border-gray-200 p-4 dark:border-gray-700">
                <legend class="px-1 text-xs font-medium text-gray-700 dark:text-gray-300">Customer</legend>
                <div class="mb-3">
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Search existing customer</label>
                  <input v-model="customerSearch" type="text" placeholder="Type name or email to search..." class="fld" @input="debouncedSearch" />
                  <ul v-if="customerResults.length" class="mt-1 max-h-32 overflow-y-auto rounded-md border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800">
                    <li v-for="c in customerResults" :key="c.name" class="cursor-pointer px-3 py-1.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30" @click="selectCustomer(c)">
                      <span class="text-gray-900 dark:text-white">{{ c.customer_name }}</span>
                      <span class="ml-2 text-xs text-gray-400">{{ c.email }}</span>
                    </li>
                  </ul>
                </div>
                <div class="mb-2 text-center text-xs text-gray-400 dark:text-gray-500">&mdash; or enter manually &mdash;</div>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div><label class="sub-lbl">Name</label>
                    <input v-model="form.customerName" type="text" class="fld" placeholder="Full name" /></div>
                  <div><label class="sub-lbl">Email <span class="text-red-500">*</span></label>
                    <input v-model="form.customerEmail" type="email" class="fld" placeholder="email@example.com" /></div>
                  <div><label class="sub-lbl">Phone</label>
                    <input v-model="form.customerPhone" type="tel" class="fld" placeholder="Phone number" /></div>
                  <div><label class="sub-lbl">Company</label>
                    <input v-model="form.customerCompany" type="text" class="fld" placeholder="Company name" /></div>
                </div>
              </fieldset>
              <div>
                <label class="lbl">Meeting Agenda</label>
                <textarea v-model="form.agenda" rows="2" class="fld" placeholder="Brief description of the meeting purpose..." />
              </div>
              <div class="flex flex-wrap gap-4">
                <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input v-model="form.notifyCustomer" type="checkbox" class="rounded border-gray-300 text-blue-600 dark:border-gray-600 dark:bg-gray-800" /> Notify Customer</label>
                <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input v-model="form.notifyHost" type="checkbox" class="rounded border-gray-300 text-blue-600 dark:border-gray-600 dark:bg-gray-800" /> Notify Host</label>
              </div>
            </div>
            <p v-if="errorMessage" class="mt-3 text-sm text-red-500">{{ errorMessage }}</p>
            <div class="mt-6 flex justify-end gap-2">
              <button class="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" @click="handleClose">Cancel</button>
              <button class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="submitting" @click="handleSubmit">
                <span v-if="submitting" class="flex items-center gap-1.5">
                  <svg class="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Creating...</span>
                <span v-else>Create Booking</span>
              </button>
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

const props = defineProps({ show: Boolean, slotInfo: Object })
const emit = defineEmits(['close', 'success'])
const auth = useAuthStore()
const departments = computed(() => auth.accessibleDepartments)
const meetingTypes = ref([])
const loadingMeetingTypes = ref(false)
const customerSearch = ref('')
const customerResults = ref([])
const submitting = ref(false)
const errorMessage = ref('')
let searchTimeout = null

const form = reactive({
  department: '', meetingType: '', serviceType: '',
  customerName: '', customerEmail: '', customerPhone: '',
  customerCompany: '', agenda: '', notifyCustomer: true, notifyHost: true,
})

watch(() => props.show, (val) => {
  if (val) {
    Object.assign(form, {
      department: '', meetingType: '', serviceType: '', customerName: '',
      customerEmail: '', customerPhone: '', customerCompany: '',
      agenda: '', notifyCustomer: true, notifyHost: true,
    })
    meetingTypes.value = []; customerSearch.value = ''; customerResults.value = []; errorMessage.value = ''
  }
})

watch(() => form.department, async (dept) => {
  form.meetingType = ''; meetingTypes.value = []
  if (!dept) return
  loadingMeetingTypes.value = true
  try {
    const res = await call('meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.get_department_meeting_types', { department: dept })
    meetingTypes.value = res || []
  } catch { meetingTypes.value = [] }
  finally { loadingMeetingTypes.value = false }
})

const formattedDate = computed(() => {
  if (!props.slotInfo?.date) return ''
  const d = new Date(props.slotInfo.date + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
})

function debouncedSearch() {
  clearTimeout(searchTimeout)
  if (customerSearch.value.length < 2) { customerResults.value = []; return }
  searchTimeout = setTimeout(async () => {
    try {
      const res = await call('frappe.client.get_list', {
        doctype: 'Contact',
        filters: [['name', 'like', `%${customerSearch.value}%`]],
        or_filters: [['email_id', 'like', `%${customerSearch.value}%`], ['first_name', 'like', `%${customerSearch.value}%`]],
        fields: ['name', 'first_name as customer_name', 'email_id as email'],
        limit_page_length: 5,
      })
      customerResults.value = res || []
    } catch { customerResults.value = [] }
  }, 300)
}

function selectCustomer(c) {
  form.customerName = c.customer_name || ''; form.customerEmail = c.email || ''
  customerSearch.value = ''; customerResults.value = []
}

function handleClose() { errorMessage.value = ''; emit('close') }

async function handleSubmit() {
  errorMessage.value = ''
  if (!form.department) { errorMessage.value = 'Department is required'; return }
  if (!form.meetingType) { errorMessage.value = 'Meeting type is required'; return }
  if (!form.serviceType) { errorMessage.value = 'Service type is required'; return }
  if (!form.customerEmail) { errorMessage.value = 'Customer email is required'; return }
  submitting.value = true
  try {
    await call('meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.create_slot_booking', {
      assigned_to: props.slotInfo?.resourceId, date: props.slotInfo?.date,
      start_time: props.slotInfo?.startTime, end_time: props.slotInfo?.endTime,
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
.fld { @apply w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500; }
.lbl { @apply block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1; }
.sub-lbl { @apply block text-xs text-gray-500 dark:text-gray-400 mb-1; }
</style>
