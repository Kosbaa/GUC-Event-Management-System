import React from "react";

export default function Loader({ size = "md", color = "primary" }) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-10 h-10 border-4",
  };

  return (
    <div
      className={`animate-spin rounded-full border-t-transparent border-${color} ${sizeClasses[size]}`}
    />
  );
}
