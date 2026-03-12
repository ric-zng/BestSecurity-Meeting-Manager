import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    redirect: "/calendar",
  },
  {
    path: "/calendar",
    name: "Calendar",
    component: () => import("@/pages/calendar/EnhancedCalendar.vue"),
    meta: { minRole: "department_member", title: "Calendar" },
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    component: () => import("@/pages/Dashboard.vue"),
    meta: { minRole: "department_leader", title: "Dashboard" },
  },
  {
    path: "/bookings",
    name: "Bookings",
    component: () => import("@/pages/bookings/BookingsList.vue"),
    meta: { minRole: "department_member", title: "Bookings" },
  },
  {
    path: "/bookings/:bookingId",
    name: "BookingDetail",
    component: () => import("@/pages/bookings/BookingDetail.vue"),
    props: true,
    meta: { minRole: "department_member", title: "Booking Details" },
  },
  {
    path: "/book",
    name: "SelfBook",
    component: () => import("@/pages/bookings/SelfBookMeeting.vue"),
    meta: { minRole: "department_member", title: "Book Meeting" },
  },
  {
    path: "/book/team",
    name: "TeamMeeting",
    component: () => import("@/pages/bookings/TeamMeeting.vue"),
    meta: { minRole: "department_leader", title: "Team Meeting" },
  },
  {
    path: "/my-settings",
    name: "MySettings",
    component: () => import("@/pages/settings/MySettings.vue"),
    meta: { minRole: "department_member", title: "My Settings" },
  },
  {
    path: "/my-availability",
    name: "MyAvailability",
    component: () => import("@/pages/settings/MyAvailability.vue"),
    meta: { minRole: "department_member", title: "My Availability" },
  },
  {
    path: "/my-blocked-slots",
    name: "MyBlockedSlots",
    component: () => import("@/pages/settings/MyBlockedSlots.vue"),
    meta: { minRole: "department_member", title: "My Blocked Slots" },
  },
  {
    path: "/team-settings",
    name: "TeamSettings",
    component: () => import("@/pages/settings/TeamSettings.vue"),
    meta: { minRole: "department_leader", title: "Team Settings" },
  },
  {
    path: "/meeting-types",
    name: "MeetingTypes",
    component: () => import("@/pages/admin/MeetingTypes.vue"),
    meta: { minRole: "department_leader", title: "Meeting Types" },
  },
  {
    path: "/meeting-types/:id",
    name: "MeetingTypeDetail",
    component: () => import("@/pages/admin/MeetingTypeDetail.vue"),
    props: true,
    meta: { minRole: "department_leader", title: "Meeting Type" },
  },
  {
    path: "/email-templates",
    name: "EmailTemplates",
    component: () => import("@/pages/admin/EmailTemplates.vue"),
    meta: { minRole: "department_leader", title: "Email Templates" },
  },
  {
    path: "/admin/departments",
    name: "Departments",
    component: () => import("@/pages/admin/Departments.vue"),
    meta: { minRole: "system_manager", title: "Departments" },
  },
  {
    path: "/admin/departments/:id",
    name: "DepartmentDetail",
    component: () => import("@/pages/admin/DepartmentDetail.vue"),
    props: true,
    meta: { minRole: "system_manager", title: "Department" },
  },
  {
    path: "/admin/oauth-settings",
    name: "OAuthSettings",
    component: () => import("@/pages/admin/OAuthSettings.vue"),
    meta: { minRole: "system_manager", title: "OAuth Settings" },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/pages/NotFound.vue"),
  },
];

export const router = createRouter({
  history: createWebHistory("/meeting-manager/"),
  routes,
});

// Auth guard with role-based access control
router.beforeEach(async (to) => {
  // 1. Check login
  if (window.session_user === "Guest" || !window.session_user) {
    window.location.href = `/login?redirect-to=/meeting-manager${to.fullPath}`;
    return false;
  }

  // 2. Initialize auth store (lazy, only fetches once)
  const { useAuthStore } = await import("@/stores/auth");
  const auth = useAuthStore();
  if (!auth.isInitialized) {
    await auth.initialize();
  }

  // 3. If auth failed, redirect to login
  if (!auth.isInitialized) {
    auth.redirectToLogin();
    return false;
  }

  // 4. Check minimum role for route
  const minRole = to.meta.minRole as string | undefined;
  if (minRole && !auth.hasMinRole(minRole as any)) {
    return { name: "Calendar" };
  }

  return true;
});
