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
        primary: {
          50: "#e5f3f7",
          100: "#d1e8ef",
          200: "#a3d1df",
          300: "#8fb8ef",
          400: "#82a6c7",
          500: "#3b79da",
          600: "#1e58ca",
          700: "#1a4ba8",
          800: "#153d86",
          900: "#0f2f64",
          950: "#0a1f42",
        },
        secondary: {
          50: "#f0fdf7",
          100: "#dcfceb",
          200: "#baf9d7",
          300: "#86f5b8",
          400: "#4ce894",
          500: "#2ca57c",
          600: "#1d8a63",
          700: "#186d4f",
          800: "#165841",
          900: "#144a36",
          950: "#062a1d",
        },
        accent: {
          50: "#e5f3f7",
          100: "#d1e8ef",
          200: "#a3d1df",
          300: "#8fb8ef",
          400: "#82a6c7",
          500: "#3b79da",
          600: "#1e58ca",
          700: "#1a4ba8",
          800: "#153d86",
          900: "#0f2f64",
          950: "#0a1f42",
        },
      },
    },
  },
  plugins: [],
};
export default config;




