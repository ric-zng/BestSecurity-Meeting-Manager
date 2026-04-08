<template>
  <div class="relative" ref="rootRef">
    <button
      @click.stop="open = !open"
      class="flex h-8 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-700"
    >
      <svg class="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span class="max-w-[200px] truncate">{{ displayLabel }}</span>
      <FeatherIcon name="chevron-down" class="h-3 w-3 shrink-0" />
    </button>

    <div
      v-if="open"
      class="absolute right-0 z-50 mt-1 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900"
      style="width: 520px"
    >
      <!-- Presets -->
      <div class="mb-3 flex flex-wrap gap-1.5">
        <button
          v-for="preset in presets"
          :key="preset.label"
          @click="applyPreset(preset)"
          class="rounded-md border px-2 py-1 text-xs font-medium transition-colors"
          :class="activePreset === preset.label
            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
            : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'"
        >{{ preset.label }}</button>
      </div>

      <!-- Dual month calendars -->
      <div class="flex gap-4">
        <div v-for="offset in [0, 1]" :key="offset" class="flex-1">
          <div class="mb-2 flex items-center justify-between">
            <button v-if="offset === 0" @click="changeMonth(-1)" class="rounded p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <span v-else class="w-5" />
            <span class="text-xs font-semibold text-gray-900 dark:text-white">{{ monthLabel(offset) }}</span>
            <button v-if="offset === 1" @click="changeMonth(1)" class="rounded p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
            <span v-else class="w-5" />
          </div>
          <div class="grid grid-cols-7 gap-0.5 text-center">
            <div v-for="d in ['Mo','Tu','We','Th','Fr','Sa','Su']" :key="d" class="py-0.5 text-[10px] font-medium text-gray-400 dark:text-gray-500">{{ d }}</div>
            <template v-for="(day, idx) in getDays(offset)" :key="idx">
              <button
                v-if="day.date"
                @click="pickDay(day.date)"
                @mouseenter="hoverDate = day.date"
                @mouseleave="hoverDate = null"
                class="mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors"
                :class="dayClass(day)"
              >{{ day.day }}</button>
              <div v-else class="h-7 w-7" />
            </template>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-700">
        <button @click="clearRange" class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Clear</button>
        <span v-if="pickStep === 1" class="text-xs text-gray-400 dark:text-gray-500">Pick end date...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { FeatherIcon } from 'frappe-ui'

const props = defineProps({
  from: { type: String, default: '' },
  to: { type: String, default: '' },
})

const emit = defineEmits(['update'])

const open = ref(false)
const rootRef = ref(null)
const baseMonth = ref(new Date().getMonth())
const baseYear = ref(new Date().getFullYear())
const hoverDate = ref(null)

// Internal selection state
const pickFrom = ref(props.from || '')
const pickTo = ref(props.to || '')
const pickStep = ref(0) // 0 = picking start, 1 = picking end
const activePreset = ref('')

// Presets
const presets = [
  { label: 'Today', fn: () => { const t = todayStr(); return [t, t] } },
  { label: 'This Week', fn: () => weekRange(0) },
  { label: 'Last 7 Days', fn: () => { const t = new Date(); const f = new Date(t); f.setDate(f.getDate() - 6); return [fmtDate(f), fmtDate(t)] } },
  { label: 'This Month', fn: () => { const t = new Date(); return [fmtDate(new Date(t.getFullYear(), t.getMonth(), 1)), fmtDate(new Date(t.getFullYear(), t.getMonth() + 1, 0))] } },
  { label: 'Last Month', fn: () => { const t = new Date(); return [fmtDate(new Date(t.getFullYear(), t.getMonth() - 1, 1)), fmtDate(new Date(t.getFullYear(), t.getMonth(), 0))] } },
]

