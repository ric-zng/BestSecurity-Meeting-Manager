<template>
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <FeatherIcon
      :name="icon"
      class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600"
    />
    <h3 class="text-sm font-medium text-gray-900 dark:text-white">
      {{ title }}
    </h3>
    <p v-if="description" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
      {{ description }}
    </p>
    <slot name="action" />
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: "inbox" },
  title: { type: String, default: "No data" },
  description: { type: String, default: "" },
});
</script>
