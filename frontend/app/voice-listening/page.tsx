"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import WaveformAnimation from "@/components/WaveformAnimation";
import Button from "@/components/Button";

export default function VoiceListeningPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.back();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const handleCancel = () => {
    router.back();
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-rural-greenLight via-rural-cream to-rural-yellow relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-rural-green rounded-full opacity-10 blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-rural-yellow rounded-full opacity-10 blur-3xl" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-md">
        {/* Large microphone icon */}
        <div className="text-8xl mb-8 animate-bounce-subtle">🎤</div>

        {/* Waveform animation */}
        <div className="mb-12">
          <WaveformAnimation />
        </div>

        {/* Status text */}
        <h1 className="text-3xl font-bold text-slate-900 mb-3">सुन रहे हैं...</h1>
        <p className="text-lg text-slate-600 mb-8">बोलिए...</p>

        {/* Countdown */}
        <Card className="mb-8 bg-rural-greenLight border-2 border-rural-green">
          <p className="text-sm text-slate-600">
            आपकी बात सुनने के लिए तैयार है
          </p>
          <p className="text-3xl font-bold text-rural-greenDark mt-2">
            {countdown}s
          </p>
        </Card>

        {/* Cancel button */}
        <Button
          variant="outline"
          size="md"
          onClick={handleCancel}
          className="shadow-soft-lg"
        >
          ✕ रद्द करें
        </Button>

        {/* Tip */}
        <p className="mt-12 text-xs text-slate-500 text-center leading-relaxed">
          💡 स्पष्ट और धीरे-धीरे बोलें। जब आप बोलना समाप्त करें तो रुकें।
        </p>
      </div>
    </main>
  );
}
