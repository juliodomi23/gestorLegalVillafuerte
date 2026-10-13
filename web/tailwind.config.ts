import type { Config } from "tailwindcss";

// Tokens del sistema de diseño "Expediente moderno" (ver ../sistema-diseno.md)
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Ventanas bajas (laptops con la barra del navegador): se quita lo que no es esencial.
      screens: { corta: { raw: "(max-height: 780px)" } },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        paper: "rgb(var(--chat-paper, 246 242 234) / <alpha-value>)",
        surface: "rgb(var(--chat-surface, 255 255 255) / <alpha-value>)",
        ink: "rgb(var(--chat-ink, 26 23 20) / <alpha-value>)",
        muted: "rgb(var(--chat-muted, 107 98 89) / <alpha-value>)",
        line: "rgb(var(--chat-line, 231 224 212) / <alpha-value>)",
        navy: { DEFAULT: "rgb(var(--chat-navy, 30 58 95) / <alpha-value>)", deep: "#162A41" },
        amber: { DEFAULT: "rgb(var(--chat-amber, 150 112 15) / <alpha-value>)", soft: "#D4AF37", wash: "rgb(var(--chat-amber-wash, 244 233 215) / <alpha-value>)" },
        success: { DEFAULT: "rgb(var(--chat-success, 63 107 79) / <alpha-value>)", wash: "rgb(var(--chat-success-wash, 230 238 231) / <alpha-value>)" },
        danger: { DEFAULT: "rgb(var(--chat-danger, 155 44 44) / <alpha-value>)", wash: "rgb(var(--chat-danger-wash, 243 226 224) / <alpha-value>)" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(22,20,16,.04), 0 1px 12px rgba(22,20,16,.05)",
      },
    },
  },
  plugins: [],
};

export default config;
