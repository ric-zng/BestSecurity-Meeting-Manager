<template>
  <router-link
    :to="to"
    class="flex h-7 cursor-pointer items-center rounded pl-2 pr-1 text-gray-800 dark:text-gray-300 duration-300 ease-in-out"
    :class="[
      expanded ? 'w-full' : 'w-8 justify-center',
      isActive
        ? 'bg-white shadow-sm dark:bg-gray-800 dark:shadow-none font-medium text-gray-900 dark:text-white'
        : 'hover:bg-gray-200/60 dark:hover:bg-gray-800/60',
    ]"
    v-slot="{ isActive: active }"
  >
    <Tooltip :text="label" :disabled="expanded" placement="right">
      <span class="shrink-0" :class="isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'">
        <FeatherIcon :name="icon" class="h-4 w-4" />
      </span>
    </Tooltip>
    <span
      class="ml-2 shrink-0 text-sm duration-300 ease-in-out whitespace-nowrap"
      :class="expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden -z-50'"
    >
      {{ label }}
    </span>
  </router-link>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

const props = defineProps({
  to: { type: String, required: true },
  icon: { type: String, required: true },
  label: { type: String, required: true },
  expanded: { type: Boolean, default: true },
});

const route = useRoute();

const isActive = computed(() => {
  const currentPath = route.path;
  const targetPath = props.to;
  if (currentPath === targetPath) return true;
  if (targetPath !== "/" && targetPath !== "/calendar" && currentPath.startsWith(targetPath + "/")) return true;
  return false;
});
</script>
