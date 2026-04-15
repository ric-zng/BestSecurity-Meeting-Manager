<template>
  <div class="flex items-center justify-center" role="status" aria-label="Loading">
    <svg
      class="animate-spin text-brand-500"
      :width="size"
      :height="size"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="3"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
      />
    </svg>
  </div>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 24 },
});
</script>
