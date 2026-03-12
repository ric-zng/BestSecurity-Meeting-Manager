<template>
  <div class="flex items-center justify-center" :class="containerClass">
    <div
      class="animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-gray-100"
      :class="sizeClass"
    />
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  size: { type: String, default: "md" },
  fullPage: { type: Boolean, default: false },
});

const sizeClass = computed(() => {
  const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-10 w-10" };
  return sizes[props.size] || sizes.md;
});

const containerClass = computed(() =>
  props.fullPage ? "h-screen" : "py-8"
);
</script>
