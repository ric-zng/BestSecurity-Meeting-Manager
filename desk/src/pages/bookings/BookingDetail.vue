<template>
  <AppLayout>
    <!-- Loading state -->
    <div v-if="bookingResource.loading && !data" class="p-6">
      <div class="mb-6 flex items-center gap-3">
        <div class="h-8 w-20 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
        <div class="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="lg:col-span-2 space-y-6">
          <div v-for="i in 2" :key="i" class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <div class="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700 mb-4" />
            <div class="space-y-3">
              <div class="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div class="h-4 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div class="h-4 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        </div>
        <div class="space-y-6">
          <div v-for="i in 3" :key="i" class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <div class="h-5 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700 mb-4" />
            <div class="space-y-3">
              <div class="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div class="h-4 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="bookingResource.error || (data && !data.success)" class="p-6">
      <ErrorState
        title="Booking not found"
        :message="data?.message || bookingResource.error?.message || 'Could not load booking details.'"
        @retry="bookingResource.reload()"
      />
    </div>

    <!-- Main content -->
    <div v-else-if="data?.success" class="p-6">
      <!-- Header -->
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
          <button
            @click="router.push('/bookings')"
            class="flex items-center justify-center rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <FeatherIcon name="arrow-left" class="h-5 w-5" />
          </button>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
                {{ booking.name }}
              </h1>
              <StatusBadge :label="booking.booking_status" :status="booking.booking_status" />
            </div>
            <p v-if="booking.meeting_title" class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {{ booking.meeting_title }}
            </p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Button
            v-if="permissions.can_edit"
            variant="subtle"
            @click="showStatusModal = true"
          >
            <template #prefix>
              <FeatherIcon name="edit-3" class="h-4 w-4" />
            </template>
            Edit Status
          </Button>
          <Button
            v-if="permissions.can_reschedule"
            variant="subtle"
            @click="showRescheduleModal = true"
          >
            <template #prefix>
              <FeatherIcon name="calendar" class="h-4 w-4" />
            </template>
            Reschedule
          </Button>
          <Button
            v-if="permissions.can_reassign"
            variant="subtle"
            @click="openReassignModal"
          >
            <template #prefix>
              <FeatherIcon name="user-plus" class="h-4 w-4" />
            </template>
            Reassign
          </Button>
          <Button
            v-if="permissions.can_cancel"
            theme="red"
            variant="subtle"
            @click="showCancelDialog = true"
          >
            <template #prefix>
              <FeatherIcon name="x-circle" class="h-4 w-4" />
            </template>
            Cancel
          </Button>
        </div>
      </div>

      <!-- Two-column layout -->
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Left column: main info -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Meeting Info Card -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Meeting Information</h2>
            </div>
            <div class="px-5 py-4">
              <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Meeting Title</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ booking.meeting_title || 'Untitled' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Meeting Type</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ meetingType?.meeting_name || meetingType?.name || '-' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Date &amp; Time</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ formatDateTime(booking.start_datetime) }}
                    <span v-if="booking.end_datetime" class="text-gray-400 dark:text-gray-500">
                      &ndash; {{ formatTime(booking.end_datetime) }}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Duration</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ booking.duration_minutes ? booking.duration_minutes + ' minutes' : booking.duration || '-' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Location Type</dt>
                  <dd class="mt-0.5 text-sm capitalize text-gray-900 dark:text-white">
                    {{ booking.location_type || '-' }}
                  </dd>
                </div>
                <div v-if="booking.video_meeting_url">
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Video Meeting URL</dt>
                  <dd class="mt-0.5 text-sm">
                    <a
                      :href="booking.video_meeting_url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <FeatherIcon name="video" class="h-3.5 w-3.5" />
                      Join Meeting
                      <FeatherIcon name="external-link" class="h-3 w-3" />
                    </a>
                  </dd>
                </div>
              </dl>
              <div v-if="booking.notes" class="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Description</dt>
                <dd class="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{{ booking.notes }}</dd>
              </div>
            </div>
          </div>

          <!-- Customer Card (non-internal only) -->
          <div
            v-if="!booking.is_internal && (customer || booking.customer_email_at_booking)"
            class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Customer</h2>
            </div>
            <div class="px-5 py-4">
              <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Name</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ customer?.customer_name || '-' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Email</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ customer?.primary_email || booking.customer_email_at_booking || '-' }}
                  </dd>
                </div>
                <div v-if="booking.customer_phone_at_booking">
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Phone</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ booking.customer_phone_at_booking }}
                  </dd>
                </div>
                <div v-if="booking.customer_notes">
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Notes</dt>
                  <dd class="mt-0.5 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                    {{ booking.customer_notes }}
                  </dd>
                </div>
              </dl>
              <div v-if="customer?.name" class="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                <a
                  :href="`/app/contact/${customer.name}`"
                  target="_blank"
                  class="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <FeatherIcon name="external-link" class="h-3 w-3" />
                  View Contact Record
                </a>
              </div>
            </div>
          </div>

          <!-- Participants Card (internal meeting) -->
          <div
            v-if="booking.is_internal && internalParticipants.length"
            class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
                Participants
                <span class="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">
                  ({{ internalParticipants.length }})
                </span>
              </h2>
            </div>
            <ul class="divide-y divide-gray-100 dark:divide-gray-800">
              <li
                v-for="p in internalParticipants"
                :key="p.user"
                class="flex items-center justify-between px-5 py-3"
              >
                <div class="flex items-center gap-3">
                  <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {{ getInitials(p.full_name || p.user) }}
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ p.full_name || p.user }}</p>
                    <p v-if="p.email" class="text-xs text-gray-500 dark:text-gray-400">{{ p.email }}</p>
                  </div>
                </div>
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="attendanceClass(p.response_status)"
                >
                  {{ p.response_status || 'Pending' }}
                </span>
              </li>
            </ul>
          </div>

          <!-- History/Timeline Card -->
          <div
            v-if="hasHistory"
            class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">History</h2>
            </div>
            <div class="px-5 py-4">
              <ol class="relative border-l border-gray-200 dark:border-gray-700">
                <li
                  v-for="(entry, idx) in timelineEntries"
                  :key="idx"
                  class="mb-6 ml-6 last:mb-0"
                >
                  <div class="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-gray-100 dark:border-gray-900 dark:bg-gray-700">
                    <FeatherIcon :name="entry.icon" class="h-3 w-3 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div>
                    <p class="text-sm text-gray-900 dark:text-white">{{ entry.description }}</p>
                    <time class="text-xs text-gray-500 dark:text-gray-400">{{ entry.time }}</time>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>

        <!-- Right column: sidebar cards -->
        <div class="space-y-6">
          <!-- Hosts Card -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
                Hosts
                <span class="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">
                  ({{ hosts.length }})
                </span>
              </h2>
            </div>
            <ul class="divide-y divide-gray-100 dark:divide-gray-800">
              <li
                v-for="h in hosts"
                :key="h.user"
                class="flex items-center gap-3 px-5 py-3"
              >
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  {{ getInitials(h.full_name || h.user) }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {{ h.full_name || h.user }}
                  </p>
                  <p v-if="h.email" class="truncate text-xs text-gray-500 dark:text-gray-400">{{ h.email }}</p>
                </div>
                <span
                  v-if="h.is_primary_host"
                  class="shrink-0 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  Primary
                </span>
              </li>
              <li v-if="!hosts.length" class="px-5 py-3 text-sm text-gray-400 dark:text-gray-500">
                No hosts assigned
              </li>
            </ul>
          </div>

          <!-- Service Info Card -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Service Info</h2>
            </div>
            <dl class="px-5 py-4 space-y-3">
              <div>
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Service Type</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                  {{ booking.service_type || '-' }}
                </dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Booking Source</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                  {{ booking.booking_source || '-' }}
                </dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Booking Type</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                  {{ booking.is_internal ? 'Internal (Team Meeting)' : 'External (Customer)' }}
                </dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Department</dt>
                <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                  {{ department?.department_name || '-' }}
                </dd>
              </div>
            </dl>
          </div>

          <!-- Links Card -->
          <div
            v-if="booking.cancel_link || booking.reschedule_link"
            class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Customer Links</h2>
            </div>
            <div class="px-5 py-4 space-y-3">
              <div v-if="booking.cancel_link">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Cancel Link</dt>
                <dd class="mt-1 flex items-center gap-2">
                  <span class="min-w-0 flex-1 truncate text-xs text-gray-600 dark:text-gray-300">
                    {{ booking.cancel_link }}
                  </span>
                  <button
                    @click="copyToClipboard(booking.cancel_link, 'Cancel link')"
                    class="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    title="Copy to clipboard"
                  >
                    <FeatherIcon name="copy" class="h-3.5 w-3.5" />
                  </button>
                </dd>
              </div>
              <div v-if="booking.reschedule_link">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Reschedule Link</dt>
                <dd class="mt-1 flex items-center gap-2">
                  <span class="min-w-0 flex-1 truncate text-xs text-gray-600 dark:text-gray-300">
                    {{ booking.reschedule_link }}
                  </span>
                  <button
                    @click="copyToClipboard(booking.reschedule_link, 'Reschedule link')"
                    class="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    title="Copy to clipboard"
                  >
                    <FeatherIcon name="copy" class="h-3.5 w-3.5" />
                  </button>
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Change Status Modal -->
    <TransitionRoot :show="showStatusModal" as="template">
      <HDialog class="relative z-50" @close="showStatusModal = false">
        <TransitionChild
          as="template"
          enter="duration-200 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-150 ease-in" leave-from="opacity-100" leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black/30 dark:bg-black/50" />
        </TransitionChild>
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="duration-200 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100"
            leave="duration-150 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
              <DialogTitle class="text-base font-semibold text-gray-900 dark:text-white">
                Change Status
              </DialogTitle>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Update the booking status for {{ booking.name }}.
              </p>
              <div class="mt-4 space-y-4">
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">New Status</label>
                  <select
                    v-model="statusForm.newStatus"
                    class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="" disabled>Select status...</option>
                    <option v-for="s in validStatuses" :key="s" :value="s">{{ s }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                  <textarea
                    v-model="statusForm.notes"
                    rows="3"
                    class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="Add a note about this status change..."
                  />
                </div>
              </div>
              <div class="mt-6 flex justify-end gap-2">
                <Button variant="subtle" label="Cancel" @click="showStatusModal = false" />
                <Button
                  variant="solid"
                  label="Update Status"
                  :loading="updateStatusResource.loading"
                  :disabled="!statusForm.newStatus"
                  @click="handleUpdateStatus"
                />
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </HDialog>
    </TransitionRoot>

    <!-- Reschedule Modal -->
    <TransitionRoot :show="showRescheduleModal" as="template">
      <HDialog class="relative z-50" @close="showRescheduleModal = false">
        <TransitionChild
          as="template"
          enter="duration-200 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-150 ease-in" leave-from="opacity-100" leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black/30 dark:bg-black/50" />
        </TransitionChild>
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="duration-200 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100"
            leave="duration-150 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
              <DialogTitle class="text-base font-semibold text-gray-900 dark:text-white">
                Reschedule Booking
              </DialogTitle>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Pick a new date and time for this booking.
              </p>
              <div class="mt-4 space-y-4">
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">New Date</label>
                  <input
                    v-model="rescheduleForm.newDate"
                    type="date"
                    class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">New Time</label>
                  <input
                    v-model="rescheduleForm.newTime"
                    type="time"
                    class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (optional)</label>
                  <textarea
                    v-model="rescheduleForm.reason"
                    rows="2"
                    class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="Reason for rescheduling..."
                  />
                </div>
              </div>
              <div class="mt-6 flex justify-end gap-2">
                <Button variant="subtle" label="Cancel" @click="showRescheduleModal = false" />
                <Button
                  variant="solid"
                  label="Reschedule"
                  :loading="rescheduleResource.loading"
                  :disabled="!rescheduleForm.newDate || !rescheduleForm.newTime"
                  @click="handleReschedule"
                />
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </HDialog>
    </TransitionRoot>

    <!-- Reassign Modal -->
    <TransitionRoot :show="showReassignModal" as="template">
      <HDialog class="relative z-50" @close="showReassignModal = false">
        <TransitionChild
          as="template"
          enter="duration-200 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-150 ease-in" leave-from="opacity-100" leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black/30 dark:bg-black/50" />
        </TransitionChild>
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="duration-200 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100"
            leave="duration-150 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
              <DialogTitle class="text-base font-semibold text-gray-900 dark:text-white">
                Reassign Booking
              </DialogTitle>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Select a team member to reassign this booking to.
              </p>
              <div class="mt-4 space-y-4">
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Assign To</label>
                  <select
                    v-model="reassignForm.newAssignedTo"
                    class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="" disabled>Select team member...</option>
                    <option
                      v-for="m in departmentMembers"
                      :key="m.user"
                      :value="m.user"
                    >
                      {{ m.full_name || m.user }}
                    </option>
                  </select>
                  <div v-if="membersResource.loading" class="mt-1 flex items-center gap-1 text-xs text-gray-400">
                    <LoadingSpinner size="sm" />
                    Loading members...
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (optional)</label>
                  <textarea
                    v-model="reassignForm.reason"
                    rows="2"
                    class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="Reason for reassignment..."
                  />
                </div>
              </div>
              <div class="mt-6 flex justify-end gap-2">
                <Button variant="subtle" label="Cancel" @click="showReassignModal = false" />
                <Button
                  variant="solid"
                  label="Reassign"
                  :loading="reassignResource.loading"
                  :disabled="!reassignForm.newAssignedTo"
                  @click="handleReassign"
                />
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </HDialog>
    </TransitionRoot>

    <!-- Cancel Confirmation Dialog -->
    <TransitionRoot :show="showCancelDialog" as="template">
      <HDialog class="relative z-50" @close="showCancelDialog = false">
        <TransitionChild
          as="template"
          enter="duration-200 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-150 ease-in" leave-from="opacity-100" leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black/30 dark:bg-black/50" />
        </TransitionChild>
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="duration-200 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100"
            leave="duration-150 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
              <div class="flex items-start gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <FeatherIcon name="alert-triangle" class="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <DialogTitle class="text-base font-semibold text-gray-900 dark:text-white">
                    Cancel Booking
                  </DialogTitle>
                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Are you sure you want to cancel <strong>{{ booking.name }}</strong>? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div class="mt-6 flex justify-end gap-2">
                <Button variant="subtle" label="Keep Booking" @click="showCancelDialog = false" />
                <Button
                  theme="red"
                  variant="solid"
                  label="Cancel Booking"
                  :loading="cancelResource.loading"
                  @click="handleCancel"
                />
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </HDialog>
    </TransitionRoot>
  </AppLayout>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createResource, toast } from 'frappe-ui'
import {
  Dialog as HDialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'
import AppLayout from '@/layouts/AppLayout.vue'
import StatusBadge from '@/components/shared/StatusBadge.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorState from '@/components/shared/ErrorState.vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  bookingId: String,
})

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// ---- Data fetching ----

