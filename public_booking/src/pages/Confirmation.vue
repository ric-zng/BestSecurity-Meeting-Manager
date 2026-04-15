<template>
  <div class="mx-auto max-w-2xl">
    <LoadingSpinner v-if="loading" :size="40" />

    <ErrorState
      v-else-if="error"
      title="We couldn't load your booking"
      :message="error"
    />

    <div v-else-if="booking" class="space-y-6">
      <!-- Hero -->
      <div class="rounded-2xl border border-brand-200 bg-gradient-to-b from-brand-50 to-white p-8 text-center shadow-card">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg">
          <svg class="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </div>
        <p class="text-xs font-semibold uppercase tracking-wider text-brand-600">
          {{ requiresApproval ? "Pending approval" : "You're all set" }}
        </p>
        <h1 class="mt-1 text-3xl font-bold text-slate-900">Booking confirmed</h1>
        <p class="mt-3 text-slate-600">
          {{
            requiresApproval
              ? "We've received your request and will confirm it shortly. Check your email for updates."
              : "We've sent a confirmation email with all the details and a calendar invite."
          }}
        </p>
        <p class="mt-1 text-xs text-slate-400 font-mono">
          {{ booking.booking_reference || booking.booking_id }}
        </p>
      </div>

      <!-- Details card -->
      <div class="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">
          Meeting Details
        </h2>
        <dl class="grid gap-4 sm:grid-cols-2">
          <div>
            <dt class="text-xs text-slate-500">Meeting</dt>
            <dd class="mt-0.5 font-medium text-slate-900">
              {{ booking.meeting_title || meetingType?.meeting_name }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-slate-500">Department</dt>
            <dd class="mt-0.5 font-medium text-slate-900">
              {{ department?.department_name }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-slate-500">When</dt>
            <dd class="mt-0.5 font-medium text-slate-900">
              {{ formatDate(booking.start_datetime) }}
            </dd>
            <dd class="text-sm text-slate-600">
              {{ formatTime(booking.start_datetime) }} — {{ formatTime(booking.end_datetime) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-slate-500">Location</dt>
            <dd class="mt-0.5 font-medium text-slate-900">
              {{ booking.location_type || "Meeting" }}
            </dd>
            <dd v-if="booking.video_meeting_url" class="text-sm">
              <a :href="booking.video_meeting_url" class="text-brand-600 underline hover:no-underline" target="_blank" rel="noopener">
                Join link
              </a>
            </dd>
          </div>
          <div v-if="assignedUsers.length" class="sm:col-span-2">
            <dt class="text-xs text-slate-500">Host{{ assignedUsers.length > 1 ? 's' : '' }}</dt>
            <dd class="mt-0.5 flex flex-wrap gap-2">
              <span
                v-for="u in assignedUsers"
                :key="u.email"
                class="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
              >
                {{ u.name }}
                <span v-if="u.is_primary" class="text-[10px] opacity-60">primary</span>
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <!-- Self-service actions -->
      <div
        v-if="booking.cancel_link || booking.reschedule_link"
        class="rounded-2xl border border-brand-100 bg-white p-6 shadow-card"
      >
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">
          Need to make a change?
        </h2>
        <p class="text-sm text-slate-600 mb-4">
          You can reschedule or cancel this booking anytime before it takes place.
        </p>
        <div class="flex flex-wrap gap-3">
          <a
            v-if="booking.reschedule_link"
            :href="booking.reschedule_link"
            class="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 focus-ring"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
            </svg>
            Reschedule
          </a>
          <a
            v-if="booking.cancel_link"
            :href="booking.cancel_link"
            class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-ring"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
            Cancel
          </a>
        </div>
      </div>

      <div class="text-center pt-2">
        <RouterLink to="/meeting-booking" class="text-sm text-slate-500 hover:text-brand-600 focus-ring rounded-md">
          Book another meeting
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { fetchBookingConfirmation } from "@/api.js";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import ErrorState from "@/components/ErrorState.vue";

const route = useRoute();
const loading = ref(true);
const error = ref(null);
const booking = ref(null);
const meetingType = ref(null);
const department = ref(null);
const assignedUsers = ref([]);

const requiresApproval = computed(() => !!booking.value?.requires_approval);

function formatDate(dt) {
  if (!dt) return "";
  return new Date(dt).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dt) {
  if (!dt) return "";
  return new Date(dt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await fetchBookingConfirmation(route.params.bookingId);
    if (res?.success) {
      booking.value = res.booking;
      meetingType.value = res.meeting_type;
      department.value = res.department;
      assignedUsers.value = res.assigned_users || [];
    } else {
      error.value = "Booking not found.";
    }
  } catch (e) {
    error.value = e?.message || "Unable to load your booking.";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
