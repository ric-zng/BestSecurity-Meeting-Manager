<template>
  <TransitionRoot :show="show" as="template">
    <HDialog class="relative z-50" @close="$emit('close')">
      <TransitionChild
        as="template"
        enter="duration-200 ease-out" enter-from="opacity-0" enter-to="opacity-100"
        leave="duration-150 ease-in" leave-from="opacity-100" leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/30 dark:bg-black/50" />
      </TransitionChild>
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <TransitionChild
          as="template"
          enter="duration-200 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100"
          leave="duration-150 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95"
        >
          <DialogPanel class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
            <DialogTitle class="text-base font-semibold text-gray-900 dark:text-white">
              Block Time Slot
            </DialogTitle>

            <!-- Slot info card -->
            <div class="mt-4 rounded-md bg-gray-800 p-3 dark:bg-gray-800">
              <dl class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <dt class="text-gray-400">For</dt>
                  <dd class="font-medium text-white">
                    {{ slotInfo?.resourceTitle || 'Unassigned' }}
                  </dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-400">Date</dt>
                  <dd class="font-medium text-white">{{ formattedDate }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-400">Time</dt>
                  <dd class="font-medium text-white">
                    {{ formatTime(slotInfo?.start) }} &ndash; {{ formatTime(slotInfo?.end) }}
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Form -->
            <div class="mt-4">
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reason <span class="text-red-500">*</span>
              </label>
              <input
                v-model="reason"
                type="text"
                placeholder="e.g. Lunch break, Team standup, Personal time..."
                class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
              <p v-if="validationError" class="mt-1 text-xs text-red-500">{{ validationError }}</p>
            </div>

            <!-- Actions -->
            <div class="mt-6 flex justify-end gap-2">
              <button
                class="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                @click="handleClose"
              >
                Cancel
              </button>
              <button
                class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
                :disabled="submitting"
                @click="handleSubmit"
              >
                <span v-if="submitting" class="flex items-center gap-1.5">
                  <svg class="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Blocking...
                </span>
                <span v-else>Block Slot</span>
              </button>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </HDialog>
  </TransitionRoot>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { call } from 'frappe-ui'
import {
  Dialog as HDialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'

const props = defineProps({
  show: Boolean,
  slotInfo: Object,
})

const emit = defineEmits(['close', 'success'])

const reason = ref('')
const submitting = ref(false)
const validationError = ref('')

watch(() => props.show, (val) => {
  if (val) {
    reason.value = ''
    validationError.value = ''
  }
})

function toDate(val) {
  if (!val) return null
  return val instanceof Date ? val : new Date(val)
}

function formatTime(val) {
  const d = toDate(val)
  if (!d) return ''
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function toDateStr(val) {
  const d = toDate(val)
  if (!d) return ''
  return d.toISOString().split('T')[0]
}

function toTimeStr(val) {
  const d = toDate(val)
  if (!d) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const formattedDate = computed(() => {
  const d = toDate(props.slotInfo?.start)
  if (!d) return ''
  return d.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
})

function handleClose() {
  reason.value = ''
  validationError.value = ''
  emit('close')
}

async function handleSubmit() {
  validationError.value = ''
  if (!reason.value.trim()) {
    validationError.value = 'Reason is required'
    return
  }

  submitting.value = true
  try {
    await call(
      'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.create_blocked_slot',
      {
        user: props.slotInfo?.resourceId,
        date: toDateStr(props.slotInfo?.start),
        start_time: toTimeStr(props.slotInfo?.start),
        end_time: toTimeStr(props.slotInfo?.end),
        reason: reason.value.trim(),
      }
    )
    reason.value = ''
    emit('close')
    emit('success')
  } catch (err) {
    validationError.value = err.messages?.[0] || err.message || 'Failed to block slot'
  } finally {
    submitting.value = false
  }
}
</script>
