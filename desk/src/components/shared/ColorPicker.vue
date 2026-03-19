<template>
  <div class="color-picker-root">
    <!-- Saturation/Brightness canvas -->
    <div
      ref="canvasRef"
      class="relative h-40 w-full cursor-crosshair rounded-lg overflow-hidden"
      :style="{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))` }"
      @mousedown="onCanvasMouseDown"
      @touchstart.prevent="onCanvasTouchStart"
    >
      <div
        class="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
        :style="{ left: satPercent + '%', top: (100 - valPercent) + '%', backgroundColor: currentColor }"
      />
    </div>

    <!-- Hue slider -->
    <div
      ref="hueRef"
      class="relative mt-3 h-3 w-full cursor-pointer rounded-full"
      style="background: linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)"
      @mousedown="onHueMouseDown"
      @touchstart.prevent="onHueTouchStart"
    >
      <div
        class="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
        :style="{ left: (hue / 360 * 100) + '%', backgroundColor: `hsl(${hue}, 100%, 50%)` }"
      />
    </div>

    <!-- Hex input + preview -->
    <div class="mt-3 flex items-center gap-3">
      <div
        class="h-9 w-9 shrink-0 rounded-lg border border-gray-200 dark:border-gray-600"
        :style="{ backgroundColor: currentColor }"
      />
      <input
        :value="modelValue"
        @input="onHexInput($event.target.value)"
        type="text"
        placeholder="#3b82f6"
        class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '#3b82f6' },
})
const emit = defineEmits(['update:modelValue'])

const hue = ref(0)
const sat = ref(100)
const val = ref(100)

const satPercent = computed(() => sat.value)
const valPercent = computed(() => val.value)

const currentColor = computed(() => hsvToHex(hue.value, sat.value, val.value))

// HSV → Hex
function hsvToHex(h, s, v) {
  s /= 100; v /= 100
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c
  let r, g, b
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Hex → HSV
function hexToHsv(hex) {
  hex = hex.replace('#', '')
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  if (hex.length !== 6) return null
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  const s = max === 0 ? 0 : (d / max) * 100
  const v = max * 100
  return { h, s, v }
}

// Sync from prop
function syncFromHex(hex) {
  const hsv = hexToHsv(hex)
  if (!hsv) return
  hue.value = hsv.h
  sat.value = hsv.s
  val.value = hsv.v
}

onMounted(() => syncFromHex(props.modelValue))

watch(() => props.modelValue, (newVal) => {
  // Only sync if it differs from our computed color to avoid loops
  if (newVal && newVal.toLowerCase() !== currentColor.value.toLowerCase()) {
    syncFromHex(newVal)
  }
})

// Emit on HSV change
function emitColor() {
  emit('update:modelValue', currentColor.value)
}

// Hex input
function onHexInput(val) {
  emit('update:modelValue', val)
  if (/^#[0-9a-fA-F]{6}$/.test(val) || /^#[0-9a-fA-F]{3}$/.test(val)) {
    syncFromHex(val)
  }
}

// Canvas interaction
const canvasRef = ref(null)
const hueRef = ref(null)

function updateCanvasFromEvent(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
  sat.value = x * 100
  val.value = (1 - y) * 100
  emitColor()
}

function onCanvasMouseDown(e) {
  updateCanvasFromEvent(e)
  const onMove = (e) => updateCanvasFromEvent(e)
  const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function onCanvasTouchStart(e) {
  updateCanvasFromEvent(e.touches[0])
  const onMove = (e) => { e.preventDefault(); updateCanvasFromEvent(e.touches[0]) }
  const onEnd = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd) }
  window.addEventListener('touchmove', onMove, { passive: false })
  window.addEventListener('touchend', onEnd)
}

// Hue slider interaction
function updateHueFromEvent(e) {
  const rect = hueRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  hue.value = x * 360
  emitColor()
}

function onHueMouseDown(e) {
  updateHueFromEvent(e)
  const onMove = (e) => updateHueFromEvent(e)
  const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function onHueTouchStart(e) {
  updateHueFromEvent(e.touches[0])
  const onMove = (e) => { e.preventDefault(); updateHueFromEvent(e.touches[0]) }
  const onEnd = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd) }
  window.addEventListener('touchmove', onMove, { passive: false })
  window.addEventListener('touchend', onEnd)
}
</script>
