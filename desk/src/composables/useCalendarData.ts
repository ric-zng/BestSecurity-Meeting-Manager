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
    cachedResourceIds = (res || []).map((r: any) => r.id);
    cachedFilterKey = buildFilterKey(filters);
    successCb(res || []);
  } catch (e) {
    failureCb(e);
  }
}

// Keep resource IDs in sync for business hours
let cachedResourceIds: string[] = [];
let cachedFilterKey = "";

function buildFilterKey(f: Filters): string {
  return `${f.departments.join(",")}_${f.focusDepartment}`;
}

// Fetch resource IDs if not yet cached or filters changed
async function ensureResourceIds(filters: Filters): Promise<string[]> {
  const key = buildFilterKey(filters);
  if (cachedResourceIds.length && cachedFilterKey === key) return cachedResourceIds;
  const params: Record<string, string> = {};
  if (filters.departments.length) params.departments = JSON.stringify(filters.departments);
  if (filters.focusDepartment) params.focus_department = filters.focusDepartment;
  const res = await call(`${API_BASE}.get_calendar_resources`, params);
  cachedResourceIds = (res || []).map((r: any) => r.id);
  cachedFilterKey = key;
  return cachedResourceIds;
}

// ── Business-hours → background events ─────────────────────────────────────
// API returns: { resourceId: { businessHours: [...], dateOverrides: [...] } }
// We convert non-working gaps into background events per resource per day.
export function generateBusinessHoursEvents(
  bhData: Record<string, { businessHours: any[]; dateOverrides: any[] }>,
  startDate: string,
  endDate: string,
): any[] {
  const events: any[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (const [resourceId, data] of Object.entries(bhData)) {
    if (!data || !data.businessHours) continue;

    // Build a lookup: dayOfWeek → [{startTime, endTime}]
    const weeklyHours = buildWeeklyHoursMap(data.businessHours);

    // Build override lookup: dateStr → slots[] | "off"
    const overrideMap = buildOverrideMap(data.dateOverrides || []);

    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const dateStr = toDateStr(d);
      const fcDow = d.getDay(); // 0=Sun

      // Check date override first
      const override = overrideMap[dateStr];
      if (override === "off") {
        // Entire day off
        events.push(dayOffEvent(resourceId, dateStr));
        continue;
      }

      // Use override slots if present, else weekly schedule
      const slots = override || weeklyHours[fcDow];

      if (!slots || slots.length === 0) {
        events.push(dayOffEvent(resourceId, dateStr));
        continue;
      }

      addNonWorkingGaps(events, resourceId, dateStr, slots);
    }
  }
  return events;
}

function buildWeeklyHoursMap(businessHours: any[]): Record<number, { start: string; end: string }[]> {
  const map: Record<number, { start: string; end: string }[]> = {};
  for (const bh of businessHours) {
    // Skip date-specific overrides added by backend (have groupId)
    if (bh.groupId) continue;
    const days = bh.daysOfWeek || [];
    for (const dow of days) {
      if (!map[dow]) map[dow] = [];
      map[dow].push({ start: bh.startTime, end: bh.endTime });
    }
  }
  // Sort each day's slots
  for (const dow of Object.keys(map)) {
    map[Number(dow)].sort((a, b) => a.start.localeCompare(b.start));
  }
  return map;
}

function buildOverrideMap(dateOverrides: any[]): Record<string, { start: string; end: string }[] | "off"> {
  const map: Record<string, { start: string; end: string }[] | "off"> = {};
  for (const ov of dateOverrides) {
    if (!ov.available) {
      map[ov.date] = "off";
    } else if (ov.availableSlots?.length) {
      map[ov.date] = ov.availableSlots.map((s: any) => ({
        start: normalizeTime(s.start),
        end: normalizeTime(s.end),
      }));
    }
  }
  return map;
}

function normalizeTime(t: string): string {
  // Handle "HH:MM:SS" → "HH:MM"
  return t.length > 5 ? t.substring(0, 5) : t;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayOffEvent(rid: string, dateStr: string) {
  return {
    id: `dayoff-${rid}-${dateStr}`,
    resourceId: rid,
    start: `${dateStr}T06:00:00`,
    end: `${dateStr}T22:00:00`,
    display: "background",
    title: "Unavailable",
    className: "ec-dayoff-block",
    extendedProps: { type: "unavailable" },
  };
}

function addNonWorkingGaps(events: any[], rid: string, dateStr: string, slots: { start: string; end: string }[]) {
  const firstStart = slots[0].start;
  if (firstStart > "06:00") {
    events.push(bgEvent(rid, dateStr, "06:00", firstStart, "pre"));
  }
  for (let i = 0; i < slots.length - 1; i++) {
    if (slots[i].end < slots[i + 1].start) {
      events.push(bgEvent(rid, dateStr, slots[i].end, slots[i + 1].start, `gap${i}`));
    }
  }
  const lastEnd = slots[slots.length - 1].end;
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
    title: "Unavailable",
    className: "ec-nonworking-block",
    extendedProps: { type: "unavailable" },
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

    // Ensure we have resource IDs before fetching business hours
    const resourceIds = await ensureResourceIds(filters);

    const resourceParams = {
      resource_ids: JSON.stringify(resourceIds),
      start_date: startStr,
      end_date: endStr,
    };

    const [bookingEvents, businessHours, blockedSlots] = await Promise.all([
      call(`${API_BASE}.get_calendar_events`, eventParams),
      resourceIds.length
        ? call(`${API_BASE}.get_all_resources_business_hours`, resourceParams)
        : Promise.resolve({}),
      resourceIds.length
        ? call(`${API_BASE}.get_user_blocked_slots`, resourceParams)
        : Promise.resolve([]),
    ]);

    const bhEvents = generateBusinessHoursEvents(businessHours || {}, startStr, endStr);
    const blockedEvents = flattenBlockedSlots(blockedSlots || {});

    successCb([...(bookingEvents || []), ...bhEvents, ...blockedEvents]);
  } catch (e) {
    failureCb(e);
  }
}

// API returns { userId: [{ name, blocked_date, start_time, end_time, reason }] }
function flattenBlockedSlots(data: Record<string, any[]>): any[] {
  const events: any[] = [];
  for (const [userId, slots] of Object.entries(data)) {
    if (!Array.isArray(slots)) continue;
    for (const slot of slots) {
      events.push({
        id: `blocked-${slot.name}`,
        resourceId: userId,
        start: `${slot.blocked_date}T${normalizeTime(slot.start_time)}:00`,
        end: `${slot.blocked_date}T${normalizeTime(slot.end_time)}:00`,
        title: slot.reason || "Blocked",
        className: "ec-blocked-slot",
        editable: false,
        extendedProps: { type: "blocked_slot", slot_name: slot.name },
      });
    }
  }
  return events;
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
