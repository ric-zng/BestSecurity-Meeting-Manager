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
      <h1 class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Schedule Team Meeting</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">Create an internal meeting with team members</p>
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
        <div v-if="ledDepartments.loading" class="flex justify-center py-8">
          <LoadingSpinner />
        </div>
        <div v-else-if="ledDepartments.data?.length" class="grid gap-3">
          <button
            v-for="dept in ledDepartments.data"
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
            </div>
            <svg
              v-if="form.department === dept.name"
              class="w-5 h-5 text-blue-500 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
        <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>You do not lead any departments.</p>
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
          <p>No internal meeting types for this department.</p>
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

    <!-- Step 3: Select Participants -->
    <div v-if="currentStep === 2" class="space-y-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Select Participants</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Choose at least 2 team members (including yourself)
        </p>
        <div v-if="departmentMembers.loading" class="flex justify-center py-8">
          <LoadingSpinner />
        </div>
        <div v-else-if="departmentMembers.data?.length" class="space-y-2">
          <label
            v-for="member in departmentMembers.data"
            :key="member.user"
            class="flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all"
            :class="
              form.participants.includes(member.user)
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            "
          >
            <input
              type="checkbox"
              :value="member.user"
              v-model="form.participants"
              class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ member.full_name }}
                <span v-if="member.user === auth.user" class="text-xs text-blue-600 dark:text-blue-400">(you)</span>
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ member.email }}</p>
            </div>
          </label>
        </div>
      </div>
      <div class="flex justify-between">
        <button @click="prevStep" class="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          Back
        </button>
        <button
          @click="nextStep"
          :disabled="form.participants.length < 2"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue
        </button>
      </div>
    </div>

    <!-- Step 4: Select Date & Time -->
    <div v-if="currentStep === 3" class="space-y-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Date & Time</h2>

        <CalendarPicker
          :availableDates="teamAvailableDates.data?.available_dates || []"
          :availableSlots="teamAvailableSlots.data?.available_slots || []"
          :datesLoading="teamAvailableDates.loading"
          :slotsLoading="teamAvailableSlots.loading"
          :selectedDate="form.scheduled_date"
          :selectedSlot="form.scheduled_start_time"
          noSlotsMessage="No times available for all selected participants on this date."
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

    <!-- Step 5: Meeting Details -->
    <div v-if="currentStep === 4" class="space-y-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Meeting Details</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meeting Agenda</label>
            <textarea
              v-model="form.meeting_agenda"
              rows="3"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="What will be discussed..."
            ></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meeting Notes</label>
            <textarea
              v-model="form.meeting_notes"
              rows="2"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional notes..."
            ></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meeting Link</label>
            <input
              v-model="form.meeting_link"
              type="url"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://meet.google.com/..."
            />
          </div>
        </div>
      </div>
      <div class="flex justify-between">
        <button @click="prevStep" class="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          Back
        </button>
        <button
          @click="nextStep"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Review Meeting
        </button>
      </div>
    </div>

    <!-- Step 6: Review & Confirm -->
    <div v-if="currentStep === 5" class="space-y-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">Review Team Meeting</h2>

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
          <div class="py-3">
            <span class="text-sm text-gray-500 dark:text-gray-400 block mb-2">Participants ({{ form.participants.length }})</span>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="p in participantNames"
                :key="p"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
              >
                {{ p }}
              </span>
            </div>
          </div>
          <div v-if="form.meeting_agenda" class="py-3">
            <span class="text-sm text-gray-500 dark:text-gray-400 block mb-1">Agenda</span>
            <p class="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{{ form.meeting_agenda }}</p>
          </div>
          <div v-if="form.meeting_link" class="py-3">
            <span class="text-sm text-gray-500 dark:text-gray-400 block mb-1">Meeting Link</span>
            <a :href="form.meeting_link" target="_blank" class="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">{{ form.meeting_link }}</a>
          </div>
        </div>
      </div>

      <div
        v-if="submitError"
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm"
      >
        <p class="text-red-700 dark:text-red-400">{{ submitError }}</p>
      </div>

      <div class="flex justify-between">
        <button @click="prevStep" class="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          Back
        </button>
        <button
          @click="submitTeamMeeting"
          :disabled="isSubmitting"
          class="px-8 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
        >
          <LoadingSpinner v-if="isSubmitting" size="sm" class="!text-white" />
          {{ isSubmitting ? 'Creating...' : 'Create Meeting' }}
        </button>
      </div>
    </div>

    <!-- Success -->
    <div v-if="currentStep === 6" class="text-center py-12">
      <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Team Meeting Created!</h2>
      <p class="text-gray-500 dark:text-gray-400 mb-6">
        Invitations will be sent to all participants.
      </p>
      <div class="flex gap-3 justify-center">
        <button
          @click="router.push(`/meeting-manager/bookings/${meetingResult?.booking_id}`)"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          View Meeting
        </button>
        <button
          @click="resetWizard"
          class="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Schedule Another
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
const meetingResult = ref(null);

