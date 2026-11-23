/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8F7FF",
        card: "#FFFFFF",
        primary: {
          DEFAULT: "#7C3AED",
          foreground: "#FFFFFF",
          deep: "#5B21B6",
          light: "#EDE9FE",
          accent: "#C4B5FD",
        },
        lavender: "#EDE9FE",
        lilac: {
          DEFAULT: "#C4B5FD",
          light: "#F3F0FF",
          dark: "#7C3AED",
        },
        surface: {
          card: "#FFFFFF",
          muted: "#F1EEFA",
        },
        textColor: {
          primary: "#25213C",
          secondary: "#625D75",
        },
        border: "#E9E5F4",
        status: {
          success: "#15803D",
          warning: "#B45309",
          error: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      boxShadow: {
        soft: "0 2px 10px rgba(124, 58, 237, 0.05)",
        card: "0 4px 20px -2px rgba(91, 33, 182, 0.06)",
        hover: "0 10px 25px -5px rgba(91, 33, 182, 0.12)",
      },
    },
  },
  plugins: [],
};
