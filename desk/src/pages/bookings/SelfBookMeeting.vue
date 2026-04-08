<template>
  <div class="min-h-full bg-gray-50 dark:bg-gray-950">
    <!-- Header -->
    <div class="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
      <button
        @click="router.back()"
        class="mb-2 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      <h1 class="text-xl font-bold text-gray-900 dark:text-white">Book a Meeting</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">Create a customer booking assigned to yourself</p>
    </div>

    <!-- Step indicator (breadcrumb style) -->
    <div class="border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-950">
      <nav class="flex items-center gap-1 overflow-x-auto text-sm">
        <template v-for="(step, idx) in wizardSteps" :key="step.id">
          <button
            @click="idx < currentStep && goToStep(idx)"
            class="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors"
            :class="stepClass(idx)"
            :disabled="idx > currentStep"
          >
            <span
              v-if="idx < currentStep"
              class="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white dark:bg-blue-500"
            >
              <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </span>
            <span
              v-else
              class="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
              :class="idx === currentStep
                ? 'bg-blue-600 text-white dark:bg-blue-500'
                : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'"
            >{{ idx + 1 }}</span>
            <span class="hidden sm:inline">{{ step.label }}</span>
          </button>
          <svg v-if="idx < wizardSteps.length - 1" class="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </template>
      </nav>
    </div>

    <!-- Content area -->
    <div class="mx-auto w-full max-w-4xl px-6 py-8">

      <!-- Step 1: Department -->
      <div v-if="currentStep === 0">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Select Department</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Choose the department for this booking</p>
        </div>
        <div v-if="departments.loading" class="flex justify-center py-12">
          <LoadingSpinner />
        </div>
        <div v-else-if="departments.data?.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            v-for="dept in departments.data"
            :key="dept.name"
            @click="selectDepartment(dept)"
            class="group flex items-center gap-3 rounded-xl border-2 bg-white p-4 text-left transition-all dark:bg-gray-900"
            :class="form.department === dept.name
              ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:hover:border-gray-600'"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 dark:text-white">{{ dept.department_name }}</p>
              <p v-if="dept.is_leader" class="text-xs text-blue-600 dark:text-blue-400">You lead this department</p>
            </div>
            <svg
              v-if="form.department === dept.name"
              class="h-5 w-5 shrink-0 text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
        <div v-else class="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <p class="text-gray-500 dark:text-gray-400">You are not a member of any department.</p>
        </div>
        <div class="mt-8 flex justify-end">
          <button
            @click="nextStep"
            :disabled="!form.department"
            class="sbm-btn-primary"
          >Continue</button>
        </div>
      </div>

      <!-- Step 2: Meeting Type -->
      <div v-if="currentStep === 1">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Select Meeting Type</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Choose the type of meeting for {{ selectedDeptName }}</p>
        </div>
        <div v-if="meetingTypes.loading" class="flex justify-center py-12">
          <LoadingSpinner />
        </div>
        <div v-else-if="meetingTypes.data?.length" class="grid gap-3 sm:grid-cols-2">
          <button
            v-for="mt in meetingTypes.data"
            :key="mt.name"
            @click="selectMeetingType(mt)"
            class="group flex items-center gap-3 rounded-xl border-2 bg-white p-4 text-left transition-all dark:bg-gray-900"
            :class="form.meeting_type === mt.name
              ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:hover:border-gray-600'"
          >
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 dark:text-white">{{ mt.meeting_name }}</p>
              <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span class="inline-flex items-center gap-1">
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {{ mt.duration }} min
                </span>
                <span class="inline-flex items-center gap-1">
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {{ mt.location_type }}
                </span>
                <span v-if="mt.requires_approval" class="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Requires approval
                </span>
              </div>
            </div>
            <svg
              v-if="form.meeting_type === mt.name"
              class="h-5 w-5 shrink-0 text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
        <div v-else class="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <p class="text-gray-500 dark:text-gray-400">No meeting types available for this department.</p>
        </div>
        <div class="mt-8 flex justify-between">
          <button @click="prevStep" class="sbm-btn-secondary">Back</button>
          <button @click="nextStep" :disabled="!form.meeting_type" class="sbm-btn-primary">Continue</button>
        </div>
      </div>

      <!-- Step 3: Service Type -->
      <div v-if="currentStep === 2">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Select Service Type</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Choose the service type for this booking</p>
        </div>
        <div v-if="loadingServices" class="flex justify-center py-12">
          <LoadingSpinner />
        </div>
        <div v-else-if="serviceOptions.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            v-for="svc in serviceOptions"
            :key="svc.value"
            @click="form.service_type = svc.value"
            class="group flex items-center gap-3 rounded-xl border-2 bg-white p-4 text-left transition-all dark:bg-gray-900"
            :class="form.service_type === svc.value
              ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:hover:border-gray-600'"
          >
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 dark:text-white">{{ svc.label }}</p>
            </div>
            <svg
              v-if="form.service_type === svc.value"
              class="h-5 w-5 shrink-0 text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
        <div v-else class="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <p class="text-gray-500 dark:text-gray-400">No service types available.</p>
        </div>
        <div class="mt-8 flex justify-between">
          <button @click="prevStep" class="sbm-btn-secondary">Back</button>
          <button @click="nextStep" :disabled="!form.service_type" class="sbm-btn-primary">Continue</button>
        </div>
      </div>

      <!-- Step 4: Date -->
      <div v-if="currentStep === 3">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Select Date</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Pick an available date for your meeting</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <!-- Month navigation -->
          <div class="mb-4 flex items-center justify-between">
            <button
              @click="changeMonth(-1)"
              :disabled="!canGoPrevMonth"
              class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ monthLabel }}</h3>
            <button
              @click="changeMonth(1)"
              class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div v-if="availableDates.loading" class="flex justify-center py-8">
            <LoadingSpinner />
          </div>
          <div v-else>
            <!-- Weekday headers -->
            <div class="mb-2 grid grid-cols-7 gap-1">
              <div v-for="d in ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']" :key="d"
                class="py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
              >{{ d }}</div>
            </div>
            <!-- Date grid -->
            <div class="grid grid-cols-7 gap-1">
              <div v-for="(day, idx) in calendarDays" :key="idx">
                <button
                  v-if="day.date"
                  @click="day.available && selectDate(day.date)"
                  :disabled="!day.available"
                  class="flex h-12 w-full items-center justify-center rounded-lg text-sm font-medium transition-all"
                  :class="dateClass(day)"
                >{{ day.day }}</button>
                <div v-else class="h-12"></div>
              </div>
            </div>
          </div>

          <!-- Selected date indicator -->
          <div v-if="form.scheduled_date" class="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 dark:bg-blue-900/20">
            <svg class="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="text-sm font-medium text-blue-700 dark:text-blue-300">{{ formatDate(form.scheduled_date) }}</span>
          </div>
        </div>
        <div class="mt-8 flex justify-between">
          <button @click="prevStep" class="sbm-btn-secondary">Back</button>
          <button @click="nextStep" :disabled="!form.scheduled_date" class="sbm-btn-primary">Continue</button>
        </div>
      </div>

      <!-- Step 5: Time -->
      <div v-if="currentStep === 4">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Select Time</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Available times for <span class="font-medium text-gray-700 dark:text-gray-300">{{ formatDate(form.scheduled_date) }}</span>
          </p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <div v-if="availableSlots.loading" class="flex justify-center py-12">
            <LoadingSpinner />
          </div>
          <div v-else-if="timeSlots.length" class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            <button
              v-for="slot in timeSlots"
              :key="slot.time"
              @click="form.scheduled_start_time = slot.time"
              class="flex h-12 items-center justify-center rounded-lg border-2 text-sm font-semibold transition-all"
              :class="form.scheduled_start_time === slot.time
                ? 'border-blue-500 bg-blue-600 text-white shadow-md dark:border-blue-400 dark:bg-blue-500'
                : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:bg-blue-900/20'"
            >
              {{ formatTime(slot.time) }}
            </button>
          </div>
          <div v-else class="py-12 text-center">
            <svg class="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm text-gray-500 dark:text-gray-400">No available time slots for this date.</p>
            <button @click="prevStep" class="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              Choose a different date
            </button>
          </div>
        </div>
        <div class="mt-8 flex justify-between">
          <button @click="prevStep" class="sbm-btn-secondary">Back</button>
          <button @click="nextStep" :disabled="!form.scheduled_start_time" class="sbm-btn-primary">Continue</button>
        </div>
      </div>

      <!-- Step 6: Customer -->
      <div v-if="currentStep === 5">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Customer Details</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Search for an existing customer or enter details manually</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <!-- Search -->
          <div class="relative mb-4">
            <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Search by name, email, phone, or CVR</label>
            <input
              v-model="customerSearch"
              type="text"
              placeholder="Type to search..."
              class="sbm-input"
              @input="debouncedSearchCustomers"
            />
            <div v-if="searching" class="pointer-events-none absolute right-3 top-[1.75rem]">
              <svg class="h-4 w-4 animate-spin text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <!-- Results dropdown -->
            <ul v-if="customerResultsList.length" class="mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-900">
              <li
                v-for="c in customerResultsList"
                :key="`${c.source}-${c.name}`"
                class="cursor-pointer px-3 py-2.5 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30"
                @click="selectCustomer(c)"
              >
                <div class="flex items-center gap-2">
                  <span
                    class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                    :class="c.source === 'Contact'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'"
                  >{{ c.source === 'Contact' ? 'Contact' : 'Customer' }}</span>
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{{ c.customer_name }}</span>
                </div>
                <div class="mt-0.5 flex flex-wrap gap-x-3 pl-16 text-xs text-gray-500 dark:text-gray-400">
                  <span v-if="c.email">{{ c.email }}</span>
                  <span v-if="c.phone">{{ c.phone }}</span>
                  <span v-if="c.company">{{ c.company }}</span>
                  <span v-if="c.cvr" class="text-amber-600 dark:text-amber-400">CVR: {{ c.cvr }}</span>
                </div>
              </li>
            </ul>
            <p v-if="customerSearch.length >= 2 && !searching && customerResultsList.length === 0 && searchDone" class="mt-1 text-xs text-gray-400 dark:text-gray-500">
              No results found. Enter details manually below.
            </p>
          </div>

          <div class="my-4 flex items-center">
            <div class="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
            <span class="px-3 text-xs text-gray-400 dark:text-gray-500">&mdash; or enter manually &mdash;</span>
            <div class="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="sbm-label">Name</label>
              <input v-model="form.customer_name" type="text" class="sbm-input" placeholder="Full name" />
            </div>
            <div>
              <label class="sbm-label">Email <span class="text-red-500">*</span></label>
              <input v-model="form.customer_email" type="email" class="sbm-input" placeholder="email@example.com" />
            </div>
            <div>
              <label class="sbm-label">Phone</label>
              <input v-model="form.customer_phone" type="tel" class="sbm-input" placeholder="Phone number" />
            </div>
            <div>
              <label class="sbm-label">Company</label>
              <input v-model="form.customer_company" type="text" class="sbm-input" placeholder="Company name" />
            </div>
          </div>
          <div class="mt-4">
            <label class="sbm-label">Notes</label>
            <textarea
              v-model="form.customer_notes"
              rows="3"
              class="sbm-input"
              placeholder="Optional notes about the meeting..."
            ></textarea>
          </div>
        </div>
        <div class="mt-8 flex justify-between">
          <button @click="prevStep" class="sbm-btn-secondary">Back</button>
          <button @click="nextStep" :disabled="!isCustomerValid" class="sbm-btn-primary">Review Booking</button>
        </div>
      </div>

      <!-- Step 7: Review & Confirm -->
      <div v-if="currentStep === 6">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Review & Confirm</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Review the booking details before confirming</p>
        </div>

        <div class="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <!-- Summary rows -->
          <dl class="divide-y divide-gray-100 dark:divide-gray-700">
            <div class="flex items-center justify-between px-6 py-4">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Department</dt>
              <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ selectedDeptName }}</dd>
            </div>
            <div class="flex items-center justify-between px-6 py-4">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Meeting Type</dt>
              <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ selectedMeetingTypeName }}</dd>
            </div>
            <div class="flex items-center justify-between px-6 py-4">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Service</dt>
              <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ form.service_type }}</dd>
            </div>
            <div class="flex items-center justify-between px-6 py-4">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Date &amp; Time</dt>
              <dd class="text-sm font-medium text-gray-900 dark:text-white">
                {{ formatDate(form.scheduled_date) }} at {{ formatTime(form.scheduled_start_time) }}
              </dd>
            </div>
            <div class="flex items-center justify-between px-6 py-4">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Duration</dt>
              <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ selectedMeetingDuration }} minutes</dd>
            </div>
            <div class="flex items-center justify-between px-6 py-4">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Customer</dt>
              <dd class="text-right">
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ form.customer_name }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ form.customer_email }}</p>
              </dd>
            </div>
            <div v-if="form.customer_phone" class="flex items-center justify-between px-6 py-4">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Phone</dt>
              <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ form.customer_phone }}</dd>
            </div>
            <div v-if="form.customer_company" class="flex items-center justify-between px-6 py-4">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Company</dt>
              <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ form.customer_company }}</dd>
            </div>
            <div v-if="form.customer_notes" class="px-6 py-4">
              <dt class="mb-1 text-sm text-gray-500 dark:text-gray-400">Notes</dt>
              <dd class="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">{{ form.customer_notes }}</dd>
            </div>
          </dl>

          <!-- Notification toggle -->
          <div class="border-t border-gray-100 px-6 py-4 dark:border-gray-700">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="notifyCustomer"
                class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <div>
                <span class="text-sm font-medium text-gray-900 dark:text-white">Send confirmation email to customer</span>
                <p class="text-xs text-gray-500 dark:text-gray-400">Customer will receive booking details at {{ form.customer_email }}</p>
              </div>
            </label>
          </div>
        </div>

        <!-- Error -->
        <div v-if="submitError" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p class="text-sm text-red-700 dark:text-red-400">{{ submitError }}</p>
        </div>

        <div class="mt-8 flex justify-between">
          <button @click="prevStep" class="sbm-btn-secondary">Back</button>
          <button
            @click="submitBooking"
            :disabled="isSubmitting"
            class="sbm-btn-primary inline-flex items-center gap-2"
          >
            <LoadingSpinner v-if="isSubmitting" size="sm" class="!text-white" />
            {{ isSubmitting ? 'Creating...' : 'Confirm Booking' }}
          </button>
        </div>
      </div>

      <!-- Success -->
      <div v-if="currentStep === 7" class="py-16 text-center">
        <div class="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg class="h-10 w-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Booking Created!</h2>
        <p class="mt-2 text-gray-500 dark:text-gray-400">
          Reference: <span class="font-mono font-semibold text-gray-700 dark:text-gray-300">{{ bookingResult?.booking_id }}</span>
        </p>
        <div class="mt-8 flex justify-center gap-3">
          <button
            @click="router.push(`/bookings/${bookingResult?.booking_id}`)"
            class="sbm-btn-primary"
          >View Booking</button>
          <button @click="resetWizard" class="sbm-btn-secondary">Book Another</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { createResource, call } from "frappe-ui";
