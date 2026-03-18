import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { call } from "frappe-ui";

const meetingTypeIds = ref<string[]>([]);
const currentIndex = ref(-1);
const isLoading = ref(false);

export function useMeetingTypeNavigation() {
  const router = useRouter();
  const route = useRoute();

  async function loadMeetingTypes() {
    if (isLoading.value) return;
    isLoading.value = true;
    try {
      const result = await call("frappe.client.get_list", {
        doctype: "MM Meeting Type",
        fields: ["name"],
        order_by: "creation desc",
        limit_page_length: 200,
      });
      meetingTypeIds.value = result.map((r: { name: string }) => r.name);
      updateCurrentIndex();
    } finally {
      isLoading.value = false;
    }
  }

  function updateCurrentIndex() {
    const id = (route.params.id as string) || "";
    currentIndex.value = meetingTypeIds.value.indexOf(id);
  }

  function goToNext() {
    if (meetingTypeIds.value.length === 0) return;
    const nextIdx = (currentIndex.value + 1) % meetingTypeIds.value.length;
    router.push(`/meeting-types/${meetingTypeIds.value[nextIdx]}`);
  }

  function goToPrevious() {
    if (meetingTypeIds.value.length === 0) return;
    const prevIdx =
      (currentIndex.value - 1 + meetingTypeIds.value.length) %
      meetingTypeIds.value.length;
    router.push(`/meeting-types/${meetingTypeIds.value[prevIdx]}`);
  }

  const hasNext = computed(() => meetingTypeIds.value.length > 1);
  const hasPrevious = computed(() => meetingTypeIds.value.length > 1);

  const nextId = computed(() => {
    if (meetingTypeIds.value.length <= 1) return null;
    const nextIdx = (currentIndex.value + 1) % meetingTypeIds.value.length;
    return meetingTypeIds.value[nextIdx];
  });

  const prevId = computed(() => {
    if (meetingTypeIds.value.length <= 1) return null;
    const prevIdx =
      (currentIndex.value - 1 + meetingTypeIds.value.length) %
      meetingTypeIds.value.length;
    return meetingTypeIds.value[prevIdx];
  });

  return {
    loadMeetingTypes,
    updateCurrentIndex,
    goToNext,
    goToPrevious,
    hasNext,
    hasPrevious,
    nextId,
    prevId,
    isLoading,
  };
}
