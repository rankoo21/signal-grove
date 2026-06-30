import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        soil: {
          black: "#050706",
          moss: "#08110D",
          root: "#3C2B1F",
        },
        bio: {
          green: "#7CFFB2",
          ice: "#8DDCFF",
          gold: "#FFD978",
          violet: "#4B2C7A",
          mist: "#EAFBF2",
          amber: "#FFB86B",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      keyframes: {
        breathe: {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.04)" },
        },
        drift: {
          "0%": { transform: "translateY(0) translateX(0)" },
          "50%": { transform: "translateY(-18px) translateX(8px)" },
          "100%": { transform: "translateY(0) translateX(0)" },
        },
        sap: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        breathe: "breathe 6s ease-in-out infinite",
        drift: "drift 14s ease-in-out infinite",
        sap: "sap 8s linear infinite",
        "spin-slow": "spin-slow 40s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
