"use client";

import React from "react";

interface MicButtonProps {
  isListening: boolean;
  isLoading: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export default function MicButton({
  isListening,
  isLoading,
  disabled = false,
  onClick,
}: MicButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative h-24 w-24 mx-auto"
      aria-label="माइक्रोफोन शुरू करें"
    >
      {/* Outer pulsing ring */}
      {(isListening || isLoading) && (
        <div
          className="absolute inset-0 rounded-full bg-rural-green opacity-20 animate-pulse-glow"
          aria-hidden
        />
      )}

      {/* Main button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`h-20 w-20 rounded-full flex items-center justify-center text-4xl transition-all duration-200 ${
            disabled
              ? "bg-slate-300 cursor-not-allowed"
              : isListening
                ? "bg-red-500 animate-pulse shadow-soft-lg"
                : "bg-rural-green hover:bg-rural-greenDark shadow-soft-lg active:scale-95"
          }`}
        >
          {isLoading ? (
            <span className="animate-spin">⟳</span>
          ) : isListening ? (
            "🎤"
          ) : (
            "🎤"
          )}
        </div>
      </div>

      {/* Status text below */}
      <div className="absolute -bottom-12 left-0 right-0 text-center text-xs font-medium text-slate-600 whitespace-nowrap">
        {isListening
          ? "सुन रहे हैं..."
          : isLoading
            ? "प्रक्रिया जारी..."
            : "टैप करें"}
      </div>
    </button>
  );
}
