"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useAppContext } from "@/lib/AppContext";
import { t } from "@/lib/translations";

interface ExpandedFAQ {
  category: string;
  itemId: string;
}

export default function OfflineModePage() {
  const { language } = useAppContext();
  const [expandedFAQ, setExpandedFAQ] = useState<ExpandedFAQ | null>(null);

  const OFFLINE_FAQS = {
    farm: [
      {
        id: "1",
        questionKey: "farm-faq-1-q",
        answerKey: "farm-faq-1-a",
      },
      {
        id: "2",
        questionKey: "farm-faq-2-q",
        answerKey: "farm-faq-2-a",
      },
      {
        id: "3",
        questionKey: "farm-faq-3-q",
        answerKey: "farm-faq-3-a",
      },
    ],
    health: [
      {
        id: "4",
        questionKey: "health-faq-1-q",
        answerKey: "health-faq-1-a",
      },
      {
        id: "5",
        questionKey: "health-faq-2-q",
        answerKey: "health-faq-2-a",
      },
      {
        id: "6",
        questionKey: "health-faq-3-q",
        answerKey: "health-faq-3-a",
      },
    ],
  };

  return (
    <main className="min-h-screen w-full flex flex-col p-4 md:p-6 pb-safe app-shell safe-area">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="h-9 w-9 rounded-full bg-rural-greenLight text-rural-greenDark flex items-center justify-center hover:bg-emerald-100 transition-colors"
          >
            <span className="text-xl">←</span>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl luxury-heading text-rural-greenDark">{t("offline-mode", language)}</h1>
            <p className="text-sm text-slate-700">{t("offline-help", language)}</p>
          </div>
        </div>

        {/* Warning banner */}
        <Card className="bg-amber-50 border border-amber-300/70">
          <div className="flex gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold text-sm text-yellow-900">
                {t("offline-warning", language)}
              </p>
              <p className="text-xs text-yellow-800 mt-1">
                {t("offline-desc", language)}
              </p>
            </div>
          </div>
        </Card>
      </header>

      {/* FAQ Categories */}
      <div className="space-y-4">
        {/* Farm FAQs */}
        <Card key="farm" className="overflow-hidden bg-white/88 border border-rural-green/20">
          <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <span>🌾</span>
            {t("farm-faqs", language)}
          </h2>

          <div className="space-y-2">
            {OFFLINE_FAQS.farm.map((faq) => {
              const isExpanded =
                expandedFAQ?.category === "farm" &&
                expandedFAQ?.itemId === faq.id;

              return (
                <button
                  key={faq.id}
                  onClick={() => setExpandedFAQ(isExpanded ? null : { category: "farm", itemId: faq.id })}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                    isExpanded
                      ? "bg-rural-greenLight/80 border border-rural-green/35"
                      : "bg-rural-cream/80 hover:bg-rural-greenLight/60 border border-transparent"
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    <span className="text-lg mt-1">
                      {isExpanded ? "▼" : "▶"}
                    </span>
                    <div className="flex-1">
                      <p
                        className={`font-medium text-sm ${
                          isExpanded
                            ? "text-rural-greenDark"
                            : "text-slate-900"
                        }`}
                      >
                        {t(faq.questionKey, language)}
                      </p>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-rural-greenDark border-opacity-30">
                          <p className="text-sm text-slate-700 leading-6">
                            {t(faq.answerKey, language)}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if ("speechSynthesis" in window) {
                                const utterance =
                                  new SpeechSynthesisUtterance(t(faq.answerKey, language));
                                utterance.lang = language === "hi" ? "hi-IN" : "en-US";
                                utterance.rate = language === "hi" ? 1.0 : 1.04;
                                window.speechSynthesis.cancel();
                                window.speechSynthesis.speak(utterance);
                              }
                            }}
                            className="mt-2 text-xs text-rural-greenDark hover:opacity-70 inline-flex items-center gap-1 rounded-full border border-rural-green/20 px-2 py-1"
                          >
                            <span>🔊</span>
                            <span>{t("listen", language)}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Health FAQs */}
        <Card key="health" className="overflow-hidden bg-white/88 border border-rural-green/20">
          <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <span>🏥</span>
            {t("health-faqs", language)}
          </h2>

          <div className="space-y-2">
            {OFFLINE_FAQS.health.map((faq) => {
              const isExpanded =
                expandedFAQ?.category === "health" &&
                expandedFAQ?.itemId === faq.id;

              return (
                <button
                  key={faq.id}
                  onClick={() => setExpandedFAQ(isExpanded ? null : { category: "health", itemId: faq.id })}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                    isExpanded
                      ? "bg-rural-greenLight/80 border border-rural-green/35"
                      : "bg-rural-cream/80 hover:bg-rural-greenLight/60 border border-transparent"
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    <span className="text-lg mt-1">
                      {isExpanded ? "▼" : "▶"}
                    </span>
                    <div className="flex-1">
                      <p
                        className={`font-medium text-sm ${
                          isExpanded
                            ? "text-rural-greenDark"
                            : "text-slate-900"
                        }`}
                      >
                        {t(faq.questionKey, language)}
                      </p>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-rural-greenDark border-opacity-30">
                          <p className="text-sm text-slate-700 leading-6">
                            {t(faq.answerKey, language)}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if ("speechSynthesis" in window) {
                                const utterance =
                                  new SpeechSynthesisUtterance(t(faq.answerKey, language));
                                utterance.lang = language === "hi" ? "hi-IN" : "en-US";
                                utterance.rate = language === "hi" ? 1.0 : 1.04;
                                window.speechSynthesis.cancel();
                                window.speechSynthesis.speak(utterance);
                              }
                            }}
                            className="mt-2 text-xs text-rural-greenDark hover:opacity-70 inline-flex items-center gap-1 rounded-full border border-rural-green/20 px-2 py-1"
                          >
                            <span>🔊</span>
                            <span>{t("listen", language)}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Help text */}
      <Card className="mt-8 bg-rural-greenLight/65 border border-rural-green/25">
        <p className="text-sm text-rural-greenDark leading-6">
          {t("offline-tip", language)}
        </p>
      </Card>

      {/* Home button */}
      <div className="mt-8">
        <Link href="/">
          <Button size="lg" className="w-full">
            🏠 {t("homepage", language)}
          </Button>
        </Link>
      </div>
    </main>
  );
}
