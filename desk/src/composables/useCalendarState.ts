import { reactive, ref, computed } from "vue";

// Status color mapping (from the original JS)
const STATUS_COLORS: Record<string, string> = {
  "New Booking": "#1e40af",
  "New Appointment": "#ec4899",
  "Booking Started": "#60a5fa",
  "Sale Approved": "#22c55e",
  "Booking Approved Not Sale": "#ef4444",
  "Call Customer About Sale": "#f97316",
  "No Answer 1": "#9ca3af",
  "No Answer 2": "#9ca3af",
  "No Answer 3": "#9ca3af",
  "No Answer 4-5": "#964B00",
  "Customer Unsure": "#7dd3fc",
  "No Contact About Offer": "#b91c1c",
  "Cancelled": "#d1d5db",
  "Optimising Not Possible": "#fbbf24",
  "Not Possible": "#dc2626",
  "Rebook": "#a855f7",
  "Rebook Earlier": "#9333ea",
  "Consent Sent Awaiting": "#3b82f6",
  // Legacy statuses
  "Confirmed": "#22c55e",
  "Pending": "#f59e0b",
  "Completed": "#10b981",
  "No-Show": "#ef4444",
  "Rescheduled": "#8b5cf6",
};

const LEGACY_STATUSES = ["Confirmed", "Pending", "Completed", "No-Show", "Rescheduled"];

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || "#6b7280";
}

export function useCalendarState() {
  const currentView = ref("resourceTimeGridDay");
  const orientation = ref<"vertical" | "horizontal">("vertical");

  const filters = reactive({
    departments: [] as string[],
    focusDepartment: "",
    statuses: Object.keys(STATUS_COLORS).filter(s => !LEGACY_STATUSES.includes(s)),
    services: [] as string[],
    meetingTypes: [] as string[],
  });

  const allStatuses = Object.entries(STATUS_COLORS)
    .filter(([key]) => !LEGACY_STATUSES.includes(key))
    .map(([value, color]) => ({ value, color }));

  const serviceTypes = [
    "Business", "Business Extended", "Business Rebook", "New Setup Business",
    "Private / Business Customer", "Private New Sale", "Private Self Book",
  ];

  // Day view: vertical = time grid (columns per resource), horizontal = timeline (rows per resource)
  // Week view: always timeline (rows per resource, days across top) — time grid is too wide
  // Month view: simple day grid (no resource axis)
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
    // Map current view to equivalent in other orientation
    const viewMap: Record<string, string> = {
      resourceTimeGridDay: "resourceTimelineDay",
      resourceTimelineWeek: "resourceTimelineWeek", // week stays timeline in both
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
    STATUS_COLORS,
  };
}
