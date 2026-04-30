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
          bg:        "#0B0E1A",
          card:      "#131729",
          card2:     "#1A1F35",
          border:    "#252B45",
          purple:    "#7C3AED",
          "purple-lt": "#A78BFA",
          "purple-dim": "#3B1F7A",
          green:     "#10B981",
          "green-dim": "#064E3B",
          red:       "#EF4444",
          "red-dim": "#7F1D1D",
          amber:     "#F59E0B",
          "amber-dim": "#78350F",
          blue:      "#3B82F6",
          teal:      "#14B8A6",
          text:      "#F1F5F9",
          muted:     "#94A3B8",
          dim:       "#64748B",
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
