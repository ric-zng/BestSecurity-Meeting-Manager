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
              Reschedule Booking
            </DialogTitle>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Pick a new date and time for this booking.
            </p>
            <div class="mt-4 space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">New Date</label>
                <input
                  v-model="rescheduleForm.newDate"
                  type="date"
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">New Time</label>
                <input
                  v-model="rescheduleForm.newTime"
                  type="time"
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (optional)</label>
                <textarea
                  v-model="rescheduleForm.reason"
                  rows="2"
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  placeholder="Reason for rescheduling..."
                />
              </div>
            </div>
            <div class="mt-6 flex justify-end gap-2">
              <Button variant="subtle" label="Cancel" @click="$emit('close')" />
              <Button
                variant="solid"
                label="Reschedule"
                :loading="rescheduleResource.loading"
                :disabled="!rescheduleForm.newDate || !rescheduleForm.newTime"
                @click="handleReschedule"
              />
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </HDialog>
  </TransitionRoot>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { createResource, toast } from 'frappe-ui'
import {
  Dialog as HDialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'

const props = defineProps({
  show: Boolean,
  booking: Object,
})

const emit = defineEmits(['close', 'success'])

const rescheduleForm = reactive({ newDate: '', newTime: '', reason: '' })

// Pre-fill reschedule form with current date/time when modal opens
watch(() => props.show, (val) => {
  if (val && props.booking?.start_datetime) {
    const dt = new Date(props.booking.start_datetime)
    rescheduleForm.newDate = dt.toISOString().split('T')[0]
    rescheduleForm.newTime = dt.toTimeString().substring(0, 5)
  }
})

const rescheduleResource = createResource({
  url: 'meeting_manager.meeting_manager.api.booking.reschedule_booking_internal',
  onSuccess(res) {
    if (res.success) {
      toast({ title: 'Booking rescheduled successfully', icon: 'check' })
      rescheduleForm.newDate = ''
      rescheduleForm.newTime = ''
      rescheduleForm.reason = ''
      emit('close')
      emit('success')
    } else {
      toast.error(res.message || 'Failed to reschedule')
    }
  },
  onError(err) {
    toast.error(err.messages?.[0] || err.message || 'Failed to reschedule')
  },
})

function handleReschedule() {
  rescheduleResource.submit({
    booking_id: props.booking.name,
    new_date: rescheduleForm.newDate,
    new_time: rescheduleForm.newTime,
    reason: rescheduleForm.reason || undefined,
  })
}
</script>