const form = reactive({
  department: "",
  meeting_type: "",
  participants: [],
  scheduled_date: "",
  scheduled_start_time: "",
  meeting_agenda: "",
  meeting_notes: "",
  meeting_link: "",
});

const selectedDeptName = ref("");
const selectedMeetingTypeName = ref("");
const selectedMeetingDuration = ref(0);

const wizardSteps = computed(() => [
  { id: "department", label: "Department", clickable: currentStep.value > 0 },
  { id: "meeting_type", label: "Meeting Type", clickable: currentStep.value > 1 },
  { id: "participants", label: "Participants", clickable: currentStep.value > 2 },
  { id: "datetime", label: "Date & Time", clickable: currentStep.value > 3 },
  { id: "details", label: "Details", clickable: currentStep.value > 4 },
  { id: "review", label: "Review", clickable: false },
]);

// Calendar month tracking (for API params)
const viewMonth = ref(new Date().getMonth() + 1);
const viewYear = ref(new Date().getFullYear());

// APIs
const ledDepartments = createResource({
  url: "meeting_manager.meeting_manager.api.booking.get_led_departments",
  auto: true,
});

const meetingTypes = createResource({
  url: "meeting_manager.meeting_manager.api.booking.get_internal_meeting_types",
  makeParams() {
    return { department: form.department };
  },
});

const departmentMembers = createResource({
  url: "meeting_manager.meeting_manager.api.booking.get_department_members",
  makeParams() {
    return { department: form.department };
  },
});

const teamAvailableDates = createResource({
  url: "meeting_manager.meeting_manager.api.booking.get_team_available_dates",
  makeParams() {
    return {
      department: form.department,
      meeting_type: form.meeting_type,
      month: viewMonth.value,
      year: viewYear.value,
      participants: JSON.stringify(form.participants),
    };
  },
});

const teamAvailableSlots = createResource({
  url: "meeting_manager.meeting_manager.api.booking.get_team_available_slots",
  makeParams() {
    return {
      department: form.department,
      meeting_type: form.meeting_type,
      date: form.scheduled_date,
      participants: JSON.stringify(form.participants),
    };
  },
});

const participantNames = computed(() => {
  if (!departmentMembers.data) return form.participants;
  return form.participants.map((email) => {
    const member = departmentMembers.data.find((m) => m.user === email);
    return member?.full_name || email;
  });
});

function selectDepartment(dept) {
  form.department = dept.name;
  selectedDeptName.value = dept.department_name;
  form.meeting_type = "";
  form.participants = [];
  form.scheduled_date = "";
  form.scheduled_start_time = "";
}

function selectMeetingType(mt) {
  form.meeting_type = mt.name;
  selectedMeetingTypeName.value = mt.meeting_name;
  selectedMeetingDuration.value = mt.duration;
  form.scheduled_date = "";
  form.scheduled_start_time = "";
}

function selectDate(dateStr) {
  form.scheduled_date = dateStr;
  form.scheduled_start_time = "";
  teamAvailableSlots.fetch();
}

function selectTime(time) {
  form.scheduled_start_time = time;
}

function onMonthChange({ month, year }) {
  viewMonth.value = month;
  viewYear.value = year;
  teamAvailableDates.fetch();
}

function nextStep() {
  if (currentStep.value === 0 && form.department) {
    meetingTypes.fetch();
    departmentMembers.fetch();
  }
  if (currentStep.value === 2 && form.participants.length >= 2) {
    teamAvailableDates.fetch();
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

async function submitTeamMeeting() {
  isSubmitting.value = true;
  submitError.value = "";
  try {
    const result = await call(
      "meeting_manager.meeting_manager.api.booking.create_team_meeting",
      {
        meeting_data: {
          department: form.department,
          meeting_type: form.meeting_type,
          scheduled_date: form.scheduled_date,
          scheduled_start_time: form.scheduled_start_time,
          participants: form.participants,
          meeting_agenda: form.meeting_agenda,
          meeting_notes: form.meeting_notes,
          meeting_link: form.meeting_link,
        },
      }
    );
    meetingResult.value = result;
    currentStep.value = 6;
  } catch (e) {
    submitError.value = e.messages?.[0] || e.message || "Failed to create meeting";
  } finally {
    isSubmitting.value = false;
  }
}

function resetWizard() {
  currentStep.value = 0;
  Object.assign(form, {
    department: "",
    meeting_type: "",
    participants: [],
    scheduled_date: "",
    scheduled_start_time: "",
    meeting_agenda: "",
    meeting_notes: "",
    meeting_link: "",
  });
  meetingResult.value = null;
  submitError.value = "";
}
</script>
