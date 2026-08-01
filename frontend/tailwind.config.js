/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        "paper-raised": "var(--paper-raised)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        "ink-faint": "var(--ink-faint)",
        line: "var(--line)",
        accent: "var(--accent)",
        onaccent: "var(--on-accent)",
        verified: "var(--verified)",
        aging: "var(--aging)",
        stale: "var(--stale)",
        "verified-bg": "var(--verified-bg)",
        "aging-bg": "var(--aging-bg)",
        "stale-bg": "var(--stale-bg)",
      },
      fontFamily: {
        serif: ["Charter", "Iowan Old Style", "Georgia", "Times New Roman", "serif"],
        sans: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        mono: ["SF Mono", "Cascadia Code", "Consolas", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
