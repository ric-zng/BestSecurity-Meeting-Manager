<template>
  <div>
    <BackLink :to="`/meeting-booking/${$route.params.department}/${$route.params.meetingType}`">
      Back to date
    </BackLink>

    <PageHeader
      eyebrow="Step 4 of 5"
      :title="dateLabel"
      :subtitle="subtitle"
    />

    <LoadingSpinner v-if="loading" :size="40" />

    <ErrorState
      v-else-if="error"
      :message="error"
      :on-retry="load"
    />

    <div
      v-else-if="!slots.length"
      class="rounded-xl border border-brand-100 bg-white p-10 text-center shadow-card"
    >
      <p class="text-slate-500">
        No time slots are available on this date. Please pick a different date.
      </p>
    </div>

    <div v-else class="mx-auto max-w-2xl rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        <button
          v-for="slot in slots"
          :key="slot.start_time"
          @click="select(slot)"
          class="group flex flex-col items-center gap-0.5 rounded-xl border border-brand-100 bg-white px-3 py-3 text-sm font-semibold text-slate-800 transition-all hover:border-brand-500 hover:bg-brand-500 hover:text-white focus-ring"
        >
          <span class="font-semibold">{{ formatTime(slot.start_time) }}</span>
          <span class="text-[11px] font-normal text-slate-400 group-hover:text-white/80">
            to {{ formatTime(slot.end_time) }}
          </span>
        </button>
      </div>

      <p v-if="timezone" class="mt-5 text-center text-xs text-slate-500">
        Times shown in {{ timezone }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { fetchAvailableSlots } from "@/api.js";
import PageHeader from "@/components/PageHeader.vue";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import ErrorState from "@/components/ErrorState.vue";
import BackLink from "@/components/BackLink.vue";

const route = useRoute();
const router = useRouter();

const slots = ref([]);
const timezone = ref("");
const loading = ref(false);
const error = ref(null);

const dateLabel = computed(() => {
  const d = new Date(`${route.params.date}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
});

const subtitle = computed(() => {
  if (!slots.value.length) return "Pick a time that works for you.";
  return `${slots.value.length} available ${slots.value.length === 1 ? "time" : "times"}.`;
});

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function select(slot) {
  router.push(
    `/meeting-booking/${route.params.department}/${route.params.meetingType}/${route.params.date}/${slot.start_time}`,
  );
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const visitorTz =
      Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    const res = await fetchAvailableSlots(
      route.params.department,
      route.params.meetingType,
      route.params.date,
      visitorTz,
    );
    slots.value = res?.slots || [];
    timezone.value = res?.timezone || "";
  } catch (e) {
    error.value = e?.message || "Failed to load time slots.";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
