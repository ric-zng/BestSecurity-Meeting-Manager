<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-x-full"
    enter-to-class="translate-x-0"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="translate-x-0"
    leave-to-class="translate-x-full"
  >
    <div
      v-if="bookingId"
      class="fixed inset-0 z-50 flex justify-end"
    >
      <div class="absolute inset-0 bg-black/30" @click="$emit('close')" />
      <div class="relative flex w-full max-w-md flex-col overflow-hidden bg-white shadow-xl dark:bg-gray-900">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-200 px-5 py-3.5 dark:border-gray-700">
          <div class="flex items-center gap-2">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">Booking Details</h2>
            <span v-if="booking" class="font-mono text-xs text-gray-400 dark:text-gray-500">{{ booking.name }}</span>
          </div>
          <div class="flex items-center gap-1">
            <button
              v-if="booking"
              @click="$emit('view-full', booking.name)"
              class="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              title="Open full page"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
            <button @click="$emit('close')" class="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex flex-1 items-center justify-center">
          <div class="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>

        <!-- Error -->
        <div v-else-if="error" class="flex flex-1 flex-col items-center justify-center gap-2 p-6">
          <svg class="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p class="text-sm text-red-500 dark:text-red-400">{{ error }}</p>
          <button @click="fetchDetails" class="text-sm text-blue-600 hover:underline dark:text-blue-400">Retry</button>
        </div>

        <!-- Content -->
        <div v-else-if="booking" class="flex-1 overflow-y-auto">
          <!-- Status bar -->
          <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  :style="statusBadgeStyle"
                >
                  {{ booking.booking_status }}
                </span>
                <span v-if="booking.is_internal" class="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  Team
                </span>
              </div>
              <!-- Status change button -->
              <button
                v-if="permissions?.can_edit && !isFinalized"
                @click="activePanel = activePanel === 'status' ? null : 'status'"
                class="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                Change
              </button>
            </div>

            <!-- Inline status change -->
            <transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div v-if="activePanel === 'status'" class="mt-3 space-y-2">
                <div class="grid grid-cols-2 gap-1.5">
                  <button
                    v-for="s in validStatuses"
                    :key="s.value"
                    @click="changeStatus(s.value)"
                    class="flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-xs font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                    :class="actionLoading === 'status' ? 'pointer-events-none opacity-50' : 'border-gray-200 dark:border-gray-700'"
                  >
                    <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: s.color }" />
                    <span class="truncate text-gray-700 dark:text-gray-300">{{ s.value }}</span>
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <!-- Title & meeting info -->
          <div class="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ booking.meeting_title || meetingType?.meeting_name || 'Meeting' }}
            </h3>
            <p v-if="meetingType?.meeting_name" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {{ meetingType.meeting_name }} &middot; {{ department?.department_name }}
            </p>
          </div>

          <!-- Date/Time section -->
          <div class="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <div class="flex items-center justify-between">
              <h4 class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Schedule</h4>
              <button
                v-if="permissions?.can_reschedule && !isFinalized"
                @click="activePanel = activePanel === 'reschedule' ? null : 'reschedule'"
                class="rounded px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                Reschedule
              </button>
            </div>
            <div class="mt-2 space-y-1.5">
              <div class="flex items-center gap-2 text-sm">
                <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span class="text-gray-900 dark:text-white">{{ formatDate(booking.start_datetime) }}</span>
              </div>
              <div class="flex items-center gap-2 text-sm">
                <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-gray-900 dark:text-white">{{ formatTimeRange(booking.start_datetime, booking.end_datetime) }}</span>
                <span class="text-xs text-gray-400">({{ booking.duration_minutes || booking.duration }} min)</span>
              </div>
              <div v-if="booking.service_type" class="flex items-center gap-2 text-sm">
                <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span class="text-gray-900 dark:text-white">{{ booking.service_type }}</span>
              </div>
            </div>

            <!-- Inline reschedule form -->
            <transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div v-if="activePanel === 'reschedule'" class="mt-3 space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="mb-1 block text-[10px] font-medium uppercase text-gray-500">Date</label>
                    <input v-model="rescheduleForm.date" type="date" class="fld" />
                  </div>
                  <div>
                    <label class="mb-1 block text-[10px] font-medium uppercase text-gray-500">Time</label>
                    <input v-model="rescheduleForm.time" type="time" class="fld" />
                  </div>
                </div>
                <div class="flex gap-2">
                  <button @click="activePanel = null" class="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:text-gray-300">Cancel</button>
                  <button
                    @click="rescheduleBooking"
                    :disabled="!rescheduleForm.date || !rescheduleForm.time || actionLoading === 'reschedule'"
                    class="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {{ actionLoading === 'reschedule' ? 'Saving...' : 'Save' }}
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <!-- Customer section (non-internal) -->
          <div v-if="customer && !booking.is_internal" class="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h4 class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Customer</h4>
            <div class="mt-2">
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ customer.customer_name || customer.name }}</p>
              <p v-if="customer.primary_email || customer.email_id" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {{ customer.primary_email || customer.email_id }}
              </p>
            </div>
          </div>

          <!-- Hosts section -->
          <div class="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <div class="flex items-center justify-between">
              <h4 class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Assigned To</h4>
              <button
                v-if="permissions?.can_reassign && !isFinalized && !booking.is_internal"
                @click="openReassignPanel"
                class="rounded px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                Reassign
              </button>
            </div>
            <div class="mt-2 space-y-2">
              <div v-for="h in hosts" :key="h.user" class="flex items-center gap-2.5">
                <div
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  :class="h.is_primary_host
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'"
                >
                  {{ h.full_name?.charAt(0)?.toUpperCase() || '?' }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ h.full_name }}</p>
                  <p v-if="h.is_primary_host" class="text-[10px] text-blue-600 dark:text-blue-400">Primary host</p>
                </div>
              </div>
            </div>

            <!-- Inline reassign form -->
            <transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div v-if="activePanel === 'reassign'" class="mt-3 space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <div>
                  <label class="mb-1 block text-[10px] font-medium uppercase text-gray-500">Assign to</label>
                  <div v-if="membersLoading" class="flex items-center gap-2 py-2 text-xs text-gray-400">
                    <div class="h-3 w-3 animate-spin rounded-full border border-gray-400 border-t-transparent" />
                    Loading members...
                  </div>
                  <select v-else v-model="reassignForm.user" class="fld">
                    <option value="" disabled>Select team member...</option>
                    <option v-for="m in departmentMembers" :key="m.user" :value="m.user">
                      {{ m.full_name || m.user }}
                    </option>
                  </select>
                </div>
                <div class="flex gap-2">
                  <button @click="activePanel = null" class="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:text-gray-300">Cancel</button>
                  <button
                    @click="reassignBooking"
                    :disabled="!reassignForm.user || actionLoading === 'reassign'"
                    class="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {{ actionLoading === 'reassign' ? 'Saving...' : 'Reassign' }}
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <!-- Notes/Description -->
          <div v-if="booking.notes || booking.meeting_description" class="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h4 class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Notes</h4>
            <p class="mt-1.5 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{{ booking.notes || booking.meeting_description }}</p>
          </div>

          <!-- Action buttons (bottom) -->
          <div class="px-5 py-4">
            <div class="flex gap-2">
              <button
                @click="$emit('view-full', booking.name)"
                class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Full Details
              </button>
              <button
                v-if="permissions?.can_cancel && !isFinalized"
                @click="activePanel = activePanel === 'cancel' ? null : 'cancel'"
                class="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Cancel
              </button>
            </div>

            <!-- Cancel confirmation -->
            <transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div v-if="activePanel === 'cancel'" class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <p class="text-xs font-medium text-red-700 dark:text-red-400">
                  Cancel this booking? This cannot be undone.
                </p>
                <div class="mt-2 flex gap-2">
                  <button @click="activePanel = null" class="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    Keep
                  </button>
                  <button
                    @click="cancelBooking"
                    :disabled="actionLoading === 'cancel'"
                    class="flex-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {{ actionLoading === 'cancel' ? 'Cancelling...' : 'Confirm Cancel' }}
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>

        <!-- Success toast overlay -->
        <transition enter-active-class="transition duration-300" enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0">
          <div v-if="successMsg" class="absolute bottom-4 left-4 right-4 rounded-lg bg-green-600 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg">
            {{ successMsg }}
          </div>
        </transition>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { call } from "frappe-ui";
