<template>
  <RouterLink
    :to="to"
    class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors focus-ring rounded-md"
  >
    <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clip-rule="evenodd" />
    </svg>
    <slot>Back</slot>
  </RouterLink>
</template>

<script setup>
import { RouterLink } from "vue-router";
defineProps({ to: { type: [String, Object], required: true } });
</script>
