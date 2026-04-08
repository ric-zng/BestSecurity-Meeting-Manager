<template>
  <div class="min-h-full bg-gray-50 dark:bg-gray-950">
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
              <div class="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-900" />
              <div class="h-4 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-900" />
              <div class="h-4 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-gray-900" />
            </div>
          </div>
        </div>
        <div class="space-y-6">
          <div v-for="i in 3" :key="i" class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <div class="h-5 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700 mb-4" />
            <div class="space-y-3">
              <div class="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-900" />
              <div class="h-4 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-gray-900" />
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
          <!-- Prev/Next Navigation -->
          <div class="flex items-center gap-1">
            <Tooltip :text="prevId ? `Previous: ${prevId}` : 'No previous booking'">
              <button
                @click="goToPrevious"
                :disabled="!hasPrevious"
                class="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <FeatherIcon name="chevron-left" class="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip :text="nextId ? `Next: ${nextId}` : 'No next booking'">
              <button
                @click="goToNext"
                :disabled="!hasNext"
                class="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <FeatherIcon name="chevron-right" class="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
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
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Booking Reference</dt>
                  <dd class="mt-0.5 text-sm font-mono text-gray-900 dark:text-white">
                    {{ booking.booking_reference || booking.name }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Meeting Type</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ meetingType?.meeting_name || meetingType?.name || '-' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Department</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ department?.department_name || '-' }}
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
                    {{ booking.duration_minutes ? booking.duration_minutes + ' minutes' : booking.duration ? booking.duration + ' minutes' : '-' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Location Type</dt>
                  <dd class="mt-0.5 text-sm capitalize text-gray-900 dark:text-white">
                    {{ booking.location_type || '-' }}
                  </dd>
                </div>
                <div v-if="booking.meeting_location">
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Location</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ booking.meeting_location }}
                  </dd>
                </div>
                <div v-if="booking.video_meeting_url" class="sm:col-span-2">
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
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Created</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ formatDateTime(booking.creation) }}
                    <span v-if="booking.created_by" class="text-xs text-gray-400 dark:text-gray-500">
                      by {{ booking.created_by }}
                    </span>
                  </dd>
                </div>
                <div v-if="booking.cancelled_at">
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Cancelled At</dt>
                  <dd class="mt-0.5 text-sm text-red-600 dark:text-red-400">
                    {{ formatDateTime(booking.cancelled_at) }}
                  </dd>
                </div>
                <div v-if="booking.cancellation_reason" class="sm:col-span-2">
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Cancellation Reason</dt>
                  <dd class="mt-0.5 whitespace-pre-wrap text-sm text-red-600 dark:text-red-400">
                    {{ booking.cancellation_reason }}
                  </dd>
                </div>
              </dl>
              <div v-if="booking.notes" class="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Description</dt>
                <dd class="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300" v-html="booking.notes"></dd>
              </div>
              <div v-if="booking.customer_notes" class="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Customer Notes</dt>
                <dd class="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{{ booking.customer_notes }}</dd>
              </div>
            </div>
          </div>

          <!-- Customer Card (non-internal only) -->
          <div
            v-if="!booking.is_internal && (customer || booking.customer_email_at_booking)"
            class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Customer</h2>
              <a
                v-if="customer?.name"
                :href="`/app/contact/${customer.name}`"
                target="_blank"
                class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
              >
                <FeatherIcon name="external-link" class="h-3 w-3" />
                View in Desk
              </a>
            </div>
            <div class="px-5 py-4">
              <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Full Name</dt>
                  <dd class="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
                    {{ customer?.customer_name || '-' }}
                  </dd>
                </div>
                <div v-if="customer?.company_name">
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Company</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ customer.company_name }}
                  </dd>
                </div>
                <div v-if="customer?.designation">
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Designation</dt>
                  <dd class="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {{ customer.designation }}
                  </dd>
                </div>
              </dl>

              <!-- Emails -->
              <div v-if="customer?.emails?.length" class="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                <dt class="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Email Addresses</dt>
                <div class="space-y-1.5">
                  <div v-for="(em, idx) in customer.emails" :key="idx" class="flex items-center gap-2">
                    <FeatherIcon name="mail" class="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
                    <span class="text-sm text-gray-900 dark:text-white">{{ em.email }}</span>
                    <span v-if="em.is_primary" class="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Primary</span>
                  </div>
                </div>
              </div>
              <div v-else-if="booking.customer_email_at_booking" class="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                <dt class="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Email (at booking)</dt>
                <div class="flex items-center gap-2">
                  <FeatherIcon name="mail" class="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
                  <span class="text-sm text-gray-900 dark:text-white">{{ booking.customer_email_at_booking }}</span>
                </div>
              </div>

              <!-- Phones -->
              <div v-if="customer?.phones?.length" class="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                <dt class="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Phone Numbers</dt>
                <div class="space-y-1.5">
                  <div v-for="(ph, idx) in customer.phones" :key="idx" class="flex items-center gap-2">
                    <FeatherIcon name="phone" class="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
                    <span class="text-sm text-gray-900 dark:text-white">{{ ph.phone }}</span>
                    <span v-if="ph.is_primary_phone" class="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Primary</span>
                    <span v-if="ph.is_primary_mobile" class="inline-flex items-center rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">Mobile</span>
                  </div>
                </div>
              </div>
              <div v-else-if="booking.customer_phone_at_booking" class="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                <dt class="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Phone (at booking)</dt>
                <div class="flex items-center gap-2">
                  <FeatherIcon name="phone" class="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
                  <span class="text-sm text-gray-900 dark:text-white">{{ booking.customer_phone_at_booking }}</span>
                </div>
              </div>

              <!-- References / Links -->
              <div v-if="customer?.links?.length" class="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                <dt class="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">References</dt>
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-gray-100 dark:border-gray-800">
                      <th class="pb-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Type</th>
                      <th class="pb-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Name</th>
                      <th class="pb-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Title</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
                    <tr v-for="(link, idx) in customer.links" :key="idx" class="group">
                      <td class="py-2 pr-3">
                        <span class="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {{ link.link_doctype }}
                        </span>
                      </td>
                      <td class="py-2 pr-3">
                        <a
                          :href="`/app/${link.link_doctype.toLowerCase().replace(/ /g, '-')}/${link.link_name}`"
                          target="_blank"
                          class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {{ link.link_name }}
                          <FeatherIcon name="external-link" class="h-2.5 w-2.5 opacity-0 group-hover:opacity-100" />
                        </a>
                      </td>
                      <td class="py-2 text-gray-700 dark:text-gray-300">
                        {{ link.link_title || '-' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Participants Card (internal meeting) -->
          <div
            v-if="booking.is_internal && internalParticipants.length"
            class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <!-- Header with summary -->
            <div class="px-5 py-3" :class="showParticipantsList ? 'border-b border-gray-100 dark:border-gray-800' : ''">
              <div class="flex items-center justify-between">
                <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
                  Participants
                  <span class="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">
                    ({{ internalParticipants.length }})
                  </span>
                </h2>
                <button
                  @click="showParticipantsList = !showParticipantsList"
                  class="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >{{ showParticipantsList ? 'Collapse' : 'Show all' }}</button>
              </div>

              <!-- Compact summary: stacked avatars + RSVP counts -->
              <div class="mt-2.5 flex items-center justify-between">
                <!-- Stacked avatars -->
                <div class="flex items-center">
                  <div class="flex -space-x-2">
                    <div
                      v-for="(p, idx) in internalParticipants.slice(0, 6)" :key="p.user"
                      class="relative flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-bold"
                      :class="avatarRingClass(p.response_status)"
                      :style="{ zIndex: internalParticipants.length - idx }"
                      :title="`${p.full_name || p.user} — ${p.response_status || 'Pending'}`"
                    >{{ getInitials(p.full_name || p.user) }}</div>
                    <div
                      v-if="internalParticipants.length > 6"
                      class="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-[10px] font-bold text-gray-600 dark:border-gray-800 dark:bg-gray-600 dark:text-gray-300"
                      :style="{ zIndex: 0 }"
                    >+{{ internalParticipants.length - 6 }}</div>
                  </div>
                </div>

                <!-- RSVP status counts -->
                <div class="flex items-center gap-2">
                  <span v-if="rsvpCounts.accepted" class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                    {{ rsvpCounts.accepted }}
                  </span>
                  <span v-if="rsvpCounts.tentative" class="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01"/></svg>
                    {{ rsvpCounts.tentative }}
                  </span>
                  <span v-if="rsvpCounts.declined" class="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                    {{ rsvpCounts.declined }}
                  </span>
                  <span v-if="rsvpCounts.pending" class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {{ rsvpCounts.pending }}
                  </span>
                </div>
              </div>
            </div>

            <!-- RSVP banner for current user if they're a participant and haven't accepted -->
            <div
              v-if="currentUserParticipant && currentUserParticipant.response_status !== 'Accepted'"
              class="border-t border-b border-gray-100 bg-blue-50 px-5 py-3 dark:border-gray-800 dark:bg-blue-900/20"
            >
              <p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">You've been invited to this meeting</p>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  @click="respondToMeeting('Accepted')"
                  :disabled="rsvpLoading"
                  class="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  Accept
                </button>
                <button
                  @click="respondToMeeting('Tentative')"
                  :disabled="rsvpLoading"
                  class="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-yellow-600 disabled:opacity-50"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Maybe
                </button>
                <button
                  @click="respondToMeeting('Declined')"
                  :disabled="rsvpLoading"
                  class="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  Decline
                </button>
              </div>
            </div>

            <!-- Already accepted banner -->
            <div
              v-else-if="currentUserParticipant && currentUserParticipant.response_status === 'Accepted'"
              class="flex items-center justify-between border-t border-b border-gray-100 bg-green-50 px-5 py-2.5 dark:border-gray-800 dark:bg-green-900/20"
            >
              <div class="flex items-center gap-2">
                <svg class="h-4 w-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <span class="text-sm font-medium text-green-700 dark:text-green-400">You accepted this meeting</span>
              </div>
              <div class="flex items-center gap-1.5">
                <button
                  @click="respondToMeeting('Tentative')"
                  :disabled="rsvpLoading"
                  class="cursor-pointer rounded px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                >Maybe</button>
                <button
                  @click="respondToMeeting('Declined')"
                  :disabled="rsvpLoading"
                  class="cursor-pointer rounded px-2 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                >Decline</button>
              </div>
            </div>

            <!-- Expanded participant list -->
            <ul v-if="showParticipantsList" class="divide-y divide-gray-100 dark:divide-gray-800">
              <li v-for="p in internalParticipants" :key="p.user" class="flex items-center justify-between px-5 py-2.5">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
                    :class="avatarBgClass(p.response_status)"
                  >{{ getInitials(p.full_name || p.user) }}</div>
                  <div>
                    <div class="flex items-center gap-1.5">
                      <p class="text-sm font-medium text-gray-900 dark:text-white">{{ p.full_name || p.user }}</p>
                      <span v-if="p.user === auth.user" class="text-[10px] font-medium text-gray-400 dark:text-gray-500">(You)</span>
                    </div>
                    <p v-if="p.email" class="text-xs text-gray-500 dark:text-gray-400">{{ p.email }}</p>
                  </div>
                </div>
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="attendanceClass(p.response_status)"
                >{{ p.response_status || 'Pending' }}</span>
              </li>
            </ul>
          </div>

          <!-- History/Timeline Card -->
          <div
            v-if="hasHistory"
            class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
                History
                <span class="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">({{ timelineEntries.length }})</span>
              </h2>
            </div>
            <div class="px-5 py-4">
              <ol class="relative border-l border-gray-200 dark:border-gray-700">
                <li v-for="(entry, idx) in visibleTimeline" :key="idx" class="mb-5 ml-6 last:mb-0">
                  <div
                    class="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full border border-white dark:border-gray-900"
                    :class="entry.iconBg || 'bg-gray-100 dark:bg-gray-700'"
                  >
                    <FeatherIcon :name="entry.icon" class="h-3 w-3" :class="entry.iconColor || 'text-gray-500 dark:text-gray-400'" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ entry.title }}</p>
                    <p v-if="entry.detail" class="mt-0.5 text-xs text-gray-600 dark:text-gray-300">{{ entry.detail }}</p>
                    <div class="mt-1 flex flex-wrap items-center gap-x-2">
                      <time v-if="entry.time" class="text-[11px] text-gray-500 dark:text-gray-400">{{ entry.time }}</time>
                      <span v-if="entry.by" class="text-[11px] text-gray-400 dark:text-gray-500">&middot; {{ entry.by }}</span>
                    </div>
                  </div>
                </li>
              </ol>
              <button
                v-if="timelineEntries.length > 5"
                @click="showAllHistory = !showAllHistory"
                class="mt-3 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {{ showAllHistory ? 'Show recent only' : `Show all (${timelineEntries.length})` }}
              </button>
            </div>
          </div>
        </div>

        <!-- Right column: sidebar-style action panels -->
        <div class="space-y-6">

          <!-- ═══ Status Section ═══ -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <div class="flex items-center justify-between">
                <h4 class="bd-label mb-0">Status</h4>
                <button
                  v-if="permissions.can_edit && !isFinalized"
                  @click="togglePanel('status')"
                  class="rounded px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  Change
                </button>
              </div>
              <div class="mt-2 flex items-center gap-2">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  :style="statusBadgeStyle"
                >
                  {{ booking.booking_status }}
                </span>
                <span v-if="booking.is_internal" class="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  Team
                </span>
              </div>
            </div>

            <!-- Inline status change -->
            <transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div v-if="activePanel === 'status'" class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
                <div class="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-950">
                  <div>
                    <label class="bd-label">New Status</label>
                    <div class="relative" ref="statusDropdownRef">
                      <button @click="statusDropdownOpen = !statusDropdownOpen" class="bd-select">
                        <span class="flex items-center gap-2">
                          <span v-if="statusForm.status" class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: getStatusColor(statusForm.status) }" />
                          <span :class="statusForm.status ? 'text-gray-900 dark:text-white' : 'text-gray-400'">
                            {{ statusForm.status || 'Select status...' }}
                          </span>
                        </span>
                        <svg class="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                      </button>
                      <transition enter-active-class="transition duration-100" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-75" leave-from-class="opacity-100" leave-to-class="opacity-0 scale-95">
                        <div v-if="statusDropdownOpen" class="bd-dropdown">
                          <button
                            v-for="s in BOOKING_STATUSES.filter(st => st !== booking.booking_status)"
                            :key="s"
                            @click="statusForm.status = s; statusDropdownOpen = false"
                            class="bd-dropdown-item"
                          >
                            <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: getStatusColor(s) }" />
                            <span>{{ s }}</span>
                          </button>
                        </div>
                      </transition>
                    </div>
                  </div>
                  <div>
                    <label class="bd-label">Notes (optional)</label>
                    <textarea
                      v-model="statusForm.notes"
                      rows="2"
                      placeholder="Add a note about this status change..."
                      class="bd-field resize-none"
                    />
                  </div>
                  <div class="flex gap-2">
                    <button @click="activePanel = null" class="bd-btn-secondary">Cancel</button>
                    <button
                      @click="changeStatus"
                      :disabled="!statusForm.status || actionLoading === 'status'"
                      class="bd-btn-primary"
                    >
                      {{ actionLoading === 'status' ? 'Saving...' : 'Update Status' }}
                    </button>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <!-- ═══ Schedule Section ═══ -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <div class="flex items-center justify-between">
                <h4 class="bd-label mb-0">Schedule</h4>
                <button
                  v-if="permissions.can_reschedule && !isFinalized"
                  @click="togglePanel('reschedule')"
                  class="rounded px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  Reschedule
                </button>
              </div>
              <div class="mt-2 space-y-1.5">
                <div class="flex items-center gap-2 text-sm">
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span class="text-gray-900 dark:text-white">{{ sidebarFormatDate(booking.start_datetime) }}</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="text-gray-900 dark:text-white">{{ formatTimeRange(booking.start_datetime, booking.end_datetime) }}</span>
                  <span class="text-xs text-gray-400">({{ booking.duration_minutes || booking.duration }} min)</span>
                </div>
              </div>
            </div>

            <!-- Inline reschedule form -->
            <transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div v-if="activePanel === 'reschedule'" class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
                <div class="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-950">
                  <!-- Mini calendar -->
                  <div class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <div class="mb-2 flex items-center justify-between">
                      <button @click="calChangeMonth(-1)" class="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                      </button>
                      <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ calMonthLabel }}</span>
                      <button @click="calChangeMonth(1)" class="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                      </button>
                    </div>
                    <div class="grid grid-cols-7 gap-0.5 text-center">
                      <div v-for="d in ['Mo','Tu','We','Th','Fr','Sa','Su']" :key="d" class="py-1 text-[10px] font-medium text-gray-400 dark:text-gray-500">{{ d }}</div>
                      <template v-for="(day, idx) in calDays" :key="idx">
                        <button
                          v-if="day.date"
                          @click="rescheduleForm.date = day.date"
                          class="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors"
                          :class="calDayClass(day)"
                        >{{ day.day }}</button>
                        <div v-else class="h-8 w-8" />
                      </template>
                    </div>
                    <div class="mt-2 flex items-center justify-between">
                      <button @click="calGoToday" class="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">Today</button>
                      <span v-if="rescheduleForm.date" class="text-xs text-gray-500 dark:text-gray-400">{{ sidebarFormatDate(rescheduleForm.date + 'T12:00:00') }}</span>
                    </div>
                  </div>

                  <!-- Time spinners -->
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="bd-label">Start Time</label>
                      <div class="flex items-center gap-1">
                        <button @click="adjustTime('start', -15)" class="time-btn">
                          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
                        </button>
                        <input
                          :value="rescheduleForm.startTime"
                          @change="onTimeInput('start', $event)"
                          class="time-input"
                          placeholder="HH:MM"
                          maxlength="5"
                        />
                        <button @click="adjustTime('start', 15)" class="time-btn">
                          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label class="bd-label">End Time</label>
                      <div class="flex items-center gap-1">
                        <button @click="adjustTime('end', -15)" class="time-btn">
                          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
                        </button>
                        <input
                          :value="rescheduleForm.endTime"
                          @change="onTimeInput('end', $event)"
                          class="time-input"
                          placeholder="HH:MM"
                          maxlength="5"
                        />
                        <button @click="adjustTime('end', 15)" class="time-btn">
                          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <p v-if="timeError" class="text-center text-[11px] font-medium text-red-500">{{ timeError }}</p>
                  <p v-else-if="rescheduleDuration" class="text-center text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    Duration: {{ rescheduleDuration }} min
                  </p>

                  <div class="flex gap-2">
                    <button @click="activePanel = null" class="bd-btn-secondary">Cancel</button>
                    <button
                      @click="rescheduleBooking"
                      :disabled="!rescheduleForm.date || !rescheduleForm.startTime || !rescheduleForm.endTime || !!timeError || actionLoading === 'reschedule'"
                      class="bd-btn-primary"
                    >
                      {{ actionLoading === 'reschedule' ? 'Saving...' : 'Save' }}
                    </button>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <!-- ═══ Service Section ═══ -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <div class="flex items-center justify-between">
                <h4 class="bd-label mb-0">Service</h4>
                <button
                  v-if="permissions.can_edit && !isFinalized"
                  @click="togglePanel('service')"
                  class="rounded px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  Change
                </button>
              </div>
              <p class="mt-1.5 text-sm text-gray-900 dark:text-white">{{ booking.service_type || 'Not set' }}</p>
            </div>

            <!-- Inline service change -->
            <transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div v-if="activePanel === 'service'" class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
                <div class="space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-950">
                  <div class="space-y-1">
                    <button
                      v-for="svc in SERVICE_TYPES"
                      :key="svc"
                      @click="serviceForm.value = svc"
                      class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors"
                      :class="serviceForm.value === svc
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'"
                    >
                      <svg v-if="serviceForm.value === svc" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                      <span v-else class="h-4 w-4 shrink-0" />
                      {{ svc }}
                    </button>
                  </div>
                  <div class="flex gap-2 pt-1">
                    <button @click="activePanel = null" class="bd-btn-secondary">Cancel</button>
                    <button
                      @click="changeService"
                      :disabled="!serviceForm.value || serviceForm.value === booking.service_type || actionLoading === 'service'"
                      class="bd-btn-primary"
                    >
                      {{ actionLoading === 'service' ? 'Saving...' : 'Update' }}
                    </button>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <!-- ═══ Hosts / Assigned To Section ═══ -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <div class="flex items-center justify-between">
                <h4 class="bd-label mb-0">Assigned To</h4>
                <button
                  v-if="permissions.can_reassign && !isFinalized && !booking.is_internal"
                  @click="openReassignPanel"
                  class="rounded px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  Reassign
                </button>
              </div>
            </div>
            <div class="px-5 py-3">
              <div class="space-y-2">
                <div v-for="h in hosts" :key="h.user" class="flex items-center gap-2.5">
                  <div
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                    :class="h.is_primary_host
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400'"
                  >
                    {{ getInitials(h.full_name || h.user) }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ h.full_name || h.user }}</p>
                    <p v-if="h.is_primary_host" class="text-[10px] text-blue-600 dark:text-blue-400">Primary host</p>
                  </div>
                </div>
                <p v-if="!hosts.length" class="text-sm text-gray-400 dark:text-gray-500">No hosts assigned</p>
              </div>
            </div>

            <!-- Inline reassign -->
            <transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div v-if="activePanel === 'reassign'" class="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
                <div class="space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-950">
                  <label class="bd-label">Assign to</label>
                  <div v-if="membersLoading" class="flex items-center gap-2 py-3 text-xs text-gray-400">
                    <div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                    Loading team members...
                  </div>
                  <div v-else-if="departmentMembers.length === 0" class="py-3 text-center text-xs text-gray-400">
                    No other team members available
                  </div>
                  <div v-else class="max-h-48 space-y-1 overflow-y-auto">
                    <button
                      v-for="m in departmentMembers"
                      :key="m.user_id"
                      @click="reassignForm.user = m.user_id"
                      class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors"
                      :class="reassignForm.user === m.user_id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'"
                    >
                      <div
                        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                        :class="reassignForm.user === m.user_id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'"
                      >
                        {{ m.full_name?.charAt(0)?.toUpperCase() || '?' }}
                      </div>
                      <span class="text-sm font-medium">{{ m.full_name || m.user_id }}</span>
                      <svg v-if="reassignForm.user === m.user_id" class="ml-auto h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    </button>
                  </div>
                  <div class="flex gap-2 pt-1">
                    <button @click="activePanel = null" class="bd-btn-secondary">Cancel</button>
                    <button
                      @click="reassignBooking"
                      :disabled="!reassignForm.user || actionLoading === 'reassign'"
                      class="bd-btn-primary"
                    >
                      {{ actionLoading === 'reassign' ? 'Saving...' : 'Reassign' }}
                    </button>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <!-- ═══ Cancel Section ═══ -->
          <div v-if="permissions.can_cancel && !isFinalized" class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div class="px-5 py-3">
              <button
                @click="togglePanel('cancel')"
                class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <FeatherIcon name="x-circle" class="h-4 w-4" />
                Cancel Booking
              </button>

              <!-- Cancel confirmation -->
              <transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                <div v-if="activePanel === 'cancel'" class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                  <p class="text-xs font-medium text-red-700 dark:text-red-400">
                    Cancel this booking? This cannot be undone.
                  </p>
                  <div>
                    <label class="bd-label mt-2">Notes (optional)</label>
                    <textarea
                      v-model="cancelNotes"
                      rows="2"
                      placeholder="Reason for cancellation..."
                      class="bd-field resize-none"
                    />
                  </div>
                  <div class="mt-2 flex gap-2">
                    <button @click="activePanel = null" class="bd-btn-secondary">Keep</button>
                    <button
                      @click="cancelBooking"
                      :disabled="actionLoading === 'cancel'"
                      class="flex-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 hover:bg-red-700 transition-colors"
                    >
                      {{ actionLoading === 'cancel' ? 'Cancelling...' : 'Confirm Cancel' }}
                    </button>
                  </div>
                </div>
              </transition>
            </div>
          </div>

          <!-- ═══ Send Reminder Section ═══ -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <div class="flex items-center justify-between">
                <h4 class="bd-label mb-0">Reminders</h4>
                <button
                  @click="togglePanel('reminder')"
                  class="rounded px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  Send Reminder
                </button>
              </div>
              <p v-if="booking.last_reminder_sent" class="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                Last sent: {{ formatDateTime(booking.last_reminder_sent) }}
              </p>
              <p v-else class="mt-1.5 text-xs text-gray-400 dark:text-gray-500">No reminders sent yet</p>
              <button @click="showReminderHelp = !showReminderHelp" class="mt-1 text-[11px] text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">
                {{ showReminderHelp ? 'Hide info' : 'How it works' }}
              </button>
              <transition enter-active-class="transition duration-150" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                <div v-if="showReminderHelp" class="mt-2 rounded-lg bg-blue-50 p-3 text-[11px] leading-relaxed text-gray-600 dark:bg-blue-900/20 dark:text-gray-400">
                  <p class="font-semibold text-gray-800 dark:text-gray-200">Manual Reminders</p>
                  <p>Click "Send Reminder" to choose who to notify (customer, hosts, participants) and optionally include a custom message. Each send is logged in the booking history.</p>
                  <p class="mt-2 font-semibold text-gray-800 dark:text-gray-200">Automated Reminders</p>
                  <p>If the meeting type has a reminder schedule configured (e.g. 24h and 1h before), the system automatically sends reminders at the right time. Configure these under Meeting Types &rarr; Reminder Schedule.</p>
                </div>
              </transition>
            </div>

            <!-- Inline reminder form -->
            <transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div v-if="activePanel === 'reminder'" class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
                <div class="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-950">
                  <div>
                    <label class="bd-label">Send to</label>
                    <div class="space-y-2">
                      <label v-if="!booking.is_internal" class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input type="checkbox" v-model="reminderForm.notifyCustomer" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900" />
                        Customer
                        <span v-if="reminderCustomerEmail" class="text-xs text-gray-400">({{ reminderCustomerEmail }})</span>
                      </label>
                      <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input type="checkbox" v-model="reminderForm.notifyHost" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900" />
                        Host(s)
                        <span v-if="hosts.length" class="text-xs text-gray-400">({{ hosts.length }})</span>
                      </label>
                      <label v-if="booking.is_internal && internalParticipants.length" class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input type="checkbox" v-model="reminderForm.notifyParticipants" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900" />
                        Participants
                        <span class="text-xs text-gray-400">({{ internalParticipants.length }})</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label class="bd-label">Message (optional)</label>
                    <textarea
                      v-model="reminderForm.message"
                      rows="2"
                      placeholder="Add a custom note to the reminder..."
                      class="bd-field resize-none"
                    />
                  </div>
                  <div class="flex gap-2">
                    <button @click="activePanel = null" class="bd-btn-secondary">Cancel</button>
                    <button
                      @click="sendReminder"
                      :disabled="!canSendReminder || actionLoading === 'reminder'"
                      class="bd-btn-primary"
                    >
                      {{ actionLoading === 'reminder' ? 'Sending...' : 'Send Reminder' }}
                    </button>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <!-- ═══ Customer Bookings Card ═══ -->
          <div
            v-if="!booking.is_internal && customerEmail"
            class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
                Customer Bookings
                <span v-if="customerBookings.length" class="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">
                  ({{ customerBookings.length }})
                </span>
              </h2>
            </div>
            <div v-if="customerBookingsLoading" class="flex items-center justify-center px-5 py-6">
              <svg class="h-4 w-4 animate-spin text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div v-else-if="customerBookings.length === 0" class="px-5 py-4 text-sm text-gray-400 dark:text-gray-500">
              No other bookings found for this customer.
            </div>
            <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800 max-h-72 overflow-y-auto">
              <li
                v-for="cb in customerBookings"
                :key="cb.name"
                class="group cursor-pointer px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                @click="router.push(`/bookings/${cb.name}`)"
              >
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {{ cb.meeting_title || cb.name }}
                  </p>
                  <StatusBadge :label="cb.booking_status" :status="cb.booking_status" size="xs" />
                </div>
                <div class="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>{{ formatShortDate(cb.start_datetime) }}</span>
                  <span v-if="cb.is_internal" class="text-gray-400 dark:text-gray-500">Internal</span>
                  <span v-if="cb.select_mkru" class="text-gray-400 dark:text-gray-500">{{ cb.select_mkru }}</span>
                </div>
              </li>
            </ul>
          </div>

          <!-- ═══ Links Card ═══ -->
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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createResource, call, toast, Tooltip } from 'frappe-ui'
import { useBookingNavigation } from '@/composables/useBookingNavigation'
import { getStatusColor, isFinalizedStatus, useCalendarState } from '@/composables/useCalendarState'
import StatusBadge from '@/components/shared/StatusBadge.vue'
import ErrorState from '@/components/shared/ErrorState.vue'
import { useAuthStore } from '@/stores/auth'

