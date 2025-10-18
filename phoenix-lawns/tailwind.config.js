/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // enable dark mode
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'Poppins', 'sans-serif'],
            },
            colors: {
                primary: {
                    DEFAULT: '#3B7A57', // Earthy green
                },
                sand: '#E4CDA0',
                clay: '#BFA17D',
                accent: {
                    yellow: '#FFC107',
                    orange: '#FF9800',
                }
            }
        },
    },
    plugins: [],
}
