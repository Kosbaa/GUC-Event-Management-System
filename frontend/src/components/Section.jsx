// src/components/Section.jsx
import React from "react";

export default function Section({ 
  id, 
  children, 
  className = "", 
  background = "dark",
  padding = "py-24"
}) {
  const backgroundClasses = {
    dark: "bg-gray-900",
    darker: "bg-black",
    gradient: "bg-gradient-to-br from-gray-900 to-gray-800"
  };

  return (
    <section 
      id={id}
      className={`${backgroundClasses[background]} ${padding} ${className}`}
    >
      <div className="max-w-7xl mx-auto px-6">
        {children}
      </div>
    </section>
  );
}