const API_BASE = 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api'
const BOOKING_API = 'meeting_manager.meeting_manager.api.booking'

const SERVICE_TYPES = [
  'Business',
  'Business Extended',
  'Business Rebook',
  'New Setup Business',
  'Private / Business Customer',
  'Private New Sale',
  'Private Self Book',
]

const { allStatuses } = useCalendarState()
const BOOKING_STATUSES = computed(() => allStatuses.value.map(s => s.value))

const props = defineProps({
  bookingId: String,
})

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// ---- Booking Navigation ----
const {
  loadBookings,
  updateCurrentIndex,
  goToNext,
  goToPrevious,
  hasNext,
  hasPrevious,
  nextId,
  prevId,
} = useBookingNavigation()

onMounted(() => {
  loadBookings()
})

watch(
  () => route.params.bookingId,
  () => {
    updateCurrentIndex()
  }
)

// ---- Data fetching ----

const currentBookingId = computed(() => props.bookingId || route.params.bookingId)

const bookingResource = createResource({
  url: 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.get_booking_details',
  params: { booking_id: currentBookingId.value },
  auto: true,
})

watch(currentBookingId, (newId) => {
  if (newId) {
    bookingResource.update({ params: { booking_id: newId } })
    bookingResource.fetch()
  }
})

const data = computed(() => bookingResource.data)
const booking = computed(() => data.value?.booking || {})
const meetingType = computed(() => data.value?.meeting_type || {})
const department = computed(() => data.value?.department || {})
const customer = computed(() => data.value?.customer)
const hosts = computed(() => data.value?.hosts || [])
const internalParticipants = computed(() => data.value?.internal_participants || [])
const currentUserParticipant = computed(() => {
  return internalParticipants.value.find(p => p.user === auth.user) || null
})
const rsvpLoading = ref(false)
const showParticipantsList = ref(false)

