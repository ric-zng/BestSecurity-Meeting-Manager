<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <div class="mb-6">
      <button
        @click="router.back()"
        class="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      <h1 class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Book a Meeting</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">Create a customer booking assigned to yourself</p>
    </div>

    <StepProgress
      :steps="wizardSteps"
      :currentStep="currentStep"
      @go-to="goToStep"
    />

    <!-- Step 1: Select Department -->
    <div v-if="currentStep === 0" class="space-y-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Department</h2>
        <div v-if="departments.loading" class="flex justify-center py-8">
          <LoadingSpinner />
        </div>
        <div v-else-if="departments.data?.length" class="grid gap-3">
          <button
            v-for="dept in departments.data"
            :key="dept.name"
            @click="selectDepartment(dept)"
            class="flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left"
            :class="
              form.department === dept.name
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
            "
          >
            <div>
              <p class="font-medium text-gray-900 dark:text-white">{{ dept.department_name }}</p>
              <p v-if="dept.is_leader" class="text-xs text-blue-600 dark:text-blue-400 mt-0.5">You lead this department</p>
            </div>
            <svg
              v-if="form.department === dept.name"
              class="w-5 h-5 text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
        <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>You are not a member of any department.</p>
        </div>
      </div>
      <div class="flex justify-end">
        <button
          @click="nextStep"
          :disabled="!form.department"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue
        </button>
      </div>
    </div>

    <!-- Step 2: Select Meeting Type -->
    <div v-if="currentStep === 1" class="space-y-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Meeting Type</h2>
        <div v-if="meetingTypes.loading" class="flex justify-center py-8">
          <LoadingSpinner />
        </div>
        <div v-else-if="meetingTypes.data?.length" class="grid gap-3">
          <button
            v-for="mt in meetingTypes.data"
            :key="mt.name"
            @click="selectMeetingType(mt)"
            class="flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left"
            :class="
              form.meeting_type === mt.name
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
            "
          >
            <div>
              <p class="font-medium text-gray-900 dark:text-white">{{ mt.meeting_name }}</p>
              <div class="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span>{{ mt.duration }} min</span>
                <span>{{ mt.location_type }}</span>
                <span v-if="mt.requires_approval" class="text-amber-600 dark:text-amber-400">Requires approval</span>
              </div>
            </div>
            <svg
              v-if="form.meeting_type === mt.name"
              class="w-5 h-5 text-blue-500 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
        <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No meeting types available for this department.</p>
        </div>
      </div>
      <div class="flex justify-between">
        <button @click="prevStep" class="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          Back
        </button>
        <button
          @click="nextStep"
          :disabled="!form.meeting_type"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue
        </button>
      </div>
    </div>

    <!-- Step 3: Select Date & Time -->
    <div v-if="currentStep === 2" class="space-y-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Date & Time</h2>

        <CalendarPicker
          :availableDates="availableDates.data?.available_dates || []"
          :availableSlots="availableSlots.data?.available_slots || []"
          :datesLoading="availableDates.loading"
          :slotsLoading="availableSlots.loading"
          :selectedDate="form.scheduled_date"
          :selectedSlot="form.scheduled_start_time"
          @update:selectedDate="selectDate"
          @update:selectedSlot="selectTime"
          @month-change="onMonthChange"
        />
      </div>
      <div class="flex justify-between">
        <button @click="prevStep" class="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          Back
        </button>
        <button
          @click="nextStep"
          :disabled="!form.scheduled_date || !form.scheduled_start_time"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue
        </button>
      </div>
    </div>

    <!-- Step 4: Customer Details -->
    <div v-if="currentStep === 3" class="space-y-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Details</h2>

        <!-- Customer search (for leaders/admins) -->
        <div v-if="auth.isDepartmentLeader" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search existing customer</label>
          <div class="relative">
            <input
              v-model="customerSearch"
              @input="debouncedSearchCustomers"
              type="text"
              placeholder="Search by name, email, or phone..."
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div
              v-if="customerResults.data?.length && customerSearch.length >= 3"
              class="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg max-h-48 overflow-y-auto"
            >
              <button
                v-for="c in customerResults.data"
                :key="c.customer_id"
                @click="selectCustomer(c)"
                class="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              >
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ c.name }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ c.email }} &middot; {{ c.phone }}</p>
              </button>
            </div>
          </div>
          <div class="my-3 flex items-center">
            <div class="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
            <span class="px-3 text-xs text-gray-500 dark:text-gray-400">or enter manually</span>
            <div class="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name *</label>
            <input
              v-model="form.customer_name"
              type="text"
              required
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
            <input
              v-model="form.customer_email"
              type="email"
              required
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone *</label>
            <input
              v-model="form.customer_phone"
              type="tel"
              required
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              v-model="form.customer_notes"
              rows="3"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional notes about the meeting..."
            ></textarea>
          </div>
        </div>
      </div>
      <div class="flex justify-between">
        <button @click="prevStep" class="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          Back
        </button>
        <button
          @click="nextStep"
          :disabled="!isCustomerValid"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Review Booking
        </button>
      </div>
    </div>

    <!-- Step 5: Review & Confirm -->
    <div v-if="currentStep === 4" class="space-y-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">Review Booking</h2>

        <div class="divide-y divide-gray-100 dark:divide-gray-700">
          <div class="flex justify-between py-3">
            <span class="text-sm text-gray-500 dark:text-gray-400">Department</span>
            <span class="text-sm font-medium text-gray-900 dark:text-white">{{ selectedDeptName }}</span>
          </div>
          <div class="flex justify-between py-3">
            <span class="text-sm text-gray-500 dark:text-gray-400">Meeting Type</span>
            <span class="text-sm font-medium text-gray-900 dark:text-white">{{ selectedMeetingTypeName }}</span>
          </div>
          <div class="flex justify-between py-3">
            <span class="text-sm text-gray-500 dark:text-gray-400">Date & Time</span>
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              {{ formatDate(form.scheduled_date) }} at {{ formatTime(form.scheduled_start_time) }}
            </span>
          </div>
          <div class="flex justify-between py-3">
            <span class="text-sm text-gray-500 dark:text-gray-400">Duration</span>
            <span class="text-sm font-medium text-gray-900 dark:text-white">{{ selectedMeetingDuration }} minutes</span>
          </div>
          <div class="flex justify-between py-3">
            <span class="text-sm text-gray-500 dark:text-gray-400">Customer</span>
            <span class="text-sm font-medium text-gray-900 dark:text-white">{{ form.customer_name }}</span>
          </div>
          <div class="flex justify-between py-3">
            <span class="text-sm text-gray-500 dark:text-gray-400">Email</span>
            <span class="text-sm font-medium text-gray-900 dark:text-white">{{ form.customer_email }}</span>
          </div>
          <div class="flex justify-between py-3">
            <span class="text-sm text-gray-500 dark:text-gray-400">Phone</span>
            <span class="text-sm font-medium text-gray-900 dark:text-white">{{ form.customer_phone }}</span>
          </div>
          <div v-if="form.customer_notes" class="flex justify-between py-3">
            <span class="text-sm text-gray-500 dark:text-gray-400">Notes</span>
            <span class="text-sm font-medium text-gray-900 dark:text-white max-w-xs text-right">{{ form.customer_notes }}</span>
          </div>
        </div>
      </div>

      <!-- Error message -->
      <div
        v-if="submitError"
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm"
      >
        <p class="text-sm text-red-700 dark:text-red-400">{{ submitError }}</p>
      </div>

      <div class="flex justify-between">
        <button @click="prevStep" class="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          Back
        </button>
        <button
          @click="submitBooking"
          :disabled="isSubmitting"
          class="px-8 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
        >
          <LoadingSpinner v-if="isSubmitting" size="sm" class="!text-white" />
          {{ isSubmitting ? 'Creating...' : 'Confirm Booking' }}
        </button>
      </div>
    </div>

    <!-- Success State -->
    <div v-if="currentStep === 5" class="text-center py-12">
      <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Booking Created!</h2>
      <p class="text-gray-500 dark:text-gray-400 mb-6">
        Reference: <span class="font-mono font-medium">{{ bookingResult?.booking_id }}</span>
      </p>
      <div class="flex gap-3 justify-center">
        <button
          @click="router.push(`/meeting-manager/bookings/${bookingResult?.booking_id}`)"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          View Booking
        </button>
        <button
          @click="resetWizard"
          class="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Book Another
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from "vue";
import { useRouter } from "vue-router";
import { createResource, call } from "frappe-ui";
import { useAuthStore } from "@/stores/auth";
import StepProgress from "@/components/shared/StepProgress.vue";
import LoadingSpinner from "@/components/shared/LoadingSpinner.vue";
import CalendarPicker from "@/components/bookings/CalendarPicker.vue";

