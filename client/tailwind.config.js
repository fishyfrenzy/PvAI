/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                terminal: {
                    black: '#0a0a0a',
                    green: '#00ff41',
                    dim: '#008F11',
                    alert: '#ff0000'
                }
            },
            fontFamily: {
                mono: ['"Share Tech Mono"', '"Courier New"', 'monospace'],
                hand: ['"Nanum Pen Script"', 'cursive'],
            },
            animation: {
                'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }
        },
    },
    plugins: [],
}