const rsvpCounts = computed(() => {
  const counts = { accepted: 0, declined: 0, tentative: 0, pending: 0 }
  for (const p of internalParticipants.value) {
    const s = (p.response_status || 'Pending').toLowerCase()
    if (s === 'accepted') counts.accepted++
    else if (s === 'declined') counts.declined++
    else if (s === 'tentative') counts.tentative++
    else counts.pending++
  }
  return counts
})

async function respondToMeeting(response) {
  rsvpLoading.value = true
  try {
    await call('meeting_manager.meeting_manager.api.booking.respond_to_meeting', {
      booking_id: booking.value.name,
      response,
    })
    toast.success(`Response updated to ${response}`)
    // Refresh booking data immediately
    await bookingResource.fetch()
  } catch (err) {
    toast.error(extractError(err, 'Failed to update response'))
  } finally {
    rsvpLoading.value = false
  }
}

const permissions = computed(() => data.value?.permissions || {})

const isFinalized = computed(() => {
  return isFinalizedStatus(booking.value?.booking_status || '')
})

const statusBadgeStyle = computed(() => {
  const color = getStatusColor(booking.value?.booking_status || '')
  return { backgroundColor: color + '1a', color }
})

// ---- Inline action panels ----

const activePanel = ref(null)
const actionLoading = ref(null)

