import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontFamily: {
  			sans: [
  				'Roboto',
  				'ui-sans-serif',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Helvetica Neue',
  				'Arial',
  				'Noto Sans',
  				'sans-serif'
  			],
  			mono: [
  				'Roboto Mono',
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono',
  				'Courier New',
  				'monospace'
  			],
  			serif: [
  				'Libre Caslon Text',
  				'ui-serif',
  				'Georgia',
  				'Cambria',
  				'Times New Roman',
  				'Times',
  				'serif'
  			]
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			xl: 'calc(var(--radius) + 4px)',
  			'2xl': 'calc(var(--radius) + 8px)',
  			'3xl': 'calc(var(--radius) + 16px)'
  		},
		keyframes: {
			'accordion-down': {
				from: {
					height: '0'
				},
				to: {
					height: 'var(--radix-accordion-content-height)'
				}
			},
			'accordion-up': {
				from: {
					height: 'var(--radix-accordion-content-height)'
				},
				to: {
					height: '0'
				}
			},
			'fade-in': {
				from: {
					opacity: '0',
					transform: 'translateY(10px)'
				},
				to: {
					opacity: '1',
					transform: 'translateY(0)'
				}
			},
			'fade-up': {
				from: {
					opacity: '0',
					transform: 'translateY(20px)'
				},
				to: {
					opacity: '1',
					transform: 'translateY(0)'
				}
			},
			'scale-in': {
				from: {
					opacity: '0',
					transform: 'scale(0.95)'
				},
				to: {
					opacity: '1',
					transform: 'scale(1)'
				}
			},
			'slide-in-right': {
				from: {
					transform: 'translateX(100%)'
				},
				to: {
					transform: 'translateX(0)'
				}
			},
			float: {
				'0%, 100%': {
					transform: 'translateY(0)'
				},
				'50%': {
					transform: 'translateY(-10px)'
				}
			},
			glow: {
				'0%, 100%': {
					boxShadow: '0 0 20px hsl(217 91% 60% / 0.2)'
				},
				'50%': {
					boxShadow: '0 0 40px hsl(217 91% 60% / 0.4)'
				}
			},
			shimmer: {
				'0%': {
					backgroundPosition: '-200% 0'
				},
				'100%': {
					backgroundPosition: '200% 0'
				}
			},
			'reveal-up': {
				'0%': {
					opacity: '0',
					transform: 'translateY(60px)'
				},
				'100%': {
					opacity: '1',
					transform: 'translateY(0)'
				}
			},
			'reveal-left': {
				'0%': {
					opacity: '0',
					transform: 'translateX(60px)'
				},
				'100%': {
					opacity: '1',
					transform: 'translateX(0)'
				}
			},
			'reveal-right': {
				'0%': {
					opacity: '0',
					transform: 'translateX(-60px)'
				},
				'100%': {
					opacity: '1',
					transform: 'translateX(0)'
				}
			},
			'float-3d': {
				'0%, 100%': {
					transform: 'translateY(0) rotateX(0) rotateY(0)'
				},
				'25%': {
					transform: 'translateY(-5px) rotateX(2deg) rotateY(2deg)'
				},
				'50%': {
					transform: 'translateY(-10px) rotateX(0) rotateY(0)'
				},
				'75%': {
					transform: 'translateY(-5px) rotateX(-2deg) rotateY(-2deg)'
				}
			},
			'glow-ring': {
				'0%': {
					transform: 'scale(1)',
					opacity: '0.5'
				},
				'100%': {
					transform: 'scale(1.5)',
					opacity: '0'
				}
			},
			'draw': {
				'0%': {
					strokeDashoffset: '300'
				},
				'100%': {
					strokeDashoffset: '0'
				}
			},
			'pulse-soft': {
				'0%, 100%': {
					opacity: '1'
				},
				'50%': {
					opacity: '0.7'
				}
			}
		},
		animation: {
			'accordion-down': 'accordion-down 0.2s ease-out',
			'accordion-up': 'accordion-up 0.2s ease-out',
			'fade-in': 'fade-in 0.5s ease-out',
			'fade-up': 'fade-up 0.6s ease-out',
			'scale-in': 'scale-in 0.3s ease-out',
			'slide-in-right': 'slide-in-right 0.3s ease-out',
			float: 'float 3s ease-in-out infinite',
			glow: 'glow 2s ease-in-out infinite',
			shimmer: 'shimmer 3s linear infinite',
			'reveal-up': 'reveal-up 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
			'reveal-left': 'reveal-left 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
			'reveal-right': 'reveal-right 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
			'float-3d': 'float-3d 6s ease-in-out infinite',
			'glow-ring': 'glow-ring 1.5s ease-out infinite',
			'draw': 'draw 1.5s ease-out forwards',
			'pulse-soft': 'pulse-soft 3s ease-in-out infinite'
		},
  		backdropBlur: {
  			xs: '2px'
  		},
  		boxShadow: {
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)',
  			glow: 'var(--shadow-glow)',
  			elevated: 'var(--shadow-elevated)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