import { getStatusColor, useCalendarState } from "@/composables/useCalendarState";

const API_BASE = "meeting_manager.meeting_manager.page.mm_enhanced_calendar.api";
const BOOKING_API = "meeting_manager.meeting_manager.api.booking";

const props = defineProps({
  bookingId: { type: String, default: null },
});

const emit = defineEmits(["close", "view-full", "refresh"]);

// State
const loading = ref(false);
const error = ref(null);
const booking = ref(null);
const meetingType = ref(null);
const department = ref(null);
const customer = ref(null);
const hosts = ref([]);
const permissions = ref(null);
const activePanel = ref(null); // 'status' | 'reschedule' | 'reassign' | 'cancel'
const actionLoading = ref(null);
const successMsg = ref(null);

// Reassign state
const departmentMembers = ref([]);
const membersLoading = ref(false);

// Forms
const rescheduleForm = ref({ date: "", time: "" });
const reassignForm = ref({ user: "" });

// Computed
const { allStatuses } = useCalendarState();

const isFinalized = computed(() => {
  const finalized = ["Cancelled", "Sale Approved", "Booking Approved Not Sale", "Not Possible", "Completed"];
  return finalized.includes(booking.value?.booking_status);
});

const validStatuses = computed(() =>
  allStatuses.value.filter((s) => s.value !== booking.value?.booking_status)
);

const statusBadgeStyle = computed(() => {
  const color = getStatusColor(booking.value?.booking_status || "");
  return {
    backgroundColor: color + "1a",
    color: color,
  };
});