// Status
const statusForm = ref({ status: '', notes: '' })
const statusDropdownOpen = ref(false)
const statusDropdownRef = ref(null)

// Reschedule
const rescheduleForm = ref({ date: '', startTime: '', endTime: '' })

// Service
const serviceForm = ref({ value: '' })

// Reassign
const reassignForm = ref({ user: '' })
const departmentMembers = ref([])
const membersLoading = ref(false)

// Cancel
const cancelNotes = ref('')

// Reminder
const reminderForm = ref({ notifyCustomer: true, notifyHost: false, notifyParticipants: false, message: '' })
const showReminderHelp = ref(false)
const NOTIFICATION_API = 'meeting_manager.meeting_manager.utils.email_notifications'

const reminderCustomerEmail = computed(() => {
  if (booking.value?.is_internal) return ''
  return customer.value?.primary_email || booking.value?.customer_email_at_booking || ''
})

const canSendReminder = computed(() => {
  return reminderForm.value.notifyCustomer || reminderForm.value.notifyHost || reminderForm.value.notifyParticipants
})

function togglePanel(panel) {
  if (activePanel.value === panel) {
    activePanel.value = null
  } else {
    activePanel.value = panel
    statusDropdownOpen.value = false
  }
}

// Click-outside for status dropdown
function handleClickOutside(e) {
  if (statusDropdownOpen.value && statusDropdownRef.value && !statusDropdownRef.value.contains(e.target)) {
    statusDropdownOpen.value = false
  }
}
onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', handleClickOutside))

