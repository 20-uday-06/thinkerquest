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
  const { userRole, isOnline, hasCompletedOnboarding, language } = useAppContext();
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [status, setStatus] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !hasCompletedOnboarding) {
      router.push("/landing");
    }
  }, [hasCompletedOnboarding, router, mounted]);

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

  const SUGGESTION_KEYS = ["crop-info", "weather", "health-tips"];

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
    <main className="min-h-screen w-full px-4 md:px-6 pb-safe app-shell">
      <div className="mx-auto max-w-5xl py-5 md:py-8">
        <header className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-700">{greeting}</p>
            <h1 className="text-3xl md:text-4xl luxury-heading text-rural-greenDark">
              {t("rural-ai", language)}
            </h1>
          </div>
          <button
            onClick={handleProfile}
            className="h-12 w-12 rounded-full hero-gradient border border-white/30 text-white text-lg transition-all duration-300 hover:shadow-lux-lg hover:-translate-y-0.5"
            aria-label={t("your-profile", language)}
          >
            👤
          </button>
        </header>

        <Card className="hero-gradient mb-6 relative overflow-hidden border border-white/20 shadow-lux-lg">
          <div className="absolute -top-16 -right-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="absolute -bottom-14 -left-8 h-40 w-40 rounded-full bg-amber-100/20 blur-2xl" aria-hidden />
          <p className="text-xs uppercase tracking-[0.11em] text-emerald-100/80 mb-2">{t("how-help", language)}</p>
          <p className="text-xl md:text-2xl font-semibold leading-snug mb-3">
            {t("speak-or-type", language)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant={isOnline ? "success" : "warning"}>
              <span>{isOnline ? "🟢" : "⚠️"}</span>
              <span>{t(isOnline ? "online" : "offline-mode", language)}</span>
            </Badge>
            {userRole && (
              <Badge variant="info">
                <span>👤</span>
                <span>{userRole}</span>
              </Badge>
            )}
            {status && (
              <Badge variant="info" className="max-w-full">
                <span>ℹ️</span>
                <span className="truncate">{status}</span>
              </Badge>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-5">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {ACTION_CARDS.map((card) => (
                <button
                  key={card.titleKey}
                  onClick={() => handleActionCard(t(card.titleKey, language))}
                  disabled={!isOnline}
                  className="group relative overflow-hidden rounded-2xl border border-rural-green/20 bg-white/90 px-4 py-4 text-left transition-all duration-300 shadow-soft hover:shadow-lux active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accent}`} aria-hidden />
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{card.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{t(card.titleKey, language)}</h3>
                      <p className="text-xs text-slate-600 mt-1">{t(card.descKey, language)}</p>
                    </div>
                    <span className="text-rural-greenDark text-xl transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </div>
                </button>
              ))}
            </div>

            <Card className="bg-white/82 border border-rural-green/15">
              <p className="muted-label mb-3">{t("now-learn", language)}</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTION_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => handleActionCard(t(key, language))}
                    disabled={!isOnline}
                    className="rounded-full px-3 py-1.5 text-sm font-medium bg-rural-greenLight text-rural-greenDark border border-rural-green/20 hover:bg-emerald-100 transition-colors disabled:opacity-60"
                  >
                    {t(key, language)}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <Card className="h-fit bg-white/88 border border-rural-green/20">
            <div className="text-center mb-3">
              <p className="muted-label">Voice First</p>
              <p className="text-sm text-slate-700 mt-1">{t("speak-or-type", language)}</p>
            </div>

            <div className="py-3">
              <MicButton
                isListening={isListening}
                isLoading={isLoading}
                disabled={false}
                onClick={handleVoiceInput}
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-emerald-200" />
              <span className="text-xs text-slate-600 font-semibold">{t("or", language)}</span>
              <div className="h-px flex-1 bg-emerald-200" />
            </div>

            <Button
              variant="outline"
              size="md"
              className="w-full mt-4"
              onClick={() => handleActionCard(t("ask-here", language))}
              disabled={!isOnline}
            >
              💬 {t("chat", language)}
            </Button>

            {!isOnline && (
              <Button
                variant="secondary"
                size="md"
                onClick={handleOfflineMode}
                className="w-full mt-3"
              >
                {t("offline-mode-btn", language)}
              </Button>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}