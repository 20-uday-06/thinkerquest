"use client";

import { useAppContext } from "@/lib/AppContext";

export default function LanguageToggle() {
  const { language, setLanguage } = useAppContext();

  const toggleLanguage = () => {
    setLanguage(language === "hi" ? "en" : "hi");
  };

  return (
    <button
      onClick={toggleLanguage}
      className="fixed bottom-6 right-6 z-50 h-12 min-w-[3.2rem] px-3 rounded-full hero-gradient border border-white/25 flex items-center justify-center text-white transition-all duration-300 active:scale-95 hover:shadow-lux-lg hover:-translate-y-0.5 font-semibold text-sm tracking-[0.06em]"
      style={{
        boxShadow: "0 12px 28px -14px rgba(20, 79, 56, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
      }}
      aria-label="Toggle language"
      title={language === "hi" ? "Switch to English" : "हिंदी में बदलें"}
    >
      <span>{language === "hi" ? "EN" : "हि"}</span>
    </button>
  );
}
