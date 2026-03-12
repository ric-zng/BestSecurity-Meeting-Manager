import { useAuthStore } from "@/stores/auth";

export function useCalendarPermissions() {
  const auth = useAuthStore();

  // Can user select a time slot on the calendar for a given resource?
  function canSelectSlot(resourceId: string): boolean {
    if (auth.isSystemManager) return true;
    if (auth.isDepartmentLeader) {
      // Can select for team members in led departments + self
      if (resourceId === auth.user) return true;
      // Check if resource is in a led department
      return auth.ledDepartments?.some(d => true) || false; // simplified - backend validates
    }
    // Member: only own slots
    return resourceId === auth.user;
  }

  // Can user manage (create/edit/delete) a blocked slot for a resource?
  function canManageBlockedSlot(resourceId: string): boolean {
    if (auth.isSystemManager) return true;
    if (resourceId === auth.user) return true; // always own slots
    if (auth.isDepartmentLeader) return true; // leaders can manage team
    return false;
  }

  // Can user modify (drag/resize) a booking event?
  function canModifyEvent(event: any): boolean {
    const props = event.extendedProps || {};
    return props.can_reschedule === true;
  }

  function canReassignEvent(event: any): boolean {
    const props = event.extendedProps || {};
    return props.can_reassign === true;
  }

  return { canSelectSlot, canManageBlockedSlot, canModifyEvent, canReassignEvent };
}
