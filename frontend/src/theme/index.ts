import { createTheme, alpha } from '@mui/material/styles';

const PRIMARY = '#00A76F';
const SECONDARY = '#8E33FF';
const INFO = '#00B8D9';
const SUCCESS = '#22C55E';
const WARNING = '#FFAB00';
const ERROR = '#FF5630';

export const theme = createTheme({
	palette: {
		primary: {
			main: PRIMARY,
			light: alpha(PRIMARY, 0.08),
			dark: '#007867',
			contrastText: '#fff',
		},
		secondary: {
			main: SECONDARY,
			light: alpha(SECONDARY, 0.08),
			dark: '#5119B7',
			contrastText: '#fff',
		},
		info: { main: INFO, light: alpha(INFO, 0.08), dark: '#006C9C', contrastText: '#fff' },
		success: { main: SUCCESS, light: alpha(SUCCESS, 0.08), dark: '#118D57', contrastText: '#fff' },
		warning: { main: WARNING, light: alpha(WARNING, 0.08), dark: '#B76E00', contrastText: '#fff' },
		error: { main: ERROR, light: alpha(ERROR, 0.08), dark: '#B71D18', contrastText: '#fff' },
		background: {
			default: '#F4F6F8',
			paper: '#FFFFFF',
		},
		text: {
			primary: '#1C252E',
			secondary: '#637381',
			disabled: '#919EAB',
		},
		divider: alpha('#919EAB', 0.24),
	},
	typography: {
		fontFamily: '"Public Sans", "Helvetica Neue", Arial, sans-serif',
		h1: { fontWeight: 800, lineHeight: 1.25 },
		h2: { fontWeight: 800, lineHeight: 1.3 },
		h3: { fontWeight: 700, lineHeight: 1.375 },
		h4: { fontWeight: 700, lineHeight: 1.5 },
		h5: { fontWeight: 700, lineHeight: 1.5 },
		h6: { fontWeight: 700, lineHeight: 1.5 },
		subtitle1: { fontWeight: 600, lineHeight: 1.5 },
		subtitle2: { fontWeight: 600, lineHeight: 1.57 },
		body1: { lineHeight: 1.5 },
		body2: { lineHeight: 1.57 },
		caption: { lineHeight: 1.5 },
		button: { fontWeight: 700, textTransform: 'none' },
	},
	shape: { borderRadius: 8 },
	shadows: [
		'none',
		'0px 1px 2px rgba(145, 158, 171, 0.16)',
		'0px 2px 4px rgba(145, 158, 171, 0.16)',
		'0px 4px 8px rgba(145, 158, 171, 0.16)',
		'0px 8px 16px rgba(145, 158, 171, 0.16)',
		'0px 12px 24px rgba(145, 158, 171, 0.16)',
		'0px 16px 32px rgba(145, 158, 171, 0.16)',
		'0px 20px 40px rgba(145, 158, 171, 0.16)',
		'0px 24px 48px rgba(145, 158, 171, 0.16)',
		'0px 28px 56px rgba(145, 158, 171, 0.16)',
		'0px 32px 64px rgba(145, 158, 171, 0.16)',
		'0px 36px 72px rgba(145, 158, 171, 0.16)',
		'0px 40px 80px rgba(145, 158, 171, 0.16)',
		'0px 44px 88px rgba(145, 158, 171, 0.16)',
		'0px 48px 96px rgba(145, 158, 171, 0.16)',
		'0px 52px 104px rgba(145, 158, 171, 0.16)',
		'0px 56px 112px rgba(145, 158, 171, 0.16)',
		'0px 60px 120px rgba(145, 158, 171, 0.16)',
		'0px 64px 128px rgba(145, 158, 171, 0.16)',
		'0px 68px 136px rgba(145, 158, 171, 0.16)',
		'0px 72px 144px rgba(145, 158, 171, 0.16)',
		'0px 76px 152px rgba(145, 158, 171, 0.16)',
		'0px 80px 160px rgba(145, 158, 171, 0.16)',
		'0px 84px 168px rgba(145, 158, 171, 0.16)',
		'0px 88px 176px rgba(145, 158, 171, 0.16)',
	],
	components: {
		MuiButton: {
			styleOverrides: {
				root: {
					boxShadow: 'none',
					'&:hover': { boxShadow: 'none' },
				},
			},
		},
		MuiCard: {
			styleOverrides: {
				root: {
					boxShadow:
						'0px 0px 2px rgba(145, 158, 171, 0.2), 0px 12px 24px rgba(145, 158, 171, 0.12)',
					borderRadius: 16,
				},
			},
		},
		MuiPaper: {
			styleOverrides: {
				root: { backgroundImage: 'none' },
			},
		},
		MuiTableCell: {
			styleOverrides: {
				head: { backgroundColor: '#F4F6F8', fontWeight: 600 },
			},
		},
	},
});
