<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2 pointer-events-none">
      <transition-group
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-2 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-2 scale-95"
      >
        <div
          v-for="t in toasts"
          :key="t.id"
          class="pointer-events-auto flex min-w-[300px] max-w-[420px] items-start gap-3 rounded-lg px-4 py-3 shadow-lg"
          :class="toastBg(t.type)"
        >
          <svg v-if="t.type === 'success'" class="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <svg v-else-if="t.type === 'error'" class="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M12 3l9.66 16.59a1 1 0 01-.87 1.41H3.21a1 1 0 01-.87-1.41L12 3z" />
          </svg>
          <svg v-else class="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="flex-1 text-sm font-medium leading-snug">{{ t.message }}</p>
          <button @click="dismiss(t.id)" class="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </transition-group>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { toast } from 'frappe-ui'

const toasts = ref([])
let nextId = 0

function toastBg(type) {
  switch (type) {
    case 'success': return 'bg-green-600 text-white'
    case 'error': return 'bg-red-600 text-white'
    case 'warning': return 'bg-yellow-500 text-white'
    default: return 'bg-gray-800 text-white'
  }
}

function addToast(message, type = 'info', duration = 5000) {
  const id = nextId++
  toasts.value.push({ id, message, type })
  if (duration > 0) {
    setTimeout(() => dismiss(id), duration)
  }
}

function dismiss(id) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

// Patch the frappe-ui toast singleton so all imports of `toast` use our renderer
onMounted(() => {
  toast.create = (options) => {
    const dur = typeof options.duration === 'number' ? options.duration : 5000
    addToast(options.message, options.type || 'info', dur)
    return `toast-${nextId}`
  }
  toast.success = (msg, opts = {}) => {
    const dur = opts.duration ? opts.duration * 1000 : 5000
    addToast(msg, 'success', dur)
  }
  toast.error = (msg, opts = {}) => {
    const dur = opts.duration ? opts.duration * 1000 : 8000
    addToast(msg, 'error', dur)
  }
  toast.warning = (msg, opts = {}) => {
    const dur = opts.duration ? opts.duration * 1000 : 6000
    addToast(msg, 'warning', dur)
  }
  toast.info = (msg, opts = {}) => {
    const dur = opts.duration ? opts.duration * 1000 : 5000
    addToast(msg, 'info', dur)
  }
})
</script>
