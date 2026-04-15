import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/meeting-booking",
    name: "Departments",
    component: () => import("./pages/Departments.vue"),
    meta: { step: 1 },
  },
  {
    path: "/meeting-booking/:department",
    name: "MeetingTypes",
    component: () => import("./pages/MeetingTypes.vue"),
    meta: { step: 2 },
  },
  {
    path: "/meeting-booking/:department/:meetingType",
    name: "DatePicker",
    component: () => import("./pages/DatePicker.vue"),
    meta: { step: 3 },
  },
  {
    path: "/meeting-booking/:department/:meetingType/:date",
    name: "TimeSlots",
    component: () => import("./pages/TimeSlots.vue"),
    meta: { step: 4 },
  },
  {
    path: "/meeting-booking/:department/:meetingType/:date/:time",
    name: "CustomerDetails",
    component: () => import("./pages/CustomerDetails.vue"),
    meta: { step: 5 },
  },
  {
    path: "/meeting-booking/confirm/:bookingId",
    name: "Confirmation",
    component: () => import("./pages/Confirmation.vue"),
    meta: { step: 6 },
  },
  {
    path: "/meeting-booking/cancel",
    name: "Cancel",
    component: () => import("./pages/CancelBooking.vue"),
    meta: { step: 0 },
  },
  {
    path: "/meeting-booking/reschedule",
    name: "Reschedule",
    component: () => import("./pages/RescheduleBooking.vue"),
    meta: { step: 0 },
  },
  // Legacy redirects for older email links (/book/...)
  {
    path: "/book",
    redirect: "/meeting-booking",
  },
  {
    path: "/book/cancel",
    redirect: (to) => ({ path: "/meeting-booking/cancel", query: to.query }),
  },
  {
    path: "/book/reschedule",
    redirect: (to) => ({
      path: "/meeting-booking/reschedule",
      query: to.query,
    }),
  },
  // Fallback
  {
    path: "/:pathMatch(.*)*",
    redirect: "/meeting-booking",
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0, behavior: "smooth" };
  },
});
