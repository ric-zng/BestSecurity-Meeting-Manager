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
              {{ dialogTitle }}
            </DialogTitle>

            <!-- Meeting details card -->
            <div class="mt-4 rounded-md bg-gray-50 p-3 dark:bg-gray-900">
              <dl class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Meeting</dt>
                  <dd class="font-medium text-gray-900 dark:text-white">{{ dragInfo?.eventTitle }}</dd>
                </div>
                <div v-if="dragInfo?.meetingType" class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Type</dt>
                  <dd class="text-gray-700 dark:text-gray-300">{{ dragInfo.meetingType }}</dd>
                </div>
                <div v-if="dragInfo?.customerName" class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Customer</dt>
                  <dd class="text-gray-700 dark:text-gray-300">{{ dragInfo.customerName }}</dd>
                </div>
                <div v-if="dragInfo?.department" class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Department</dt>
                  <dd class="text-gray-700 dark:text-gray-300">{{ dragInfo.department }}</dd>
                </div>
                <div v-if="dragInfo?.status" class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Status</dt>
                  <dd>
                    <span
                      class="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="statusClasses"
                    >
                      {{ dragInfo.status }}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Changes section -->
            <div class="mt-4 space-y-3">
              <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Changes
              </h4>

              <!-- Time change -->
              <div v-if="hasTimeChange" class="flex items-center gap-2 text-sm">
                <svg class="h-4 w-4 shrink-0 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clip-rule="evenodd" />
                </svg>
                <div>
                  <span class="text-gray-500 line-through dark:text-gray-400">{{ formatDateTime(dragInfo?.oldStart) }}</span>
                  <span class="mx-1 text-gray-400">&rarr;</span>
                  <span class="font-medium text-gray-900 dark:text-white">{{ formatDateTime(dragInfo?.newStart) }}</span>
                </div>
              </div>

              <!-- End time / duration change (resize) -->
              <div v-if="hasEndTimeChange" class="flex items-center gap-2 text-sm">
                <svg class="h-4 w-4 shrink-0 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clip-rule="evenodd" />
                </svg>
                <div>
                  <span class="text-xs text-gray-400">End:</span>
                  <span class="ml-1 text-gray-500 line-through dark:text-gray-400">{{ formatTime(dragInfo?.oldEnd) }}</span>
                  <span class="mx-1 text-gray-400">&rarr;</span>
                  <span class="font-medium text-gray-900 dark:text-white">{{ formatTime(dragInfo?.newEnd) }}</span>
                </div>
              </div>

              <!-- Host change -->
              <div v-if="hasHostChange" class="flex items-center gap-2 text-sm">
                <svg class="h-4 w-4 shrink-0 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                </svg>
                <div>
                  <span class="text-gray-500 line-through dark:text-gray-400">{{ dragInfo?.oldResource }}</span>
                  <span class="mx-1 text-gray-400">&rarr;</span>
                  <span class="font-medium text-gray-900 dark:text-white">{{ dragInfo?.newResource }}</span>
                </div>
              </div>
            </div>

            <!-- Notification options -->
            <div class="mt-5 space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
              <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Notifications
              </h4>

              <!-- Customer booking notifications -->
              <template v-if="!dragInfo?.isInternal">
                <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    v-model="notifications.notifyCustomer"
                    type="checkbox"
                    class="rounded border-gray-300 text-blue-600 dark:border-gray-600 dark:bg-gray-900"
                  />
                  Notify Customer
                </label>
                <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    v-model="notifications.notifyHost"
                    type="checkbox"
                    class="rounded border-gray-300 text-blue-600 dark:border-gray-600 dark:bg-gray-900"
                  />
                  Notify Host
                </label>
              </template>

              <!-- Team meeting notifications -->
              <template v-else>
                <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    v-model="notifications.notifyHost"
                    type="checkbox"
                    class="rounded border-gray-300 text-blue-600 dark:border-gray-600 dark:bg-gray-900"
                  />
                  Notify Host
                </label>
                <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    v-model="notifications.notifyParticipants"
                    type="checkbox"
                    class="rounded border-gray-300 text-blue-600 dark:border-gray-600 dark:bg-gray-900"
                  />
                  Notify Participants
                </label>
              </template>
            </div>

            <!-- Actions -->
            <div class="mt-6 flex justify-end gap-2">
              <button
                class="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                @click="$emit('close')"
              >
                Cancel
              </button>
              <button
                class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                @click="handleConfirm"
              >
                Confirm
              </button>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </HDialog>
  </TransitionRoot>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'
import {
  Dialog as HDialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'

const props = defineProps({
  show: Boolean,
  dragInfo: Object,
})

const emit = defineEmits(['close', 'confirm'])

const notifications = reactive({
  notifyCustomer: true,
  notifyHost: true,
  notifyParticipants: true,
})

// Reset notifications when dialog opens
watch(() => props.show, (val) => {
  if (val) {
    notifications.notifyCustomer = true
    notifications.notifyHost = true
    notifications.notifyParticipants = true
  }
})

const dialogTitle = computed(() => {
  const titles = {
    reassign: 'Reassign Meeting',
    reschedule: 'Reschedule Meeting',
    reassign_reschedule: 'Reassign & Reschedule',
  }
  return titles[props.dragInfo?.actionType] || 'Confirm Change'
})

const hasTimeChange = computed(() => {
  return props.dragInfo?.actionType === 'reschedule' ||
    props.dragInfo?.actionType === 'reassign_reschedule'
})

const hasHostChange = computed(() => {
  return props.dragInfo?.actionType === 'reassign' ||
    props.dragInfo?.actionType === 'reassign_reschedule'
})

const hasEndTimeChange = computed(() => {
  if (!props.dragInfo?.oldEnd || !props.dragInfo?.newEnd) return false
  return new Date(props.dragInfo.oldEnd).getTime() !== new Date(props.dragInfo.newEnd).getTime()
})

const statusClasses = computed(() => {
  const s = props.dragInfo?.status?.toLowerCase()
  if (s === 'confirmed') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  if (s === 'pending') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
  if (s === 'cancelled') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
})

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function handleConfirm() {
  emit('confirm', {
    notifyCustomer: notifications.notifyCustomer,
    notifyHost: notifications.notifyHost,
    notifyParticipants: notifications.notifyParticipants,
  })
}
</script>
