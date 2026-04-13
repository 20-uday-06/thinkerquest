"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";

const OFFLINE_FAQS = {
  खेती: [
    {
      id: "1",
      question: "गेहूं की बुवाई कब करें?",
      answer:
        "गेहूं की बुवाई अक्टूबर-नवंबर में करते हैं। सही समय पर बुवाई से अच्छी फसल मिलती है।",
    },
    {
      id: "2",
      question: "सिंचाई कितनी बार करनी चाहिए?",
      answer:
        "गेहूं को 5-6 बार सिंचाई की जरूरत होती है। गर्मी में ज्यादा ध्यान रखें।",
    },
    {
      id: "3",
      question: "खाद कितनी डालनी चाहिए?",
      answer:
        "गेहूं के लिए 120 किग्रा यूरिया प्रति हेक्टेयर दें। पानी देने से पहले खाद डालें।",
    },
  ],
  स्वास्थ्य: [
    {
      id: "4",
      question: "बुखार आने पर क्या करें?",
      answer:
        "ठंडे पानी से शरीर पोंछें, तरल पदार्थ पिएं। अगर 3 दिन से ज्यादा है तो डॉक्टर से मिलें।",
    },
    {
      id: "5",
      question: "पेट दर्द का घरेलू इलाज?",
      answer:
        "छाछ या नमक-चीनी का घोल पिएं। तेल वाली चीजें न खाएं।",
    },
    {
      id: "6",
      question: "सिर दर्द से बचने के लिए क्या करें?",
      answer:
        "पर्याप्त पानी पिएं, पर्यावरण से दूर रहें। नियमित नींद लें।",
    },
  ],
};

interface ExpandedFAQ {
  category: string;
  itemId: string;
}

export default function OfflineModePage() {
  const [expandedFAQ, setExpandedFAQ] = useState<ExpandedFAQ | null>(null);

  const toggleExpand = (category: string, itemId: string) => {
    if (expandedFAQ?.category === category && expandedFAQ?.itemId === itemId) {
      setExpandedFAQ(null);
    } else {
      setExpandedFAQ({ category, itemId });
    }
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
            <h1 className="text-2xl font-bold text-slate-900">ऑफ़लाइन मोड</h1>
            <p className="text-sm text-slate-600">📵 इंटरनेट के बिना भी उपयोगी जानकारी पाएं</p>
          </div>
        </div>

        {/* Warning banner */}
        <Card className="bg-yellow-50 border-l-4 border-l-yellow-400">
          <div className="flex gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold text-sm text-yellow-900">
                आप ऑफ़लाइन हैं
              </p>
              <p className="text-xs text-yellow-800 mt-1">
                यह केवल सामान्य जानकारी है। विस्तृत सलाह के लिए इंटरनेट कनेक्ट करें।
              </p>
            </div>
          </div>
        </Card>
      </header>

      {/* FAQ Categories */}
      <div className="space-y-4">
        {Object.entries(OFFLINE_FAQS).map(([category, faqs]) => (
          <Card key={category} className="overflow-hidden">
            <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span>
                {category === "खेती"
                  ? "🌾"
                  : category === "स्वास्थ्य"
                    ? "🏥"
                    : "❓"}
              </span>
              {category} के सवाल
            </h2>

            <div className="space-y-2">
              {faqs.map((faq) => {
                const isExpanded =
                  expandedFAQ?.category === category &&
                  expandedFAQ?.itemId === faq.id;

                return (
                  <button
                    key={faq.id}
                    onClick={() => toggleExpand(category, faq.id)}
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
                          {faq.question}
                        </p>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-rural-greenDark border-opacity-30">
                            <p className="text-sm text-slate-700 leading-6">
                              {faq.answer}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if ("speechSynthesis" in window) {
                                  const utterance =
                                    new SpeechSynthesisUtterance(faq.answer);
                                  utterance.lang = "hi-IN";
                                  utterance.rate = 0.9;
                                  window.speechSynthesis.cancel();
                                  window.speechSynthesis.speak(utterance);
                                }
                              }}
                              className="mt-2 text-xs text-rural-greenDark hover:opacity-70 flex items-center gap-1"
                            >
                              <span>🔊</span>
                              <span>सुनें</span>
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
        ))}
      </div>

      {/* Help text */}
      <Card className="mt-8 bg-blue-50 border-l-4 border-l-blue-400">
        <p className="text-sm text-blue-900 leading-6">
          💡 <strong>सुझाव:</strong> जब आप वापस ऑनलाइन हों तो अपने सभी सवाल
          दोबारा पूछ सकते हैं और विस्तृत जानकारी पा सकते हैं।
        </p>
      </Card>

      {/* Home button */}
      <div className="mt-8">
        <Link href="/">
          <Button size="lg" className="w-full">
            🏠 होम पेज पर जाएं
          </Button>
        </Link>
      </div>
    </main>
  );
}
