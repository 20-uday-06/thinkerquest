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
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-rural-greenDark to-emerald-800 flex items-center justify-center text-white transition-all duration-300 active:scale-90 active:shadow-md hover:shadow-2xl hover:-translate-y-1 font-bold text-lg tracking-wider"
      style={{
        boxShadow: "0 8px 24px rgba(34, 197, 94, 0.3), 0 4px 12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
      }}
      aria-label="Toggle language"
      title={language === "hi" ? "Switch to English" : "हिंदी में बदलें"}
    >
      <span>{language === "hi" ? "H" : "E"}</span>
    </button>
  );
}
