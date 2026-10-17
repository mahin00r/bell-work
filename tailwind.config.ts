import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{html,tsx}'],
  theme: {
    extend: {
      colors: { accent: 'var(--accent)', surface: 'var(--surface)', muted: 'var(--muted)' },
    },
  },
  plugins: [],
} satisfies Config;
