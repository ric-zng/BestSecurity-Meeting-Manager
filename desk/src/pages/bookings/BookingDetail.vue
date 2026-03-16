<template>
  <div>
    <!-- Loading state -->
    <div v-if="bookingResource.loading && !data" class="p-6">
      <div class="mb-6 flex items-center gap-3">
        <div class="h-8 w-20 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
        <div class="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="lg:col-span-2 space-y-6">
          <div v-for="i in 2" :key="i" class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <div class="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700 mb-4" />
            <div class="space-y-3">
              <div class="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div class="h-4 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div class="h-4 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        </div>
        <div class="space-y-6">
          <div v-for="i in 3" :key="i" class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <div class="h-5 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700 mb-4" />
            <div class="space-y-3">
              <div class="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div class="h-4 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="bookingResource.error || (data && !data.success)" class="p-6">
      <ErrorState
        title="Booking not found"
        :message="data?.message || bookingResource.error?.message || 'Could not load booking details.'"
        @retry="bookingResource.reload()"
      />
    </div>

    <!-- Main content -->
    <div v-else-if="data?.success" class="p-6">
      <!-- Header -->
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
          <button
            @click="router.push('/bookings')"
            class="flex items-center justify-center rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <FeatherIcon name="arrow-left" class="h-5 w-5" />
          </button>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
                {{ booking.name }}
              </h1>
              <StatusBadge :label="booking.booking_status" :status="booking.booking_status" />
            </div>
            <p v-if="booking.meeting_title" class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {{ booking.meeting_title }}
            </p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <!-- Prev/Next Navigation -->
          <div class="flex items-center gap-1">
            <Tooltip :text="prevId ? `Previous: ${prevId}` : 'No previous booking'">
              <button
                @click="goToPrevious"
                :disabled="!hasPrevious"
                class="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <FeatherIcon name="chevron-left" class="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip :text="nextId ? `Next: ${nextId}` : 'No next booking'">
              <button
                @click="goToNext"
                :disabled="!hasNext"
                class="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <FeatherIcon name="chevron-right" class="h-4 w-4" />
              </button>
            </Tooltip>
          </div>

          <Button
            v-if="permissions.can_edit"
            variant="subtle"
            @click="showStatusModal = true"
          >
            <template #prefix>
              <FeatherIcon name="edit-3" class="h-4 w-4" />
            </template>
            Edit Status
          </Button>
          <Button
            v-if="permissions.can_reschedule"
            variant="subtle"
            @click="showRescheduleModal = true"
          >
            <template #prefix>
              <FeatherIcon name="calendar" class="h-4 w-4" />
            </template>
            Reschedule
          </Button>
          <Button
            v-if="permissions.can_reassign"
            variant="subtle"
            @click="showReassignModal = true"
          >
            <template #prefix>
              <FeatherIcon name="user-plus" class="h-4 w-4" />
            </template>
            Reassign
          </Button>
          <Button
            v-if="permissions.can_cancel"
            theme="red"
            variant="subtle"
            @click="showCancelDialog = true"
          >
            <template #prefix>
              <FeatherIcon name="x-circle" class="h-4 w-4" />
            </template>
            Cancel
          </Button>
        </div>
      </div>

      <!-- Two-column layout -->
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Left column: main info -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Meeting Info Card -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Meeting Information</h2>
            </div>
            <div class="px-5 py-4">
              <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Meeting Title</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ booking.meeting_title || 'Untitled' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Meeting Type</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ meetingType?.meeting_name || meetingType?.name || '-' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Date &amp; Time</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ formatDateTime(booking.start_datetime) }}
                    <span v-if="booking.end_datetime" class="text-gray-400 dark:text-gray-500">
                      &ndash; {{ formatTime(booking.end_datetime) }}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Duration</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ booking.duration_minutes ? booking.duration_minutes + ' minutes' : booking.duration || '-' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Location Type</dt>
                  <dd class="mt-0.5 text-sm capitalize text-gray-900 dark:text-white">
                    {{ booking.location_type || '-' }}
                  </dd>
                </div>
                <div v-if="booking.video_meeting_url">
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Video Meeting URL</dt>
                  <dd class="mt-0.5 text-sm">
                    <a
                      :href="booking.video_meeting_url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <FeatherIcon name="video" class="h-3.5 w-3.5" />
                      Join Meeting
                      <FeatherIcon name="external-link" class="h-3 w-3" />
                    </a>
                  </dd>
                </div>
              </dl>
              <div v-if="booking.notes" class="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Description</dt>
                <dd class="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{{ booking.notes }}</dd>
              </div>
            </div>
          </div>

          <!-- Customer Card (non-internal only) -->
          <div
            v-if="!booking.is_internal && (customer || booking.customer_email_at_booking)"
            class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Customer</h2>
            </div>
            <div class="px-5 py-4">
              <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Name</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ customer?.customer_name || '-' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Email</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ customer?.primary_email || booking.customer_email_at_booking || '-' }}
                  </dd>
                </div>
                <div v-if="booking.customer_phone_at_booking">
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Phone</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ booking.customer_phone_at_booking }}
                  </dd>
                </div>
                <div v-if="booking.customer_notes">
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Notes</dt>
                  <dd class="mt-0.5 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                    {{ booking.customer_notes }}
                  </dd>
                </div>
              </dl>
              <div v-if="customer?.name" class="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                <a
                  :href="`/app/contact/${customer.name}`"
                  target="_blank"
                  class="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <FeatherIcon name="external-link" class="h-3 w-3" />
                  View Contact Record
                </a>
              </div>
            </div>
          </div>

          <!-- Participants Card (internal meeting) -->
          <div
            v-if="booking.is_internal && internalParticipants.length"
            class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
                Participants
                <span class="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">
                  ({{ internalParticipants.length }})
                </span>
              </h2>
            </div>
            <ul class="divide-y divide-gray-100 dark:divide-gray-800">
              <li
                v-for="p in internalParticipants"
                :key="p.user"
                class="flex items-center justify-between px-5 py-3"
              >
                <div class="flex items-center gap-3">
                  <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {{ getInitials(p.full_name || p.user) }}
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ p.full_name || p.user }}</p>
                    <p v-if="p.email" class="text-xs text-gray-500 dark:text-gray-400">{{ p.email }}</p>
                  </div>
                </div>
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="attendanceClass(p.response_status)"
                >
                  {{ p.response_status || 'Pending' }}
                </span>
              </li>
            </ul>
          </div>

          <!-- History/Timeline Card -->
          <div
            v-if="hasHistory"
            class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">History</h2>
            </div>
            <div class="px-5 py-4">
              <ol class="relative border-l border-gray-200 dark:border-gray-700">
                <li
                  v-for="(entry, idx) in timelineEntries"
                  :key="idx"
                  class="mb-6 ml-6 last:mb-0"
                >
                  <div class="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-gray-100 dark:border-gray-900 dark:bg-gray-700">
                    <FeatherIcon :name="entry.icon" class="h-3 w-3 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div>
                    <p class="text-sm text-gray-900 dark:text-white">{{ entry.description }}</p>
                    <time class="text-xs text-gray-500 dark:text-gray-400">{{ entry.time }}</time>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>

        <!-- Right column: sidebar cards -->
        <div class="space-y-6">
          <!-- Hosts Card -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
                Hosts
                <span class="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">
                  ({{ hosts.length }})
                </span>
              </h2>
            </div>
            <ul class="divide-y divide-gray-100 dark:divide-gray-800">
              <li
                v-for="h in hosts"
                :key="h.user"
                class="flex items-center gap-3 px-5 py-3"
              >
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  {{ getInitials(h.full_name || h.user) }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {{ h.full_name || h.user }}
                  </p>
                  <p v-if="h.email" class="truncate text-xs text-gray-500 dark:text-gray-400">{{ h.email }}</p>
                </div>
                <span
                  v-if="h.is_primary_host"
                  class="shrink-0 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  Primary
                </span>
              </li>
              <li v-if="!hosts.length" class="px-5 py-3 text-sm text-gray-400 dark:text-gray-500">
                No hosts assigned
              </li>
            </ul>
          </div>

          <!-- Service Info Card -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Service Info</h2>
            </div>
            <dl class="px-5 py-4 space-y-3">
              <div>
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Service Type</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                  {{ booking.service_type || '-' }}
                </dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Booking Source</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                  {{ booking.booking_source || '-' }}
                </dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Booking Type</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                  {{ booking.is_internal ? 'Internal (Team Meeting)' : 'External (Customer)' }}
                </dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Department</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                  {{ department?.department_name || '-' }}
                </dd>
              </div>
            </dl>
          </div>

          <!-- Customer Bookings Card -->
          <div
            v-if="!booking.is_internal && customerEmail"
            class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
                Customer Bookings
                <span v-if="customerBookings.length" class="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">
                  ({{ customerBookings.length }})
                </span>
              </h2>
            </div>
            <div v-if="customerBookingsLoading" class="flex items-center justify-center px-5 py-6">
              <svg class="h-4 w-4 animate-spin text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div v-else-if="customerBookings.length === 0" class="px-5 py-4 text-sm text-gray-400 dark:text-gray-500">
              No other bookings found for this customer.
            </div>
            <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800 max-h-72 overflow-y-auto">
              <li
                v-for="cb in customerBookings"
                :key="cb.name"
                class="group cursor-pointer px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                @click="router.push(`/bookings/${cb.name}`)"
              >
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {{ cb.meeting_title || cb.name }}
                  </p>
                  <StatusBadge :label="cb.booking_status" :status="cb.booking_status" size="xs" />
                </div>
                <div class="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>{{ formatShortDate(cb.start_datetime) }}</span>
                  <span v-if="cb.assigned_to_name">{{ cb.assigned_to_name }}</span>
                  <span v-if="cb.select_mkru" class="text-gray-400 dark:text-gray-500">{{ cb.select_mkru }}</span>
                </div>
              </li>
            </ul>
          </div>

          <!-- Links Card -->
          <div
            v-if="booking.cancel_link || booking.reschedule_link"
            class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Customer Links</h2>
            </div>
            <div class="px-5 py-4 space-y-3">
              <div v-if="booking.cancel_link">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Cancel Link</dt>
                <dd class="mt-1 flex items-center gap-2">
                  <span class="min-w-0 flex-1 truncate text-xs text-gray-600 dark:text-gray-300">
                    {{ booking.cancel_link }}
                  </span>
                  <button
                    @click="copyToClipboard(booking.cancel_link, 'Cancel link')"
                    class="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    title="Copy to clipboard"
                  >
                    <FeatherIcon name="copy" class="h-3.5 w-3.5" />
                  </button>
                </dd>
              </div>
              <div v-if="booking.reschedule_link">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Reschedule Link</dt>
                <dd class="mt-1 flex items-center gap-2">
                  <span class="min-w-0 flex-1 truncate text-xs text-gray-600 dark:text-gray-300">
                    {{ booking.reschedule_link }}
                  </span>
                  <button
                    @click="copyToClipboard(booking.reschedule_link, 'Reschedule link')"
                    class="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    title="Copy to clipboard"
                  >
                    <FeatherIcon name="copy" class="h-3.5 w-3.5" />
                  </button>
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Modals -->
    <ChangeStatusModal
      :show="showStatusModal"
      :booking="booking"
      @close="showStatusModal = false"
      @success="bookingResource.reload()"
    />

    <RescheduleModal
      :show="showRescheduleModal"
      :booking="booking"
      @close="showRescheduleModal = false"
      @success="bookingResource.reload()"
    />

    <ReassignModal
      :show="showReassignModal"
      :booking="booking"
      :department-name="department?.name"
      @close="showReassignModal = false"
      @success="bookingResource.reload()"
    />

    <CancelBookingModal
      :show="showCancelDialog"
      :booking="booking"
      @close="showCancelDialog = false"
      @success="bookingResource.reload()"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createResource, call, toast, Tooltip } from 'frappe-ui'
