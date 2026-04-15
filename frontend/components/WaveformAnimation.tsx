"use client";

import React from "react";

export default function WaveformAnimation() {
  return (
    <div className="flex items-end justify-center gap-1 h-16" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-1.5 bg-gradient-to-t from-rural-greenDark to-rural-green rounded-full animate-bounce-subtle"
          style={{
            height: `${20 + i * 10}px`,
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}
