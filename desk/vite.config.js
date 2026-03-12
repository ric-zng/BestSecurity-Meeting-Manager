import vue from "@vitejs/plugin-vue";
import frappeui from "frappe-ui/vite";
import path from "path";
import { defineConfig } from "vite";
import Icons from "unplugin-icons/vite";
import IconsResolver from "unplugin-icons/resolver";
import Components from "unplugin-vue-components/vite";

export default defineConfig({
  plugins: [
    frappeui({
      frappeProxy: true,
      jinjaBootData: true,
      buildConfig: {
        outDir: `../meeting_manager/public/desk`,
        emptyOutDir: true,
        indexHtmlPath: "../meeting_manager/www/meeting-manager/index.html",
      },
    }),
    vue(),
    Icons({ compiler: "vue3" }),
    Components({
      resolvers: [IconsResolver()],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-vue": ["vue", "vue-router", "pinia"],
          "vendor-ui": ["@headlessui/vue", "@vueuse/core"],
          "vendor-fullcalendar": [
            "@fullcalendar/core",
            "@fullcalendar/daygrid",
            "@fullcalendar/interaction",
            "@fullcalendar/resource-timegrid",
            "@fullcalendar/resource-timeline",
            "@fullcalendar/vue3",
          ],
        },
      },
    },
  },
});