import { useBookingNavigation } from '@/composables/useBookingNavigation'
import StatusBadge from '@/components/shared/StatusBadge.vue'
import ErrorState from '@/components/shared/ErrorState.vue'
import { useAuthStore } from '@/stores/auth'
import ChangeStatusModal from '@/components/bookings/ChangeStatusModal.vue'
import RescheduleModal from '@/components/bookings/RescheduleModal.vue'
import ReassignModal from '@/components/bookings/ReassignModal.vue'
import CancelBookingModal from '@/components/bookings/CancelBookingModal.vue'

const props = defineProps({
  bookingId: String,
})

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// ---- Booking Navigation ----
const {
  loadBookings,
  updateCurrentIndex,
  goToNext,
  goToPrevious,
  hasNext,
  hasPrevious,
  nextId,
  prevId,
} = useBookingNavigation()

onMounted(() => {
  loadBookings()
})

watch(
  () => route.params.id || route.params.bookingId,
  () => {
    updateCurrentIndex()
  }
)

// ---- Data fetching ----

const bookingResource = createResource({
  url: 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.get_booking_details',
  params: { booking_id: props.bookingId || route.params.bookingId },
  auto: true,
})

const data = computed(() => bookingResource.data)
const booking = computed(() => data.value?.booking || {})
const meetingType = computed(() => data.value?.meeting_type || {})
const department = computed(() => data.value?.department || {})
const customer = computed(() => data.value?.customer)
const hosts = computed(() => data.value?.hosts || [])
const internalParticipants = computed(() => data.value?.internal_participants || [])
const externalParticipants = computed(() => data.value?.external_participants || [])
const permissions = computed(() => data.value?.permissions || {})
const userContext = computed(() => data.value?.user_context || {})

