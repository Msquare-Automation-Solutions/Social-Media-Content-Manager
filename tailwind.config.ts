import type { Config } from "tailwindcss";

/**
 * Brand tokens (from mediachat-demo.html) plus a premium elevation/gradient
 * layer: softer layered shadows, a teal glow for primary actions, and a couple
 * of reusable brand gradients.
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
        violet: { DEFAULT: "#7a4fc9", soft: "#efe6fb" },
      },
      borderRadius: {
        card: "16px",
        xl2: "20px",
      },
      boxShadow: {
        // Layered, low-contrast elevation for a calmer, more premium depth.
        soft: "0 1px 2px rgba(20,31,46,.04), 0 4px 14px rgba(20,31,46,.05)",
        card: "0 1px 2px rgba(20,31,46,.04), 0 10px 30px rgba(20,31,46,.07)",
        lift: "0 2px 6px rgba(20,31,46,.06), 0 18px 40px rgba(20,31,46,.13)",
        glow: "0 6px 18px rgba(14,159,143,.30), inset 0 1px 0 rgba(255,255,255,.18)",
        "glow-sm": "0 3px 10px rgba(14,159,143,.28)",
        ring: "0 0 0 1px rgba(20,31,46,.05)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Sora", "sans-serif"],
      },
      backgroundImage: {
        "brand-teal": "linear-gradient(135deg, #12b3a1 0%, #0b7d71 100%)",
        "brand-teal-strong": "linear-gradient(135deg, #16c2af 0%, #0a6f88 100%)",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(.22,.61,.36,1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up .35s cubic-bezier(.22,.61,.36,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
