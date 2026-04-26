import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cancha: '#1f7a4d',
        cal: '#f6f3e7',
        noche: '#171a1f',
        pelota: '#f4b740',
        derrota: '#c44949',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '8px',
      },
    },
  },
  plugins: [],
};

export default config;
