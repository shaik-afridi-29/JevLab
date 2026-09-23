import type { Config } from "tailwindcss";

// Palette colors are CSS variables so a single `.light` block in
// globals.css can re-skin the whole app without touching components.
// Dark values below match the original dark-first design exactly.
const withAlpha = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: withAlpha("--ink-950"),
          900: withAlpha("--ink-900"),
          850: withAlpha("--ink-850"),
          800: withAlpha("--ink-800"),
          750: withAlpha("--ink-750"),
          700: withAlpha("--ink-700"),
        },
        mist: {
          100: withAlpha("--mist-100"),
          200: withAlpha("--mist-200"),
          300: withAlpha("--mist-300"),
          400: withAlpha("--mist-400"),
          500: withAlpha("--mist-500"),
        },
        signal: {
          true: withAlpha("--signal-true"),
          false: withAlpha("--signal-false"),
          unsure: withAlpha("--signal-unsure"),
          info: withAlpha("--signal-info"),
          violet: withAlpha("--signal-violet"),
        },
        // Theme-aware replacements for white-alpha overlays/borders,
        // which assume a dark background and vanish in light mode.
        line: withAlpha("--line"),
        wash: withAlpha("--wash"),
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
        pop: "0 12px 40px -12px rgba(0,0,0,0.7)",
      },
    },
  },
  plugins: [],
};

export default config;
