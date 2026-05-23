import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Popover, Typography, Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faSearch,
	faBell,
	faChevronDown,
	faTrash,
	faArrowRight,
	faShoppingCart,
	faTimes,
	faCheckDouble,
} from '@fortawesome/free-solid-svg-icons';
import { tokens } from '@/theme';
import { useCartStore } from '@/store/cartStore';
import { useTranslation as useI18n } from 'react-i18next';
import i18n from '@/i18n';

/* ── breadcrumb types ────────────────────────────────────────── */
export interface Breadcrumb {
	label: string;
	href?: string;
}

interface AppNavbarProps {
	breadcrumbs?: Breadcrumb[];
}

/* ── static mock notifications ───────────────────────────────── */
const NOTIF_TABS = [
	'shell.notif.tab.all',
	'shell.notif.tab.unread',
	'shell.notif.tab.orders',
	'shell.notif.tab.system',
];

/* ── icon button base sx ─────────────────────────────────────── */
const iconBtnSx = {
	width: 36,
	height: 36,
	borderRadius: '10px',
	background: tokens.surface,
	border: `1px solid ${tokens.line}`,
	display: 'grid',
	placeItems: 'center',
	color: tokens.ink2,
	cursor: 'pointer',
	position: 'relative' as const,
	transition: 'border-color 120ms, color 120ms',
	flexShrink: 0,
	'&:hover': { borderColor: tokens.ink3, color: tokens.ink1 },
};

