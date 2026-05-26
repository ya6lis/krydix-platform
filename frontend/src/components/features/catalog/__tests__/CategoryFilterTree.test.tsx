import { findCategoryName } from '../CategoryFilterTree';
import type { CategoryNode } from '@/types/catalog';

describe('findCategoryName', () => {
	it('finds a nested category name', () => {
		const categories: CategoryNode[] = [
			{
				id: 'c1',
				slug: 'outerwear',
				parentId: null,
				name: 'Outerwear',
				description: null,
				productCount: 2,
				children: [
					{
						id: 'c2',
						slug: 'jackets',
						parentId: 'c1',
						name: 'Jackets',
						description: null,
						productCount: 1,
						children: [],
					},
				],
			},
		];

		expect(findCategoryName(categories, 'jackets')).toBe('Jackets');
	});

	it('handles nodes with missing children arrays from partial GraphQL data', () => {
		const categories = [
			{
				id: 'c1',
				slug: 'outerwear',
				parentId: null,
				name: 'Outerwear',
				description: null,
				productCount: 2,
				children: [
					{
						id: 'c2',
						slug: 'jackets',
						parentId: 'c1',
						name: 'Jackets',
						description: null,
						productCount: 1,
					},
				],
			},
		] as CategoryNode[];

		expect(findCategoryName(categories, 'jackets')).toBe('Jackets');
		expect(findCategoryName(categories, 'missing')).toBeUndefined();
	});
});
