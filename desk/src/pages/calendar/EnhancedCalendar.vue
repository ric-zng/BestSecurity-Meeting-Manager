<template>
  <div class="h-full flex flex-col">
    <!-- Header / Toolbar -->
    <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div class="flex items-center gap-3">
        <h1 class="text-lg font-bold text-gray-900 dark:text-white">Calendar</h1>
        <!-- Department filter -->
        <select
          v-model="filters.department"
          @change="refreshCalendar"
          class="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Departments</option>
          <option v-for="dept in auth.accessibleDepartments" :key="dept.name" :value="dept.name">
            {{ dept.department_name }}
          </option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <!-- Status filter -->
        <select
          v-model="filters.status"
          @change="refreshCalendar"
          class="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5"
        >
          <option value="">All Statuses</option>
          <option v-for="s in bookingStatuses" :key="s" :value="s">{{ s }}</option>
        </select>

        <!-- Service filter -->
        <select
          v-model="filters.service"
          @change="refreshCalendar"
          class="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5"
        >
          <option value="">All Services</option>
          <option v-for="s in serviceTypes" :key="s" :value="s">{{ s }}</option>
        </select>

        <!-- View toggles -->
        <div class="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          <button
            v-for="v in views"
            :key="v.key"
            @click="changeView(v.key)"
            class="px-3 py-1.5 text-sm font-medium transition-colors"
            :class="
              currentView === v.key
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            "
          >
            {{ v.label }}
          </button>
        </div>

        <!-- New booking button -->
        <button
          v-if="auth.permissions.can_create_bookings"
          @click="router.push('/meeting-manager/book')"
          class="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Booking
        </button>
      </div>
    </div>

    <!-- Calendar container -->
    <div class="flex-1 overflow-hidden p-2">
      <div ref="calendarEl" class="h-full"></div>
    </div>

    <!-- Event detail sidebar / modal -->
    <div
      v-if="selectedEvent"
      class="fixed inset-0 z-50 flex justify-end"
      @click.self="selectedEvent = null"
    >
      <div class="absolute inset-0 bg-black/30" @click="selectedEvent = null"></div>
      <div class="relative w-full max-w-md bg-white dark:bg-gray-800 shadow-xl overflow-y-auto">
        <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Booking Details</h2>
          <button @click="selectedEvent = null" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="bookingDetails.loading" class="flex justify-center py-12">
          <LoadingSpinner />
        </div>
        <div v-else-if="bookingDetails.data?.booking" class="p-4 space-y-4">
          <div>
            <StatusBadge :label="bookingDetails.data.booking.booking_status" :status="bookingDetails.data.booking.booking_status" />
            <h3 class="mt-2 text-base font-semibold text-gray-900 dark:text-white">
              {{ bookingDetails.data.booking.meeting_title || bookingDetails.data.meeting_type?.meeting_name || 'Meeting' }}
            </h3>
            <p v-if="bookingDetails.data.booking.booking_reference" class="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
              {{ bookingDetails.data.booking.booking_reference }}
            </p>
          </div>

          <!-- Date/Time -->
          <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2">
            <div class="flex items-center gap-2 text-sm">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span class="text-gray-900 dark:text-white">{{ formatDatetime(bookingDetails.data.booking.start_datetime) }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-gray-900 dark:text-white">{{ bookingDetails.data.booking.duration }} min</span>
            </div>
            <div v-if="bookingDetails.data.booking.location_type" class="flex items-center gap-2 text-sm">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span class="text-gray-900 dark:text-white">{{ bookingDetails.data.booking.location_type }}</span>
            </div>
          </div>

          <!-- Customer -->
          <div v-if="bookingDetails.data.customer" class="border-t border-gray-100 dark:border-gray-700 pt-4">
            <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Customer</h4>
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ bookingDetails.data.customer.customer_name || bookingDetails.data.customer.name }}</p>
            <p v-if="bookingDetails.data.customer.email_id" class="text-sm text-gray-500 dark:text-gray-400">{{ bookingDetails.data.customer.email_id }}</p>
            <p v-if="bookingDetails.data.customer.phone" class="text-sm text-gray-500 dark:text-gray-400">{{ bookingDetails.data.customer.phone }}</p>
          </div>

          <!-- Hosts -->
          <div v-if="bookingDetails.data.hosts?.length" class="border-t border-gray-100 dark:border-gray-700 pt-4">
            <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Assigned To</h4>
            <div v-for="h in bookingDetails.data.hosts" :key="h.user" class="flex items-center gap-2 py-1">
              <div class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-medium text-blue-700 dark:text-blue-400">
                {{ h.full_name?.charAt(0) || '?' }}
              </div>
              <span class="text-sm text-gray-900 dark:text-white">{{ h.full_name }}</span>
              <span v-if="h.is_primary_host" class="text-xs text-blue-600 dark:text-blue-400">(primary)</span>
            </div>
          </div>

          <!-- Service type -->
          <div v-if="bookingDetails.data.booking.select_mkru" class="border-t border-gray-100 dark:border-gray-700 pt-4">
            <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Service</h4>
            <p class="text-sm text-gray-900 dark:text-white">{{ bookingDetails.data.booking.select_mkru }}</p>
          </div>

          <!-- Actions -->
          <div class="border-t border-gray-100 dark:border-gray-700 pt-4 flex gap-2">
            <button
              @click="router.push(`/meeting-manager/bookings/${bookingDetails.data.booking.name}`); selectedEvent = null"
              class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Full Details
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { createResource, call } from "frappe-ui";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import resourceTimeGridPlugin from "@fullcalendar/resource-timegrid";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import { useAuthStore } from "@/stores/auth";
import LoadingSpinner from "@/components/shared/LoadingSpinner.vue";
import StatusBadge from "@/components/shared/StatusBadge.vue";

