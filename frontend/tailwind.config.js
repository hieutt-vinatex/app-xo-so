/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        lotto: {
          red: "#C92A2A",
          orange: "#EA580C",
          gold: "#D99A13",
          navy: "#172033",
        },
        brand: {
          green: "#17CB74",
          teal: "#1BB5A2",
          cyan: "#25A5D3",
          blue: "#347CFE",
        },
        surface: {
          bg: "#F7F6F2",
          card: "#FFFFFF",
        },
        ink: {
          DEFAULT: "#24272B",
          soft: "#6B7280",
        },
        line: "#E5E7EB",
        state: {
          success: "#16A34A",
          danger: "#E5484D",
          warning: "#F59E0B",
        },
      },
      borderRadius: {
        xl2: "16px",
        xl3: "24px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)",
        cardhover: "0 8px 24px rgba(16,24,40,0.10)",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #C92A2A 0%, #EA580C 55%, #D99A13 100%)",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
