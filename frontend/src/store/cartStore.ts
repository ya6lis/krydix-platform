import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
	id: string;
	productId: string;
	variantId?: string;
	sellerId: string;
	sellerName: string;
	name: string;
	variant?: string;
	price: number;
	qty: number;
	stock: number;
	imageUrl?: string;
}

interface CartState {
	items: CartItem[];
	promoCode: string | null;

	// derived
	itemCount: () => number;
	subtotal: () => number;
	sellerGroups: () => Record<string, CartItem[]>;

	// actions
	addItem: (item: CartItem) => void;
	removeItem: (id: string) => void;
	updateQty: (id: string, qty: number) => void;
	clearCart: () => void;
	setPromoCode: (code: string | null) => void;
}

export const useCartStore = create<CartState>()(
	persist(
		(set, get) => ({
			items: [],
			promoCode: null,

			itemCount: () => get().items.reduce((acc, i) => acc + i.qty, 0),
			subtotal: () => get().items.reduce((acc, i) => acc + i.price * i.qty, 0),
			sellerGroups: () =>
				get().items.reduce<Record<string, CartItem[]>>((acc, item) => {
					if (!acc[item.sellerId]) acc[item.sellerId] = [];
					acc[item.sellerId].push(item);
					return acc;
				}, {}),

			addItem: (item) =>
				set((state) => {
					const existing = state.items.find((i) => i.id === item.id);
					if (existing) {
						const merged = Math.min(existing.stock, existing.qty + item.qty);
						if (merged === existing.qty) return state; // already at stock cap
						return {
							items: state.items.map((i) => (i.id === item.id ? { ...i, qty: merged } : i)),
						};
					}
					return { items: [...state.items, { ...item, qty: Math.min(item.stock, item.qty) }] };
				}),

			removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

			updateQty: (id, qty) =>
				set((state) => ({
					items:
						qty <= 0
							? state.items.filter((i) => i.id !== id)
							: state.items.map((i) => (i.id === id ? { ...i, qty } : i)),
				})),

			clearCart: () => set({ items: [], promoCode: null }),

			setPromoCode: (code) => set({ promoCode: code }),
		}),
		{ name: 'krydix-cart' }
	)
);
