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
              Change Status
            </DialogTitle>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Update the booking status for {{ booking.name }}.
            </p>
            <div class="mt-4 space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">New Status</label>
                <select
                  v-model="statusForm.newStatus"
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="" disabled>Select status...</option>
                  <option v-for="s in validStatuses" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <textarea
                  v-model="statusForm.notes"
                  rows="3"
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  placeholder="Add a note about this status change..."
                />
              </div>
            </div>
            <div class="mt-6 flex justify-end gap-2">
              <Button variant="subtle" label="Cancel" @click="$emit('close')" />
              <Button
                variant="solid"
                label="Update Status"
                :loading="updateStatusResource.loading"
                :disabled="!statusForm.newStatus"
                @click="handleUpdateStatus"
              />
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </HDialog>
  </TransitionRoot>
</template>

<script setup>
import { computed, reactive } from 'vue'
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

const allStatuses = [
  'New Appointment',
  'New Booking',
  'Booking Started',
  'Sale Approved',
  'Booking Approved Not Sale',
  'Call Customer About Sale',
  'No Answer 1-3',
  'No Answer 4-5',
  'Customer Unsure',
  'No Contact About Offer',
  'Cancelled',
  'Optimising Not Possible',
  'Not Possible',
  'Rebook',
  'Rebook Earlier',
  'Consent Sent Awaiting',
]

const validStatuses = computed(() =>
  allStatuses.filter((s) => s !== props.booking?.booking_status)
)

const statusForm = reactive({ newStatus: '', notes: '' })

const updateStatusResource = createResource({
  url: 'meeting_manager.meeting_manager.api.booking.update_booking_status',
  onSuccess(res) {
    if (res.success) {
      toast({ title: 'Status updated successfully', icon: 'check' })
      statusForm.newStatus = ''
      statusForm.notes = ''
      emit('close')
      emit('success')
    } else {
      toast.error(res.message || 'Failed to update status')
    }
  },
  onError(err) {
    toast.error(err.messages?.[0] || err.message || 'Failed to update status')
  },
})

function handleUpdateStatus() {
  updateStatusResource.submit({
    booking_id: props.booking.name,
    new_status: statusForm.newStatus,
    notes: statusForm.notes || undefined,
  })
}
</script>