/* ── component ───────────────────────────────────────────────── */
export default function AppNavbar({ breadcrumbs }: AppNavbarProps) {
	const { t } = useTranslation();
	const cartItems = useCartStore((s) => s.items);
	const removeItem = useCartStore((s) => s.removeItem);
	const subtotal = useCartStore((s) => s.subtotal);
	const sellerGroups = useCartStore((s) => s.sellerGroups);
	const itemCount = useCartStore((s) => s.itemCount);

	const [cartAnchor, setCartAnchor] = useState<HTMLElement | null>(null);
	const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
	const [langAnchor, setLangAnchor] = useState<HTMLElement | null>(null);
	const [notifTab, setNotifTab] = useState(0);
	const [lang, setLang] = useState(i18n.language.startsWith('uk') ? 'UK' : 'EN');

	const cartOpen = Boolean(cartAnchor);
	const notifOpen = Boolean(notifAnchor);
	const langOpen = Boolean(langAnchor);

	const selectLang = (code: 'EN' | 'UK') => {
		i18n.changeLanguage(code === 'EN' ? 'en' : 'uk');
		setLang(code);
		setLangAnchor(null);
	};

	const groups = sellerGroups();
	const sellerCount = Object.keys(groups).length;
	const count = itemCount();

	return (
		<Box
			component="header"
			sx={{
				position: 'sticky',
				top: 0,
				zIndex: 1100,
				background: `rgba(244,246,248,0.92)`,
				backdropFilter: 'blur(8px)',
				borderBottom: `1px solid ${tokens.line}`,
				padding: '14px 36px',
				display: 'flex',
				alignItems: 'center',
				gap: '14px',
			}}
		>
			{/* ── breadcrumbs ── */}
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					gap: '8px',
					fontSize: 13,
					color: tokens.ink3,
				}}
			>
				<Box component={Link} to="/" sx={{ textDecoration: 'none', color: 'inherit' }}>
					Krydix
				</Box>
				{breadcrumbs?.map((crumb, i) => (
					<Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<Box component="span" sx={{ opacity: 0.5 }}>
							/
						</Box>
						{crumb.href && i < breadcrumbs.length - 1 ? (
							<Box
								component={Link}
								to={crumb.href}
								sx={{ textDecoration: 'none', color: 'inherit' }}
							>
								{crumb.label}
							</Box>
						) : (
							<Box component="span" sx={{ color: tokens.ink1, fontWeight: 600 }}>
								{crumb.label}
							</Box>
						)}
					</Box>
				))}
			</Box>

			{/* ── search ── */}
			<Box
				sx={{
					marginLeft: 'auto',
					flex: 1,
					maxWidth: 520,
					display: 'flex',
					alignItems: 'center',
					gap: '8px',
					background: tokens.surface,
					border: `1px solid ${tokens.line}`,
					borderRadius: '10px',
					padding: '7px 14px',
					color: tokens.ink3,
					fontSize: 13,
					cursor: 'text',
					userSelect: 'none',
					transition: 'border-color 120ms',
					'&:hover': { borderColor: tokens.ink3 },
				}}
			>
				<FontAwesomeIcon icon={faSearch} style={{ width: 14, height: 14 }} />
				<Box component="span" sx={{ flex: 1 }}>
					{t('shell.search.placeholder')}
				</Box>
			</Box>

			{/* ── lang switcher ── */}
			<Box sx={{ position: 'relative' }}>
				<Box
					component="button"
					onClick={(e) => setLangAnchor(e.currentTarget)}
					sx={{
						...iconBtnSx,
						width: 'auto',
						padding: '0 10px',
						display: 'inline-flex',
						alignItems: 'center',
						gap: '6px',
						fontSize: 12,
						fontWeight: 600,
						color: langOpen ? tokens.accentInk : tokens.ink2,
						borderColor: langOpen ? tokens.accent : undefined,
						background: langOpen ? tokens.accentSoft : tokens.surface,
					}}
				>
					{lang}
					<FontAwesomeIcon
						icon={faChevronDown}
						style={{
							width: 10,
							height: 10,
							transform: langOpen ? 'rotate(180deg)' : 'rotate(0deg)',
							transition: 'transform 150ms',
						}}
					/>
				</Box>
				<Popover
					open={langOpen}
					anchorEl={langAnchor}
					onClose={() => setLangAnchor(null)}
					anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
					transformOrigin={{ vertical: 'top', horizontal: 'right' }}
					PaperProps={{
						sx: {
							minWidth: 170,
							borderRadius: '12px',
							border: `1px solid ${tokens.line}`,
							boxShadow: tokens.shadowMd,
							mt: '6px',
							overflow: 'hidden',
							padding: '6px',
						},
					}}
				>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
					{(['EN', 'UK'] as const).map((code) => (
						<Box
							key={code}
							component="button"
							onClick={() => selectLang(code)}
							sx={{
								width: '100%',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								gap: '24px',
								padding: '9px 14px',
								borderRadius: '8px',
								border: 'none',
								background: lang === code ? tokens.accentSoft : 'transparent',
								color: lang === code ? tokens.accentInk : tokens.ink1,
								fontSize: 13,
								fontWeight: lang === code ? 700 : 500,
								cursor: 'pointer',
								transition: 'background 100ms',
								'&:hover': lang !== code ? { background: tokens.surface2 } : {},
							}}
						>
							{code === 'EN' ? 'English' : 'Українська'}
							{lang === code && (
								<Box component="span" sx={{ fontSize: 12, color: tokens.accent }}>✓</Box>
							)}
						</Box>
					))}
					</Box>
				</Popover>
			</Box>

			{/* ── cart button ── */}
			<Box sx={{ position: 'relative' }}>
				<Box
					component="button"
					onClick={(e) => setCartAnchor(e.currentTarget)}
					sx={iconBtnSx}
					aria-label={t('shell.cart.title')}
				>
					<FontAwesomeIcon icon={faShoppingCart} style={{ width: 16, height: 16 }} />
					{count > 0 && (
						<Box
							sx={{
								position: 'absolute',
								top: -4,
								right: -4,
								background: tokens.coral,
								color: '#fff',
								fontSize: 10,
								fontWeight: 700,
								height: 16,
								minWidth: 16,
								padding: '0 4px',
								borderRadius: 8,
								display: 'grid',
								placeItems: 'center',
							}}
						>
							{count}
						</Box>
					)}
				</Box>

				{/* Cart popover */}
				<Popover
					open={cartOpen}
					anchorEl={cartAnchor}
					onClose={() => setCartAnchor(null)}
					anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
					transformOrigin={{ vertical: 'top', horizontal: 'right' }}
					PaperProps={{
						sx: {
							width: 360,
							borderRadius: '14px',
							border: `1px solid ${tokens.line}`,
							boxShadow: tokens.shadowMd,
							mt: '8px',
							overflow: 'hidden',
						},
					}}
				>
					<CartDropdown
						items={cartItems}
						groups={groups}
						sellerCount={sellerCount}
						subtotal={subtotal()}
						onRemove={removeItem}
						onClose={() => setCartAnchor(null)}
					/>
				</Popover>
			</Box>

			{/* ── notifications button ── */}
			<Box sx={{ position: 'relative' }}>
				<Box
					component="button"
					onClick={(e) => setNotifAnchor(e.currentTarget)}
					sx={iconBtnSx}
					aria-label={t('shell.notif.title')}
				>
					<FontAwesomeIcon icon={faBell} style={{ width: 16, height: 16 }} />
					{/* static unread badge — Phase 13 wires real data */}
					<Box
						sx={{
							position: 'absolute',
							top: -4,
							right: -4,
							background: tokens.coral,
							color: '#fff',
							fontSize: 10,
							fontWeight: 700,
							height: 16,
							minWidth: 16,
							padding: '0 4px',
							borderRadius: 8,
							display: 'grid',
							placeItems: 'center',
						}}
					>
						3
					</Box>
				</Box>

				{/* Notifications popover */}
				<Popover
					open={notifOpen}
					anchorEl={notifAnchor}
					onClose={() => setNotifAnchor(null)}
					anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
					transformOrigin={{ vertical: 'top', horizontal: 'right' }}
					PaperProps={{
						sx: {
							width: 400,
							borderRadius: '14px',
							border: `1px solid ${tokens.line}`,
							boxShadow: tokens.shadowMd,
							mt: '8px',
							overflow: 'hidden',
						},
					}}
				>
					<NotifDropdown activeTab={notifTab} onTabChange={setNotifTab} tabs={NOTIF_TABS} />
				</Popover>
			</Box>
		</Box>
	);
}

