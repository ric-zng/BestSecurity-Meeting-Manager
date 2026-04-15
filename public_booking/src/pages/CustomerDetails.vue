<template>
  <div>
    <BackLink
      :to="`/meeting-booking/${$route.params.department}/${$route.params.meetingType}/${$route.params.date}`"
    >
      Back to time
    </BackLink>

    <PageHeader
      eyebrow="Step 5 of 5"
      title="Your Details"
      subtitle="Tell us a little about yourself so we can prepare for the meeting."
    />

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Form -->
      <form
        class="lg:col-span-2 space-y-5 rounded-2xl border border-brand-100 bg-white p-6 shadow-card"
        @submit.prevent="submit"
      >
        <div class="grid gap-5 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-slate-800 mb-1.5" for="customer_name">
              Full name <span class="text-rose-500">*</span>
            </label>
            <input
              id="customer_name"
              v-model="form.customer_name"
              type="text"
              required
              autocomplete="name"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-800 mb-1.5" for="customer_email">
              Email <span class="text-rose-500">*</span>
            </label>
            <input
              id="customer_email"
              v-model="form.customer_email"
              type="email"
              required
              autocomplete="email"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-800 mb-1.5" for="customer_phone">
              Phone <span class="text-rose-500">*</span>
            </label>
            <input
              id="customer_phone"
              v-model="form.customer_phone"
              type="tel"
              required
              autocomplete="tel"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="+45 12 34 56 78"
            />
          </div>

          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-slate-800 mb-1.5" for="customer_notes">
              Anything we should know? <span class="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="customer_notes"
              v-model="form.customer_notes"
              rows="4"
              maxlength="1000"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="Share any context that would help us prepare."
            />
            <p class="mt-1 text-xs text-slate-400">
              {{ (form.customer_notes || '').length }}/1000
            </p>
          </div>
        </div>

        <div v-if="error" class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {{ error }}
        </div>

        <div class="flex items-center justify-between pt-2">
          <p class="text-xs text-slate-500">
            By booking, you agree to receive meeting-related emails.
          </p>
          <button
            type="submit"
            :disabled="submitting"
            class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-60 disabled:pointer-events-none focus-ring"
          >
            <svg v-if="submitting" class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
            </svg>
            {{ submitting ? "Confirming…" : "Confirm booking" }}
            <svg v-if="!submitting" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </form>

      <!-- Summary -->
      <aside class="rounded-2xl border border-brand-100 bg-brand-50/50 p-6 shadow-card lg:sticky lg:top-32 h-fit">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-brand-700">Your meeting</h3>
        <dl class="mt-4 space-y-3 text-sm">
          <div class="flex items-start gap-2.5">
            <svg class="h-4 w-4 mt-0.5 text-brand-600" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2z" clip-rule="evenodd" />
            </svg>
            <div>
              <dt class="text-xs text-slate-500">Date</dt>
              <dd class="font-medium text-slate-900">{{ dateLabel }}</dd>
            </div>
          </div>
          <div class="flex items-start gap-2.5">
            <svg class="h-4 w-4 mt-0.5 text-brand-600" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
            </svg>
            <div>
              <dt class="text-xs text-slate-500">Time</dt>
              <dd class="font-medium text-slate-900">{{ timeLabel }}</dd>
            </div>
          </div>
        </dl>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { createBooking } from "@/api.js";
import PageHeader from "@/components/PageHeader.vue";
import BackLink from "@/components/BackLink.vue";

const route = useRoute();
const router = useRouter();

const form = ref({
  customer_name: "",
  customer_email: "",
  customer_phone: "",
  customer_notes: "",
});

const submitting = ref(false);
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

const timeLabel = computed(() => {
  const [h, m] = String(route.params.time).split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
});

async function submit() {
  submitting.value = true;
  error.value = null;
  try {
    const res = await createBooking({
      department_slug: route.params.department,
      meeting_type_slug: route.params.meetingType,
      scheduled_date: route.params.date,
      scheduled_start_time: route.params.time,
      customer_name: form.value.customer_name.trim(),
      customer_email: form.value.customer_email.trim(),
      customer_phone: form.value.customer_phone.trim(),
      customer_notes: form.value.customer_notes.trim(),
      customer_timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    });
    if (res?.success && res?.booking_id) {
      router.replace(`/meeting-booking/confirm/${res.booking_id}`);
    } else {
      error.value = "Something went wrong creating your booking.";
    }
  } catch (e) {
    error.value =
      e?.message ||
      (Array.isArray(e?.messages) ? e.messages.join(", ") : null) ||
      "Unable to create your booking. Please try again.";
  } finally {
    submitting.value = false;
  }
}
</script>