const router = useRouter();
const auth = useAuthStore();

const currentStep = ref(0);
const isSubmitting = ref(false);
const submitError = ref("");
const bookingResult = ref(null);
const customerSearch = ref("");
let searchTimeout = null;

const form = reactive({
  department: "",
  meeting_type: "",
  scheduled_date: "",
  scheduled_start_time: "",
  customer_name: "",
  customer_email: "",
  customer_phone: "",
  customer_notes: "",
});

// Cached display names
const selectedDeptName = ref("");
const selectedMeetingTypeName = ref("");
const selectedMeetingDuration = ref(0);

const wizardSteps = computed(() => [
  { id: "department", label: "Department", clickable: currentStep.value > 0 },
  { id: "meeting_type", label: "Meeting Type", clickable: currentStep.value > 1 },
  { id: "datetime", label: "Date & Time", clickable: currentStep.value > 2 },
  { id: "customer", label: "Customer", clickable: currentStep.value > 3 },
  { id: "review", label: "Review", clickable: false },
]);

// Calendar month tracking (for API params)
const viewMonth = ref(new Date().getMonth() + 1);
const viewYear = ref(new Date().getFullYear());

// APIs
const departments = createResource({
  url: "meeting_manager.meeting_manager.api.booking.get_user_departments",
  auto: true,
});

