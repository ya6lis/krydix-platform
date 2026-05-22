import { createTheme, alpha } from '@mui/material/styles';

/* ============================================================
   Krydix design tokens — purple design system
   Mirrors app-onboarding/project/styles.css
   ============================================================ */

export const tokens = {
	// raw palette
	white: '#FFFFFF',
	indigo: '#200A69',
	cyan: '#00B8D9',
	sand: '#F4F6F8',
	ink: '#1C252E',
	amber: '#FFAB00',
	coral: '#FF5630',
	purple: '#7635DC',
	purpleSoft: '#BBA0EC',
	coralLight: '#FF8469',

	// semantic surfaces
	bg: '#F4F6F8',
	surface: '#FFFFFF',
	surface2: '#EAEDF1',

	// ink scale
	ink1: '#1C252E',
	ink2: '#455463',
	ink3: '#8794A1',

	// lines
	line: '#E1E5EA',
	line2: '#EDF0F3',

	// accent (purple)
	accent: '#7635DC',
	accentSoft: '#F1EAFC',
	accentInk: '#200A69',
	accentLight: '#BBA0EC',

	// secondary tones with paired soft bg + ink text
	cyanSoft: '#E0F7FB',
	cyanInk: '#006C7F',
	amberSoft: '#FFF5DB',
	amberInk: '#6B4A00',
	coralSoft: '#FFE6DF',
	coralInk: '#B23A1A',
	blueSoft: '#E6EEF8',
	blueInk: '#1D3F6E',

	// fonts — Public Sans is Latin-only, Inter carries Cyrillic (Ukrainian)
	fontSans: '"Public Sans", "Inter", "Helvetica Neue", Arial, sans-serif',
	fontMono: '"JetBrains Mono", "SFMono-Regular", Menlo, monospace',

	// radius
	radius: 14,
	radiusSm: 10,

	// shadows
	shadowSm: '0 1px 2px rgba(28,37,46,0.04)',
	shadowMd: '0 4px 16px rgba(28,37,46,0.06)',
} as const;

const PRIMARY = tokens.purple;
const PRIMARY_DARK = tokens.indigo;

