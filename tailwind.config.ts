import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "var(--bg-page)",
        card: "var(--bg-card)",
        "card-hover": "var(--bg-card-hover)",
        elevated: "var(--bg-elevated)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        text: "var(--text-primary)",
        "text-muted": "var(--text-muted)",
        "text-faint": "var(--text-faint)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
      },
      borderRadius: {
        DEFAULT: "var(--r)",
        lg: "var(--r2)",
        xl: "var(--r3)",
        "2xl": "var(--r4)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
    },
  },
  plugins: [],
} satisfies Config;
