<template>
  <div>
    <!-- Month navigation -->
    <div class="flex items-center justify-between mb-4">
      <button
        @click="changeMonth(-1)"
        :disabled="!canGoPrevMonth"
        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h3 class="text-base font-semibold text-gray-900 dark:text-white">
        {{ monthLabel }}
      </h3>
      <button
        @click="changeMonth(1)"
        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Available dates loading -->
    <div v-if="datesLoading" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>

    <!-- Date grid -->
    <div v-else class="mb-6">
      <div class="grid grid-cols-7 gap-1 mb-2">
        <div v-for="day in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']" :key="day"
          class="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1"
        >{{ day }}</div>
      </div>
      <div class="grid grid-cols-7 gap-1">
        <div v-for="(day, idx) in calendarDays" :key="idx">
          <button
            v-if="day.date"
            @click="day.available && onSelectDate(day.date)"
            :disabled="!day.available"
            class="w-full aspect-square flex items-center justify-center text-sm rounded-lg transition-colors"
            :class="dateButtonClass(day)"
          >
            {{ day.day }}
          </button>
          <div v-else class="w-full aspect-square"></div>
        </div>
      </div>
    </div>

    <!-- Time slots -->
    <div v-if="selectedDate">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        Available times for {{ formatDate(selectedDate) }}
      </h3>
      <div v-if="slotsLoading" class="flex justify-center py-4">
        <LoadingSpinner size="sm" />
      </div>
      <div v-else-if="availableSlots?.length" class="grid grid-cols-3 sm:grid-cols-4 gap-2">
        <button
          v-for="slot in availableSlots"
          :key="slot.start_time"
          @click="onSelectTime(slot.start_time)"
          class="px-3 py-2 text-sm rounded-lg border-2 font-medium transition-colors"
          :class="
            selectedSlot === slot.start_time
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-400'
              : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
          "
        >
          {{ formatTime(slot.start_time) }}
        </button>
      </div>
      <div v-else class="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
        {{ noSlotsMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import LoadingSpinner from "@/components/shared/LoadingSpinner.vue";

const props = defineProps({
  availableDates: {
    type: Array,
    default: () => [],
  },
  availableSlots: {
    type: Array,
    default: () => [],
  },
  datesLoading: {
    type: Boolean,
    default: false,
  },
  slotsLoading: {
    type: Boolean,
    default: false,
  },
  selectedDate: {
    type: String,
    default: "",
  },
  selectedSlot: {
    type: String,
    default: "",
  },
  noSlotsMessage: {
    type: String,
    default: "No available time slots for this date.",
  },
});

const emit = defineEmits([
  "update:selectedDate",
  "update:selectedSlot",
  "month-change",
]);

// Calendar state
const viewMonth = ref(new Date().getMonth() + 1);
const viewYear = ref(new Date().getFullYear());

const monthLabel = computed(() => {
  const d = new Date(viewYear.value, viewMonth.value - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
});

const canGoPrevMonth = computed(() => {
  const now = new Date();
  return (
    viewYear.value > now.getFullYear() ||
    (viewYear.value === now.getFullYear() && viewMonth.value > now.getMonth() + 1)
  );
});

const calendarDays = computed(() => {
  const year = viewYear.value;
  const month = viewMonth.value - 1;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDay.getDate();

  const availSet = new Set(props.availableDates || []);
  const today = new Date().toISOString().split("T")[0];

  const days = [];
  for (let i = 0; i < startDow; i++) {
    days.push({ date: null, day: null, available: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({
      date: dateStr,
      day: d,
      available: availSet.has(dateStr) && dateStr >= today,
    });
  }
  return days;
});

function changeMonth(delta) {
  let m = viewMonth.value + delta;
  let y = viewYear.value;
  if (m > 12) { m = 1; y++; }
  if (m < 1) { m = 12; y--; }
  viewMonth.value = m;
  viewYear.value = y;
  emit("month-change", { month: m, year: y });
}

function onSelectDate(dateStr) {
  emit("update:selectedDate", dateStr);
  emit("update:selectedSlot", "");
}

function onSelectTime(time) {
  emit("update:selectedSlot", time);
}

function dateButtonClass(day) {
  if (props.selectedDate === day.date) {
    return "bg-blue-600 text-white font-semibold dark:bg-blue-500";
  }
  if (day.available) {
    return "text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium";
  }
  return "text-gray-300 dark:text-gray-600 cursor-not-allowed";
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}
</script>
