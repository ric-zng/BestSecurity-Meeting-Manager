<template>
  <div class="space-y-0">
    <!-- Main toolbar row -->
    <div class="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
      <!-- Left: Nav + title -->
      <div class="flex items-center gap-2">
        <button @click="$emit('navigate', 'prev')" class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
          <FeatherIcon name="chevron-left" class="h-4 w-4" />
        </button>
        <button @click="$emit('navigate', 'next')" class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
          <FeatherIcon name="chevron-right" class="h-4 w-4" />
        </button>
        <button
          @click="$emit('navigate', 'today')"
          class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          today
        </button>
        <slot name="title" />
      </div>

      <!-- Right: Filters + toggles -->
      <div class="flex items-center gap-2">
        <!-- Department dropdown -->
        <select
          v-model="localFocusDept"
          @change="$emit('set-focus-department', localFocusDept)"
          class="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="">All Departments</option>
          <option v-for="d in departments" :key="d.name" :value="d.name">{{ d.department_name }}</option>
        </select>

        <!-- Services multi-select toggle -->
        <div class="relative" ref="serviceDropdownRef">
          <button
            @click="showServiceDropdown = !showServiceDropdown"
            class="flex h-8 items-center gap-1 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <span>{{ serviceLabel }}</span>
            <FeatherIcon name="chevron-down" class="h-3 w-3" />
          </button>
          <div
            v-if="showServiceDropdown"
            class="absolute right-0 z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            <label
              v-for="s in serviceTypes" :key="s"
              class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <input
                type="checkbox"
                :checked="activeServices.includes(s)"
                @change="toggleService(s)"
                class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 dark:border-gray-600"
              />
              <span class="text-gray-700 dark:text-gray-300">{{ s }}</span>
            </label>
            <div class="mt-1 flex justify-between border-t border-gray-100 pt-1 dark:border-gray-700">
              <button @click="$emit('update:activeServices', [...serviceTypes])" class="text-xs text-blue-600 hover:underline dark:text-blue-400">Select All</button>
              <button @click="$emit('update:activeServices', [])" class="text-xs text-gray-500 hover:underline dark:text-gray-400">Clear</button>
            </div>
          </div>
        </div>

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
          class="flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium transition-colors"
          :class="orientation === 'horizontal'
            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-950 dark:text-blue-300'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'"
        >
          <FeatherIcon :name="orientation === 'vertical' ? 'columns' : 'bar-chart-2'" class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">{{ orientation === 'vertical' ? 'Vertical' : 'Horizontal' }}</span>
        </button>

        <!-- New Booking -->
        <button
          @click="$emit('new-booking')"
          class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >+ New Booking</button>
      </div>
    </div>

    <!-- Status filter row -->
    <div
      v-if="statuses.length"
      class="flex flex-wrap items-center gap-1.5 border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-900/50"
    >
      <span class="mr-1 text-xs text-gray-500 dark:text-gray-400">Status:</span>
      <button
        v-for="s in statuses" :key="s.value"
        @click="$emit('toggle-status', s.value)"
        class="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all"
        :class="isActive(s.value)
          ? 'border-current font-medium text-gray-900 dark:text-white'
          : 'border-gray-300 text-gray-400 dark:border-gray-600 dark:text-gray-500'"
        :style="isActive(s.value) ? { borderColor: s.color, backgroundColor: s.color + '18' } : {}"
      >
        <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: s.color }" />
        {{ s.value }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { FeatherIcon } from 'frappe-ui'

interface ViewOption { key: string; label: string }
interface StatusOption { value: string; color: string }

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
  'set-focus-department': [deptName: string]
  'toggle-status': [statusValue: string]
  'update:activeServices': [services: string[]]
  'new-booking': []
  'navigate': [direction: 'prev' | 'next' | 'today']
}>()

const localFocusDept = ref(props.focusDepartment)
const showServiceDropdown = ref(false)
const serviceDropdownRef = ref<HTMLElement | null>(null)

watch(() => props.focusDepartment, (val) => { localFocusDept.value = val })

const serviceLabel = computed(() => {
  if (!props.activeServices.length || props.activeServices.length === props.serviceTypes.length) return 'All Services'
  if (props.activeServices.length === 1) return props.activeServices[0]
  return `${props.activeServices.length} Services`
})

function isActive(status: string): boolean {
  return props.activeStatuses.includes(status)
}

function toggleService(service: string) {
  const current = [...props.activeServices]
  const idx = current.indexOf(service)
  if (idx >= 0) current.splice(idx, 1)
  else current.push(service)
  emit('update:activeServices', current)
}

// Close dropdown on outside click
function handleOutsideClick(e: MouseEvent) {
  if (serviceDropdownRef.value && !serviceDropdownRef.value.contains(e.target as Node)) {
    showServiceDropdown.value = false
  }
}
onMounted(() => document.addEventListener('click', handleOutsideClick))
onBeforeUnmount(() => document.removeEventListener('click', handleOutsideClick))
</script>