// Pre-fill forms when panels open
watch(activePanel, (panel) => {
  if (panel === 'reschedule' && booking.value?.start_datetime) {
    const startDt = new Date(booking.value.start_datetime)
    const endDt = booking.value.end_datetime ? new Date(booking.value.end_datetime) : null
    rescheduleForm.value.date = toLocalDateStr(startDt)
    rescheduleForm.value.startTime = `${String(startDt.getHours()).padStart(2, '0')}:${String(startDt.getMinutes()).padStart(2, '0')}`
    rescheduleForm.value.endTime = endDt
      ? `${String(endDt.getHours()).padStart(2, '0')}:${String(endDt.getMinutes()).padStart(2, '0')}`
      : ''
    calViewMonth.value = startDt.getMonth()
    calViewYear.value = startDt.getFullYear()
  }
  if (panel === 'status') {
    statusForm.value = { status: '', notes: '' }
  }
  if (panel === 'service') {
    serviceForm.value.value = booking.value?.service_type || ''
  }
  if (panel === 'cancel') {
    cancelNotes.value = ''
  }
  if (panel === 'reminder') {
    reminderForm.value = {
      notifyCustomer: !booking.value?.is_internal,
      notifyHost: false,
      notifyParticipants: !!booking.value?.is_internal,
      message: '',
    }
  }
})

