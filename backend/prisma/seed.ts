/**
 * Krydix — comprehensive seed
 *
 * Users   : 9  (1 admin, 2 moderators, 3 sellers, 3 buyers)
 * Coverage: every model in schema.prisma — minimum 5 rows each
 *
 * All passwords: Test123!
 * Run: npm run prisma:seed
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/hash.js';

const prisma = new PrismaClient();

// ─── helpers ──────────────────────────────────────────────────────────────────

const log = (msg: string) => console.log(`  ✓ ${msg}`); // eslint-disable-line no-console

async function upsertUser(
	email: string,
	role: string,
	firstName: string,
	lastName: string,
	city = 'Kyiv'
) {
	const hash = await hashPassword('Test123!');
	return prisma.user.upsert({
		where: { email },
		update: {},
		create: {
			email,
			passwordHash: hash,
			role: role as never,
			isEmailVerified: true,
			profile: { create: { firstName, lastName, city, country: 'UA' } },
		},
	});
}

async function upsertCategory(
	slug: string,
	parentId: string | null,
	en: string,
	uk: string,
	sort = 0
) {
	const cat = await prisma.category.upsert({
		where: { slug },
		update: {},
		create: {
			slug,
			parentId,
			sortOrder: sort,
			translations: {
				create: [
					{ language: 'EN', name: en },
					{ language: 'UK', name: uk },
				],
			},
		},
	});
	return cat.id;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
	// ── 1. USERS ────────────────────────────────────────────────────────────────

	const admin = await upsertUser('admin@krydix.dev', 'ADMIN', 'Alex', 'Admin', 'Kyiv');
	const mod1 = await upsertUser('mod1@krydix.dev', 'MODERATOR', 'Sofia', 'Kovalenko', 'Lviv');
	const mod2 = await upsertUser('mod2@krydix.dev', 'MODERATOR', 'Dmytro', 'Hrytsenko', 'Kharkiv');
	const seller1 = await upsertUser('seller1@krydix.dev', 'SELLER', 'Olena', 'Marchenko', 'Kyiv');
	const seller2 = await upsertUser('seller2@krydix.dev', 'SELLER', 'Ivan', 'Petrenko', 'Lviv');
	const seller3 = await upsertUser('seller3@krydix.dev', 'SELLER', 'Maria', 'Savchenko', 'Odesa');
	const buyer1 = await upsertUser('buyer1@krydix.dev', 'BUYER', 'Anna', 'Bondarenko', 'Kyiv');
	const buyer2 = await upsertUser('buyer2@krydix.dev', 'BUYER', 'Pavlo', 'Tkachenko', 'Lviv');
	const buyer3 = await upsertUser('buyer3@krydix.dev', 'BUYER', 'Natalia', 'Kravchenko', 'Dnipro');
	log('9 users');

	// ── 2. CATEGORIES ───────────────────────────────────────────────────────────

	const catClothing = await upsertCategory('clothing', null, 'Clothing', 'Одяг', 0);
	const catOuterwear = await upsertCategory(
		'outerwear',
		catClothing,
		'Outerwear',
		'Верхній одяг',
		0
	);
	const catJackets = await upsertCategory('jackets', catOuterwear, 'Jackets', 'Куртки', 0);
	const catKnitwear = await upsertCategory('knitwear', catOuterwear, 'Knitwear', 'Трикотаж', 1);
	const catFootwear = await upsertCategory('footwear', null, 'Footwear', 'Взуття', 1);
	const catSneakers = await upsertCategory('sneakers', catFootwear, 'Sneakers', 'Кросівки', 0);
	const catHomeGoods = await upsertCategory('home-goods', null, 'Home Goods', 'Товари для дому', 2);
	const catKitchen = await upsertCategory('kitchen', catHomeGoods, 'Kitchen', 'Кухня', 0);
	const catBedding = await upsertCategory(
		'bedding',
		catHomeGoods,
		'Bedding',
		'Постільна білизна',
		1
	);
	const catAccessories = await upsertCategory('accessories', null, 'Accessories', 'Аксесуари', 3);
	log('10 categories');

	// ── 3. CATEGORY ATTRIBUTES ──────────────────────────────────────────────────

	async function upsertAttr(categoryId: string, name: string, unit?: string, sort = 0) {
		const existing = await prisma.categoryAttribute.findUnique({
			where: { categoryId_name: { categoryId, name } },
		});
		if (existing) return existing.id;
		const a = await prisma.categoryAttribute.create({
			data: { categoryId, name, unit, sortOrder: sort },
		});
		return a.id;
	}

	const attrSize = await upsertAttr(catOuterwear, 'Size', undefined, 0);
	const attrColor = await upsertAttr(catOuterwear, 'Color', undefined, 1);
	const attrMaterial = await upsertAttr(catOuterwear, 'Material', undefined, 2);
	const attrShoeSize = await upsertAttr(catFootwear, 'Shoe Size', 'EU', 0);
	const attrCapacity = await upsertAttr(catKitchen, 'Capacity', 'ml', 0);
	const attrPieces = await upsertAttr(catBedding, 'Pieces', undefined, 0);
	log('6 category attributes');

	// ── 4. SELLER APPLICATIONS ──────────────────────────────────────────────────

	async function upsertApplication(
		userId: string,
		company: string,
		status: string,
		rejectionReason?: string,
		reviewedById?: string
	) {
		const existing = await prisma.sellerApplication.findUnique({ where: { userId } });
		if (existing) return existing.id;
		const app = await prisma.sellerApplication.create({
			data: {
				userId,
				status: status as never,
				fullName: 'Test Owner',
				companyName: company,
				edrpou: '12345678',
				taxNumber: '1234567890',
				address: 'Kyiv, Ukraine',
				phone: '+380501234567',
				email: `${company.toLowerCase().replace(/\s/g, '')}@example.com`,
				bankingDetails: 'IBAN UA123456789012345678901234567',
				rejectionReason: rejectionReason ?? null,
				reviewedById: reviewedById ?? null,
				reviewedAt: reviewedById ? new Date() : null,
			},
		});
		return app.id;
	}

	const app1 = await upsertApplication(
		seller1.id,
		'Lichen Goods LLC',
		'APPROVED',
		undefined,
		mod1.id
	);
	const app2 = await upsertApplication(
		seller2.id,
		'Northern Atelier LLC',
		'APPROVED',
		undefined,
		mod1.id
	);
	const app3 = await upsertApplication(
		seller3.id,
		'Field and Form LLC',
		'APPROVED',
		undefined,
		mod2.id
	);
	const app4 = await upsertApplication(buyer1.id, 'Bondar Studio', 'PENDING');
	const app5 = await upsertApplication(
		buyer2.id,
		'Tkach Store',
		'REJECTED',
		'Incomplete documents',
		mod2.id
	);
	log('5 seller applications');

	// ── 5. SELLER DOCUMENTS ─────────────────────────────────────────────────────

	const docData = [
		{
			applicationId: app1,
			fileName: 'passport.pdf',
			url: 'https://res.cloudinary.com/demo/image/upload/sample',
			publicId: 'seed/doc1',
		},
		{
			applicationId: app1,
			fileName: 'certificate.pdf',
			url: 'https://res.cloudinary.com/demo/image/upload/sample',
			publicId: 'seed/doc2',
		},
		{
			applicationId: app2,
			fileName: 'registration.pdf',
			url: 'https://res.cloudinary.com/demo/image/upload/sample',
			publicId: 'seed/doc3',
		},
		{
			applicationId: app3,
			fileName: 'license.pdf',
			url: 'https://res.cloudinary.com/demo/image/upload/sample',
			publicId: 'seed/doc4',
		},
		{
			applicationId: app4,
			fileName: 'id_card.jpg',
			url: 'https://res.cloudinary.com/demo/image/upload/sample',
			publicId: 'seed/doc5',
		},
		{
			applicationId: app5,
			fileName: 'business_card.jpg',
			url: 'https://res.cloudinary.com/demo/image/upload/sample',
			publicId: 'seed/doc6',
		},
	];
	for (const d of docData) {
		const exists = await prisma.sellerDocument.findFirst({
			where: { applicationId: d.applicationId, fileName: d.fileName },
		});
		if (!exists) await prisma.sellerDocument.create({ data: d });
	}
	log('6 seller documents');

	// ── 6. PROMO CODES ──────────────────────────────────────────────────────────

	const promoCodes = [
		{ code: 'WELCOME10', discountPercent: 10, minOrderAmount: 50 },
		{ code: 'SUMMER20', discountPercent: 20, minOrderAmount: 100 },
		{ code: 'SAVE15', discountFixed: 15, minOrderAmount: 80 },
		{ code: 'FIRST50', discountFixed: 50, minOrderAmount: 200 },
		{ code: 'VIP25', discountPercent: 25, minOrderAmount: 150 },
	];
	const promoIds: Record<string, string> = {};
	for (const pc of promoCodes) {
		const p = await prisma.promoCode.upsert({
			where: { code: pc.code },
			update: {},
			create: {
				code: pc.code,
				discountPercent: 'discountPercent' in pc ? pc.discountPercent : null,
				discountFixed: 'discountFixed' in pc ? pc.discountFixed : null,
				minOrderAmount: pc.minOrderAmount,
				maxUses: 100,
				expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
			},
		});
		promoIds[pc.code] = p.id;
	}
	log('5 promo codes');

	// ── 7. PRODUCTS ─────────────────────────────────────────────────────────────

	async function upsertProduct(
		sellerId: string,
		slug: string,
		sku: string,
		brand: string,
		price: number,
		comparePrice: number | null,
		status: string,
		categoryIds: string[],
		en: { title: string; description: string },
		uk: { title: string; description: string },
		image: string,
		variants: { sku?: string; options: object; stock: number; price?: number }[],
		attrs: { id: string; value: string }[]
	) {
		const existing = await prisma.product.findUnique({ where: { slug } });
		if (existing) return existing.id;

		const prod = await prisma.product.create({
			data: {
				sellerId,
				slug,
				sku,
				brand,
				basePrice: price,
				comparePrice: comparePrice ?? undefined,
				status: status as never,
				isAvailable: true,
				translations: {
					create: [
						{ language: 'EN', title: en.title, description: en.description },
						{ language: 'UK', title: uk.title, description: uk.description },
					],
				},
				media: {
					create: [
						{ url: image, publicId: `seed/${slug}`, type: 'IMAGE', isMain: true, sortOrder: 0 },
					],
				},
				variants: {
					create: variants.map((v) => ({
						sku: v.sku,
						options: v.options,
						stock: v.stock,
						price: v.price ?? undefined,
					})),
				},
				categories: {
					create: categoryIds.map((categoryId) => ({ categoryId })),
				},
				attributes: {
					create: attrs.map((a) => ({ attributeId: a.id, value: a.value })),
				},
			},
		});
		return prod.id;
	}

	const IMG = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';

	const prod1 = await upsertProduct(
		seller1.id,
		'wool-cardigan-oat',
		'LG-WC-OAT',
		'Lichen Goods',
		96,
		120,
		'PENDING_MODERATION',
		[catKnitwear],
		{
			title: 'Wool Cardigan — Oat',
			description:
				'A relaxed-fit cardigan in undyed Highland wool. Five horn buttons, ribbed cuffs, and kangaroo pocket.',
		},
		{
			title: 'Вовняний кардиган — Вівсяний',
			description:
				"Кардиган вільного крою з нефарбованої гірської вовни. П'ять ґудзиків з рогу, манжети в рубчик.",
		},
		IMG,
		[
			{ sku: 'LG-WC-OAT-S', options: { size: 'S', color: 'Oat' }, stock: 6 },
			{ sku: 'LG-WC-OAT-M', options: { size: 'M', color: 'Oat' }, stock: 8 },
		],
		[
			{ id: attrSize, value: 'S / M / L' },
			{ id: attrColor, value: 'Oat' },
			{ id: attrMaterial, value: '100% Highland Wool' },
		]
	);

	const prod2 = await upsertProduct(
		seller1.id,
		'canvas-apron-charcoal',
		'FF-CA-CHR',
		'Field & Form',
		54,
		null,
		'APPROVED',
		[catAccessories],
		{
			title: 'Canvas Apron — Charcoal',
			description: 'Heavy-duty waxed canvas apron with adjustable neck strap and dual pockets.',
		},
		{
			title: 'Фартух Canvas — Графіт',
			description: 'Міцний вощений бавовняний фартух з регульованим ременем і двома кишенями.',
		},
		IMG,
		[{ sku: 'FF-CA-CHR-ONE', options: { color: 'Charcoal' }, stock: 36 }],
		[{ id: attrColor, value: 'Charcoal' }]
	);

	const prod3 = await upsertProduct(
		seller2.id,
		'heritage-field-jacket-olive',
		'NA-HFJ-OLV',
		'Northern Atelier',
		184,
		210,
		'APPROVED',
		[catJackets, catOuterwear],
		{
			title: 'Heritage Field Jacket — Olive',
			description:
				'Classic waxed cotton field jacket with brushed lining, four patch pockets and brass buckle.',
		},
		{
			title: 'Польова куртка Heritage — Олива',
			description: 'Класична вощена куртка з підкладкою, чотирма кишенями та латунною пряжкою.',
		},
		IMG,
		[
			{ sku: 'NA-HFJ-OLV-M', options: { size: 'M', color: 'Olive' }, stock: 18 },
			{ sku: 'NA-HFJ-OLV-L', options: { size: 'L', color: 'Olive' }, stock: 9 },
			{ sku: 'NA-HFJ-OLV-XL', options: { size: 'XL', color: 'Olive' }, stock: 4 },
		],
		[
			{ id: attrSize, value: 'M / L / XL' },
			{ id: attrColor, value: 'Olive' },
			{ id: attrMaterial, value: 'Waxed Cotton' },
		]
	);

	const prod4 = await upsertProduct(
		seller2.id,
		'quilted-vest-stone',
		'NA-QV-STN',
		'Northern Atelier',
		118,
		null,
		'APPROVED',
		[catOuterwear],
		{
			title: 'Quilted Vest — Stone',
			description: 'Lightweight quilted vest with down filling and concealed zip pockets.',
		},
		{
			title: 'Стьобаний жилет — Камінь',
			description:
				'Легкий стьобаний жилет з пуховим наповнювачем і прихованими кишенями на блискавці.',
		},
		IMG,
		[
			{ sku: 'NA-QV-STN-S', options: { size: 'S', color: 'Stone' }, stock: 5 },
			{ sku: 'NA-QV-STN-M', options: { size: 'M', color: 'Stone' }, stock: 12 },
		],
		[
			{ id: attrSize, value: 'S / M' },
			{ id: attrColor, value: 'Stone' },
			{ id: attrMaterial, value: 'Nylon / Down' },
		]
	);

	const prod5 = await upsertProduct(
		seller3.id,
		'linen-pillowcase-set',
		'HC-LPC-SET',
		'Heritage Co.',
		42,
		null,
		'APPROVED',
		[catBedding],
		{
			title: 'Linen Pillowcase Set of 2',
			description: 'Set of two stonewashed linen pillowcases in natural, pre-softened linen.',
		},
		{
			title: 'Набір лляних наволочок 2 шт.',
			description: 'Набір із двох наволочок із промитого льону натурального кольору.',
		},
		IMG,
		[
			{ options: { color: 'Natural', size: '50x70cm' }, stock: 58 },
			{ options: { color: 'Ash', size: '50x70cm' }, stock: 30 },
		],
		[{ id: attrPieces, value: '2' }]
	);

	const prod6 = await upsertProduct(
		seller3.id,
		'ceramic-pour-over-set',
		'MS-CPO-SET',
		'Maru Studio',
		72,
		90,
		'PENDING_MODERATION',
		[catKitchen],
		{
			title: 'Ceramic Pour-Over Set',
			description: 'Hand-thrown ceramic pour-over dripper and server. Fits 1–4 cups.',
		},
		{
			title: 'Керамічний набір для пуровера',
			description: 'Ручний керамічний воронка та сервер. Розрахований на 1–4 чашки.',
		},
		IMG,
		[{ options: { color: 'Matte White' }, stock: 22, price: 72 }],
		[{ id: attrCapacity, value: '600' }]
	);

	const prod7 = await upsertProduct(
		seller1.id,
		'trail-runners-charcoal',
		'HC-TR-CHR',
		'Heritage Co.',
		148,
		null,
		'APPROVED',
		[catSneakers, catFootwear],
		{
			title: 'Trail Runners — Charcoal',
			description: 'All-terrain trail running shoes with Vibram® outsole and Gore-Tex® lining.',
		},
		{
			title: 'Кросівки Trail — Графіт',
			description:
				'Кросівки для бігу по будь-якому рельєфу з підошвою Vibram® і підкладкою Gore-Tex®.',
		},
		IMG,
		[
			{ options: { size: '41', color: 'Charcoal' }, stock: 3 },
			{ options: { size: '42', color: 'Charcoal' }, stock: 4 },
			{ options: { size: '43', color: 'Charcoal' }, stock: 2 },
		],
		[{ id: attrShoeSize, value: '41-43' }]
	);

	const allProds = [prod1, prod2, prod3, prod4, prod5, prod6, prod7];
	log(`${allProds.length} products`);

	// Get variant IDs for use in orders/cart
	async function firstVariantId(productId: string) {
		const v = await prisma.productVariant.findFirst({ where: { productId } });
		return v!.id;
	}

	const var2 = await firstVariantId(prod2);
	const var3 = await firstVariantId(prod3);
	const var4 = await firstVariantId(prod4);
	const var5 = await firstVariantId(prod5);
	const var7 = await firstVariantId(prod7);

	// ── 8. CART ITEMS ───────────────────────────────────────────────────────────

	const cartItems = [
		{ userId: buyer1.id, productId: prod6, variantId: null, quantity: 1 },
		{ userId: buyer1.id, productId: prod7, variantId: var7, quantity: 1 },
		{ userId: buyer2.id, productId: prod3, variantId: var3, quantity: 1 },
		{ userId: buyer2.id, productId: prod4, variantId: var4, quantity: 2 },
		{ userId: buyer3.id, productId: prod5, variantId: var5, quantity: 3 },
		{ userId: buyer3.id, productId: prod2, variantId: var2, quantity: 1 },
	];
	for (const ci of cartItems) {
		const existingCart = await prisma.cartItem.findFirst({
			where: { userId: ci.userId, productId: ci.productId, variantId: ci.variantId },
		});
		if (!existingCart) await prisma.cartItem.create({ data: ci });
	}
	log('6 cart items');

	// ── 9. ORDERS ───────────────────────────────────────────────────────────────

	async function createOrder(
		buyerId: string,
		status: string,
		totalAmount: number,
		promoCodeId: string | null,
		discount: number | null,
		items: {
			productId: string;
			variantId: string | null;
			sellerId: string;
			qty: number;
			price: number;
			title: string;
		}[],
		paymentStatus: string,
		paymentMethod: string,
		deliveryStatus: string,
		deliveryMethod: string,
		address: string,
		trackingCode: string | null
	) {
		const existing = await prisma.order.findFirst({
			where: { buyerId, totalAmount, status: status as never },
		});
		if (existing) return existing.id;

		const order = await prisma.order.create({
			data: {
				buyerId,
				status: status as never,
				totalAmount,
				promoCodeId,
				discount: discount ?? undefined,
				items: {
					create: items.map((it) => ({
						productId: it.productId,
						variantId: it.variantId,
						sellerId: it.sellerId,
						quantity: it.qty,
						unitPrice: it.price,
						totalPrice: it.price * it.qty,
						productTitle: it.title,
					})),
				},
				payment: {
					create: {
						status: paymentStatus as never,
						amount: totalAmount,
						method: paymentMethod as never,
						transactionId: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
						paidAt: paymentStatus === 'PAID' ? new Date() : null,
					},
				},
				delivery: {
					create: {
						status: deliveryStatus as never,
						method: deliveryMethod as never,
						address,
						trackingCode,
						shippedAt: ['SENT', 'IN_TRANSIT', 'DELIVERED'].includes(deliveryStatus)
							? new Date()
							: null,
						deliveredAt: deliveryStatus === 'DELIVERED' ? new Date() : null,
					},
				},
			},
		});
		return order.id;
	}

	const order1 = await createOrder(
		buyer1.id,
		'DELIVERED',
		184,
		null,
		null,
		[
			{
				productId: prod3,
				variantId: var3,
				sellerId: seller2.id,
				qty: 1,
				price: 184,
				title: 'Heritage Field Jacket — Olive',
			},
		],
		'PAID',
		'CARD',
		'DELIVERED',
		'COURIER',
		'Kyiv, Khreshchatyk 1',
		'TTN-001-MOCK'
	);

	const order2 = await createOrder(
		buyer1.id,
		'DELIVERED',
		96,
		null,
		null,
		[
			{
				productId: prod1,
				variantId: null,
				sellerId: seller1.id,
				qty: 1,
				price: 96,
				title: 'Wool Cardigan — Oat',
			},
		],
		'PAID',
		'CARD',
		'DELIVERED',
		'BRANCH_PICKUP',
		'Kyiv Nova Poshta #5',
		'TTN-002-MOCK'
	);

	const order3 = await createOrder(
		buyer1.id,
		'PENDING',
		148,
		null,
		null,
		[
			{
				productId: prod7,
				variantId: var7,
				sellerId: seller1.id,
				qty: 1,
				price: 148,
				title: 'Trail Runners — Charcoal',
			},
		],
		'PENDING',
		'CARD',
		'PENDING',
		'COURIER',
		'Kyiv, Khreshchatyk 1',
		null
	);

	const order4 = await createOrder(
		buyer2.id,
		'CONFIRMED',
		236,
		promoIds['SAVE15'],
		15,
		[
			{
				productId: prod3,
				variantId: var3,
				sellerId: seller2.id,
				qty: 1,
				price: 184,
				title: 'Heritage Field Jacket — Olive',
			},
			{
				productId: prod5,
				variantId: var5,
				sellerId: seller3.id,
				qty: 1,
				price: 42,
				title: 'Linen Pillowcase Set of 2',
			},
		],
		'PAID',
		'BANK_TRANSFER',
		'PACKED',
		'COURIER',
		'Lviv, Rynok Square 1',
		null
	);

	const order5 = await createOrder(
		buyer2.id,
		'DELIVERED',
		54,
		null,
		null,
		[
			{
				productId: prod2,
				variantId: var2,
				sellerId: seller1.id,
				qty: 1,
				price: 54,
				title: 'Canvas Apron — Charcoal',
			},
		],
		'PAID',
		'CASH_ON_DELIVERY',
		'DELIVERED',
		'SELF_PICKUP',
		'Lviv, warehouse',
		'TTN-005-MOCK'
	);

	const order6 = await createOrder(
		buyer3.id,
		'SHIPPED',
		118,
		promoIds['WELCOME10'],
		null,
		[
			{
				productId: prod4,
				variantId: var4,
				sellerId: seller2.id,
				qty: 1,
				price: 118,
				title: 'Quilted Vest — Stone',
			},
		],
		'PAID',
		'CARD',
		'IN_TRANSIT',
		'BRANCH_PICKUP',
		'Dnipro Nova Poshta #12',
		'TTN-006-MOCK'
	);

	const order7 = await createOrder(
		buyer3.id,
		'DELIVERED',
		84,
		null,
		null,
		[
			{
				productId: prod5,
				variantId: var5,
				sellerId: seller3.id,
				qty: 2,
				price: 42,
				title: 'Linen Pillowcase Set of 2',
			},
		],
		'PAID',
		'CARD',
		'DELIVERED',
		'COURIER',
		'Dnipro, Heroes Ave 20',
		'TTN-007-MOCK'
	);

	log('7 orders (with order items, payment records, delivery records)');

	// ── 10. RETURN REQUESTS ─────────────────────────────────────────────────────

	const returnData = [
		{
			orderId: order1,
			buyerId: buyer1.id,
			sellerId: seller2.id,
			status: 'REQUESTED',
			reason: 'Product does not match description',
		},
		{
			orderId: order2,
			buyerId: buyer1.id,
			sellerId: seller1.id,
			status: 'UNDER_REVIEW',
			reason: 'Wrong size delivered',
		},
		{
			orderId: order5,
			buyerId: buyer2.id,
			sellerId: seller1.id,
			status: 'APPROVED',
			reason: 'Defective stitching',
		},
		{
			orderId: order6,
			buyerId: buyer3.id,
			sellerId: seller2.id,
			status: 'REJECTED',
			reason: 'Changed my mind',
			resolution: 'Return not accepted per policy',
		},
		{
			orderId: order7,
			buyerId: buyer3.id,
			sellerId: seller3.id,
			status: 'REFUNDED',
			reason: 'Item arrived damaged',
			resolution: 'Full refund issued',
		},
	];
	for (const rr of returnData) {
		const exists = await prisma.returnRequest.findUnique({ where: { orderId: rr.orderId } });
		if (!exists) {
			await prisma.returnRequest.create({
				data: {
					orderId: rr.orderId,
					buyerId: rr.buyerId,
					sellerId: rr.sellerId,
					status: rr.status as never,
					reason: rr.reason,
					resolution: 'resolution' in rr ? rr.resolution : undefined,
					reviewedById: ['APPROVED', 'REJECTED', 'REFUNDED'].includes(rr.status)
						? mod1.id
						: undefined,
					reviewedAt: ['APPROVED', 'REJECTED', 'REFUNDED'].includes(rr.status)
						? new Date()
						: undefined,
				},
			});
		}
	}
	log('5 return requests');

	// ── 11. PRODUCT REVIEWS ─────────────────────────────────────────────────────

	const productReviews = [
		{
			productId: prod3,
			reviewerId: buyer1.id,
			orderId: order1,
			rating: 5.0,
			text: 'Incredible quality. The waxed cotton is exactly as described. Fits perfectly.',
		},
		{
			productId: prod1,
			reviewerId: buyer1.id,
			orderId: order2,
			rating: 4.0,
			text: 'Beautiful cardigan, very warm. Slightly longer than expected.',
		},
		{
			productId: prod2,
			reviewerId: buyer2.id,
			orderId: order5,
			rating: 4.5,
			text: 'Well-made apron. Perfect for the studio. Good pocket placement.',
		},
		{
			productId: prod4,
			reviewerId: buyer3.id,
			orderId: order6,
			rating: 3.5,
			text: 'Decent vest but sizing runs small. Order up.',
		},
		{
			productId: prod5,
			reviewerId: buyer3.id,
			orderId: order7,
			rating: 5.0,
			text: 'These pillowcases are heavenly. Super soft and washes beautifully.',
		},
	];
	for (const r of productReviews) {
		const exists = await prisma.productReview.findUnique({
			where: {
				productId_reviewerId_orderId: {
					productId: r.productId,
					reviewerId: r.reviewerId,
					orderId: r.orderId,
				},
			},
		});
		if (!exists) {
			await prisma.productReview.create({
				data: {
					...r,
					rating: r.rating,
					isApproved: true,
					sellerReply:
						r.productId === prod3 ? 'Thank you for your feedback! We appreciate your support.' : undefined,
					photos:
						r.productId === prod3
							? [{ url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', publicId: 'seed/rev1' }]
							: undefined,
				},
			});
		}
	}
	log('5 product reviews');

	const pendingProductReviews = [
		{
			productId: prod3,
			reviewerId: buyer2.id,
			orderId: order4,
			rating: 2.0,
			text: 'Looks nothing like the photos. The color is off and the material feels cheap.',
			isApproved: false,
			flagged: true,
			flaggerId: seller2.id,
		},
		{
			productId: prod5,
			reviewerId: buyer2.id,
			orderId: order4,
			rating: 5.0,
			text: 'Sized exactly as expected. Beautiful quality and fast delivery.',
			isApproved: false,
			photos: [{ url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', publicId: 'seed/rev-pending' }],
		},
		{
			productId: prod7,
			reviewerId: buyer1.id,
			orderId: order3,
			rating: 1.5,
			text: 'Item arrived damaged. Would not recommend.',
			isApproved: false,
			isBlocked: true,
		},
	];
	for (const r of pendingProductReviews) {
		const { flagged, flaggerId, ...reviewData } = r;
		const exists = await prisma.productReview.findUnique({
			where: {
				productId_reviewerId_orderId: {
					productId: r.productId,
					reviewerId: r.reviewerId,
					orderId: r.orderId,
				},
			},
		});
		if (!exists) {
			const created = await prisma.productReview.create({
				data: {
					productId: reviewData.productId,
					reviewerId: reviewData.reviewerId,
					orderId: reviewData.orderId,
					rating: reviewData.rating,
					text: reviewData.text,
					photos: reviewData.photos,
					isApproved: reviewData.isApproved,
					isBlocked: reviewData.isBlocked ?? false,
				},
			});
			if (flagged && flaggerId) {
				await prisma.complaint.create({
					data: {
						complainantId: flaggerId,
						target: 'REVIEW',
						status: 'NEW',
						reason: 'Flagged by seller',
						targetReviewId: created.id,
					},
				});
			}
		}
	}
	log('3 pending/hidden product reviews for moderation');

	// ── 12. SELLER REVIEWS ──────────────────────────────────────────────────────

	const sellerReviews = [
		{
			sellerId: seller2.id,
			reviewerId: buyer1.id,
			orderId: order1,
			rating: 5.0,
			text: 'Fast shipping, well packaged. Great communication.',
			sellerReply: 'Thank you, Anna! Come back soon.',
		},
		{
			sellerId: seller1.id,
			reviewerId: buyer1.id,
			orderId: order2,
			rating: 4.0,
			text: 'Good seller, product was as described.',
			sellerReply: null,
		},
		{
			sellerId: seller1.id,
			reviewerId: buyer2.id,
			orderId: order5,
			rating: 4.5,
			text: 'Smooth transaction. Item arrived on time.',
			sellerReply: 'Glad you liked it, Pavlo!',
		},
		{
			sellerId: seller2.id,
			reviewerId: buyer3.id,
			orderId: order6,
			rating: 3.0,
			text: 'Shipping was slower than expected.',
			sellerReply: 'Sorry for the delay, we had high volume.',
		},
		{
			sellerId: seller3.id,
			reviewerId: buyer3.id,
			orderId: order7,
			rating: 5.0,
			text: 'Best linen products on the platform. Highly recommend!',
			sellerReply: null,
		},
	];
	for (const r of sellerReviews) {
		const exists = await prisma.sellerReview.findUnique({
			where: {
				sellerId_reviewerId_orderId: {
					sellerId: r.sellerId,
					reviewerId: r.reviewerId,
					orderId: r.orderId,
				},
			},
		});
		if (!exists) {
			await prisma.sellerReview.create({ data: { ...r, isApproved: true } });
		}
	}
	log('5 seller reviews');

	// ── 13. BUYER REVIEWS ───────────────────────────────────────────────────────

	const buyerReviews = [
		{
			buyerId: buyer1.id,
			reviewerId: seller2.id,
			orderId: order1,
			rating: 5.0,
			text: 'Excellent buyer. Fast payment, smooth transaction.',
		},
		{
			buyerId: buyer1.id,
			reviewerId: seller1.id,
			orderId: order2,
			rating: 4.5,
			text: 'Good buyer, clear communication.',
		},
		{
			buyerId: buyer2.id,
			reviewerId: seller1.id,
			orderId: order5,
			rating: 5.0,
			text: 'Reliable buyer, paid immediately.',
		},
		{
			buyerId: buyer3.id,
			reviewerId: seller2.id,
			orderId: order6,
			rating: 4.0,
			text: 'No issues, would sell to again.',
		},
		{
			buyerId: buyer3.id,
			reviewerId: seller3.id,
			orderId: order7,
			rating: 5.0,
			text: 'Great repeat customer!',
		},
	];
	for (const r of buyerReviews) {
		const exists = await prisma.buyerReview.findUnique({
			where: {
				buyerId_reviewerId_orderId: {
					buyerId: r.buyerId,
					reviewerId: r.reviewerId,
					orderId: r.orderId,
				},
			},
		});
		if (!exists) {
			await prisma.buyerReview.create({ data: { ...r, isApproved: true } });
		}
	}
	log('5 buyer reviews');

	// ── 14. COMPLAINTS ──────────────────────────────────────────────────────────

	const productReview1 = await prisma.productReview.findFirst({ where: { productId: prod3 } });

	const complaints = [
		{
			complainantId: buyer2.id,
			target: 'PRODUCT',
			status: 'NEW',
			reason: 'Product description is misleading — material listed incorrectly.',
			targetProductId: prod3,
			targetSellerId: null,
			targetBuyerId: null,
			targetReviewId: null,
		},
		{
			complainantId: buyer3.id,
			target: 'SELLER',
			status: 'IN_REVIEW',
			reason: 'Seller is unresponsive after item was not delivered.',
			targetProductId: null,
			targetSellerId: seller1.id,
			targetBuyerId: null,
			targetReviewId: null,
		},
		{
			complainantId: buyer1.id,
			target: 'REVIEW',
			status: 'RESOLVED',
			reason: 'This review contains false information and personal insults.',
			targetProductId: null,
			targetSellerId: null,
			targetBuyerId: null,
			targetReviewId: productReview1?.id ?? null,
		},
		{
			complainantId: seller1.id,
			target: 'BUYER',
			status: 'REJECTED',
			reason: 'Buyer submitted fraudulent return request.',
			targetProductId: null,
			targetSellerId: null,
			targetBuyerId: buyer2.id,
			targetReviewId: null,
		},
		{
			complainantId: buyer2.id,
			target: 'PRODUCT',
			status: 'IN_REVIEW',
			reason: 'Product photos do not match the actual item received.',
			targetProductId: prod4,
			targetSellerId: null,
			targetBuyerId: null,
			targetReviewId: null,
		},
	];
	for (const c of complaints) {
		const exists = await prisma.complaint.findFirst({
			where: { complainantId: c.complainantId, target: c.target as never, reason: c.reason },
		});
		if (!exists) {
			await prisma.complaint.create({
				data: {
					...c,
					target: c.target as never,
					status: c.status as never,
					resolvedById:
						c.status === 'RESOLVED' ? mod1.id : c.status === 'REJECTED' ? mod2.id : undefined,
					resolvedAt: ['RESOLVED', 'REJECTED'].includes(c.status) ? new Date() : undefined,
					resolution:
						c.status === 'RESOLVED'
							? 'Review was blocked after investigation.'
							: c.status === 'REJECTED'
								? 'Complaint lacks sufficient evidence.'
								: undefined,
				},
			});
		}
	}
	log('5 complaints');

	// ── 15. AUDIT LOGS ──────────────────────────────────────────────────────────

	const auditEntries = [
		{
			actorId: mod1.id,
			action: 'SELLER_VERIFICATION_CHANGE',
			targetType: 'SellerApplication',
			targetId: app1,
			metadata: { to: 'APPROVED' },
		},
		{
			actorId: mod1.id,
			action: 'SELLER_VERIFICATION_CHANGE',
			targetType: 'SellerApplication',
			targetId: app2,
			metadata: { to: 'APPROVED' },
		},
		{
			actorId: mod2.id,
			action: 'SELLER_VERIFICATION_CHANGE',
			targetType: 'SellerApplication',
			targetId: app5,
			metadata: { to: 'REJECTED', reason: 'Incomplete documents' },
		},
		{
			actorId: mod1.id,
			action: 'PRODUCT_STATUS_CHANGE',
			targetType: 'Product',
			targetId: prod2,
			metadata: { from: 'PENDING_MODERATION', to: 'APPROVED' },
		},
		{
			actorId: mod2.id,
			action: 'PRODUCT_STATUS_CHANGE',
			targetType: 'Product',
			targetId: prod3,
			metadata: { from: 'PENDING_MODERATION', to: 'APPROVED' },
		},
		{
			actorId: admin.id,
			action: 'USER_ROLE_CHANGE',
			targetType: 'User',
			targetId: mod1.id,
			metadata: { to: 'MODERATOR' },
		},
	];
	for (const entry of auditEntries) {
		await prisma.auditLog.create({ data: { ...entry, action: entry.action as never } });
	}
	log('6 audit log entries');

	// ── 16. CHATS ───────────────────────────────────────────────────────────────

	async function createChat(
		productId: string | null,
		userA: string,
		userB: string,
		messages: string[]
	) {
		const chat = await prisma.chat.create({
			data: {
				productId,
				participants: {
					create: [{ userId: userA }, { userId: userB }],
				},
			},
		});
		for (let i = 0; i < messages.length; i++) {
			await prisma.chatMessage.create({
				data: {
					chatId: chat.id,
					senderId: i % 2 === 0 ? userA : userB,
					content: messages[i],
					isRead: i < messages.length - 1,
				},
			});
		}
		return chat.id;
	}

	await createChat(prod3, buyer1.id, seller2.id, [
		'Hi! Is the Heritage Field Jacket still available in L?',
		'Yes, we still have 2 units in L. Would you like to order?',
		'Great! I will place the order now.',
		'Wonderful! Shipping within 1-2 days after payment.',
	]);
	await createChat(prod1, buyer2.id, seller1.id, [
		'Hello, does the cardigan come in larger sizes?',
		'We currently have S and M. XL is coming next season.',
	]);
	await createChat(prod5, buyer3.id, seller3.id, [
		'Do these pillowcases shrink after washing?',
		'They may shrink 3-5% after the first wash. We recommend cold wash.',
		"Perfect, that's fine. Ordering now!",
	]);
	await createChat(prod4, buyer1.id, seller2.id, [
		'Is the Quilted Vest suitable for cold weather?',
		"It's great for 0-10°C with a base layer underneath.",
	]);
	await createChat(prod2, buyer3.id, seller1.id, [
		'Hi, is the apron waterproof?',
		'The waxed canvas is water-resistant, not fully waterproof.',
		"Good enough for my workshop. I'll take one!",
		'Thank you! Your order will ship within 2 business days.',
	]);
	log('5 chats with messages');

	// ── 17. NOTIFICATIONS ───────────────────────────────────────────────────────

	const notifs = [
		{
			userId: buyer1.id,
			event: 'NEW_ORDER',
			title: 'Order confirmed',
			body: 'Your order #1 has been placed successfully.',
		},
		{
			userId: buyer1.id,
			event: 'ORDER_STATUS_CHANGE',
			title: 'Order shipped',
			body: 'Your order #1 is on its way!',
		},
		{
			userId: seller1.id,
			event: 'NEW_ORDER',
			title: 'New order received',
			body: 'You have received a new order from Anna B.',
		},
		{
			userId: buyer2.id,
			event: 'MODERATION_RESULT',
			title: 'Verification update',
			body: 'Your seller application requires additional documents.',
		},
		{
			userId: buyer3.id,
			event: 'NEW_MESSAGE',
			title: 'New message',
			body: 'You have a new message from Field & Form.',
		},
		{
			userId: seller2.id,
			event: 'REVIEW_RECEIVED',
			title: 'New review',
			body: 'You received a 5-star review from Anna B.',
		},
		{
			userId: mod1.id,
			event: 'COMPLAINT_UPDATE',
			title: 'Complaint assigned',
			body: 'A new complaint has been assigned to you for review.',
		},
	];
	for (const n of notifs) {
		await prisma.notification.create({ data: { ...n, event: n.event as never } });
	}
	log('7 notifications');

	// ── 18. NOTIFICATION PREFERENCES ────────────────────────────────────────────

	const prefUsers = [buyer1.id, buyer2.id, buyer3.id, seller1.id, seller2.id];
	const allEvents = [
		'NEW_ORDER',
		'ORDER_STATUS_CHANGE',
		'NEW_MESSAGE',
		'MODERATION_RESULT',
		'REVIEW_RECEIVED',
	] as const;
	for (const userId of prefUsers) {
		for (const event of allEvents) {
			await prisma.notificationPreference.upsert({
				where: { userId_event: { userId, event } },
				update: {},
				create: { userId, event, enabled: true },
			});
		}
	}
	log('25 notification preferences');

	// ── 19. IMPORT JOBS ─────────────────────────────────────────────────────────

	const importJobs = [
		{
			sellerId: seller1.id,
			status: 'COMPLETED',
			fileName: 'products_jan.xlsx',
			fileUrl: 'https://example.com/import/jan.xlsx',
			totalRows: 12,
			processedRows: 12,
			errorRows: 0,
		},
		{
			sellerId: seller1.id,
			status: 'FAILED',
			fileName: 'products_feb.csv',
			fileUrl: 'https://example.com/import/feb.csv',
			totalRows: 8,
			processedRows: 5,
			errorRows: 3,
		},
		{
			sellerId: seller2.id,
			status: 'COMPLETED',
			fileName: 'catalog_q1.xlsx',
			fileUrl: 'https://example.com/import/q1.xlsx',
			totalRows: 20,
			processedRows: 20,
			errorRows: 0,
		},
		{
			sellerId: seller2.id,
			status: 'PROCESSING',
			fileName: 'new_arrivals.xlsx',
			fileUrl: 'https://example.com/import/arr.xlsx',
			totalRows: 15,
			processedRows: 7,
			errorRows: 0,
		},
		{
			sellerId: seller3.id,
			status: 'PENDING',
			fileName: 'spring_drop.csv',
			fileUrl: 'https://example.com/import/spring.csv',
			totalRows: null,
			processedRows: null,
			errorRows: null,
		},
	];
	for (const job of importJobs) {
		await prisma.importJob.create({ data: { ...job, status: job.status as never } });
	}
	log('5 import jobs');

	console.log('\n🌱 Seed complete!'); // eslint-disable-line no-console
	console.log('   Logins: <role>N@krydix.dev / Test123!'); // eslint-disable-line no-console
	console.log('   Example: buyer1@krydix.dev / Test123!'); // eslint-disable-line no-console
	console.log('   Admin  : admin@krydix.dev   / Test123!'); // eslint-disable-line no-console
}

main()
	.catch((err) => {
		console.error(err); // eslint-disable-line no-console
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
