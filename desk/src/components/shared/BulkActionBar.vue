<template>
  <transition
    enter-active-class="duration-300 ease-out"
    enter-from-class="translate-y-4 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-4 opacity-0"
  >
    <div
      v-if="selectedCount > 0"
      class="fixed inset-x-0 bottom-6 z-50 mx-auto w-max"
    >
      <div
        class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <!-- Checked checkbox -->
        <input
          type="checkbox"
          checked
          disabled
          class="h-4 w-4 rounded border-gray-300 text-blue-600 dark:border-gray-600"
        />

        <!-- Count text -->
        <span
          class="border-r border-gray-200 pr-3 text-sm font-medium text-gray-900 dark:border-gray-600 dark:text-gray-100"
        >
          {{ selectedCount }} selected
        </span>

        <!-- Actions slot -->
        <slot name="actions" />

        <!-- Divider + Select all / Close -->
        <div
          class="flex items-center gap-1 border-l border-gray-200 pl-3 dark:border-gray-600"
        >
          <button
            v-if="!allSelected"
            @click="$emit('select-all')"
            class="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            Select all
          </button>
          <button
            @click="$emit('deselect-all')"
            class="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <FeatherIcon name="x" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  selectedCount: { type: Number, required: true },
  allSelected: { type: Boolean, default: false },
});

defineEmits(["select-all", "deselect-all"]);
</script>
