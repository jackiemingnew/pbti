import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        gold: "0 0 32px rgba(245, 158, 11, 0.22)",
        blood: "0 0 34px rgba(220, 38, 38, 0.22)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        ember: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        ember: "ember 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
