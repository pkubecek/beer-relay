/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#1F2A1C",
          50: "#F3F6F1",
          100: "#E1E9DD",
          700: "#2E3D27",
          900: "#1F2A1C",
        },
        foam: "#FFF8E7",
        gold: {
          DEFAULT: "#F2C744",
          600: "#D9A91E",
        },
        wood: "#8C5A2B",
        punch: "#C43B3B",
        leaf: "#4A7043",
      },
      fontFamily: {
        display: ["'Big Shoulders'", "sans-serif"],
        body: ["'Work Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        "route-dash":
          "repeating-linear-gradient(to bottom, #8C5A2B 0, #8C5A2B 6px, transparent 6px, transparent 14px)",
      },
    },
  },
  plugins: [],
};
