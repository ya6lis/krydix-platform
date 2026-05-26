import { jest } from '@jest/globals';

jest.mock('../../repositories/categoryRepository.js');
jest.mock('../auditLogService.js');

import * as repo from '../../repositories/categoryRepository.js';
import * as auditLog from '../auditLogService.js';
import * as service from '../categoryService.js';
import { Role } from '../../constants/enums.js';

const flatCategories = [
	{
		id: 'root-1',
		slug: 'clothing',
		icon: 'tags',
		parentId: null,
		sortOrder: 0,
		isActive: true,
		deletedAt: null,
		translations: [
			{ language: 'EN', name: 'Clothing', description: null, metaTitle: null, metaDescription: null },
			{ language: 'UK', name: 'Одяг', description: null, metaTitle: null, metaDescription: null },
		],
		_count: { products: 5, children: 1 },
	},
	{
		id: 'child-1',
		slug: 'jackets',
		icon: 'J',
		parentId: 'root-1',
		sortOrder: 0,
		isActive: true,
		deletedAt: null,
		translations: [
			{ language: 'EN', name: 'Jackets', description: null, metaTitle: null, metaDescription: null },
		],
		_count: { products: 2, children: 0 },
	},
];

beforeEach(() => {
	jest.clearAllMocks();
	(auditLog.log as jest.Mock).mockResolvedValue(undefined);
	(repo.findAllCategoriesAdmin as jest.Mock).mockResolvedValue(flatCategories);
});

describe('getCategoryTree', () => {
	it('builds nested tree with depth', async () => {
		const tree = await service.getCategoryTree();
		expect(tree).toHaveLength(1);
		expect(tree[0].depth).toBe(1);
		expect(tree[0].children[0].depth).toBe(2);
		expect(tree[0].children[0].slug).toBe('jackets');
	});
});

describe('createCategory', () => {
	it('creates top-level category for admin', async () => {
		(repo.findCategoryBySlugAdmin as jest.Mock).mockResolvedValue(null);
		(repo.getMaxSortOrder as jest.Mock).mockResolvedValue(0);
		(repo.createCategoryRecord as jest.Mock).mockResolvedValue({
			...flatCategories[0],
			id: 'new-1',
			slug: 'footwear',
		});
		(repo.findAllCategoriesAdmin as jest.Mock)
			.mockResolvedValueOnce(flatCategories)
			.mockResolvedValueOnce([
				...flatCategories,
				{
					...flatCategories[0],
					id: 'new-1',
					slug: 'footwear',
					parentId: null,
					_count: { products: 0, children: 0 },
				},
			]);

		const result = await service.createCategory('admin-1', Role.ADMIN, {
			slug: 'footwear',
			nameEn: 'Footwear',
			nameUk: 'Взуття',
		});

		expect(result.slug).toBe('footwear');
		expect(repo.createCategoryRecord).toHaveBeenCalled();
		expect(auditLog.log).toHaveBeenCalled();
	});

	it('rejects non-admin', async () => {
		await expect(
			service.createCategory('mod-1', Role.MODERATOR, {
				slug: 'footwear',
				nameEn: 'Footwear',
			}),
		).rejects.toThrow('Administrator access required');
	});
});

describe('deleteCategory', () => {
	it('blocks delete when products are assigned', async () => {
		(repo.countCategoryProducts as jest.Mock).mockResolvedValue(3);

		await expect(service.deleteCategory('admin-1', Role.ADMIN, 'root-1')).rejects.toThrow(
			'Cannot delete category with assigned products',
		);
	});

	it('soft deletes empty leaf category', async () => {
		(repo.countCategoryProducts as jest.Mock).mockResolvedValue(0);
		(repo.softDeleteCategory as jest.Mock).mockResolvedValue(flatCategories[1]);

		const result = await service.deleteCategory('admin-1', Role.ADMIN, 'child-1');
		expect(result).toBe(true);
		expect(repo.softDeleteCategory).toHaveBeenCalledWith('child-1');
	});
});

describe('moveCategory', () => {
	it('reorders siblings under same parent', async () => {
		(repo.reorderSiblings as jest.Mock).mockResolvedValue(undefined);
		(repo.findAllCategoriesAdmin as jest.Mock)
			.mockResolvedValueOnce(flatCategories)
			.mockResolvedValueOnce(flatCategories);

		await service.moveCategory('admin-1', Role.ADMIN, {
			id: 'child-1',
			parentId: 'root-1',
			sortOrder: 0,
		});

		expect(repo.reorderSiblings).toHaveBeenCalledWith('root-1', ['child-1']);
	});
});
