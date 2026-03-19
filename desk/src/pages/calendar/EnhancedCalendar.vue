<template>
  <div class="ec-root flex h-full flex-col">
    <!-- Toolbar -->
    <CalendarToolbar
      :current-view="currentView"
      :orientation="orientation"
      :views="activeViews"
      :departments="auth.accessibleDepartments"
      :selected-departments="filters.departments"
      :focus-department="filters.focusDepartment"
      :statuses="allStatuses"
      :active-statuses="filters.statuses"
      :service-types="serviceTypes"
      :active-services="filters.services"
      @change-view="changeView"
      @toggle-orientation="handleToggleOrientation"
      @update:selected-departments="filters.departments = $event"
      @update:active-statuses="filters.statuses = $event"
      @update:active-services="filters.services = $event"
      @new-booking="router.push('/book')"
      @navigate="handleNavigate"
      @jump-to-date="handleJumpToDate"
      @reload="handleReload"
    >
      <template #title>
        <h2 class="text-base font-semibold text-gray-900 dark:text-white" v-text="calendarTitle" />
      </template>
    </CalendarToolbar>

    <!-- Calendar container -->
    <div class="flex-1 overflow-hidden">
      <div ref="calendarEl" class="h-full" />
    </div>

    <!-- Dialogs -->
    <EventTooltip :show="tooltip.show" :event="tooltip.event" :position="tooltip.position" @close="tooltip.show = false" />
    <SlotActionDialog :show="slotAction.show" :slot-info="slotAction.info" @close="slotAction.show = false" @create-booking="openCreateBooking" @block-slot="openBlockSlot" />
    <BlockSlotDialog :show="blockSlot.show" :slot-info="blockSlot.info" @close="blockSlot.show = false" @success="onDialogSuccess('blockSlot')" />
    <CreateSlotBookingDialog :show="createBooking.show" :slot-info="createBooking.info" @close="createBooking.show = false" @success="onDialogSuccess('createBooking')" />
    <DragConfirmDialog :show="dragConfirm.show" :drag-info="dragConfirm.info" @close="cancelDrag" @confirm="confirmDrag" />
    <ConfirmDeleteDialog :show="deleteSlot.show" :slot-info="deleteSlot.info" @close="deleteSlot.show = false" @confirm="handleDeleteConfirm" />

    <!-- Booking detail sidebar -->
    <BookingDetailSidebar
      :booking-id="selectedEvent"
      @close="selectedEvent = null"
      @view-full="(name) => { router.push(`/bookings/${name}`); selectedEvent = null }"
      @refresh="calendar?.refetchEvents()"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import resourceTimeGridPlugin from "@fullcalendar/resource-timegrid";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";

import { useAuthStore } from "@/stores/auth";
import { useCalendarState, getStatusColor } from "@/composables/useCalendarState";
import { useCalendarPermissions } from "@/composables/useCalendarPermissions";
import { fetchResources as apiFetchResources, fetchEvents as apiFetchEvents, submitDragUpdate, deleteBlockedSlot } from "@/composables/useCalendarData";

import CalendarToolbar from "@/components/calendar/CalendarToolbar.vue";
import EventTooltip from "@/components/calendar/EventTooltip.vue";
import SlotActionDialog from "@/components/calendar/SlotActionDialog.vue";
import BlockSlotDialog from "@/components/calendar/BlockSlotDialog.vue";
import CreateSlotBookingDialog from "@/components/calendar/CreateSlotBookingDialog.vue";
import DragConfirmDialog from "@/components/calendar/DragConfirmDialog.vue";
import ConfirmDeleteDialog from "@/components/calendar/ConfirmDeleteDialog.vue";
import BookingDetailSidebar from "@/components/calendar/BookingDetailSidebar.vue";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const {
  currentView, orientation, filters, allStatuses,
  serviceTypes, activeViews, toggleOrientation,
} = useCalendarState();

// ── URL ↔ State sync ────────────────────────────────────────────────────────
let suppressUrlSync = false;

