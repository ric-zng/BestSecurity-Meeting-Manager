<template>
  <div>
    <BackLink to="/meeting-booking">Back to departments</BackLink>

    <PageHeader
      eyebrow="Step 2 of 5"
      :title="department?.name ? `${department.name} — Meeting Types` : 'Select a Meeting Type'"
      subtitle="Choose the type of meeting you need."
    />

    <LoadingSpinner v-if="loading" :size="40" />

    <ErrorState
      v-else-if="error"
      :message="error"
      :on-retry="load"
    />

    <div
      v-else-if="!meetingTypes.length"
      class="rounded-xl border border-brand-100 bg-white p-10 text-center shadow-card"
    >
      <p class="text-slate-500">No public meeting types are available in this department.</p>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2">
      <button
        v-for="mt in meetingTypes"
        :key="mt.name"
        @click="select(mt)"
        class="group flex flex-col items-start gap-3 rounded-2xl border border-brand-100 bg-white p-6 text-left shadow-card transition-all hover:border-brand-300 hover:shadow-card-hover focus-ring"
      >
        <div class="flex items-center gap-3 w-full">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 group-hover:bg-brand-500 group-hover:text-white transition-colors">
            <svg v-if="mt.location_type === 'Video Call'" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
            <svg v-else-if="mt.location_type === 'Phone'" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            <svg v-else class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-base font-semibold text-slate-900 truncate">{{ mt.meeting_name }}</h3>
            <p class="mt-0.5 text-xs text-slate-500">
              {{ mt.duration }} minutes · {{ mt.location_type || 'Meeting' }}
            </p>
          </div>
        </div>
        <p v-if="mt.description" class="text-sm text-slate-600 line-clamp-3">
          {{ mt.description }}
        </p>
        <span class="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 group-hover:gap-2 transition-all">
          Choose this
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { fetchDepartmentMeetingTypes } from "@/api.js";
import PageHeader from "@/components/PageHeader.vue";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import ErrorState from "@/components/ErrorState.vue";
import BackLink from "@/components/BackLink.vue";

const route = useRoute();
const router = useRouter();
const meetingTypes = ref([]);
const department = ref(null);
const loading = ref(false);
const error = ref(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await fetchDepartmentMeetingTypes(route.params.department);
    meetingTypes.value = res?.meeting_types || [];
    department.value = res?.department || null;
  } catch (e) {
    error.value = e?.message || "Failed to load meeting types.";
  } finally {
    loading.value = false;
  }
}

function select(mt) {
  router.push(`/meeting-booking/${route.params.department}/${mt.meeting_slug}`);
}

onMounted(load);
</script>
