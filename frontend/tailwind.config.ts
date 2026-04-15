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
          cream: "#f4f7f2",
          green: "#1f7a55",
          greenDark: "#124f38",
          greenLight: "#dceee4",
          yellow: "#e6d7ad",
          white: "#fbfdfb",
        },
        surface: "#eef4ef",
        card: "#fbfdfb",
        accent: "#1f7a55",
        accentSoft: "#dceee4",
        ink: "#10251b",
      },
      fontFamily: {
        sans: ["var(--font-body)", "Noto Sans Devanagari", "sans-serif"],
        display: ["var(--font-display)", "Noto Serif Devanagari", "serif"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fade-in 0.35s ease-out",
        "slide-up": "slide-up 0.35s ease-out",
        "bounce-subtle": "bounce-subtle 0.6s ease-in-out infinite",
        "float-slow": "float-slow 5s ease-in-out infinite",
        "reveal-up": "reveal-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 2.2s linear infinite",
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
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "reveal-up": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0px)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      boxShadow: {
        soft: "0 10px 24px -14px rgba(16, 37, 27, 0.28)",
        "soft-lg": "0 18px 44px -20px rgba(16, 37, 27, 0.36)",
        lux: "0 18px 40px -18px rgba(20, 79, 56, 0.32), 0 4px 10px -6px rgba(16, 37, 27, 0.22)",
        "lux-lg": "0 28px 56px -24px rgba(20, 79, 56, 0.42), 0 10px 22px -12px rgba(16, 37, 27, 0.28)",
        "inset-soft": "inset 0 1px 0 rgba(255,255,255,0.7)",
      },
    },
  },
  plugins: [],
};

export default config;
