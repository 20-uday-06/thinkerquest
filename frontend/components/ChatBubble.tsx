"use client";

import React from "react";

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  onSpeak?: () => void;
  onStop?: () => void;
  showSpeakButton?: boolean;
  isPlaying?: boolean;
  language?: "en" | "hi";
}

export default function ChatBubble({
  message,
  isUser,
  onSpeak,
  onStop,
  showSpeakButton = false,
  isPlaying = false,
  language = "en",
}: ChatBubbleProps) {
  const playText = language === "hi" ? "सुनें" : "Play";
  const pauseText = language === "hi" ? "रोकें" : "Pause";

  return (
    <div
      className={`flex gap-2 animate-fade-in ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[86%] md:max-w-[70%] rounded-2xl px-4 py-3.5 shadow-soft border ${
          isUser
            ? "bg-gradient-to-br from-rural-green to-rural-greenDark text-white border-emerald-900/25 rounded-br-md"
            : "bg-white/92 text-slate-900 border-emerald-200 rounded-bl-md"
        }`}
      >
        <p className="text-sm leading-7 whitespace-pre-wrap break-words">{message}</p>

        {!isUser && showSpeakButton && (onSpeak || onStop) && (
          <button
            onClick={isPlaying ? onStop : onSpeak}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-rural-greenDark hover:opacity-80 rounded-full border border-rural-green/25 px-2.5 py-1"
            aria-label={isPlaying ? pauseText : playText}
          >
            <span>{isPlaying ? "⏸" : "▶"}</span>
            <span>{isPlaying ? pauseText : playText}</span>
          </button>
        )}
      </div>
    </div>
  );
}
