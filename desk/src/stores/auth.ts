import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { call } from "frappe-ui";

type RoleLevel =
  | "system_manager"
  | "department_leader"
  | "department_member"
  | "guest";

interface Department {
  name: string;
  department_name: string;
  is_leader: boolean;
}

interface UserContext {
  user: string;
  full_name: string;
  role: RoleLevel;
  role_display: string;
  accessible_departments: Department[];
  permissions: Record<string, boolean>;
}

const ROLE_HIERARCHY: RoleLevel[] = [
  "system_manager",
  "department_leader",
  "department_member",
];

export const useAuthStore = defineStore("auth", () => {
  const user = ref<string>(window.session_user || "");
  const userContext = ref<UserContext | null>(null);
  const isLoading = ref(false);
  const isInitialized = ref(false);
  const error = ref<string | null>(null);

  // Role checks
  const isLoggedIn = computed(
    () => user.value && user.value !== "Guest"
  );
  const roleLevel = computed<RoleLevel>(
    () => userContext.value?.role ?? "guest"
  );
  const isSystemManager = computed(
    () => roleLevel.value === "system_manager"
  );
  const isDepartmentLeader = computed(
    () =>
      roleLevel.value === "department_leader" ||
      roleLevel.value === "system_manager"
  );
  const isDepartmentMember = computed(
    () =>
      roleLevel.value === "department_member" ||
      roleLevel.value === "department_leader" ||
      roleLevel.value === "system_manager"
  );
  const fullName = computed(
    () => userContext.value?.full_name ?? user.value
  );

  // Department access
  const accessibleDepartments = computed(
    () => userContext.value?.accessible_departments ?? []
  );
  const ledDepartments = computed(() =>
    accessibleDepartments.value.filter((d) => d.is_leader)
  );
  const departmentNames = computed(() =>
    accessibleDepartments.value.map((d) => d.name)
  );

  // Permissions from backend
  const permissions = computed(
    () =>
      userContext.value?.permissions ?? {
        can_view_all_members: false,
        can_reassign: false,
        can_create_bookings: false,
      }
  );

  // Hierarchical role check
  function hasMinRole(minRole: RoleLevel): boolean {
    const userIdx = ROLE_HIERARCHY.indexOf(roleLevel.value);
    const requiredIdx = ROLE_HIERARCHY.indexOf(minRole);
    if (userIdx === -1) return false;
    return userIdx <= requiredIdx;
  }

  function canAccessDepartment(deptName: string): boolean {
    if (isSystemManager.value) return true;
    return departmentNames.value.includes(deptName);
  }

  function leadsDepartment(deptName: string): boolean {
    if (isSystemManager.value) return true;
    return ledDepartments.value.some((d) => d.name === deptName);
  }

  async function initialize() {
    if (isInitialized.value) return;
    if (!isLoggedIn.value) return;

    isLoading.value = true;
    error.value = null;
    try {
      const ctx = await call(
        "meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.get_user_context"
      );
      userContext.value = ctx;
      isInitialized.value = true;
    } catch (e: any) {
      error.value = e.message || "Failed to load user context";
      if (e.httpStatus === 403 || e.httpStatus === 401) {
        redirectToLogin();
      }
    } finally {
      isLoading.value = false;
    }
  }

  function redirectToLogin() {
    window.location.href = `/login?redirect-to=/meeting-manager${window.location.pathname.replace("/meeting-manager", "")}`;
  }

  return {
    user,
    userContext,
    isLoading,
    isInitialized,
    error,
    isLoggedIn,
    roleLevel,
    isSystemManager,
    isDepartmentLeader,
    isDepartmentMember,
    fullName,
    accessibleDepartments,
    ledDepartments,
    departmentNames,
    permissions,
    hasMinRole,
    canAccessDepartment,
    leadsDepartment,
    initialize,
    redirectToLogin,
  };
});
