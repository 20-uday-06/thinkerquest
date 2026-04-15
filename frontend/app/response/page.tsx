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
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-rural-greenLight via-rural-cream to-rural-yellow">
      {/* Success icon */}
      <div className="text-8xl mb-6 animate-bounce-subtle">✓</div>

      {/* Response display */}
      <Card className="max-w-md mb-8 bg-rural-green border-2 border-rural-green text-center">
        <h2 className="text-xl font-bold text-white mb-4">आपकी {topic}</h2>
        <p className="text-sm text-gray-100 leading-6 mb-4">{response}</p>

        <button
          onClick={() => {
            if ("speechSynthesis" in window) {
              const utterance = new SpeechSynthesisUtterance(response);
              utterance.lang = "hi-IN";
              utterance.rate = 0.9;
              window.speechSynthesis.cancel();
              window.speechSynthesis.speak(utterance);
            }
          }}
          className="text-sm text-white hover:opacity-70 flex items-center justify-center gap-2 w-full font-semibold"
        >
          <span>🔊</span>
          <span>सुनें</span>
        </button>
      </Card>

      {/* Continuation prompt */}
      <Card className="max-w-md mb-8 text-center bg-rural-white">
        <p className="text-lg font-semibold text-slate-900 mb-4">
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
      <div className="max-w-md w-full space-y-2">
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
