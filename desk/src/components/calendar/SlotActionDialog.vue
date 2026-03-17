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
            <DialogTitle class="text-base font-semibold text-gray-900 dark:text-white">
              Select Action
            </DialogTitle>

            <!-- Slot info card -->
            <div class="mt-4 rounded-md bg-gray-50 p-3 dark:bg-gray-800">
              <dl class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Date</dt>
                  <dd class="font-medium text-gray-900 dark:text-white">{{ formattedDate }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Time</dt>
                  <dd class="font-medium text-gray-900 dark:text-white">
                    {{ formattedStartTime }} &ndash; {{ formattedEndTime }}
                  </dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Team Member</dt>
                  <dd class="font-medium text-gray-900 dark:text-white">
                    {{ slotInfo?.resourceTitle || 'Unassigned' }}
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Action buttons -->
            <div class="mt-5 space-y-3">
              <button
                class="flex w-full items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-left transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900"
                @click="$emit('create-booking', slotInfo)"
              >
                <svg class="h-5 w-5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5.25 12a.75.75 0 01.75-.75h3.25V8a.75.75 0 011.5 0v3.25H14a.75.75 0 010 1.5h-3.25V16a.75.75 0 01-1.5 0v-3.25H6a.75.75 0 01-.75-.75z" />
                  <path fill-rule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clip-rule="evenodd" />
                </svg>
                <div>
                  <span class="text-sm font-semibold text-blue-700 dark:text-blue-300">Create Booking</span>
                  <p class="text-xs text-blue-600/70 dark:text-blue-400/70">Schedule a customer meeting</p>
                </div>
              </button>

              <button
                v-if="canBlockSlots"
                class="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                @click="$emit('block-slot', slotInfo)"
              >
                <svg class="h-5 w-5 text-gray-600 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.28 7.72a.75.75 0 00-1.06 1.06l7.5 7.5a.75.75 0 101.06-1.06l-7.5-7.5z" clip-rule="evenodd" />
                </svg>
                <div>
                  <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">Block Slot</span>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Mark this time as unavailable</p>
                </div>
              </button>
            </div>

            <div class="mt-4 flex justify-end">
              <button
                class="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                @click="$emit('close')"
              >
                Cancel
              </button>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </HDialog>
  </TransitionRoot>
</template>

<script setup>
import { computed } from 'vue'
import {
  Dialog as HDialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  show: Boolean,
  slotInfo: Object, // { start: Date, end: Date, resourceId, resourceTitle }
})

defineEmits(['close', 'create-booking', 'block-slot'])

const auth = useAuthStore()

const canBlockSlots = computed(() => {
  return auth.isDepartmentLeader || auth.isSystemManager
})

function formatTime(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const formattedDate = computed(() => {
  if (!props.slotInfo?.start) return ''
  const d = props.slotInfo.start instanceof Date ? props.slotInfo.start : new Date(props.slotInfo.start)
  return d.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
})

const formattedStartTime = computed(() => formatTime(props.slotInfo?.start))
const formattedEndTime = computed(() => formatTime(props.slotInfo?.end))
</script>
