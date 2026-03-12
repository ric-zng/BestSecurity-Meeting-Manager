<template>
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <FeatherIcon
      name="alert-circle"
      class="mb-3 h-10 w-10 text-red-400 dark:text-red-500"
    />
    <h3 class="text-sm font-medium text-gray-900 dark:text-white">
      {{ title }}
    </h3>
    <p v-if="message" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
      {{ message }}
    </p>
    <Button
      v-if="retryable"
      class="mt-4"
      variant="subtle"
      label="Try Again"
      @click="$emit('retry')"
    />
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: "Something went wrong" },
  message: { type: String, default: "" },
  retryable: { type: Boolean, default: true },
});

defineEmits(["retry"]);
</script>
