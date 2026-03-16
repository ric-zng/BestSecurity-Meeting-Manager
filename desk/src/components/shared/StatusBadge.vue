<template>
  <span
    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
    :style="badgeStyle"
  >
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from "vue";
import { getStatusColor } from "@/composables/useCalendarState";

const props = defineProps({
  label: { type: String, required: true },
  status: { type: String, default: "" },
});

function hexToRgb(hex) {
  const num = parseInt(hex.replace("#", ""), 16);
  return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
}

const badgeStyle = computed(() => {
  const color = getStatusColor(props.status || props.label);
  const { r, g, b } = hexToRgb(color);
  // Light mode: light bg, dark text. Dark mode is handled with opacity.
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)`,
    color: color,
  };
});
</script>
