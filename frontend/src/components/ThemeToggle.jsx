import React from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const ThemeToggle = ({ className = "" }) => {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle light or dark mode"
      className={`group relative inline-flex items-center gap-2 rounded-full border border-gray-700/60 bg-gray-900/70 px-3 py-2 text-sm font-semibold text-gray-100 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg hover:border-yellow-400/70 hover:bg-gray-800/70 ${className}`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
          isLight
            ? "bg-yellow-400/90 text-gray-900"
            : "bg-gray-800 text-yellow-200"
        }`}
      >
        {isLight ? <SunMedium size={16} /> : <MoonStar size={16} />}
      </span>
      <span className="pr-1">
        {isLight ? "Light" : "Dark"}
      </span>
      <span
        className={`absolute inset-0 -z-10 rounded-full opacity-0 blur-lg transition group-hover:opacity-60 ${
          isLight ? "bg-yellow-300/50" : "bg-blue-500/30"
        }`}
      />
    </button>
  );
};

export default ThemeToggle;
