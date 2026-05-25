import sellerFixture from '../fixtures/sellerProducts.json';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setRefreshToken(win: Window) {
	win.localStorage.setItem('krydix_refresh_token', 'stub-rt');
}

function stubSellerAuth(win: Window) {
	setRefreshToken(win);
}

function stubGraphQL(overrides: Record<string, object> = {}) {
	cy.intercept('POST', '**/graphql', (req) => {
		const op: string = req.body?.operationName ?? '';

		if (op === 'RefreshToken') {
			req.reply({ data: sellerFixture.refreshToken });
		} else if (op === 'Me') {
			req.reply({ data: sellerFixture.me });
		} else if (op === 'Categories') {
			req.reply({ data: sellerFixture.categories });
		} else if (op === 'CreateProduct') {
			req.reply({ data: overrides['CreateProduct'] ?? sellerFixture.createProduct });
		} else if (op === 'UpdateProduct') {
			req.reply({ data: overrides['UpdateProduct'] ?? sellerFixture.myProduct });
		} else if (op === 'MyProduct') {
			req.reply({ data: sellerFixture.myProduct });
		} else {
			req.continue();
		}
	}).as('graphql');
}

// ─── Specs ────────────────────────────────────────────────────────────────────

describe('SellerProductFormPage — Create', () => {
	beforeEach(() => {
		cy.visit('/seller-cabinet/products/new', {
			onBeforeLoad: stubSellerAuth,
		});
		stubGraphQL();
	});

	it('renders all form sections', () => {
		cy.contains('sellerProduct.newTitle').should('exist');
		cy.contains('sellerProduct.section.basic').should('exist');
		cy.contains('sellerProduct.section.pricing').should('exist');
		cy.contains('sellerProduct.section.categories').should('exist');
		cy.contains('sellerProduct.section.variants').should('exist');
		cy.contains('sellerProduct.section.media').should('exist');
		cy.contains('sellerProduct.section.seo').should('exist');
	});

	it('auto-generates slug from titleEn input', () => {
		cy.get('input[name="titleEn"]').type('Wireless Earbuds Pro');
		cy.get('input[name="slug"]').should('have.value', 'wireless-earbuds-pro');
	});

	it('slug stays manual once edited', () => {
		cy.get('input[name="slug"]').clear().type('my-custom-slug');
		cy.get('input[name="titleEn"]').type('Some Different Title');
		cy.get('input[name="slug"]').should('have.value', 'my-custom-slug');
	});

	it('shows categories from API', () => {
		cy.contains('Electronics (5)').should('exist');
		cy.contains('Clothing (8)').should('exist');
	});

	it('expands category children on click', () => {
		// Smartphones is a child of Electronics — initially collapsed
		cy.contains('Smartphones').should('not.be.visible');
		// Click expand button next to Electronics
		cy.contains('Electronics (5)').closest('[class*="MuiBox"]').find('button').first().click();
		cy.contains('Smartphones (2)').should('be.visible');
	});

	it('adds a variant row and removes it', () => {
		cy.contains('sellerProduct.variant.add').click();
		cy.contains('Variant #1').should('exist');
		cy.get('input[name="variants.0.options.0.key"]').type('Color');
		cy.get('input[name="variants.0.options.0.value"]').type('Red');

		cy.contains('sellerProduct.variant.remove').click();
		cy.contains('Variant #1').should('not.exist');
	});

	it('shows media save-first note in create mode', () => {
		cy.contains(/Save the product first before uploading images/).should('exist');
	});

	it('creates product and redirects to edit page', () => {
		cy.get('input[name="titleEn"]').type('Wireless Earbuds Pro');
		cy.get('input[name="titleUk"]').type('Бездротові навушники Pro');
		cy.get('textarea[name="descriptionEn"]').type('High quality wireless earbuds');
		cy.get('textarea[name="descriptionUk"]').type('Якісні бездротові навушники');
		cy.get('input[name="sku"]').type('WEP-001');
		cy.get('input[name="basePrice"]').type('79.99');

		// Select a category
		cy.contains('Electronics (5)').prev().click(); // checkbox

		// Submit
		cy.contains('sellerProduct.submitForReview').first().click();

		cy.wait('@graphql').then((interception) => {
			expect(interception.request.body.operationName).to.eq('CreateProduct');
		});

		// Redirects to edit page with new product ID
		cy.url().should('include', '/seller-cabinet/products/prod-new-1/edit');
	});
});

describe('SellerProductFormPage — Edit', () => {
	beforeEach(() => {
		cy.visit('/seller-cabinet/products/prod-existing-1/edit', {
			onBeforeLoad: stubSellerAuth,
		});
		stubGraphQL();
	});

	it('renders edit page title', () => {
		cy.contains('sellerProduct.editTitle').should('exist');
		cy.contains('sellerProduct.breadcrumbEdit').should('exist');
	});

	it('loads existing product data into form', () => {
		cy.get('input[name="titleEn"]').should('have.value', 'Heritage Jacket');
		cy.get('input[name="sku"]').should('have.value', 'JKT-001');
		cy.get('input[name="slug"]').should('have.value', 'existing-jacket');
		cy.get('input[name="basePrice"]').should('have.value', '149.99');
	});

	it('shows existing variant', () => {
		cy.contains('Variant #1').should('exist');
		cy.get('input[name="variants.0.options.0.key"]').should('have.value', 'Size');
		cy.get('input[name="variants.0.options.0.value"]').should('have.value', 'M');
	});

	it('shows media section with main image label', () => {
		cy.contains('sellerProduct.media.mainLabel').should('exist');
		cy.contains('sellerProduct.media.galleryLabel').should('exist');
	});

	it('submits update and calls UpdateProduct mutation', () => {
		cy.get('input[name="titleEn"]').clear().type('Heritage Jacket Updated');

		cy.contains('sellerProduct.updateProduct').first().click();

		cy.wait('@graphql').then((interception) => {
			expect(interception.request.body.operationName).to.eq('UpdateProduct');
		});
	});
});
