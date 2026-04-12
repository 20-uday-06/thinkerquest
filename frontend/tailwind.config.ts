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
        surface: "#f8fafc",
        card: "#ffffff",
        accent: "#166534",
        accentSoft: "#dcfce7",
      },
    },
  },
  plugins: [],
};

export default config;
