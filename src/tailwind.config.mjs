/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}', './public/**/*.html'],
    theme: {
        extend: {
            fontSize: {
                xs: ['0.75rem', { lineHeight: '1.25', letterSpacing: '0.02em', fontWeight: '400' }],
                sm: ['0.875rem', { lineHeight: '1.3', letterSpacing: '0.02em', fontWeight: '400' }],
                base: ['1rem', { lineHeight: '1.5', letterSpacing: '0.02em', fontWeight: '400' }],
                lg: ['1.125rem', { lineHeight: '1.5', letterSpacing: '0.02em', fontWeight: '400' }],
                xl: ['1.25rem', { lineHeight: '1.6', letterSpacing: '0.02em', fontWeight: '600' }],
                '2xl': ['1.5rem', { lineHeight: '1.6', letterSpacing: '0.02em', fontWeight: '600' }],
                '3xl': ['1.875rem', { lineHeight: '1.2', letterSpacing: '0.01em', fontWeight: '700' }],
                '4xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '0.01em', fontWeight: '700' }],
                '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '0.005em', fontWeight: '700' }],
                '6xl': ['3.75rem', { lineHeight: '1.1', letterSpacing: '0.005em', fontWeight: '700' }],
                '7xl': ['4.5rem', { lineHeight: '1.05', letterSpacing: '0.005em', fontWeight: '700' }],
                '8xl': ['6rem', { lineHeight: '1.05', letterSpacing: '0.005em', fontWeight: '700' }],
                '9xl': ['8rem', { lineHeight: '1.05', letterSpacing: '0.005em', fontWeight: '700' }],
            },
            fontFamily: {
                heading: "cormorantgaramond",
                paragraph: "sora"
            },
            colors: {
                destructive: '#E53E3E',
                'destructive-foreground': '#FFFFFF',
                'accent-gold': '#DAA520',
                'accent-gold-foreground': '#FFFFFF',
                'muted-grey': '#A0AEC0',
                'muted-grey-foreground': '#2D3748',
                'deep-charcoal': '#2D3748',
                background: '#F8F8F8',
                secondary: '#4682B4',
                foreground: '#333333',
                'secondary-foreground': '#FFFFFF',
                'primary-foreground': '#FFFFFF',
                primary: '#B8860B'
            },
        },
    },
    future: {
        hoverOnlyWhenSupported: true,
    },
    plugins: [require('@tailwindcss/container-queries'), require('@tailwindcss/typography')],
}
