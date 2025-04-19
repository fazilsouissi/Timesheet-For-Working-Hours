/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',     // ← moved out of `theme`
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {},          // your theme customizations go here
  },
  plugins: [],
}