const displayLabel = computed(() => {
  if (!props.from && !props.to) return 'All dates'
  if (props.from && props.to) return `${fmtDisplay(props.from)} – ${fmtDisplay(props.to)}`
  if (props.from) return `From ${fmtDisplay(props.from)}`
  return `Until ${fmtDisplay(props.to)}`
})

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDisplay(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function todayStr() { return fmtDate(new Date()) }

function weekRange(offset) {
  const now = new Date()
  const day = now.getDay() || 7
  const mon = new Date(now)
  mon.setDate(now.getDate() - day + 1 + offset * 7)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return [fmtDate(mon), fmtDate(sun)]
}

function monthLabel(offset) {
  let m = baseMonth.value + offset
  let y = baseYear.value
  if (m > 11) { m -= 12; y++ }
  return new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function changeMonth(delta) {
  let m = baseMonth.value + delta
  let y = baseYear.value
  if (m > 11) { m = 0; y++ }
  if (m < 0) { m = 11; y-- }
  baseMonth.value = m
  baseYear.value = y
}

function getDays(offset) {
  let m = baseMonth.value + offset
  let y = baseYear.value
  if (m > 11) { m -= 12; y++ }
  const first = new Date(y, m, 1)
  const last = new Date(y, m + 1, 0)
  const startDow = (first.getDay() + 6) % 7
  const days = []
  for (let i = 0; i < startDow; i++) days.push({ date: null })
  for (let d = 1; d <= last.getDate(); d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ date: dateStr, day: d })
  }
  return days
}

function dayClass(day) {
  const d = day.date
  const from = pickFrom.value
  const to = pickTo.value
  const hover = hoverDate.value

  // Determine the effective range end (committed end or hover preview)
  const rangeEnd = to || (pickStep.value === 1 ? hover : null)

  // Selected endpoints
  if (d === from && d === rangeEnd) return 'bg-blue-600 text-white font-semibold'
  if (d === from || d === rangeEnd) return 'bg-blue-600 text-white font-semibold'

  // In range (between from and rangeEnd)
  if (from && rangeEnd) {
    const lo = from < rangeEnd ? from : rangeEnd
    const hi = from < rangeEnd ? rangeEnd : from
    if (d > lo && d < hi) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
    }
  }

  // Today
  if (d === todayStr()) return 'ring-1 ring-blue-400 text-blue-700 dark:text-blue-400'
  return 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
}

function pickDay(date) {
  activePreset.value = ''
  if (pickStep.value === 0) {
    pickFrom.value = date
    pickTo.value = ''
    pickStep.value = 1
  } else {
    // Set end date, auto-sort
    if (date < pickFrom.value) {
      pickTo.value = pickFrom.value
      pickFrom.value = date
    } else {
      pickTo.value = date
    }
    pickStep.value = 0
    // Auto-apply when both dates are selected
    autoApply()
  }
}

function applyPreset(preset) {
  const [from, to] = preset.fn()
  pickFrom.value = from
  pickTo.value = to
  pickStep.value = 0
  activePreset.value = preset.label
  // Navigate calendar to show the range
  const d = new Date(from + 'T12:00:00')
  baseMonth.value = d.getMonth()
  baseYear.value = d.getFullYear()
  // Auto-apply
  autoApply()
}

function autoApply() {
  emit('update', { from: pickFrom.value, to: pickTo.value })
  open.value = false
}

function clearRange() {
  pickFrom.value = ''
  pickTo.value = ''
  pickStep.value = 0
  activePreset.value = ''
  emit('update', { from: '', to: '' })
  open.value = false
}

// Sync internal state when props change
function syncFromProps() {
  pickFrom.value = props.from || ''
  pickTo.value = props.to || ''
  pickStep.value = 0
}

// Click outside
function onOutsideClick(e) {
  if (rootRef.value && !rootRef.value.contains(e.target)) open.value = false
}
onMounted(() => {
  document.addEventListener('click', onOutsideClick)
  syncFromProps()
})
onBeforeUnmount(() => document.removeEventListener('click', onOutsideClick))
</script>