function readUrlState() {
  const q = route.query;
  suppressUrlSync = true;

  if (q.view && typeof q.view === "string") currentView.value = q.view;
  if (q.orientation && (q.orientation === "vertical" || q.orientation === "horizontal")) {
    orientation.value = q.orientation;
  }
  if (q.departments) {
    filters.departments = (typeof q.departments === "string" ? q.departments : "").split(",").filter(Boolean);
  }
  if (q.statuses) {
    filters.statuses = (typeof q.statuses === "string" ? q.statuses : "").split(",").filter(Boolean);
  }
  if (q.services) {
    filters.services = (typeof q.services === "string" ? q.services : "").split(",").filter(Boolean);
  }

  nextTick(() => { suppressUrlSync = false; });
}

function writeUrlState(extra) {
  if (suppressUrlSync) return;
  const q = {};

  q.view = currentView.value;
  q.orientation = orientation.value;
  if (filters.departments.length > 0) q.departments = filters.departments.join(",");
  if (filters.services.length > 0) q.services = filters.services.join(",");
  // Only persist statuses if not "all selected" (avoid long URL)
  if (filters.statuses.length > 0 && filters.statuses.length < allStatuses.value.length) {
    q.statuses = filters.statuses.join(",");
  }

  if (extra) Object.assign(q, extra);

  router.replace({ query: q });
}
const { canSelectSlot, canManageBlockedSlot, canModifyEvent } = useCalendarPermissions();

// ── Refs ──────────────────────────────────────────────────────────────────────
const calendarEl = ref(null);
let calendar = null;
const calendarTitle = ref("");
const selectedEvent = ref(null);

// ── Dialog state ──────────────────────────────────────────────────────────────
const tooltip = reactive({ show: false, event: null, position: { x: 0, y: 0 } });
const slotAction = reactive({ show: false, info: null });
const blockSlot = reactive({ show: false, info: null });
const createBooking = reactive({ show: false, info: null });
const dragConfirm = reactive({ show: false, info: null, revertFn: null });
const deleteSlot = reactive({ show: false, info: null });

// ── Toolbar actions ───────────────────────────────────────────────────────────
function handleToggleOrientation() {
  toggleOrientation();
  if (calendar) calendar.changeView(currentView.value);
  writeUrlState();
}

function handleNavigate(action) {
  if (!calendar) return;
  if (action === "prev") calendar.prev();
  else if (action === "next") calendar.next();
  else if (action === "today") calendar.today();
}

function handleJumpToDate(dateStr) {
  if (calendar) calendar.gotoDate(dateStr);
}

function handleReload() {
  if (!calendar) return;
  calendar.refetchResources();
  calendar.refetchEvents();
}

function changeView(viewKey) {
  currentView.value = viewKey;
  calendar?.changeView(viewKey);
  writeUrlState();
}

// ── Slot dialog flow ──────────────────────────────────────────────────────────
function openCreateBooking(info) {
  slotAction.show = false;
  createBooking.info = info;
  createBooking.show = true;
}

function openBlockSlot(info) {
  slotAction.show = false;
  blockSlot.info = info;
  blockSlot.show = true;
}

function onDialogSuccess(dialogKey) {
  if (dialogKey === "blockSlot") blockSlot.show = false;
  if (dialogKey === "createBooking") createBooking.show = false;
  calendar?.refetchEvents();
}

