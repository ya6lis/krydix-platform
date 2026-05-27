import sellerFixture from '../fixtures/sellerProducts.json';

function stubSellerAuth(win: Window) {
	win.localStorage.setItem('krydix_refresh_token', 'stub-rt');
}

function stubGraphQL() {
	cy.intercept('POST', '**/graphql', (req) => {
		const op: string = req.body?.operationName ?? '';

		if (op === 'RefreshToken') {
			req.reply({ data: sellerFixture.refreshToken });
		} else if (op === 'Me') {
			req.reply({ data: sellerFixture.me });
		} else if (op === 'ExportMySellerOrders') {
			req.reply({
				data: {
					exportMySellerOrders: {
						fileName: 'orders_seller-1_2026-05-26.xlsx',
						mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
						base64: 'UEsDBBQAAAAI',
					},
				},
			});
		} else if (op === 'MySellerOrders') {
			req.reply({
				data: {
					mySellerOrders: {
						items: [],
						total: 0,
						page: 1,
						pageSize: 8,
					},
				},
			});
		} else if (op === 'MySellerOrderStats') {
			req.reply({
				data: {
					mySellerOrderStats: {
						all: 0,
						pending: 0,
						confirmed: 0,
						shipped: 0,
						delivered: 0,
						cancelled: 0,
						refunded: 0,
					},
				},
			});
		} else {
			req.continue();
		}
	}).as('graphql');
}

describe('SellerOrdersPage — Export', () => {
	beforeEach(() => {
		cy.visit('/seller/orders', {
			onBeforeLoad: stubSellerAuth,
		});
		stubGraphQL();
	});

	it('exports seller orders via API', () => {
		cy.contains('sellerOrders.export').click();
		cy.wait('@graphql').then((interception) => {
			expect(interception.request.body.operationName).to.eq('ExportMySellerOrders');
		});
		cy.contains('importExport.exportSuccess').should('exist');
	});
});
