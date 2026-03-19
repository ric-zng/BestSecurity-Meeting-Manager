import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";

type RoleLevel = "system_manager" | "department_leader" | "department_member";

interface NavItem {
  label: string;
  to: string;
  icon: string;
  minRole: RoleLevel;
  section: "main" | "admin" | "personal";
}

const allNavItems: NavItem[] = [
  // Main
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: "bar-chart-2",
    minRole: "department_member",
    section: "main",
  },
  {
    label: "Calendar",
    to: "/calendar",
    icon: "calendar",
    minRole: "department_member",
    section: "main",
  },
  {
    label: "Bookings",
    to: "/bookings",
    icon: "check-square",
    minRole: "department_member",
    section: "main",
  },
  {
    label: "Book Meeting",
    to: "/book",
    icon: "plus-circle",
    minRole: "department_member",
    section: "main",
  },
  {
    label: "Team Meeting",
    to: "/book/team",
    icon: "users",
    minRole: "department_leader",
    section: "main",
  },

  // Management
  {
    label: "Meeting Types",
    to: "/meeting-types",
    icon: "settings",
    minRole: "department_leader",
    section: "admin",
  },
  {
    label: "Email Templates",
    to: "/email-templates",
    icon: "mail",
    minRole: "department_leader",
    section: "admin",
  },
  {
    label: "Team Settings",
    to: "/team-settings",
    icon: "user-check",
    minRole: "department_leader",
    section: "admin",
  },
  {
    label: "Departments",
    to: "/admin/departments",
    icon: "briefcase",
    minRole: "system_manager",
    section: "admin",
  },
  {
    label: "OAuth Settings",
    to: "/admin/oauth-settings",
    icon: "key",
    minRole: "system_manager",
    section: "admin",
  },
  {
    label: "Booking Statuses",
    to: "/admin/booking-statuses",
    icon: "droplet",
    minRole: "system_manager",
    section: "admin",
  },

  // Personal
  {
    label: "My Settings",
    to: "/my-settings",
    icon: "user",
    minRole: "department_member",
    section: "personal",
  },
  {
    label: "My Availability",
    to: "/my-availability",
    icon: "clock",
    minRole: "department_member",
    section: "personal",
  },
  {
    label: "My Blocked Slots",
    to: "/my-blocked-slots",
    icon: "x-circle",
    minRole: "department_member",
    section: "personal",
  },
];

export function useNavigation() {
  const auth = useAuthStore();

  const visibleNavItems = computed(() =>
    allNavItems.filter((item) => auth.hasMinRole(item.minRole))
  );

  const mainNavItems = computed(() =>
    visibleNavItems.value.filter((i) => i.section === "main")
  );
  const adminNavItems = computed(() =>
    visibleNavItems.value.filter((i) => i.section === "admin")
  );
  const personalNavItems = computed(() =>
    visibleNavItems.value.filter((i) => i.section === "personal")
  );

  return { visibleNavItems, mainNavItems, adminNavItems, personalNavItems };
}
