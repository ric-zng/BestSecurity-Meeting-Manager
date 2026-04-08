import frappeUIPreset from "frappe-ui/src/tailwind/preset";

export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  presets: [frappeUIPreset],
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./node_modules/frappe-ui/src/**/*.{vue,js,ts,jsx,tsx}",
    "../node_modules/frappe-ui/src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          950: "#030712",
        },
      },
    },
  },
};
