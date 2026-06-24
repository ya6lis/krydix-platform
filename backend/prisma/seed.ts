/**
 * Krydix — rich mock seed
 *
 * Users   : 9 preserved (1 admin, 2 moderators, 3 sellers, 3 buyers)
 * Coverage: every model in schema.prisma — minimum 10 rows each where possible
 *
 * All passwords: Test123!
 * Run: npm run prisma:seed
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/hash.js';
import {
	picsum,
	avatarPhoto,
	daysAgo,
	UK_CITIES,
	EXTRA_PROMO_CODES,
	CATALOG_PRODUCTS,
	RETURN_REASONS,
	REVIEW_TEXTS,
	feeSnapshot,
} from './seed.mock.js';

const prisma = new PrismaClient();

// ─── helpers ──────────────────────────────────────────────────────────────────

const log = (msg: string) => console.log(`  ✓ ${msg}`); // eslint-disable-line no-console

const CATALOG_VISIBLE_STATUSES = ['APPROVED', 'ENABLED'] as const;

const formatOrderLabel = (orderId: string) => `KX-${orderId.slice(-4).toUpperCase()}`;

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
	sort = 0,
	icon: string | null = null,
) {
	const cat = await prisma.category.upsert({
		where: { slug },
		update: { icon },
		create: {
			slug,
			parentId,
			sortOrder: sort,
			icon,
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

	const now = Date.now();
	await prisma.user.updateMany({
		where: { id: { in: [buyer1.id, admin.id] } },
		data: { lastSeenAt: new Date(now) },
	});
	await prisma.user.updateMany({
		where: { id: { in: [mod1.id, seller1.id] } },
		data: { lastSeenAt: new Date(now - 20 * 60 * 1000) },
	});
	await prisma.user.updateMany({
		where: { id: { in: [buyer2.id, buyer3.id, seller2.id, seller3.id, mod2.id] } },
		data: { lastSeenAt: new Date(now - 3 * 24 * 60 * 60 * 1000) },
	});

	const allUsers = [admin, mod1, mod2, seller1, seller2, seller3, buyer1, buyer2, buyer3];
	for (let i = 0; i < allUsers.length; i++) {
		await prisma.userProfile.update({
			where: { userId: allUsers[i].id },
			data: {
				avatarUrl: avatarPhoto(allUsers[i].email, 400),
				phone: `+38050${String(1000000 + i * 137).slice(0, 7)}`,
				city: UK_CITIES[i % UK_CITIES.length],
				country: 'UA',
				bio: `Krydix member since ${daysAgo(90 + i * 10).getFullYear()}. Based in ${UK_CITIES[i % UK_CITIES.length]}.`,
				displayName: i === 0 ? 'Alex A.' : undefined,
			},
		});
	}
	log('9 users + enriched profiles');

	// ── 1b. REFRESH TOKENS & EMAIL VERIFICATIONS ────────────────────────────────

	for (let i = 0; i < allUsers.length; i++) {
		const token = `seed-refresh-token-${i + 1}`;
		await prisma.refreshToken.upsert({
			where: { token },
			update: { expiresAt: daysAgo(-30) },
			create: {
				userId: allUsers[i].id,
				token,
				expiresAt: daysAgo(-30),
				createdAt: daysAgo(14 - i),
			},
		});
	}
	const extraRefreshUsers = [buyer1, buyer2, buyer3, seller1, seller2, seller3, mod1, mod2, admin, buyer1];
	for (let i = 0; i < extraRefreshUsers.length; i++) {
		const token = `seed-refresh-extra-${i + 1}`;
		await prisma.refreshToken.upsert({
			where: { token },
			update: {},
			create: {
				userId: extraRefreshUsers[i].id,
				token,
				expiresAt: daysAgo(-7 - i),
				revokedAt: i % 3 === 0 ? daysAgo(1) : null,
				createdAt: daysAgo(20 - i),
			},
		});
	}
	log('19 refresh tokens');

	for (let i = 0; i < allUsers.length; i++) {
		const token = `seed-email-verify-${i + 1}`;
		await prisma.emailVerification.upsert({
			where: { token },
			update: { usedAt: daysAgo(60 - i * 5) },
			create: {
				userId: allUsers[i].id,
				token,
				expiresAt: daysAgo(-14),
				usedAt: daysAgo(60 - i * 5),
				createdAt: daysAgo(61 - i * 5),
			},
		});
	}
	const pendingVerifyUsers = [buyer1, buyer2, buyer3, seller1, seller2, seller3, mod1, mod2, admin, buyer2];
	for (let i = 0; i < pendingVerifyUsers.length; i++) {
		const token = `seed-email-pending-${i + 1}`;
		await prisma.emailVerification.upsert({
			where: { token },
			update: {},
			create: {
				userId: pendingVerifyUsers[i].id,
				token,
				expiresAt: daysAgo(-3 + i),
				createdAt: daysAgo(2),
			},
		});
	}
	log('19 email verifications');

	// ── 2. CATEGORIES ───────────────────────────────────────────────────────────

	const catClothing = await upsertCategory('clothing', null, 'Clothing', 'Одяг', 0, 'tags');
	const catOuterwear = await upsertCategory(
		'outerwear',
		catClothing,
		'Outerwear',
		'Верхній одяг',
		0,
		'layers',
	);
	const catJackets = await upsertCategory('jackets', catOuterwear, 'Jackets', 'Куртки', 0, null);
	const catKnitwear = await upsertCategory('knitwear', catOuterwear, 'Knitwear', 'Трикотаж', 1, null);
	const catFootwear = await upsertCategory('footwear', null, 'Footwear', 'Взуття', 1, 'store');
	const catSneakers = await upsertCategory('sneakers', catFootwear, 'Sneakers', 'Кросівки', 0, null);
	const catHomeGoods = await upsertCategory('home-goods', null, 'Home Goods', 'Товари для дому', 2, 'home');
	const catKitchen = await upsertCategory('kitchen', catHomeGoods, 'Kitchen', 'Кухня', 0, null);
	const catBedding = await upsertCategory(
		'bedding',
		catHomeGoods,
		'Bedding',
		'Постільна білизна',
		1,
		null,
	);
	const catAccessories = await upsertCategory('accessories', null, 'Accessories', 'Аксесуари', 3, 'category');
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
	const attrWeight = await upsertAttr(catFootwear, 'Weight', 'g', 1);
	const attrFit = await upsertAttr(catClothing, 'Fit', undefined, 0);
	const attrThread = await upsertAttr(catBedding, 'Thread Count', undefined, 1);
	const attrDishwasher = await upsertAttr(catKitchen, 'Dishwasher Safe', undefined, 1);
	log('10 category attributes');

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
	const app6 = await upsertApplication(buyer3.id, 'Kravchenko Crafts', 'DRAFT');
	const app7 = await upsertApplication(mod1.id, 'Mod Shop Draft', 'DRAFT');
	const app8 = await upsertApplication(mod2.id, 'Review Hub LLC', 'UNDER_REVIEW');
	const app9 = await upsertApplication(admin.id, 'Platform Test Seller', 'BLOCKED', 'Test account', admin.id);
	const allApps = [app1, app2, app3, app4, app5, app6, app7, app8, app9];
	log('9 seller applications');

	// ── 5. SELLER DOCUMENTS ─────────────────────────────────────────────────────

	const docData = [
		{ applicationId: app1, fileName: 'passport.pdf', url: picsum(50), publicId: 'seed/doc1' },
		{ applicationId: app1, fileName: 'certificate.pdf', url: picsum(51), publicId: 'seed/doc2' },
		{ applicationId: app2, fileName: 'registration.pdf', url: picsum(52), publicId: 'seed/doc3' },
		{ applicationId: app3, fileName: 'license.pdf', url: picsum(53), publicId: 'seed/doc4' },
		{ applicationId: app4, fileName: 'id_card.jpg', url: picsum(54), publicId: 'seed/doc5' },
		{ applicationId: app5, fileName: 'business_card.jpg', url: picsum(55), publicId: 'seed/doc6' },
		{ applicationId: app6, fileName: 'tax_cert.pdf', url: picsum(56), publicId: 'seed/doc7' },
		{ applicationId: app7, fileName: 'bank_statement.pdf', url: picsum(57), publicId: 'seed/doc8' },
		{ applicationId: app8, fileName: 'company_charter.pdf', url: picsum(58), publicId: 'seed/doc9' },
		{ applicationId: app9, fileName: 'blocked_notice.pdf', url: picsum(59), publicId: 'seed/doc10' },
	];
	for (const d of docData) {
		const exists = await prisma.sellerDocument.findFirst({
			where: { applicationId: d.applicationId, fileName: d.fileName },
		});
		if (!exists) await prisma.sellerDocument.create({ data: d });
	}
	log('10 seller documents');

	// ── 6. PROMO CODES ──────────────────────────────────────────────────────────

	const promoCodes = [
		{ code: 'WELCOME10', description: 'First-order discount', discountPercent: 10, minOrderAmount: 50 },
		{ code: 'SUMMER20', description: 'Seasonal sitewide', discountPercent: 20, minOrderAmount: 100 },
		{ code: 'SAVE15', description: 'Fixed amount off', discountFixed: 15, minOrderAmount: 80 },
		{ code: 'FIRST50', description: 'Large order discount', discountFixed: 50, minOrderAmount: 200 },
		{ code: 'VIP25', description: 'VIP member discount', discountPercent: 25, minOrderAmount: 150 },
		...EXTRA_PROMO_CODES,
	];
	const promoIds: Record<string, string> = {};
	for (const pc of promoCodes) {
		const p = await prisma.promoCode.upsert({
			where: { code: pc.code },
			update: { description: pc.description },
			create: {
				code: pc.code,
				description: pc.description,
				discountPercent: 'discountPercent' in pc ? pc.discountPercent : null,
				discountFixed: 'discountFixed' in pc ? pc.discountFixed : null,
				minOrderAmount: pc.minOrderAmount,
				maxUses: 100,
				expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
			},
		});
		promoIds[pc.code] = p.id;
	}
	log('10 promo codes');

	// ── 6b. PLATFORM CONFIG ─────────────────────────────────────────────────────

	await prisma.commissionRule.upsert({
		where: { id: 'default-commission' },
		update: { percent: 12, fixedFee: 0.5, currency: 'UAH' },
		create: {
			id: 'default-commission',
			isDefault: true,
			percent: 12,
			fixedFee: 0.5,
			currency: 'UAH',
		},
	});
	const commissionByCategory = [
		{ categoryId: catJackets, percent: 10, fixedFee: 0.3 },
		{ categoryId: catKnitwear, percent: 8, fixedFee: 0.2 },
		{ categoryId: catSneakers, percent: 11, fixedFee: 0.4 },
		{ categoryId: catKitchen, percent: 9, fixedFee: 0.25 },
		{ categoryId: catBedding, percent: 7, fixedFee: 0.15 },
		{ categoryId: catAccessories, percent: 10.5, fixedFee: 0.35 },
		{ categoryId: catOuterwear, percent: 9.5, fixedFee: 0.3 },
		{ categoryId: catFootwear, percent: 11.5, fixedFee: 0.45 },
		{ categoryId: catClothing, percent: 8.5, fixedFee: 0.2 },
	];
	for (const rule of commissionByCategory) {
		await prisma.commissionRule.upsert({
			where: { categoryId: rule.categoryId },
			update: { percent: rule.percent, fixedFee: rule.fixedFee, currency: 'UAH' },
			create: { ...rule, currency: 'UAH', isDefault: false },
		});
	}
	await prisma.platformConfig.upsert({
		where: { id: 'default' },
		update: {},
		create: {},
	});
	log('platform config + 10 commission rules');

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
		imageUrls: string[],
		variants: { sku?: string; options: object; stock: number; price?: number }[],
		attrs: { id: string; value: string }[],
		createdAt?: Date
	) {
		const isAvailable =
			status === 'APPROVED' ||
			status === 'ENABLED' ||
			status === 'PENDING_MODERATION';

		const existing = await prisma.product.findUnique({ where: { slug } });
		if (existing) {
			await prisma.product.update({
				where: { slug },
				data: {
					sellerId,
					sku,
					brand,
					basePrice: price,
					comparePrice: comparePrice ?? undefined,
					status: status as never,
					isAvailable,
				},
			});

			await prisma.productTranslation.updateMany({
				where: { productId: existing.id, language: 'EN' },
				data: { title: en.title, description: en.description },
			});
			await prisma.productTranslation.updateMany({
				where: { productId: existing.id, language: 'UK' },
				data: { title: uk.title, description: uk.description },
			});

			await prisma.media.deleteMany({ where: { productId: existing.id } });
			await prisma.media.createMany({
				data: imageUrls.map((url, idx) => ({
					productId: existing.id,
					url,
					publicId: `seed/${slug}/${idx + 1}`,
					type: 'IMAGE' as const,
					isMain: idx === 0,
					sortOrder: idx,
				})),
			});

			return existing.id;
		}

		const prod = await prisma.product.create({
			data: {
				sellerId,
				slug,
				sku,
				brand,
				basePrice: price,
				comparePrice: comparePrice ?? undefined,
				status: status as never,
				isAvailable,
				createdAt: createdAt ?? daysAgo(Math.floor(Math.random() * 120) + 5),
				translations: {
					create: [
						{ language: 'EN', title: en.title, description: en.description },
						{ language: 'UK', title: uk.title, description: uk.description },
					],
				},
				media: {
					create: imageUrls.map((url, idx) => ({
						url,
						publicId: `seed/${slug}/${idx + 1}`,
						type: 'IMAGE' as const,
						isMain: idx === 0,
						sortOrder: idx,
					})),
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

	const categoryMap = {
		clothing: catClothing,
		outerwear: catOuterwear,
		jackets: catJackets,
		knitwear: catKnitwear,
		footwear: catFootwear,
		sneakers: catSneakers,
		home: catHomeGoods,
		kitchen: catKitchen,
		bedding: catBedding,
		accessories: catAccessories,
	} as const;

	const sellers = [seller1, seller2, seller3];

	const attrByName: Record<string, string> = {
		Size: attrSize,
		Color: attrColor,
		Material: attrMaterial,
		'Shoe Size': attrShoeSize,
		Capacity: attrCapacity,
		Pieces: attrPieces,
	};

	const productIdsBySlug: Record<string, string> = {};
	for (const item of CATALOG_PRODUCTS) {
		productIdsBySlug[item.slug] = await upsertProduct(
			sellers[item.seller].id,
			item.slug,
			item.sku,
			item.brand,
			item.price,
			item.comparePrice,
			item.status,
			item.categoryKeys.map((key) => categoryMap[key]),
			item.en,
			item.uk,
			[...item.images],
			item.variants.map((v) => ({
				sku: v.sku,
				options: v.options,
				stock: v.stock,
				price: v.price,
			})),
			item.attrs.map((a) => ({ id: attrByName[a.name], value: a.value })),
		);
	}

	const prod1 = productIdsBySlug['wool-cardigan-oat']!;
	const prod2 = productIdsBySlug['canvas-apron-charcoal']!;
	const prod3 = productIdsBySlug['heritage-field-jacket-olive']!;
	const prod4 = productIdsBySlug['quilted-vest-stone']!;
	const prod5 = productIdsBySlug['linen-pillowcase-set']!;
	const prod6 = productIdsBySlug['ceramic-pour-over-set']!;
	const prod7 = productIdsBySlug['trail-runners-charcoal']!;
	const extraProdIds = CATALOG_PRODUCTS.slice(7).map((p) => productIdsBySlug[p.slug]!);

	const allProds = Object.values(productIdsBySlug);
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

	// ── 8. WISHLIST ───────────────────────────────────────────────────────────────

	const wishlistPairs = allProds.slice(0, 12).map((productId, i) => ({
		userId: [buyer1, buyer2, buyer3, buyer1, buyer2, buyer3, buyer1, buyer2, buyer3, buyer1, buyer2, buyer3][
			i
		].id,
		productId,
	}));
	for (const w of wishlistPairs) {
		await prisma.wishlistItem.upsert({
			where: { userId_productId: { userId: w.userId, productId: w.productId } },
			update: {},
			create: w,
		});
	}
	log('12 wishlist items');

	// ── 9. CART ITEMS ───────────────────────────────────────────────────────────

	const cartItems = [
		{ userId: buyer1.id, productId: prod6, variantId: null, quantity: 1 },
		{ userId: buyer1.id, productId: prod7, variantId: var7, quantity: 1 },
		{ userId: buyer1.id, productId: extraProdIds[0] ?? prod3, variantId: null, quantity: 2 },
		{ userId: buyer2.id, productId: prod3, variantId: var3, quantity: 1 },
		{ userId: buyer2.id, productId: prod4, variantId: var4, quantity: 2 },
		{ userId: buyer2.id, productId: extraProdIds[1] ?? prod5, variantId: null, quantity: 1 },
		{ userId: buyer3.id, productId: prod5, variantId: var5, quantity: 3 },
		{ userId: buyer3.id, productId: prod2, variantId: var2, quantity: 1 },
		{ userId: buyer3.id, productId: extraProdIds[2] ?? prod1, variantId: null, quantity: 1 },
		{ userId: buyer1.id, productId: prod4, variantId: var4, quantity: 1 },
		{ userId: buyer2.id, productId: prod7, variantId: var7, quantity: 1 },
		{ userId: buyer3.id, productId: prod6, variantId: null, quantity: 2 },
	];
	for (const ci of cartItems) {
		const existingCart = await prisma.cartItem.findFirst({
			where: { userId: ci.userId, productId: ci.productId, variantId: ci.variantId },
		});
		if (!existingCart) await prisma.cartItem.create({ data: ci });
	}
	log('12 cart items');

	// ── 10. ORDERS ───────────────────────────────────────────────────────────────

	async function createOrder(
		seedKey: string,
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
		trackingCode: string | null,
		createdAt: Date,
		confirmReceipt = false
	) {
		async function createPayoutsForOrder(orderId: string) {
			const orderWithItems = await prisma.order.findUnique({
				where: { id: orderId },
				include: { items: true },
			});
			if (!orderWithItems) return;
			for (let idx = 0; idx < orderWithItems.items.length; idx++) {
				const item = orderWithItems.items[idx];
				const lineTotal = Number(item.totalPrice);
				const platformFee = Number(item.platformFeeAmountSnapshot);
				const payoutStatus =
					idx % 3 === 0 ? 'ON_HOLD' : idx % 3 === 1 ? 'ELIGIBLE_FOR_RELEASE' : 'WITHDRAWN';
				const existingPayout = await prisma.sellerPayout.findUnique({
					where: { orderItemId: item.id },
				});
				if (existingPayout) continue;
				await prisma.sellerPayout.create({
					data: {
						orderId: orderWithItems.id,
						orderItemId: item.id,
						sellerId: item.sellerId,
						amountGross: lineTotal,
						platformFeeAmount: platformFee,
						amountNet: Number(item.sellerPayoutAmountSnapshot),
						currency: 'UAH',
						status: payoutStatus as never,
						availableAt: daysAgo(-3),
						releasedAt: payoutStatus === 'WITHDRAWN' ? daysAgo(1) : null,
						withdrawnAt: payoutStatus === 'WITHDRAWN' ? daysAgo(0, 12) : null,
					},
				});
			}
		}

		const existing = await prisma.order.findFirst({ where: { notes: seedKey } });
		if (existing) {
			if (confirmReceipt) {
				await prisma.orderItem.updateMany({
					where: { orderId: existing.id, confirmedReceivedAt: null },
					data: { confirmedReceivedAt: daysAgo(2), payoutHoldUntil: daysAgo(-1) },
				});
				await createPayoutsForOrder(existing.id);
			}
			return existing.id;
		}

		const order = await prisma.order.create({
			data: {
				buyerId,
				status: status as never,
				totalAmount,
				currencySnapshot: 'UAH',
				promoCodeId,
				discount: discount ?? undefined,
				notes: seedKey,
				createdAt,
				items: {
					create: items.map((it) => {
						const lineTotal = it.price * it.qty;
						const fees = feeSnapshot(lineTotal);
						return {
							productId: it.productId,
							variantId: it.variantId,
							sellerId: it.sellerId,
							quantity: it.qty,
							unitPrice: it.price,
							totalPrice: lineTotal,
							productTitle: it.title,
							...fees,
							confirmedReceivedAt: confirmReceipt ? daysAgo(2) : null,
							payoutHoldUntil: confirmReceipt ? daysAgo(-1) : null,
						};
					}),
				},
				payment: {
					create: {
						status: paymentStatus as never,
						amount: totalAmount,
						method: paymentMethod as never,
						transactionId: `TXN-${seedKey.toUpperCase()}`,
						cardBrand: paymentMethod === 'CARD' ? 'visa' : null,
						cardLast4: paymentMethod === 'CARD' ? String(1000 + createdAt.getDate()) : null,
						paidAt: ['PAID', 'IN_ESCROW'].includes(paymentStatus) ? createdAt : null,
						escrowAt: paymentStatus === 'IN_ESCROW' ? createdAt : null,
					},
				},
				delivery: {
					create: {
						status: deliveryStatus as never,
						method: deliveryMethod as never,
						address,
						trackingCode,
						shippedAt: ['SENT', 'IN_TRANSIT', 'DELIVERED'].includes(deliveryStatus)
							? daysAgo(5, 3)
							: null,
						deliveredAt: deliveryStatus === 'DELIVERED' ? daysAgo(2) : null,
						confirmedReceivedAt: confirmReceipt ? daysAgo(2) : null,
					},
				},
			},
			include: { items: true },
		});

		if (confirmReceipt) {
			await createPayoutsForOrder(order.id);
		}

		return order.id;
	}

	const order1 = await createOrder(
		'seed-order-01',
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
		'IN_ESCROW',
		'CARD',
		'DELIVERED',
		'COURIER',
		'Kyiv, Khreshchatyk 1',
		'TTN-001-MOCK',
		daysAgo(45),
		true
	);

	const order2 = await createOrder(
		'seed-order-02',
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
		'IN_ESCROW',
		'CARD',
		'DELIVERED',
		'BRANCH_PICKUP',
		'Kyiv Nova Poshta #5',
		'TTN-002-MOCK',
		daysAgo(38),
		true
	);

	const order3 = await createOrder(
		'seed-order-03',
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
		null,
		daysAgo(1)
	);

	const order4 = await createOrder(
		'seed-order-04',
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
		'IN_ESCROW',
		'BANK_TRANSFER',
		'PACKED',
		'COURIER',
		'Lviv, Rynok Square 1',
		null,
		daysAgo(12),
		true
	);

	const order5 = await createOrder(
		'seed-order-05',
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
		'IN_ESCROW',
		'CASH_ON_DELIVERY',
		'DELIVERED',
		'SELF_PICKUP',
		'Lviv, warehouse',
		'TTN-005-MOCK',
		daysAgo(28),
		true
	);

	const order6 = await createOrder(
		'seed-order-06',
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
		'IN_ESCROW',
		'CARD',
		'IN_TRANSIT',
		'BRANCH_PICKUP',
		'Dnipro Nova Poshta #12',
		'TTN-006-MOCK',
		daysAgo(8),
		true
	);

	const order7 = await createOrder(
		'seed-order-07',
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
		'IN_ESCROW',
		'CARD',
		'DELIVERED',
		'COURIER',
		'Dnipro, Heroes Ave 20',
		'TTN-007-MOCK',
		daysAgo(22),
		true
	);

	const order8 = await createOrder(
		'seed-order-08',
		buyer1.id,
		'CANCELLED',
		72,
		null,
		null,
		[
			{
				productId: prod6,
				variantId: null,
				sellerId: seller3.id,
				qty: 1,
				price: 72,
				title: 'Ceramic Pour-Over Set',
			},
		],
		'CANCELED',
		'CARD',
		'PENDING',
		'COURIER',
		'Kyiv, Podil 12',
		null,
		daysAgo(15)
	);

	const order9 = await createOrder(
		'seed-order-09',
		buyer2.id,
		'REFUNDED',
		118,
		null,
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
		'REFUNDED',
		'CARD',
		'RETURNED',
		'COURIER',
		'Lviv, Sykhiv 3',
		'TTN-009-MOCK',
		daysAgo(60),
		true
	);

	const order10 = await createOrder(
		'seed-order-10',
		buyer3.id,
		'SHIPPED',
		148,
		promoIds['SPRING15'],
		22,
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
		'IN_ESCROW',
		'CARD',
		'SENT',
		'COURIER',
		'Dnipro, Center 8',
		'TTN-010-MOCK',
		daysAgo(5),
		true
	);

	const order11 = await createOrder(
		'seed-order-11',
		buyer2.id,
		'DELIVERED',
		42,
		null,
		null,
		[
			{
				productId: prod5,
				variantId: var5,
				sellerId: seller3.id,
				qty: 1,
				price: 42,
				title: 'Linen Pillowcase Set of 2',
			},
		],
		'IN_ESCROW',
		'CARD',
		'DELIVERED',
		'BRANCH_PICKUP',
		'Lviv NP #2',
		'TTN-011-MOCK',
		daysAgo(18),
		true
	);

	const order12 = await createOrder(
		'seed-order-12',
		buyer1.id,
		'CONFIRMED',
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
		'IN_ESCROW',
		'CARD',
		'PACKED',
		'COURIER',
		'Kyiv, Pechersk 4',
		null,
		daysAgo(3)
	);

	const allOrders = [order1, order2, order3, order4, order5, order6, order7, order8, order9, order10, order11, order12];
	const payoutCount = await prisma.sellerPayout.count();
	log(`${allOrders.length} orders (with items, payments, deliveries) + ${payoutCount} seller payouts`);

	// ── 10. RETURN REQUESTS ─────────────────────────────────────────────────────

	const returnStatuses = [
		'REQUESTED',
		'UNDER_REVIEW',
		'APPROVED',
		'REJECTED',
		'REFUNDED',
		'AWAITING_RETURN_SHIPPING',
		'RECEIVED',
		'CLOSED',
		'REQUESTED',
		'UNDER_REVIEW',
	] as const;
	for (let i = 0; i < 10; i++) {
		const orderId = allOrders[i];
		const exists = await prisma.returnRequest.findUnique({ where: { orderId } });
		if (exists) continue;
		const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
		if (!order?.items[0]) continue;
		await prisma.returnRequest.create({
			data: {
				orderId,
				buyerId: order.buyerId,
				sellerId: order.items[0].sellerId,
				status: returnStatuses[i] as never,
				reason: RETURN_REASONS[i],
				details: `Seed return detail #${i + 1}`,
				resolution: ['REJECTED', 'REFUNDED', 'CLOSED'].includes(returnStatuses[i])
					? 'Processed by moderator'
					: undefined,
				reviewedById: i > 2 ? (i % 2 === 0 ? mod1.id : mod2.id) : undefined,
				reviewedAt: i > 2 ? daysAgo(10 - i) : undefined,
				refundedAt: returnStatuses[i] === 'REFUNDED' ? daysAgo(5) : undefined,
				createdAt: daysAgo(20 - i),
			},
		});
	}
	log('10 return requests');

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
							? [{ url: picsum(60), publicId: 'seed/rev1' }]
							: undefined,
				},
			});
		}
	}
	for (let i = 0; i < Math.min(10, allOrders.length); i++) {
		const order = await prisma.order.findUnique({
			where: { id: allOrders[i] },
			include: { items: true },
		});
		if (!order?.items[0]) continue;
		const item = order.items[0];
		const reviewerId = order.buyerId;
		const exists = await prisma.productReview.findUnique({
			where: {
				productId_reviewerId_orderId: {
					productId: item.productId,
					reviewerId,
					orderId: order.id,
				},
			},
		});
		if (exists) continue;
		await prisma.productReview.create({
			data: {
				productId: item.productId,
				reviewerId,
				orderId: order.id,
				rating: 3 + (i % 3) * 0.5,
				text: REVIEW_TEXTS[i % REVIEW_TEXTS.length],
				isApproved: i % 4 !== 0,
				isBlocked: i === 9,
				photos: i % 3 === 0 ? [{ url: picsum(70 + i), publicId: `seed/rev-extra-${i}` }] : undefined,
				createdAt: daysAgo(30 - i * 2),
			},
		});
	}
	log('10+ product reviews');

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
			photos: [{ url: picsum(61), publicId: 'seed/rev-pending' }],
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
	for (let i = 0; i < 5; i++) {
		const orderId = allOrders[i + 5];
		const order = await prisma.order.findUnique({ where: { id: orderId } });
		if (!order) continue;
		const sellerUser = [seller1, seller2, seller3][i % 3];
		const exists = await prisma.sellerReview.findUnique({
			where: {
				sellerId_reviewerId_orderId: {
					sellerId: sellerUser.id,
					reviewerId: order.buyerId,
					orderId,
				},
			},
		});
		if (exists) continue;
		await prisma.sellerReview.create({
			data: {
				sellerId: sellerUser.id,
				reviewerId: order.buyerId,
				orderId,
				rating: 3.5 + (i % 2),
				text: REVIEW_TEXTS[(i + 3) % REVIEW_TEXTS.length],
				isApproved: true,
				createdAt: daysAgo(25 - i),
			},
		});
	}
	log('10+ seller reviews');

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
	for (let i = 0; i < 5; i++) {
		const orderId = allOrders[i + 5];
		const order = await prisma.order.findUnique({ where: { id: orderId } });
		if (!order) continue;
		const sellerUser = [seller1, seller2, seller3, seller1, seller2][i];
		const exists = await prisma.buyerReview.findUnique({
			where: {
				buyerId_reviewerId_orderId: {
					buyerId: order.buyerId,
					reviewerId: sellerUser.id,
					orderId,
				},
			},
		});
		if (exists) continue;
		await prisma.buyerReview.create({
			data: {
				buyerId: order.buyerId,
				reviewerId: sellerUser.id,
				orderId,
				rating: 4 + (i % 2) * 0.5,
				text: REVIEW_TEXTS[(i + 7) % REVIEW_TEXTS.length],
				isApproved: true,
				createdAt: daysAgo(20 - i),
			},
		});
	}
	log('10+ buyer reviews');

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
	for (let i = 0; i < 5; i++) {
		const reason = `Seed complaint #${i + 6}: ${RETURN_REASONS[i]}`;
		const exists = await prisma.complaint.findFirst({ where: { reason } });
		if (exists) continue;
		await prisma.complaint.create({
			data: {
				complainantId: [buyer1, buyer2, buyer3, seller1, seller2][i].id,
				target: (['PRODUCT', 'SELLER', 'BUYER', 'REVIEW', 'PRODUCT'] as const)[i],
				status: (['NEW', 'IN_REVIEW', 'RESOLVED', 'REJECTED', 'IN_REVIEW'] as const)[i],
				reason,
				targetProductId: i % 2 === 0 ? allProds[i] : null,
				targetSellerId: i === 1 ? seller1.id : null,
				targetBuyerId: i === 2 ? buyer2.id : null,
				createdAt: daysAgo(14 - i),
			},
		});
	}
	log('10+ complaints');

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
		const exists = await prisma.auditLog.findFirst({
			where: { targetType: entry.targetType, targetId: entry.targetId, action: entry.action as never },
		});
		if (!exists) {
			await prisma.auditLog.create({ data: { ...entry, action: entry.action as never } });
		}
	}
	for (let i = 0; i < 4; i++) {
		const targetId = `seed-audit-${i + 7}`;
		const exists = await prisma.auditLog.findFirst({ where: { targetId } });
		if (exists) continue;
		await prisma.auditLog.create({
			data: {
				actorId: [admin.id, mod1.id, mod2.id, admin.id][i],
				action: (['PAYOUT_RELEASED', 'PAYMENT_CAPTURED', 'REFUND_ISSUED', 'PLATFORM_CONFIG_CHANGE'] as const)[i],
				targetType: 'PlatformConfig',
				targetId: `seed-audit-${i + 7}`,
				metadata: { seed: true, index: i + 7 },
				createdAt: daysAgo(30 - i * 3),
			},
		});
	}
	log('10+ audit log entries');

	// ── 16. CHATS ───────────────────────────────────────────────────────────────

	async function createChat(
		seedKey: string,
		productId: string | null,
		userA: string,
		userB: string,
		messages: string[],
		createdAt = daysAgo(7)
	) {
		const existing = await prisma.chat.findFirst({ where: { subject: seedKey } });
		if (existing) return existing.id;

		const chat = await prisma.chat.create({
			data: {
				productId,
				subject: seedKey,
				createdAt,
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
					createdAt: new Date(createdAt.getTime() + i * 3600000),
				},
			});
		}
		return chat.id;
	}

	await createChat('chat-1', prod3, buyer1.id, seller2.id, [
		'Hi! Is the Heritage Field Jacket still available in L?',
		'Yes, we still have 2 units in L. Would you like to order?',
		'Great! I will place the order now.',
		'Wonderful! Shipping within 1-2 days after payment.',
	]);
	await createChat('chat-2', prod1, buyer2.id, seller1.id, [
		'Hello, does the cardigan come in larger sizes?',
		'We currently have S and M. XL is coming next season.',
	]);
	await createChat('chat-3', prod5, buyer3.id, seller3.id, [
		'Do these pillowcases shrink after washing?',
		'They may shrink 3-5% after the first wash. We recommend cold wash.',
		"Perfect, that's fine. Ordering now!",
	]);
	await createChat('chat-4', prod4, buyer1.id, seller2.id, [
		'Is the Quilted Vest suitable for cold weather?',
		"It's great for 0-10°C with a base layer underneath.",
	]);
	await createChat('chat-5', prod2, buyer3.id, seller1.id, [
		'Hi, is the apron waterproof?',
		'The waxed canvas is water-resistant, not fully waterproof.',
		"Good enough for my workshop. I'll take one!",
		'Thank you! Your order will ship within 2 business days.',
	]);
	const chatPairs = [
		{ key: 'chat-6', productId: prod6, a: buyer1.id, b: seller3.id, msgs: ['Is the pour-over dishwasher safe?', 'Hand wash only — ceramic glaze is delicate.'] },
		{ key: 'chat-7', productId: prod7, a: buyer2.id, b: seller1.id, msgs: ['Do you have size 44?', 'Not in stock yet. Restock expected next month.'] },
		{ key: 'chat-8', productId: extraProdIds[0] ?? prod1, a: buyer3.id, b: seller2.id, msgs: ['Can I get a bulk discount?', 'Yes — use code BULK30 for orders over 250 UAH.'] },
		{ key: 'chat-9', productId: extraProdIds[1] ?? prod5, a: buyer1.id, b: seller3.id, msgs: ['What thread count are these sheets?', '180 thread count, stonewashed linen blend.'] },
		{ key: 'chat-10', productId: prod1, a: buyer2.id, b: seller1.id, msgs: ['When will the cardigan be back in XL?', 'We expect XL restock in two weeks.'] },
	] as const;
	for (let i = 0; i < chatPairs.length; i++) {
		const c = chatPairs[i];
		await createChat(c.key, c.productId, c.a, c.b, [...c.msgs], daysAgo(12 - i));
	}
	log('10 chats with messages');

	// ── 17. NOTIFICATIONS ───────────────────────────────────────────────────────

	const orderMeta = (orderId: string, status: string) => ({
		orderId,
		orderLabel: formatOrderLabel(orderId),
		status,
	});

	const notifs = [
		{
			userId: buyer1.id,
			event: 'NEW_ORDER',
			title: 'Order confirmed',
			body: `Your order #${formatOrderLabel(order3)} was placed successfully.`,
			metadata: orderMeta(order3, 'PENDING'),
			seedKey: 'notif-01',
		},
		{
			userId: buyer1.id,
			event: 'ORDER_STATUS_CHANGE',
			title: 'Order delivered',
			body: `Order #${formatOrderLabel(order2)} is now delivered.`,
			metadata: orderMeta(order2, 'DELIVERED'),
			seedKey: 'notif-02',
		},
		{
			userId: seller1.id,
			event: 'NEW_ORDER',
			title: 'New order received',
			body: `You received a new order #${formatOrderLabel(order3)}.`,
			metadata: orderMeta(order3, 'PENDING'),
			seedKey: 'notif-03',
		},
		{
			userId: buyer2.id,
			event: 'MODERATION_RESULT',
			title: 'Verification update',
			body: 'Your seller application requires additional documents.',
			seedKey: 'notif-04',
		},
		{
			userId: buyer3.id,
			event: 'NEW_MESSAGE',
			title: 'New message',
			body: 'You have a new message from Field & Form.',
			seedKey: 'notif-05',
		},
		{
			userId: seller2.id,
			event: 'REVIEW_RECEIVED',
			title: 'New review',
			body: 'You received a 5-star review from Anna B.',
			seedKey: 'notif-06',
		},
		{
			userId: mod1.id,
			event: 'COMPLAINT_UPDATE',
			title: 'Complaint assigned',
			body: 'A new complaint has been assigned to you for review.',
			seedKey: 'notif-07',
		},
		{
			userId: seller3.id,
			event: 'NEW_ORDER',
			title: 'New order received',
			body: `You received a new order #${formatOrderLabel(order7)}.`,
			metadata: orderMeta(order7, 'DELIVERED'),
			seedKey: 'notif-08',
		},
		{
			userId: buyer1.id,
			event: 'VERIFICATION_RESULT',
			title: 'Seller application update',
			body: 'Your seller application is under review.',
			seedKey: 'notif-09',
		},
		{
			userId: admin.id,
			event: 'SUPPORT_UPDATE',
			title: 'Platform alert',
			body: '3 new complaints require attention.',
			seedKey: 'notif-10',
		},
		{
			userId: buyer2.id,
			event: 'ORDER_STATUS_CHANGE',
			title: 'Order delivered',
			body: `Order #${formatOrderLabel(order5)} is now delivered.`,
			metadata: orderMeta(order5, 'DELIVERED'),
			seedKey: 'notif-11',
		},
		{
			userId: seller1.id,
			event: 'MODERATION_RESULT',
			title: 'Product approved',
			body: 'Your product listing has been approved by moderation.',
			seedKey: 'notif-12',
		},
	];
	for (const n of notifs) {
		const { seedKey, ...data } = n;
		const existingRows = await prisma.notification.findMany({
			where: { userId: data.userId },
		});
		const existing = existingRows.find(
			(row) =>
				row.metadata &&
				typeof row.metadata === 'object' &&
				!Array.isArray(row.metadata) &&
				(row.metadata as Record<string, unknown>).seedKey === seedKey
		);
		const metadata = data.metadata ? { ...data.metadata, seedKey } : { seedKey };
		if (existing) {
			await prisma.notification.update({
				where: { id: existing.id },
				data: {
					event: data.event as never,
					title: data.title,
					body: data.body,
					metadata,
				},
			});
		} else {
			await prisma.notification.create({
				data: {
					userId: data.userId,
					event: data.event as never,
					title: data.title,
					body: data.body,
					metadata,
					createdAt: daysAgo(Math.floor(Math.random() * 14) + 1),
				},
			});
		}
	}
	log('12 notifications');

	// ── 18. NOTIFICATION PREFERENCES ────────────────────────────────────────────

	const prefUsers = [buyer1.id, buyer2.id, buyer3.id, seller1.id, seller2.id, seller3.id, mod1.id, mod2.id, admin.id];
	const allEvents = [
		'NEW_ORDER',
		'ORDER_STATUS_CHANGE',
		'NEW_MESSAGE',
		'MODERATION_RESULT',
		'REVIEW_RECEIVED',
		'VERIFICATION_RESULT',
		'COMPLAINT_UPDATE',
		'SUPPORT_UPDATE',
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
	log(`${prefUsers.length * allEvents.length} notification preferences`);

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
		{
			sellerId: seller1.id,
			status: 'VALIDATED',
			fileName: 'march_catalog.csv',
			fileUrl: 'https://example.com/import/march.csv',
			totalRows: 18,
			processedRows: 0,
			errorRows: 0,
		},
		{
			sellerId: seller2.id,
			status: 'COMPLETED',
			fileName: 'winter_clearance.xlsx',
			fileUrl: 'https://example.com/import/winter.xlsx',
			totalRows: 25,
			processedRows: 25,
			errorRows: 0,
		},
		{
			sellerId: seller3.id,
			status: 'FAILED',
			fileName: 'linen_batch.csv',
			fileUrl: 'https://example.com/import/linen.csv',
			totalRows: 10,
			processedRows: 4,
			errorRows: 6,
		},
		{
			sellerId: seller1.id,
			status: 'COMPLETED',
			fileName: 'accessories_q2.xlsx',
			fileUrl: 'https://example.com/import/acc-q2.xlsx',
			totalRows: 14,
			processedRows: 14,
			errorRows: 0,
		},
		{
			sellerId: seller2.id,
			status: 'PENDING',
			fileName: 'footwear_update.csv',
			fileUrl: 'https://example.com/import/shoes.csv',
			totalRows: null,
			processedRows: null,
			errorRows: null,
		},
	];
	for (const job of importJobs) {
		const exists = await prisma.importJob.findFirst({
			where: { sellerId: job.sellerId, fileName: job.fileName },
		});
		if (exists) continue;
		await prisma.importJob.create({
			data: { ...job, status: job.status as never, createdAt: daysAgo(Math.floor(Math.random() * 60) + 5) },
		});
	}
	log('10 import jobs');

	// ── 20. USER FEEDBACK ───────────────────────────────────────────────────────

	const feedbackItems = [
		{ userId: buyer1.id, category: 'BUG', subject: 'Checkout button unresponsive on mobile', status: 'NEW' },
		{ userId: buyer2.id, category: 'FEATURE', subject: 'Wishlist sharing with friends', status: 'UNDER_REVIEW' },
		{ userId: buyer3.id, category: 'UX', subject: 'Filter panel hard to find on catalog', status: 'ACKNOWLEDGED' },
		{ userId: seller1.id, category: 'BUG', subject: 'Bulk import preview shows wrong columns', status: 'PLANNED' },
		{ userId: seller2.id, category: 'FEATURE', subject: 'Export orders to CSV', status: 'RESOLVED' },
		{ userId: seller3.id, category: 'OTHER', subject: 'Dark mode for seller dashboard', status: 'DISMISSED' },
		{ userId: mod1.id, category: 'UX', subject: 'Moderation queue needs bulk actions', status: 'NEW' },
		{ userId: mod2.id, category: 'BUG', subject: 'Complaint filter resets on refresh', status: 'UNDER_REVIEW' },
		{ userId: admin.id, category: 'FEATURE', subject: 'Audit log export for compliance', status: 'PLANNED' },
		{ userId: buyer1.id, category: 'UX', subject: 'Product comparison on mobile', status: 'ACKNOWLEDGED' },
	] as const;
	for (let i = 0; i < feedbackItems.length; i++) {
		const fb = feedbackItems[i];
		await prisma.userFeedback.upsert({
			where: { id: `seed-feedback-${i + 1}` },
			update: { status: fb.status as never },
			create: {
				id: `seed-feedback-${i + 1}`,
				userId: fb.userId,
				category: fb.category as never,
				subject: fb.subject,
				message: `${fb.subject}. Detailed feedback from seed user #${i + 1}. Please improve this area of the platform.`,
				status: fb.status as never,
				attachments: i % 3 === 0 ? [{ url: picsum(80 + i), publicId: `seed/fb-${i + 1}` }] : undefined,
				handledById: ['RESOLVED', 'DISMISSED', 'PLANNED'].includes(fb.status) ? mod1.id : null,
				handledAt: ['RESOLVED', 'DISMISSED', 'PLANNED'].includes(fb.status) ? daysAgo(5) : null,
				createdAt: daysAgo(40 - i * 3),
			},
		});
	}
	log('10 user feedback items');

	// ── 21. RELEASE NOTES ─────────────────────────────────────────────────────────

	const releaseNotes = [
		{ version: '0.9.0', status: 'PUBLISHED', titleEn: 'Beta launch', titleUk: 'Бета-запуск', days: 90 },
		{ version: '0.9.1', status: 'PUBLISHED', titleEn: 'Cart improvements', titleUk: 'Покращення кошика', days: 80 },
		{ version: '0.9.2', status: 'PUBLISHED', titleEn: 'Seller verification flow', titleUk: 'Верифікація продавців', days: 70 },
		{ version: '1.0.0', status: 'PUBLISHED', titleEn: 'MVP release', titleUk: 'Реліз MVP', days: 60 },
		{ version: '1.0.1', status: 'PUBLISHED', titleEn: 'Moderation queue', titleUk: 'Черга модерації', days: 50 },
		{ version: '1.0.2', status: 'PUBLISHED', titleEn: 'Order tracking mock', titleUk: 'Мок-трекінг замовлень', days: 45 },
		{ version: '1.1.0', status: 'PUBLISHED', titleEn: 'Reviews & ratings', titleUk: 'Відгуки та рейтинги', days: 35 },
		{ version: '1.1.1', status: 'PUBLISHED', titleEn: 'Chat messaging', titleUk: 'Чат-повідомлення', days: 25 },
		{ version: '1.2.0', status: 'PUBLISHED', titleEn: 'Escrow & payouts', titleUk: 'Ескроу та виплати', days: 15 },
		{ version: '1.2.1', status: 'DRAFT', titleEn: 'Admin platform settings', titleUk: 'Налаштування платформи', days: 5 },
	] as const;
	for (const rn of releaseNotes) {
		await prisma.releaseNote.upsert({
			where: { version: rn.version },
			update: { status: rn.status as never },
			create: {
				version: rn.version,
				status: rn.status as never,
				publishedAt: rn.status === 'PUBLISHED' ? daysAgo(rn.days) : null,
				createdById: admin.id,
				createdAt: daysAgo(rn.days + 1),
				translations: {
					create: [
						{
							language: 'EN',
							title: rn.titleEn,
							body: `## ${rn.titleEn}\n\nSeed release notes for version ${rn.version}. New features, fixes, and improvements across the Krydix marketplace.`,
						},
						{
							language: 'UK',
							title: rn.titleUk,
							body: `## ${rn.titleUk}\n\nТестові нотатки релізу для версії ${rn.version}. Нові функції, виправлення та покращення маркетплейсу Krydix.`,
						},
					],
				},
			},
		});
	}
	log('10 release notes + translations');

	// ── 22. REPAIR LINKED DATA (orders ↔ chats ↔ catalog) ───────────────────────

	async function repairSeedLinks() {
		const linkedProductIds = new Set<string>();

		for (const row of await prisma.orderItem.findMany({ select: { productId: true } })) {
			linkedProductIds.add(row.productId);
		}
		for (const row of await prisma.cartItem.findMany({ select: { productId: true } })) {
			linkedProductIds.add(row.productId);
		}
		for (const row of await prisma.wishlistItem.findMany({ select: { productId: true } })) {
			linkedProductIds.add(row.productId);
		}
		for (const row of await prisma.chat.findMany({
			where: { productId: { not: null } },
			select: { productId: true },
		})) {
			if (row.productId) linkedProductIds.add(row.productId);
		}
		for (const row of await prisma.productReview.findMany({ select: { productId: true } })) {
			linkedProductIds.add(row.productId);
		}

		const existingProducts = await prisma.product.findMany({
			where: { id: { in: [...linkedProductIds] } },
			select: { id: true, slug: true, status: true },
		});
		const existingById = new Map(existingProducts.map((p) => [p.id, p]));
		const missingIds = [...linkedProductIds].filter((id) => !existingById.has(id));

		if (missingIds.length > 0) {
			await prisma.cartItem.deleteMany({ where: { productId: { in: missingIds } } });
			await prisma.wishlistItem.deleteMany({ where: { productId: { in: missingIds } } });
			await prisma.chat.deleteMany({ where: { productId: { in: missingIds } } });

			const brokenItems = await prisma.orderItem.findMany({
				where: { productId: { in: missingIds } },
			});
			for (const item of brokenItems) {
				const fallback = await prisma.product.findFirst({
					where: { sellerId: item.sellerId, status: { in: [...CATALOG_VISIBLE_STATUSES] } },
					include: { translations: { where: { language: 'EN' }, take: 1 } },
				});
				if (!fallback) continue;
				await prisma.orderItem.update({
					where: { id: item.id },
					data: {
						productId: fallback.id,
						productTitle: fallback.translations[0]?.title ?? fallback.slug,
						variantId: null,
					},
				});
				linkedProductIds.delete(item.productId);
				linkedProductIds.add(fallback.id);
			}
		}

		const relinkedIds = new Set<string>();
		for (const row of await prisma.orderItem.findMany({ select: { productId: true } })) {
			relinkedIds.add(row.productId);
		}
		for (const row of await prisma.cartItem.findMany({ select: { productId: true } })) {
			relinkedIds.add(row.productId);
		}
		for (const row of await prisma.wishlistItem.findMany({ select: { productId: true } })) {
			relinkedIds.add(row.productId);
		}
		for (const row of await prisma.chat.findMany({
			where: { productId: { not: null } },
			select: { productId: true },
		})) {
			if (row.productId) relinkedIds.add(row.productId);
		}
		for (const row of await prisma.productReview.findMany({ select: { productId: true } })) {
			relinkedIds.add(row.productId);
		}

		const approved = await prisma.product.updateMany({
			where: {
				id: { in: [...relinkedIds] },
				status: { notIn: [...CATALOG_VISIBLE_STATUSES] },
			},
			data: { status: 'APPROVED', isAvailable: true },
		});

		const brokenVariants = await prisma.cartItem.findMany({
			where: { variantId: { not: null } },
			select: { id: true, productId: true, variantId: true },
		});
		for (const cart of brokenVariants) {
			if (!cart.variantId) continue;
			const variant = await prisma.productVariant.findFirst({
				where: { id: cart.variantId, productId: cart.productId },
			});
			if (variant) continue;
			await prisma.cartItem.update({
				where: { id: cart.id },
				data: { variantId: null },
			});
		}

		return { relinked: missingIds.length, approved: approved.count };
	}

	async function repairOrderNotifications() {
		const orderEvents = ['NEW_ORDER', 'ORDER_STATUS_CHANGE'] as const;
		const notifications = await prisma.notification.findMany({
			where: { event: { in: [...orderEvents] } },
			include: { user: { select: { id: true, role: true } } },
		});

		let removed = 0;
		let synced = 0;

		for (const notification of notifications) {
			const meta =
				notification.metadata &&
				typeof notification.metadata === 'object' &&
				!Array.isArray(notification.metadata)
					? (notification.metadata as Record<string, unknown>)
					: null;
			const orderId = typeof meta?.orderId === 'string' ? meta.orderId : null;
			if (!orderId) continue;

			const order = await prisma.order.findUnique({ where: { id: orderId } });
			let shouldDelete = !order;

			if (order && notification.user.role === 'SELLER') {
				const sellerItem = await prisma.orderItem.findFirst({
					where: { orderId, sellerId: notification.userId },
				});
				shouldDelete = !sellerItem;
			}

			if (order && notification.user.role === 'BUYER' && order.buyerId !== notification.userId) {
				shouldDelete = true;
			}

			if (shouldDelete) {
				await prisma.notification.delete({ where: { id: notification.id } });
				removed++;
				continue;
			}

			const expectedLabel = formatOrderLabel(orderId);
			if (meta && meta.orderLabel !== expectedLabel) {
				await prisma.notification.update({
					where: { id: notification.id },
					data: { metadata: { ...meta, orderLabel: expectedLabel } },
				});
				synced++;
			}
		}

		return { removed, synced };
	}

	const repair = await repairSeedLinks();
	const notifRepair = await repairOrderNotifications();
	log(
		`seed link repair (${repair.approved} products made catalog-visible${repair.relinked ? `, ${repair.relinked} broken refs fixed` : ''})`
	);
	log(`notification repair (${notifRepair.removed} stale removed, ${notifRepair.synced} labels synced)`);

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
