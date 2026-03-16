<template>
  <div class="border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
    <div class="flex items-center justify-between gap-3">
      <!-- Left: Nav + date picker + title -->
      <div class="flex items-center gap-2">
        <button @click="$emit('navigate', 'prev')" class="tb-btn w-8"><FeatherIcon name="chevron-left" class="h-4 w-4" /></button>
        <button @click="$emit('navigate', 'next')" class="tb-btn w-8"><FeatherIcon name="chevron-right" class="h-4 w-4" /></button>
        <button @click="$emit('navigate', 'today')" class="tb-btn px-3 text-sm font-medium">today</button>
        <DatePicker @select="(d) => $emit('jump-to-date', d)" />
        <slot name="title" />
      </div>

      <!-- Right: Filters + toggles -->
      <div class="flex items-center gap-2">
        <MultiSelectDropdown
          :items="departments"
          :selected="selectedDepartments"
          all-label="All Departments"
          value-field="name"
          label-field="department_name"
          @update:selected="$emit('update:selected-departments', $event)"
        />
        <MultiSelectDropdown
          :items="statuses"
          :selected="activeStatuses"
          all-label="All Statuses"
          value-field="value"
          label-field="value"
          color-field="color"
          @update:selected="$emit('update:active-statuses', $event)"
        />
        <MultiSelectDropdown
          :items="serviceTypes"
          :selected="activeServices"
          all-label="All Services"
          @update:selected="$emit('update:active-services', $event)"
        />

        <!-- View toggles -->
        <div class="flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
          <button
            v-for="v in views" :key="v.key"
            @click="$emit('change-view', v.key)"
            class="px-3 py-1.5 text-xs font-medium transition-colors"
            :class="v.key === currentView
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'"
          >{{ v.label }}</button>
        </div>

        <!-- Orientation toggle -->
        <button
          @click="$emit('toggle-orientation')"
          class="tb-btn gap-1.5 px-2.5 text-sm font-medium"
          :class="orientation === 'horizontal'
            ? '!border-blue-500 !bg-blue-50 !text-blue-700 dark:!border-blue-600 dark:!bg-blue-950 dark:!text-blue-300'
            : ''"
        >
          <FeatherIcon :name="orientation === 'vertical' ? 'columns' : 'bar-chart-2'" class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">{{ orientation === 'vertical' ? 'Vertical' : 'Horizontal' }}</span>
        </button>

        <button
          @click="$emit('new-booking')"
          class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >+ New Booking</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FeatherIcon } from 'frappe-ui'
import MultiSelectDropdown from '@/components/calendar/MultiSelectDropdown.vue'
import DatePicker from '@/components/calendar/DatePicker.vue'

interface ViewOption { key: string; label: string }
interface StatusOption { value: string; color: string }

defineProps<{
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

defineEmits<{
  'change-view': [viewKey: string]
  'toggle-orientation': []
  'update:selected-departments': [depts: string[]]
  'update:active-statuses': [statuses: string[]]
  'update:active-services': [services: string[]]
  'new-booking': []
  'navigate': [direction: 'prev' | 'next' | 'today']
  'jump-to-date': [date: string]
}>()
</script>

<style scoped>
.tb-btn {
  @apply inline-flex h-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700;
}
</style>
