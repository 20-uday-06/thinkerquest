import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rural: {
          cream: "#fef9f3",
          green: "#4ade80",
          greenDark: "#22c55e",
          greenLight: "#dcfce7",
          yellow: "#fef08a",
          white: "#ffffff",
        },
        surface: "#fef9f3",
        card: "#ffffff",
        accent: "#22c55e",
        accentSoft: "#dcfce7",
      },
      fontFamily: {
        sans: ["Noto Sans Devanagari", "Noto Sans", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fade-in 0.3s ease-in",
        "slide-up": "slide-up 0.3s ease-out",
        "bounce-subtle": "bounce-subtle 0.6s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      boxShadow: {
        "soft": "0 4px 6px -1px rgba(0, 0, 0, 0.08)",
        "soft-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
