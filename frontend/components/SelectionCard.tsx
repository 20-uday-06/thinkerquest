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
      className={`w-full rounded-2xl p-6 transition-all duration-200 active:scale-95 ${
        isSelected
          ? "bg-rural-green text-white shadow-soft-lg scale-105"
          : "bg-rural-white text-slate-900 shadow-soft hover:shadow-soft-lg border-2 border-transparent"
      }`}
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-xl font-semibold">{label}</h3>
      {description && (
        <p className={`text-sm mt-1 ${isSelected ? "text-green-50" : "text-slate-600"}`}>
          {description}
        </p>
      )}
    </button>
  );
}
