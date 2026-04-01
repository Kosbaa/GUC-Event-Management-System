// src/components/Card.jsx
import React from "react";
export default function Card({
  children,
  className = "",
  header,
  title,
  subtitle,
}) {
  return (
    <div className={`guc-card ${className}`}>
      {header && (
        <div className="guc-card__header">
          {title && <h1 className="guc-card__title">{title}</h1>}
          {subtitle && <p className="guc-card__subtitle">{subtitle}</p>}
        </div>
      )}
      <div className="guc-card__body">{children}</div>
    </div>
  );
}
