<template>
  <div class="mx-auto max-w-3xl">
    <PageHeader
      title="Reschedule your booking"
      subtitle="Pick a new date and time that works better for you."
    />

    <LoadingSpinner v-if="loading" :size="40" />

    <ErrorState
      v-else-if="error"
      title="Unable to load booking"
      :message="error"
    />

    <div v-else-if="rescheduled" class="rounded-2xl border border-brand-100 bg-white p-8 text-center shadow-card">
      <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <svg class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      </div>
      <h2 class="text-xl font-semibold text-slate-900">Booking rescheduled</h2>
      <p class="mt-2 text-sm text-slate-500">{{ resultMessage }}</p>
      <p v-if="resultBookingId" class="mt-4">
        <RouterLink
          :to="`/meeting-booking/confirm/${resultBookingId}`"
          class="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          View booking
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </RouterLink>
      </p>
    </div>

    <div v-else-if="booking" class="space-y-6">
      <!-- Current booking -->
      <div class="rounded-2xl border border-brand-100 bg-white p-5 shadow-card">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-brand-600 mb-2">
          Current booking
        </h3>
        <p class="font-semibold text-slate-900">{{ booking.meeting_type?.meeting_name }}</p>
        <p class="text-sm text-slate-500">
          {{ formatDate(booking.current_date) }} · {{ formatTime(booking.current_time) }} ({{ booking.duration }} min)
        </p>
      </div>

      <!-- Date + time pickers -->
      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Date -->
        <div class="rounded-2xl border border-brand-100 bg-white p-5 shadow-card">
          <div class="mb-3 flex items-center justify-between">
            <button @click="prevMonth" :disabled="!canGoPrev" class="rounded-md p-1.5 text-slate-600 hover:bg-brand-50 hover:text-brand-600 disabled:opacity-30 focus-ring">
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
            </button>
            <h4 class="text-sm font-semibold text-slate-900">{{ monthLabel }}</h4>
            <button @click="nextMonth" class="rounded-md p-1.5 text-slate-600 hover:bg-brand-50 hover:text-brand-600 focus-ring">
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
            </button>
          </div>
          <div class="grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-slate-400 mb-1">
            <div v-for="d in weekdays" :key="d" class="py-1">{{ d }}</div>
          </div>
          <div v-if="loadingDates" class="py-8"><LoadingSpinner :size="24" /></div>
          <div v-else class="grid grid-cols-7 gap-1">
            <div v-for="(b, i) in leadingBlanks" :key="`b-${i}`" />
            <button
              v-for="day in daysInMonth"
              :key="day.iso"
              :disabled="!day.available"
              @click="pickDate(day.iso)"
              :class="[
                'aspect-square rounded-md text-xs font-medium transition-all focus-ring',
                day.available
                  ? selectedDate === day.iso
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-brand-50 text-brand-700 hover:bg-brand-500 hover:text-white'
                  : 'text-slate-300 cursor-not-allowed',
              ]"
            >
              {{ day.num }}
            </button>
          </div>
        </div>

        <!-- Time -->
        <div class="rounded-2xl border border-brand-100 bg-white p-5 shadow-card">
          <h4 class="mb-3 text-sm font-semibold text-slate-900">Available times</h4>
          <LoadingSpinner v-if="loadingSlots" :size="24" />
          <p v-else-if="!selectedDate" class="text-sm text-slate-500">Select a date to see available times.</p>
          <p v-else-if="!slots.length" class="text-sm text-slate-500">No times available on this date.</p>
          <div v-else class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              v-for="slot in slots"
              :key="slot.start_time"
              @click="selectedTime = slot.start_time"
              :class="[
                'rounded-md px-2 py-2 text-xs font-semibold transition-all focus-ring border',
                selectedTime === slot.start_time
                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                  : 'bg-white text-slate-800 border-brand-100 hover:border-brand-500 hover:bg-brand-50',
              ]"
            >
              {{ formatTime(slot.start_time) }}
            </button>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3">
        <p v-if="submitError" class="mr-auto text-sm text-rose-600">{{ submitError }}</p>
        <button
          @click="submit"
          :disabled="!canSubmit || submitting"
          class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 disabled:pointer-events-none focus-ring"
        >
          <svg v-if="submitting" class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
          </svg>
          {{ submitting ? "Rescheduling…" : "Confirm reschedule" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, RouterLink } from "vue-router";
import {
  fetchBookingByRescheduleToken,
  fetchAvailableDates,
  fetchAvailableSlots,
  rescheduleBooking,
} from "@/api.js";
import PageHeader from "@/components/PageHeader.vue";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import ErrorState from "@/components/ErrorState.vue";

const route = useRoute();
const token = computed(() => route.query.token);

const loading = ref(true);
const error = ref(null);
const booking = ref(null);

const now = new Date();
const viewMonth = ref(now.getMonth() + 1);
const viewYear = ref(now.getFullYear());
const availableDates = ref(new Set());
const loadingDates = ref(false);

const selectedDate = ref(null);
const selectedTime = ref(null);
const slots = ref([]);
const loadingSlots = ref(false);

const submitting = ref(false);
const submitError = ref(null);
const rescheduled = ref(false);
const resultMessage = ref("");
const resultBookingId = ref("");

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const monthLabel = computed(() =>
  new Date(viewYear.value, viewMonth.value - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  }),
);

