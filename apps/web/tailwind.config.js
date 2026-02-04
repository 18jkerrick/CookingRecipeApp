const config = {
    darkMode: ["class", '[data-theme="dark"]'],
    content: [
      "./pages/**/*.{ts,tsx}",
      "./components/**/*.{ts,tsx}",
      "./app/**/*.{ts,tsx}",
      "./src/**/*.{ts,tsx}",
      "*.{js,ts,jsx,tsx,mdx}",
    ],
    prefix: "",
    theme: {
      container: {
        center: true,
        padding: "2rem",
        screens: {
          "2xl": "1400px",
        },
      },
      extend: {
        colors: {
          // Warm Kitchen design tokens
          'wk-bg-primary': 'var(--bg-primary)',
          'wk-bg-surface': 'var(--bg-surface)',
          'wk-bg-surface-hover': 'var(--bg-surface-hover)',
          'wk-text-primary': 'var(--text-primary)',
          'wk-text-secondary': 'var(--text-secondary)',
          'wk-text-muted': 'var(--text-muted)',
          'wk-accent': 'var(--wk-accent)',
          'wk-accent-hover': 'var(--wk-accent-hover)',
          'wk-accent-muted': 'var(--wk-accent-muted)',
          'wk-border': 'var(--border)',
          'wk-success': 'var(--success)',
          'wk-warning': 'var(--warning)',
          'wk-error': 'var(--error)',
          'wk-info': 'var(--info)',
          // Legacy shadcn/ui colors
          border: "hsl(var(--border))",
          input: "hsl(var(--input))",
          ring: "hsl(var(--ring))",
          background: "hsl(var(--background))",
          foreground: "hsl(var(--foreground))",
          primary: {
            DEFAULT: "var(--accent)",
            foreground: "hsl(var(--primary-foreground))",
          },
          secondary: {
            DEFAULT: "#a5a6ff",
            foreground: "hsl(var(--secondary-foreground))",
          },
          destructive: {
            DEFAULT: "hsl(var(--destructive))",
            foreground: "hsl(var(--destructive-foreground))",
          },
          muted: {
            DEFAULT: "hsl(var(--muted))",
            foreground: "hsl(var(--muted-foreground))",
          },
          accent: {
            DEFAULT: "var(--accent)",
            foreground: "hsl(var(--accent-foreground))",
          },
          popover: {
            DEFAULT: "hsl(var(--popover))",
            foreground: "hsl(var(--popover-foreground))",
          },
          card: {
            DEFAULT: "hsl(var(--card))",
            foreground: "hsl(var(--card-foreground))",
          },
        },
        fontFamily: {
          display: ['Playfair Display', 'Georgia', 'serif'],
          body: ['Source Sans 3', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        },
        boxShadow: {
          'wk': '0 2px 8px var(--shadow)',
          'wk-lg': '0 8px 24px var(--shadow)',
          'wk-xl': '0 8px 32px var(--shadow)',
        },
        borderRadius: {
          lg: "var(--radius-lg)",
          md: "var(--radius-md)",
          sm: "var(--radius-sm)",
        },
        keyframes: {
          "accordion-down": {
            from: { height: "0" },
            to: { height: "var(--radix-accordion-content-height)" },
          },
          "accordion-up": {
            from: { height: "var(--radix-accordion-content-height)" },
            to: { height: "0" },
          },
          "theme-toggle": {
            "0%": { transform: "rotate(0deg) scale(1)" },
            "50%": { transform: "rotate(180deg) scale(0.8)" },
            "100%": { transform: "rotate(360deg) scale(1)" },
          },
        },
        animation: {
          "accordion-down": "accordion-down 0.2s ease-out",
          "accordion-up": "accordion-up 0.2s ease-out",
          "theme-toggle": "theme-toggle 0.5s ease-in-out",
        },
      },
    },
    plugins: [],
  }
  
  export default config
