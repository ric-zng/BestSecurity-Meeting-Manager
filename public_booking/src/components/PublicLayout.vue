<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="border-b border-brand-100 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <RouterLink to="/meeting-booking" class="flex items-center gap-3 focus-ring rounded-md" aria-label="Home">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white shadow-sm">
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="leading-tight">
            <div class="text-[15px] font-semibold text-slate-900">Book a Meeting</div>
            <div class="text-xs text-slate-500">Schedule an appointment with our team</div>
          </div>
        </RouterLink>

        <div class="flex items-center gap-2 text-xs text-slate-500">
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 11.293a1 1 0 101.414 1.414l2-2A1 1 0 0011 10V7z" clip-rule="evenodd" />
          </svg>
          <span>Secure public booking</span>
        </div>
      </div>

      <!-- Progress bar -->
      <div v-if="showProgress" class="border-t border-brand-50 bg-white">
        <div class="mx-auto max-w-5xl px-4 py-3 sm:px-6">
          <StepIndicator :current="currentStep" :total="5" :steps="steps" />
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="flex-1">
      <div class="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-brand-100 bg-white">
      <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p class="text-xs text-slate-500">
          &copy; {{ year }} Your Company. All rights reserved.
        </p>
        <p class="text-xs text-slate-400">
          Powered by Meeting Manager
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import StepIndicator from "@/components/StepIndicator.vue";

const route = useRoute();

const steps = [
  { key: 1, label: "Department" },
  { key: 2, label: "Meeting Type" },
  { key: 3, label: "Date" },
  { key: 4, label: "Time" },
  { key: 5, label: "Details" },
];

const currentStep = computed(() => route.meta?.step || 1);
const showProgress = computed(() => currentStep.value >= 1 && currentStep.value <= 5);

const year = new Date().getFullYear();
</script>
