<template>
  <div class="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-800">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button @click="router.push('/admin/status-colors')" class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300">
            <FeatherIcon name="arrow-left" class="h-5 w-5" />
          </button>
          <div class="flex items-center gap-3">
            <div
              v-if="doc"
              class="h-8 w-8 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-200 dark:border-gray-700 dark:ring-gray-600"
              :style="{ backgroundColor: doc.color }"
            />
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-lg font-semibold text-gray-900 dark:text-white">{{ doc?.status || 'Loading...' }}</h1>
                <span v-if="doc?.is_active" class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
                <span v-else-if="doc" class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">Inactive</span>
              </div>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ currentId }}</p>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button v-if="hasPrevious" @click="goToPrevious" class="rounded-full border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700" :title="'Previous'">
            <FeatherIcon name="chevron-left" class="h-4 w-4" />
          </button>
          <button v-if="hasNext" @click="goToNext" class="rounded-full border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700" :title="'Next'">
            <FeatherIcon name="chevron-right" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="!doc" class="flex items-center justify-center py-24">
      <LoadingSpinner />
    </div>

    <!-- Content -->
    <div v-else class="mx-auto grid max-w-[1400px] gap-6 p-6 lg:grid-cols-3">
      <!-- Left column (2/3) -->
      <div class="space-y-6 lg:col-span-2">

        <!-- Status Information -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Status Information</h2>
            <button v-if="hasInfoChanges" @click="saveInfo" :disabled="savingInfo" class="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {{ savingInfo ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
          <div class="space-y-4 p-5">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="scd-label">Status Name</label>
                <input v-model="form.status" type="text" class="scd-input" />
              </div>
              <div>
                <label class="scd-label">Color</label>
                <div class="mt-1">
                  <ColorPicker v-model="form.color" />
                </div>
              </div>
            </div>
            <div class="flex items-center gap-6">
              <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input v-model="form.is_active" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700" />
                Active
              </label>
            </div>
            <!-- Preview -->
            <div>
              <label class="scd-label">Preview</label>
              <div class="mt-1 flex items-center gap-4">
                <div
                  class="h-10 w-10 rounded-full ring-1 ring-gray-200 dark:ring-gray-600"
                  :style="{ backgroundColor: form.color }"
                />
                <span
                  class="inline-flex rounded-full px-3 py-1 text-sm font-medium"
                  :style="{ backgroundColor: form.color + '26', color: form.color }"
                >
                  {{ form.status }}
                </span>
                <span
                  class="inline-flex rounded-md px-2.5 py-1 text-xs font-medium text-white"
                  :style="{ backgroundColor: form.color }"
                >
                  {{ form.status }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Bookings -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
              Recent Bookings
              <span v-if="bookingCount > 0" class="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">({{ bookingCount }} total)</span>
            </h2>
            <button
              v-if="bookings.length > 0"
              @click="router.push({ path: '/bookings', query: { status: doc.status } })"
              class="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View all →
            </button>
          </div>
          <div v-if="bookingsLoading" class="flex justify-center py-6"><LoadingSpinner /></div>
          <div v-else-if="!bookings.length" class="py-6 text-center text-sm text-gray-500 dark:text-gray-400">No bookings with this status</div>
          <div v-else>
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-100 dark:border-gray-700">
                  <th class="px-5 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Booking</th>
                  <th class="px-5 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Customer</th>
                  <th class="px-5 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
                <tr
                  v-for="b in bookings"
                  :key="b.name"
                  @click="router.push(`/bookings/${b.name}`)"
                  class="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td class="px-5 py-2.5">
                    <span class="font-medium text-gray-900 dark:text-white">{{ b.meeting_title || b.name }}</span>
                  </td>
                  <td class="px-5 py-2.5 text-gray-600 dark:text-gray-400">{{ b.customer || '—' }}</td>
                  <td class="px-5 py-2.5 text-gray-500 dark:text-gray-400">{{ formatDate(b.start_datetime) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Activity -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Activity</h2>
            <button v-if="activities.length > 5 && !showAllActivities" @click="showAllActivities = true" class="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              Show all ({{ activities.length }})
            </button>
          </div>
          <div v-if="activitiesLoading" class="flex justify-center py-6"><LoadingSpinner /></div>
          <div v-else-if="!activities.length" class="py-6 text-center text-sm text-gray-500 dark:text-gray-400">No activity recorded</div>
          <ul v-else class="divide-y divide-gray-100 dark:divide-gray-700">
            <li v-for="act in visibleActivities" :key="act.name" class="px-5 py-3">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-gray-900 dark:text-white">
                    <span class="font-medium">{{ act.owner_name || act.owner }}</span>
                    <span class="text-gray-500 dark:text-gray-400"> {{ act.action }}</span>
                  </p>
                  <ul v-if="act.changes?.length" class="mt-1 space-y-0.5">
                    <li v-for="(ch, i) in act.changes" :key="i" class="text-xs text-gray-500 dark:text-gray-400">
                      <span class="font-medium">{{ ch.field }}</span>: <span class="line-through text-red-400">{{ ch.old || '(empty)' }}</span> → <span class="text-green-500">{{ ch.new || '(empty)' }}</span>
                    </li>
                  </ul>
                </div>
                <span class="shrink-0 text-xs text-gray-400 dark:text-gray-500">{{ formatRelativeDate(act.creation) }}</span>
              </div>
            </li>
          </ul>
        </div>

        <!-- Danger Zone -->
        <div class="rounded-lg border border-red-200 bg-white shadow-sm dark:border-red-900/50 dark:bg-gray-800">
          <div class="border-b border-red-100 px-5 py-3 dark:border-red-900/30">
            <h2 class="text-sm font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
          </div>
          <div class="flex items-center justify-between p-5">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">Delete this status color</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">This will not affect existing bookings with this status.</p>
            </div>
            <button @click="showDeleteConfirm = true" class="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20">
              <FeatherIcon name="trash-2" class="mr-1 inline h-3 w-3" /> Delete
            </button>
          </div>
        </div>
      </div>

      <!-- Right column (1/3) -->
      <div class="space-y-6">
        <!-- Details Card -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Details</h2>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-gray-700">
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Status</span>
              <span class="text-xs font-medium text-gray-900 dark:text-white">{{ doc.status }}</span>
            </div>
            <div class="flex items-center justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Color</span>
              <div class="flex items-center gap-2">
                <div class="h-4 w-4 rounded-full" :style="{ backgroundColor: doc.color }" />
                <code class="text-xs text-gray-700 dark:text-gray-300">{{ doc.color }}</code>
              </div>
            </div>
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Active</span>
              <span class="text-xs font-medium" :class="doc.is_active ? 'text-green-600 dark:text-green-400' : 'text-gray-500'">{{ doc.is_active ? 'Yes' : 'No' }}</span>
            </div>
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Bookings</span>
              <span class="text-xs font-medium text-gray-900 dark:text-white">{{ bookingCount }}</span>
            </div>
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Created by</span>
              <span class="text-xs font-medium text-gray-900 dark:text-white">{{ doc.owner || '-' }}</span>
            </div>
            <div class="flex justify-between px-5 py-2.5">
              <span class="text-xs text-gray-500 dark:text-gray-400">Modified</span>
              <span class="text-xs font-medium text-gray-900 dark:text-white">{{ formatDate(doc.modified) }}</span>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Stats</h2>
          </div>
          <div class="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700">
            <div class="px-5 py-4 text-center">
              <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ bookingCount }}</div>
              <div class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Total Bookings</div>
            </div>
            <div class="px-5 py-4 text-center">
              <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ recentBookingCount }}</div>
              <div class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Last 30 Days</div>
            </div>
          </div>
        </div>

        <!-- Usage Info -->
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div class="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <h2 class="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
              <FeatherIcon name="info" class="h-3.5 w-3.5 text-gray-400" />
              About Status Colors
            </h2>
          </div>
          <div class="px-5 py-3">
            <p class="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              Status colors are used throughout the app to visually differentiate booking statuses on the calendar, in booking lists, and detail views.
            </p>
            <p class="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              The color is applied as a badge background (with transparency) and as calendar event indicators. Changing a color here will update it across the entire application.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirm -->
    <ConfirmModal
      :show="showDeleteConfirm"
      title="Delete Status Color"
      :message="`Delete '${doc?.status}'? This will not affect existing bookings.`"
      confirm-label="Delete"
      loading-text="Deleting..."
      icon="trash-2"
      variant="danger"
      :loading="deleting"
      @confirm="executeDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { call, toast } from 'frappe-ui'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ConfirmModal from '@/components/shared/ConfirmModal.vue'