// ── Drag/drop ─────────────────────────────────────────────────────────────────
function handleEventDrop(info) {
  const ep = info.event.extendedProps || {};
  const oldRes = info.oldResource;
  const newRes = info.newResource || oldRes;
  const hasHostChange = newRes && oldRes && newRes.id !== oldRes.id;
  const hasTimeChange = info.oldEvent.start?.getTime() !== info.event.start?.getTime();
  let actionType = "reschedule";
  if (hasHostChange && hasTimeChange) actionType = "reassign_reschedule";
  else if (hasHostChange) actionType = "reassign";

  dragConfirm.info = {
    bookingId: ep.booking_id || info.event.id,
    actionType,
    eventTitle: info.event.title,
    meetingType: ep.meeting_type_name,
    customerName: ep.customer_name,
    department: ep.department_name,
    status: ep.status || ep.booking_status,
    isInternal: ep.is_internal,
    oldStart: info.oldEvent.start?.toISOString(),
    newStart: info.event.start?.toISOString(),
    newEnd: info.event.end?.toISOString(),
    oldResource: oldRes?.title || ep.assigned_to_name,
    newResource: newRes?.title,
    oldResourceId: oldRes?.id,
    newResourceId: newRes?.id,
  };
  dragConfirm.revertFn = info.revert;
  dragConfirm.show = true;
}

function handleEventResize(info) {
  const ep = info.event.extendedProps || {};
  const resource = info.event.getResources?.()[0];
  dragConfirm.info = {
    bookingId: ep.booking_id || info.event.id,
    actionType: "reschedule",
    eventTitle: info.event.title,
    meetingType: ep.meeting_type_name,
    customerName: ep.customer_name,
    department: ep.department_name,
    status: ep.status || ep.booking_status,
    isInternal: ep.is_internal,
    oldStart: info.oldEvent.start?.toISOString(),
    oldEnd: info.oldEvent.end?.toISOString(),
    newStart: info.event.start?.toISOString(),
    newEnd: info.event.end?.toISOString(),
    oldResource: resource?.title || ep.assigned_to_name,
    newResource: resource?.title,
    oldResourceId: resource?.id,
    newResourceId: resource?.id,
  };
  dragConfirm.revertFn = info.revert;
  dragConfirm.show = true;
}

async function confirmDrag(notifyFlags) {
  try {
    await submitDragUpdate(dragConfirm.info, notifyFlags);
    calendar?.refetchEvents();
  } catch {
    dragConfirm.revertFn?.();
  }
  resetDrag();
}

function cancelDrag() {
  dragConfirm.revertFn?.();
  resetDrag();
}

function resetDrag() {
  dragConfirm.show = false;
  dragConfirm.info = null;
  dragConfirm.revertFn = null;
}

// ── Event click ───────────────────────────────────────────────────────────────
function handleEventClick(info) {
  const ep = info.event.extendedProps;
  if (ep?.type === "blocked_slot") {
    if (canManageBlockedSlot(info.event.getResources()[0]?.id)) {
      deleteSlot.info = {
        title: info.event.title,
        resourceTitle: info.event.getResources()[0]?.title,
        start: info.event.start,
        end: info.event.end,
        slotName: ep.slot_name,
      };
      deleteSlot.show = true;
    }
    return;
  }
  selectedEvent.value = ep?.booking_id || info.event.id;
}

async function handleDeleteConfirm(slotName) {
  try {
    await deleteBlockedSlot(slotName);
    calendar?.refetchEvents();
  } catch { /* error handled silently */ }
  deleteSlot.show = false;
}

// ── Select (time slot click) ──────────────────────────────────────────────────
function handleSelect(selectInfo) {
  const resourceId = selectInfo.resource?.id;
  calendar?.unselect();
  if (!resourceId || !canSelectSlot(resourceId)) return;
  slotAction.info = {
    start: selectInfo.start, end: selectInfo.end,
    resourceId, resourceTitle: selectInfo.resource.title,
  };
  slotAction.show = true;
}

// ── Event rendering ───────────────────────────────────────────────────────────
function handleEventMount(info) {
  const ep = info.event.extendedProps || {};
  if (info.event.display === "background") return;
  if (ep.type === "blocked_slot") {
    info.event.setProp("editable", false);
    info.event.setProp("startEditable", false);
    info.event.setProp("resourceEditable", false);
    info.el.classList.add("ec-non-draggable");
    return;
  }

  const color = getStatusColor(ep.status);
  if (color) {
    info.el.style.backgroundColor = color;
    info.el.style.borderColor = color;
    info.el.style.borderLeftWidth = "4px";
    info.el.style.borderLeftColor = darkenColor(color, 0.3);
  }
  if (ep.is_team_meeting) info.el.classList.add("ec-team-meeting");
  if (ep.is_own_booking) info.el.classList.add("ec-own-booking");
  if (!canModifyEvent(info.event)) {
    info.el.classList.add("ec-non-draggable");
    info.event.setProp("editable", false);
  }
}

