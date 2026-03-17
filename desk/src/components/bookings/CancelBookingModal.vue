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
          <DialogPanel class="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <FeatherIcon name="alert-triangle" class="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <DialogTitle class="text-base font-semibold text-gray-900 dark:text-white">
                  Cancel Booking
                </DialogTitle>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to cancel <strong>{{ booking.name }}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div class="mt-6 flex justify-end gap-2">
              <Button variant="subtle" label="Keep Booking" @click="$emit('close')" />
              <Button
                theme="red"
                variant="solid"
                label="Cancel Booking"
                :loading="cancelResource.loading"
                @click="handleCancel"
              />
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </HDialog>
  </TransitionRoot>
</template>

<script setup>
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

const cancelResource = createResource({
  url: 'meeting_manager.meeting_manager.api.booking.update_booking_status',
  onSuccess(res) {
    if (res.success) {
      toast({ title: 'Booking cancelled', icon: 'check' })
      emit('close')
      emit('success')
    } else {
      toast.error(res.message || 'Failed to cancel booking')
    }
  },
  onError(err) {
    toast.error(err.messages?.[0] || err.message || 'Failed to cancel booking')
  },
})

function handleCancel() {
  cancelResource.submit({
    booking_id: props.booking.name,
    new_status: 'Cancelled',
    notes: 'Cancelled from booking detail page',
  })
}
</script>
