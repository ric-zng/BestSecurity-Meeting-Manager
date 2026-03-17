<template>
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Status Colors</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure the colors used for booking statuses on the calendar and throughout the app.
        </p>
      </div>
      <button
        @click="showAddDialog = true"
        class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        + Add Status
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 6" :key="i" class="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
    </div>

    <!-- Status list -->
    <div v-else class="space-y-2">
      <div
        v-for="item in statusList"
        :key="item.name"
        class="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
      >
        <!-- Color swatch (clickable) -->
        <label class="relative cursor-pointer">
          <div
            class="h-8 w-8 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-200 dark:border-gray-800 dark:ring-gray-600"
            :style="{ backgroundColor: item.color }"
          />
          <input
            type="color"
            :value="item.color"
            class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            @change="updateColor(item, $event.target.value)"
          />
        </label>

        <!-- Status name -->
        <div class="flex-1">
          <span class="text-sm font-medium text-gray-900 dark:text-white">{{ item.status }}</span>
        </div>

        <!-- Color hex -->
        <code class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {{ item.color }}
        </code>

        <!-- Preview badge -->
        <span
          class="rounded-full px-2.5 py-0.5 text-xs font-medium"
          :style="{ backgroundColor: item.color + '26', color: item.color }"
        >
          {{ item.status }}
        </span>

        <!-- Active toggle -->
        <button
          @click="toggleActive(item)"
          class="rounded px-2 py-1 text-xs font-medium transition-colors"
          :class="item.is_active
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'"
        >
          {{ item.is_active ? 'Active' : 'Inactive' }}
        </button>

        <!-- Delete -->
        <button
          @click="deleteStatus(item)"
          class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <p v-if="statusList.length === 0" class="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        No status colors configured. Click "+ Add Status" to create one.
      </p>
    </div>

    <!-- Add Dialog -->
    <TransitionRoot :show="showAddDialog" as="template">
      <HDialog class="relative z-50" @close="showAddDialog = false">
        <TransitionChild as="template"
          enter="duration-200 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-150 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black/30 dark:bg-black/50" />
        </TransitionChild>
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild as="template"
            enter="duration-200 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100"
            leave="duration-150 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
              <DialogTitle class="text-base font-semibold text-gray-900 dark:text-white">Add Status Color</DialogTitle>
              <div class="mt-4 space-y-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status Name</label>
                  <input v-model="newStatus.name" type="text" placeholder="e.g. New Booking" class="fld" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                  <div class="flex items-center gap-3">
                    <input v-model="newStatus.color" type="color" class="h-10 w-14 cursor-pointer rounded border border-gray-300 dark:border-gray-600" />
                    <input v-model="newStatus.color" type="text" class="fld flex-1" placeholder="#1e40af" />
                  </div>
                </div>
              </div>
              <p v-if="addError" class="mt-2 text-xs text-red-500">{{ addError }}</p>
              <div class="mt-5 flex justify-end gap-2">
                <button class="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" @click="showAddDialog = false">Cancel</button>
                <button class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50" :disabled="saving" @click="addStatus">
                  {{ saving ? 'Saving...' : 'Add' }}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </HDialog>
    </TransitionRoot>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { call, toast } from 'frappe-ui'
import {
  Dialog as HDialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'

const loading = ref(true)
const statusList = ref([])
const showAddDialog = ref(false)
const newStatus = ref({ name: '', color: '#3b82f6' })
const addError = ref('')
const saving = ref(false)

async function fetchStatuses() {
  loading.value = true
  try {
    const res = await call('frappe.client.get_list', {
      doctype: 'MM Status Color',
      fields: ['name', 'status', 'color', 'is_active'],
      order_by: 'status asc',
      limit_page_length: 100,
    })
    statusList.value = res || []
  } catch { statusList.value = [] }
  finally { loading.value = false }
}

async function updateColor(item, newColor) {
  try {
    await call('frappe.client.set_value', {
      doctype: 'MM Status Color',
      name: item.name,
      fieldname: 'color',
      value: newColor,
    })
    item.color = newColor
    toast({ title: `Updated color for "${item.status}"`, icon: 'check' })
  } catch (err) {
    toast({ title: 'Failed to update color', icon: 'x' })
  }
}

async function toggleActive(item) {
  const newVal = item.is_active ? 0 : 1
  try {
    await call('frappe.client.set_value', {
      doctype: 'MM Status Color',
      name: item.name,
      fieldname: 'is_active',
      value: newVal,
    })
    item.is_active = newVal
  } catch {
    toast({ title: 'Failed to update', icon: 'x' })
  }
}

async function deleteStatus(item) {
  if (!confirm(`Delete status color for "${item.status}"?`)) return
  try {
    await call('frappe.client.delete', {
      doctype: 'MM Status Color',
      name: item.name,
    })
    statusList.value = statusList.value.filter(s => s.name !== item.name)
    toast({ title: `Deleted "${item.status}"`, icon: 'check' })
  } catch {
    toast({ title: 'Failed to delete', icon: 'x' })
  }
}

async function addStatus() {
  addError.value = ''
  if (!newStatus.value.name.trim()) { addError.value = 'Status name is required'; return }
  saving.value = true
  try {
    const doc = await call('frappe.client.insert', {
      doc: {
        doctype: 'MM Status Color',
        status: newStatus.value.name.trim(),
        color: newStatus.value.color,
        is_active: 1,
      },
    })
    statusList.value.push({
      name: doc.name,
      status: doc.status,
      color: doc.color,
      is_active: doc.is_active,
    })
    statusList.value.sort((a, b) => a.status.localeCompare(b.status))
    showAddDialog.value = false
    newStatus.value = { name: '', color: '#3b82f6' }
    toast({ title: `Added "${doc.status}"`, icon: 'check' })
  } catch (err) {
    addError.value = err.messages?.[0] || err.message || 'Failed to add status'
  }
  finally { saving.value = false }
}

onMounted(fetchStatuses)
</script>

<style scoped>
.fld { @apply w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500; }
</style>
