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
    const id = (route.params.bookingId || route.params.id) as string;
    currentIndex.value = bookingIds.value.indexOf(id);
  }

  function goToNext() {
    if (bookingIds.value.length === 0) return;
    // Wrap around: if at end, go to first
    const nextIdx = (currentIndex.value + 1) % bookingIds.value.length;
    router.push(`/bookings/${bookingIds.value[nextIdx]}`);
  }

  function goToPrevious() {
    if (bookingIds.value.length === 0) return;
    // Wrap around: if at start, go to last
    const prevIdx = (currentIndex.value - 1 + bookingIds.value.length) % bookingIds.value.length;
    router.push(`/bookings/${bookingIds.value[prevIdx]}`);
  }

  // Always enabled when we have bookings (circular navigation)
  const hasNext = computed(() => bookingIds.value.length > 1);
  const hasPrevious = computed(() => bookingIds.value.length > 1);

  const nextId = computed(() => {
    if (bookingIds.value.length <= 1) return null;
    const nextIdx = (currentIndex.value + 1) % bookingIds.value.length;
    return bookingIds.value[nextIdx];
  });

  const prevId = computed(() => {
    if (bookingIds.value.length <= 1) return null;
    const prevIdx = (currentIndex.value - 1 + bookingIds.value.length) % bookingIds.value.length;
    return bookingIds.value[prevIdx];
  });

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