const router = useRouter();
const auth = useAuthStore();

const calendarEl = ref(null);
let calendar = null;

const selectedEvent = ref(null);
const currentView = ref("resourceTimeGridDay");

const filters = reactive({
  department: "",
  status: "",
  service: "",
});

const bookingStatuses = [
  "New Appointment", "New Booking", "Booking Started", "Sale Approved",
  "Booking Approved Not Sale", "Call Customer About Sale", "No Answer 1",
  "No Answer 2", "No Answer 3", "No Answer 4-5", "Customer Unsure",
  "No Contact About Offer", "Cancelled", "Optimising Not Possible",
  "Not Possible", "Rebook", "Rebook Earlier", "Consent Sent Awaiting",
];

const serviceTypes = [
  "Business", "Business Extended", "Business Rebook", "New Setup Business",
  "Private/Business Customer", "Private New Sale", "Private Self Book",
  "Microsoft 365 Backup", "Website Security",
];

const views = [
  { key: "resourceTimeGridDay", label: "Day" },
  { key: "resourceTimelineWeek", label: "Week" },
  { key: "dayGridMonth", label: "Month" },
];

const bookingDetails = createResource({
  url: "meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.get_booking_details",
});

function formatDatetime(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

async function fetchResources(fetchInfo, successCallback, failureCallback) {
  try {
    const params = {};
    if (filters.department) {
      params.departments = JSON.stringify([filters.department]);
    }
    const resources = await call(
      "meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.get_calendar_resources",
      params
    );
    successCallback(resources || []);
  } catch (e) {
    failureCallback(e);
  }
}

async function fetchEvents(fetchInfo, successCallback, failureCallback) {
  try {
    const params = {
      start: fetchInfo.startStr.split("T")[0],
      end: fetchInfo.endStr.split("T")[0],
    };
    if (filters.department) {
      params.departments = JSON.stringify([filters.department]);
    }
    if (filters.status) {
      params.statuses = JSON.stringify([filters.status]);
    }
    if (filters.service) {
      params.services = JSON.stringify([filters.service]);
    }
    const events = await call(
      "meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.get_calendar_events",
      params
    );
    successCallback(events || []);
  } catch (e) {
    failureCallback(e);
  }
}

function handleEventClick(info) {
  const bookingId = info.event.id;
  selectedEvent.value = bookingId;
  bookingDetails.fetch({ params: { booking_id: bookingId } });
}

async function handleEventDrop(info) {
  const bookingId = info.event.id;
  const newResource = info.newResource;
  const newStart = info.event.start;

  if (newResource && newResource.id !== info.oldResource?.id) {
    // Reassignment via drag-drop
    try {
      await call("meeting_manager.meeting_manager.api.booking.reassign_booking", {
        booking_id: bookingId,
        new_assigned_to: newResource.id,
        reason: "Reassigned via calendar drag-drop",
      });
    } catch (e) {
      info.revert();
      return;
    }
  }

  if (newStart) {
    const dateStr = newStart.toISOString().split("T")[0];
    const hours = String(newStart.getHours()).padStart(2, "0");
    const mins = String(newStart.getMinutes()).padStart(2, "0");
    try {
      await call("meeting_manager.meeting_manager.api.booking.reschedule_booking_internal", {
        booking_id: bookingId,
        new_date: dateStr,
        new_time: `${hours}:${mins}`,
        reason: "Rescheduled via calendar drag-drop",
      });
    } catch (e) {
      info.revert();
    }
  }
}

function changeView(viewKey) {
  currentView.value = viewKey;
  if (calendar) {
    calendar.changeView(viewKey);
  }
}

function refreshCalendar() {
  if (calendar) {
    calendar.refetchResources();
    calendar.refetchEvents();
  }
}

onMounted(() => {
  if (!calendarEl.value) return;

  const canDrag = auth.permissions.can_reassign || auth.isSystemManager;

  calendar = new Calendar(calendarEl.value, {
    plugins: [dayGridPlugin, interactionPlugin, resourceTimeGridPlugin, resourceTimelinePlugin],
    initialView: currentView.value,
    schedulerLicenseKey: "GPL-My-Project-Is-Open-Source",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "",
    },
    height: "100%",
    nowIndicator: true,
    slotMinTime: "07:00:00",
    slotMaxTime: "20:00:00",
    slotDuration: "00:15:00",
    slotLabelInterval: "01:00:00",
    resourceAreaWidth: "180px",
    resourceAreaHeaderContent: "Team Members",
    resources: fetchResources,
    events: fetchEvents,
    editable: canDrag,
    droppable: canDrag,
    eventClick: handleEventClick,
    eventDrop: handleEventDrop,
    eventDidMount(info) {
      // Tooltip with meeting details
      const ep = info.event.extendedProps;
      if (ep) {
        info.el.title = [
          info.event.title,
          ep.booking_status,
          ep.customer_name,
          ep.select_mkru,
        ].filter(Boolean).join(" | ");
      }
    },
    // Dark mode aware
    themeSystem: "standard",
  });

  calendar.render();
});

