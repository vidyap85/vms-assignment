/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          50: "#f5f7fa",
          100: "#e9edf3",
          200: "#cfd8e3",
          300: "#a6b5c9",
          400: "#7488a3",
          500: "#546480",
          600: "#3f4c63",
          700: "#2c3648",
          800: "#1c2333",
          850: "#151b28",
          900: "#0f1420",
          950: "#090c14",
        },
        accent: {
          DEFAULT: "#2dd4bf",
          soft: "#5eead4",
          dim: "#0f766e",
        },
        danger: {
          DEFAULT: "#d03b3b",
          soft: "#e37272",
        },
        warn: {
          DEFAULT: "#fab219",
          soft: "#fcc862",
        },
        ok: {
          DEFAULT: "#0ca30c",
          soft: "#3ec23e",
        },
        chart: {
          blue: "#3987e5",
          orange: "#d95926",
          aqua: "#199e70",
          yellow: "#c98500",
          magenta: "#d55181",
          violet: "#9085e9",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)",
      },
    },
  },
  plugins: [],
};