const meetingTypes = createResource({
  url: "meeting_manager.meeting_manager.api.booking.get_department_meeting_types_for_self_booking",
  makeParams() {
    return { department: form.department };
  },
});

const availableDates = createResource({
  url: "meeting_manager.meeting_manager.api.booking.get_user_available_dates",
  makeParams() {
    return {
      department: form.department,
      meeting_type: form.meeting_type,
      month: viewMonth.value,
      year: viewYear.value,
    };
  },
});

const availableSlots = createResource({
  url: "meeting_manager.meeting_manager.api.booking.get_user_available_slots",
  makeParams() {
    return {
      department: form.department,
      meeting_type: form.meeting_type,
      date: form.scheduled_date,
    };
  },
});

const customerResults = createResource({
  url: "meeting_manager.meeting_manager.api.booking.search_customers",
  makeParams() {
    return { query: customerSearch.value };
  },
});

const isCustomerValid = computed(() => {
  return form.customer_name && form.customer_email && form.customer_phone;
});

// Handlers
function selectDepartment(dept) {
  form.department = dept.name;
  selectedDeptName.value = dept.department_name;
  // Reset downstream
  form.meeting_type = "";
  form.scheduled_date = "";
  form.scheduled_start_time = "";
}

function selectMeetingType(mt) {
  form.meeting_type = mt.name;
  selectedMeetingTypeName.value = mt.meeting_name;
  selectedMeetingDuration.value = mt.duration;
  // Reset downstream
  form.scheduled_date = "";
  form.scheduled_start_time = "";
}

function selectDate(dateStr) {
  form.scheduled_date = dateStr;
  form.scheduled_start_time = "";
  availableSlots.fetch();
}

function selectTime(time) {
  form.scheduled_start_time = time;
}

function selectCustomer(c) {
  form.customer_name = c.name;
  form.customer_email = c.email;
  form.customer_phone = c.phone || "";
  customerSearch.value = "";
}

function onMonthChange({ month, year }) {
  viewMonth.value = month;
  viewYear.value = year;
  availableDates.fetch();
}

function nextStep() {
  if (currentStep.value === 0 && form.department) {
    meetingTypes.fetch();
  }
  if (currentStep.value === 1 && form.meeting_type) {
    availableDates.fetch();
  }
  currentStep.value++;
}

function prevStep() {
  currentStep.value--;
}

function goToStep(idx) {
  if (idx < currentStep.value) {
    currentStep.value = idx;
  }
}

function debouncedSearchCustomers() {
  clearTimeout(searchTimeout);
  if (customerSearch.value.length >= 3) {
    searchTimeout = setTimeout(() => customerResults.fetch(), 300);
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

async function submitBooking() {
  isSubmitting.value = true;
  submitError.value = "";
  try {
    const result = await call(
      "meeting_manager.meeting_manager.api.booking.create_self_booking",
      {
        booking_data: {
          department: form.department,
          meeting_type: form.meeting_type,
          scheduled_date: form.scheduled_date,
          scheduled_start_time: form.scheduled_start_time,
          customer_name: form.customer_name,
          customer_email: form.customer_email,
          customer_phone: form.customer_phone,
          customer_notes: form.customer_notes,
        },
      }
    );
    bookingResult.value = result;
    currentStep.value = 5;
  } catch (e) {
    submitError.value = e.messages?.[0] || e.message || "Failed to create booking";
  } finally {
    isSubmitting.value = false;
  }
}

function resetWizard() {
  currentStep.value = 0;
  Object.assign(form, {
    department: "",
    meeting_type: "",
    scheduled_date: "",
    scheduled_start_time: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_notes: "",
  });
  bookingResult.value = null;
  submitError.value = "";
}
</script>
