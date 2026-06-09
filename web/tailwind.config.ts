import type { Config } from "tailwindcss";

// Tokens del sistema de diseño "Expediente moderno" (ver ../sistema-diseno.md)
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        paper: "#F6F2EA",
        surface: "#FFFFFF",
        ink: "#1A1714",
        muted: "#6B6259",
        line: "#E7E0D4",
        navy: { DEFAULT: "#1E3A5F", deep: "#162A41" },
        amber: { DEFAULT: "#B45309", soft: "#C8881E", wash: "#F4E9D7" },
        success: { DEFAULT: "#3F6B4F", wash: "#E6EEE7" },
        danger: { DEFAULT: "#9B2C2C", wash: "#F3E2E0" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(22,20,16,.04), 0 1px 12px rgba(22,20,16,.05)",
      },
    },
  },
  plugins: [],
};

export default config;