// ---- Error extraction helper ----
function extractError(err, fallback = 'Something went wrong') {
  // frappe-ui call() sets err.messages from _server_messages, falls back to ['Internal Server Error']
  if (err?.messages?.length) {
    // Filter out generic fallback messages to find the real one
    const real = err.messages.find(m =>
      typeof m === 'string' && m.trim() &&
      m !== 'Internal Server Error' &&
      !m.startsWith('frappe.exceptions.')
    )
    if (real) return real
  }
  // Parse the traceback in err.exc — the last line has "ExceptionType: Human message"
  if (err?.exc) {
    const lines = err.exc.trim().split('\n')
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim()
      // Match "frappe.exceptions.ValidationError: The actual message"
      const match = line.match(/(?:frappe\.exceptions\.\w+|[\w.]+Error|[\w.]+Exception):\s*(.+)/)
      if (match && match[1]) return match[1].trim()
    }
  }
  // Fallback to _error_message or exc_type
  if (err?._error_message) return err._error_message
  if (err?.exc_type) return err.exc_type.replace(/([A-Z])/g, ' $1').trim()
  // err.message from frappe-ui is "method exc_type _error_message" — try to extract meaningful part
  if (err?.message) {
    const msg = err.message
    // If it contains the exc_type, extract text after it
    if (err?.exc_type && msg.includes(err.exc_type)) {
      const after = msg.split(err.exc_type).pop()?.trim()
      if (after && after !== 'Internal Server Error') return after
    }
    if (msg !== 'Internal Server Error') return msg
  }
  return fallback
}

// ---- Actions ----

async function changeStatus() {
  actionLoading.value = 'status'
  const oldStatus = booking.value.booking_status
  const newStatus = statusForm.value.status
  try {
    const params = {
      booking_id: booking.value.name,
      new_status: newStatus,
    }
    if (statusForm.value.notes?.trim()) {
      params.notes = statusForm.value.notes.trim()
    }
    const res = await call(`${BOOKING_API}.update_booking_status`, params)
    if (res?.success) {
      if (bookingResource.data?.booking) {
        bookingResource.data.booking.booking_status = newStatus
      }
      activePanel.value = null
      toast.success(`Status updated: ${oldStatus} → ${newStatus}`)
      bookingResource.reload()
    } else {
      toast.error(res?.message || 'Failed to update status')
    }
  } catch (err) {
    toast.error(extractError(err, 'Failed to update status'))
  } finally {
    actionLoading.value = null
  }
}

async function rescheduleBooking() {
  actionLoading.value = 'reschedule'
  const oldStart = booking.value.start_datetime
  try {
    const newStartDt = `${rescheduleForm.value.date} ${rescheduleForm.value.startTime}:00`
    const newEndDt = `${rescheduleForm.value.date} ${rescheduleForm.value.endTime}:00`
    const res = await call(`${API_BASE}.update_calendar_booking`, {
      booking_id: booking.value.name,
      start_datetime: newStartDt,
      end_datetime: newEndDt,
    })
    if (res?.success) {
      if (bookingResource.data?.booking) {
        bookingResource.data.booking.start_datetime = newStartDt
        bookingResource.data.booking.end_datetime = newEndDt
      }
      activePanel.value = null
      const newDateLabel = sidebarFormatDate(newStartDt)
      const timeLabel = `${rescheduleForm.value.startTime} – ${rescheduleForm.value.endTime}`
      toast.success(`Rescheduled to ${newDateLabel}, ${timeLabel}`)
      bookingResource.reload()
    } else {
      toast.error(res?.message || 'Failed to reschedule')
    }
  } catch (err) {
    toast.error(extractError(err, 'Failed to reschedule'))
  } finally {
    actionLoading.value = null
  }
}

