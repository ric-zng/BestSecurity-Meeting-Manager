<template>
  <div class="relative" ref="rootRef">
    <button @click.stop="open = !open" class="tb-btn px-2" title="Jump to date">
      <FeatherIcon name="calendar" class="h-3.5 w-3.5" />
    </button>

    <div v-if="open" class="absolute left-0 z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-700 dark:bg-gray-900">
      <!-- Month/Year header -->
      <div class="mb-2 flex items-center justify-between">
        <button @click="changeMonth(-1)" class="rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
          <FeatherIcon name="chevron-left" class="h-4 w-4" />
        </button>
        <span class="text-sm font-semibold text-gray-900 dark:text-white">
          {{ monthNames[viewMonth] }} {{ viewYear }}
        </span>
        <button @click="changeMonth(1)" class="rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
          <FeatherIcon name="chevron-right" class="h-4 w-4" />
        </button>
      </div>

      <!-- Day headers -->
      <div class="mb-1 grid grid-cols-7 text-center text-xs font-medium text-gray-400 dark:text-gray-500">
        <span v-for="d in dayHeaders" :key="d">{{ d }}</span>
      </div>

      <!-- Day grid -->
      <div class="grid grid-cols-7 gap-0.5">
        <button
          v-for="(day, i) in calendarDays" :key="i"
          @click="day.inMonth && selectDate(day)"
          class="flex h-7 w-full items-center justify-center rounded text-xs transition-colors"
          :class="dayClass(day)"
          :disabled="!day.inMonth"
        >
          {{ day.date }}
        </button>
      </div>

      <!-- Footer -->
      <div class="mt-2 flex justify-between border-t border-gray-100 pt-2 dark:border-gray-700">
        <button @click="goToday" class="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">Today</button>
        <button @click="open = false" class="text-xs text-gray-500 hover:underline dark:text-gray-400">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { FeatherIcon } from 'frappe-ui'

const emit = defineEmits<{ 'select': [dateStr: string] }>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const today = new Date()
const viewMonth = ref(today.getMonth())
const viewYear = ref(today.getFullYear())

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const dayHeaders = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

interface CalDay { date: number; inMonth: boolean; isToday: boolean; year: number; month: number }

const calendarDays = computed<CalDay[]>(() => {
  const y = viewYear.value, m = viewMonth.value
  const firstDay = new Date(y, m, 1)
  // Monday-based: 0=Mon..6=Sun
  const startDow = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const daysInPrev = new Date(y, m, 0).getDate()

  const days: CalDay[] = []
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`

  // Previous month padding
  for (let i = startDow - 1; i >= 0; i--) {
    const d = daysInPrev - i
    days.push({ date: d, inMonth: false, isToday: false, year: y, month: m - 1 })
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = `${y}-${m}-${d}` === todayStr
    days.push({ date: d, inMonth: true, isToday, year: y, month: m })
  }
  // Next month padding
  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    days.push({ date: d, inMonth: false, isToday: false, year: y, month: m + 1 })
  }
  return days
})

function dayClass(day: CalDay) {
  if (!day.inMonth) return 'text-gray-300 dark:text-gray-600 cursor-default'
  if (day.isToday) return 'bg-blue-600 text-white font-semibold hover:bg-blue-700'
  return 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
}

function changeMonth(delta: number) {
  let m = viewMonth.value + delta
  let y = viewYear.value
  if (m < 0) { m = 11; y-- }
  if (m > 11) { m = 0; y++ }
  viewMonth.value = m
  viewYear.value = y
}

function selectDate(day: CalDay) {
  const dateStr = `${day.year}-${String(day.month + 1).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`
  emit('select', dateStr)
  open.value = false
}

function goToday() {
  const d = new Date()
  viewMonth.value = d.getMonth()
  viewYear.value = d.getFullYear()
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  emit('select', dateStr)
  open.value = false
}

function onOutsideClick(e: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('click', onOutsideClick))
onBeforeUnmount(() => document.removeEventListener('click', onOutsideClick))
</script>

<style scoped>
.tb-btn {
  @apply inline-flex h-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-700;
}
</style>