import ColorPicker from '@/components/shared/ColorPicker.vue'

const props = defineProps({ id: String })
const router = useRouter()
const route = useRoute()

const currentId = computed(() => props.id || route.params.id)

// Document
const doc = ref(null)
const loading = ref(true)

async function loadDoc() {
  loading.value = true
  try {
    const result = await call('frappe.client.get', {
      doctype: 'MM Status Color',
      name: currentId.value,
    })
    doc.value = result
    syncFormFromDoc()
  } catch (e) {
    console.error('Failed to load status color:', e)
  } finally {
    loading.value = false
  }
}

watch(currentId, () => {
  loadDoc()
  loadBookings()
  loadActivities()
})

// Navigation
const allStatusIds = ref([])
const currentIndex = computed(() => allStatusIds.value.indexOf(currentId.value))
const hasPrevious = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value < allStatusIds.value.length - 1 && currentIndex.value >= 0)

function goToPrevious() {
  if (!hasPrevious.value) return
  const prevIdx = (currentIndex.value - 1 + allStatusIds.value.length) % allStatusIds.value.length
  router.push(`/admin/status-colors/${allStatusIds.value[prevIdx]}`)
}
function goToNext() {
  if (!hasNext.value) return
  const nextIdx = (currentIndex.value + 1) % allStatusIds.value.length
  router.push(`/admin/status-colors/${allStatusIds.value[nextIdx]}`)
}

