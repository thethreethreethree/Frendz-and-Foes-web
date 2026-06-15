/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bangers"', "system-ui", "cursive"],
        sans: ['"Outfit"', "system-ui", "sans-serif"],
      },
      colors: {
        // Refreshed palette: cream canvas, deep-navy outlines, paint-splatter accents
        // (matches the new brain/lightbulb brand art).
        ink: "#15263f",
        concrete: "#efeae0", // cream canvas (kept the name so existing classes shift over)
        cream: "#f4f1ea",
        pink: "#ff2e9a",
        teal: "#16a3a3",
        sun: "#f7c948",
        grape: "#8a4bff",
        tang: "#f0612f",
        coral: "#ef5a3c",
        // Buzzer colors per the game rules.
        buzz: {
          green: "#22c55e",
          blue: "#3b82f6",
        },
      },
      boxShadow: {
        sticker: "0 6px 0 rgba(0,0,0,0.35), 0 10px 22px rgba(0,0,0,0.25)",
        pop: "0 4px 0 rgba(0,0,0,0.4)",
      },
      keyframes: {
        flashGreen: {
          "0%,100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(34,197,94,0.7)" },
          "50%": { opacity: "0.45", boxShadow: "0 0 0 8px rgba(34,197,94,0)" },
        },
        pop: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "70%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        flashGreen: "flashGreen 0.7s ease-in-out infinite",
        pop: "pop 0.35s cubic-bezier(.2,1.3,.5,1) both",
        floaty: "floaty 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
