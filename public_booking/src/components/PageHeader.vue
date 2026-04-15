<template>
  <div class="mb-8 text-center">
    <p v-if="eyebrow" class="text-xs font-semibold uppercase tracking-wider text-brand-600">
      {{ eyebrow }}
    </p>
    <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">{{ title }}</h1>
    <p v-if="subtitle" class="mx-auto mt-3 max-w-xl text-base text-slate-500">
      {{ subtitle }}
    </p>
  </div>
</template>

<script setup>
defineProps({
  eyebrow: String,
  title: { type: String, required: true },
  subtitle: String,
});
</script>
