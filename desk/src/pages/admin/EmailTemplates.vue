<template>
  <div class="relative flex h-full flex-col bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-800">
      <div>
        <h1 class="text-lg font-semibold text-gray-900 dark:text-white">Email Templates</h1>
        <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{{ totalLabel }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="fetchTemplates"
          class="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          title="Reload"
        >
          <FeatherIcon name="refresh-cw" class="h-4 w-4" />
        </button>
        <button
          @click="openNewTemplate"
          class="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          <FeatherIcon name="plus" class="h-4 w-4" />
          New Template
        </button>
      </div>
    </div>

    <!-- Filters bar -->
    <div class="border-b border-gray-200 bg-white px-6 py-2.5 dark:border-gray-800 dark:bg-gray-800">
      <div class="flex flex-wrap items-center gap-2">
        <!-- Search -->
        <div class="relative min-w-[220px] flex-1 sm:max-w-sm">
          <FeatherIcon
            name="search"
            class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search templates..."
            class="h-8 w-full rounded-md border border-gray-300 bg-white pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        <!-- Email Type multi-select -->
        <MultiSelectDropdown
          :items="EMAIL_TYPE_ITEMS"
          :selected="selectedEmailTypes"
          all-label="All Email Types"
          value-field="value"
          label-field="label"
          color-field="color"
          @update:selected="selectedEmailTypes = $event; currentPage = 1"
        />

        <!-- Recipient multi-select -->
        <MultiSelectDropdown
          :items="RECIPIENT_ITEMS"
          :selected="selectedRecipients"
          all-label="All Recipients"
          value-field="value"
          label-field="label"
          @update:selected="selectedRecipients = $event; currentPage = 1"
        />

        <!-- Service Type multi-select -->
        <MultiSelectDropdown
          :items="SERVICE_ITEMS"
          :selected="selectedServices"
          all-label="All Service Types"
          value-field="value"
          label-field="label"
          @update:selected="selectedServices = $event; currentPage = 1"
        />

        <!-- Status filter -->
        <MultiSelectDropdown
          :items="STATUS_ITEMS"
          :selected="selectedStatuses"
          all-label="All Status"
          value-field="value"
          label-field="label"
          color-field="color"
          @update:selected="selectedStatuses = $event; currentPage = 1"
        />

        <!-- Clear filters -->
        <button
          v-if="hasActiveFilters"
          @click="clearAllFilters"
          class="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <FeatherIcon name="x" class="h-3 w-3" />
          Clear
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto bg-white dark:bg-gray-800">
      <LoadingSpinner v-if="loading && !rows.length" />

      <EmptyState
        v-else-if="!rows.length"
        icon="mail"
        title="No email templates found"
        :description="hasActiveFilters ? 'Try adjusting your filters' : 'Create your first email template'"
      >
        <template #action>
          <button
            v-if="!hasActiveFilters"
            @click="openNewTemplate"
            class="mt-3 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <FeatherIcon name="plus" class="h-4 w-4" />
            New Template
          </button>
          <button
            v-else
            @click="clearAllFilters"
            class="mt-3 inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Clear filters
          </button>
        </template>
      </EmptyState>

      <!-- Desktop table -->
      <div v-else class="hidden sm:block">
        <table class="w-full bg-white dark:bg-gray-800">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="w-10 bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
                <input
                  type="checkbox"
                  :checked="allVisibleSelected"
                  :indeterminate="someVisibleSelected && !allVisibleSelected"
                  @change="toggleSelectAll"
                  class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
              </th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Template Name</th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Email Type</th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Recipient</th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Service</th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Language</th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Priority</th>
              <th class="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">Status</th>
              <th class="w-10 bg-gray-50 px-4 py-3 dark:bg-gray-800/50"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="tpl in rows"
              :key="tpl.name"
              @click="goToTemplate(tpl.name)"
              class="cursor-pointer bg-white transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-800/50"
              :class="selectedRows.has(tpl.name) ? '!bg-blue-50 dark:!bg-blue-900/20' : ''"
            >
              <td class="px-4 py-3" @click.stop>
                <input
                  type="checkbox"
                  :checked="selectedRows.has(tpl.name)"
                  @change="toggleRowSelect(tpl.name)"
                  class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
              </td>
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900 dark:text-white">{{ tpl.template_name }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">{{ tpl.name }}</div>
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <span class="inline-flex rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                  {{ tpl.email_type || '-' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                {{ tpl.recipient_type || '-' }}
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                {{ tpl.service_type || '-' }}
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                {{ tpl.language || '-' }}
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                {{ tpl.priority ?? 0 }}
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="tpl.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'"
                >
                  {{ tpl.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right" @click.stop>
                <button
                  @click="goToTemplate(tpl.name)"
                  class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                >
                  <FeatherIcon name="chevron-right" class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile card view -->
      <div v-if="rows.length" class="space-y-2 p-4 sm:hidden">
        <div
          v-for="tpl in rows"
          :key="tpl.name"
          @click="goToTemplate(tpl.name)"
          class="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
          :class="selectedRows.has(tpl.name) ? '!border-blue-300 !bg-blue-50 dark:!border-blue-700 dark:!bg-blue-900/20' : ''"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ tpl.template_name }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ tpl.email_type }}</p>
            </div>
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              :class="tpl.is_active
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'"
            >
              {{ tpl.is_active ? 'Active' : 'Inactive' }}
            </span>
          </div>
          <div class="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span v-if="tpl.recipient_type">{{ tpl.recipient_type }}</span>
            <span v-if="tpl.service_type">{{ tpl.service_type }}</span>
            <span v-if="tpl.language">{{ tpl.language }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="rows.length"
      class="flex flex-col items-center justify-between gap-3 border-t border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-800 sm:flex-row"
    >
      <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span>Show</span>
        <select
          :value="pageLength"
          @change="changePageLength(Number($event.target.value))"
          class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
        </select>
        <span>per page</span>
      </div>
      <div class="flex items-center gap-1">
        <button @click="goToPage(1)" :disabled="currentPage <= 1" class="pg-btn"><FeatherIcon name="chevrons-left" class="h-4 w-4" /></button>
        <button @click="goToPage(currentPage - 1)" :disabled="currentPage <= 1" class="pg-btn"><FeatherIcon name="chevron-left" class="h-4 w-4" /></button>
        <span class="px-3 text-sm text-gray-700 dark:text-gray-300">Page {{ currentPage }} of {{ totalPages }}</span>
        <button @click="goToPage(currentPage + 1)" :disabled="currentPage >= totalPages" class="pg-btn"><FeatherIcon name="chevron-right" class="h-4 w-4" /></button>
        <button @click="goToPage(totalPages)" :disabled="currentPage >= totalPages" class="pg-btn"><FeatherIcon name="chevrons-right" class="h-4 w-4" /></button>
      </div>
    </div>

    <!-- Loading overlay -->
    <div
      v-if="loading && rows.length"
      class="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50"
    >
      <LoadingSpinner size="lg" />
    </div>

    <!-- Floating Bulk Action Bar -->
    <BulkActionBar
      :selected-count="selectedRows.size"
      :all-selected="allVisibleSelected"
      @select-all="selectAllRows"
      @deselect-all="deselectAllRows"
    >
      <template #actions>
        <Menu as="div" class="relative">
          <MenuButton class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
            <FeatherIcon name="more-horizontal" class="h-4 w-4" />
          </MenuButton>
          <MenuItems class="absolute bottom-full left-0 mb-1 w-48 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <MenuItem v-slot="{ active }">
              <button @click="bulkSetActive(true)" :class="active ? 'bg-gray-100 dark:bg-gray-700' : ''" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                <FeatherIcon name="check-circle" class="h-4 w-4" /> Activate
              </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
              <button @click="bulkSetActive(false)" :class="active ? 'bg-gray-100 dark:bg-gray-700' : ''" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                <FeatherIcon name="pause-circle" class="h-4 w-4" /> Deactivate
              </button>
            </MenuItem>
            <div class="my-1 border-t border-gray-200 dark:border-gray-700" />
            <MenuItem v-slot="{ active }">
              <button @click="confirmBulkDelete" :class="active ? 'bg-red-50 dark:bg-red-900/30' : ''" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 dark:text-red-400">
                <FeatherIcon name="trash-2" class="h-4 w-4" /> Delete
              </button>
            </MenuItem>
          </MenuItems>
        </Menu>
      </template>
    </BulkActionBar>

    <!-- Confirm Modal -->
    <ConfirmModal
      :show="confirmModal.show"
      :title="confirmModal.title"
      :message="confirmModal.message"
      :confirm-label="confirmModal.confirmLabel"
      :loading-text="confirmModal.loadingText"
      :icon="confirmModal.icon"
      :variant="confirmModal.variant"
      :loading="confirmModal.loading"
      @confirm="executeConfirmedAction"
      @cancel="confirmModal.show = false"
    />

    <!-- New Template Modal -->
    <teleport to="body">
      <div
        v-if="showNewModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showNewModal = false"
      >
        <div class="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">New Template</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Create a new email template</p>

          <div class="mt-4 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Template Name</label>
              <input
                v-model="newForm.template_name"
                type="text"
                placeholder="e.g. Customer - Booking Confirmation"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <!-- Email Type -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Type</label>
                <Listbox v-model="newForm.email_type" as="div" class="relative mt-1">
                  <ListboxButton class="relative w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-left text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white">
                    <span class="block truncate">{{ newForm.email_type || 'Select type' }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><FeatherIcon name="chevron-down" class="h-4 w-4 text-gray-400" /></span>
                  </ListboxButton>
                  <transition leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions class="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg focus:outline-none dark:border-gray-600 dark:bg-gray-900">
                      <ListboxOption v-for="et in EMAIL_TYPES" :key="et" :value="et" v-slot="{ active, selected }" as="template">
                        <li :class="[active ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300', 'relative cursor-pointer select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-medium' : 'font-normal', 'block truncate']">{{ et }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-blue-600 dark:text-blue-400', 'absolute inset-y-0 right-0 flex items-center pr-3']"><FeatherIcon name="check" class="h-4 w-4" /></span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </Listbox>
              </div>

              <!-- Recipient Type -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Recipient</label>
                <Listbox v-model="newForm.recipient_type" as="div" class="relative mt-1">
                  <ListboxButton class="relative w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-left text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white">
                    <span class="block truncate">{{ newForm.recipient_type || 'Select recipient' }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><FeatherIcon name="chevron-down" class="h-4 w-4 text-gray-400" /></span>
                  </ListboxButton>
                  <transition leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions class="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg focus:outline-none dark:border-gray-600 dark:bg-gray-900">
                      <ListboxOption v-for="r in RECIPIENT_TYPES" :key="r" :value="r" v-slot="{ active, selected }" as="template">
                        <li :class="[active ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300', 'relative cursor-pointer select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-medium' : 'font-normal', 'block truncate']">{{ r }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-blue-600 dark:text-blue-400', 'absolute inset-y-0 right-0 flex items-center pr-3']"><FeatherIcon name="check" class="h-4 w-4" /></span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </Listbox>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <!-- Service Type -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Service Type</label>
                <Listbox v-model="newForm.service_type" as="div" class="relative mt-1">
                  <ListboxButton class="relative w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-left text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white">
                    <span class="block truncate">{{ newForm.service_type || 'None' }}</span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><FeatherIcon name="chevron-down" class="h-4 w-4 text-gray-400" /></span>
                  </ListboxButton>
                  <transition leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <ListboxOptions class="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg focus:outline-none dark:border-gray-600 dark:bg-gray-900">
                      <ListboxOption value="" v-slot="{ active, selected }" as="template">
                        <li :class="[active ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300', 'relative cursor-pointer select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-medium' : 'font-normal', 'block truncate']">None</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-blue-600 dark:text-blue-400', 'absolute inset-y-0 right-0 flex items-center pr-3']"><FeatherIcon name="check" class="h-4 w-4" /></span>
                        </li>
                      </ListboxOption>
                      <ListboxOption v-for="s in SERVICE_TYPES" :key="s" :value="s" v-slot="{ active, selected }" as="template">
                        <li :class="[active ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300', 'relative cursor-pointer select-none py-2 pl-3 pr-9']">
                          <span :class="[selected ? 'font-medium' : 'font-normal', 'block truncate']">{{ s }}</span>
                          <span v-if="selected" :class="[active ? 'text-white' : 'text-blue-600 dark:text-blue-400', 'absolute inset-y-0 right-0 flex items-center pr-3']"><FeatherIcon name="check" class="h-4 w-4" /></span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </transition>
                </Listbox>
              </div>

              <!-- Language -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                <input
                  v-model="newForm.language"
                  type="text"
                  placeholder="en"
                  class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          <div class="mt-6 flex items-center justify-end gap-3">
            <button
              @click="showNewModal = false"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              @click="createTemplate"
              :disabled="creatingTemplate"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {{ creatingTemplate ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { call, toast } from 'frappe-ui'
import { Menu, MenuButton, MenuItem, MenuItems, Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/vue'
import { useAuthStore } from '@/stores/auth'
import MultiSelectDropdown from '@/components/calendar/MultiSelectDropdown.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import BulkActionBar from '@/components/shared/BulkActionBar.vue'
import ConfirmModal from '@/components/shared/ConfirmModal.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

// --- Constants ---
const EMAIL_TYPES = [
  'Booking Confirmation', 'Reschedule Confirmation', 'Reschedule Notification',
  'Reassignment Notification', 'Extension Notification', 'Cancellation',
  'Team Meeting Invitation', 'Reminder', 'Follow-up',
]

const RECIPIENT_TYPES = ['Customer', 'Host', 'Participant', 'Team Member']

const SERVICE_TYPES = [
  'Business', 'Business Extended', 'Business Rebook', 'New Setup Business',
  'Private / Business Customer', 'Private New Sale', 'Private Self Book',
  'Microsoft 365 Backup', 'Website Security',
]

const EMAIL_TYPE_ITEMS = EMAIL_TYPES.map(et => ({ value: et, label: et, color: '#6366f1' }))
const RECIPIENT_ITEMS = RECIPIENT_TYPES.map(r => ({ value: r, label: r }))
const SERVICE_ITEMS = SERVICE_TYPES.map(s => ({ value: s, label: s }))
const STATUS_ITEMS = [
  { value: 'Active', label: 'Active', color: '#22c55e' },
  { value: 'Inactive', label: 'Inactive', color: '#6b7280' },
]

// --- Filter state ---
const searchQuery = ref('')
const selectedEmailTypes = ref([])
const selectedRecipients = ref([])
const selectedServices = ref([])
const selectedStatuses = ref([])

// --- Pagination ---
const pageLength = ref(20)
const currentPage = ref(1)

// --- Data ---
const rows = ref([])
const totalCount = ref(0)
const loading = ref(false)

// --- Selection ---
const selectedRows = ref(new Set())

// --- Debounced search ---
let searchTimeout = null
const debouncedSearch = ref('')
watch(searchQuery, (val) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = val
    currentPage.value = 1
  }, 300)
})

// --- Computed ---
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageLength.value)))
const totalLabel = computed(() => {
  if (loading.value && !rows.value.length) return 'Loading...'
  const c = totalCount.value
  return `${c} template${c !== 1 ? 's' : ''}${hasActiveFilters.value ? ' (filtered)' : ''}`
})

const hasActiveFilters = computed(() => {
  return searchQuery.value || selectedEmailTypes.value.length > 0 || selectedRecipients.value.length > 0 || selectedServices.value.length > 0 || selectedStatuses.value.length > 0
})

const allVisibleSelected = computed(() => {
  if (!rows.value.length) return false
  return rows.value.every(r => selectedRows.value.has(r.name))
})
const someVisibleSelected = computed(() => {
  if (!rows.value.length) return false
  return rows.value.some(r => selectedRows.value.has(r.name))
})

// --- Fetch data ---
async function fetchTemplates() {
  loading.value = true
  try {
    const filters = buildFilters()
    const [listResult, countResult] = await Promise.all([
      call('frappe.client.get_list', {
        doctype: 'MM Email Template',
        fields: ['name', 'template_name', 'email_type', 'recipient_type', 'service_type', 'is_active', 'language', 'priority'],
        filters,
        order_by: 'template_name asc',
        limit_start: (currentPage.value - 1) * pageLength.value,
        limit_page_length: pageLength.value,
      }),
      call('frappe.client.get_count', {
        doctype: 'MM Email Template',
        filters,
      }),
    ])
    rows.value = listResult
    totalCount.value = countResult
  } catch (e) {
    console.error('Failed to fetch templates:', e)
    rows.value = []
    totalCount.value = 0
  } finally {
    loading.value = false
  }
}

function buildFilters() {
  const filters = {}
  if (debouncedSearch.value) {
    filters.template_name = ['like', `%${debouncedSearch.value}%`]
  }
  if (selectedEmailTypes.value.length) {
    filters.email_type = ['in', selectedEmailTypes.value]
  }
  if (selectedRecipients.value.length) {
    filters.recipient_type = ['in', selectedRecipients.value]
  }
  if (selectedServices.value.length) {
    filters.service_type = ['in', selectedServices.value]
  }
  if (selectedStatuses.value.length) {
    const vals = selectedStatuses.value.map(s => s === 'Active' ? 1 : 0)
    if (vals.length === 1) filters.is_active = vals[0]
  }
  return filters
}

// Watch filters and refetch
watch(
  [debouncedSearch, selectedEmailTypes, selectedRecipients, selectedServices, selectedStatuses, currentPage, pageLength],
  () => {
    fetchTemplates()
    writeUrlState()
  },
  { deep: true }
)

onMounted(() => {
  readUrlState()
  fetchTemplates()
})

onBeforeUnmount(() => clearTimeout(searchTimeout))

// --- URL sync ---
function readUrlState() {
  const q = route.query
  if (q.search) searchQuery.value = q.search
  if (q.types) selectedEmailTypes.value = q.types.split(',').filter(Boolean)
  if (q.recipients) selectedRecipients.value = q.recipients.split(',').filter(Boolean)
  if (q.services) selectedServices.value = q.services.split(',').filter(Boolean)
  if (q.statuses) selectedStatuses.value = q.statuses.split(',').filter(Boolean)
  if (q.page) currentPage.value = parseInt(q.page) || 1
  if (q.per_page) pageLength.value = parseInt(q.per_page) || 20
  if (q.search) debouncedSearch.value = q.search
}

function writeUrlState() {
  const q = {}
  if (debouncedSearch.value) q.search = debouncedSearch.value
  if (selectedEmailTypes.value.length) q.types = selectedEmailTypes.value.join(',')
  if (selectedRecipients.value.length) q.recipients = selectedRecipients.value.join(',')
  if (selectedServices.value.length) q.services = selectedServices.value.join(',')
  if (selectedStatuses.value.length) q.statuses = selectedStatuses.value.join(',')
  if (currentPage.value > 1) q.page = String(currentPage.value)
  if (pageLength.value !== 20) q.per_page = String(pageLength.value)
  router.replace({ query: q })
}

// --- Actions ---
function goToTemplate(name) {
  router.push(`/email-templates/${name}`)
}

function clearAllFilters() {
  searchQuery.value = ''
  debouncedSearch.value = ''
  selectedEmailTypes.value = []
  selectedRecipients.value = []
  selectedServices.value = []
  selectedStatuses.value = []
  currentPage.value = 1
}

function changePageLength(val) {
  pageLength.value = val
  currentPage.value = 1
}

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  selectedRows.value.clear()
}

// --- Selection ---
function toggleSelectAll() {
  if (allVisibleSelected.value) rows.value.forEach(r => selectedRows.value.delete(r.name))
  else rows.value.forEach(r => selectedRows.value.add(r.name))
}
function selectAllRows() { rows.value.forEach(r => selectedRows.value.add(r.name)) }
function deselectAllRows() { selectedRows.value.clear() }
function toggleRowSelect(name) {
  if (selectedRows.value.has(name)) selectedRows.value.delete(name)
  else selectedRows.value.add(name)
}

// --- Bulk Actions ---
async function bulkSetActive(active) {
  const count = selectedRows.value.size
  if (!count) return
  confirmModal.value = {
    show: true,
    title: active ? 'Activate Templates' : 'Deactivate Templates',
    message: `${active ? 'Activate' : 'Deactivate'} ${count} template${count > 1 ? 's' : ''}?`,
    confirmLabel: active ? 'Activate' : 'Deactivate',
    loadingText: 'Updating...',
    icon: active ? 'check-circle' : 'pause-circle',
    variant: 'primary',
    loading: false,
    action: 'toggle_active',
    payload: active,
  }
}

function confirmBulkDelete() {
  const count = selectedRows.value.size
  if (!count) return
  confirmModal.value = {
    show: true,
    title: 'Delete Templates',
    message: `Delete ${count} template${count > 1 ? 's' : ''}? This cannot be undone.`,
    confirmLabel: 'Delete',
    loadingText: 'Deleting...',
    icon: 'trash-2',
    variant: 'danger',
    loading: false,
    action: 'delete',
    payload: null,
  }
}

const confirmModal = ref({
  show: false, title: '', message: '', confirmLabel: '', loadingText: '',
  icon: 'alert-circle', variant: 'primary', loading: false, action: null, payload: null,
})

async function executeConfirmedAction() {
  const modal = confirmModal.value
  modal.loading = true
  const names = Array.from(selectedRows.value)
  try {
    if (modal.action === 'toggle_active') {
      let succeeded = 0, failed = 0
      for (const name of names) {
        try {
          await call('frappe.client.set_value', {
            doctype: 'MM Email Template', name,
            fieldname: 'is_active', value: modal.payload ? 1 : 0,
          })
          succeeded++
        } catch { failed++ }
      }
      const label = modal.payload ? 'activated' : 'deactivated'
      if (failed === 0) toast({ title: `${succeeded} template${succeeded > 1 ? 's' : ''} ${label}`, icon: 'check' })
      else toast({ title: `${succeeded} ${label}, ${failed} failed`, icon: 'x' })
    } else if (modal.action === 'delete') {
      let succeeded = 0, failed = 0
      for (const name of names) {
        try {
          await call('frappe.client.delete', { doctype: 'MM Email Template', name })
          succeeded++
        } catch { failed++ }
      }
      if (failed === 0) toast({ title: `${succeeded} template${succeeded > 1 ? 's' : ''} deleted`, icon: 'check' })
      else toast({ title: `${succeeded} deleted, ${failed} failed`, icon: 'x' })
    }
    selectedRows.value.clear()
    // Optimistic update
    if (modal.action === 'toggle_active') {
      const nameSet = new Set(names)
      rows.value = rows.value.map(r => nameSet.has(r.name) ? { ...r, is_active: modal.payload ? 1 : 0 } : r)
    } else if (modal.action === 'delete') {
      const nameSet = new Set(names)
      rows.value = rows.value.filter(r => !nameSet.has(r.name))
      totalCount.value = Math.max(0, totalCount.value - names.length)
    }
    modal.loading = false
    modal.show = false
    await fetchTemplates()
  } catch (e) {
    toast({ title: `Action failed: ${e.message || 'Unknown error'}`, icon: 'x' })
    modal.loading = false
    modal.show = false
  }
}

// --- New Template ---
const showNewModal = ref(false)
const creatingTemplate = ref(false)
const newForm = ref({
  template_name: '',
  email_type: '',
  recipient_type: '',
  service_type: '',
  language: 'en',
})

function openNewTemplate() {
  newForm.value = { template_name: '', email_type: '', recipient_type: '', service_type: '', language: 'en' }
  showNewModal.value = true
}

async function createTemplate() {
  if (!newForm.value.template_name || !newForm.value.email_type) return
  creatingTemplate.value = true
  try {
    const doc = await call('frappe.client.insert', {
      doc: {
        doctype: 'MM Email Template',
        template_name: newForm.value.template_name,
        email_type: newForm.value.email_type,
        recipient_type: newForm.value.recipient_type,
        service_type: newForm.value.service_type,
        language: newForm.value.language || 'en',
        is_active: 1,
      },
    })
    showNewModal.value = false
    router.push(`/email-templates/${doc.name}`)
  } catch (e) {
    console.error('Failed to create template:', e)
  } finally {
    creatingTemplate.value = false
  }
}
</script>

<style scoped>
.pg-btn {
  @apply rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800;
}
</style>
