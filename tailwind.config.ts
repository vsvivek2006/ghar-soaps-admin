import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
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
        },
      },
    },
  },
  plugins: [],
};

export default config;
