import sellerFixture from '../fixtures/sellerProducts.json';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stubSellerAuth(win: Window) {
	win.localStorage.setItem('krydix_refresh_token', 'stub-rt');
}

function stubGraphQL(overrides: Record<string, object> = {}) {
	cy.intercept('POST', '**/graphql', (req) => {
		const op: string = req.body?.operationName ?? '';

		if (op === 'RefreshToken') {
			req.reply({ data: sellerFixture.refreshToken });
		} else if (op === 'Me') {
			req.reply({ data: sellerFixture.me });
		} else if (op === 'MyProducts') {
			req.reply({ data: overrides['MyProducts'] ?? sellerFixture.myProducts });
		} else if (op === 'DuplicateProduct') {
			req.reply({ data: overrides['DuplicateProduct'] ?? sellerFixture.duplicateProduct });
		} else if (op === 'ArchiveProduct') {
			req.reply({ data: overrides['ArchiveProduct'] ?? sellerFixture.archiveProduct });
		} else if (op === 'PreviewImport') {
			req.reply({ data: overrides['PreviewImport'] ?? sellerFixture.previewImport });
		} else if (op === 'ConfirmImport') {
			req.reply({ data: overrides['ConfirmImport'] ?? sellerFixture.confirmImport });
		} else if (op === 'ExportMyProducts') {
			req.reply({ data: overrides['ExportMyProducts'] ?? sellerFixture.exportMyProducts });
		} else if (op === 'DownloadProductImportTemplate') {
			req.reply({
				data: overrides['DownloadProductImportTemplate'] ?? sellerFixture.downloadProductImportTemplate,
			});
		} else {
			req.continue();
		}
	}).as('graphql');
}

// ─── Specs ────────────────────────────────────────────────────────────────────

describe('SellerProductsPage — List', () => {
	beforeEach(() => {
		cy.visit('/seller/products', {
			onBeforeLoad: stubSellerAuth,
		});
		stubGraphQL();
	});

	it('renders page title and action buttons', () => {
		cy.contains('sellerProducts.title').should('exist');
		cy.contains('sellerProducts.createButton').should('exist');
		cy.contains('sellerProducts.importButton').should('exist');
	});

	it('shows status filter tabs', () => {
		cy.contains('sellerProducts.filterAll').should('exist');
		cy.contains('sellerProducts.filterDraft').should('exist');
		cy.contains('sellerProducts.filterApproved').should('exist');
		cy.contains('sellerProducts.filterArchived').should('exist');
	});

	it('displays product rows from API', () => {
		cy.contains('Heritage Jacket').should('exist');
		cy.contains('Draft Product').should('exist');
		cy.contains('JKT-001').should('exist');
	});

	it('shows status badges for each product', () => {
		cy.contains('APPROVED').should('exist');
		cy.contains('DRAFT').should('exist');
	});

	it('shows correct stock count', () => {
		// Heritage Jacket has stock 15
		cy.contains('15').should('exist');
	});

	it('navigates to edit page on product title click', () => {
		cy.contains('Heritage Jacket').click();
		cy.url().should('include', '/seller/products/prod-existing-1/edit');
	});

	it('navigates to new product page on create button', () => {
		cy.contains('sellerProducts.createButton').click();
		cy.url().should('include', '/seller/products/new');
	});
});

describe('SellerProductsPage — Duplicate', () => {
	beforeEach(() => {
		cy.visit('/seller/products', {
			onBeforeLoad: stubSellerAuth,
		});
		stubGraphQL();
	});

	it('duplicates product and shows success toast', () => {
		// Open row menu for first product
		cy.contains('Heritage Jacket')
			.closest('tr')
			.find('button')
			.last()
			.click();

		// Click duplicate in menu
		cy.contains('sellerProducts.action.duplicate').click();

		cy.wait('@graphql').then((interception) => {
			expect(interception.request.body.operationName).to.eq('DuplicateProduct');
			expect(interception.request.body.variables.id).to.eq('prod-existing-1');
		});

		cy.contains('sellerProducts.duplicateSuccess').should('exist');
	});
});

describe('SellerProductsPage — Archive', () => {
	beforeEach(() => {
		cy.visit('/seller/products', {
			onBeforeLoad: stubSellerAuth,
		});
		stubGraphQL();
	});

	it('shows archive confirm dialog and archives on confirm', () => {
		// Open row menu for first product
		cy.contains('Heritage Jacket')
			.closest('tr')
			.find('button')
			.last()
			.click();

		cy.contains('sellerProducts.action.archive').click();

		// Confirm dialog appears
		cy.contains('sellerProducts.action.archive').should('exist');

		// Confirm
		cy.contains('confirmDialog.confirm').click();

		cy.wait('@graphql').then((interception) => {
			expect(interception.request.body.operationName).to.eq('ArchiveProduct');
		});

		cy.contains('sellerProducts.archiveSuccess').should('exist');
	});
});

describe('SellerProductsPage — Bulk Import', () => {
	beforeEach(() => {
		cy.visit('/seller/products', {
			onBeforeLoad: stubSellerAuth,
		});
		stubGraphQL();
	});

	it('opens import modal with stepper', () => {
		cy.contains('sellerProducts.importButton').click();
		cy.contains('sellerProducts.import.title').should('exist');
		cy.contains('sellerProducts.import.step1').should('exist');
		cy.contains('sellerProducts.import.step2').should('exist');
		cy.contains('sellerProducts.import.step3').should('exist');
	});

	it('shows file dropzone in step 1', () => {
		cy.contains('sellerProducts.importButton').click();
		cy.contains('sellerProducts.import.dropzone').should('exist');
	});

	it('uploads file → shows preview rows with valid/invalid indicators', () => {
		cy.contains('sellerProducts.importButton').click();

		// Simulate file upload via hidden input
		cy.get('input[type="file"]').selectFile(
			{
				contents: Cypress.Buffer.from('mock-xlsx-content'),
				fileName: 'products.xlsx',
				mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			},
			{ force: true }
		);

		cy.wait('@graphql').then((interception) => {
			expect(interception.request.body.operationName).to.eq('PreviewImport');
		});

		// Preview step shows rows
		cy.contains('Imported Product A').should('exist');
		cy.contains('sellerProducts.import.invalidRows').should('exist');
	});

	it('confirms import and shows result summary', () => {
		cy.contains('sellerProducts.importButton').click();

		cy.get('input[type="file"]').selectFile(
			{
				contents: Cypress.Buffer.from('mock-xlsx-content'),
				fileName: 'products.xlsx',
				mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			},
			{ force: true }
		);

		cy.wait('@graphql');

		// Click confirm
		cy.contains(/sellerProducts\.import\.confirmBtn/).click();

		cy.wait('@graphql').then((interception) => {
			expect(interception.request.body.operationName).to.eq('ConfirmImport');
		});

		cy.contains('sellerProducts.import.resultTitle').should('exist');
		cy.contains(/sellerProducts\.import\.created/).should('exist');
	});

	it('exports products via API', () => {
		cy.contains('sellerProducts.exportButton').click();
		cy.wait('@graphql').then((interception) => {
			expect(interception.request.body.operationName).to.eq('ExportMyProducts');
		});
		cy.contains('importExport.exportSuccess').should('exist');
	});

	it('downloads import template', () => {
		cy.contains('sellerProducts.importButton').click();
		cy.contains('sellerProducts.downloadTemplate').click();
		cy.wait('@graphql').then((interception) => {
			expect(interception.request.body.operationName).to.eq('DownloadProductImportTemplate');
		});
	});
});
