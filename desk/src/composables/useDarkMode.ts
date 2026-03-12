import { ref, watch, onMounted } from "vue";

const isDark = ref(false);

function applyTheme() {
  if (isDark.value) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  localStorage.setItem("mm-theme", isDark.value ? "dark" : "light");
}

function initTheme() {
  const saved = localStorage.getItem("mm-theme");
  if (saved === "dark") {
    isDark.value = true;
  } else if (saved === "light") {
    isDark.value = false;
  } else {
    // Follow system preference
    isDark.value = window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  applyTheme();
}

export function useDarkMode() {
  onMounted(() => {
    initTheme();
  });

  watch(isDark, () => {
    applyTheme();
  });

  function toggle() {
    isDark.value = !isDark.value;
  }

  return { isDark, toggle };
}
