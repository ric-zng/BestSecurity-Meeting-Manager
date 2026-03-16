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
          <DialogPanel class="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
            <!-- Icon + Title -->
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <svg class="h-5 w-5 text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" />
                </svg>
              </div>
              <div>
                <DialogTitle class="text-base font-semibold text-gray-900 dark:text-white">
                  Delete Blocked Slot
                </DialogTitle>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  This will remove the blocked time slot. The time will become available for bookings again.
                </p>
              </div>
            </div>

            <!-- Slot details -->
            <div v-if="slotInfo" class="mt-4 rounded-md bg-red-50 p-3 dark:bg-red-950/30">
              <dl class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <dt class="text-red-600/70 dark:text-red-400/70">Reason</dt>
                  <dd class="font-medium text-red-900 dark:text-red-200">{{ slotInfo.title || 'Blocked' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-red-600/70 dark:text-red-400/70">Host</dt>
                  <dd class="font-medium text-red-900 dark:text-red-200">{{ slotInfo.resourceTitle || 'Unknown' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-red-600/70 dark:text-red-400/70">Time</dt>
                  <dd class="font-medium text-red-900 dark:text-red-200">
                    {{ formatTime(slotInfo.start) }} &ndash; {{ formatTime(slotInfo.end) }}
                  </dd>
                </div>
              </dl>
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
                class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="deleting"
                @click="handleDelete"
              >
                <span v-if="deleting" class="flex items-center gap-1.5">
                  <svg class="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Deleting...
                </span>
                <span v-else>Delete</span>
              </button>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </HDialog>
  </TransitionRoot>
</template>

<script setup>
import { ref, watch } from 'vue'
import {
  Dialog as HDialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'

const props = defineProps({
  show: Boolean,
  slotInfo: Object, // { title, resourceTitle, start, end, slotName }
})

const emit = defineEmits(['close', 'confirm'])
const deleting = ref(false)

watch(() => props.show, (val) => {
  if (val) deleting.value = false
})

function formatTime(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
}

async function handleDelete() {
  deleting.value = true
  emit('confirm', props.slotInfo?.slotName)
}
</script>
