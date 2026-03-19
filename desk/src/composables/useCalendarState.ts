import { reactive, ref, computed } from "vue";
import { call } from "frappe-ui";

const API_BASE = "meeting_manager.meeting_manager.page.mm_enhanced_calendar.api";

// Fallback colors used until API responds or if API fails
const FALLBACK_COLORS: Record<string, string> = {
  "New Booking": "#1e40af",
  "New Appointment": "#ec4899",
  "Booking Started": "#60a5fa",
  "Sale Approved": "#22c55e",
  "Booking Approved Not Sale": "#ef4444",
  "Call Customer About Sale": "#f97316",
  "No Answer 1-3": "#9ca3af",
  "No Answer 4-5": "#964B00",
  "Customer Unsure": "#7dd3fc",
  "No Contact About Offer": "#b91c1c",
  "Cancelled": "#d1d5db",
  "Optimising Not Possible": "#fbbf24",
  "Not Possible": "#dc2626",
  "Rebook": "#a855f7",
  "Rebook Earlier": "#9333ea",
  "Consent Sent Awaiting": "#3b82f6",
};

interface StatusInfo {
  color: string;
  is_final: boolean;
}

// Module-level shared state
const statusColors = ref<Record<string, string>>({ ...FALLBACK_COLORS });
const statusData = ref<Record<string, StatusInfo>>({});
let colorsLoaded = false;

async function loadStatusColors() {
  if (colorsLoaded) return;
  try {
    const res = await call(`${API_BASE}.get_status_colors`);
    if (res && Object.keys(res).length > 0) {
      statusData.value = res;
      // Build simple color map for backwards compatibility
      const colorMap: Record<string, string> = {};
      for (const [status, info] of Object.entries(res) as [string, StatusInfo][]) {
        colorMap[status] = info.color;
      }
      statusColors.value = colorMap;
    }
    colorsLoaded = true;
  } catch {
    // Keep fallback colors
  }
}

export function getStatusColor(status: string): string {
  return statusColors.value[status] || "#6b7280";
}

export function isFinalizedStatus(status: string): boolean {
  const info = statusData.value[status];
  return info ? !!info.is_final : false;
}

export const finalizedStatuses = computed(() =>
  Object.entries(statusData.value)
    .filter(([, info]) => info.is_final)
    .map(([status]) => status)
);

export function useCalendarState() {
  const currentView = ref("resourceTimeGridDay");
  const orientation = ref<"vertical" | "horizontal">("vertical");

  // Load colors from DB on first use
  loadStatusColors();

  const filters = reactive({
    departments: [] as string[],
    focusDepartment: "",
    statuses: [] as string[],
    services: [] as string[],
    meetingTypes: [] as string[],
  });

  // Reactive: re-computes when statusColors changes (after API load)
  const allStatuses = computed(() =>
    Object.entries(statusColors.value).map(([value, color]) => ({ value, color }))
  );

  // Initialize statuses filter once colors are loaded
  loadStatusColors().then(() => {
    if (filters.statuses.length === 0) {
      filters.statuses = Object.keys(statusColors.value);
    }
  });

  const serviceTypes = [
    "Business", "Business Extended", "Business Rebook", "New Setup Business",
    "Private / Business Customer", "Private New Sale", "Private Self Book",
  ];

  const verticalViews = [
    { key: "resourceTimeGridDay", label: "Day" },
    { key: "resourceTimelineWeek", label: "Week" },
    { key: "dayGridMonth", label: "Month" },
  ];

  const horizontalViews = [
    { key: "resourceTimelineDay", label: "Day" },
    { key: "resourceTimelineWeek", label: "Week" },
    { key: "resourceTimelineMonth", label: "Month" },
  ];

  const activeViews = computed(() =>
    orientation.value === "vertical" ? verticalViews : horizontalViews
  );

  function toggleOrientation() {
    orientation.value = orientation.value === "vertical" ? "horizontal" : "vertical";
    const viewMap: Record<string, string> = {
      resourceTimeGridDay: "resourceTimelineDay",
      resourceTimelineWeek: "resourceTimelineWeek",
      dayGridMonth: "resourceTimelineMonth",
      resourceTimelineDay: "resourceTimeGridDay",
      resourceTimelineMonth: "dayGridMonth",
    };
    currentView.value = viewMap[currentView.value] || currentView.value;
  }

  function toggleStatus(status: string) {
    const idx = filters.statuses.indexOf(status);
    if (idx >= 0 && filters.statuses.length > 1) {
      filters.statuses.splice(idx, 1);
    } else if (idx < 0) {
      filters.statuses.push(status);
    }
  }

  function toggleDepartment(dept: string) {
    const idx = filters.departments.indexOf(dept);
    if (idx >= 0 && filters.departments.length > 1) {
      filters.departments.splice(idx, 1);
    } else if (idx < 0) {
      filters.departments.push(dept);
    }
  }

  return {
    currentView, orientation, filters,
    allStatuses, serviceTypes, activeViews,
    toggleOrientation, toggleStatus, toggleDepartment,
    statusColors, finalizedStatuses, isFinalizedStatus,
  };
}
