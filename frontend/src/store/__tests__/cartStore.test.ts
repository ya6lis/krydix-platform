import { act } from '@testing-library/react';
import { useCartStore, type CartItem } from '../cartStore';

const makeItem = (overrides: Partial<CartItem> = {}): CartItem => ({
	id: 'item-1',
	productId: 'prod-1',
	sellerId: 'seller-1',
	sellerName: 'Northern Atelier',
	name: 'Heritage Jacket',
	price: 184,
	qty: 1,
	...overrides,
});

function getStore() {
	return useCartStore.getState();
}

beforeEach(() => {
	act(() => {
		useCartStore.getState().clearCart();
	});
});

describe('cartStore', () => {
	describe('addItem', () => {
		it('adds new item to empty cart', () => {
			act(() => {
				getStore().addItem(makeItem());
			});
			expect(getStore().items).toHaveLength(1);
			expect(getStore().items[0].id).toBe('item-1');
		});

		it('increments qty when same id added again', () => {
			act(() => {
				getStore().addItem(makeItem({ qty: 1 }));
				getStore().addItem(makeItem({ qty: 2 }));
			});
			expect(getStore().items).toHaveLength(1);
			expect(getStore().items[0].qty).toBe(3);
		});

		it('adds separate items for different ids', () => {
			act(() => {
				getStore().addItem(makeItem({ id: 'item-1' }));
				getStore().addItem(makeItem({ id: 'item-2' }));
			});
			expect(getStore().items).toHaveLength(2);
		});
	});

	describe('removeItem', () => {
		it('removes item by id', () => {
			act(() => {
				getStore().addItem(makeItem());
				getStore().removeItem('item-1');
			});
			expect(getStore().items).toHaveLength(0);
		});

		it('no-ops on unknown id', () => {
			act(() => {
				getStore().addItem(makeItem());
				getStore().removeItem('does-not-exist');
			});
			expect(getStore().items).toHaveLength(1);
		});
	});

	describe('updateQty', () => {
		it('updates qty for existing item', () => {
			act(() => {
				getStore().addItem(makeItem({ qty: 1 }));
				getStore().updateQty('item-1', 5);
			});
			expect(getStore().items[0].qty).toBe(5);
		});

		it('removes item when qty set to 0', () => {
			act(() => {
				getStore().addItem(makeItem());
				getStore().updateQty('item-1', 0);
			});
			expect(getStore().items).toHaveLength(0);
		});

		it('removes item when qty set to negative', () => {
			act(() => {
				getStore().addItem(makeItem());
				getStore().updateQty('item-1', -1);
			});
			expect(getStore().items).toHaveLength(0);
		});
	});

	describe('clearCart', () => {
		it('empties items and resets promoCode', () => {
			act(() => {
				getStore().addItem(makeItem());
				getStore().setPromoCode('SAVE10');
				getStore().clearCart();
			});
			expect(getStore().items).toHaveLength(0);
			expect(getStore().promoCode).toBeNull();
		});
	});

	describe('derived: itemCount', () => {
		it('sums qty across all items', () => {
			act(() => {
				getStore().addItem(makeItem({ id: 'item-1', qty: 2 }));
				getStore().addItem(makeItem({ id: 'item-2', qty: 3 }));
			});
			expect(getStore().itemCount()).toBe(5);
		});

		it('returns 0 for empty cart', () => {
			expect(getStore().itemCount()).toBe(0);
		});
	});

	describe('derived: subtotal', () => {
		it('computes price × qty sum', () => {
			act(() => {
				getStore().addItem(makeItem({ id: 'item-1', price: 100, qty: 2 }));
				getStore().addItem(makeItem({ id: 'item-2', price: 50, qty: 1 }));
			});
			expect(getStore().subtotal()).toBe(250);
		});
	});

	describe('derived: sellerGroups', () => {
		it('groups items by sellerId', () => {
			act(() => {
				getStore().addItem(makeItem({ id: 'i1', sellerId: 'seller-A' }));
				getStore().addItem(makeItem({ id: 'i2', sellerId: 'seller-B' }));
				getStore().addItem(makeItem({ id: 'i3', sellerId: 'seller-A' }));
			});
			const groups = getStore().sellerGroups();
			expect(Object.keys(groups)).toHaveLength(2);
			expect(groups['seller-A']).toHaveLength(2);
			expect(groups['seller-B']).toHaveLength(1);
		});
	});

	describe('setPromoCode', () => {
		it('sets promo code', () => {
			act(() => {
				getStore().setPromoCode('PROMO20');
			});
			expect(getStore().promoCode).toBe('PROMO20');
		});

		it('clears promo code with null', () => {
			act(() => {
				getStore().setPromoCode('PROMO20');
				getStore().setPromoCode(null);
			});
			expect(getStore().promoCode).toBeNull();
		});
	});
});
