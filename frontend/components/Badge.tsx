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
    success: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
    warning: "bg-yellow-100 text-yellow-800",
    info: "bg-blue-100 text-blue-800",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
