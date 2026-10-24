import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0f1a",
        panel: "#141b2b",
        "panel-2": "#1c2639",
        border: "#273349",
        content: "#e5ecf5",
        muted: "#8ba0bf",
        favorable: "#34d399",
        "favorable-alt": "#a3e635",
        caution: "#fbbf24",
        excluded: "#64748b",
        unavailable: "#475569",
        risk: "#f87171",
        accent: "#38bdf8",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
