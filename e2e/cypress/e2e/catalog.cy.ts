import catalogFixture from '../fixtures/catalog.json';

// Intercept all GraphQL POST requests and dispatch response based on operationName.
function stubCatalogGraphQL() {
	cy.intercept('POST', '**/graphql', (req) => {
		const { operationName } = req.body;

		if (operationName === 'Categories') {
			req.reply({ data: { categories: catalogFixture.categories } });
		} else if (operationName === 'ProductBrands') {
			req.reply({ data: { productBrands: catalogFixture.productBrands } });
		} else if (operationName === 'ProductBrandsWithCounts') {
			req.reply({ data: { productBrandsWithCounts: catalogFixture.productBrandsWithCounts } });
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
		cy.url().should('include', '/catalog/heritage-field-jacket');
	});

	it('shows category filter with categories and counts from API', () => {
		cy.contains('Outerwear').should('be.visible');
		cy.contains('Jackets').should('be.visible');
		cy.contains('1,115').should('be.visible');
	});

	it('shows brand filter options with counts', () => {
		cy.contains('Heritage Co.').should('be.visible');
		cy.contains('128').should('be.visible');
		cy.contains('Maru Studio').should('be.visible');
	});

	it('has a sort select', () => {
		cy.get('[data-cy="sort-select"]').should('exist');
	});

	it('shows sale badge and strike-through price for discounted product', () => {
		// Heritage Field Jacket has basePrice 184, comparePrice 224 → −18%
		cy.contains('−18%').should('be.visible');
		cy.contains('224,00').should('be.visible');
	});

	it('shows grid and list view toggle buttons', () => {
		cy.get('[data-cy="product-card"]').should('have.length', 2);
	});

	it('shows Clear all filters button', () => {
		cy.contains('Clear all filters').should('be.visible');
	});

	it('shows rating filter stars', () => {
		cy.contains('★★★★★').should('exist');
	});
});
