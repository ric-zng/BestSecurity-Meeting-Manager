<template>
  <div class="space-y-0">
    <!-- Main toolbar row -->
    <div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <!-- Left: Calendar nav + title slot -->
      <div class="flex items-center gap-2">
        <button
          @click="$emit('navigate', 'prev')"
          class="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <FeatherIcon name="chevron-left" class="w-4 h-4" />
        </button>
        <button
          @click="$emit('navigate', 'next')"
          class="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <FeatherIcon name="chevron-right" class="w-4 h-4" />
        </button>
        <button
          @click="$emit('navigate', 'today')"
          class="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Today
        </button>
        <slot name="title" />
      </div>

      <!-- Right: Filters + view toggles + new booking -->
      <div class="flex items-center gap-2">
        <!-- Department focus dropdown -->
        <select
          v-model="localFocusDept"
          @change="$emit('set-focus-department', localFocusDept)"
          class="h-8 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Departments</option>
          <option v-for="d in departments" :key="d.name" :value="d.name">
            {{ d.department_name }}
          </option>
        </select>

        <!-- Service type dropdown -->
        <select
          :value="activeServices.length === serviceTypes.length ? '' : activeServices[0] || ''"
          @change="onServiceChange($event)"
          class="h-8 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Services</option>
          <option v-for="s in serviceTypes" :key="s" :value="s">{{ s }}</option>
        </select>

        <!-- View toggles -->
        <div class="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          <button
            v-for="v in views"
            :key="v.key"
            @click="$emit('change-view', v.key)"
            class="px-3 py-1.5 text-xs font-medium transition-colors"
            :class="v.key === currentView
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
          >
            {{ v.label }}
          </button>
        </div>

        <!-- Orientation toggle -->
        <button
          @click="$emit('toggle-orientation')"
          class="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
          :title="orientation === 'vertical' ? 'Switch to horizontal' : 'Switch to vertical'"
        >
          {{ orientation === 'vertical' ? '\u21C4' : '\u21C5' }}
        </button>

        <!-- New Booking -->
        <button
          @click="$emit('new-booking')"
          class="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          + New Booking
        </button>
      </div>
    </div>

    <!-- Filter row: Status toggles -->
    <div
      v-if="statuses.length"
      class="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
    >
      <span class="text-xs text-gray-500 dark:text-gray-400 mr-1">Status:</span>
      <button
        v-for="s in statuses"
        :key="s.value"
        @click="$emit('toggle-status', s.value)"
        class="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border transition-all"
        :class="isStatusActive(s.value)
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-white'
          : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'"
      >
        <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: s.color }"></span>
        {{ s.value }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { FeatherIcon } from 'frappe-ui'

interface ViewOption {
  key: string
  label: string
}

interface StatusOption {
  value: string
  color: string
}

const props = defineProps<{
  currentView: string
  orientation: string
  views: ViewOption[]
  departments: Array<{ name: string; department_name: string }>
  selectedDepartments: string[]
  focusDepartment: string
  statuses: StatusOption[]
  activeStatuses: string[]
  serviceTypes: string[]
  activeServices: string[]
}>()

const emit = defineEmits<{
  'change-view': [viewKey: string]
  'toggle-orientation': []
  'toggle-department': [deptName: string]
  'select-all-departments': []
  'set-focus-department': [deptName: string]
  'toggle-status': [statusValue: string]
  'update:activeServices': [services: string[]]
  'new-booking': []
  'navigate': [direction: 'prev' | 'next' | 'today']
  'jump-to-date': []
}>()

const localFocusDept = ref(props.focusDepartment)

watch(() => props.focusDepartment, (val) => {
  localFocusDept.value = val
})

function isStatusActive(status: string): boolean {
  return props.activeStatuses.includes(status)
}

function onServiceChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (!value) {
    emit('update:activeServices', [...props.serviceTypes])
  } else {
    emit('update:activeServices', [value])
  }
}
</script>
