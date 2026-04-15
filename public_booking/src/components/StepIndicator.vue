<template>
  <ol class="flex items-center gap-1 sm:gap-2" aria-label="Booking progress">
    <li
      v-for="(step, idx) in steps"
      :key="step.key"
      class="flex flex-1 items-center gap-2"
    >
      <div class="flex flex-col items-center gap-1.5 w-full">
        <div class="flex items-center w-full">
          <!-- Line before -->
          <div
            v-if="idx > 0"
            class="h-0.5 flex-1 transition-colors"
            :class="step.key <= current ? 'bg-brand-500' : 'bg-slate-200'"
          />

          <!-- Bubble -->
          <div
            :class="[
              'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all',
              step.key < current
                ? 'bg-brand-500 text-white shadow-sm'
                : step.key === current
                  ? 'bg-brand-500 text-white ring-4 ring-brand-100 shadow-sm'
                  : 'bg-white text-slate-400 ring-1 ring-slate-200',
            ]"
            :aria-current="step.key === current ? 'step' : undefined"
          >
            <svg
              v-if="step.key < current"
              class="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            <span v-else>{{ step.key }}</span>
          </div>

          <!-- Line after -->
          <div
            v-if="idx < steps.length - 1"
            class="h-0.5 flex-1 transition-colors"
            :class="step.key < current ? 'bg-brand-500' : 'bg-slate-200'"
          />
        </div>
        <span
          class="text-[10px] sm:text-xs font-medium tracking-wide uppercase text-center"
          :class="
            step.key === current
              ? 'text-brand-600'
              : step.key < current
                ? 'text-slate-600'
                : 'text-slate-400'
          "
        >
          {{ step.label }}
        </span>
      </div>
    </li>
  </ol>
</template>

<script setup>
defineProps({
  current: { type: Number, required: true },
  total: { type: Number, default: 5 },
  steps: { type: Array, required: true },
});
</script>
