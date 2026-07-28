import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101917",
        paper: "#f5f6f2",
        moss: {
          50: "#f0f7f3",
          100: "#dcece3",
          400: "#48a074",
          500: "#2d805b",
          600: "#236849",
          700: "#1e523c",
          900: "#153328"
        },
        sun: "#f4c95d"
      },
      boxShadow: {
        soft: "0 18px 55px rgba(17, 30, 25, 0.08)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Manrope", "Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
} satisfies Config;
