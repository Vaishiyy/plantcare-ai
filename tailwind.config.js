/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFCF9',
          100: '#F9F8F5',
          200: '#F3EFE6',
          300: '#E8E2D5',
          400: '#DDD5C4',
        },
        forest: {
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#40916C',
          500: '#2D6A4F',
          600: '#1B4332',
          700: '#143527',
          800: '#0D231A',
          900: '#08140F',
        },
        sage: {
          50: '#F2F8F5',
          100: '#D8F3DC',
          200: '#B7E4C7',
          300: '#95D5B2',
          400: '#74C69D',
          500: '#52B788',
          600: '#3D8C66',
        },
        amber: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#E9C46A',
          500: '#D4A33B',
          600: '#B88628',
        },
        coral: {
          50: '#FFF5F3',
          100: '#FFE4E0',
          200: '#FFCCC5',
          300: '#FFAEA2',
          400: '#F0806D',
          500: '#E76F51',
          600: '#CF5739',
          700: '#B24227',
        },
        soil: {
          800: '#382A21',
          900: '#261C16',
        }
      },
      fontFamily: {
        sans: [
          'Albert Sans',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: [
          'Albert Sans',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(27, 67, 50, 0.05), 0 2px 6px -1px rgba(27, 67, 50, 0.03)',
        'card': '0 8px 30px -4px rgba(27, 67, 50, 0.08), 0 3px 10px -2px rgba(27, 67, 50, 0.04)',
        'elevated': '0 16px 40px -8px rgba(27, 67, 50, 0.12), 0 6px 16px -4px rgba(27, 67, 50, 0.06)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      }
    },
  },
  plugins: [],
}