const canGoPrev = computed(() => {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return viewYear.value > y || (viewYear.value === y && viewMonth.value > m);
});

const leadingBlanks = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value - 1, 1);
  return Array(first.getDay()).fill(null);
});

const daysInMonth = computed(() => {
  const last = new Date(viewYear.value, viewMonth.value, 0).getDate();
  const out = [];
  for (let d = 1; d <= last; d++) {
    const dt = new Date(viewYear.value, viewMonth.value - 1, d);
    const iso = toIso(dt);
    out.push({ iso, num: d, available: availableDates.value.has(iso) });
  }
  return out;
});

const canSubmit = computed(() => !!selectedDate.value && !!selectedTime.value);

function toIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function prevMonth() {
  if (!canGoPrev.value) return;
  if (viewMonth.value === 1) {
    viewMonth.value = 12;
    viewYear.value -= 1;
  } else {
    viewMonth.value -= 1;
  }
}
function nextMonth() {
  if (viewMonth.value === 12) {
    viewMonth.value = 1;
    viewYear.value += 1;
  } else {
    viewMonth.value += 1;
  }
}

function pickDate(iso) {
  selectedDate.value = iso;
  selectedTime.value = null;
  loadSlots();
}

async function loadBooking() {
  if (!token.value) {
    loading.value = false;
    error.value = "Invalid reschedule link.";
    return;
  }
  loading.value = true;
  try {
    const res = await fetchBookingByRescheduleToken(token.value);
    booking.value = res;
    loadDates();
  } catch (e) {
    error.value = e?.message || "Invalid or expired reschedule link.";
  } finally {
    loading.value = false;
  }
}

async function loadDates() {
  if (!booking.value) return;
  loadingDates.value = true;
  try {
    const res = await fetchAvailableDates(
      booking.value.department.department_slug,
      booking.value.meeting_type.meeting_slug,
      viewMonth.value,
      viewYear.value,
    );
    availableDates.value = new Set(res?.available_dates || []);
  } catch (e) {
    availableDates.value = new Set();
  } finally {
    loadingDates.value = false;
  }
}

async function loadSlots() {
  if (!selectedDate.value || !booking.value) return;
  loadingSlots.value = true;
  slots.value = [];
  try {
    const res = await fetchAvailableSlots(
      booking.value.department.department_slug,
      booking.value.meeting_type.meeting_slug,
      selectedDate.value,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
    slots.value = res?.slots || [];
  } catch (e) {
    slots.value = [];
  } finally {
    loadingSlots.value = false;
  }
}

async function submit() {
  if (!canSubmit.value) return;
  submitting.value = true;
  submitError.value = null;
  try {
    const res = await rescheduleBooking(
      token.value,
      selectedDate.value,
      selectedTime.value,
    );
    if (res?.success) {
      rescheduled.value = true;
      resultMessage.value = res.message;
      resultBookingId.value = res.booking_id;
    } else {
      submitError.value = res?.message || "Unable to reschedule.";
    }
  } catch (e) {
    submitError.value = e?.message || "Unable to reschedule.";
  } finally {
    submitting.value = false;
  }
}

watch([viewMonth, viewYear], loadDates);
onMounted(loadBooking);
</script>
