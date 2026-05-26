const sellerProfile = {
	id: 'seller-1',
	displayName: 'Northern Atelier',
	firstName: 'Deja',
	lastName: 'Brady',
	avatarUrl: null,
	bio: 'Small batch outerwear.',
	companyName: 'Northern Atelier LLC',
	country: 'Ukraine',
	city: 'Kyiv',
	isVerifiedSeller: true,
	memberSince: '2024-01-15T00:00:00.000Z',
	productCount: 1,
	averageRating: 4.8,
	reviewCount: 5,
};

const productItem = {
	id: 'prod-1',
	slug: 'waxed-jacket',
	sku: 'WJ-001',
	brand: 'Heritage Co.',
	basePrice: 120,
	comparePrice: null,
	status: 'APPROVED',
	isAvailable: true,
	title: 'Waxed Field Jacket',
	description: 'Durable waxed cotton jacket.',
	metaTitle: null,
	metaDescription: null,
	mainImage: null,
	rating: 4.8,
	reviewCount: 5,
	totalStock: 10,
	createdAt: '2026-01-01T00:00:00.000Z',
	media: [],
	variants: [],
	categories: [],
	seller: { id: 'seller-1', name: 'Northern Atelier' },
};

function stubGraphQL() {
	cy.intercept('POST', '**/graphql', (req) => {
		const op: string = req.body?.operationName ?? '';

		if (op === 'PublicSellerProfile') {
			req.reply({ data: { publicSellerProfile: sellerProfile } });
		} else if (op === 'Categories') {
			req.reply({
				data: {
					categories: [
						{
							id: 'cat-1',
							slug: 'outerwear',
							parentId: null,
							name: 'Outerwear',
							description: null,
							productCount: 1,
							children: [],
						},
					],
				},
			});
		} else if (op === 'ProductBrandsWithCounts') {
			req.reply({
				data: {
					productBrandsWithCounts: [{ name: 'Heritage Co.', count: 1 }],
				},
			});
		} else if (op === 'Products') {
			req.reply({
				data: {
					products: {
						items: [productItem],
						total: 1,
						page: 1,
						pageSize: 12,
					},
				},
			});
		} else {
			req.continue();
		}
	}).as('graphql');
}

describe('PublicSellerProfilePage', () => {
	beforeEach(() => {
		stubGraphQL();
		cy.visit('/seller/seller-1');
		cy.wait('@graphql');
	});

	it('shows seller storefront and product grid', () => {
		cy.get('[data-testid="public-seller-profile-page"]').should('be.visible');
		cy.contains('Northern Atelier').should('be.visible');
		cy.get('[data-testid="seller-profile-filters"]').should('be.visible');
		cy.get('[data-testid="seller-profile-products"]').should('be.visible');
		cy.contains('Waxed Field Jacket').should('be.visible');
	});
});
