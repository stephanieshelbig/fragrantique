/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx,mdx}',
    './components/**/*.{js,jsx,ts,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#f7f2e9',
        gold: '#c7a24b',
        blush: '#f6b0c3',
      },
    },
  },
  plugins: [],
};
