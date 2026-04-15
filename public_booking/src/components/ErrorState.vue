<template>
  <div class="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
    <div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
    </div>
    <h3 class="text-sm font-semibold text-rose-900">{{ title }}</h3>
    <p class="mt-1 text-sm text-rose-700">{{ message }}</p>
    <button
      v-if="onRetry"
      @click="onRetry"
      class="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 focus-ring"
    >
      Try again
    </button>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: "Something went wrong" },
  message: { type: String, default: "Please try again in a moment." },
  onRetry: { type: Function, default: null },
});
</script>
