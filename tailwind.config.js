/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#14b8a6',
          coral: '#f43f5e',
          black: '#0f172a',
          white: '#ffffff',
          'teal-dark': '#0f766e',
          'coral-dark': '#e11d48',
        }
      }
    },
  },
  plugins: [],
}
