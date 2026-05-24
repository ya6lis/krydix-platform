// Mock Prisma before imports
const mockPrisma = {
	cartItem: {
		findMany: jest.fn(),
		findFirst: jest.fn(),
		upsert: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
		deleteMany: jest.fn(),
	},
};

jest.mock('../../utils/prisma.js', () => ({ prisma: mockPrisma }));

import * as cartRepo from '../cartRepository.js';

beforeEach(() => {
	jest.clearAllMocks();
});

describe('cartRepository.findCartByUser', () => {
	it('returns items for userId ordered by createdAt', async () => {
		const fakeItems = [{ id: 'ci-1', userId: 'u-1' }];
		mockPrisma.cartItem.findMany.mockResolvedValue(fakeItems);

		const result = await cartRepo.findCartByUser('u-1');

		expect(mockPrisma.cartItem.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { userId: 'u-1' } })
		);
		expect(result).toEqual(fakeItems);
	});
});

describe('cartRepository.findCartItem', () => {
	it('returns cart item if found', async () => {
		const fakeItem = { id: 'ci-1', quantity: 2 };
		mockPrisma.cartItem.findFirst.mockResolvedValue(fakeItem);

		const result = await cartRepo.findCartItem('u-1', 'p-1', null);

		expect(mockPrisma.cartItem.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { userId: 'u-1', productId: 'p-1', variantId: null } })
		);
		expect(result).toEqual(fakeItem);
	});

	it('returns null if not found', async () => {
		mockPrisma.cartItem.findFirst.mockResolvedValue(null);
		const result = await cartRepo.findCartItem('u-1', 'p-99', null);
		expect(result).toBeNull();
	});
});

describe('cartRepository.upsertCartItem', () => {
	it('calls upsert with correct userId, productId, quantity', async () => {
		mockPrisma.cartItem.upsert.mockResolvedValue({});

		await cartRepo.upsertCartItem('u-1', 'p-1', null, 3);

		expect(mockPrisma.cartItem.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				create: expect.objectContaining({ userId: 'u-1', productId: 'p-1', quantity: 3 }),
				update: { quantity: 3 },
			})
		);
	});
});

describe('cartRepository.updateCartItemQty', () => {
	it('calls update with id and new quantity', async () => {
		mockPrisma.cartItem.update.mockResolvedValue({});

		await cartRepo.updateCartItemQty('ci-1', 5);

		expect(mockPrisma.cartItem.update).toHaveBeenCalledWith({
			where: { id: 'ci-1' },
			data: { quantity: 5 },
		});
	});
});

describe('cartRepository.removeCartItem', () => {
	it('deletes cart item by id', async () => {
		mockPrisma.cartItem.delete.mockResolvedValue({});

		await cartRepo.removeCartItem('ci-1');

		expect(mockPrisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: 'ci-1' } });
	});
});

describe('cartRepository.clearCart', () => {
	it('deletes all cart items for userId', async () => {
		mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 3 });

		await cartRepo.clearCart('u-1');

		expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u-1' } });
	});
});
