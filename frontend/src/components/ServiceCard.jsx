// src/components/ServiceCard.jsx
import React from "react";

export default function ServiceCard({ icon, title, description, linkText, linkHref }) {
  return (
    <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-2xl">
      <div className="text-4xl mb-6">{icon}</div>
      <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
      <p className="text-gray-300 mb-6 leading-relaxed">{description}</p>
      <a 
        href={linkHref}
        className="text-yellow-400 font-semibold hover:text-yellow-300 transition-colors duration-200 flex items-center gap-2"
      >
        {linkText} →
      </a>
    </div>
  );
}
