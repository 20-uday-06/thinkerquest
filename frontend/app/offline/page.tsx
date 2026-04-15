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
    <main className="min-h-screen w-full flex flex-col p-4 pb-safe bg-gradient-to-b from-rural-cream via-rural-yellow to-rural-cream safe-area">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="text-2xl hover:opacity-70 transition-opacity"
          >
            ←
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t("offline-mode", language)}</h1>
            <p className="text-sm text-slate-600">{t("offline-help", language)}</p>
          </div>
        </div>

        {/* Warning banner */}
        <Card className="bg-yellow-50 border-l-4 border-l-yellow-400">
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
        <Card key="farm" className="overflow-hidden">
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
                      ? "bg-rural-greenLight border-2 border-rural-green"
                      : "bg-rural-cream hover:bg-rural-greenLight border-2 border-transparent"
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
                            className="mt-2 text-xs text-rural-greenDark hover:opacity-70 flex items-center gap-1"
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
        <Card key="health" className="overflow-hidden">
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
                      ? "bg-rural-greenLight border-2 border-rural-green"
                      : "bg-rural-cream hover:bg-rural-greenLight border-2 border-transparent"
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
                            className="mt-2 text-xs text-rural-greenDark hover:opacity-70 flex items-center gap-1"
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
      <Card className="mt-8 bg-blue-50 border-l-4 border-l-blue-400">
        <p className="text-sm text-blue-900 leading-6">
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
