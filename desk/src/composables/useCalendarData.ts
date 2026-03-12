import { call } from "frappe-ui";

const API_BASE = "meeting_manager.meeting_manager.page.mm_enhanced_calendar.api";

interface Filters {
  departments: string[];
  focusDepartment: string;
  statuses: string[];
  services: string[];
}

// ── Resource fetching ──────────────────────────────────────────────────────
export async function fetchResources(
  fetchInfo: any,
  filters: Filters,
  successCb: (data: any[]) => void,
  failureCb: (err: any) => void,
) {
  try {
    const params: Record<string, string> = {};
    if (filters.departments.length) params.departments = JSON.stringify(filters.departments);
    if (filters.focusDepartment) params.focus_department = filters.focusDepartment;
    const res = await call(`${API_BASE}.get_calendar_resources`, params);
    successCb(res || []);
  } catch (e) {
    failureCb(e);
  }
}

// ── Business-hours background events ───────────────────────────────────────
export function generateBusinessHoursEvents(
  bhData: any[],
  startDate: string,
  endDate: string,
): any[] {
  const events: any[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (const resource of bhData) {
    const rid = resource.resource_id;
    const hours = resource.business_hours || {};

    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
      const dateStr = d.toISOString().split("T")[0];
      const dayHours = hours[dayName];

      if (!dayHours || !dayHours.length) {
        events.push({
          id: `dayoff-${rid}-${dateStr}`,
          resourceId: rid,
          start: `${dateStr}T06:00:00`,
          end: `${dateStr}T22:00:00`,
          display: "background",
          title: "Day Off",
          className: "ec-dayoff-block",
        });
        continue;
      }

      addNonWorkingGaps(events, rid, dateStr, dayHours);
    }
  }
  return events;
}

function addNonWorkingGaps(events: any[], rid: string, dateStr: string, dayHours: any[]) {
  const firstStart = dayHours[0].start;
  if (firstStart > "06:00") {
    events.push(bgEvent(rid, dateStr, "06:00", firstStart, "pre"));
  }
  for (let i = 0; i < dayHours.length - 1; i++) {
    if (dayHours[i].end < dayHours[i + 1].start) {
      events.push(bgEvent(rid, dateStr, dayHours[i].end, dayHours[i + 1].start, `gap${i}`));
    }
  }
  const lastEnd = dayHours[dayHours.length - 1].end;
  if (lastEnd < "22:00") {
    events.push(bgEvent(rid, dateStr, lastEnd, "22:00", "post"));
  }
}

function bgEvent(rid: string, dateStr: string, startTime: string, endTime: string, suffix: string) {
  return {
    id: `nw-${rid}-${dateStr}-${suffix}`,
    resourceId: rid,
    start: `${dateStr}T${startTime}:00`,
    end: `${dateStr}T${endTime}:00`,
    display: "background",
    title: "Non-Working",
    className: "ec-nonworking-block",
  };
}

// ── Event fetching ─────────────────────────────────────────────────────────
export async function fetchEvents(
  fetchInfo: any,
  filters: Filters,
  successCb: (data: any[]) => void,
  failureCb: (err: any) => void,
) {
  try {
    const startStr = fetchInfo.startStr.split("T")[0];
    const endStr = fetchInfo.endStr.split("T")[0];
    const baseParams: Record<string, string> = { start: startStr, end: endStr };
    if (filters.departments.length) baseParams.departments = JSON.stringify(filters.departments);
    if (filters.focusDepartment) baseParams.focus_department = filters.focusDepartment;

    const eventParams: Record<string, string> = { ...baseParams };
    if (filters.statuses.length) eventParams.statuses = JSON.stringify(filters.statuses);
    if (filters.services.length) eventParams.services = JSON.stringify(filters.services);

    const [bookingEvents, businessHours, blockedSlots] = await Promise.all([
      call(`${API_BASE}.get_calendar_events`, eventParams),
      call(`${API_BASE}.get_all_resources_business_hours`, baseParams),
      call(`${API_BASE}.get_user_blocked_slots`, baseParams),
    ]);

    const bhEvents = generateBusinessHoursEvents(businessHours || [], startStr, endStr);
    const blockedEvents = (blockedSlots || []).map(mapBlockedSlot);

    successCb([...(bookingEvents || []), ...bhEvents, ...blockedEvents]);
  } catch (e) {
    failureCb(e);
  }
}

function mapBlockedSlot(slot: any) {
  return {
    id: `blocked-${slot.name}`,
    resourceId: slot.resource_id || slot.user,
    start: slot.start,
    end: slot.end,
    title: slot.reason || "Blocked",
    className: "ec-blocked-slot",
    editable: false,
    extendedProps: { type: "blocked_slot", slot_name: slot.name },
  };
}

// ── Drag/drop helpers ──────────────────────────────────────────────────────
export async function submitDragUpdate(info: any, notifyFlags: any) {
  const start = info.newStart;
  const dateStr = start.toISOString().split("T")[0];
  const timeStr = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;

  await call(`${API_BASE}.update_calendar_booking`, {
    booking_id: info.bookingId,
    new_date: dateStr,
    new_time: timeStr,
    new_end: info.newEnd?.toISOString(),
    new_resource_id: info.newResourceId,
    action_type: info.actionType,
    ...notifyFlags,
  });
}

export async function deleteBlockedSlot(slotName: string) {
  await call(`${API_BASE}.delete_blocked_slot`, { slot_name: slotName });
}
