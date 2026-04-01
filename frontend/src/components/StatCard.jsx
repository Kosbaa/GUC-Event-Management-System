// src/components/StatCard.jsx
import React from "react";

export default function StatCard({ number, label, gradient }) {
  const gradientClasses = {
    red: "from-red-500 to-orange-500",
    yellow: "from-yellow-500 to-orange-500", 
    purple: "from-purple-500 to-red-500"
  };

  return (
    <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-2xl">
      <div className={`bg-gradient-to-r ${gradientClasses[gradient]} rounded-lg p-6 mb-4`}>
        <h3 className="text-4xl font-bold text-white">{number}</h3>
      </div>
      <p className="text-gray-300 text-lg font-medium">{label}</p>
    </div>
  );
}
