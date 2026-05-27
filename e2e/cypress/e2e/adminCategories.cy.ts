import fixture from '../fixtures/adminCategories.json';

const adminSession = {
	refreshToken: {
		refreshToken: {
			accessToken: 'stub-access',
			refreshToken: 'stub-rt',
			user: {
				id: 'admin-1',
				email: 'admin@krydix.dev',
				role: 'ADMIN',
				isEmailVerified: true,
				profile: { firstName: 'Alex', lastName: 'Admin', avatarUrl: null },
			},
		},
	},
	me: {
		me: {
			id: 'admin-1',
			email: 'admin@krydix.dev',
			role: 'ADMIN',
			isEmailVerified: true,
			profile: { firstName: 'Alex', lastName: 'Admin', avatarUrl: null },
		},
	},
};

function stubAuth(win: Window) {
	win.localStorage.setItem('krydix_refresh_token', 'stub-rt');
	win.localStorage.setItem('krydix_stub_role', 'ADMIN');
}

function stubGraphQL(treeState: 'empty' | 'parent' | 'hierarchy' = 'empty') {
	let currentTree =
		treeState === 'hierarchy'
			? fixture.categoryTreeWithHierarchy.categoryTree
			: treeState === 'parent'
				? fixture.categoryTreeWithParent.categoryTree
				: fixture.categoryTreeEmpty.categoryTree;

	cy.intercept('POST', '**/graphql', (req) => {
		const op: string = req.body?.operationName ?? '';

		if (op === 'RefreshToken') {
			req.reply({ data: adminSession.refreshToken });
		} else if (op === 'Me') {
			req.reply({ data: adminSession.me });
		} else if (op === 'CategoryTree') {
			req.reply({ data: { categoryTree: currentTree } });
		} else if (op === 'CreateCategory') {
			const input = req.body.variables?.input;
			const parentId = input?.parentId ?? null;
			const newNode = {
				id: parentId ? 'cat-child-1' : 'cat-parent-1',
				slug: input.slug,
				parentId,
				icon: input.icon ?? null,
				isActive: true,
				sortOrder: 0,
				depth: parentId ? 2 : 1,
				productCount: 0,
				translations: [
					{
						language: 'EN',
						name: input.nameEn,
						description: null,
						metaTitle: null,
						metaDescription: null,
					},
				],
				children: [],
			};

			if (parentId) {
				currentTree = [
					{
						...currentTree[0],
						children: [newNode],
					},
				];
			} else {
				currentTree = [newNode];
			}

			req.reply({ data: { createCategory: newNode } });
		} else {
			req.continue();
		}
	}).as('graphql');
}

describe('AdminCategoriesPage', () => {
	beforeEach(() => {
		stubGraphQL('empty');
		cy.visit('/categories', {
			onBeforeLoad: (win) => stubAuth(win),
		});
	});

	it('renders page title and empty tree state', () => {
		cy.get('[data-testid="admin-categories-page"]').should('be.visible');
		cy.contains('Categories').should('be.visible');
		cy.contains('Hierarchical taxonomy').should('be.visible');
		cy.contains('No categories yet').should('be.visible');
	});

	it('creates top-level category then child and shows hierarchy', () => {
		cy.get('[data-testid="new-top-level-btn"]').click();
		cy.get('[data-testid="category-form"]').should('be.visible');
		cy.get('input[name="nameEn"]').type('Electronics');
		cy.get('input[name="slug"]').clear().type('electronics');
		cy.get('[data-testid="save-category-btn"]').click();

		cy.wait('@graphql');
		cy.get('[data-testid="category-node-electronics"]').should('be.visible');
		cy.contains('Electronics').should('be.visible');

		cy.get('[data-testid="category-node-electronics"]').within(() => {
			cy.contains('Sub').click({ force: true });
		});

		cy.get('[data-testid="category-form"]').should('be.visible');
		cy.get('input[name="nameEn"]').type('Phones');
		cy.get('input[name="slug"]').clear().type('phones');
		cy.get('[data-testid="save-category-btn"]').click();

		cy.wait('@graphql');
		cy.get('[data-testid="category-node-phones"]').should('be.visible');
		cy.contains('Phones').should('be.visible');
		cy.get('[data-testid="category-node-electronics"]').should('be.visible');
	});
});
