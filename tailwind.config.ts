import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "soviet-red": "#BE1E2D",
        "soviet-cream": "#F5F5DC",
        "soviet-black": "#0A0A0A",
        "tech-cyan": "#00F0FF",
      },
      fontFamily: {
        header: ["var(--font-unbounded)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