const bookingResource = createResource({
  url: 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.get_booking_details',
  params: { booking_id: props.bookingId || route.params.bookingId },
  auto: true,
})

const data = computed(() => bookingResource.data)
const booking = computed(() => data.value?.booking || {})
const meetingType = computed(() => data.value?.meeting_type || {})
const department = computed(() => data.value?.department || {})
const customer = computed(() => data.value?.customer)
const hosts = computed(() => data.value?.hosts || [])
const internalParticipants = computed(() => data.value?.internal_participants || [])
const externalParticipants = computed(() => data.value?.external_participants || [])
const permissions = computed(() => data.value?.permissions || {})
const userContext = computed(() => data.value?.user_context || {})

// ---- Status options ----

const allStatuses = [
  'New Appointment',
  'New Booking',
  'Booking Started',
  'Sale Approved',
  'Booking Approved Not Sale',
  'Call Customer About Sale',
  'No Answer 1-3',
  'No Answer 4-5',
  'Customer Unsure',
  'No Contact About Offer',
  'Cancelled',
  'Optimising Not Possible',
  'Not Possible',
  'Rebook',
  'Rebook Earlier',
  'Consent Sent Awaiting',
]

const validStatuses = computed(() =>
  allStatuses.filter((s) => s !== booking.value.booking_status)
)

