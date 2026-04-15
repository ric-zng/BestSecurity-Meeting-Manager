<template>
  <div>
    <PageHeader
      eyebrow="Step 1 of 5"
      title="Select a Department"
      subtitle="Choose the department you'd like to book a meeting with."
    />

    <LoadingSpinner v-if="loading" :size="40" />

    <ErrorState
      v-else-if="error"
      :message="error"
      :on-retry="load"
    />

    <div
      v-else-if="!departments.length"
      class="rounded-xl border border-brand-100 bg-white p-10 text-center shadow-card"
    >
      <p class="text-slate-500">No departments are currently accepting public bookings.</p>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2">
      <button
        v-for="dept in departments"
        :key="dept.name"
        @click="select(dept)"
        class="group flex flex-col items-start gap-3 rounded-2xl border border-brand-100 bg-white p-6 text-left shadow-card transition-all hover:border-brand-300 hover:shadow-card-hover focus-ring"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-500 group-hover:text-white transition-colors">
          <svg class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7z" />
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-slate-900">{{ dept.department_name }}</h3>
          <p v-if="dept.description" class="mt-1 line-clamp-2 text-sm text-slate-500">
            {{ dept.description }}
          </p>
          <p class="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2z" clip-rule="evenodd" />
            </svg>
            {{ dept.meeting_types_count }} meeting {{ dept.meeting_types_count === 1 ? 'type' : 'types' }}
          </p>
        </div>
        <span class="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 group-hover:gap-2 transition-all">
          Continue
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
import { useRouter } from "vue-router";
import { fetchDepartments } from "@/api.js";
import PageHeader from "@/components/PageHeader.vue";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import ErrorState from "@/components/ErrorState.vue";

const router = useRouter();
const departments = ref([]);
const loading = ref(false);
const error = ref(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await fetchDepartments();
    departments.value = res?.departments || [];
  } catch (e) {
    error.value = e?.message || "Failed to load departments.";
  } finally {
    loading.value = false;
  }
}

function select(dept) {
  router.push(`/meeting-booking/${dept.department_slug}`);
}

onMounted(load);
</script>