function darkenColor(hex, amount) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function showTooltip(info) {
  const ep = info.event.extendedProps || {};
  if (ep.type === "blocked_slot" || info.event.display === "background") return;
  const rect = info.el.getBoundingClientRect();
  tooltip.position = { x: rect.left + rect.width / 2, y: rect.top };
  tooltip.event = {
    title: info.event.title, start: info.event.start, end: info.event.end,
    status: ep.status, customerName: ep.customer_name,
    serviceType: ep.service_type, locationType: ep.location_type,
    resourceTitle: info.event.getResources()[0]?.title,
  };
  tooltip.show = true;
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
  if (!calendarEl.value) return;

  // Restore state from URL before creating calendar
  readUrlState();
  const initialDate = route.query.date || null;

  calendar = new Calendar(calendarEl.value, {
    plugins: [dayGridPlugin, interactionPlugin, resourceTimeGridPlugin, resourceTimelinePlugin],
    initialView: currentView.value,
    ...(initialDate ? { initialDate } : {}),
    schedulerLicenseKey: "GPL-My-Project-Is-Open-Source",
    headerToolbar: false,
    height: "100%",
    nowIndicator: true,
    slotMinTime: "06:00:00",
    slotMaxTime: "22:00:00",
    slotDuration: "00:30:00",
    slotLabelInterval: "01:00:00",
    slotLabelFormat: { hour: "2-digit", minute: "2-digit", hour12: false },
    eventTimeFormat: { hour: "2-digit", minute: "2-digit", hour12: false },
    resourceAreaWidth: "180px",
    resourceAreaHeaderContent: "Team Members",

    resources: (info, ok, fail) => apiFetchResources(info, filters, ok, fail),
    events: (info, ok, fail) => apiFetchEvents(info, filters, ok, fail),

    editable: true,
    eventResourceEditable: true,
    eventDurationEditable: true,
    selectable: true,
    selectMirror: true,

    eventClick: handleEventClick,
    eventDrop: handleEventDrop,
    eventResize: handleEventResize,
    select: handleSelect,
    datesSet: (info) => {
      calendarTitle.value = info.view.title;
      // Persist current date to URL
      const dateStr = info.view.currentStart.toISOString().slice(0, 10);
      writeUrlState({ date: dateStr });
    },
    eventDidMount: handleEventMount,
    eventMouseEnter: showTooltip,
    eventMouseLeave: () => { tooltip.show = false; },

    resourceLabelDidMount(info) {
      if (info.resource.extendedProps?.is_self) info.el.classList.add("ec-resource-self");
    },
    themeSystem: "standard",
  });

  calendar.render();
});

onBeforeUnmount(() => {
  if (calendar) { calendar.destroy(); calendar = null; }
});

watch(filters, () => {
  if (!calendar) return;
  calendar.refetchResources();
  calendar.refetchEvents();
  writeUrlState();
}, { deep: true });
</script>

<style>
/* ── FullCalendar Dark Mode ─────────────────────────────────────────────────── */
.dark .fc,
.ec-root.dark .fc {
  --fc-border-color: #374151;
  --fc-page-bg-color: #111827;
  --fc-neutral-bg-color: #1f2937;
  --fc-list-event-hover-bg-color: #1f2937;
  --fc-today-bg-color: rgba(59, 130, 246, 0.08);
  --fc-now-indicator-color: #3b82f6;
  --fc-event-bg-color: #1e40af;
  --fc-event-border-color: #1e40af;
}

