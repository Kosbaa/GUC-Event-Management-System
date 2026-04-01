// src/components/Input.jsx
import React from "react";
export default function Input({
  id,
  name,
  type = "text",
  value,
  onChange,
  label,
  placeholder = "",
  error = "",
  className = "",
}) {
  const inputId = id || name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="guc-label">
          {label}
        </label>
      )}

      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`guc-input ${error ? "guc-input--error" : ""} ${className}`}
      />

      {error && <p className="guc-error-text">{error}</p>}
    </div>
  );
}
