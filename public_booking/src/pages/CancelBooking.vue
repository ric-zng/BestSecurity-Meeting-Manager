<template>
  <div class="mx-auto max-w-xl">
    <PageHeader
      title="Cancel your booking"
      subtitle="This will release your time slot. You can always book again later."
    />

    <div class="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
      <LoadingSpinner v-if="loading" :size="40" />

      <ErrorState
        v-else-if="error"
        title="Unable to process"
        :message="error"
      />

      <div v-else-if="cancelled" class="text-center py-4">
        <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-slate-900">Booking cancelled</h2>
        <p class="mt-2 text-sm text-slate-500">
          {{ message || "Your booking has been cancelled successfully." }}
        </p>
        <RouterLink
          to="/meeting-booking"
          class="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          Book a new meeting
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </RouterLink>
      </div>

      <div v-else-if="!token" class="text-center">
        <p class="text-sm text-slate-500">
          The cancellation link appears to be missing or invalid.
        </p>
      </div>

      <div v-else class="text-center">
        <svg class="mx-auto mb-3 h-10 w-10 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l6.518 11.59c.75 1.334-.213 2.98-1.742 2.98H3.48c-1.53 0-2.492-1.646-1.742-2.98L8.257 3.099zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <p class="text-slate-700">
          Are you sure you want to cancel this booking? This action cannot be undone.
        </p>
        <div class="mt-6 flex items-center justify-center gap-3">
          <RouterLink
            to="/meeting-booking"
            class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-ring"
          >
            Keep booking
          </RouterLink>
          <button
            @click="submit"
            :disabled="submitting"
            class="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60 focus-ring"
          >
            <svg v-if="submitting" class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
            </svg>
            {{ submitting ? "Cancelling…" : "Yes, cancel booking" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { cancelBooking } from "@/api.js";
import PageHeader from "@/components/PageHeader.vue";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import ErrorState from "@/components/ErrorState.vue";

const route = useRoute();
const token = computed(() => route.query.token);
const loading = ref(false);
const submitting = ref(false);
const error = ref(null);
const cancelled = ref(false);
const message = ref("");

async function submit() {
  if (!token.value) return;
  submitting.value = true;
  error.value = null;
  try {
    const res = await cancelBooking(token.value);
    if (res?.success) {
      cancelled.value = true;
      message.value = res.message;
    } else {
      error.value = res?.message || "Unable to cancel booking.";
    }
  } catch (e) {
    error.value = e?.message || "Unable to cancel booking.";
  } finally {
    submitting.value = false;
  }
}
</script>
