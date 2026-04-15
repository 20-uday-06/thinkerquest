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
    <main className="min-h-screen w-full px-5 py-8 app-shell flex items-center justify-center">
      <section className="w-full max-w-4xl rounded-[2rem] overflow-hidden border border-rural-green/20 shadow-lux-lg bg-white/90">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hero-gradient p-8 md:p-10 relative overflow-hidden">
            <div className="absolute -top-10 -right-8 h-36 w-36 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <div className="absolute -bottom-12 left-0 h-36 w-36 rounded-full bg-amber-200/20 blur-2xl" aria-hidden />

            <p className="text-4xl mb-4">{t("greeting", language)}</p>
            <h1 className="text-4xl md:text-5xl luxury-heading leading-tight mb-3">{t("app-name", language)}</h1>
            <h2 className="text-lg md:text-xl text-emerald-100/90 font-semibold mb-6">{t("app-subtitle", language)}</h2>

            <p className="text-sm md:text-base text-emerald-50/90 leading-7 max-w-md">
              {t("landing-subtitle", language)}
            </p>
          </div>

          <div className="p-8 md:p-10 bg-gradient-to-b from-white/95 to-rural-greenLight/40">
            <div className="text-6xl mb-5 animate-float-slow">🌾</div>
            <p className="text-sm text-slate-700 leading-7 font-medium mb-8">{t("landing-description", language)}</p>

            <Button
              size="lg"
              onClick={handleStart}
              className="w-full mb-7"
            >
              <span>{t("start-button", language)}</span>
              <span>→</span>
            </Button>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-rural-green/20 bg-white/80 p-3 text-center">
                <div className="text-2xl mb-1">🎤</div>
                <p className="text-xs font-semibold text-slate-700">{t("voice", language)}</p>
              </div>
              <div className="rounded-xl border border-rural-green/20 bg-white/80 p-3 text-center">
                <div className="text-2xl mb-1">💬</div>
                <p className="text-xs font-semibold text-slate-700">{t("chat", language)}</p>
              </div>
              <div className="rounded-xl border border-rural-green/20 bg-white/80 p-3 text-center">
                <div className="text-2xl mb-1">📵</div>
                <p className="text-xs font-semibold text-slate-700">{t("offline", language)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
