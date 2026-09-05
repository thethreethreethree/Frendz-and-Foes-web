/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Fonts resolve through CSS variables so a brand can swap the type at runtime
      // (see src/brand/theme.ts). Defaults are set on :root in index.css.
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      // WHITE-LABEL TOKENS. Every color resolves `rgb(var(--c-x) / <alpha-value>)`, so the
      // whole app recolors from the --c-* variables that a Brand writes onto <html>. The
      // `<alpha-value>` placeholder is what keeps Tailwind alpha modifiers (bg-primary/70)
      // working. Legacy names (pink/teal/cream/…) are kept as aliases onto the new semantic
      // tokens so the 370 existing color usages shift over without a rewrite.
      colors: {
        // semantic tokens (new)
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        canvas: "rgb(var(--c-canvas) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        primary: "rgb(var(--c-primary) / <alpha-value>)",
        "primary-ink": "rgb(var(--c-primary-ink) / <alpha-value>)",
        secondary: "rgb(var(--c-secondary) / <alpha-value>)",
        accent: "rgb(var(--c-accent) / <alpha-value>)",
        success: "rgb(var(--c-success) / <alpha-value>)",
        danger: "rgb(var(--c-danger) / <alpha-value>)",
        warning: "rgb(var(--c-warning) / <alpha-value>)",
        info: "rgb(var(--c-info) / <alpha-value>)",
        // legacy aliases (kept so existing classes keep working, now brandable)
        concrete: "rgb(var(--c-canvas) / <alpha-value>)",
        cream: "rgb(var(--c-canvas) / <alpha-value>)",
        pink: "rgb(var(--c-primary) / <alpha-value>)",
        teal: "rgb(var(--c-secondary) / <alpha-value>)",
        sun: "rgb(var(--c-sun) / <alpha-value>)",
        grape: "rgb(var(--c-grape) / <alpha-value>)",
        tang: "rgb(var(--c-tang) / <alpha-value>)",
        coral: "rgb(var(--c-coral) / <alpha-value>)",
        buzz: {
          green: "rgb(var(--c-success) / <alpha-value>)",
          blue: "rgb(var(--c-info) / <alpha-value>)",
        },
      },
      boxShadow: {
        // Premium soft shadows (replaced the old hard "sticker" offset look).
        sticker: "0 1px 2px rgb(15 23 42 / 0.06), 0 12px 32px -14px rgb(15 23 42 / 0.30)",
        pop: "0 1px 2px rgb(15 23 42 / 0.08), 0 8px 20px -10px rgb(15 23 42 / 0.35)",
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
