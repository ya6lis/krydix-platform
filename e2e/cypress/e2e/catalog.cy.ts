import catalogFixture from '../fixtures/catalog.json';

// Intercept all GraphQL POST requests and dispatch response based on operationName.
function stubCatalogGraphQL() {
	cy.intercept('POST', '**/graphql', (req) => {
		const { operationName } = req.body;

		if (operationName === 'Categories') {
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

describe('Catalog page', () => {
	beforeEach(() => {
		stubCatalogGraphQL();
		cy.visit('/catalog');
	});

	it('renders the page heading', () => {
		cy.contains('h1', 'Catalog').should('be.visible');
	});

	it('shows product cards after data loads', () => {
		cy.get('[data-cy="product-card"]').should('have.length', 2);
	});

	it('shows the results count', () => {
		cy.get('[data-cy="results-count"]').should('contain', '2');
	});

	it('shows product titles on cards', () => {
		cy.contains('Heritage Field Jacket').should('be.visible');
		cy.contains('Canvas Tote Bag').should('be.visible');
	});

	it('navigates to product page when card is clicked', () => {
		cy.get('[data-cy="product-card"]').first().click();
		cy.url().should('include', '/products/heritage-field-jacket');
	});

	it('shows category filter with categories from API', () => {
		cy.contains('Outerwear').should('be.visible');
		cy.contains('Jackets').should('be.visible');
	});

	it('shows brand filter options', () => {
		cy.contains('Heritage Co.').should('be.visible');
	});

	it('has a sort select', () => {
		cy.get('[data-cy="sort-select"]').should('exist');
	});
});