onBeforeUnmount(() => {
  if (calendar) {
    calendar.destroy();
    calendar = null;
  }
});
</script>

<style>
/* FullCalendar dark mode overrides */
.dark .fc {
  --fc-border-color: #374151;
  --fc-page-bg-color: #1f2937;
  --fc-neutral-bg-color: #111827;
  --fc-list-event-hover-bg-color: #1f2937;
  --fc-today-bg-color: rgba(59, 130, 246, 0.1);
  --fc-now-indicator-color: #3b82f6;
}

.dark .fc .fc-col-header-cell,
.dark .fc .fc-timegrid-axis,
.dark .fc .fc-daygrid-day-number,
.dark .fc .fc-col-header-cell-cushion {
  color: #d1d5db;
}

.dark .fc .fc-button-primary {
  background-color: #374151;
  border-color: #4b5563;
  color: #d1d5db;
}

.dark .fc .fc-button-primary:hover {
  background-color: #4b5563;
}

.dark .fc .fc-button-primary:not(:disabled).fc-button-active {
  background-color: #2563eb;
  border-color: #2563eb;
}

.dark .fc .fc-toolbar-title {
  color: #f3f4f6;
}

.dark .fc .fc-resource-area .fc-datagrid-cell-main {
  color: #d1d5db;
}

.dark .fc td,
.dark .fc th {
  border-color: #374151;
}

/* Event styling */
.fc-event {
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.75rem;
  padding: 1px 4px;
}

.fc .fc-resource-timeline .fc-resource-area {
  width: 180px;
}
</style>
