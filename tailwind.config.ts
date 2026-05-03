import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Stitch "Nocturnal Pitch" Palette
        'pitch-green': '#22C55E',
        'absolute-dark': '#0A0A0A',
        'concrete-overlay': '#1A1A1A',
        fulbo: {
          bg: '#0A0A0A',
          panel: '#1A1A1A',
          cta: '#22C55E',
          accent: '#F59E0B',
          text: '#FFFFFF',
          muted: '#869585', // Matches 'outline' from Stitch
        },
      },
      fontFamily: {
        sans: ['Lexend', 'system-ui', 'sans-serif'],
        mono: ['Space Grotesk', 'monospace'],
        headline: ['Lexend', 'sans-serif'],
      },
      borderRadius: {
        none: '0px',
        card: '0px',
        panel: '0px',
      },
      borderWidth: {
        '3': '3px',
      },
      boxShadow: {
        // Stitch avoids shadows, using borders for depth
        none: 'none',
      },
    },
  },
  plugins: [],
};

export default config;