async function changeService() {
  actionLoading.value = 'service'
  const oldService = booking.value.service_type || 'Not set'
  const newService = serviceForm.value.value
  try {
    const res = await call(`${API_BASE}.update_calendar_booking`, {
      booking_id: booking.value.name,
      service_type: newService,
    })
    if (res?.success) {
      if (bookingResource.data?.booking) {
        bookingResource.data.booking.service_type = newService
      }
      activePanel.value = null
      toast.success(`Service updated: ${oldService} → ${newService}`)
      bookingResource.reload()
    } else {
      toast.error(res?.message || 'Failed to update service')
    }
  } catch (err) {
    toast.error(extractError(err, 'Failed to update service'))
  } finally {
    actionLoading.value = null
  }
}

async function openReassignPanel() {
  activePanel.value = 'reassign'
  statusDropdownOpen.value = false
  reassignForm.value.user = ''
  departmentMembers.value = []

  const deptName = department.value?.name
  if (deptName) {
    membersLoading.value = true
    try {
      const res = await call(`${BOOKING_API}.get_department_members`, {
        department: deptName,
      })
      const currentHostUsers = new Set((hosts.value || []).map((h) => h.user))
      departmentMembers.value = (res || []).filter(
        (m) => !currentHostUsers.has(m.user_id)
      )
    } catch (e) {
      console.error('Failed to load members:', e)
      departmentMembers.value = []
    } finally {
      membersLoading.value = false
    }
  } else {
    membersLoading.value = false
  }
}

async function reassignBooking() {
  actionLoading.value = 'reassign'
  const selectedMember = departmentMembers.value.find(m => m.user_id === reassignForm.value.user)
  const assigneeName = selectedMember?.full_name || reassignForm.value.user
  const oldHost = hosts.value.find(h => h.is_primary_host)?.full_name || 'Unassigned'
  try {
    const res = await call(`${BOOKING_API}.reassign_booking`, {
      booking_id: booking.value.name,
      new_assigned_to: reassignForm.value.user,
    })
    if (res?.success) {
      activePanel.value = null
      toast.success(`Reassigned: ${oldHost} → ${assigneeName}`)
      bookingResource.reload()
    } else {
      toast.error(res?.message || 'Failed to reassign')
    }
  } catch (err) {
    toast.error(extractError(err, 'Failed to reassign'))
  } finally {
    actionLoading.value = null
  }
}

async function cancelBooking() {
  actionLoading.value = 'cancel'
  const oldStatus = booking.value.booking_status
  try {
    const params = {
      booking_id: booking.value.name,
      new_status: 'Cancelled',
    }
    if (cancelNotes.value?.trim()) {
      params.notes = cancelNotes.value.trim()
    }
    const res = await call(`${BOOKING_API}.update_booking_status`, params)
    if (res?.success) {
      if (bookingResource.data?.booking) {
        bookingResource.data.booking.booking_status = 'Cancelled'
      }
      activePanel.value = null
      toast.success(`Booking cancelled: ${oldStatus} → Cancelled`)
      bookingResource.reload()
    } else {
      toast.error(res?.message || 'Failed to cancel')
    }
  } catch (err) {
    toast.error(extractError(err, 'Failed to cancel'))
  } finally {
    actionLoading.value = null
  }
}

async function sendReminder() {
  actionLoading.value = 'reminder'
  try {
    const res = await call(`${NOTIFICATION_API}.send_booking_reminder`, {
      booking_id: booking.value.name,
      notify_customer: reminderForm.value.notifyCustomer ? 1 : 0,
      notify_host: reminderForm.value.notifyHost ? 1 : 0,
      notify_participants: reminderForm.value.notifyParticipants ? 1 : 0,
      custom_message: reminderForm.value.message?.trim() || '',
    })
    if (res?.success && res.sent_count > 0) {
      activePanel.value = null
      reminderForm.value = { notifyCustomer: true, notifyHost: false, notifyParticipants: false, message: '' }
      toast.success(`Reminder sent to ${res.sent_count} recipient(s)`)
      bookingResource.reload()
    } else if (res?.success && res.sent_count === 0) {
      toast.error('No recipients found to send reminder to')
    } else {
      toast.error(res?.message || 'Failed to send reminder')
    }
  } catch (err) {
    toast.error(extractError(err, 'Failed to send reminder'))
  } finally {
    actionLoading.value = null
  }
}

// ---- Time adjustment (24hr, 15min steps) ----