export const theme = createTheme({
	palette: {
		primary: {
			main: PRIMARY,
			light: tokens.accentSoft,
			dark: PRIMARY_DARK,
			contrastText: '#fff',
		},
		secondary: {
			main: tokens.indigo,
			light: alpha(tokens.indigo, 0.08),
			dark: '#15064A',
			contrastText: '#fff',
		},
		info: { main: tokens.cyan, light: tokens.cyanSoft, dark: tokens.cyanInk, contrastText: '#fff' },
		success: {
			main: tokens.cyan,
			light: tokens.cyanSoft,
			dark: tokens.cyanInk,
			contrastText: '#fff',
		},
		warning: {
			main: tokens.amber,
			light: tokens.amberSoft,
			dark: tokens.amberInk,
			contrastText: tokens.amberInk,
		},
		error: {
			main: tokens.coral,
			light: tokens.coralSoft,
			dark: tokens.coralInk,
			contrastText: '#fff',
		},
		background: {
			default: tokens.bg,
			paper: tokens.surface,
		},
		text: {
			primary: tokens.ink1,
			secondary: tokens.ink3,
			disabled: tokens.ink3,
		},
		divider: tokens.line,
	},
	typography: {
		fontFamily: tokens.fontSans,
		h1: { fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' },
		h2: { fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' },
		h3: { fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em' },
		h4: { fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
		h5: { fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em' },
		h6: { fontWeight: 700, lineHeight: 1.4, letterSpacing: '-0.01em' },
		subtitle1: { fontWeight: 600, lineHeight: 1.5 },
		subtitle2: { fontWeight: 600, lineHeight: 1.57 },
		body1: { lineHeight: 1.5 },
		body2: { lineHeight: 1.57 },
		caption: { lineHeight: 1.5 },
		button: { fontWeight: 600, textTransform: 'none' },
	},
	shape: { borderRadius: tokens.radiusSm },
	shadows: [
		'none',
		tokens.shadowSm,
		tokens.shadowMd,
		'0 6px 20px rgba(28,37,46,0.08)',
		'0 8px 24px rgba(28,37,46,0.10)',
		'0 12px 32px rgba(28,37,46,0.12)',
		'0 16px 48px rgba(28,37,46,0.14)',
		'0 20px 56px rgba(28,37,46,0.16)',
		'0 24px 64px rgba(28,37,46,0.18)',
		'0 28px 72px rgba(28,37,46,0.18)',
		'0 32px 80px rgba(28,37,46,0.20)',
		'0 36px 88px rgba(28,37,46,0.20)',
		'0 40px 96px rgba(28,37,46,0.20)',
		'0 44px 104px rgba(28,37,46,0.22)',
		'0 48px 112px rgba(28,37,46,0.22)',
		'0 52px 120px rgba(28,37,46,0.22)',
		'0 56px 128px rgba(28,37,46,0.24)',
		'0 60px 136px rgba(28,37,46,0.24)',
		'0 64px 144px rgba(28,37,46,0.24)',
		'0 68px 152px rgba(28,37,46,0.26)',
		'0 72px 160px rgba(28,37,46,0.26)',
		'0 76px 168px rgba(28,37,46,0.26)',
		'0 80px 176px rgba(28,37,46,0.28)',
		'0 84px 184px rgba(28,37,46,0.28)',
		'0 88px 192px rgba(28,37,46,0.28)',
	],
	components: {
		MuiCssBaseline: {
			styleOverrides: {
				body: { backgroundColor: tokens.bg, color: tokens.ink1 },
				'::selection': { background: tokens.accentSoft, color: tokens.accentInk },
			},
		},
		MuiButton: {
			defaultProps: { disableElevation: true },
			styleOverrides: {
				root: {
					borderRadius: tokens.radiusSm,
					fontWeight: 600,
					fontSize: '13.5px',
					padding: '9px 16px',
					boxShadow: 'none',
					'&:hover': { boxShadow: 'none' },
				},
				sizeSmall: { padding: '6px 11px', fontSize: '12.5px', borderRadius: 8 },
				sizeLarge: { padding: '12px 22px', fontSize: '15px' },
				containedPrimary: {
					'&:hover': { filter: 'brightness(1.05)' },
				},
				outlined: {
					borderColor: tokens.line,
					backgroundColor: tokens.surface,
					color: tokens.ink1,
					'&:hover': { borderColor: tokens.ink3, backgroundColor: tokens.surface },
				},
			},
		},
		MuiCard: {
			defaultProps: { elevation: 0 },
			styleOverrides: {
				root: {
					border: `1px solid ${tokens.line}`,
					borderRadius: tokens.radius,
					boxShadow: tokens.shadowSm,
				},
			},
		},
		MuiPaper: {
			styleOverrides: {
				root: { backgroundImage: 'none' },
				outlined: { borderColor: tokens.line },
			},
		},
		MuiOutlinedInput: {
			styleOverrides: {
				root: {
					borderRadius: tokens.radiusSm,
					backgroundColor: tokens.surface,
					'& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.line },
					'&:hover .MuiOutlinedInput-notchedOutline': { borderColor: tokens.ink3 },
					'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
						borderColor: tokens.accent,
						borderWidth: 1,
						boxShadow: `0 0 0 3px ${tokens.accentSoft}`,
					},
				},
			},
		},
		MuiInputLabel: {
			styleOverrides: {
				root: { fontWeight: 500, '&.Mui-focused': { color: tokens.accentInk } },
			},
		},
		MuiChip: {
			styleOverrides: {
				root: { fontWeight: 700, fontSize: '11.5px', borderRadius: 999 },
			},
		},
		MuiTableCell: {
			styleOverrides: {
				root: { borderColor: tokens.line2 },
				head: {
					backgroundColor: tokens.bg,
					color: tokens.ink3,
					fontWeight: 700,
					fontSize: '11px',
					textTransform: 'uppercase',
					letterSpacing: '0.08em',
					borderColor: tokens.line,
				},
			},
		},
		MuiTableContainer: {
			styleOverrides: {
				root: { borderRadius: tokens.radius },
			},
		},
		MuiDialog: {
			styleOverrides: {
				paper: { borderRadius: tokens.radius, border: `1px solid ${tokens.line}` },
			},
		},
		MuiTab: {
			styleOverrides: {
				root: {
					fontWeight: 500,
					fontSize: '13.5px',
					textTransform: 'none',
					minHeight: 48,
					color: tokens.ink3,
					'&.Mui-selected': { color: tokens.ink1, fontWeight: 700 },
				},
			},
		},
		MuiTabs: {
			styleOverrides: {
				indicator: { backgroundColor: tokens.ink1, height: 2 },
			},
		},
		MuiSwitch: {
			styleOverrides: {
				root: { padding: 8 },
				switchBase: { '&.Mui-checked': { color: '#fff' } },
				track: {
					borderRadius: 11,
					backgroundColor: tokens.surface2,
					opacity: 1,
				},
			},
		},
		MuiAlert: {
			styleOverrides: {
				root: { borderRadius: tokens.radius, fontSize: '13px' },
				standardInfo: { backgroundColor: tokens.accentSoft, color: tokens.accentInk },
				standardSuccess: { backgroundColor: tokens.cyanSoft, color: tokens.cyanInk },
				standardWarning: { backgroundColor: tokens.amberSoft, color: tokens.amberInk },
				standardError: { backgroundColor: tokens.coralSoft, color: tokens.coralInk },
			},
		},
		MuiTooltip: {
			styleOverrides: {
				tooltip: {
					backgroundColor: tokens.ink1,
					fontSize: '11.5px',
					fontWeight: 600,
					borderRadius: 6,
					padding: '6px 10px',
				},
				arrow: { color: tokens.ink1 },
			},
		},
		MuiLinearProgress: {
			styleOverrides: {
				root: { borderRadius: 4, height: 8, backgroundColor: tokens.surface2 },
				bar: { borderRadius: 4 },
			},
		},
		MuiMenu: {
			styleOverrides: {
				paper: {
					borderRadius: tokens.radius,
					border: `1px solid ${tokens.line}`,
					boxShadow: '0 16px 48px rgba(28,37,46,0.14)',
				},
			},
		},
		MuiCheckbox: {
			styleOverrides: { root: { color: tokens.ink3 } },
		},
		MuiRadio: {
			styleOverrides: { root: { color: tokens.ink3 } },
		},
	},
});