// ---- Formatting helpers ----

function formatDateTime(dt) {
  if (!dt) return '-'
  const d = new Date(dt)
  return d.toLocaleDateString('da-DK', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }) + ' ' + d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
}

function formatTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.split(/[\s@]+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

function attendanceClass(status) {
  const map = {
    Accepted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Declined: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Tentative: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  }
  return map[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

// ---- History / Timeline ----

const hasHistory = computed(() => {
  return (booking.value.assignment_history || booking.value.booking_history)
})

const timelineEntries = computed(() => {
  const entries = []

  // Parse assignment history (stored as text, each line is an entry)
  if (booking.value.assignment_history) {
    const lines = booking.value.assignment_history.split('\n').filter(Boolean)
    for (const line of lines) {
      entries.push({
        icon: 'user-plus',
        description: line.trim(),
        time: '',
      })
    }
  }

  // Parse booking history
  if (booking.value.booking_history) {
    const lines = booking.value.booking_history.split('\n').filter(Boolean)
    for (const line of lines) {
      entries.push({
        icon: 'clock',
        description: line.trim(),
        time: '',
      })
    }
  }

  return entries
})

// ---- Clipboard ----

async function copyToClipboard(text, label) {
  try {
    await navigator.clipboard.writeText(text)
    toast({ title: `${label} copied to clipboard`, icon: 'check' })
  } catch {
    // Fallback for older browsers
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    toast({ title: `${label} copied to clipboard`, icon: 'check' })
  }
}

// ---- Change Status ----

const showStatusModal = ref(false)
const statusForm = reactive({ newStatus: '', notes: '' })

const updateStatusResource = createResource({
  url: 'meeting_manager.meeting_manager.api.booking.update_booking_status',
  onSuccess(res) {
    if (res.success) {
      toast({ title: 'Status updated successfully', icon: 'check' })
      showStatusModal.value = false
      statusForm.newStatus = ''
      statusForm.notes = ''
      bookingResource.reload()
    } else {
      toast.error(res.message || 'Failed to update status')
    }
  },
  onError(err) {
    toast.error(err.messages?.[0] || err.message || 'Failed to update status')
  },
})

function handleUpdateStatus() {
  updateStatusResource.submit({
    booking_id: booking.value.name,
    new_status: statusForm.newStatus,
    notes: statusForm.notes || undefined,
  })
}

// ---- Reschedule ----

const showRescheduleModal = ref(false)
const rescheduleForm = reactive({ newDate: '', newTime: '', reason: '' })

// Pre-fill reschedule form with current date/time when modal opens
watch(showRescheduleModal, (val) => {
  if (val && booking.value.start_datetime) {
    const dt = new Date(booking.value.start_datetime)
    rescheduleForm.newDate = dt.toISOString().split('T')[0]
    rescheduleForm.newTime = dt.toTimeString().substring(0, 5)
  }
})

const rescheduleResource = createResource({
  url: 'meeting_manager.meeting_manager.api.booking.reschedule_booking_internal',
  onSuccess(res) {
    if (res.success) {
      toast({ title: 'Booking rescheduled successfully', icon: 'check' })
      showRescheduleModal.value = false
      rescheduleForm.newDate = ''
      rescheduleForm.newTime = ''
      rescheduleForm.reason = ''
      bookingResource.reload()
    } else {
      toast.error(res.message || 'Failed to reschedule')
    }
  },
  onError(err) {
    toast.error(err.messages?.[0] || err.message || 'Failed to reschedule')
  },
})

function handleReschedule() {
  rescheduleResource.submit({
    booking_id: booking.value.name,
    new_date: rescheduleForm.newDate,
    new_time: rescheduleForm.newTime,
    reason: rescheduleForm.reason || undefined,
  })
}

// ---- Reassign ----

const showReassignModal = ref(false)
const reassignForm = reactive({ newAssignedTo: '', reason: '' })
const departmentMembers = ref([])

const membersResource = createResource({
  url: 'meeting_manager.meeting_manager.api.booking.get_department_members',
  onSuccess(res) {
    departmentMembers.value = res || []
  },
})

function openReassignModal() {
  reassignForm.newAssignedTo = ''
  reassignForm.reason = ''
  showReassignModal.value = true
  if (department.value?.name) {
    membersResource.submit({ department: department.value.name })
  }
}

const reassignResource = createResource({
  url: 'meeting_manager.meeting_manager.api.booking.reassign_booking',
  onSuccess(res) {
    if (res.success) {
      toast({ title: 'Booking reassigned successfully', icon: 'check' })
      showReassignModal.value = false
      bookingResource.reload()
    } else {
      toast.error(res.message || 'Failed to reassign')
    }
  },
  onError(err) {
    toast.error(err.messages?.[0] || err.message || 'Failed to reassign')
  },
})

function handleReassign() {
  reassignResource.submit({
    booking_id: booking.value.name,
    new_assigned_to: reassignForm.newAssignedTo,
    reason: reassignForm.reason || undefined,
  })
}

// ---- Cancel ----

const showCancelDialog = ref(false)

const cancelResource = createResource({
  url: 'meeting_manager.meeting_manager.api.booking.update_booking_status',
  onSuccess(res) {
    if (res.success) {
      toast({ title: 'Booking cancelled', icon: 'check' })
      showCancelDialog.value = false
      bookingResource.reload()
    } else {
      toast.error(res.message || 'Failed to cancel booking')
    }
  },
  onError(err) {
    toast.error(err.messages?.[0] || err.message || 'Failed to cancel booking')
  },
})

function handleCancel() {
  cancelResource.submit({
    booking_id: booking.value.name,
    new_status: 'Cancelled',
    notes: 'Cancelled from booking detail page',
  })
}
</script>
