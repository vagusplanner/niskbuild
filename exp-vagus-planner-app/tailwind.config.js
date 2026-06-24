/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        /* ── NSC Palette Bleue (Pages 2, 7, 8) ── */
        nsc: {
          // ── Page 2 (Palette Bleue) ──
          cyan:        '#29ABE2',   // P2 cyan accent
          royal:       '#1D6FB8',   // P2 royal blue — PRIMARY
          navy:        '#1B2A4A',   // P2 deep navy
          'deep-navy': '#0D4F6C',   // P2 dark teal-navy
          'blue-med':  '#2980B9',   // P2 medium blue
          indigo:      '#4A55A2',   // P2 indigo violet
          'blue-gray': '#607B8B',   // P2 blue-gray
          'near-black':'#0D1A2A',   // P8 near black
          'light-blue':'#A8C8E8',   // P2 light blue
          // ── Page 8 ──
          mauve:       '#9B8EA0',   // P8 mauve-gray
          'blue-gray2':'#8A9BB0',   // P8 blue-gray
          blush:       '#DDD5DC',   // P8 blush white
          ice:         '#D4E0EC',   // P8 ice blue
          steel:       '#7A9EB5',   // P8 steel blue
          slate:       '#4A6E8A',   // P8 slate blue
          'dark-steel':'#2D4A65',   // P8 dark steel
          darkest:     '#0D1A2A',   // P8 near black
          // ── Deep Green (kept) ──
          'teal-dark': '#0D4F3C',   // deep teal green
          'deep-teal': '#0A3333',   // deep teal bg
          'teal-mid':  '#1A4A44',   // mid dark teal
          // ── Gold accent ──
          gold:        '#E8B84B',   // logo gold
          'gold-light':'#F0CC7A',   // soft gold
        },
        /* Tailwind semantic tokens */
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT:             'hsl(var(--sidebar-background))',
          foreground:          'hsl(var(--sidebar-foreground))',
          primary:             'hsl(var(--sidebar-primary))',
          'primary-foreground':'hsl(var(--sidebar-primary-foreground))',
          accent:              'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border:              'hsl(var(--sidebar-border))',
          ring:                'hsl(var(--sidebar-ring))',
        },
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
  safelist: [
    // NSC color utilities used dynamically
    { pattern: /bg-nsc-/ },
    { pattern: /text-nsc-/ },
    { pattern: /border-nsc-/ },
    { pattern: /from-nsc-/ },
    { pattern: /to-nsc-/ },
    { pattern: /via-nsc-/ },
  ],
}