// ---- Customer bookings ----
const customerEmail = computed(() => customer.value?.primary_email || booking.value.customer_email_at_booking || '')
const customerBookings = ref([])
const customerBookingsLoading = ref(false)

watch(customerEmail, async (email) => {
  customerBookings.value = []
  if (!email) return
  customerBookingsLoading.value = true
  try {
    const res = await call(
      'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.get_customer_bookings',
      { customer_email: email, exclude_booking: booking.value.name }
    )
    customerBookings.value = res || []
  } catch { customerBookings.value = [] }
  finally { customerBookingsLoading.value = false }
}, { immediate: true })

// ---- Formatting helpers ----

function formatDateTime(dt) {
  if (!dt) return '-'
  const d = new Date(dt)
  return d.toLocaleDateString('da-DK', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }) + ' ' + d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
}

function formatTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
}

function formatShortDate(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.split(/[\s@]+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

function attendanceClass(status) {
  const map = {
    Accepted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Declined: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Tentative: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  }
  return map[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

// ---- History / Timeline ----

const hasHistory = computed(() => {
  return (booking.value.assignment_history || booking.value.booking_history)
})

const timelineEntries = computed(() => {
  const entries = []

  // Parse assignment history (stored as text, each line is an entry)
  if (booking.value.assignment_history) {
    const lines = booking.value.assignment_history.split('\n').filter(Boolean)
    for (const line of lines) {
      entries.push({
        icon: 'user-plus',
        description: line.trim(),
        time: '',
      })
    }
  }

  // Parse booking history
  if (booking.value.booking_history) {
    const lines = booking.value.booking_history.split('\n').filter(Boolean)
    for (const line of lines) {
      entries.push({
        icon: 'clock',
        description: line.trim(),
        time: '',
      })
    }
  }

  return entries
})

// ---- Clipboard ----

async function copyToClipboard(text, label) {
  try {
    await navigator.clipboard.writeText(text)
    toast({ title: `${label} copied to clipboard`, icon: 'check' })
  } catch {
    // Fallback for older browsers
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    toast({ title: `${label} copied to clipboard`, icon: 'check' })
  }
}

// ---- Modal visibility ----

const showStatusModal = ref(false)
const showRescheduleModal = ref(false)
const showReassignModal = ref(false)
const showCancelDialog = ref(false)
</script>
