/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        bg: 'var(--bg)',
        sf: 'var(--sf)',
        sf2: 'var(--sf2)',
        bd: 'var(--bd)',
        tx: 'var(--tx)',
        sb: 'var(--sb)',
        dm: 'var(--dm)',
        hd: 'var(--hd)',
        glass: 'var(--glass)',
        glassBd: 'var(--glassBd)',
        blue: 'var(--blue)',
        green: 'var(--green)',
        red: 'var(--red)',
        amber: 'var(--amber)',
        purple: 'var(--purple)',
        cyan: 'var(--cyan)',
        'node-io': 'var(--node-io)',
        'node-ai': 'var(--node-ai)',
        'node-tool': 'var(--node-tool)',
        'node-flow': 'var(--node-flow)',
        'node-data': 'var(--node-data)',
      },
    },
  },
  plugins: [],
};
