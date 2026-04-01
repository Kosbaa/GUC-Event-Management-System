// tailwind.config.js
module.exports = {
  content: ["./public/index.html", "./src/**/*.{js,jsx,ts,tsx,html}"],
  safelist: [
    // button variants used dynamically
    "btn",
    "btn-primary",
    "btn-secondary",
    "btn-accent",
    "btn-ghost",
    "btn-outline",
    "btn-link",
    // form controls
    "input",
    "input-bordered",
    "input-error",
    // alert
    "alert",
    "alert-success",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    styled: true,
    themes: [
      {
        gucTheme: {
          primary: "#0EA5E9",          // teal-500
          "primary-focus": "#0284C7",  // teal-600
          "primary-content": "#ffffff",

          secondary: "#1E3A8A",        // blue-900
          "secondary-focus": "#1E40AF",
          "secondary-content": "#ffffff",

          accent: "#38BDF8",           
          "accent-focus": "#0EA5E9",
          "accent-content": "#ffffff",

          neutral: "#111827",
          "neutral-focus": "#1F2937",
          "neutral-content": "#ffffff",

          "base-100": "#ffffff",
          "base-200": "#F9FAFB",
          "base-300": "#E5E7EB",
          "base-content": "#1F2937",

          "--rounded-box": "1rem",
          "--rounded-btn": "0.5rem",
          "--rounded-badge": "1rem",
          "--animation-btn": "0.15s",
          "--btn-text-case": "none",
          "--btn-focus-scale": "0.98"
        },
      },
      "light", // keep defaults if you want fallback
    ],
    darkTheme: "gucTheme", // optional
  },
};
