"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  isLoading?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  children,
  isLoading = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const baseClasses =
    "font-medium rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2";

  const variantClasses = {
    primary:
      "bg-rural-green text-white shadow-soft hover:bg-rural-greenDark active:bg-rural-greenDark",
    secondary:
      "bg-rural-greenLight text-rural-greenDark hover:bg-green-200 shadow-soft",
    ghost: "hover:bg-rural-cream text-slate-700",
    outline:
      "border-2 border-rural-green text-rural-green hover:bg-rural-greenLight",
  };

  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {isLoading ? <span className="animate-spin">⟳</span> : null}
      {children}
    </button>
  );
}
