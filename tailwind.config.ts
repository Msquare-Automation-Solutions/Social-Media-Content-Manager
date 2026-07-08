import type { Config } from "tailwindcss";

/**
 * Brand tokens lifted from mediachat-demo.html so the real UI (Phase 2+)
 * matches the prototype exactly.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#141f2e",
        slate: "#5f6e81",
        line: "#e6ebf1",
        bg: "#f4f6f9",
        card: "#ffffff",
        teal: {
          DEFAULT: "#0e9f8f",
          dark: "#0b7d71",
          soft: "#dcf3f0",
        },
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,31,46,.05),0 8px 24px rgba(20,31,46,.07)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Sora", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
