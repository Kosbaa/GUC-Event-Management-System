// src/components/Alert.jsx
import React from "react";
import { XCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

const getClassName = (type) => {
  switch (type) {
    case "success":
      return "guc-alert guc-alert--success";
    case "error":
      return "guc-alert guc-alert--error";
    case "warning":
      return "guc-alert guc-alert--warning";
    case "info":
    default:
      return "guc-alert guc-alert--info";
  }
};

const getIcon = (type) => {
  const base = { width: 18, height: 18 };
  switch (type) {
    case "success":
      return <CheckCircle {...base} />;
    case "error":
      return <XCircle {...base} />;
    case "warning":
      return <AlertTriangle {...base} />;
    case "info":
    default:
      return <Info {...base} />;
  }
};

export default function Alert({ type = "info", children }) {
  return (
    <div className={getClassName(type)} role="alert">
      {getIcon(type)}
      <span>{children}</span>
    </div>
  );
}
