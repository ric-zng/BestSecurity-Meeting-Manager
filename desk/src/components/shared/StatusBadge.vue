<template>
  <span
    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
    :class="colorClass"
  >
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  label: { type: String, required: true },
  status: { type: String, default: "" },
});

const STATUS_COLORS = {
  "New Booking": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "New Appointment": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Booking Started": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  "Sale Approved": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "Booking Approved Not Sale": "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  Confirmed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "Not Possible": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Rebook: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const colorClass = computed(() => {
  return (
    STATUS_COLORS[props.status || props.label] ||
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
  );
});
</script>
