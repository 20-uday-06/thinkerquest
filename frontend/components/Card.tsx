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
      className={`rounded-2xl bg-rural-white p-5 shadow-soft transition-all duration-200 ${
        hover
          ? "cursor-pointer hover:shadow-soft-lg hover:scale-105 active:scale-98"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