async function loadNavigation() {
  try {
    const list = await call('frappe.client.get_list', {
      doctype: 'MM Status Color',
      fields: ['name'],
      order_by: 'status asc',
      limit_page_length: 0,
    })
    allStatusIds.value = list.map(r => r.name)
  } catch {}
}

// Form state
const form = reactive({ status: '', color: '#3b82f6', is_active: true })
const originalForm = reactive({})

function syncFormFromDoc() {
  if (!doc.value) return
  Object.assign(form, {
    status: doc.value.status || '',
    color: doc.value.color || '#3b82f6',
    is_active: !!doc.value.is_active,
  })
  Object.assign(originalForm, { ...form })
}

const hasInfoChanges = computed(() => JSON.stringify(form) !== JSON.stringify(originalForm))

// Save
const savingInfo = ref(false)

async function saveInfo() {
  savingInfo.value = true
  try {
    await call('frappe.client.set_value', {
      doctype: 'MM Status Color',
      name: currentId.value,
      fieldname: {
        status: form.status,
        color: form.color,
        is_active: form.is_active ? 1 : 0,
      },
    })
    await loadDoc()
    toast({ title: 'Saved successfully', icon: 'check' })
  } catch (e) {
    console.error(e)
    toast({ title: 'Failed to save', icon: 'x' })
  } finally {
    savingInfo.value = false
  }
}

// Bookings
const bookings = ref([])
const bookingCount = ref(0)
const recentBookingCount = ref(0)
const bookingsLoading = ref(false)

async function loadBookings() {
  bookingsLoading.value = true
  try {
    const statusName = currentId.value
    const [list, count, recentCount] = await Promise.all([
      call('frappe.client.get_list', {
        doctype: 'MM Meeting Booking',
        fields: ['name', 'meeting_title', 'customer', 'start_datetime', 'booking_status'],
        filters: { booking_status: statusName },
        order_by: 'start_datetime desc',
        limit_page_length: 10,
      }),
      call('frappe.client.get_count', {
        doctype: 'MM Meeting Booking',
        filters: { booking_status: statusName },
      }),
      call('frappe.client.get_count', {
        doctype: 'MM Meeting Booking',
        filters: {
          booking_status: statusName,
          creation: ['>=', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]],
        },
      }),
    ])
    bookings.value = list
    bookingCount.value = count
    recentBookingCount.value = recentCount
  } catch (e) {
    console.error('Failed to load bookings:', e)
  } finally {
    bookingsLoading.value = false
  }
}

// Activities
const activities = ref([])
const activitiesLoading = ref(false)
const showAllActivities = ref(false)
const visibleActivities = computed(() => showAllActivities.value ? activities.value : activities.value.slice(0, 5))

async function loadActivities() {
  activitiesLoading.value = true
  try {
    const versions = await call('frappe.client.get_list', {
      doctype: 'Version',
      filters: { ref_doctype: 'MM Status Color', docname: currentId.value },
      fields: ['name', 'owner', 'creation', 'data'],
      order_by: 'creation desc',
      limit_page_length: 30,
    })
    const parsed = []
    for (const v of versions) {
      let ownerName = v.owner
      try {
        const u = await call('frappe.client.get_value', { doctype: 'User', filters: { name: v.owner }, fieldname: 'full_name' })
        ownerName = u?.full_name || v.owner
      } catch {}
      let changes = []
      let action = 'made changes'
      try {
        const data = JSON.parse(v.data)
        if (data.changed?.length) {
          changes = data.changed.map(c => ({ field: c[0], old: String(c[1] || ''), new: String(c[2] || '') }))
          action = `changed ${changes.length} field${changes.length > 1 ? 's' : ''}`
        }
      } catch {}
      parsed.push({ name: v.name, owner: v.owner, owner_name: ownerName, creation: v.creation, action, changes })
    }
    activities.value = parsed
  } catch (e) { console.error(e) }
  finally { activitiesLoading.value = false }
}

// Delete
const showDeleteConfirm = ref(false)
const deleting = ref(false)

async function executeDelete() {
  deleting.value = true
  try {
    await call('frappe.client.delete', { doctype: 'MM Status Color', name: currentId.value })
    toast({ title: 'Status color deleted', icon: 'check' })
    router.push('/admin/status-colors')
  } catch (e) {
    toast({ title: 'Failed to delete', icon: 'x' })
  } finally {
    deleting.value = false
    showDeleteConfirm.value = false
  }
}

// Formatting
function formatDate(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatRelativeDate(dt) {
  if (!dt) return ''
  const diff = Date.now() - new Date(dt).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(dt)
}

onMounted(() => {
  loadDoc()
  loadBookings()
  loadActivities()
  loadNavigation()
})
</script>

<style scoped>
.scd-label {
  @apply mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400;
}
.scd-input {
  @apply mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500;
}
</style>
