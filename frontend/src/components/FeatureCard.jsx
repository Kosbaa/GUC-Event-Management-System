// src/components/FeatureCard.jsx
import React from "react";

export default function FeatureCard({ icon, title, description, gradient }) {
  const gradientClasses = {
    purple: "from-purple-500 to-pink-500",
    blue: "from-blue-500 to-cyan-500",
    gold: "from-yellow-500 to-orange-500"
  };

  return (
    <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-yellow-500"></div>
      <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradientClasses[gradient]} flex items-center justify-center text-3xl mx-auto mb-6`}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
      <p className="text-gray-300 leading-relaxed">{description}</p>
    </div>
  );
}
