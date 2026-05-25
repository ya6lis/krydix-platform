import { DeliveryMethod } from '@/constants/enums';
import type { AuthUser } from '@/store/authStore';

export const CHECKOUT_CONTACT_STORAGE_KEY = 'krydix_checkout_contact';

export interface CheckoutContactDraft {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
}

export const NOVA_POST_BRANCHES = [
	{ value: 'kyiv-001', labelKey: 'checkout.delivery.branches.kyiv001' },
	{ value: 'lviv-014', labelKey: 'checkout.delivery.branches.lviv014' },
	{ value: 'odesa-022', labelKey: 'checkout.delivery.branches.odesa022' },
	{ value: 'dnipro-031', labelKey: 'checkout.delivery.branches.dnipro031' },
] as const;

export function normalizeCardNumber(value: string) {
	return value.replace(/\D/g, '').slice(0, 19);
}

export function formatCardNumber(value: string) {
	const digits = normalizeCardNumber(value);
	return digits.replace(/(.{4})/g, '$1 ').trim();
}

export function isValidCardNumber(value: string) {
	const digits = normalizeCardNumber(value);
	if (digits.length < 13 || digits.length > 19) {
		return false;
	}

	let sum = 0;
	let doubleDigit = false;

	for (let index = digits.length - 1; index >= 0; index -= 1) {
		let digit = Number(digits[index]);
		if (doubleDigit) {
			digit *= 2;
			if (digit > 9) digit -= 9;
		}
		sum += digit;
		doubleDigit = !doubleDigit;
	}

	return sum % 10 === 0;
}

export function isValidCardExpiry(value: string, now = new Date()) {
	const match = value.trim().match(/^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/);
	if (!match) {
		return false;
	}

	const month = Number(match[1]);
	const yearPart = match[2];
	const year = yearPart.length === 2 ? 2000 + Number(yearPart) : Number(yearPart);
	const expiryDate = new Date(year, month, 0, 23, 59, 59, 999);
	return expiryDate >= now;
}

export function isValidCardCvv(value: string) {
	return /^\d{3,4}$/.test(value.trim());
}

export function getCheckoutContactDefaults(
	user: AuthUser | null,
	draft: Partial<CheckoutContactDraft> | null = null
): CheckoutContactDraft {
	return {
		firstName: draft?.firstName ?? user?.profile?.firstName ?? '',
		lastName: draft?.lastName ?? user?.profile?.lastName ?? '',
		email: draft?.email ?? user?.email ?? '',
		phone: draft?.phone ?? '',
	};
}

export function computeShippingAmount(method: DeliveryMethod, subtotal: number) {
	if (method === DeliveryMethod.SELF_PICKUP) {
		return 0;
	}

	const baseShipping = method === DeliveryMethod.COURIER ? 79 : 49;
	const freeShippingThreshold = method === DeliveryMethod.COURIER ? 1500 : 1000;

	return subtotal >= freeShippingThreshold ? 0 : baseShipping;
}

export function computeCheckoutTotal(subtotal: number, shipping: number, promoDiscount: number) {
	return Math.max(0, subtotal + shipping - promoDiscount);
}

export function readCheckoutContactDraft() {
	if (typeof window === 'undefined') {
		return null;
	}

	try {
		const raw = window.localStorage.getItem(CHECKOUT_CONTACT_STORAGE_KEY);
		return raw ? (JSON.parse(raw) as Partial<CheckoutContactDraft>) : null;
	} catch {
		return null;
	}
}

export function saveCheckoutContactDraft(draft: CheckoutContactDraft) {
	if (typeof window === 'undefined') {
		return;
	}

	window.localStorage.setItem(CHECKOUT_CONTACT_STORAGE_KEY, JSON.stringify(draft));
}