function adjustTime(which, deltaMinutes) {
  const key = which === 'start' ? 'startTime' : 'endTime'
  const current = rescheduleForm.value[key]
  if (!current) return
  const [h, m] = current.split(':').map(Number)
  let total = h * 60 + m + deltaMinutes
  if (total < 0) total = 0
  if (total > 23 * 60 + 45) total = 23 * 60 + 45
  const nh = Math.floor(total / 60)
  const nm = total % 60
  rescheduleForm.value[key] = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

function onTimeInput(which, event) {
  const raw = event.target.value.trim()
  const key = which === 'start' ? 'startTime' : 'endTime'
  const match = raw.match(/^(\d{1,2}):?(\d{2})$/)
  if (!match) {
    event.target.value = rescheduleForm.value[key]
    return
  }
  let h = parseInt(match[1], 10)
  let m = parseInt(match[2], 10)
  if (h > 23) h = 23
  if (m > 59) m = 59
  rescheduleForm.value[key] = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const timeError = computed(() => {
  if (!rescheduleForm.value.startTime || !rescheduleForm.value.endTime) return null
  const [sh, sm] = rescheduleForm.value.startTime.split(':').map(Number)
  const [eh, em] = rescheduleForm.value.endTime.split(':').map(Number)
  const startMins = sh * 60 + sm
  const endMins = eh * 60 + em
  if (endMins <= startMins) return 'End time must be after start time'
  return null
})

const rescheduleDuration = computed(() => {
  if (!rescheduleForm.value.startTime || !rescheduleForm.value.endTime) return null
  const [sh, sm] = rescheduleForm.value.startTime.split(':').map(Number)
  const [eh, em] = rescheduleForm.value.endTime.split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return diff > 0 ? diff : null
})

// ---- Mini calendar ----

const calViewMonth = ref(new Date().getMonth())
const calViewYear = ref(new Date().getFullYear())

const calMonthLabel = computed(() => {
  const d = new Date(calViewYear.value, calViewMonth.value, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const calDays = computed(() => {
  const year = calViewYear.value
  const month = calViewMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7
  const daysInMonth = lastDay.getDate()
  const todayStr = toLocalDateStr(new Date())

  const days = []
  for (let i = 0; i < startDow; i++) days.push({ date: null, day: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ date: dateStr, day: d, isPast: dateStr < todayStr, isToday: dateStr === todayStr })
  }
  return days
})

function calDayClass(day) {
  if (rescheduleForm.value.date === day.date) return 'bg-blue-600 text-white font-semibold'
  if (day.isToday) return 'bg-blue-100 text-blue-700 font-semibold dark:bg-blue-900/40 dark:text-blue-400'
  if (day.isPast) return 'text-gray-300 dark:text-gray-600'
  return 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
}

function calChangeMonth(delta) {
  let m = calViewMonth.value + delta
  let y = calViewYear.value
  if (m > 11) { m = 0; y++ }
  if (m < 0) { m = 11; y-- }
  calViewMonth.value = m
  calViewYear.value = y
}

function calGoToday() {
  const now = new Date()
  calViewMonth.value = now.getMonth()
  calViewYear.value = now.getFullYear()
  rescheduleForm.value.date = toLocalDateStr(now)
}

function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---- Customer bookings ----

const customerEmail = computed(() => customer.value?.primary_email || booking.value.customer_email_at_booking || '')
const customerBookings = ref([])
const customerBookingsLoading = ref(false)

watch(customerEmail, async (email) => {
  customerBookings.value = []
  if (!email) return
  customerBookingsLoading.value = true
  try {
    const res = await call(
      'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.get_customer_bookings',
      { customer_email: email, exclude_booking: booking.value.name }
    )
    customerBookings.value = res || []
  } catch { customerBookings.value = [] }
  finally { customerBookingsLoading.value = false }
}, { immediate: true })

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

function sidebarFormatDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTimeRange(start, end) {
  if (!start) return ''
  const fmt = (d) => {
    const date = new Date(d)
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  return `${fmt(start)} – ${end ? fmt(end) : ''}`
}

function formatShortDate(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
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
  return map[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400'
}

function avatarRingClass(status) {
  const map = {
    Accepted: 'border-green-400 bg-green-100 text-green-700 dark:border-green-500 dark:bg-green-900/40 dark:text-green-300',
    Declined: 'border-red-400 bg-red-100 text-red-700 dark:border-red-500 dark:bg-red-900/40 dark:text-red-300',
    Tentative: 'border-yellow-400 bg-yellow-100 text-yellow-700 dark:border-yellow-500 dark:bg-yellow-900/40 dark:text-yellow-300',
  }
  return map[status] || 'border-gray-300 bg-gray-100 text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300'
}

function avatarBgClass(status) {
  const map = {
    Accepted: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    Declined: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    Tentative: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  }
  return map[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
}

// ---- History / Timeline ----

const showAllHistory = ref(false)

const hasHistory = computed(() => {
  const bh = booking.value.booking_history
  const ah = booking.value.assignment_history
  return (Array.isArray(bh) && bh.length > 0) || (Array.isArray(ah) && ah.length > 0)
})

const timelineEntries = computed(() => {
  const entries = []

  const ah = booking.value.assignment_history
  if (Array.isArray(ah)) {
    for (const entry of ah) {
      entries.push({
        icon: 'user-plus',
        iconBg: 'bg-blue-100 dark:bg-blue-900/40',
        iconColor: 'text-blue-600 dark:text-blue-400',
        title: entry.event_type || 'Assignment Change',
        detail: entry.description || null,
        time: entry.timestamp ? formatDateTime(entry.timestamp) : '',
        by: entry.changed_by || '',
        _ts: entry.timestamp,
      })
    }
  }

  const bh = booking.value.booking_history
  if (Array.isArray(bh)) {
    for (const entry of bh) {
      const eventType = entry.event_type || 'Update'
      // Use event_type as title, description as the detail line
      let title = eventType
      let detail = entry.description || null

      // Choose icon/color based on event type
      let icon = 'clock'
      let iconBg = 'bg-gray-100 dark:bg-gray-700'
      let iconColor = 'text-gray-500 dark:text-gray-400'

      const et = eventType.toLowerCase()
      if (et.includes('reminder')) {
        icon = 'bell'
        iconBg = 'bg-yellow-100 dark:bg-yellow-900/30'
        iconColor = 'text-yellow-600 dark:text-yellow-400'
      } else if (et.includes('cancel')) {
        icon = 'x-circle'
        iconBg = 'bg-red-100 dark:bg-red-900/30'
        iconColor = 'text-red-600 dark:text-red-400'
      } else if (et.includes('reschedule') || et.includes('date') || et.includes('time')) {
        icon = 'calendar'
        iconBg = 'bg-orange-100 dark:bg-orange-900/30'
        iconColor = 'text-orange-600 dark:text-orange-400'
      } else if (et.includes('status')) {
        icon = 'refresh-cw'
        iconBg = 'bg-purple-100 dark:bg-purple-900/30'
        iconColor = 'text-purple-600 dark:text-purple-400'
      } else if (et.includes('assign') || et.includes('reassign')) {
        icon = 'user-plus'
        iconBg = 'bg-blue-100 dark:bg-blue-900/40'
        iconColor = 'text-blue-600 dark:text-blue-400'
      } else if (et.includes('creat') || et.includes('book')) {
        icon = 'plus-circle'
        iconBg = 'bg-green-100 dark:bg-green-900/30'
        iconColor = 'text-green-600 dark:text-green-400'
      }

      entries.push({
        icon,
        iconBg,
        iconColor,
        title,
        detail,
        time: entry.timestamp ? formatDateTime(entry.timestamp) : '',
        by: entry.changed_by || '',
        _ts: entry.timestamp,
      })
    }
  }

  entries.sort((a, b) => {
    if (!a._ts && !b._ts) return 0
    if (!a._ts) return 1
    if (!b._ts) return -1
    return new Date(b._ts) - new Date(a._ts)
  })

  return entries
})

const visibleTimeline = computed(() => {
  if (showAllHistory.value) return timelineEntries.value
  return timelineEntries.value.slice(0, 5)
})

// ---- Clipboard ----

async function copyToClipboard(text, label) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    toast.success(`${label} copied to clipboard`)
  }
}
</script>

<style scoped>
.bd-field {
  @apply w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white;
}
.bd-label {
  @apply mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500;
}
.bd-btn-primary {
  @apply flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 hover:bg-blue-700 transition-colors;
}
.bd-btn-secondary {
  @apply flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors;
}
.bd-select {
  @apply flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm shadow-sm transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:hover:border-gray-500;
}
.bd-dropdown {
  @apply absolute left-0 right-0 z-10 mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900;
}
.bd-dropdown-item {
  @apply flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700;
}
.time-btn {
  @apply flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200;
}
.time-input {
  @apply w-full rounded-lg border border-gray-300 bg-white py-2 text-center text-sm font-semibold tabular-nums text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white;
}
</style>
