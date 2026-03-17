import { ref, watch, onMounted } from "vue";

const isDark = ref(false);

function applyTheme() {
  const root = document.documentElement;
  const theme = isDark.value ? "dark" : "light";
  // Frappe-ui uses data-theme attribute for both CSS variables and Tailwind dark: selector
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-theme-mode", theme);
  localStorage.setItem("mm-theme", theme);
}

function initTheme() {
  const saved = localStorage.getItem("mm-theme");
  if (saved === "dark") {
    isDark.value = true;
  } else if (saved === "light") {
    isDark.value = false;
  } else {
    // Check Frappe's theme attribute first, then system preference
    const frappeTheme = document.documentElement.getAttribute("data-theme") ||
                        document.documentElement.getAttribute("data-theme-mode");
    if (frappeTheme === "dark") {
      isDark.value = true;
    } else if (frappeTheme === "light") {
      isDark.value = false;
    } else {
      isDark.value = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
  }
  applyTheme();
}

// Run immediately on module load to prevent flash
initTheme();

export function useDarkMode() {
  onMounted(() => {
    // Re-apply in case DOM was modified between module load and mount
    applyTheme();
  });

  watch(isDark, () => {
    applyTheme();
  });

  function toggle() {
    isDark.value = !isDark.value;
    applyTheme();
  }

  return { isDark, toggle };
}
