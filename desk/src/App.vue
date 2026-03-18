<template>
  <div class="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
    <!-- Sidebar -->
    <div
      class="flex select-none flex-col border-r border-gray-200 bg-gray-50 p-2 text-base duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900"
      :style="{ 'min-width': sidebarWidth, 'max-width': sidebarWidth }"
    >
      <!-- Brand / User Menu Popover -->
      <Popover v-slot="{ open }" class="relative">
        <PopoverButton
          class="flex h-12 w-full items-center rounded-md py-2 outline-none duration-300 ease-in-out"
          :class="sidebarExpanded
            ? 'px-1 hover:bg-gray-200 dark:hover:bg-gray-800'
            : 'px-0 justify-center'"
        >
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div
            class="flex flex-1 flex-col text-left duration-300 ease-in-out"
            :class="sidebarExpanded ? 'ml-2 w-auto opacity-100' : 'ml-0 w-0 overflow-hidden opacity-0'"
          >
            <div class="text-sm font-semibold leading-none text-gray-900 dark:text-white">Meeting Manager</div>
            <div class="mt-1 text-xs leading-none text-gray-600 dark:text-gray-400">{{ auth.fullName }}</div>
          </div>
          <div
            class="duration-300 ease-in-out"
            :class="sidebarExpanded ? 'ml-2 w-auto opacity-100' : 'ml-0 w-0 overflow-hidden opacity-0'"
          >
            <svg
              class="h-4 w-4 text-gray-500 transition-transform duration-200"
              :class="{ 'rotate-180': open }"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </PopoverButton>

        <transition
          enter-active-class="duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <PopoverPanel
            v-slot="{ close }"
            class="absolute left-0 top-full z-50 mt-1 w-56 origin-top-left rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            <!-- Apps link -->
            <a
              href="/apps"
              class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Apps
              <svg class="ml-auto h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>

            <!-- Desk link -->
            <a
              href="/app"
              class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Desk
            </a>

            <!-- Theme toggle -->
            <button
              @click="toggleDark(); close()"
              class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg v-if="isDark" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              {{ isDark ? 'Dark Mode' : 'Light Mode' }}
            </button>

            <!-- Divider -->
            <div class="my-1 border-t border-gray-200 dark:border-gray-700"></div>

            <!-- Log out -->
            <button
              @click="logout(); close()"
              class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Log out
            </button>
          </PopoverPanel>
        </transition>
      </Popover>

      <!-- Navigation -->
      <nav class="mt-2 flex flex-1 flex-col gap-0.5 overflow-y-auto hide-scrollbar">
        <!-- Main items -->
        <SidebarLink
          v-for="item in mainNavItems"
          :key="item.to"
          :to="item.to"
          :icon="item.icon"
          :label="item.label"
          :expanded="sidebarExpanded"
        />

        <!-- Management section -->
        <div v-if="adminNavItems.length" class="mt-4">
          <div
            class="mb-1 flex cursor-pointer items-center gap-1 px-1 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 duration-300"
            :class="{ 'opacity-0': !sidebarExpanded }"
          >
            Management
          </div>
          <SidebarLink
            v-for="item in adminNavItems"
            :key="item.to"
            :to="item.to"
            :icon="item.icon"
            :label="item.label"
            :expanded="sidebarExpanded"
          />
        </div>

        <!-- Personal section -->
        <div v-if="personalNavItems.length" class="mt-4">
          <div
            class="mb-1 flex cursor-pointer items-center gap-1 px-1 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 duration-300"
            :class="{ 'opacity-0': !sidebarExpanded }"
          >
            Personal
          </div>
          <SidebarLink
            v-for="item in personalNavItems"
            :key="item.to"
            :to="item.to"
            :icon="item.icon"
            :label="item.label"
            :expanded="sidebarExpanded"
          />
        </div>
      </nav>

      <!-- Theme toggle -->
      <button
        @click="toggleDark()"
        class="mt-1 flex h-7 items-center rounded px-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 duration-300 ease-in-out"
        :class="sidebarExpanded ? 'w-full' : 'w-8 justify-center'"
      >
        <svg v-if="isDark" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <svg v-else class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
        <span
          class="ml-2 text-sm duration-300 ease-in-out"
          :class="sidebarExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'"
        >{{ isDark ? 'Dark Mode' : 'Light Mode' }}</span>
      </button>

      <!-- Collapse toggle -->
      <button
        @click="sidebarExpanded = !sidebarExpanded"
        class="mt-1 flex h-7 items-center rounded px-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 duration-300 ease-in-out"
        :class="sidebarExpanded ? 'w-full' : 'w-8 justify-center'"
      >
        <svg
          class="h-4 w-4 shrink-0 duration-300"
          :class="{ 'rotate-180': !sidebarExpanded }"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
        <span
          class="ml-2 text-sm duration-300 ease-in-out"
          :class="sidebarExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'"
        >Collapse</span>
      </button>
    </div>

    <!-- Content area -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Page header slot -->
      <div id="app-header"></div>
      <!-- Page content -->
      <div class="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        <router-view />
      </div>
    </div>

    <!-- Toast notifications -->
    <AppToasts />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/vue";
import AppToasts from "@/components/shared/AppToasts.vue";
import { useAuthStore } from "@/stores/auth";
import { useNavigation } from "@/composables/useNavigation";
import { useDarkMode } from "@/composables/useDarkMode";
import SidebarLink from "@/components/SidebarLink.vue";

const auth = useAuthStore();
const { mainNavItems, adminNavItems, personalNavItems } = useNavigation();
const { isDark, toggle: toggleDark } = useDarkMode();

const sidebarExpanded = ref(
  localStorage.getItem("mm_sidebar_expanded") !== "false"
);

watch(sidebarExpanded, (val) => {
  localStorage.setItem("mm_sidebar_expanded", String(val));
});

const sidebarWidth = computed(() => sidebarExpanded.value ? "224px" : "50px");

function logout() {
  window.location.href = "/api/method/logout";
}

onMounted(async () => {
  if (!auth.isInitialized) {
    await auth.initialize();
  }
});
</script>