import { useAuthStore } from "@/stores/auth";
import LoadingSpinner from "@/components/shared/LoadingSpinner.vue";

const router = useRouter();
const auth = useAuthStore();

const API_BASE = "meeting_manager.meeting_manager.page.mm_enhanced_calendar.api";
const BOOKING_API = "meeting_manager.meeting_manager.api.booking";

const currentStep = ref(0);
const isSubmitting = ref(false);
const submitError = ref("");
const bookingResult = ref(null);
const notifyCustomer = ref(true);

// Customer search
const customerSearch = ref("");
const customerResultsList = ref([]);
const searching = ref(false);
const searchDone = ref(false);
let searchTimeout = null;

// Service options
const serviceOptions = ref([]);
const loadingServices = ref(false);

const form = reactive({
  department: "",
  meeting_type: "",
  service_type: "",
  scheduled_date: "",
  scheduled_start_time: "",
  customer_name: "",
  customer_email: "",
  customer_phone: "",
  customer_company: "",
  customer_notes: "",
});

const selectedDeptName = ref("");
const selectedMeetingTypeName = ref("");
const selectedMeetingDuration = ref(0);

const wizardSteps = computed(() => [
  { id: "department", label: "Department" },
  { id: "meeting_type", label: "Meeting Type" },
  { id: "service", label: "Service" },
  { id: "date", label: "Date" },
  { id: "time", label: "Time" },
  { id: "customer", label: "Customer" },
  { id: "review", label: "Confirm" },
]);

