module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // 애니메이션 추가
      animation: {
        shimmer: 'shimmer 2s infinite',
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
        'shadow': 'shadow 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shadow: {
          '0%, 100%': { transform: 'translateX(-50%) scaleX(1)', opacity: '0.2' },
          '50%': { transform: 'translateX(-50%) scaleX(0.8)', opacity: '0.1' },
        },
      },
    },
  },
  plugins: [],
};