<template>
  <div>
    <BackLink :to="`/meeting-booking/${$route.params.department}`">Back to meeting types</BackLink>

    <PageHeader
      eyebrow="Step 3 of 5"
      title="Pick a Date"
      :subtitle="subtitle"
    />

    <div class="mx-auto max-w-lg rounded-2xl border border-brand-100 bg-white p-5 shadow-card">
      <!-- Calendar header -->
      <div class="mb-4 flex items-center justify-between">
        <button
          @click="prevMonth"
          :disabled="!canGoPrev"
          class="rounded-lg p-2 text-slate-600 hover:bg-brand-50 hover:text-brand-600 disabled:opacity-30 disabled:pointer-events-none focus-ring"
          aria-label="Previous month"
        >
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
        <h2 class="text-lg font-semibold text-slate-900">
          {{ monthLabel }}
        </h2>
        <button
          @click="nextMonth"
          class="rounded-lg p-2 text-slate-600 hover:bg-brand-50 hover:text-brand-600 focus-ring"
          aria-label="Next month"
        >
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <!-- Weekday labels -->
      <div class="grid grid-cols-7 text-center text-[11px] font-semibold uppercase text-slate-400 mb-1">
        <div v-for="d in weekdays" :key="d" class="py-1">{{ d }}</div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="py-12">
        <LoadingSpinner :size="32" />
      </div>

      <!-- Error -->
      <ErrorState v-else-if="error" :message="error" :on-retry="loadDates" class="mb-2" />

      <!-- Days grid -->
      <div v-else class="grid grid-cols-7 gap-1">
        <div v-for="(blank, i) in leadingBlanks" :key="`b-${i}`" />
        <button
          v-for="day in daysInMonth"
          :key="day.iso"
          :disabled="!day.available"
          @click="select(day)"
          :class="[
            'aspect-square rounded-lg text-sm font-medium transition-all focus-ring',
            day.available
              ? 'bg-brand-50 text-brand-700 hover:bg-brand-500 hover:text-white shadow-sm'
              : 'text-slate-300 cursor-not-allowed',
            day.isToday && 'ring-1 ring-brand-300',
          ]"
          :aria-label="day.label"
        >
          {{ day.num }}
        </button>
      </div>

      <!-- Timezone info -->
      <p v-if="timezone" class="mt-4 text-center text-xs text-slate-500">
        All times shown in {{ timezone }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { fetchAvailableDates } from "@/api.js";
import PageHeader from "@/components/PageHeader.vue";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import ErrorState from "@/components/ErrorState.vue";
import BackLink from "@/components/BackLink.vue";

const route = useRoute();
const router = useRouter();

const now = new Date();
const viewMonth = ref(now.getMonth() + 1);
const viewYear = ref(now.getFullYear());
const loading = ref(false);
const error = ref(null);
const availableDates = ref(new Set());
const timezone = ref("");

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
  const todayIso = toIso(now);
  const result = [];
  for (let d = 1; d <= last; d++) {
    const date = new Date(viewYear.value, viewMonth.value - 1, d);
    const iso = toIso(date);
    result.push({
      iso,
      num: d,
      isToday: iso === todayIso,
      available: availableDates.value.has(iso),
      label: date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    });
  }
  return result;
});

const subtitle = computed(() => {
  const cnt = availableDates.value.size;
  if (!cnt) return "Select a month to view available dates.";
  return `${cnt} available ${cnt === 1 ? "date" : "dates"} in ${monthLabel.value}.`;
});

function toIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

function select(day) {
  router.push(
    `/meeting-booking/${route.params.department}/${route.params.meetingType}/${day.iso}`,
  );
}

async function loadDates() {
  loading.value = true;
  error.value = null;
  try {
    const res = await fetchAvailableDates(
      route.params.department,
      route.params.meetingType,
      viewMonth.value,
      viewYear.value,
    );
    availableDates.value = new Set(res?.available_dates || []);
    timezone.value = res?.timezone || "";
  } catch (e) {
    error.value = e?.message || "Failed to load available dates.";
  } finally {
    loading.value = false;
  }
}

watch([viewMonth, viewYear], loadDates);
onMounted(loadDates);
</script>
