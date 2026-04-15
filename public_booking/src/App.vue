<template>
  <PublicLayout>
    <RouterView v-slot="{ Component, route }">
      <transition name="fade" mode="out-in">
        <component :is="Component" :key="route.fullPath" />
      </transition>
    </RouterView>
  </PublicLayout>
</template>

<script setup>
import { RouterView } from "vue-router";
import PublicLayout from "@/components/PublicLayout.vue";
</script>
