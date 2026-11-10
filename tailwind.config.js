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
          50: '#f6f7f6',
          100: '#e3e8e3',
          500: '#2e5a36',
          700: '#1b3d22',
          900: '#112616',
        }
      }
    },
  },
  plugins: [],
}

