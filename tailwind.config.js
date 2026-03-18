/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tvvc: {
          blue: '#004a99',
          orange: '#f37021',
          gold: '#ffd700',
        }
      }
    },
  },
  plugins: [],
}
