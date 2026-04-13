"use client";

import React from "react";
import Button from "./Button";

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  onSpeak?: () => void;
  showSpeakButton?: boolean;
}

export default function ChatBubble({
  message,
  isUser,
  onSpeak,
  showSpeakButton = false,
}: ChatBubbleProps) {
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

        {!isUser && showSpeakButton && onSpeak && (
          <button
            onClick={onSpeak}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-rural-greenDark hover:opacity-80"
            aria-label="संदेश सुनें"
          >
            <span>🔊</span>
            <span>सुनें</span>
          </button>
        )}
      </div>
    </div>
  );
}