// Fetch booking details
async function fetchDetails() {
  if (!props.bookingId) return;
  loading.value = true;
  error.value = null;
  booking.value = null;
  activePanel.value = null;
  try {
    const res = await call(`${API_BASE}.get_booking_details`, {
      booking_id: props.bookingId,
    });
    if (res?.booking) {
      booking.value = res.booking;
      meetingType.value = res.meeting_type || null;
      department.value = res.department || null;
      customer.value = res.customer || null;
      hosts.value = res.hosts || [];
      permissions.value = res.permissions || null;
    } else {
      error.value = res?.message || "Booking not found";
    }
  } catch (err) {
    error.value = err?.message || "Failed to load booking";
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.bookingId,
  (id) => {
    if (id) fetchDetails();
    else {
      booking.value = null;
      error.value = null;
    }
  },
  { immediate: true }
);

// Actions
function showSuccess(msg) {
  successMsg.value = msg;
  setTimeout(() => (successMsg.value = null), 2000);
}

async function changeStatus(newStatus) {
  actionLoading.value = "status";
  try {
    const res = await call(`${BOOKING_API}.update_booking_status`, {
      booking_id: booking.value.name,
      new_status: newStatus,
    });
    if (res?.success) {
      booking.value.booking_status = newStatus;
      activePanel.value = null;
      showSuccess(`Status changed to "${newStatus}"`);
      emit("refresh");
    } else {
      error.value = res?.message || "Failed to update status";
    }
  } catch (err) {
    error.value = err?.messages?.[0] || err?.message || "Failed to update status";
  } finally {
    actionLoading.value = null;
  }
}

async function rescheduleBooking() {
  actionLoading.value = "reschedule";
  try {
    const newStartDt = `${rescheduleForm.value.date} ${rescheduleForm.value.time}:00`;
    // Calculate new end time based on duration
    const start = new Date(`${rescheduleForm.value.date}T${rescheduleForm.value.time}`);
    const duration = booking.value.duration_minutes || booking.value.duration || 30;
    const end = new Date(start.getTime() + duration * 60000);
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")} ${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}:00`;

    const res = await call(`${API_BASE}.update_calendar_booking`, {
      booking_id: booking.value.name,
      start_datetime: newStartDt,
      end_datetime: endStr,
    });
    if (res?.success) {
      booking.value.start_datetime = newStartDt;
      booking.value.end_datetime = endStr;
      activePanel.value = null;
      showSuccess("Booking rescheduled");
      emit("refresh");
    } else {
      error.value = res?.message || "Failed to reschedule";
    }
  } catch (err) {
    error.value = err?.messages?.[0] || err?.message || "Failed to reschedule";
  } finally {
    actionLoading.value = null;
  }
}

async function openReassignPanel() {
  activePanel.value = "reassign";
  reassignForm.value.user = "";
  if (department.value?.name) {
    membersLoading.value = true;
    try {
      const res = await call(`${BOOKING_API}.get_department_members`, {
        department: department.value.name,
      });
      departmentMembers.value = (res || []).filter(
        (m) => !hosts.value.some((h) => h.user === m.user)
      );
    } catch {
      departmentMembers.value = [];
    } finally {
      membersLoading.value = false;
    }
  }
}

async function reassignBooking() {
  actionLoading.value = "reassign";
  try {
    const res = await call(`${BOOKING_API}.reassign_booking`, {
      booking_id: booking.value.name,
      new_assigned_to: reassignForm.value.user,
    });
    if (res?.success) {
      activePanel.value = null;
      showSuccess("Booking reassigned");
      emit("refresh");
      // Refresh to get updated host info
      await fetchDetails();
    } else {
      error.value = res?.message || "Failed to reassign";
    }
  } catch (err) {
    error.value = err?.messages?.[0] || err?.message || "Failed to reassign";
  } finally {
    actionLoading.value = null;
  }
}

async function cancelBooking() {
  actionLoading.value = "cancel";
  try {
    const res = await call(`${BOOKING_API}.update_booking_status`, {
      booking_id: booking.value.name,
      new_status: "Cancelled",
      notes: "Cancelled from calendar sidebar",
    });
    if (res?.success) {
      booking.value.booking_status = "Cancelled";
      activePanel.value = null;
      showSuccess("Booking cancelled");
      emit("refresh");
    } else {
      error.value = res?.message || "Failed to cancel";
    }
  } catch (err) {
    error.value = err?.messages?.[0] || err?.message || "Failed to cancel";
  } finally {
    actionLoading.value = null;
  }
}

// Pre-fill reschedule form when panel opens
watch(activePanel, (panel) => {
  if (panel === "reschedule" && booking.value?.start_datetime) {
    const dt = new Date(booking.value.start_datetime);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    rescheduleForm.value.date = `${y}-${m}-${d}`;
    rescheduleForm.value.time = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
  }
});

// Formatting
function formatDate(dt) {
  if (!dt) return "";
  return new Date(dt).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeRange(start, end) {
  if (!start) return "";
  const fmt = (d) =>
    new Date(d).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  return `${fmt(start)} – ${end ? fmt(end) : ""}`;
}
</script>

<style scoped>
.fld {
  @apply w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white;
}
</style>
