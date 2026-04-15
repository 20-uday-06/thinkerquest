"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Card from "@/components/Card";
import Button from "@/components/Button";

function ResponseContent() {
  const searchParams = useSearchParams();
  const response =
    searchParams.get("response") || "आपके सवाल का जवाब तैयार है।";
  const topic = searchParams.get("topic") || "सलाह";

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-6 app-shell">
      {/* Success icon */}
      <div className="text-7xl mb-5 animate-float-slow">✓</div>

      {/* Response display */}
      <Card className="max-w-lg mb-7 bg-white/90 border border-rural-green/25 text-center">
        <h2 className="text-2xl luxury-heading text-rural-greenDark mb-4">आपकी {topic}</h2>
        <p className="text-sm text-slate-800 leading-7 mb-4">{response}</p>

        <button
          onClick={() => {
            if ("speechSynthesis" in window) {
              const utterance = new SpeechSynthesisUtterance(response);
              utterance.lang = "hi-IN";
              utterance.rate = 1.0;
              window.speechSynthesis.cancel();
              window.speechSynthesis.speak(utterance);
            }
          }}
          className="text-sm text-rural-greenDark hover:opacity-70 inline-flex items-center justify-center gap-2 border border-rural-green/25 rounded-full px-3 py-1.5"
        >
          <span>🔊</span>
          <span>सुनें</span>
        </button>
      </Card>

      {/* Continuation prompt */}
      <Card className="max-w-lg mb-8 text-center bg-white/88 border border-rural-green/20">
        <p className="text-lg font-semibold text-slate-900 mb-4 luxury-heading">
          क्या आप और कुछ पूछना चाहते हैं?
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Button size="md" className="w-full">
            <span>🎤</span>
            <span>बोलें</span>
          </Button>
          <Button variant="secondary" size="md" className="w-full">
            <span>⌨️</span>
            <span>टाइप करें</span>
          </Button>
        </div>
      </Card>

      {/* Navigation buttons */}
      <div className="max-w-lg w-full space-y-2">
        <Link href="/chat" className="block">
          <Button size="md" variant="outline" className="w-full">
            💬 और सवाल
          </Button>
        </Link>
        <Link href="/" className="block">
          <Button size="md" variant="ghost" className="w-full">
            🏠 होम पेज
          </Button>
        </Link>
      </div>
    </main>
  );
}

export default function ResponsePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-rural-cream flex items-center justify-center">लोड हो रहा है...</div>}>
      <ResponseContent />
    </Suspense>
  );
}
