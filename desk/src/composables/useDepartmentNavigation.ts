import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { call } from "frappe-ui";

const departmentIds = ref<string[]>([]);
const currentIndex = ref(-1);
const isLoading = ref(false);

export function useDepartmentNavigation() {
  const router = useRouter();
  const route = useRoute();

  async function loadDepartments() {
    if (isLoading.value) return;
    isLoading.value = true;
    try {
      const result = await call("frappe.client.get_list", {
        doctype: "MM Department",
        fields: ["name"],
        order_by: "department_name asc",
        limit_page_length: 200,
      });
      departmentIds.value = result.map((r: { name: string }) => r.name);
      updateCurrentIndex();
    } finally {
      isLoading.value = false;
    }
  }

  function updateCurrentIndex() {
    const id = (route.params.id as string) || "";
    currentIndex.value = departmentIds.value.indexOf(id);
  }

  function goToNext() {
    if (departmentIds.value.length === 0) return;
    const nextIdx = (currentIndex.value + 1) % departmentIds.value.length;
    router.push(`/admin/departments/${departmentIds.value[nextIdx]}`);
  }

  function goToPrevious() {
    if (departmentIds.value.length === 0) return;
    const prevIdx =
      (currentIndex.value - 1 + departmentIds.value.length) %
      departmentIds.value.length;
    router.push(`/admin/departments/${departmentIds.value[prevIdx]}`);
  }

  const hasNext = computed(() => departmentIds.value.length > 1);
  const hasPrevious = computed(() => departmentIds.value.length > 1);

  const nextId = computed(() => {
    if (departmentIds.value.length <= 1) return null;
    const nextIdx = (currentIndex.value + 1) % departmentIds.value.length;
    return departmentIds.value[nextIdx];
  });

  const prevId = computed(() => {
    if (departmentIds.value.length <= 1) return null;
    const prevIdx =
      (currentIndex.value - 1 + departmentIds.value.length) %
      departmentIds.value.length;
    return departmentIds.value[prevIdx];
  });

  return {
    loadDepartments,
    updateCurrentIndex,
    goToNext,
    goToPrevious,
    hasNext,
    hasPrevious,
    nextId,
    prevId,
    isLoading,
  };
}
