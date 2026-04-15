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
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-[0.01em] transition-all duration-200 active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none";

  const variantClasses = {
    primary:
      "bg-gradient-to-br from-rural-green to-rural-greenDark text-white shadow-lux hover:shadow-lux-lg hover:-translate-y-0.5",
    secondary:
      "bg-rural-greenLight text-rural-greenDark hover:bg-emerald-100 shadow-soft border border-emerald-200/70",
    ghost: "hover:bg-rural-greenLight/70 text-rural-greenDark",
    outline:
      "border border-rural-green/45 text-rural-greenDark hover:bg-rural-greenLight/65",
  };

  const sizeClasses = {
    sm: "px-4 py-2.5 text-sm",
    md: "px-6 py-3 text-[15px]",
    lg: "px-8 py-3.5 text-base",
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
