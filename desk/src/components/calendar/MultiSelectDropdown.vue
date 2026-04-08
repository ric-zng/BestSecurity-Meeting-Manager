<template>
  <div class="relative" ref="rootRef">
    <button
      @click.stop="open = !open"
      class="flex h-8 items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-700"
    >
      <span class="max-w-[140px] truncate">{{ label }}</span>
      <FeatherIcon name="chevron-down" class="h-3 w-3 shrink-0" />
    </button>
    <div
      v-if="open"
      class="absolute right-0 z-50 mt-1 max-h-72 w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg dark:border-gray-700 dark:bg-gray-900"
    >
      <label
        v-for="item in items" :key="itemKey(item)"
        class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <input
          type="checkbox"
          :checked="selected.includes(itemKey(item))"
          @change="toggle(itemKey(item))"
          class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 dark:border-gray-600"
        />
        <span v-if="itemColor(item)" class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: itemColor(item) }" />
        <span class="text-gray-700 dark:text-gray-300">{{ itemLabel(item) }}</span>
      </label>
      <div class="mt-1 flex justify-between border-t border-gray-100 px-2 pt-1.5 dark:border-gray-700">
        <button @click="$emit('update:selected', allKeys)" class="text-xs text-blue-600 hover:underline dark:text-blue-400">Select All</button>
        <button @click="$emit('update:selected', [])" class="text-xs text-gray-500 hover:underline dark:text-gray-400">Clear</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { FeatherIcon } from 'frappe-ui'

const props = defineProps<{
  items: any[]
  selected: string[]
  allLabel: string
  valueField?: string
  labelField?: string
  colorField?: string
}>()

const emit = defineEmits<{ 'update:selected': [values: string[]] }>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const itemKey = (item: any) => typeof item === 'string' ? item : item[props.valueField || 'value']
const itemLabel = (item: any) => typeof item === 'string' ? item : item[props.labelField || 'label']
const itemColor = (item: any) => typeof item === 'string' ? null : item[props.colorField || 'color'] || null
const allKeys = computed(() => props.items.map(itemKey))

const label = computed(() => {
  if (!props.selected.length || props.selected.length === props.items.length) return props.allLabel
  if (props.selected.length === 1) return itemLabel(props.items.find(i => itemKey(i) === props.selected[0]) || props.selected[0])
  return `${props.selected.length} selected`
})

function toggle(key: string) {
  const current = [...props.selected]
  const idx = current.indexOf(key)
  if (idx >= 0) current.splice(idx, 1)
  else current.push(key)
  emit('update:selected', current)
}

function onOutsideClick(e: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('click', onOutsideClick))
onBeforeUnmount(() => document.removeEventListener('click', onOutsideClick))
</script>
