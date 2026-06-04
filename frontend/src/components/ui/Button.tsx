"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  state?: "idle" | "loading" | "success" | "error";
  loadingText?: string;
  successText?: string;
  errorText?: string;
}

export default function Button({
  children,
  state = "idle",
  loadingText = "Processing...",
  successText = "Success ✓",
  errorText = "Failed ✗",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  // Determine color theme based on active state
  let bgStyles = "bg-[#4D0711] hover:bg-[#3D1510] text-[#D9D9DA] focus:ring-[#65483B]";
  
  if (state === "loading") {
    bgStyles = "bg-[#c3902c] cursor-not-allowed text-white opacity-85";
  } else if (state === "success") {
    bgStyles = "bg-emerald-700 text-white cursor-default";
  } else if (state === "error") {
    bgStyles = "bg-red-800 text-white cursor-default animate-shake";
  }

  const isBtnDisabled = disabled || state === "loading" || state === "success";

  return (
    <button
      disabled={isBtnDisabled}
      className={`relative flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 min-h-[40px] ${bgStyles} ${className}`}
      {...props}
    >
      {state === "loading" && (
        <svg
          className="h-4 w-4 animate-spin text-white"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}

      {state === "success" && (
        <svg
          className="h-4 w-4 text-white animate-scaleUp"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}

      {state === "error" && (
        <svg
          className="h-4 w-4 text-white animate-wiggle"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}

      <span>
        {state === "loading" && loadingText}
        {state === "success" && successText}
        {state === "error" && errorText}
        {state === "idle" && children}
      </span>
    </button>
  );
}