/* ── CartDropdown ────────────────────────────────────────────── */
import type { CartItem } from '@/store/cartStore';

function CartDropdown({
	items,
	groups,
	sellerCount,
	subtotal,
	onRemove,
	onClose,
}: {
	items: CartItem[];
	groups: Record<string, CartItem[]>;
	sellerCount: number;
	subtotal: number;
	onRemove: (id: string) => void;
	onClose: () => void;
}) {
	const { t } = useI18n();

	return (
		<Box>
			{/* head */}
			<Box
				sx={{
					padding: '16px 18px',
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
				}}
			>
				<Box>
					<Typography sx={{ fontWeight: 700, fontSize: 15 }}>{t('shell.cart.title')}</Typography>
					<Typography sx={{ fontSize: 12, color: tokens.ink3, mt: '2px' }}>
						{items.length === 0
							? t('shell.cart.empty')
							: t('shell.cart.itemsFrom', {
									count: items.reduce((a, i) => a + i.qty, 0),
									sellers: sellerCount,
								})}
					</Typography>
				</Box>
				<Box
					component="button"
					onClick={onClose}
					sx={{
						...iconBtnSx,
						width: 28,
						height: 28,
						borderRadius: 7,
						fontSize: 12,
					}}
					aria-label="Close"
				>
					<FontAwesomeIcon icon={faTimes} />
				</Box>
			</Box>

			<Divider sx={{ borderColor: tokens.line }} />

			{/* body */}
			<Box sx={{ maxHeight: 340, overflowY: 'auto', padding: '6px 0' }}>
				{items.length === 0 ? (
					<Box sx={{ padding: '32px 18px', textAlign: 'center', color: tokens.ink3, fontSize: 13 }}>
						{t('shell.cart.empty')}
					</Box>
				) : (
					Object.entries(groups).map(([sellerId, sellerItems]) => (
						<Box key={sellerId}>
							<Typography
								sx={{
									fontSize: '11px',
									fontWeight: 700,
									letterSpacing: '0.06em',
									textTransform: 'uppercase',
									color: tokens.ink3,
									padding: '6px 18px 4px',
								}}
							>
								{sellerItems[0].sellerName}
							</Typography>
							{sellerItems.map((item) => (
								<Box
									key={item.id}
									sx={{
										display: 'flex',
										alignItems: 'flex-start',
										gap: '12px',
										padding: '8px 18px',
										transition: 'background 80ms',
										'&:hover': { background: tokens.bg },
									}}
								>
									{/* thumb */}
									<Box
										sx={{
											width: 44,
											height: 44,
											borderRadius: 8,
											background: tokens.surface2,
											flexShrink: 0,
											overflow: 'hidden',
										}}
									>
										{item.imageUrl && (
											<Box
												component="img"
												src={item.imageUrl}
												alt={item.name}
												sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
											/>
										)}
									</Box>
									{/* info */}
									<Box sx={{ flex: 1, minWidth: 0 }}>
										<Typography
											sx={{
												fontWeight: 600,
												fontSize: 13,
												lineHeight: 1.3,
												color: tokens.ink1,
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap',
											}}
										>
											{item.name}
											{item.variant ? ` — ${item.variant}` : ''}
										</Typography>
										<Typography sx={{ fontSize: '11.5px', color: tokens.ink3, mt: '2px' }}>
											Qty {item.qty} · ${(item.price * item.qty).toFixed(2)}
										</Typography>
									</Box>
									{/* remove */}
									<Box
										component="button"
										onClick={() => onRemove(item.id)}
										sx={{
											width: 28,
											height: 28,
											borderRadius: 6,
											border: 'none',
											background: 'transparent',
											color: tokens.ink3,
											cursor: 'pointer',
											display: 'grid',
											placeItems: 'center',
											fontSize: 12,
											transition: 'background 120ms, color 120ms',
											'&:hover': {
												background: tokens.coralSoft,
												color: tokens.coralInk,
											},
										}}
										aria-label={t('shell.cart.remove')}
									>
										<FontAwesomeIcon icon={faTrash} />
									</Box>
								</Box>
							))}
						</Box>
					))
				)}
			</Box>

			{items.length > 0 && (
				<>
					<Divider sx={{ borderColor: tokens.line }} />
					{/* footer */}
					<Box sx={{ padding: '14px 18px' }}>
						<Box sx={{ mb: '12px' }}>
							<Box
								sx={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									fontSize: 13,
									color: tokens.ink1,
								}}
							>
								<span>{t('shell.cart.subtotal')}</span>
								<Typography component="strong" sx={{ fontSize: 15, fontWeight: 800 }}>
									${subtotal.toFixed(2)}
								</Typography>
							</Box>
							<Box
								sx={{
									display: 'flex',
									justifyContent: 'space-between',
									fontSize: 12,
									color: tokens.ink3,
									mt: '4px',
								}}
							>
								<span>{t('shell.cart.shipping')}</span>
								<span>{t('shell.cart.shippingCalc')}</span>
							</Box>
						</Box>
						<Box sx={{ display: 'flex', gap: '8px' }}>
							<Box
								component={Link}
								to="/cart"
								onClick={onClose}
								sx={{
									flex: 1,
									display: 'grid',
									placeItems: 'center',
									padding: '9px 16px',
									borderRadius: 10,
									border: `1px solid ${tokens.line}`,
									background: tokens.surface,
									color: tokens.ink1,
									fontSize: 13,
									fontWeight: 600,
									textDecoration: 'none',
									transition: 'border-color 120ms',
									'&:hover': { borderColor: tokens.ink3 },
								}}
							>
								{t('shell.cart.viewCart')}
							</Box>
							<Box
								component={Link}
								to="/checkout"
								onClick={onClose}
								sx={{
									flex: 1,
									display: 'grid',
									placeItems: 'center',
									padding: '9px 16px',
									borderRadius: 10,
									background: tokens.accent,
									color: '#fff',
									fontSize: 13,
									fontWeight: 600,
									textDecoration: 'none',
									transition: 'opacity 120ms',
									'&:hover': { opacity: 0.88 },
								}}
							>
								{t('shell.cart.checkout')}
							</Box>
						</Box>
					</Box>
				</>
			)}
		</Box>
	);
}

