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

    <!-- Booking detail sidebar -->
    <BookingDetailSidebar
      :booking-id="selectedEvent"
      @close="selectedEvent = null"
      @view-full="(name) => { router.push(`/bookings/${name}`); selectedEvent = null }"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch } from "vue";
import { useRouter } from "vue-router";
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
import BookingDetailSidebar from "@/components/calendar/BookingDetailSidebar.vue";

const router = useRouter();
const auth = useAuthStore();
const {
  currentView, orientation, filters, allStatuses,
  serviceTypes, activeViews, toggleOrientation,
} = useCalendarState();
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

// ── Toolbar actions ───────────────────────────────────────────────────────────
function handleToggleOrientation() {
  toggleOrientation();
  if (calendar) calendar.changeView(currentView.value);
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

function changeView(viewKey) {
  currentView.value = viewKey;
  calendar?.changeView(viewKey);
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
function buildDragInfo(ev, actionType, oldResourceId) {
  const ep = ev.extendedProps || {};
  return {
    bookingId: ev.id, actionType,
    newStart: ev.start, newEnd: ev.end,
    newResourceId: ev.getResources?.()[0]?.id || oldResourceId,
    oldResourceId,
    title: ev.title,
    customerName: ep.customer_name,
    bookingStatus: ep.booking_status,
  };
}

function handleEventDrop(info) {
  const actionType = info.newResource && info.newResource.id !== info.oldResource?.id ? "reassign" : "reschedule";
  dragConfirm.info = buildDragInfo(info.event, actionType, info.oldResource?.id);
  dragConfirm.info.newResourceId = info.newResource?.id || info.oldResource?.id;
  dragConfirm.revertFn = info.revert;
  dragConfirm.show = true;
}

function handleEventResize(info) {
  dragConfirm.info = buildDragInfo(info.event, "extend", null);
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
      if (confirm("Delete this blocked slot?")) {
        deleteBlockedSlot(ep.slot_name).then(() => calendar?.refetchEvents());
      }
    }
    return;
  }
  selectedEvent.value = info.event.id;
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
  if (ep.type === "blocked_slot" || info.event.display === "background") return;

  const color = getStatusColor(ep.booking_status);
  if (color) info.el.style.borderLeftColor = color;
  if (ep.is_team_meeting) info.el.classList.add("ec-team-meeting");
  if (ep.is_own_booking) info.el.classList.add("ec-own-booking");
  if (!canModifyEvent(info.event)) {
    info.el.classList.add("ec-non-draggable");
    info.event.setProp("editable", false);
  }
}

function showTooltip(info) {
  const ep = info.event.extendedProps || {};
  if (ep.type === "blocked_slot" || info.event.display === "background") return;
  const rect = info.el.getBoundingClientRect();
  tooltip.position = { x: rect.left + rect.width / 2, y: rect.top };
  tooltip.event = {
    title: info.event.title, start: info.event.start, end: info.event.end,
    status: ep.booking_status, customerName: ep.customer_name,
    serviceType: ep.select_mkru, locationType: ep.location_type,
    resourceTitle: info.event.getResources()[0]?.title,
  };
  tooltip.show = true;
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
  if (!calendarEl.value) return;

  calendar = new Calendar(calendarEl.value, {
    plugins: [dayGridPlugin, interactionPlugin, resourceTimeGridPlugin, resourceTimelinePlugin],
    initialView: currentView.value,
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
    datesSet: (info) => { calendarTitle.value = info.view.title; },
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
.dark .fc .fc-timegrid-col {
  background-color: #111827;
}

/* Resource area + datagrid */
.dark .fc .fc-datagrid-cell-frame,
.dark .fc .fc-resource-area {
  background-color: #1f2937;
}

/* Column headers */
.dark .fc .fc-col-header-cell {
  background-color: #1f2937;
}

/* All text in dark mode */
.dark .fc .fc-col-header-cell-cushion,
.dark .fc .fc-timegrid-axis-cushion,
.dark .fc .fc-timegrid-slot-label-cushion,
.dark .fc .fc-datagrid-cell-main,
.dark .fc .fc-resource-area .fc-datagrid-cell-main {
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
  background: repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 4px, #cbd5e1 4px, #cbd5e1 8px) !important;
  opacity: 0.5;
}
.ec-dayoff-block {
  background: repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 4px, #e2e8f0 4px, #e2e8f0 8px) !important;
  opacity: 0.6;
}
.dark .ec-nonworking-block {
  background: repeating-linear-gradient(45deg, #1e293b, #1e293b 4px, #0f172a 4px, #0f172a 8px) !important;
  opacity: 0.6;
}
.dark .ec-dayoff-block {
  background: repeating-linear-gradient(45deg, #0f172a, #0f172a 4px, #020617 4px, #020617 8px) !important;
  opacity: 0.7;
}
</style>
