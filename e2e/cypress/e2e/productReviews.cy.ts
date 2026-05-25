import fixture from '../fixtures/productReviews.json';

const buyerSession = {
	refreshToken: {
		refreshToken: {
			accessToken: 'stub-access',
			refreshToken: 'stub-rt',
			user: {
				id: 'buyer-1',
				email: 'buyer1@krydix.dev',
				role: 'BUYER',
				isEmailVerified: true,
				profile: { firstName: 'Anna', lastName: 'Bondarenko', avatarUrl: null },
			},
		},
	},
	me: {
		me: {
			id: 'buyer-1',
			email: 'buyer1@krydix.dev',
			role: 'BUYER',
			isEmailVerified: true,
			profile: { firstName: 'Anna', lastName: 'Bondarenko', avatarUrl: null },
		},
	},
};

const productFixture = {
	product: {
		id: 'prod-3',
		slug: 'heritage-field-jacket-olive',
		sku: 'NA-HFJ-OLV',
		brand: 'Northern Atelier',
		basePrice: 184,
		comparePrice: 210,
		status: 'APPROVED',
		isAvailable: true,
		title: 'Heritage Field Jacket — Olive',
		description: 'Classic waxed cotton field jacket.',
		mainImage: null,
		rating: 5,
		reviewCount: 1,
		totalStock: 31,
		createdAt: '2026-01-01T00:00:00Z',
		media: [],
		variants: [{ id: 'v1', sku: 'NA-HFJ-OLV-M', options: { size: 'M' }, price: 184, stock: 18, isActive: true }],
		categories: [{ id: 'c1', slug: 'jackets', name: 'Jackets' }],
		seller: { id: 'seller-2', name: 'Northern Atelier' },
	},
};

function stubAuth(win: Window) {
	win.localStorage.setItem('krydix_refresh_token', 'stub-rt');
}

function stubGraphQL(overrides: Record<string, object> = {}) {
	cy.intercept('POST', '**/graphql', (req) => {
		const op: string = req.body?.operationName ?? '';

		if (op === 'RefreshToken') {
			req.reply({ data: buyerSession.refreshToken });
		} else if (op === 'Me') {
			req.reply({ data: buyerSession.me });
		} else if (op === 'Product') {
			req.reply({ data: overrides['Product'] ?? productFixture });
		} else if (op === 'ProductReviews') {
			req.reply({ data: overrides['ProductReviews'] ?? { productReviews: fixture.productReviews } });
		} else if (op === 'ReviewEligibility') {
			req.reply({
				data: overrides['ReviewEligibility'] ?? { reviewEligibility: fixture.reviewEligibility },
			});
		} else if (op === 'CreateProductReview') {
			req.reply({ data: overrides['CreateProductReview'] ?? { createProductReview: fixture.createReview } });
		} else {
			req.continue();
		}
	}).as('graphql');
}

describe('ProductPage — Reviews tab', () => {
	beforeEach(() => {
		stubGraphQL();
		cy.visit('/catalog/heritage-field-jacket-olive', { onBeforeLoad: stubAuth });
	});

	it('shows reviews tab with existing review', () => {
		cy.contains('Reviews').click();
		cy.contains('Buyer reviews').should('be.visible');
		cy.contains('Incredible quality').should('be.visible');
		cy.contains('Anna Bondarenko').should('be.visible');
		cy.contains('Seller response').should('be.visible');
		cy.contains('Thank you for your feedback!').should('be.visible');
	});

	it('shows write review button for buyer with delivered order', () => {
		cy.contains('Reviews').click();
		cy.contains('Write a review').should('be.visible');
	});

	it('submits a review and it appears in the list', () => {
		cy.intercept('POST', '**/graphql', (req) => {
			const op: string = req.body?.operationName ?? '';
			if (op === 'RefreshToken') {
				req.reply({ data: buyerSession.refreshToken });
			} else if (op === 'Me') {
				req.reply({ data: buyerSession.me });
			} else if (op === 'Product') {
				req.reply({ data: productFixture });
			} else if (op === 'ProductReviews') {
				const hasNew = req.body.variables?.input?.page === 1;
				req.reply({
					data: {
						productReviews: hasNew
							? {
									...fixture.productReviews,
									items: [
										...fixture.productReviews.items,
										{
											...fixture.createReview,
											text: 'Great jacket, fits well.',
											reviewerInitials: 'AB',
											reviewerReviewCount: 3,
											reviewerAvatarUrl: null,
											orderId: 'order-new',
											photos: [],
											sellerReply: null,
											isApproved: false,
											isOwn: true,
											isPending: true,
											updatedAt: fixture.createReview.createdAt,
										},
									],
									total: 2,
								}
							: fixture.productReviews,
					},
				});
			} else if (op === 'ReviewEligibility') {
				req.reply({ data: { reviewEligibility: fixture.reviewEligibility } });
			} else if (op === 'CreateProductReview') {
				req.reply({ data: { createProductReview: fixture.createReview } });
			} else {
				req.continue();
			}
		}).as('graphqlSubmit');

		cy.visit('/catalog/heritage-field-jacket-olive', { onBeforeLoad: stubAuth });
		cy.contains('Reviews').click();
		cy.contains('Write a review').click();

		cy.contains('Write a review').should('be.visible');
		cy.get('textarea').type('Great jacket, fits well.');
		cy.contains('Submit review').click();

		cy.contains('Review submitted').should('be.visible');
		cy.contains('Great jacket, fits well.').should('be.visible');
		cy.contains('Pending moderation').should('be.visible');
	});

	it('hides write button when buyer cannot review', () => {
		cy.intercept('POST', '**/graphql', (req) => {
			const op: string = req.body?.operationName ?? '';
			if (op === 'RefreshToken') req.reply({ data: buyerSession.refreshToken });
			else if (op === 'Me') req.reply({ data: buyerSession.me });
			else if (op === 'Product') req.reply({ data: productFixture });
			else if (op === 'ProductReviews')
				req.reply({ data: { productReviews: fixture.productReviews } });
			else if (op === 'ReviewEligibility')
				req.reply({ data: { reviewEligibility: { canWrite: false, orderId: null, existingReviewId: null } } });
			else req.continue();
		}).as('noEligibility');

		cy.visit('/catalog/heritage-field-jacket-olive', { onBeforeLoad: stubAuth });
		cy.contains('Reviews').click();
		cy.contains('Write a review').should('not.exist');
	});
});
