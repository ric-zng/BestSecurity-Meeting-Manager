<template>
  <TransitionRoot :show="show" as="template">
    <HDialog class="relative z-50" @close="$emit('cancel')">
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
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                :class="variant === 'danger'
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-blue-100 dark:bg-blue-900/30'"
              >
                <FeatherIcon
                  :name="icon"
                  class="h-5 w-5"
                  :class="variant === 'danger'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-blue-600 dark:text-blue-400'"
                />
              </div>
              <div>
                <DialogTitle class="text-base font-semibold text-gray-900 dark:text-white">
                  {{ title }}
                </DialogTitle>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {{ message }}
                </p>
              </div>
            </div>

            <div class="mt-6 flex justify-end gap-2">
              <button
                class="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                :disabled="loading"
                @click="$emit('cancel')"
              >
                Cancel
              </button>
              <button
                class="rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                :class="variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'"
                :disabled="loading"
                @click="$emit('confirm')"
              >
                <span v-if="loading" class="flex items-center gap-1.5">
                  <svg class="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {{ loadingText || 'Processing...' }}
                </span>
                <span v-else>{{ confirmLabel || 'Confirm' }}</span>
              </button>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </HDialog>
  </TransitionRoot>
</template>

<script setup>
import {
  Dialog as HDialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'
import { FeatherIcon } from 'frappe-ui'

defineProps({
  show: Boolean,
  title: { type: String, default: 'Confirm' },
  message: { type: String, default: 'Are you sure?' },
  confirmLabel: { type: String, default: 'Confirm' },
  loadingText: { type: String, default: '' },
  icon: { type: String, default: 'alert-circle' },
  variant: { type: String, default: 'primary' }, // 'primary' or 'danger'
  loading: Boolean,
})

defineEmits(['confirm', 'cancel'])
</script>
