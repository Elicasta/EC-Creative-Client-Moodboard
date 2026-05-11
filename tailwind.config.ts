import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // EC Creative brand palette
        'ec-charcoal': '#333436',
        'ec-cream':    '#eee7dd',
        'ec-taupe':    '#bda796',
        'ec-blue':     '#698a9b',
        'ec-green':    '#2f4635',
        'ec-linen':    '#e6ddd3',
        // Extended
        cream:  { 50: '#fdfaf5', 100: '#f9f3e8', 200: '#f2e8d5', 300: '#e8d9be', DEFAULT: '#f5ede0' },
        sand:   { 100: '#e8ddd0', 200: '#d4c4b0', 300: '#c0a98e', 400: '#a8906e', DEFAULT: '#c8b49a' },
        linen:  { 100: '#efe8df', 200: '#ddd2c4', DEFAULT: '#e8ddd0' },
        matte:  { black: '#1a1714', dark: '#2d2926', mid: '#4a4540' },
        stone:  { warm: '#8a7968', light: '#b5a898' },
        ivory: '#f8f4ef',
      },
      fontFamily: {
        display: ["'Cormorant Garamond'", 'Georgia', 'serif'],
        body:    ["'Jost'", 'system-ui', 'sans-serif'],
        accent:  ["'Cormorant'", 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
