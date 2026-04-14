"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { useAppContext } from "@/lib/AppContext";
import { t } from "@/lib/translations";

export default function LandingPage() {
  const router = useRouter();
  const { hasCompletedOnboarding, language } = useAppContext();

  useEffect(() => {
    if (hasCompletedOnboarding) {
      router.push("/");
    }
  }, [hasCompletedOnboarding, router]);

  const handleStart = () => {
    router.push("/user-selection");
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-rural-greenLight via-rural-cream to-rural-yellow">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-rural-yellow rounded-full opacity-30 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-rural-green rounded-full opacity-20 blur-3xl" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-md">
        {/* Icon */}
        <div className="text-7xl mb-8 animate-bounce-subtle">🌾</div>

        {/* App name */}
        <h1 className="text-4xl font-bold text-slate-900 mb-3">
          {t("app-name", language)}
        </h1>
        <h2 className="text-2xl font-semibold text-rural-greenDark mb-2">
          {t("app-subtitle", language)}
        </h2>

        {/* Greeting */}
        <p className="text-5xl mb-6">{t("greeting", language)}</p>

        {/* Subtitle */}
        <p className="text-xl text-slate-700 mb-12 leading-relaxed">
          {t("landing-subtitle", language)}
        </p>

        {/* Description */}
        <p className="text-sm text-slate-600 mb-12 leading-7 font-semibold">
          {t("landing-description", language)}
        </p>

        {/* CTA Button */}
        <Button
          size="lg"
          onClick={handleStart}
          className="mb-8 shadow-soft-lg hover:shadow-lg"
        >
          <span className="font-semibold">{t("start-button", language)}</span>
          <span>→</span>
        </Button>

        {/* Features preview */}
        <div className="mt-12 grid grid-cols-3 gap-4 w-full">
          <div className="bg-white bg-opacity-60 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-3xl mb-2">🎤</div>
            <p className="text-s text-slate-700 font-medium">{t("voice", language)}</p>
          </div>
          <div className="bg-white bg-opacity-60 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-s text-slate-700 font-medium">{t("chat", language)}</p>
          </div>
          <div className="bg-white bg-opacity-60 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-3xl mb-2">📵</div>
            <p className="text-s text-slate-700 font-medium">{t("offline", language)}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
