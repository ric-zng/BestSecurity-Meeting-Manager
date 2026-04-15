/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          50: "#fffbf0",
          100: "#fff4d6",
          200: "#ffe8a3",
          300: "#ffd670",
          400: "#f5b833",
          500: "#e19800",
          600: "#c27e00",
          700: "#9b6200",
          800: "#7a4d00",
          900: "#5c3a00",
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(15,23,42,0.04), 0 4px 20px rgba(15,23,42,0.06)",
        "card-hover":
          "0 2px 6px rgba(225,152,0,0.10), 0 12px 32px rgba(225,152,0,0.12)",
      },
    },
  },
  plugins: [],
};
