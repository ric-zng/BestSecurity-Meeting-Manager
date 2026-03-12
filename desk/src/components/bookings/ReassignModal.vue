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
              Reassign Booking
            </DialogTitle>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Select a team member to reassign this booking to.
            </p>
            <div class="mt-4 space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Assign To</label>
                <select
                  v-model="reassignForm.newAssignedTo"
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="" disabled>Select team member...</option>
                  <option
                    v-for="m in departmentMembers"
                    :key="m.user"
                    :value="m.user"
                  >
                    {{ m.full_name || m.user }}
                  </option>
                </select>
                <div v-if="membersResource.loading" class="mt-1 flex items-center gap-1 text-xs text-gray-400">
                  <LoadingSpinner size="sm" />
                  Loading members...
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (optional)</label>
                <textarea
                  v-model="reassignForm.reason"
                  rows="2"
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  placeholder="Reason for reassignment..."
                />
              </div>
            </div>
            <div class="mt-6 flex justify-end gap-2">
              <Button variant="subtle" label="Cancel" @click="$emit('close')" />
              <Button
                variant="solid"
                label="Reassign"
                :loading="reassignResource.loading"
                :disabled="!reassignForm.newAssignedTo"
                @click="handleReassign"
              />
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </HDialog>
  </TransitionRoot>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { createResource, toast } from 'frappe-ui'
import {
  Dialog as HDialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'

const props = defineProps({
  show: Boolean,
  booking: Object,
  departmentName: String,
})

const emit = defineEmits(['close', 'success'])

const reassignForm = reactive({ newAssignedTo: '', reason: '' })
const departmentMembers = ref([])

const membersResource = createResource({
  url: 'meeting_manager.meeting_manager.api.booking.get_department_members',
  onSuccess(res) {
    departmentMembers.value = res || []
  },
})

// Fetch department members when modal opens
watch(() => props.show, (val) => {
  if (val) {
    reassignForm.newAssignedTo = ''
    reassignForm.reason = ''
    if (props.departmentName) {
      membersResource.submit({ department: props.departmentName })
    }
  }
})

const reassignResource = createResource({
  url: 'meeting_manager.meeting_manager.api.booking.reassign_booking',
  onSuccess(res) {
    if (res.success) {
      toast({ title: 'Booking reassigned successfully', icon: 'check' })
      emit('close')
      emit('success')
    } else {
      toast.error(res.message || 'Failed to reassign')
    }
  },
  onError(err) {
    toast.error(err.messages?.[0] || err.message || 'Failed to reassign')
  },
})

function handleReassign() {
  reassignResource.submit({
    booking_id: props.booking.name,
    new_assigned_to: reassignForm.newAssignedTo,
    reason: reassignForm.reason || undefined,
  })
}
</script>
