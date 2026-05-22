import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/hash.js';

const prisma = new PrismaClient();

/**
 * Seeds the catalog: a verified seller, a nested category tree (EN + UK),
 * and a handful of approved products with translations, media and variants.
 */
async function main() {
	// ── Seller ──
	const passwordHash = await hashPassword('Seller123!');
	const seller = await prisma.user.upsert({
		where: { email: 'seller@krydix.dev' },
		update: {},
		create: {
			email: 'seller@krydix.dev',
			passwordHash,
			role: 'SELLER',
			isEmailVerified: true,
			profile: { create: { firstName: 'Northern', lastName: 'Atelier' } },
		},
	});

	// ── Categories ──
	const categories: { slug: string; parent: string | null; en: string; uk: string }[] = [
		{ slug: 'outerwear', parent: null, en: 'Outerwear', uk: 'Верхній одяг' },
		{ slug: 'jackets', parent: 'outerwear', en: 'Jackets', uk: 'Куртки' },
		{ slug: 'footwear', parent: null, en: 'Footwear', uk: 'Взуття' },
		{ slug: 'accessories', parent: null, en: 'Accessories', uk: 'Аксесуари' },
	];

	const categoryIds = new Map<string, string>();
	for (const cat of categories) {
		const created = await prisma.category.upsert({
			where: { slug: cat.slug },
			update: {},
			create: {
				slug: cat.slug,
				parentId: cat.parent ? categoryIds.get(cat.parent) : null,
				translations: {
					create: [
						{ language: 'EN', name: cat.en },
						{ language: 'UK', name: cat.uk },
					],
				},
			},
		});
		categoryIds.set(cat.slug, created.id);
	}

	// ── Products ──
	const products = [
		{
			slug: 'heritage-field-jacket-olive',
			sku: 'NA-HFJ-OLV',
			brand: 'Heritage Co.',
			price: 184,
			category: 'jackets',
			en: {
				title: 'Heritage Field Jacket — Olive',
				description: 'Waxed cotton field jacket, brushed cotton lining.',
			},
			uk: {
				title: 'Польова куртка Heritage — Олива',
				description: 'Вощена бавовняна куртка з підкладкою.',
			},
			image: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
			variants: [
				{ options: { size: 'M', color: 'Olive' }, stock: 18 },
				{ options: { size: 'L', color: 'Olive' }, stock: 9 },
			],
		},
		{
			slug: 'linen-overshirt-sand',
			sku: 'MS-LOS-SND',
			brand: 'Maru Studio',
			price: 92,
			category: 'outerwear',
			en: {
				title: 'Linen Overshirt — Sand',
				description: 'Lightweight linen overshirt for layering.',
			},
			uk: { title: 'Сорочка з льону — Пісок', description: 'Легка лляна сорочка для шарування.' },
			image: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
			variants: [{ options: { size: 'M', color: 'Sand' }, stock: 32 }],
		},
		{
			slug: 'trail-runners-charcoal',
			sku: 'HC-TR-CHR',
			brand: 'Heritage Co.',
			price: 148,
			category: 'footwear',
			en: { title: 'Trail Runners — Charcoal', description: 'All-terrain trail running shoes.' },
			uk: {
				title: 'Кросівки Trail — Графіт',
				description: 'Кросівки для бігу по пересіченій місцевості.',
			},
			image: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
			variants: [{ options: { size: '42', color: 'Charcoal' }, stock: 4 }],
		},
		{
			slug: 'canvas-tote-natural',
			sku: 'FF-CT-NAT',
			brand: 'Field & Form',
			price: 48,
			category: 'accessories',
			en: {
				title: 'Canvas Tote — Natural',
				description: 'Heavy canvas tote with reinforced handles.',
			},
			uk: {
				title: 'Сумка Canvas — Натуральна',
				description: 'Щільна полотняна сумка з посиленими ручками.',
			},
			image: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
			variants: [{ options: { color: 'Natural' }, stock: 47 }],
		},
	];

	for (const p of products) {
		const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
		if (existing) continue;
		await prisma.product.create({
			data: {
				sellerId: seller.id,
				slug: p.slug,
				sku: p.sku,
				brand: p.brand,
				basePrice: p.price,
				status: 'APPROVED',
				isAvailable: true,
				translations: {
					create: [
						{ language: 'EN', title: p.en.title, description: p.en.description },
						{ language: 'UK', title: p.uk.title, description: p.uk.description },
					],
				},
				media: {
					create: [
						{ url: p.image, publicId: `seed/${p.slug}`, type: 'IMAGE', isMain: true, sortOrder: 0 },
					],
				},
				variants: { create: p.variants.map((v) => ({ options: v.options, stock: v.stock })) },
				categories: { create: [{ categoryId: categoryIds.get(p.category)! }] },
			},
		});
	}

	// eslint-disable-next-line no-console
	console.log(`Seeded ${categories.length} categories and ${products.length} products.`);
}

main()
	.catch((err) => {
		// eslint-disable-next-line no-console
		console.error(err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
