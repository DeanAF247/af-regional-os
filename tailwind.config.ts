import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg:        "#FFFFFF",
          card:      "#FFFFFF",
          card2:     "#F8FAFC",
          border:    "#E2E8F0",
          purple:    "#7C3AED",
          "purple-lt": "#6D28D9",
          "purple-dim": "#EDE9FE",
          green:     "#059669",
          "green-dim": "#D1FAE5",
          red:       "#EF4444",
          "red-dim": "#FEE2E2",
          amber:     "#D97706",
          "amber-dim": "#FEF3C7",
          blue:      "#3B82F6",
          teal:      "#14B8A6",
          text:      "#0F172A",
          muted:     "#64748B",
          dim:       "#94A3B8",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
