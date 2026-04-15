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
      jinjaBootData: false,
      buildConfig: {
        outDir: `../meeting_manager/public/book`,
        emptyOutDir: true,
        indexHtmlPath: "../meeting_manager/www/meeting-booking/index.html",
      },
    }),
    vue(),
    Icons({ compiler: "vue3" }),
    Components({ resolvers: [IconsResolver()] }),
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
        },
      },
    },
  },
});
