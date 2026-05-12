/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#FF6B00',
          gold: '#F5C400',
          dark: '#0D0D0D',
          card: '#1A1A1A',
          surface: '#2A2A2A',
        },
      },
      boxShadow: {
        glow: '0 0 20px rgba(255, 107, 0, 0.4)',
        'glow-sm': '0 0 10px rgba(255, 107, 0, 0.3)',
        'glow-lg': '0 0 40px rgba(255, 107, 0, 0.5)',
      },
    },
  },
  plugins: [],
}
