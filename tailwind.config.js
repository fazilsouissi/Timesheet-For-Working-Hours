/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',    // ← follow OS setting automatically
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
