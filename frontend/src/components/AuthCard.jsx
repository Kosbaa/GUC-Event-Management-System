import React from "react";
import Card from "./Card";

export default function AuthCard({ title, subtitle, children }) {
  return (
    <Card className="w-full max-w-md p-8 space-y-6 bg-base-100">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-primary">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </Card>
  );
}
