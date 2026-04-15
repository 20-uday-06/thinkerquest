"use client";

import React from "react";

interface BadgeProps {
  variant?: "success" | "error" | "warning" | "info";
  children: React.ReactNode;
  className?: string;
}

export default function Badge({
  variant = "info",
  children,
  className = "",
}: BadgeProps) {
  const variantClasses = {
    success: "bg-emerald-100 text-emerald-900 border border-emerald-300/70",
    error: "bg-rose-100 text-rose-900 border border-rose-300/70",
    warning: "bg-amber-100 text-amber-900 border border-amber-300/70",
    info: "bg-rural-greenLight text-rural-greenDark border border-rural-green/30",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-[0.01em] ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
