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
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-rural-green text-white px-4 py-3 shadow-soft-lg hover:bg-rural-greenDark transition-all duration-200 active:scale-95 font-medium text-sm"
      aria-label="Toggle language"
      title={language === "hi" ? "Switch to English" : "हिंदी में बदलें"}
    >
      <span className="text-lg">🌐</span>
      <span>{language === "hi" ? "हिंदी" : "English"}</span>
    </button>
  );
}