function stepClass(idx) {
  if (idx < currentStep.value) return "text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20";
  if (idx === currentStep.value) return "text-blue-600 dark:text-blue-400 font-semibold";
  return "text-gray-400 dark:text-gray-500 cursor-default";
}

// Calendar
const viewMonth = ref(new Date().getMonth() + 1);
const viewYear = ref(new Date().getFullYear());

const monthLabel = computed(() => {
  const d = new Date(viewYear.value, viewMonth.value - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
});

const canGoPrevMonth = computed(() => {
  const now = new Date();
  return viewYear.value > now.getFullYear() ||
    (viewYear.value === now.getFullYear() && viewMonth.value > now.getMonth() + 1);
});

const calendarDays = computed(() => {
  const year = viewYear.value;
  const month = viewMonth.value - 1;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const availSet = new Set((availableDates.data?.available_dates || []));
  const today = new Date().toISOString().split("T")[0];
  const days = [];
  for (let i = 0; i < startDow; i++) days.push({ date: null, day: null, available: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ date: dateStr, day: d, available: availSet.has(dateStr) && dateStr >= today });
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
  availableDates.fetch();
}

function dateClass(day) {
  if (form.scheduled_date === day.date) return "bg-blue-600 text-white font-bold shadow-md dark:bg-blue-500";
  if (day.available) return "text-gray-900 hover:bg-blue-50 hover:text-blue-700 dark:text-white dark:hover:bg-blue-900/20";
  return "text-gray-300 dark:text-gray-600 cursor-not-allowed";
}

// APIs
const departments = createResource({
  url: `${BOOKING_API}.get_user_departments`,
  auto: true,
});

const meetingTypes = createResource({
  url: `${BOOKING_API}.get_department_meeting_types_for_self_booking`,
  makeParams() { return { department: form.department }; },
});

const availableDates = createResource({
  url: `${BOOKING_API}.get_user_available_dates`,
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
  url: `${BOOKING_API}.get_user_available_slots`,
  makeParams() {
    return {
      department: form.department,
      meeting_type: form.meeting_type,
      date: form.scheduled_date,
    };
  },
});

async function fetchServiceOptions() {
  if (serviceOptions.value.length) return;
  loadingServices.value = true;
  try {
    const res = await call(`${API_BASE}.get_filter_options`);
    serviceOptions.value = (res?.services || []).map(s => ({ value: s.value, label: s.label || s.value }));
  } catch { serviceOptions.value = []; }
  finally { loadingServices.value = false; }
}

const timeSlots = computed(() => availableSlots.data?.available_slots || []);

const isCustomerValid = computed(() => form.customer_email?.trim());

// Handlers
function selectDepartment(dept) {
  form.department = dept.name;
  selectedDeptName.value = dept.department_name;
  form.meeting_type = "";
  form.service_type = "";
  form.scheduled_date = "";
  form.scheduled_start_time = "";
}

function selectMeetingType(mt) {
  form.meeting_type = mt.name;
  selectedMeetingTypeName.value = mt.meeting_name;
  selectedMeetingDuration.value = mt.duration;
  form.service_type = "";
  form.scheduled_date = "";
  form.scheduled_start_time = "";
}

function selectDate(dateStr) {
  form.scheduled_date = dateStr;
  form.scheduled_start_time = "";
}

function selectCustomer(c) {
  form.customer_name = c.customer_name || c.name || "";
  form.customer_email = c.email || "";
  form.customer_phone = c.phone || "";
  form.customer_company = c.company || "";
  customerSearch.value = "";
  customerResultsList.value = [];
  searchDone.value = false;
}

function debouncedSearchCustomers() {
  clearTimeout(searchTimeout);
  searchDone.value = false;
  if (customerSearch.value.length < 2) { customerResultsList.value = []; return; }
  searching.value = true;
  searchTimeout = setTimeout(async () => {
    try {
      const res = await call(`${API_BASE}.search_customers`, { query: customerSearch.value });
      customerResultsList.value = res || [];
    } catch { customerResultsList.value = []; }
    finally { searching.value = false; searchDone.value = true; }
  }, 300);
}

function nextStep() {
  if (currentStep.value === 0 && form.department) {
    meetingTypes.fetch();
    fetchServiceOptions();
  }
  if (currentStep.value === 2 && form.service_type) {
    availableDates.fetch();
  }
  if (currentStep.value === 3 && form.scheduled_date) {
    availableSlots.fetch();
  }
  currentStep.value++;
}

function prevStep() {
  currentStep.value--;
}

function goToStep(idx) {
  if (idx < currentStep.value) currentStep.value = idx;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  return `${h}:${m}`;
}

async function submitBooking() {
  isSubmitting.value = true;
  submitError.value = "";
  try {
    const result = await call(`${BOOKING_API}.create_self_booking`, {
      booking_data: {
        department: form.department,
        meeting_type: form.meeting_type,
        service_type: form.service_type,
        scheduled_date: form.scheduled_date,
        scheduled_start_time: form.scheduled_start_time,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone,
        customer_company: form.customer_company,
        customer_notes: form.customer_notes,
        send_email_notification: notifyCustomer.value,
      },
    });
    bookingResult.value = result;
    currentStep.value = 7;
  } catch (e) {
    submitError.value = e.messages?.[0] || e.message || "Failed to create booking";
  } finally {
    isSubmitting.value = false;
  }
}

function resetWizard() {
  currentStep.value = 0;
  Object.assign(form, {
    department: "", meeting_type: "", service_type: "",
    scheduled_date: "", scheduled_start_time: "",
    customer_name: "", customer_email: "", customer_phone: "",
    customer_company: "", customer_notes: "",
  });
  bookingResult.value = null;
  submitError.value = "";
  notifyCustomer.value = true;
  customerSearch.value = "";
  customerResultsList.value = [];
  searchDone.value = false;
}
</script>

<style scoped>
.sbm-btn-primary {
  @apply cursor-pointer rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50;
}
.sbm-btn-secondary {
  @apply cursor-pointer rounded-lg bg-gray-100 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600;
}
.sbm-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500;
}
.sbm-label {
  @apply mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400;
}
</style>
