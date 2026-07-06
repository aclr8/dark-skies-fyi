import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'sky-teal': {
          400: '#526788',
          500: '#3d5068',
          100: '#d0dae6',
        },
        'dark-base': '#030712',
        'dark-card': '#111827',
      },
    },
  },
  plugins: [],
}
export default config
