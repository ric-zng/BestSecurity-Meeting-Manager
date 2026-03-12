<template>
  <div
    v-if="bookingId"
    class="fixed inset-0 z-50 flex justify-end"
    @click.self="$emit('close')"
  >
    <div class="absolute inset-0 bg-black/30" @click="$emit('close')" />
    <div class="relative w-full max-w-md overflow-y-auto bg-white shadow-xl dark:bg-gray-800">
      <!-- Header -->
      <div class="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Booking Details</h2>
        <button @click="$emit('close')" class="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="details.loading" class="flex justify-center py-12">
        <LoadingSpinner />
      </div>

      <!-- Content -->
      <div v-else-if="details.data?.booking" class="space-y-4 p-4">
        <!-- Status + title -->
        <div>
          <StatusBadge :label="details.data.booking.booking_status" :status="details.data.booking.booking_status" />
          <h3 class="mt-2 text-base font-semibold text-gray-900 dark:text-white">
            {{ details.data.booking.meeting_title || details.data.meeting_type?.meeting_name || 'Meeting' }}
          </h3>
          <p v-if="details.data.booking.booking_reference" class="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">
            {{ details.data.booking.booking_reference }}
          </p>
        </div>

        <!-- Date/time/location -->
        <div class="space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
          <InfoRow icon="calendar" :text="formatDatetime(details.data.booking.start_datetime)" />
          <InfoRow icon="clock" :text="`${details.data.booking.duration} min`" />
          <InfoRow v-if="details.data.booking.location_type" icon="location" :text="details.data.booking.location_type" />
        </div>

        <!-- Customer -->
        <div v-if="details.data.customer" class="border-t border-gray-100 pt-4 dark:border-gray-700">
          <h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Customer</h4>
          <p class="text-sm font-medium text-gray-900 dark:text-white">{{ details.data.customer.customer_name || details.data.customer.name }}</p>
          <p v-if="details.data.customer.email_id" class="text-sm text-gray-500 dark:text-gray-400">{{ details.data.customer.email_id }}</p>
          <p v-if="details.data.customer.phone" class="text-sm text-gray-500 dark:text-gray-400">{{ details.data.customer.phone }}</p>
        </div>

        <!-- Hosts -->
        <div v-if="details.data.hosts?.length" class="border-t border-gray-100 pt-4 dark:border-gray-700">
          <h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Assigned To</h4>
          <div v-for="h in details.data.hosts" :key="h.user" class="flex items-center gap-2 py-1">
            <div class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {{ h.full_name?.charAt(0) || '?' }}
            </div>
            <span class="text-sm text-gray-900 dark:text-white">{{ h.full_name }}</span>
            <span v-if="h.is_primary_host" class="text-xs text-blue-600 dark:text-blue-400">(primary)</span>
          </div>
        </div>

        <!-- Action -->
        <div class="flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
          <button
            @click="$emit('view-full', details.data.booking.name)"
            class="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            View Full Details
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { watch } from "vue";
import { createResource } from "frappe-ui";
import LoadingSpinner from "@/components/shared/LoadingSpinner.vue";
import StatusBadge from "@/components/shared/StatusBadge.vue";
import InfoRow from "@/components/calendar/InfoRow.vue";

const API_BASE = "meeting_manager.meeting_manager.page.mm_enhanced_calendar.api";

const props = defineProps({
  bookingId: { type: String, default: null },
});

defineEmits(["close", "view-full"]);

const details = createResource({ url: `${API_BASE}.get_booking_details` });

watch(() => props.bookingId, (id) => {
  if (id) details.fetch({ params: { booking_id: id } });
}, { immediate: true });

function formatDatetime(dt) {
  if (!dt) return "";
  return new Date(dt).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}
</script>
