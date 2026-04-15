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
      className="relative h-28 w-28 mx-auto"
      aria-label="माइक्रोफोन शुरू करें"
    >
      {/* Outer pulsing ring */}
      {(isListening || isLoading) && (
        <div
          className="absolute inset-0 rounded-full bg-rural-green/30 animate-pulse-glow"
          aria-hidden
        />
      )}

      <div
        className="absolute inset-2 rounded-full border border-rural-green/20 bg-white/45 backdrop-blur-sm"
        aria-hidden
      />

      {/* Main button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`h-20 w-20 rounded-full flex items-center justify-center text-4xl transition-all duration-200 ${
            disabled
              ? "bg-slate-300 cursor-not-allowed"
              : isListening
                ? "bg-gradient-to-br from-rose-500 to-rose-700 animate-pulse shadow-lux"
                : "bg-gradient-to-br from-rural-green to-rural-greenDark hover:shadow-lux-lg shadow-lux active:scale-[0.98]"
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
      <div className="absolute -bottom-11 left-0 right-0 text-center text-xs font-semibold text-slate-700 whitespace-nowrap">
        {isListening
          ? "सुन रहे हैं..."
          : isLoading
            ? "प्रक्रिया जारी..."
            : "टैप करें"}
      </div>
    </button>
  );
}
