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
      color: "bg-green-50",
    },
    {
      icon: "🏥",
      titleKey: "health",
      descKey: "health-desc",
      color: "bg-red-50",
    },
    {
      icon: "🏛️",
      titleKey: "government-scheme",
      descKey: "gov-desc",
      color: "bg-blue-50",
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
    <main className="min-h-screen w-full flex flex-col p-4 pb-safe bg-gradient-to-b from-rural-cream via-rural-greenLight to-rural-cream safe-area">
      {/* Header with greeting */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-slate-600">{greeting}</p>
            <h1 className="text-3xl font-bold text-slate-900">
              {t("rural-ai", language)}
            </h1>
          </div>
          <button
            onClick={handleProfile}
            className="w-12 h-12 rounded-full bg-rural-green text-white flex items-center justify-center text-lg hover:bg-rural-greenDark transition-colors shadow-soft"
            aria-label={t("your-profile", language)}
          >
            👤
          </button>
        </div>

        {/* Status badge */}
        <div className="flex gap-2 flex-wrap">
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
            <Badge variant="info">
              <span>ℹ️</span>
              <span className="truncate">{status}</span>
            </Badge>
          )}
        </div>
      </header>

      {/* Main greeting text */}
      <Card className="mb-8 text-center bg-gradient-to-br from-rural-white to-rural-greenLight border-2 border-rural-green border-opacity-20">
        <p className="text-2xl font-bold text-slate-900 mb-2">
          {t("how-help", language)}
        </p>
        <p className="text-sm text-slate-600">{t("speak-or-type", language)}</p>
      </Card>

      {/* Microphone section */}
      <div className="flex flex-col items-center justify-center mb-12 pb-8">
        <MicButton
          isListening={isListening}
          isLoading={isLoading}
          disabled={false}
          onClick={handleVoiceInput}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-sm text-slate-500 font-medium">{t("or", language)}</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 gap-3 mb-8">
        {ACTION_CARDS.map((card) => (
          <button
            key={card.titleKey}
            onClick={() => handleActionCard(t(card.titleKey, language))}
            disabled={!isOnline}
            className={`${card.color} rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 active:scale-95 hover:shadow-soft-lg shadow-soft border-l-4 border-l-transparent disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <span className="text-3xl">{card.icon}</span>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-slate-900">
                {t(card.titleKey, language)}
              </h3>
              <p className="text-xs text-slate-600">{t(card.descKey, language)}</p>
            </div>
            <span className="text-xl">→</span>
          </button>
        ))}
      </div>

      {/* Suggestion prompt */}
      {/* <div className="mt-8 mb-4">
        <p className="text-xs text-slate-500 px-2 mb-3">{t("now-learn", language)}</p>
        <div className="grid grid-cols-1 gap-2">
          {SUGGESTION_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => handleActionCard(t(key, language))}
              disabled={!isOnline}
              className="bg-rural-white bg-opacity-70 hover:bg-opacity-100 rounded-xl p-3 text-left text-sm text-slate-700 font-medium transition-all duration-200 shadow-soft hover:shadow-soft-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              ✨ {t(key, language)}
            </button>
          ))}
        </div>
      </div> */}

      {/* Offline mode button */}
      {!isOnline && (
        <div className="mt-8 pt-4 border-t border-slate-200">
          <Button
            variant="secondary"
            size="md"
            onClick={handleOfflineMode}
            className="w-full"
          >
            {t("offline-mode-btn", language)}
          </Button>
        </div>
      )}
    </main>
  );
}