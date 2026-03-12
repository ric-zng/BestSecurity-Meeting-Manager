import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";

export function usePermissions() {
  const auth = useAuthStore();

  const canCreateBooking = computed(
    () => auth.isDepartmentMember
  );

  const canCreateTeamMeeting = computed(
    () => auth.isDepartmentLeader
  );

  const canReassign = computed(
    () => auth.isDepartmentLeader
  );

  const canDragDrop = computed(
    () => auth.isDepartmentLeader
  );

  function canEditBooking(booking: {
    assigned_users?: { user: string }[];
  }): boolean {
    if (auth.isSystemManager) return true;
    if (auth.isDepartmentLeader) return true;
    const users =
      booking.assigned_users?.map((au) => au.user) ?? [];
    return users.includes(auth.user);
  }

  function canDeleteBooking(): boolean {
    return auth.isSystemManager;
  }

  function canManageMeetingTypes(departmentName: string): boolean {
    if (auth.isSystemManager) return true;
    return auth.leadsDepartment(departmentName);
  }

  function canEditUserSettings(targetUser: string): boolean {
    if (auth.isSystemManager) return true;
    return targetUser === auth.user;
  }

  function canReadUserSettings(targetUser: string): boolean {
    if (auth.isSystemManager) return true;
    if (targetUser === auth.user) return true;
    return auth.isDepartmentLeader;
  }

  return {
    canCreateBooking,
    canCreateTeamMeeting,
    canReassign,
    canDragDrop,
    canEditBooking,
    canDeleteBooking,
    canManageMeetingTypes,
    canEditUserSettings,
    canReadUserSettings,
  };
}
