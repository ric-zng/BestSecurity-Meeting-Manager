import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { call } from "frappe-ui";

// Module-level state shared across components
const bookingIds = ref<string[]>([]);
const currentIndex = ref(-1);
const isLoading = ref(false);

export function useBookingNavigation() {
  const router = useRouter();
  const route = useRoute();

  async function loadBookings() {
    if (isLoading.value) return;
    isLoading.value = true;
    try {
      const result = await call("frappe.client.get_list", {
        doctype: "MM Meeting Booking",
        fields: ["name"],
        order_by: "start_datetime desc",
        limit_page_length: 200,
      });
      bookingIds.value = result.map((r: { name: string }) => r.name);
      updateCurrentIndex();
    } finally {
      isLoading.value = false;
    }
  }

  function updateCurrentIndex() {
    const id = route.params.id as string;
    currentIndex.value = bookingIds.value.indexOf(id);
  }

  function goToNext() {
    if (hasNext.value) {
      const next = bookingIds.value[currentIndex.value + 1];
      router.push(`/bookings/${next}`);
    }
  }

  function goToPrevious() {
    if (hasPrevious.value) {
      const prev = bookingIds.value[currentIndex.value - 1];
      router.push(`/bookings/${prev}`);
    }
  }

  const hasNext = computed(
    () => currentIndex.value >= 0 && currentIndex.value < bookingIds.value.length - 1
  );
  const hasPrevious = computed(() => currentIndex.value > 0);
  const nextId = computed(() =>
    hasNext.value ? bookingIds.value[currentIndex.value + 1] : null
  );
  const prevId = computed(() =>
    hasPrevious.value ? bookingIds.value[currentIndex.value - 1] : null
  );

  return {
    loadBookings,
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
