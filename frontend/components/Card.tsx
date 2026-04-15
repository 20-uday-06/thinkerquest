"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export default function Card({
  children,
  className = "",
  onClick,
  hover = false,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`glass-panel rounded-2xl p-5 shadow-soft transition-all duration-300 ${
        hover
          ? "cursor-pointer hover:shadow-soft-lg hover:-translate-y-0.5 active:scale-[0.99]"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
