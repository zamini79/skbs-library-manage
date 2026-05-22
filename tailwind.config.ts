import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "hsl(var(--primary-50))",
          100: "hsl(var(--primary-100))",
          600: "hsl(var(--primary-600))",
          700: "hsl(var(--primary-700))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        // 상태 색상
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          bg: "hsl(var(--success-bg))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          bg: "hsl(var(--info-bg))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          bg: "hsl(var(--warning-bg))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          bg: "hsl(var(--destructive-bg))",
        },
        // 사이드바
        sidebar: {
          bg: "hsl(var(--sidebar-bg))",
          fg: "hsl(var(--sidebar-fg))",
          "fg-active": "hsl(var(--sidebar-fg-active))",
          "bg-active": "hsl(var(--sidebar-bg-active))",
          section: "hsl(var(--sidebar-section))",
          border: "hsl(var(--sidebar-border))",
        },
        // 신규 라이브러리 디자인 토큰 (멤버 페이지 한정)
        // 색상값은 hex 그대로. 점진적 리프레시 동안 기존 hsl 시스템과 공존.
        bg: "#f5ecdc",
        paper: "#fbf6ea",
        "paper-warm": "#f1e6cf",
        ink: "#2a1d10",
        "ink-soft": "#5a4633",
        "ink-muted": "#8a7860",
        "library-accent": "#7c3a1d",
        "library-accent-soft": "#c97b4e",
        line: "#d9c8a9",
        "line-soft": "#ece1c6",
        ok: "#4a7a3a",
        "ok-soft": "#e7f0d8",
        "ok-border": "#cfdfbd",
        busy: "#a86133",
        "busy-soft": "#f3e2cf",
        "busy-border": "#e9caaa",
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-kr)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "'Source Serif Pro'", "Georgia", "serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs: ["0.6875rem", { lineHeight: "1rem" }],
        sm: ["0.75rem", { lineHeight: "1.125rem" }],
        base: ["0.8125rem", { lineHeight: "1.25rem" }],
        md: ["0.875rem", { lineHeight: "1.375rem" }],
        lg: ["1rem", { lineHeight: "1.5rem" }],
        xl: ["1.125rem", { lineHeight: "1.625rem" }],
        "2xl": ["1.375rem", { lineHeight: "1.875rem" }],
        "3xl": ["1.625rem", { lineHeight: "2.125rem" }],
        "4xl": ["2rem", { lineHeight: "2.375rem" }],
        "5xl": ["2.625rem", { lineHeight: "3rem" }],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "3px",
        md: "4px",
        lg: "6px",
        cover: "3px",
        pill: "999px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.04)",
        DEFAULT: "0 2px 4px rgba(0,0,0,0.04)",
        md: "0 4px 12px rgba(0,0,0,0.06)",
        lg: "0 8px 24px rgba(0,0,0,0.12)",
        xl: "0 20px 60px rgba(0,0,0,0.3)",
        cover:
          "0 30px 60px -28px rgba(40,25,10,0.45), 0 0 0 1px rgba(0,0,0,0.04)",
        card: "0 12px 30px -22px rgba(40,30,15,0.35)",
        dropdown: "0 12px 30px -10px rgba(40,30,15,0.18)",
      },
      letterSpacing: {
        overline: "0.22em",
        eyebrow: "0.25em",
      },
      maxWidth: {
        page: "1280px",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