/* Calendar grid background */
.dark .fc .fc-view-harness,
.dark .fc .fc-timegrid-slot,
.dark .fc .fc-timegrid-col,
.dark .fc .fc-timeline-lane,
.dark .fc .fc-timeline-slot {
  background-color: #111827;
}

/* Resource area + datagrid */
.dark .fc .fc-datagrid-cell-frame,
.dark .fc .fc-resource-area {
  background-color: #1f2937;
}

/* Column headers + timeline header */
.dark .fc .fc-col-header-cell,
.dark .fc .fc-timeline-header-row th,
.dark .fc .fc-resource-timeline .fc-datagrid-header {
  background-color: #1f2937;
}

/* Timeline shaded cells (weekends, etc) */
.dark .fc .fc-cell-shaded,
.dark .fc .fc-day-disabled {
  background-color: #1a2332;
}

/* All text in dark mode */
.dark .fc .fc-col-header-cell-cushion,
.dark .fc .fc-timegrid-axis-cushion,
.dark .fc .fc-timegrid-slot-label-cushion,
.dark .fc .fc-datagrid-cell-main,
.dark .fc .fc-resource-area .fc-datagrid-cell-main,
.dark .fc .fc-timeline-slot-cushion,
.dark .fc .fc-timeline-header-row th,
.dark .fc .fc-timeline-slot-label,
.dark .fc .fc-timeline-slot-label-cushion,
.dark .fc .fc-datagrid-cell-cushion,
.dark .fc a,
.dark .fc .fc-cell-shaded {
  color: #d1d5db;
}

/* All borders */
.dark .fc td,
.dark .fc th,
.dark .fc .fc-scrollgrid {
  border-color: #374151;
}

/* Divider line */
.dark .fc .fc-timegrid-divider {
  background-color: #1f2937;
  border-color: #374151;
}

/* Scrollbar */
.dark .fc .fc-scroller {
  scrollbar-color: #4b5563 #1f2937;
}

/* Month/DayGrid dark mode */
.dark .fc .fc-daygrid-day,
.dark .fc .fc-daygrid-body {
  background-color: #111827;
}
.dark .fc .fc-daygrid-day-number,
.dark .fc .fc-daygrid-day-top a {
  color: #d1d5db;
}
.dark .fc .fc-daygrid-day.fc-day-other .fc-daygrid-day-number {
  color: #6b7280;
}

/* ── Remove default today highlight ────────────────────────────────────────── */
.fc .fc-day-today {
  background-color: transparent !important;
}

/* ── Event Styling ──────────────────────────────────────────────────────────── */
.fc-event { cursor: pointer; border-radius: 4px; font-size: 0.75rem; }

.ec-blocked-slot { background: #1a1a1a !important; color: white !important; border-left: 4px solid #ef4444 !important; z-index: 5; }
.dark .ec-blocked-slot { background: #2d2d2d !important; }

.ec-team-meeting { border-left: 4px solid #a855f7 !important; }
.ec-own-booking { box-shadow: inset 0 0 0 2px rgba(34, 197, 94, 0.4); }
.ec-non-draggable { opacity: 0.8; cursor: default !important; }
.ec-resource-self .fc-datagrid-cell-main { color: #22c55e; font-weight: 600; }

/* ── Unavailable / Non-working Time (striped pattern) ───────────────────────── */
.ec-nonworking-block {
  background: repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 4px, #94a3b8 4px, #94a3b8 8px) !important;
  opacity: 0.75;
}
.ec-dayoff-block {
  background: repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 4px, #cbd5e1 4px, #cbd5e1 8px) !important;
  opacity: 0.8;
}
.dark .ec-nonworking-block {
  background: repeating-linear-gradient(45deg, #475569, #475569 4px, #1e293b 4px, #1e293b 8px) !important;
  opacity: 0.9;
}
.dark .ec-dayoff-block {
  background: repeating-linear-gradient(45deg, #374151, #374151 4px, #111827 4px, #111827 8px) !important;
  opacity: 0.9;
}
</style>
