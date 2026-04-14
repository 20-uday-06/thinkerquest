"use client";

import React, { useState } from "react";
import Button from "./Button";

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
        className={`max-w-xs rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-rural-green text-white rounded-br-none"
            : "bg-rural-greenLight text-slate-900 rounded-bl-none"
        }`}
      >
        <p className="text-sm leading-6">{message}</p>

        {!isUser && showSpeakButton && (onSpeak || onStop) && (
          <button
            onClick={isPlaying ? onStop : onSpeak}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-rural-greenDark hover:opacity-80"
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
