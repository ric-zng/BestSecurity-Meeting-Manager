<template>
  <Teleport to="body">
    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="show && event"
        class="fixed z-[100] w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-700 dark:bg-gray-800"
        :style="{ top: position.y + 'px', left: position.x + 'px' }"
      >
        <!-- Header: status badge + close -->
        <div class="flex items-center justify-between mb-2">
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full text-white"
            :style="{ backgroundColor: statusColor }"
          >
            {{ ep.status || 'Unknown' }}
          </span>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Title -->
        <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-2 truncate">
          {{ event.title }}
        </h4>

        <!-- Details -->
        <dl class="space-y-1.5 text-xs">
          <!-- Time range -->
          <div class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">Time</dt>
            <dd class="text-gray-900 dark:text-gray-100 font-medium">
              {{ formatTime(event.start) }} &ndash; {{ formatTime(event.end) }}
              <span v-if="ep.duration" class="text-gray-400 dark:text-gray-500 ml-1">({{ ep.duration }}m)</span>
            </dd>
          </div>

          <!-- Customer name (external only) -->
          <div v-if="ep.customer_name && !ep.is_internal" class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">Customer</dt>
            <dd class="text-gray-900 dark:text-gray-100">{{ ep.customer_name }}</dd>
          </div>

          <!-- Meeting type -->
          <div v-if="ep.meeting_type" class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">Type</dt>
            <dd class="text-gray-900 dark:text-gray-100">{{ ep.meeting_type }}</dd>
          </div>

          <!-- Department -->
          <div v-if="ep.department" class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">Department</dt>
            <dd class="text-gray-900 dark:text-gray-100">{{ ep.department }}</dd>
          </div>

          <!-- Host -->
          <div v-if="ep.host_name" class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">Host</dt>
            <dd class="text-gray-900 dark:text-gray-100">{{ ep.host_name }}</dd>
          </div>

          <!-- Service type -->
          <div v-if="ep.service_type" class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">Service</dt>
            <dd class="text-gray-900 dark:text-gray-100">{{ ep.service_type }}</dd>
          </div>

          <!-- Team meeting indicator -->
          <div v-if="ep.is_internal" class="flex justify-between">
            <dt class="text-gray-500 dark:text-gray-400">Category</dt>
            <dd class="text-blue-600 dark:text-blue-400 font-medium">Team Meeting</dd>
          </div>
        </dl>

        <!-- Description -->
        <p v-if="ep.description" class="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 border-t border-gray-100 dark:border-gray-700 pt-2">
          {{ ep.description }}
        </p>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getStatusColor } from '@/composables/useCalendarState'

const props = defineProps<{
  show: boolean
  event: {
    title: string
    start: string | Date
    end: string | Date
    extendedProps: Record<string, any>
  } | null
  position: { x: number; y: number }
}>()

defineEmits<{ close: [] }>()

const ep = computed(() => props.event?.extendedProps || {})
const statusColor = computed(() => getStatusColor(ep.value.status || ''))

function formatTime(date: string | Date | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
}
</script>
