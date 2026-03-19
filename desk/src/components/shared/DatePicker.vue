<template>
  <div class="relative" ref="rootRef">
    <!-- Trigger -->
    <button
      type="button"
      @click="open = !open"
      class="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
      :class="open
        ? 'border-blue-500 ring-1 ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
        : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-gray-500'"
    >
      <span :class="modelValue ? '' : 'text-gray-400 dark:text-gray-500'">
        {{ modelValue ? formatDisplay(modelValue) : placeholder }}
      </span>
      <FeatherIcon name="calendar" class="h-4 w-4 shrink-0 text-gray-400" />
    </button>

    <!-- Calendar dropdown -->
    <transition name="dp-fade">
      <div v-if="open" class="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-600 dark:bg-gray-700">
        <!-- Month navigation -->
        <div class="mb-3 flex items-center justify-between">
          <button @click="prevMonth" type="button" class="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-600">
            <FeatherIcon name="chevron-left" class="h-4 w-4" />
          </button>
          <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ monthLabel }}</span>
          <button @click="nextMonth" type="button" class="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-600">
            <FeatherIcon name="chevron-right" class="h-4 w-4" />
          </button>
        </div>

        <!-- Day headers -->
        <div class="mb-1 grid grid-cols-7 text-center">
          <span v-for="d in dayHeaders" :key="d" class="py-1 text-[10px] font-medium text-gray-400 dark:text-gray-500">{{ d }}</span>
        </div>

        <!-- Day grid -->
        <div class="grid grid-cols-7">
          <button
            v-for="cell in calendarCells"
            :key="cell.key"
            type="button"
            @click="selectDate(cell)"
            :disabled="cell.disabled"
            class="flex h-8 w-full items-center justify-center rounded-full text-xs transition-colors"
            :class="cellClass(cell)"
          >
            {{ cell.day }}
          </button>
        </div>

        <!-- Footer -->
        <div class="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-600">
          <button @click="goToday" type="button" class="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">Today</button>
          <span class="text-[11px] text-gray-500 dark:text-gray-400">{{ todayLabel }}</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Select date...' },
  minDate: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const rootRef = ref(null)

const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())

const dayHeaders = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const monthLabel = computed(() => {
  const d = new Date(viewYear.value, viewMonth.value, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const todayLabel = computed(() => {
  const d = new Date()
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
})

const todayStr = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const calendarCells = computed(() => {
  const cells = []
  const firstDay = new Date(viewYear.value, viewMonth.value, 1)
  // Monday = 0 ... Sunday = 6
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear.value, viewMonth.value, 0).getDate()

  // Previous month padding
  for (let i = startDow - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const m = viewMonth.value === 0 ? 12 : viewMonth.value
    const y = viewMonth.value === 0 ? viewYear.value - 1 : viewYear.value
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ day, dateStr, isCurrentMonth: false, disabled: isDisabled(dateStr), key: `p-${day}` })
  }

  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ day, dateStr, isCurrentMonth: true, disabled: isDisabled(dateStr), key: `c-${day}` })
  }

  // Next month padding (fill to complete the grid)
  const remaining = 42 - cells.length
  for (let day = 1; day <= remaining; day++) {
    const m = viewMonth.value + 2 > 12 ? 1 : viewMonth.value + 2
    const y = viewMonth.value + 2 > 12 ? viewYear.value + 1 : viewYear.value
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ day, dateStr, isCurrentMonth: false, disabled: isDisabled(dateStr), key: `n-${day}` })
  }

  return cells
})

function isDisabled(dateStr) {
  if (props.minDate && dateStr < props.minDate) return true
  return false
}

function cellClass(cell) {
  if (cell.disabled) return 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
  if (cell.dateStr === props.modelValue) return 'bg-blue-600 text-white font-semibold'
  if (cell.dateStr === todayStr.value && cell.isCurrentMonth) return 'bg-blue-100 text-blue-700 font-semibold dark:bg-blue-900/30 dark:text-blue-400'
  if (!cell.isCurrentMonth) return 'text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
  return 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
}

function selectDate(cell) {
  if (cell.disabled) return
  emit('update:modelValue', cell.dateStr)
  open.value = false
}

function prevMonth() {
  if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value-- }
  else viewMonth.value--
}

function nextMonth() {
  if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++ }
  else viewMonth.value++
}

function goToday() {
  const now = new Date()
  viewYear.value = now.getFullYear()
  viewMonth.value = now.getMonth()
}

function formatDisplay(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

// Sync view to selected value
watch(() => props.modelValue, (val) => {
  if (val) {
    const d = new Date(val + 'T00:00:00')
    viewYear.value = d.getFullYear()
    viewMonth.value = d.getMonth()
  }
}, { immediate: true })

// Click outside
function onClickOutside(e) {
  if (rootRef.value && !rootRef.value.contains(e.target)) {
    open.value = false
  }
}
onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
.dp-fade-enter-active, .dp-fade-leave-active {
  transition: opacity 0.15s ease;
}
.dp-fade-enter-from, .dp-fade-leave-to {
  opacity: 0;
}
</style>
