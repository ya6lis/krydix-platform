import productFixture from '../fixtures/product.json';
import catalogFixture from '../fixtures/catalog.json';

function stubProductGraphQL() {
	cy.intercept('POST', '**/graphql', (req) => {
		const { operationName } = req.body;

		if (operationName === 'Product') {
			req.reply({ data: productFixture });
		} else if (operationName === 'Categories') {
			req.reply({ data: { categories: catalogFixture.categories } });
		} else if (operationName === 'ProductBrands') {
			req.reply({ data: { productBrands: catalogFixture.productBrands } });
		} else if (operationName === 'Products') {
			req.reply({ data: { products: catalogFixture.products } });
		} else {
			req.continue();
		}
	}).as('graphql');
}

function stubMissingProduct() {
	cy.intercept('POST', '**/graphql', (req) => {
		if (req.body.operationName === 'Product') {
			req.reply({ data: { product: null } });
		} else {
			req.continue();
		}
	}).as('graphql');
}

describe('Product page — product found', () => {
	beforeEach(() => {
		stubProductGraphQL();
		cy.visit('/products/heritage-field-jacket');
	});

	it('renders the product title in h1', () => {
		cy.get('h1').should('contain', 'Heritage Field Jacket');
	});

	it('shows the product price', () => {
		cy.contains('184,00').should('be.visible');
	});

	it('shows the seller name', () => {
		cy.contains('Jane Doe').should('be.visible');
	});

	it('shows seller avatar initials', () => {
		cy.contains('JD').should('be.visible');
	});

	it('shows the SKU', () => {
		cy.contains('HFJ-001').should('be.visible');
	});

	it('shows category breadcrumb', () => {
		cy.contains('Outerwear').should('be.visible');
	});

	it('renders gallery thumbnails', () => {
		cy.get('img[src*="placehold.co"]').should('have.length.gte', 1);
	});

	it('shows color swatch options', () => {
		cy.contains('color').should('exist');
		cy.contains('Olive').should('exist');
	});

	it('shows size option buttons', () => {
		cy.contains('S').should('be.visible');
		cy.contains('M').should('be.visible');
		cy.contains('L').should('be.visible');
	});

	it('qty starts at 1', () => {
		cy.get('[data-cy="qty-value"]').should('have.value', '1');
	});

	it('qty decrement is disabled at minimum (1)', () => {
		cy.get('[data-cy="qty-decrement"]').should('be.disabled');
	});

	it('qty increments on + click', () => {
		cy.get('[data-cy="qty-increment"]').click();
		cy.get('[data-cy="qty-value"]').should('have.value', '2');
	});

	it('qty decrements back after incrementing', () => {
		cy.get('[data-cy="qty-increment"]').click();
		cy.get('[data-cy="qty-value"]').should('have.value', '2');
		cy.get('[data-cy="qty-decrement"]').click();
		cy.get('[data-cy="qty-value"]').should('have.value', '1');
	});

	it('switching to Specifications tab shows brand row', () => {
		cy.contains('Specifications').click();
		cy.contains('Brand').should('be.visible');
		cy.contains('Heritage Co.').should('be.visible');
	});

	it('switching to Shipping tab shows shipping info', () => {
		cy.contains('Shipping').click();
		cy.contains('Standard delivery').should('be.visible');
	});

	it('clicking Add to cart as guest redirects to login', () => {
		cy.contains('Add to cart').click();
		cy.url().should('include', '/auth/login');
	});

	it('wishlist button has correct initial aria-label', () => {
		cy.get('[aria-label="Add to wishlist"]').should('exist');
	});

	it('wishlist button toggles on click', () => {
		cy.get('[aria-label="Add to wishlist"]').click();
		cy.get('[aria-label="Remove from wishlist"]').should('exist');
	});
});

describe('Product page — not found', () => {
	it('shows empty state when product does not exist', () => {
		stubMissingProduct();
		cy.visit('/products/nonexistent-product');
		cy.contains('Product not found').should('be.visible');
	});
});
