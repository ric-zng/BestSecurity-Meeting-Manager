<template>
  <nav aria-label="Progress" class="mb-8">
    <ol class="flex items-center">
      <li
        v-for="(step, index) in steps"
        :key="step.id"
        :class="[index !== steps.length - 1 ? 'flex-1' : '', 'relative']"
      >
        <div class="flex items-center">
          <button
            type="button"
            :disabled="!step.clickable"
            @click="step.clickable && $emit('go-to', index)"
            class="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors"
            :class="stepCircleClass(index)"
          >
            <svg
              v-if="index < currentStep"
              class="h-4 w-4 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            <span v-else class="text-sm font-semibold">{{ index + 1 }}</span>
          </button>
          <span
            v-if="!compact"
            class="ml-2 text-sm font-medium whitespace-nowrap hidden sm:block"
            :class="stepLabelClass(index)"
          >
            {{ step.label }}
          </span>
          <!-- Connector line -->
          <div
            v-if="index !== steps.length - 1"
            class="ml-2 mr-2 flex-1 h-0.5 rounded"
            :class="index < currentStep ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'"
          ></div>
        </div>
      </li>
    </ol>
    <!-- Mobile: show current step label -->
    <p v-if="compact || true" class="mt-2 text-sm text-gray-600 dark:text-gray-400 sm:hidden">
      Step {{ currentStep + 1 }} of {{ steps.length }}: {{ steps[currentStep]?.label }}
    </p>
  </nav>
</template>

<script setup>
const props = defineProps({
  steps: {
    type: Array,
    required: true,
    // Each: { id: string, label: string, clickable?: boolean }
  },
  currentStep: {
    type: Number,
    default: 0,
  },
  compact: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["go-to"]);

function stepCircleClass(index) {
  if (index < props.currentStep) {
    return "bg-blue-600 dark:bg-blue-500 cursor-pointer hover:bg-blue-700";
  }
  if (index === props.currentStep) {
    return "bg-blue-600 dark:bg-blue-500 text-white ring-2 ring-blue-600 dark:ring-blue-500 ring-offset-2 dark:ring-offset-gray-900";
  }
  return "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400";
}

function stepLabelClass(index) {
  if (index <= props.currentStep) {
    return "text-gray-900 dark:text-white";
  }
  return "text-gray-500 dark:text-gray-400";
}
</script>
