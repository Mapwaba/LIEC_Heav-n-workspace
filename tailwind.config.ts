import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        liec: {
          navy: '#092342',
          navyDark: '#061930',
          navyLight: '#12365a',
          teal: '#0c685a',
          tealDark: '#095247',
          tealLight: '#daf6ec',
          mint: '#2dd4bf',
          mintSoft: '#e6f9f3',
          gold: '#f4be37',
          goldHover: '#e5ae28',
          goldSoft: '#fef6dd',
          bg: '#f6f9fc',
          surface: '#ffffff',
          border: '#e5eef6',
          muted: '#64748b',
          ink: '#0b2239',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(9, 35, 66, 0.04)',
        elevated: '0 10px 30px rgba(9, 35, 66, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
