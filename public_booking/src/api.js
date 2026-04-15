import { call } from "frappe-ui";

const API = "meeting_manager.meeting_manager.api.public";

/** Step 1: list active departments */
export const fetchDepartments = () => call(`${API}.get_departments`);

/** Step 2: list meeting types for a department */
export const fetchDepartmentMeetingTypes = (department_slug) =>
  call(`${API}.get_department_meeting_types`, { department_slug });

/** Step 3: available dates for a given month */
export const fetchAvailableDates = (department_slug, meeting_type_slug, month, year) =>
  call(`${API}.get_available_dates`, {
    department_slug,
    meeting_type_slug,
    month,
    year,
  });

/** Step 4: available time slots for a specific date */
export const fetchAvailableSlots = (
  department_slug,
  meeting_type_slug,
  date,
  visitor_timezone,
) =>
  call(`${API}.get_available_slots`, {
    department_slug,
    meeting_type_slug,
    date,
    visitor_timezone,
  });

/** Step 5: create booking */
export const createBooking = (booking_data) =>
  call(`${API}.create_customer_booking`, { booking_data });

/** Confirmation page */
export const fetchBookingConfirmation = (booking_id) =>
  call(`${API}.get_booking_confirmation`, { booking_id });

/** Self-service reschedule: lookup booking by token */
export const fetchBookingByRescheduleToken = (token) =>
  call(`${API}.get_booking_details`, { token });

/** Self-service reschedule: submit new date/time */
export const rescheduleBooking = (token, new_date, new_time) =>
  call(`${API}.reschedule_booking`, { token, new_date, new_time });

/** Self-service cancel */
export const cancelBooking = (token) =>
  call(`${API}.cancel_booking`, { token });
