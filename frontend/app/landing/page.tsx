"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import LanguageToggle from "@/components/LanguageToggle";
import { useAppContext } from "@/lib/AppContext";
import { t } from "@/lib/translations";

export default function LandingPage() {
  const router = useRouter();
  const { hasCompletedOnboarding, isLoggedIn, language } = useAppContext();

  useEffect(() => {
    // If user is logged in and completed onboarding, go to home
    if (isLoggedIn && hasCompletedOnboarding) {
      router.push("/");
    }
    // If user is logged in but hasn't completed onboarding, go to user selection
    else if (isLoggedIn && !hasCompletedOnboarding) {
      router.push("/user-selection");
    }
  }, [isLoggedIn, hasCompletedOnboarding, router]);

  const handleStart = () => {
    router.push("/login");
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-96 w-96 h-96 bg-gradient-to-br from-emerald-200 to-transparent rounded-full blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-0 -right-96 w-96 h-96 bg-gradient-to-tl from-yellow-100 via-emerald-50 to-transparent rounded-full blur-3xl opacity-20 animate-pulse" />
        <div className="absolute top-1/3 left-1/2 w-80 h-80 bg-gradient-to-br from-green-100 to-transparent rounded-full blur-3xl opacity-20" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 w-full max-w-6xl">
        {/* Language toggle - top right */}
        <div className="absolute -top-16 right-4 md:right-0">
          <LanguageToggle />
        </div>

        {/* Main content card */}
        <div className="bg-white/85 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/40">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-0">
            {/* LEFT SECTION - Hero content */}
            <div className="bg-gradient-to-br from-emerald-100 via-emerald-200/60 to-emerald-100 p-8 md:p-12 lg:p-16 relative overflow-hidden flex flex-col justify-center">
              {/* Decorative elements */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/30 rounded-full blur-3xl" />
              <div className="absolute -bottom-32 left-0 w-64 h-64 bg-emerald-200/20 rounded-full blur-3xl" />

              <div className="relative z-10">
                {/* Greeting emoji */}
                <div className="inline-block mb-6">
                  <p className="text-6xl animate-bounce-subtle mb-1">{t("greeting", language).split(" ")[0]}</p>
                </div>

                {/* Main title */}
                <h1 className="text-5xl md:text-6xl font-bold text-emerald-900 mb-3 leading-tight luxury-heading">
                  {t("app-name", language)}
                </h1>

                {/* Subtitle */}
                <p className="text-2xl md:text-3xl text-emerald-700/90 font-semibold mb-8">
                  {t("app-subtitle", language)}
                </p>

                {/* Description */}
                <p className="text-lg text-emerald-800/80 leading-relaxed mb-8 max-w-md font-medium">
                  {t("landing-subtitle", language)}
                </p>

                {/* Features list */}
                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✓</span>
                    <span className="text-emerald-900 font-semibold">{language === "hi" ? "आपकी भाषा में सलाह" : "Advice in Your Language"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✓</span>
                    <span className="text-emerald-900 font-semibold">{language === "hi" ? "ऑफलाइन भी काम करता है" : "Works Offline Too"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✓</span>
                    <span className="text-emerald-900 font-semibold">{language === "hi" ? "आपका डेटा सुरक्षित" : "Your Data is Safe"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SECTION - Features showcase */}
            <div className="bg-gradient-to-b from-white via-emerald-50/30 to-emerald-100/40 p-8 md:p-12 lg:p-16 flex flex-col justify-between">
              {/* Large emoji */}
              <div className="text-8xl mb-6 animate-bounce-subtle text-center">🌾</div>

              {/* Main description */}
              <div className="mb-10">
                <p className="text-base md:text-lg text-slate-700 leading-8 font-medium">
                  {t("landing-description", language)}
                </p>
              </div>

              {/* CTA Button */}
              <div className="mb-10">
                <Button
                  size="lg"
                  onClick={handleStart}
                  className="w-full py-4 md:py-5 text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <span>{t("start-button", language)}</span>
                  <span className="ml-2 text-xl">→</span>
                </Button>
              </div>

              {/* Feature cards */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  {language === "hi" ? "मुख्य विशेषताएं" : "Key Features"}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {/* Voice feature */}
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-emerald-400 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                    <div className="relative rounded-2xl border-2 border-emerald-200 bg-white/90 p-4 text-center hover:bg-white transition-all duration-300 hover:shadow-lg">
                      <div className="text-4xl mb-2">🎤</div>
                      <p className="text-xs font-bold text-emerald-900">{t("voice", language)}</p>
                    </div>
                  </div>

                  {/* Chat feature */}
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-emerald-400 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                    <div className="relative rounded-2xl border-2 border-emerald-200 bg-white/90 p-4 text-center hover:bg-white transition-all duration-300 hover:shadow-lg">
                      <div className="text-4xl mb-2">💬</div>
                      <p className="text-xs font-bold text-emerald-900">{t("chat", language)}</p>
                    </div>
                  </div>

                  {/* Offline feature */}
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-emerald-400 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                    <div className="relative rounded-2xl border-2 border-emerald-200 bg-white/90 p-4 text-center hover:bg-white transition-all duration-300 hover:shadow-lg">
                      <div className="text-4xl mb-2">📵</div>
                      <p className="text-xs font-bold text-emerald-900">{t("offline", language)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer trust text */}
        <div className="text-center mt-10">
          <p className="text-sm text-slate-700/80 font-medium">
            {language === "hi" ? "🔒 आपका निजी डेटा पूरी तरह सुरक्षित है" : "🔒 Your privacy is completely protected"}
          </p>
        </div>
      </div>

      {/* Add custom animation */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
