<template>
  <div class="min-h-full bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button
            @click="router.push('/admin/departments')"
            class="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <FeatherIcon name="arrow-left" class="h-5 w-5" />
          </button>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ doc.doc?.department_name || 'Department' }}
              </h1>
              <span
                v-if="doc.doc"
                class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                :class="doc.doc.is_active
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'"
              >{{ doc.doc.is_active ? 'Active' : 'Inactive' }}</span>
            </div>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ id }}</p>
          </div>
        </div>
        <!-- Circular nav -->
        <div class="flex items-center gap-1">
          <Tooltip :text="prevId ? 'Previous' : 'No previous'">
            <button @click="goToPrevious" :disabled="!hasPrevious"
              class="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            ><FeatherIcon name="chevron-left" class="h-4 w-4" /></button>
          </Tooltip>
          <Tooltip :text="nextId ? 'Next' : 'No next'">
            <button @click="goToNext" :disabled="!hasNext"
              class="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            ><FeatherIcon name="chevron-right" class="h-4 w-4" /></button>
          </Tooltip>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-6">
      <LoadingSpinner v-if="doc.loading" />
      <ErrorState v-else-if="doc.error" :message="doc.error" @retry="doc.reload()" />

      <div v-else-if="doc.doc" class="grid gap-6 lg:grid-cols-3">
        <!-- Left column (2/3) -->
        <div class="space-y-6 lg:col-span-2">

          <!-- Basic Information -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Basic Information</h2>
              <transition name="fade">
                <button v-if="hasBasicChanges" @click="saveSection('basic')" :disabled="saving" class="dd-save-btn">
                  {{ saving ? 'Saving...' : 'Save' }}
                </button>
              </transition>
            </div>
            <div class="p-5">
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="dd-label">Department Name</label>
                  <input v-model="form.department_name" type="text" class="dd-input" />
                </div>
                <div>
                  <label class="dd-label">Slug</label>
                  <input v-model="form.department_slug" type="text" class="dd-input" />
                </div>
                <div class="sm:col-span-2">
                  <label class="dd-label">Description</label>
                  <textarea v-model="form.description" rows="3" class="dd-input" />
                </div>
              </div>
            </div>
          </div>

          <!-- Settings -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Settings</h2>
              <transition name="fade">
                <button v-if="hasSettingsChanges" @click="saveSection('settings')" :disabled="saving" class="dd-save-btn">
                  {{ saving ? 'Saving...' : 'Save' }}
                </button>
              </transition>
            </div>
            <div class="p-5">
              <div class="grid gap-4 sm:grid-cols-2">
                <!-- Timezone dropdown -->
                <div>
                  <label class="dd-label">Timezone</label>
                  <div class="relative" ref="tzDropdownRef">
                    <button @click="tzDropdownOpen = !tzDropdownOpen" type="button" class="dd-select">
                      <span>{{ form.timezone || 'Select timezone' }}</span>
                      <FeatherIcon name="chevron-down" class="h-4 w-4 shrink-0 text-gray-400 transition-transform" :class="tzDropdownOpen ? 'rotate-180' : ''" />
                    </button>
                    <div v-if="tzDropdownOpen" class="dd-dropdown">
                      <button
                        v-for="tz in TIMEZONES" :key="tz"
                        @click="form.timezone = tz; tzDropdownOpen = false"
                        class="dd-dropdown-item"
                        :class="form.timezone === tz ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''"
                      >{{ tz }}</button>
                    </div>
                  </div>
                </div>

                <!-- Assignment Algorithm dropdown -->
                <div>
                  <label class="dd-label">Assignment Algorithm</label>
                  <div class="relative" ref="algoDropdownRef">
                    <button @click="algoDropdownOpen = !algoDropdownOpen" type="button" class="dd-select">
                      <span>{{ form.assignment_algorithm }}</span>
                      <FeatherIcon name="chevron-down" class="h-4 w-4 shrink-0 text-gray-400 transition-transform" :class="algoDropdownOpen ? 'rotate-180' : ''" />
                    </button>
                    <div v-if="algoDropdownOpen" class="dd-dropdown">
                      <button
                        v-for="a in ['Round Robin', 'Least Busy']" :key="a"
                        @click="form.assignment_algorithm = a; algoDropdownOpen = false"
                        class="dd-dropdown-item"
                        :class="form.assignment_algorithm === a ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''"
                      >{{ a }}</button>
                    </div>
                  </div>
                </div>

                <!-- Department Leader search dropdown -->
                <div>
                  <label class="dd-label">Department Leader</label>
                  <div class="relative" ref="leaderDropdownRef">
                    <button @click="toggleLeaderDropdown" type="button" class="dd-select">
                      <span>{{ form.department_leader || 'Select leader' }}</span>
                      <FeatherIcon name="chevron-down" class="h-4 w-4 shrink-0 text-gray-400 transition-transform" :class="leaderDropdownOpen ? 'rotate-180' : ''" />
                    </button>
                    <div v-if="leaderDropdownOpen" class="dd-dropdown max-h-64 overflow-hidden">
                      <div class="sticky top-0 border-b border-gray-100 bg-white p-2 dark:border-gray-600 dark:bg-gray-700">
                        <input
                          ref="leaderSearchInput"
                          v-model="leaderSearch"
                          type="text"
                          placeholder="Search users..."
                          class="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-500 dark:bg-gray-600 dark:text-white dark:placeholder-gray-400"
                          @click.stop
                        />
                      </div>
                      <div class="max-h-48 overflow-auto">
                        <button
                          @click="form.department_leader = ''; leaderDropdownOpen = false"
                          class="dd-dropdown-item"
                          :class="!form.department_leader ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''"
                        >
                          <span class="text-gray-400 dark:text-gray-500">No leader</span>
                        </button>
                        <!-- Show members first -->
                        <div v-if="memberUsers.length" class="border-t border-gray-100 dark:border-gray-600">
                          <p class="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Department Members</p>
                          <button
                            v-for="u in filteredMemberUsers" :key="u"
                            @click="form.department_leader = u; leaderDropdownOpen = false"
                            class="dd-dropdown-item"
                            :class="form.department_leader === u ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''"
                          >{{ u }}</button>
                        </div>
                        <!-- All users from search -->
                        <div v-if="searchedUsers.length" class="border-t border-gray-100 dark:border-gray-600">
                          <p class="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">All Users</p>
                          <button
                            v-for="u in searchedUsers" :key="u.name"
                            @click="form.department_leader = u.name; leaderDropdownOpen = false"
                            class="dd-dropdown-item"
                            :class="form.department_leader === u.name ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''"
                          >
                            <span>{{ u.full_name || u.name }}</span>
                            <span v-if="u.full_name" class="ml-1 text-xs text-gray-400 dark:text-gray-500">{{ u.name }}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Checkboxes -->
                <div class="flex flex-wrap items-center gap-4 sm:col-span-2">
                  <label class="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    :class="form.is_active ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'">
                    <input v-model="form.is_active" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700" />
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white">Active</p>
                      <p class="text-[10px] text-gray-500 dark:text-gray-400">Can receive bookings</p>
                    </div>
                  </label>
                  <label class="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    :class="form.notify_leader_on_booking ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'">
                    <input v-model="form.notify_leader_on_booking" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700" />
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white">Notify Leader</p>
                      <p class="text-[10px] text-gray-500 dark:text-gray-400">On new bookings</p>
                    </div>
                  </label>
                  <label class="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    :class="form.notify_admin_on_booking ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'">
                    <input v-model="form.notify_admin_on_booking" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700" />
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white">Notify Admin</p>
                      <p class="text-[10px] text-gray-500 dark:text-gray-400">On new bookings</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Department Members -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
                Department Members
                <span class="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">({{ members.length }})</span>
              </h2>
              <div class="flex items-center gap-2">
                <transition name="fade">
                  <button v-if="hasMemberChanges" @click="saveSection('members')" :disabled="saving" class="dd-save-btn">
                    {{ saving ? 'Saving...' : 'Save Members' }}
                  </button>
                </transition>
                <button
                  @click="showAddMember = !showAddMember"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  <FeatherIcon name="user-plus" class="h-3.5 w-3.5" />
                  Add Member
                </button>
              </div>
            </div>

            <!-- Add member search -->
            <div v-if="showAddMember" class="border-b border-gray-100 bg-blue-50/50 px-5 py-3 dark:border-gray-700 dark:bg-blue-950/20">
              <div class="relative">
                <FeatherIcon name="search" class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  ref="memberSearchInput"
                  v-model="memberSearchQuery"
                  type="text"
                  placeholder="Search users by name or email..."
                  class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                  @input="searchUsers"
                />
                <!-- Search results dropdown -->
                <div v-if="memberSearchResults.length > 0" class="absolute left-0 top-full z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-700">
                  <button
                    v-for="u in memberSearchResults" :key="u.name"
                    @click="addMemberFromSearch(u)"
                    class="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    <div>
                      <span class="font-medium">{{ u.full_name || u.name }}</span>
                      <span v-if="u.full_name" class="ml-1.5 text-xs text-gray-400 dark:text-gray-500">{{ u.name }}</span>
                    </div>
                    <span v-if="isMemberAlready(u.name)" class="text-[10px] text-gray-400 dark:text-gray-500">Already added</span>
                    <FeatherIcon v-else name="plus" class="h-3.5 w-3.5 text-blue-500" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Members table -->
            <div v-if="members.length > 0">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 dark:border-gray-700">
                    <th class="bg-gray-50 px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Member</th>
                    <th class="bg-gray-50 px-5 py-2.5 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Status</th>
                    <th class="bg-gray-50 px-5 py-2.5 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Priority</th>
                    <th class="bg-gray-50 px-5 py-2.5 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Assignments</th>
                    <th class="bg-gray-50 px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Last Assigned</th>
                    <th class="w-16 bg-gray-50 px-5 py-2.5 dark:bg-gray-800/50"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                  <tr
                    v-for="(member, idx) in members"
                    :key="idx"
                    class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td class="px-5 py-3">
                      <div class="flex items-center gap-2.5">
                        <div class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
                          :class="member.is_active ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-600'">
                          {{ (member.member || '?')[0].toUpperCase() }}
                        </div>
                        <div>
                          <p class="font-medium text-gray-900 dark:text-white">{{ member.member }}</p>
                          <p v-if="form.department_leader === member.member" class="text-[10px] font-medium text-amber-600 dark:text-amber-400">Department Leader</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-5 py-3 text-center">
                      <button
                        @click="toggleMemberActive(idx)"
                        class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors"
                        :class="member.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'"
                      >
                        {{ member.is_active ? 'Active' : 'Inactive' }}
                      </button>
                    </td>
                    <td class="px-5 py-3 text-center">
                      <input
                        v-model.number="member.assignment_priority"
                        type="number"
                        min="1"
                        max="10"
                        class="w-14 rounded border border-gray-300 bg-white px-2 py-1 text-center text-xs text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </td>
                    <td class="px-5 py-3 text-center">
                      <span class="inline-flex min-w-[28px] items-center justify-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {{ member.total_assignments || 0 }}
                      </span>
                    </td>
                    <td class="px-5 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {{ member.last_assigned_datetime ? formatDate(member.last_assigned_datetime) : '—' }}
                    </td>
                    <td class="px-5 py-3 text-right">
                      <button
                        @click="confirmRemoveMember(idx, member.member)"
                        class="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        title="Remove member"
                      >
                        <FeatherIcon name="x" class="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="px-5 py-8">
              <EmptyState
                icon="users"
                title="No members yet"
                description="Add team members to this department"
              />
            </div>
          </div>

          <!-- Danger Zone -->
          <div class="rounded-lg border border-red-200 bg-white shadow-sm dark:border-red-900/50 dark:bg-gray-800">
            <div class="border-b border-red-100 px-5 py-3 dark:border-red-900/30">
              <h2 class="text-sm font-semibold text-red-700 dark:text-red-400">Danger Zone</h2>
            </div>
            <div class="flex items-center justify-between p-5">
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">Delete this department</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">This will permanently remove the department and all its member assignments.</p>
              </div>
              <button
                @click="showDeleteModal = true"
                class="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <FeatherIcon name="trash-2" class="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Right column (1/3) -->
        <div class="space-y-6">
          <!-- Metadata -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Details</h2>
            </div>
            <div class="divide-y divide-gray-100 dark:divide-gray-700">
              <div class="flex items-center justify-between px-5 py-2.5">
                <span class="text-xs text-gray-500 dark:text-gray-400">ID</span>
                <span class="text-xs font-medium text-gray-900 dark:text-white">{{ id }}</span>
              </div>
              <div class="flex items-center justify-between px-5 py-2.5">
                <span class="text-xs text-gray-500 dark:text-gray-400">Slug</span>
                <span class="text-xs font-medium text-gray-900 dark:text-white">{{ doc.doc?.department_slug }}</span>
              </div>
              <div class="flex items-center justify-between px-5 py-2.5">
                <span class="text-xs text-gray-500 dark:text-gray-400">Algorithm</span>
                <span class="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  {{ doc.doc?.assignment_algorithm || 'Round Robin' }}
                </span>
              </div>
              <div class="flex items-center justify-between px-5 py-2.5">
                <span class="text-xs text-gray-500 dark:text-gray-400">Timezone</span>
                <span class="text-xs font-medium text-gray-900 dark:text-white">{{ doc.doc?.timezone }}</span>
              </div>
              <div class="flex items-center justify-between px-5 py-2.5">
                <span class="text-xs text-gray-500 dark:text-gray-400">Leader</span>
                <span class="text-xs font-medium text-gray-900 dark:text-white">{{ doc.doc?.department_leader || '—' }}</span>
              </div>
              <div class="flex items-center justify-between px-5 py-2.5">
                <span class="text-xs text-gray-500 dark:text-gray-400">Members</span>
                <span class="text-xs font-medium text-gray-900 dark:text-white">{{ members.length }}</span>
              </div>
              <div class="flex items-center justify-between px-5 py-2.5">
                <span class="text-xs text-gray-500 dark:text-gray-400">Created by</span>
                <span class="text-xs font-medium text-gray-900 dark:text-white">{{ doc.doc?.owner }}</span>
              </div>
              <div class="flex items-center justify-between px-5 py-2.5">
                <span class="text-xs text-gray-500 dark:text-gray-400">Modified</span>
                <span class="text-xs font-medium text-gray-900 dark:text-white">{{ doc.doc?.modified ? formatDate(doc.doc.modified) : '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Public Booking URL -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Public Booking URL</h2>
            </div>
            <div class="p-5">
              <div class="flex items-center gap-2">
                <input
                  :value="doc.doc?.public_booking_url || 'Not generated yet'"
                  readonly
                  class="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                />
                <button
                  @click="copyUrl(doc.doc?.public_booking_url)"
                  :disabled="!doc.doc?.public_booking_url"
                  class="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
                  title="Copy URL"
                >
                  <FeatherIcon :name="copied ? 'check' : 'copy'" class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Stats -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Stats</h2>
            </div>
            <div class="grid grid-cols-2 gap-px bg-gray-100 dark:bg-gray-700">
              <div class="bg-white px-4 py-3 dark:bg-gray-800">
                <p class="text-lg font-bold text-gray-900 dark:text-white">{{ activeMemberCount }}</p>
                <p class="text-[10px] text-gray-500 dark:text-gray-400">Active Members</p>
              </div>
              <div class="bg-white px-4 py-3 dark:bg-gray-800">
                <p class="text-lg font-bold text-gray-900 dark:text-white">{{ totalAssignments }}</p>
                <p class="text-[10px] text-gray-500 dark:text-gray-400">Total Assignments</p>
              </div>
            </div>
          </div>

          <!-- Activity -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Activity</h2>
            </div>
            <div v-if="activityLoading" class="p-5 text-center text-xs text-gray-400">Loading...</div>
            <div v-else-if="activityItems.length === 0" class="p-5 text-center text-xs text-gray-400 dark:text-gray-500">No activity yet</div>
            <div v-else class="max-h-64 divide-y divide-gray-50 overflow-auto dark:divide-gray-700/50">
              <div v-for="(item, i) in activityItems" :key="i" class="px-5 py-2.5">
                <p class="text-xs text-gray-700 dark:text-gray-300">{{ item.description }}</p>
                <p class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">{{ item.owner }} &middot; {{ formatDate(item.creation) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      :show="showDeleteModal"
      title="Delete Department"
      :message="`Are you sure you want to delete '${doc.doc?.department_name}'? This action cannot be undone.`"
      confirm-label="Delete"
      loading-text="Deleting..."
      icon="trash-2"
      variant="danger"
      :loading="deleting"
      @confirm="deleteDepartment"
      @cancel="showDeleteModal = false"
    />

    <!-- Remove Member Confirmation Modal -->
    <ConfirmModal
      :show="removeMemberModal.show"
      title="Remove Member"
      :message="`Remove '${removeMemberModal.memberName}' from this department? They will lose access to department bookings.`"
      confirm-label="Remove"
      loading-text="Removing..."
      icon="user-minus"
      variant="danger"
      :loading="false"
      @confirm="executeRemoveMember"
      @cancel="removeMemberModal.show = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { createDocumentResource, call, Tooltip, toast } from 'frappe-ui'
import { useAuthStore } from '@/stores/auth'
import { useDepartmentNavigation } from '@/composables/useDepartmentNavigation'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import ErrorState from '@/components/shared/ErrorState.vue'
import ConfirmModal from '@/components/shared/ConfirmModal.vue'

const props = defineProps({ id: String })
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Copenhagen',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
]

// Navigation
const { loadDepartments, updateCurrentIndex, goToNext, goToPrevious, hasNext, hasPrevious, nextId, prevId } = useDepartmentNavigation()

// Document resource
const currentId = computed(() => route.params.id || props.id)

const doc = createDocumentResource({
  doctype: 'MM Department',
  name: currentId.value,
  auto: true,
})

// Watch for route changes (circular nav)
watch(() => route.params.id, (newId) => {
  if (newId && newId !== doc.name) {
    doc.name = newId
    doc.reload()
    updateCurrentIndex()
  }
})

// Form state
const form = reactive({
  department_name: '',
  department_slug: '',
  description: '',
  timezone: '',
  department_leader: '',
  assignment_algorithm: 'Round Robin',
  is_active: true,
  notify_leader_on_booking: false,
  notify_admin_on_booking: false,
})

const original = reactive({ ...form })

// Sync doc -> form on load
watch(() => doc.doc, (d) => {
  if (d) {
    const fields = {
      department_name: d.department_name || '',
      department_slug: d.department_slug || '',
      description: d.description || '',
      timezone: d.timezone || '',
      department_leader: d.department_leader || '',
      assignment_algorithm: d.assignment_algorithm || 'Round Robin',
      is_active: !!d.is_active,
      notify_leader_on_booking: !!d.notify_leader_on_booking,
      notify_admin_on_booking: !!d.notify_admin_on_booking,
    }
    Object.assign(form, fields)
    Object.assign(original, fields)
    originalMembersJson.value = JSON.stringify(d.department_members || [])
  }
}, { immediate: true })

// Members
const members = computed(() => doc.doc?.department_members || [])
const originalMembersJson = ref('[]')
const showAddMember = ref(false)
const memberSearchQuery = ref('')
const memberSearchResults = ref([])
const memberSearchInput = ref(null)
let memberSearchTimeout = null

const memberUsers = computed(() => members.value.map(m => m.member))

function isMemberAlready(email) {
  return memberUsers.value.includes(email)
}

async function searchUsers() {
  clearTimeout(memberSearchTimeout)
  memberSearchTimeout = setTimeout(async () => {
    if (!memberSearchQuery.value || memberSearchQuery.value.length < 2) {
      memberSearchResults.value = []
      return
    }
    try {
      const results = await call('frappe.client.get_list', {
        doctype: 'User',
        filters: {
          enabled: 1,
          user_type: 'System User',
          name: ['like', `%${memberSearchQuery.value}%`],
        },
        or_filters: {
          full_name: ['like', `%${memberSearchQuery.value}%`],
        },
        fields: ['name', 'full_name'],
        limit_page_length: 10,
      })
      memberSearchResults.value = results
    } catch {
      // Fallback: search by name only
      try {
        const results = await call('frappe.client.get_list', {
          doctype: 'User',
          filters: {
            enabled: 1,
            name: ['like', `%${memberSearchQuery.value}%`],
          },
          fields: ['name', 'full_name'],
          limit_page_length: 10,
        })
        memberSearchResults.value = results
      } catch {
        memberSearchResults.value = []
      }
    }
  }, 300)
}

function addMemberFromSearch(user) {
  if (isMemberAlready(user.name)) return
  if (!doc.doc.department_members) doc.doc.department_members = []
  doc.doc.department_members.push({
    member: user.name,
    is_active: 1,
    assignment_priority: 1,
    total_assignments: 0,
  })
  memberSearchQuery.value = ''
  memberSearchResults.value = []
}

// Remove member with confirmation
const removeMemberModal = ref({ show: false, idx: -1, memberName: '' })

function confirmRemoveMember(idx, memberName) {
  removeMemberModal.value = { show: true, idx, memberName }
}

function executeRemoveMember() {
  const idx = removeMemberModal.value.idx
  if (idx >= 0 && doc.doc.department_members) {
    doc.doc.department_members.splice(idx, 1)
  }
  removeMemberModal.value.show = false
}

function toggleMemberActive(idx) {
  const m = doc.doc.department_members[idx]
  m.is_active = m.is_active ? 0 : 1
}

// Change detection
const hasBasicChanges = computed(() =>
  form.department_name !== original.department_name ||
  form.department_slug !== original.department_slug ||
  form.description !== original.description
)

const hasSettingsChanges = computed(() =>
  form.timezone !== original.timezone ||
  form.assignment_algorithm !== original.assignment_algorithm ||
  form.department_leader !== original.department_leader ||
  form.is_active !== original.is_active ||
  form.notify_leader_on_booking !== original.notify_leader_on_booking ||
  form.notify_admin_on_booking !== original.notify_admin_on_booking
)

const hasMemberChanges = computed(() =>
  JSON.stringify(doc.doc?.department_members || []) !== originalMembersJson.value
)

// Dropdowns
const tzDropdownOpen = ref(false)
const tzDropdownRef = ref(null)
const algoDropdownOpen = ref(false)
const algoDropdownRef = ref(null)
const leaderDropdownOpen = ref(false)
const leaderDropdownRef = ref(null)
const leaderSearch = ref('')
const leaderSearchInput = ref(null)
const searchedUsers = ref([])
let leaderSearchTimeout = null

const filteredMemberUsers = computed(() => {
  if (!leaderSearch.value) return memberUsers.value
  const q = leaderSearch.value.toLowerCase()
  return memberUsers.value.filter(u => u.toLowerCase().includes(q))
})

watch(leaderSearch, (val) => {
  clearTimeout(leaderSearchTimeout)
  if (!val || val.length < 2) { searchedUsers.value = []; return }
  leaderSearchTimeout = setTimeout(async () => {
    try {
      searchedUsers.value = await call('frappe.client.get_list', {
        doctype: 'User',
        filters: { enabled: 1, name: ['like', `%${val}%`] },
        fields: ['name', 'full_name'],
        limit_page_length: 10,
      })
    } catch { searchedUsers.value = [] }
  }, 300)
})

function toggleLeaderDropdown() {
  leaderDropdownOpen.value = !leaderDropdownOpen.value
  if (leaderDropdownOpen.value) {
    nextTick(() => leaderSearchInput.value?.focus())
  }
}

// Click outside handler
function handleClickOutside(e) {
  if (tzDropdownRef.value && !tzDropdownRef.value.contains(e.target)) tzDropdownOpen.value = false
  if (algoDropdownRef.value && !algoDropdownRef.value.contains(e.target)) algoDropdownOpen.value = false
  if (leaderDropdownRef.value && !leaderDropdownRef.value.contains(e.target)) leaderDropdownOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  loadDepartments()
  fetchActivity()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Save
const saving = ref(false)

async function saveSection(section) {
  saving.value = true
  try {
    const payload = {}

    if (section === 'basic') {
      payload.department_name = form.department_name
      payload.department_slug = form.department_slug
      payload.description = form.description
    } else if (section === 'settings') {
      payload.timezone = form.timezone
      payload.assignment_algorithm = form.assignment_algorithm
      payload.department_leader = form.department_leader
      payload.is_active = form.is_active ? 1 : 0
      payload.notify_leader_on_booking = form.notify_leader_on_booking ? 1 : 0
      payload.notify_admin_on_booking = form.notify_admin_on_booking ? 1 : 0
    } else if (section === 'members') {
      payload.department_members = doc.doc.department_members || []
    }

    await doc.setValue.submit(payload)
    await doc.reload()
    toast({ title: 'Saved successfully', icon: 'check',  })
  } catch (e) {
    console.error('Failed to save:', e)
    toast({ title: 'Failed to save', icon: 'x',  })
  } finally {
    saving.value = false
  }
}

// Delete
const showDeleteModal = ref(false)
const deleting = ref(false)

async function deleteDepartment() {
  deleting.value = true
  try {
    await doc.delete.submit()
    toast({ title: 'Department deleted', icon: 'check',  })
    router.push('/admin/departments')
  } catch (e) {
    console.error('Failed to delete department:', e)
    toast({ title: 'Failed to delete', icon: 'x',  })
  } finally {
    deleting.value = false
  }
}

// Copy URL
const copied = ref(false)
function copyUrl(url) {
  if (!url) return
  navigator.clipboard.writeText(url)
  copied.value = true
  toast({ title: 'URL copied to clipboard', icon: 'check',  })
  setTimeout(() => { copied.value = false }, 2000)
}

// Stats
const activeMemberCount = computed(() => members.value.filter(m => m.is_active).length)
const totalAssignments = computed(() => members.value.reduce((sum, m) => sum + (m.total_assignments || 0), 0))

// Activity
const activityItems = ref([])
const activityLoading = ref(false)

async function fetchActivity() {
  activityLoading.value = true
  try {
    const versions = await call('frappe.client.get_list', {
      doctype: 'Version',
      filters: { ref_doctype: 'MM Department', docname: currentId.value },
      fields: ['data', 'owner', 'creation'],
      order_by: 'creation desc',
      limit_page_length: 20,
    })
    activityItems.value = versions.map(v => {
      let description = 'Updated department'
      try {
        const data = JSON.parse(v.data)
        if (data.changed?.length) {
          const fields = data.changed.map(c => c[0].replace(/_/g, ' ')).join(', ')
          description = `Changed ${fields}`
        }
      } catch {}
      return { description, owner: v.owner, creation: v.creation }
    })
  } catch {
    activityItems.value = []
  } finally {
    activityLoading.value = false
  }
}

// Format date
function formatDate(dt) {
  if (!dt) return '—'
  try {
    return new Date(dt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return dt }
}
</script>

<style scoped>
.dd-label {
  @apply mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400;
}
.dd-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500;
}
.dd-select {
  @apply flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-gray-500;
}
.dd-dropdown {
  @apply absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-700;
}
.dd-dropdown-item {
  @apply flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600;
}
.dd-save-btn {
  @apply cursor-pointer rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
