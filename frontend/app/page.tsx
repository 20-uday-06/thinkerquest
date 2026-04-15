"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import Button from "@/components/Button";
import MicButton from "@/components/MicButton";
import Badge from "@/components/Badge";
import { useAppContext } from "@/lib/AppContext";
import { t } from "@/lib/translations";

export default function HomePage() {
  const router = useRouter();
  const { userRole, isOnline, hasCompletedOnboarding, isLoggedIn, language } = useAppContext();
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [status, setStatus] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      // Check if user is logged in
      if (!isLoggedIn) {
        router.push("/landing");
      }
      // Check if onboarding is completed
      else if (!hasCompletedOnboarding) {
        router.push("/user-selection");
      }
    }
  }, [isLoggedIn, hasCompletedOnboarding, router, mounted]);

  useEffect(() => {
    // Set personalized greeting based on time and language
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting(t("good-morning", language));
    } else if (hour < 17) {
      setGreeting(t("hello", language));
    } else {
      setGreeting(t("good-evening", language));
    }
  }, [language]);

  const ACTION_CARDS = [
    {
      icon: "🌾",
      titleKey: "farm-advice",
      descKey: "farm-desc",
      accent: "from-emerald-700 to-emerald-600",
    },
    {
      icon: "🏥",
      titleKey: "health",
      descKey: "health-desc",
      accent: "from-emerald-600 to-teal-600",
    },
    {
      icon: "🏛️",
      titleKey: "government-scheme",
      descKey: "gov-desc",
      accent: "from-rural-greenDark to-rural-green",
    },
  ];

  const SUGGESTION_KEYS = [
    { hi: "फसल की बुवाई कैसे करें ?", en: "How to sow crops ?" },
    { hi: "इस मौसम में कौन सी फसल की बुवाई करें ?", en: "Which crop to sow this season ?" },
    { hi: "बुखार में कौन सी दवाई लें ?", en: "Which medicine for fever ?" },
  ];

  const handleVoiceInput = () => {
    if (typeof window === "undefined") {
      setStatus(t("voice-unavailable", language));
      return;
    }

    // Better browser support checking
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setStatus(t("browser-unsupported", language));
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI() as {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        start: () => void;
        onresult: (event: any) => void;
        onerror: (event: any) => void;
        onend: () => void;
      };
      recognition.lang = language === "en" ? "en-US" : "hi-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListening(true);
      setStatus(t("listening-status", language));

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? "";
        setIsListening(false);

        if (transcript) {
          router.push(`/chat?topic=${encodeURIComponent(transcript)}`);
        } else {
          setStatus(t("no-voice-detected", language));
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        const errorMessage =
          event.error === "network"
            ? t("network-error", language)
            : t("voice-failed", language);
        setStatus(errorMessage);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      setStatus(t("browser-unsupported", language));
    }
  };

  const handleActionCard = (action: string) => {
    router.push(`/chat?topic=${encodeURIComponent(action)}`);
  };

  const handleProfile = () => {
    router.push("/profile");
  };

  const handleOfflineMode = () => {
    router.push("/offline");
  };

  if (!mounted || !hasCompletedOnboarding) {
    return null;
  }

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-emerald-50 to-slate-50 pb-safe relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 right-0 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-0 w-80 h-80 bg-green-200/20 rounded-full blur-3xl" />
      </div>

      <div className="px-4 md:px-8 py-6 md:py-10 app-shell relative z-10">
        <div className="mx-auto max-w-6xl">
          {/* Header Section */}
          <header className="mb-12 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-2">{greeting}</p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-emerald-900 leading-tight luxury-heading">
                {t("rural-ai", language)}
              </h1>
            </div>
            <button
              onClick={handleProfile}
              className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 border-2 border-white shadow-lg text-white text-2xl transition-all duration-300 hover:shadow-xl hover:scale-110 active:scale-95 flex-shrink-0 flex items-center justify-center"
              aria-label={t("your-profile", language)}
            >
              👤
            </button>
          </header>

          {/* Status Bar */}
          <div className="mb-10 flex flex-wrap items-center gap-2">
            <Badge variant={isOnline ? "success" : "warning"}>
              <span>{isOnline ? "🟢" : "⚠️"}</span>
              <span className="font-bold">{t(isOnline ? "online" : "offline-mode", language)}</span>
            </Badge>
            {userRole && (
              <Badge variant="info">
                <span>👤</span>
                <span className="font-bold">{userRole}</span>
              </Badge>
            )}
            {status && (
              <Badge variant="info" className="max-w-full">
                <span>ℹ️</span>
                <span className="truncate font-semibold">{status}</span>
              </Badge>
            )}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-6">
            {/* Left Column - Action Cards & Suggestions (appears second on mobile) */}
            <div className="lg:col-span-2 space-y-6 order-last lg:order-first">
              <div>
                <p className="text-xs font-black text-emerald-700 uppercase tracking-[0.15em] mb-5">💡 {language === "hi" ? "क्या चाहिए?" : "What do you need?"}</p>

                {/* Action Cards */}
                <div className="space-y-4">
                  {ACTION_CARDS.map((card) => (
                    <button
                      key={card.titleKey}
                      onClick={() => handleActionCard(t(card.titleKey, language))}
                      disabled={!isOnline}
                      className="group w-full relative overflow-hidden rounded-3xl bg-white border-2 border-slate-200 hover:border-emerald-300 px-6 py-5 text-left transition-all duration-300 shadow-md hover:shadow-xl active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed transform hover:-translate-y-1"
                    >
                      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accent} opacity-0 group-hover:opacity-100 transition-opacity`} aria-hidden />
                      <div className="flex items-center gap-5">
                        <span className="text-5xl flex-shrink-0 group-hover:scale-110 transition-transform">{card.icon}</span>
                        <div className="flex-1">
                          <h3 className="font-bold text-emerald-900 text-lg">{t(card.titleKey, language)}</h3>
                          <p className="text-sm text-emerald-700/70 mt-1">{t(card.descKey, language)}</p>
                        </div>
                        <span className="text-emerald-600 text-2xl group-hover:translate-x-2 transition-transform flex-shrink-0">→</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Suggestions */}
              <div className="pt-4">
                <p className="text-xs font-black text-emerald-700 uppercase tracking-[0.15em] mb-4">✨ {language === "hi" ? "जल्दी खोजें" : "Quick Find"}</p>
                <div className="flex flex-wrap gap-3">
                  {SUGGESTION_KEYS.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleActionCard(language === "hi" ? suggestion.hi : suggestion.en)}
                      disabled={!isOnline}
                      className="px-5 py-2.5 rounded-full text-sm font-bold bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-900 border-2 border-emerald-300 hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-40"
                    >
                      {language === "hi" ? suggestion.hi : suggestion.en}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Voice & Chat Input (appears first on mobile) */}
            <div className="lg:col-span-1 order-first lg:order-last">
              <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 rounded-3xl border-2 border-emerald-200 shadow-xl p-6 h-fit flex flex-col relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-200/20 rounded-full blur-2xl" />
                <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-green-200/15 rounded-full blur-2xl" />

                <div className="relative z-10">
                  {/* Header */}
                  <div className="text-center mb-6">
                    <p className="text-sm font-black text-emerald-700 uppercase tracking-[0.15em] mb-1">{language === "hi" ? "यहाँ पर अपनी बात कहें" : "Express Yourself"}</p>
                    <p className="text-emerald-900 font-semibold text-sm leading-relaxed">{t("speak-or-type", language)}</p>
                  </div>

                  {/* Options Container */}
                  <div className="flex-1 flex flex-col items-center justify-center gap-8">
                    {/* Mic Option */}
                    <div className="text-center w-full">
                      <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-3">🎤 {language === "hi" ? "यहाँ बोलें" : "Speak"}</p>
                      <div className="flex justify-center">
                        <div className="relative h-20 w-20">
                          <div className="absolute inset-2 rounded-full border border-emerald-200/30 bg-white/45 backdrop-blur-sm" aria-hidden />
                          <div className="absolute inset-0 rounded-full bg-blue-300/20" aria-hidden /> 
                          <div className="absolute inset-0 flex items-center justify-center">
                          {/* Outer ring - lighter shade */}
                            <button
                              onClick={handleVoiceInput}
                              className={`h-16 w-16 rounded-full flex items-center justify-center text-3xl transition-all duration-200 ${
                                isListening
                                  ? "bg-gradient-to-br from-rose-500 to-rose-700 animate-pulse shadow-lg"
                                  : "bg-gradient-to-br from-rural-green to-rural-greenDark hover:shadow-lg shadow-md active:scale-[0.98]"
                              }`}
                            >
                              🎤
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Beautiful Divider */}
                    <div className="w-12 h-1 bg-gradient-to-r from-emerald-200 via-emerald-400 to-emerald-200 rounded-full" />

                    {/* Chat Option */}
                    <div className="text-center w-full">
                      <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-3">📝 {language === "hi" ? "टाइप करें" : "Type"}</p>
                      <div className="flex justify-center">
                        <button
                          onClick={() => router.push("/chat")}
                          disabled={!isOnline}
                          className="relative h-20 w-20 mx-auto"
                          aria-label={t("chat", language)}
                        >
                          {/* Outer ring - lighter shade */}
                          <div className="absolute inset-0 rounded-full bg-blue-300/20" aria-hidden />

                          {/* Glass panel background */}
                          <div className="absolute inset-2 rounded-full border border-blue-200/30 bg-white/45 backdrop-blur-sm" aria-hidden />

                          {/* Main button */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div
                              className={`h-16 w-16 rounded-full flex items-center justify-center text-3xl transition-all duration-200 ${
                                !isOnline
                                  ? "bg-slate-300 cursor-not-allowed"
                                  : "bg-gradient-to-br from-rural-green to-rural-greenDark hover:shadow-lg shadow-md active:scale-[0.98]"
                              }`}
                            >
                              ⌨️
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Offline Mode Button */}
                  {!isOnline && (
                    <div className="mt-6 pt-4 border-t border-emerald-200">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleOfflineMode}
                        className="w-full"
                      >
                        {t("offline-mode-btn", language)}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}