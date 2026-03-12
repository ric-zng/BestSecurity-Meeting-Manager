<template>
  <div class="flex h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Sidebar -->
    <aside
      class="flex w-56 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <!-- App header -->
      <div class="flex h-14 items-center gap-2 border-b border-gray-200 px-4 dark:border-gray-800">
        <div class="flex h-7 w-7 items-center justify-center rounded-md bg-gray-900 dark:bg-gray-100">
          <FeatherIcon name="calendar" class="h-4 w-4 text-white dark:text-gray-900" />
        </div>
        <span class="text-sm font-semibold text-gray-900 dark:text-white">Meeting Manager</span>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto px-3 py-3">
        <!-- Main section -->
        <div v-if="mainNavItems.length">
          <p class="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Main
          </p>
          <router-link
            v-for="item in mainNavItems"
            :key="item.to"
            :to="item.to"
            class="mb-0.5 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            active-class="!bg-gray-100 !text-gray-900 font-medium dark:!bg-gray-800 dark:!text-white"
          >
            <FeatherIcon :name="item.icon" class="h-4 w-4" />
            {{ item.label }}
          </router-link>
        </div>

        <!-- Management section -->
        <div v-if="adminNavItems.length" class="mt-4">
          <p class="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Management
          </p>
          <router-link
            v-for="item in adminNavItems"
            :key="item.to"
            :to="item.to"
            class="mb-0.5 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            active-class="!bg-gray-100 !text-gray-900 font-medium dark:!bg-gray-800 dark:!text-white"
          >
            <FeatherIcon :name="item.icon" class="h-4 w-4" />
            {{ item.label }}
          </router-link>
        </div>

        <!-- Personal section -->
        <div v-if="personalNavItems.length" class="mt-4">
          <p class="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Personal
          </p>
          <router-link
            v-for="item in personalNavItems"
            :key="item.to"
            :to="item.to"
            class="mb-0.5 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            active-class="!bg-gray-100 !text-gray-900 font-medium dark:!bg-gray-800 dark:!text-white"
          >
            <FeatherIcon :name="item.icon" class="h-4 w-4" />
            {{ item.label }}
          </router-link>
        </div>
      </nav>

      <!-- Footer: user info + dark mode toggle -->
      <div class="border-t border-gray-200 px-3 py-3 dark:border-gray-800">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 truncate">
            <div class="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              {{ initials }}
            </div>
            <div class="truncate">
              <p class="truncate text-xs font-medium text-gray-900 dark:text-white">
                {{ auth.fullName }}
              </p>
              <p class="truncate text-[10px] text-gray-500 dark:text-gray-400">
                {{ auth.userContext?.role_display }}
              </p>
            </div>
          </div>
          <button
            @click="toggleDark"
            class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <FeatherIcon :name="isDark ? 'sun' : 'moon'" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-auto">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useNavigation } from "@/composables/useNavigation";
import { useDarkMode } from "@/composables/useDarkMode";

const auth = useAuthStore();
const { mainNavItems, adminNavItems, personalNavItems } = useNavigation();
const { isDark, toggle: toggleDark } = useDarkMode();

const initials = computed(() => {
  const name = auth.fullName || auth.user || "";
  const parts = name.split(/[\s@]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
});

onMounted(async () => {
  if (!auth.isInitialized) {
    await auth.initialize();
  }
});
</script>