/* ── NotifDropdown ───────────────────────────────────────────── */
function NotifDropdown({
	activeTab,
	onTabChange,
	tabs,
}: {
	activeTab: number;
	onTabChange: (i: number) => void;
	tabs: string[];
}) {
	const { t } = useI18n();

	return (
		<Box>
			{/* head */}
			<Box
				sx={{
					padding: '16px 18px',
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
				}}
			>
				<Box>
					<Typography sx={{ fontWeight: 700, fontSize: 15 }}>{t('shell.notif.title')}</Typography>
					<Typography sx={{ fontSize: 12, color: tokens.ink3, mt: '2px' }}>
						{t('shell.notif.unread', { count: 3 })}
					</Typography>
				</Box>
				<Box
					component="button"
					sx={{
						border: 'none',
						background: 'transparent',
						fontSize: 12,
						fontWeight: 600,
						color: tokens.ink2,
						cursor: 'pointer',
						padding: '4px 8px',
						borderRadius: 6,
						display: 'flex',
						alignItems: 'center',
						gap: '5px',
						transition: 'background 120ms',
						'&:hover': { background: tokens.accentSoft },
					}}
				>
					<FontAwesomeIcon icon={faCheckDouble} style={{ width: 12 }} />
					{t('shell.notif.markAllRead')}
				</Box>
			</Box>

			{/* tabs */}
			<Box
				sx={{
					display: 'flex',
					gap: '4px',
					padding: '0 18px 12px',
					borderBottom: `1px solid ${tokens.line}`,
				}}
			>
				{tabs.map((tab, i) => (
					<Box
						key={tab}
						component="button"
						onClick={() => onTabChange(i)}
						sx={{
							border: 'none',
							padding: '5px 10px',
							borderRadius: 7,
							fontSize: 12,
							fontWeight: 500,
							cursor: 'pointer',
							color: activeTab === i ? '#fff' : tokens.ink2,
							background: activeTab === i ? tokens.ink1 : 'transparent',
							transition: 'background 120ms, color 120ms',
							'&:hover': activeTab !== i ? { background: tokens.surface2, color: tokens.ink2 } : {},
						}}
					>
						{t(tab)}
					</Box>
				))}
			</Box>

			{/* body — static for now, Phase 13 wires real data */}
			<Box sx={{ maxHeight: 380, overflowY: 'auto' }}>
				<Box
					sx={{
						padding: '32px 18px',
						textAlign: 'center',
						color: tokens.ink3,
						fontSize: 13,
					}}
				>
					{t('shell.notif.empty')}
				</Box>
			</Box>

			{/* foot */}
			<Box
				sx={{
					padding: '12px 18px',
					borderTop: `1px solid ${tokens.line}`,
				}}
			>
				<Box
					component={Link}
					to="/notifications"
					sx={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: '6px',
						fontSize: 13,
						fontWeight: 600,
						color: tokens.accent,
						textDecoration: 'none',
						'&:hover': { textDecoration: 'underline' },
					}}
				>
					{t('shell.notif.viewAll')}
					<FontAwesomeIcon icon={faArrowRight} style={{ width: 13 }} />
				</Box>
			</Box>
		</Box>
	);
}
