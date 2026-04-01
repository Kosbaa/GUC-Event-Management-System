// src/components/ui/Button.jsx
import React from "react";
export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary", // "primary" | "secondary" | "outline"
  className = "",
  disabled = false,
  fullWidth = false,
}) {
  const base = "guc-btn";
  const width = fullWidth ? "guc-btn--block" : "";
  const variantClass =
    variant === "secondary"
      ? "guc-btn--secondary"
      : variant === "outline"
      ? "guc-btn--outline"
      : "guc-btn--primary";

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      className={`${base} ${variantClass} ${width} ${className}`}
      disabled={disabled}
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
}
