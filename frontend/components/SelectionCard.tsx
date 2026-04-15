"use client";

import React from "react";

interface SelectionCardProps {
  icon: string;
  label: string;
  description?: string;
  onClick: () => void;
  isSelected?: boolean;
}

export default function SelectionCard({
  icon,
  label,
  description,
  onClick,
  isSelected = false,
}: SelectionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl p-6 text-left transition-all duration-300 active:scale-[0.99] ${
        isSelected
          ? "bg-gradient-to-br from-rural-green to-rural-greenDark text-white shadow-lux-lg border border-emerald-500/30"
          : "glass-panel text-slate-900 shadow-soft border border-rural-green/15 hover:shadow-lux"
      }`}
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-xl font-semibold luxury-heading">{label}</h3>
      {description && (
        <p className={`text-sm mt-2 leading-6 ${isSelected ? "text-emerald-50" : "text-slate-700"}`}>
          {description}
        </p>
      )}
    </button>
  );
}
