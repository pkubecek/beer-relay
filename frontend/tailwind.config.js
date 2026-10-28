/** @type {import('tailwindcss').Config} */
// Paleta podle mockupů PIVoŠ: tmavá „espresso“ hlavička, krémové pozadí, bílé karty a zlatavý (pivní) akcent.
// Názvy tokenů zůstaly kvůli kompatibilitě se stávajícími komponentami (forest = tmavá, foam = krémová…).
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#1E1B17",
          50: "#F7F3EC",
          100: "#EDE6DA",
          700: "#3A342C",
          900: "#1E1B17",
        },
        foam: "#F4EFE6",
        cream: "#EBE4D7",
        line: "#E4DCCD",
        gold: {
          DEFAULT: "#EFB23C",
          50: "#FDF4DF",
          600: "#DB9C22",
        },
        wood: "#8A6D45",
        punch: "#C8452F",
        leaf: "#2E8457",
        violet: "#5B48A8",
        silver: "#CDD1D8",
        bronze: "#D69A6C",
      },
      fontFamily: {
        // Bricolage Grotesque pro nadpisy, Inter pro text (self-hosted přes @fontsource, včetně české diakritiky)
        sans: ["'Inter Variable'", "Inter", "system-ui", "sans-serif"],
        body: ["'Inter Variable'", "Inter", "system-ui", "sans-serif"],
        display: ["'Bricolage Grotesque Variable'", "'Bricolage Grotesque'", "system-ui", "sans-serif"],
        mono: ["'Inter Variable'", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(30,27,23,0.04), 0 2px 8px rgba(30,27,23,0.04)",
        lift: "0 6px 24px rgba(30,27,23,0.10)",
      },
      backgroundImage: {
        "route-dash":
          "repeating-linear-gradient(to bottom, #8A6D45 0, #8A6D45 6px, transparent 6px, transparent 14px)",
      },
    },
  },
  plugins: [],
};
