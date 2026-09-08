/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 安安记 主题色
        cream: {
          50: '#FDFAF5',
          100: '#FAF7F2',
          200: '#F5EFE5',
          300: '#E8DCC4',
          400: '#D9C7A6'
        },
        apricot: {
          50: '#FEF5EE',
          100: '#FCE8D9',
          200: '#F8D2B8',
          300: '#F5B895',
          400: '#EE9A6E',
          500: '#E07A4F'
        },
        sage: {
          50: '#F2F7EE',
          100: '#E1EDD8',
          200: '#C7DBB5',
          300: '#A8C58B',
          400: '#7FB069',
          500: '#5F8E48'
        },
        dusk: {
          50: '#FAF0F2',
          100: '#F2DDE2',
          200: '#E8A5B5',
          300: '#D88093',
          400: '#B65A70'
        },
        ink: {
          50: '#F5F4F2',
          100: '#E8E5E0',
          200: '#C9C4BC',
          300: '#9A9388',
          400: '#6E685D',
          500: '#4A4438',
          600: '#2D2A22',
          700: '#1A1814'
        }
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"Source Han Serif SC"', '"Songti SC"', 'serif']
      },
      borderRadius: {
        '2.5xl': '1.25rem',
        '3xl': '1.5rem'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
}