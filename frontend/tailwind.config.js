export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        navy:  { DEFAULT:'#0D2137', 700:'#0a1a2d', 800:'#071220' },
        blue:  { DEFAULT:'#1B6CA8', 600:'#156096' },
        amber: { DEFAULT:'#E8920A', 400:'#f5a623' },
        cream: { DEFAULT:'#F5EFE6', 100:'#faf7f3' },
        sand:  '#C4A882',
        forest:'#1A8A52',
        rouge: '#B53528',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"','Georgia','serif'],
        sans:  ['"Jost"','system-ui','sans-serif'],
      },
    },
  },
  plugins: [],
}
