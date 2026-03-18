import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { call } from "frappe-ui";

const templateIds = ref<string[]>([]);
const currentIndex = ref(-1);
const isLoading = ref(false);

export function useEmailTemplateNavigation() {
  const router = useRouter();
  const route = useRoute();

  async function loadTemplates() {
    if (isLoading.value) return;
    isLoading.value = true;
    try {
      const result = await call("frappe.client.get_list", {
        doctype: "MM Email Template",
        fields: ["name"],
        order_by: "template_name asc",
        limit_page_length: 200,
      });
      templateIds.value = result.map((r: { name: string }) => r.name);
      updateCurrentIndex();
    } finally {
      isLoading.value = false;
    }
  }

  function updateCurrentIndex() {
    const id = (route.params.id as string) || "";
    currentIndex.value = templateIds.value.indexOf(id);
  }

  function goToNext() {
    if (templateIds.value.length === 0) return;
    const nextIdx = (currentIndex.value + 1) % templateIds.value.length;
    router.push(`/email-templates/${templateIds.value[nextIdx]}`);
  }

  function goToPrevious() {
    if (templateIds.value.length === 0) return;
    const prevIdx =
      (currentIndex.value - 1 + templateIds.value.length) %
      templateIds.value.length;
    router.push(`/email-templates/${templateIds.value[prevIdx]}`);
  }

  const hasNext = computed(() => templateIds.value.length > 1);
  const hasPrevious = computed(() => templateIds.value.length > 1);

  const nextId = computed(() => {
    if (templateIds.value.length <= 1) return null;
    const nextIdx = (currentIndex.value + 1) % templateIds.value.length;
    return templateIds.value[nextIdx];
  });

  const prevId = computed(() => {
    if (templateIds.value.length <= 1) return null;
    const prevIdx =
      (currentIndex.value - 1 + templateIds.value.length) %
      templateIds.value.length;
    return templateIds.value[prevIdx];
  });

  return {
    loadTemplates,
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
