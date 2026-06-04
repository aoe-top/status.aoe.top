import type { Config } from 'tailwindcss'

export default {
  content: [],
  theme: {
    extend: {
      colors: {
        'surface-0': '#0a0a0f',
        'surface-1': '#12121a',
        'surface-2': '#1a1a26',
        'surface-3': '#22223a',
        border: '#2a2a3e',
        text: '#e4e4ec',
        'text-muted': '#8888a0',
      },
    },
  },
  plugins: [],
} satisfies Config
