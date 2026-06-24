/** Shared mock data & helpers for prisma/seed.ts */

export const SEED_PASSWORD = 'Test123!';

/** Stable Unsplash product photo (crop, no random picsum). */
export const productPhoto = (photoId: string, w = 900, h = 900) =>
	`https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

/** Deterministic avatar per user email. */
export const avatarPhoto = (seed: string, size = 400) =>
	`https://i.pravatar.cc/${size}?u=${encodeURIComponent(seed)}`;

export const picsum = (id: number, w = 800, h = 800) =>
	`https://picsum.photos/id/${id}/${w}/${h}`;

export const daysAgo = (days: number, hours = 0) =>
	new Date(Date.now() - days * 86_400_000 - hours * 3_600_000);

export const UK_CITIES = [
	'Kyiv',
	'Lviv',
	'Odesa',
	'Kharkiv',
	'Dnipro',
	'Vinnytsia',
	'Chernihiv',
	'Poltava',
	'Ivano-Frankivsk',
	'Uzhhorod',
] as const;

export const FIRST_NAMES = [
	'Alex',
	'Sofia',
	'Dmytro',
	'Olena',
	'Ivan',
	'Maria',
	'Anna',
	'Pavlo',
	'Natalia',
	'Andrii',
	'Yulia',
	'Taras',
	'Kateryna',
	'Roman',
	'Viktoria',
] as const;

export const LAST_NAMES = [
	'Admin',
	'Kovalenko',
	'Hrytsenko',
	'Marchenko',
	'Petrenko',
	'Savchenko',
	'Bondarenko',
	'Tkachenko',
	'Kravchenko',
	'Melnyk',
	'Shevchenko',
	'Boiko',
	'Koval',
	'Moroz',
	'Lysenko',
] as const;

export type CatalogCategoryKey =
	| 'clothing'
	| 'outerwear'
	| 'jackets'
	| 'knitwear'
	| 'footwear'
	| 'sneakers'
	| 'home'
	| 'kitchen'
	| 'bedding'
	| 'accessories';

export type CatalogProduct = {
	slug: string;
	sku: string;
	brand: string;
	/** Price in UAH */
	price: number;
	comparePrice: number | null;
	status: string;
	categoryKeys: CatalogCategoryKey[];
	seller: 0 | 1 | 2;
	images: readonly string[];
	en: { title: string; description: string };
	uk: { title: string; description: string };
	variants: Array<{ sku?: string; options: Record<string, string>; stock: number; price?: number }>;
	attrs: Array<{ name: 'Size' | 'Color' | 'Material' | 'Shoe Size' | 'Capacity' | 'Pieces'; value: string }>;
};

export const CATALOG_PRODUCTS: CatalogProduct[] = [
	{
		slug: 'wool-cardigan-oat',
		sku: 'LG-WC-OAT',
		brand: 'Lichen Goods',
		price: 4290,
		comparePrice: 5290,
		status: 'APPROVED',
		categoryKeys: ['knitwear'],
		seller: 0,
		images: [
			productPhoto('photo-1434389677669-e08b4cac3105'),
			productPhoto('photo-1576566588028-4147f3842f27'),
			productPhoto('photo-1490481651871-ab68de25d43d'),
		],
		en: {
			title: 'Wool Cardigan — Oat',
			description:
				'Relaxed-fit cardigan in undyed Highland wool. Horn buttons, ribbed cuffs, and front patch pockets. Made in Lviv Oblast.',
		},
		uk: {
			title: 'Вовняний кардиган — Вівсяний',
			description:
				"Кардиган вільного крою з нефарбованої гірської вовни. Ґудзики з рогу, манжети в рубчик і накладні кишені. Виготовлено у Львівській області.",
		},
		variants: [
			{ sku: 'LG-WC-OAT-S', options: { size: 'S', color: 'Oat' }, stock: 6 },
			{ sku: 'LG-WC-OAT-M', options: { size: 'M', color: 'Oat' }, stock: 8 },
			{ sku: 'LG-WC-OAT-L', options: { size: 'L', color: 'Oat' }, stock: 4 },
		],
		attrs: [
			{ name: 'Size', value: 'S / M / L' },
			{ name: 'Color', value: 'Oat' },
			{ name: 'Material', value: '100% Highland Wool' },
		],
	},
	{
		slug: 'canvas-apron-charcoal',
		sku: 'FF-CA-CHR',
		brand: 'Field & Form',
		price: 2190,
		comparePrice: null,
		status: 'APPROVED',
		categoryKeys: ['accessories'],
		seller: 0,
		images: [
			productPhoto('photo-1556909114-f6e7ad7d3136'),
			productPhoto('photo-1556910103-1c02745aae4d'),
		],
		en: {
			title: 'Canvas Apron — Charcoal',
			description:
				'Heavy waxed cotton apron with adjustable neck strap, cross-back ties, and two deep utility pockets.',
		},
		uk: {
			title: 'Фартух Canvas — Графіт',
			description:
				'Міцний вощений бавовняний фартух з регульованим ременем, хрестовими бretelами та двома глибокими кишенями.',
		},
		variants: [{ sku: 'FF-CA-CHR-ONE', options: { color: 'Charcoal' }, stock: 36 }],
		attrs: [{ name: 'Color', value: 'Charcoal' }],
	},
	{
		slug: 'heritage-field-jacket-olive',
		sku: 'NA-HFJ-OLV',
		brand: 'Northern Atelier',
		price: 8690,
		comparePrice: 9890,
		status: 'APPROVED',
		categoryKeys: ['jackets', 'outerwear'],
		seller: 1,
		images: [
			productPhoto('photo-1544022613-e87ca75a784a'),
			productPhoto('photo-1567016432779-094069958ea5'),
			productPhoto('photo-1591047139829-d91aecb6caea'),
		],
		en: {
			title: 'Heritage Field Jacket — Olive',
			description:
				'Waxed cotton field jacket with brushed cotton lining, four patch pockets, storm flap, and solid brass hardware.',
		},
		uk: {
			title: 'Польова куртка Heritage — Олива',
			description:
				'Вощена бавовняна куртка з підкладкою, чотирма накладними кишенями, штормовим клапаном і фурнітурою з латуні.',
		},
		variants: [
			{ sku: 'NA-HFJ-OLV-M', options: { size: 'M', color: 'Olive' }, stock: 18 },
			{ sku: 'NA-HFJ-OLV-L', options: { size: 'L', color: 'Olive' }, stock: 9 },
			{ sku: 'NA-HFJ-OLV-XL', options: { size: 'XL', color: 'Olive' }, stock: 4 },
		],
		attrs: [
			{ name: 'Size', value: 'M / L / XL' },
			{ name: 'Color', value: 'Olive' },
			{ name: 'Material', value: 'Waxed Cotton' },
		],
	},
	{
		slug: 'quilted-vest-stone',
		sku: 'NA-QV-STN',
		brand: 'Northern Atelier',
		price: 5490,
		comparePrice: null,
		status: 'APPROVED',
		categoryKeys: ['outerwear'],
		seller: 1,
		images: [
			productPhoto('photo-1583743814966-8936f5b7be1a'),
			productPhoto('photo-1591047139829-d91aecb6caea'),
		],
		en: {
			title: 'Quilted Vest — Stone',
			description:
				'Lightweight quilted vest with recycled down fill, stand collar, and two zippered hand pockets.',
		},
		uk: {
			title: 'Стьобаний жилет — Камінь',
			description:
				'Легкий стьобаний жилет з переробленим пухом, стійкою коміркою та двома кишенями на блискавці.',
		},
		variants: [
			{ sku: 'NA-QV-STN-S', options: { size: 'S', color: 'Stone' }, stock: 5 },
			{ sku: 'NA-QV-STN-M', options: { size: 'M', color: 'Stone' }, stock: 12 },
		],
		attrs: [
			{ name: 'Size', value: 'S / M' },
			{ name: 'Color', value: 'Stone' },
			{ name: 'Material', value: 'Nylon / Recycled Down' },
		],
	},
	{
		slug: 'linen-pillowcase-set',
		sku: 'HC-LPC-SET',
		brand: 'Heritage Co.',
		price: 1890,
		comparePrice: null,
		status: 'APPROVED',
		categoryKeys: ['bedding'],
		seller: 2,
		images: [
			productPhoto('photo-1522771739844-6a9f6d5f14af'),
			productPhoto('photo-1631049307264-da0ec9d70304'),
		],
		en: {
			title: 'Linen Pillowcase Set of 2',
			description: 'Two stonewashed European linen pillowcases (50×70 cm) with envelope closure.',
		},
		uk: {
			title: 'Набір лляних наволочок 2 шт.',
			description: 'Дві наволочки з промитого європейського льону (50×70 см) із застібкою-envelope.',
		},
		variants: [
			{ options: { color: 'Natural', size: '50x70cm' }, stock: 58 },
			{ options: { color: 'Ash', size: '50x70cm' }, stock: 30 },
		],
		attrs: [{ name: 'Pieces', value: '2' }],
	},
	{
		slug: 'ceramic-pour-over-set',
		sku: 'MS-CPO-SET',
		brand: 'Maru Studio',
		price: 3290,
		comparePrice: 3990,
		status: 'PENDING_MODERATION',
		categoryKeys: ['kitchen'],
		seller: 2,
		images: [
			productPhoto('photo-1514432324607-a09d9b4aefdd'),
			productPhoto('photo-1503602642458-232111445657'),
			productPhoto('photo-1578662996442-48f60103fc96'),
		],
		en: {
			title: 'Ceramic Pour-Over Set',
			description: 'Hand-thrown stoneware dripper and 600 ml server. Fits standard #2 filters, 1–4 cups.',
		},
		uk: {
			title: 'Керамічний набір для пуровера',
			description: 'Ручна керамічна воронка та сервер 600 мл. Підходить для фільтрів №2, 1–4 чашки.',
		},
		variants: [{ options: { color: 'Matte White' }, stock: 22, price: 3290 }],
		attrs: [{ name: 'Capacity', value: '600 ml' }],
	},
	{
		slug: 'trail-runners-charcoal',
		sku: 'HC-TR-CHR',
		brand: 'Heritage Co.',
		price: 6490,
		comparePrice: null,
		status: 'APPROVED',
		categoryKeys: ['sneakers', 'footwear'],
		seller: 0,
		images: [
			productPhoto('photo-1542291026-7eec264c27ff'),
			productPhoto('photo-1460353581641-37baddab0fa2'),
			productPhoto('photo-1560343090-f0409e92791a'),
		],
		en: {
			title: 'Trail Runners — Charcoal',
			description:
				'Trail running shoes with Vibram® Megagrip outsole, ripstop upper, and waterproof membrane.',
		},
		uk: {
			title: 'Кросівки Trail — Графіт',
			description:
				'Трейлові кросівки з підошвою Vibram® Megagrip, ripstop-верхом і водонепроникною мембраною.',
		},
		variants: [
			{ options: { size: '41', color: 'Charcoal' }, stock: 3 },
			{ options: { size: '42', color: 'Charcoal' }, stock: 4 },
			{ options: { size: '43', color: 'Charcoal' }, stock: 2 },
		],
		attrs: [{ name: 'Shoe Size', value: 'EU 41–43' }],
	},
	{
		slug: 'merino-scarf-heather',
		sku: 'LG-MS-HTR',
		brand: 'Lichen Goods',
		price: 2990,
		comparePrice: 3690,
		status: 'APPROVED',
		categoryKeys: ['knitwear', 'accessories'],
		seller: 0,
		images: [
			productPhoto('photo-1515886657613-9f3515b0c78f'),
			productPhoto('photo-1576566588028-4147f3842f27'),
		],
		en: {
			title: 'Merino Scarf — Heather Grey',
			description: 'Extra-fine merino wool scarf, 180×30 cm. Soft, breathable, and non-itchy.',
		},
		uk: {
			title: 'Шарф Merino — Heather Grey',
			description: 'Шарф із extra-fine merino, 180×30 см. Мʼякий, дихаючий, не колеться.',
		},
		variants: [{ sku: 'LG-MS-HTR-ONE', options: { color: 'Heather Grey' }, stock: 24 }],
		attrs: [
			{ name: 'Color', value: 'Heather Grey' },
			{ name: 'Material', value: '100% Merino Wool' },
		],
	},
	{
		slug: 'denim-shirt-indigo',
		sku: 'NA-DS-IND',
		brand: 'Northern Atelier',
		price: 3990,
		comparePrice: null,
		status: 'APPROVED',
		categoryKeys: ['clothing'],
		seller: 1,
		images: [
			productPhoto('photo-1583743814966-8936f5b7be1a'),
			productPhoto('photo-1490481651871-ab68de25d43d'),
		],
		en: {
			title: 'Selvedge Denim Shirt — Indigo',
			description: 'Relaxed selvedge denim shirt with corozo buttons and double chest pockets.',
		},
		uk: {
			title: 'Джинсова сорочка Selvedge — Indigo',
			description: 'Джинсова сорочка з selvedge-дрім, corozo-ґудзиками та двома нагрудними кишенями.',
		},
		variants: [
			{ sku: 'NA-DS-IND-M', options: { size: 'M', color: 'Indigo' }, stock: 14 },
			{ sku: 'NA-DS-IND-L', options: { size: 'L', color: 'Indigo' }, stock: 11 },
		],
		attrs: [
			{ name: 'Size', value: 'M / L' },
			{ name: 'Color', value: 'Indigo' },
		],
	},
	{
		slug: 'leather-belt-tan',
		sku: 'FF-LB-TAN',
		brand: 'Field & Form',
		price: 3290,
		comparePrice: 3890,
		status: 'APPROVED',
		categoryKeys: ['accessories'],
		seller: 0,
		images: [
			productPhoto('photo-1558618666-fcd25c85cd64'),
			productPhoto('photo-1586023492125-27b2c045efd7'),
		],
		en: {
			title: 'Leather Belt — Tan',
			description: 'Full-grain vegetable-tanned leather belt with solid brass buckle. 3.5 cm width.',
		},
		uk: {
			title: 'Шкіряний ремінь — Tan',
			description: 'Ремінь з full-grain шкіри рослинного дублення та латунною пряжкою. Ширина 3,5 см.',
		},
		variants: [{ sku: 'FF-LB-TAN-100', options: { size: '100 cm', color: 'Tan' }, stock: 19 }],
		attrs: [{ name: 'Color', value: 'Tan' }],
	},
	{
		slug: 'wool-blanket-grey',
		sku: 'HC-WB-GRY',
		brand: 'Heritage Co.',
		price: 6590,
		comparePrice: null,
		status: 'APPROVED',
		categoryKeys: ['bedding', 'home'],
		seller: 2,
		images: [
			productPhoto('photo-1615529328331-f8917597711f'),
			productPhoto('photo-1522771739844-6a9f6d5f14af'),
		],
		en: {
			title: 'Wool Throw Blanket — Grey',
			description: 'Heavy merino wool throw (130×180 cm) with herringbone weave. Dry clean recommended.',
		},
		uk: {
			title: 'Вовняний плед — Grey',
			description: 'Щільний merino-плед (130×180 см) з herringbone-плетінням. Рекомендовано хімчистку.',
		},
		variants: [{ sku: 'HC-WB-GRY-ONE', options: { color: 'Grey' }, stock: 15 }],
		attrs: [{ name: 'Color', value: 'Grey' }],
	},
	{
		slug: 'stoneware-mug-set',
		sku: 'MS-SM-SET',
		brand: 'Maru Studio',
		price: 1990,
		comparePrice: 2390,
		status: 'PENDING_MODERATION',
		categoryKeys: ['kitchen'],
		seller: 2,
		images: [
			productPhoto('photo-1503602642458-232111445657'),
			productPhoto('photo-1578662996442-48f60103fc96'),
		],
		en: {
			title: 'Stoneware Mug Set of 4',
			description: 'Hand-glazed stoneware mugs, 350 ml each. Microwave and dishwasher safe.',
		},
		uk: {
			title: 'Набір кружок Stoneware 4 шт.',
			description: 'Кружки ручної глазурі по 350 мл. Можна в мікрохвильовку та ПММ.',
		},
		variants: [{ sku: 'MS-SM-SET-4', options: { color: 'Sand Glaze' }, stock: 32 }],
		attrs: [{ name: 'Pieces', value: '4' }],
	},
	{
		slug: 'bamboo-cutting-board',
		sku: 'MS-BCB-L',
		brand: 'Maru Studio',
		price: 1490,
		comparePrice: null,
		status: 'APPROVED',
		categoryKeys: ['kitchen'],
		seller: 2,
		images: [
			productPhoto('photo-1556910103-1c02745aae4d'),
			productPhoto('photo-1556909114-f6e7ad7d3136'),
		],
		en: {
			title: 'Bamboo Cutting Board — Large',
			description: 'End-grain bamboo board 40×30 cm with juice groove and silicone feet.',
		},
		uk: {
			title: 'Бамбукова дошка — Large',
			description: 'End-grain бамбукова дошка 40×30 см з канавкою для соку та силіконовими ніжками.',
		},
		variants: [{ sku: 'MS-BCB-L-ONE', options: { size: '40x30cm' }, stock: 27 }],
		attrs: [{ name: 'Capacity', value: '40×30 cm' }],
	},
	{
		slug: 'running-shoes-white',
		sku: 'HC-RS-WHT',
		brand: 'Heritage Co.',
		price: 5790,
		comparePrice: 6990,
		status: 'APPROVED',
		categoryKeys: ['sneakers'],
		seller: 0,
		images: [
			productPhoto('photo-1460353581641-37baddab0fa2'),
			productPhoto('photo-1549298916-b41d501d3772'),
		],
		en: {
			title: 'Road Running Shoes — White',
			description: 'Cushioned road runners with engineered mesh upper and EVA midsole. EU 40–44.',
		},
		uk: {
			title: 'Бігові кросівки — White',
			description: 'Амортизуючі дорожні кросівки з engineered mesh та EVA-підошвою. EU 40–44.',
		},
		variants: [
			{ options: { size: '42', color: 'White' }, stock: 8 },
			{ options: { size: '43', color: 'White' }, stock: 6 },
		],
		attrs: [{ name: 'Shoe Size', value: 'EU 42–43' }],
	},
	{
		slug: 'crossbody-bag-cognac',
		sku: 'NA-CB-COG',
		brand: 'Northern Atelier',
		price: 5490,
		comparePrice: null,
		status: 'APPROVED',
		categoryKeys: ['accessories'],
		seller: 1,
		images: [
			productPhoto('photo-1548036328-c9fa89d128fa'),
			productPhoto('photo-1567538096630-e0c55bd6374c'),
		],
		en: {
			title: 'Leather Crossbody Bag — Cognac',
			description: 'Compact full-grain leather crossbody with adjustable strap and magnetic flap.',
		},
		uk: {
			title: 'Шкіряна сумка Crossbody — Cognac',
			description: 'Компактна сумка з full-grain шкіри з регульованим ременем і магнітним клапаном.',
		},
		variants: [{ sku: 'NA-CB-COG-ONE', options: { color: 'Cognac' }, stock: 13 }],
		attrs: [{ name: 'Color', value: 'Cognac' }],
	},
	{
		slug: 'linen-dress-sage',
		sku: 'LG-LD-SGE',
		brand: 'Lichen Goods',
		price: 4990,
		comparePrice: 6190,
		status: 'DRAFT',
		categoryKeys: ['clothing'],
		seller: 0,
		images: [
			productPhoto('photo-1496747611176-843222e1e57c'),
			productPhoto('photo-1515372039744-b8f02a3ae446'),
		],
		en: {
			title: 'Linen Midi Dress — Sage',
			description: 'Relaxed midi dress in washed linen with side pockets and tie waist.',
		},
		uk: {
			title: 'Лляна сукня Midi — Sage',
			description: 'Сукня midi з промитого льону з боковими кишенями та пояском.',
		},
		variants: [
			{ sku: 'LG-LD-SGE-S', options: { size: 'S', color: 'Sage' }, stock: 5 },
			{ sku: 'LG-LD-SGE-M', options: { size: 'M', color: 'Sage' }, stock: 7 },
		],
		attrs: [
			{ name: 'Size', value: 'S / M' },
			{ name: 'Color', value: 'Sage' },
		],
	},
	{
		slug: 'insulated-bottle-black',
		sku: 'FF-IB-BLK',
		brand: 'Field & Form',
		price: 1390,
		comparePrice: null,
		status: 'APPROVED',
		categoryKeys: ['kitchen'],
		seller: 0,
		images: [
			productPhoto('photo-1602143407151-7111542de6e8'),
			productPhoto('photo-1558618666-fcd25c85cd64'),
		],
		en: {
			title: 'Insulated Steel Bottle — Black',
			description: '750 ml double-wall vacuum bottle. Keeps drinks hot 12 h / cold 24 h.',
		},
		uk: {
			title: 'Термопляшка Steel — Black',
			description: 'Подвійні стінки 750 мл. Тримає гаряче 12 год / холодне 24 год.',
		},
		variants: [{ sku: 'FF-IB-BLK-750', options: { color: 'Black', capacity: '750ml' }, stock: 41 }],
		attrs: [{ name: 'Capacity', value: '750 ml' }],
	},
	{
		slug: 'hiking-boots-brown',
		sku: 'NA-HB-BRN',
		brand: 'Northern Atelier',
		price: 8990,
		comparePrice: 10490,
		status: 'REJECTED',
		categoryKeys: ['footwear'],
		seller: 1,
		images: [
			productPhoto('photo-1556906781-9a412961c28c'),
			productPhoto('photo-1542291026-7eec264c27ff'),
		],
		en: {
			title: 'Hiking Boots — Brown',
			description: 'Waterproof nubuck hiking boots with Vibram sole and padded collar. EU 41–45.',
		},
		uk: {
			title: 'Черевики для хайкінгу — Brown',
			description: 'Waterproof черевики з нубуку з підошвою Vibram і мʼяким коміром. EU 41–45.',
		},
		variants: [
			{ options: { size: '42', color: 'Brown' }, stock: 0 },
			{ options: { size: '43', color: 'Brown' }, stock: 0 },
		],
		attrs: [{ name: 'Shoe Size', value: 'EU 42–43' }],
	},
	{
		slug: 'cotton-duvet-cover',
		sku: 'HC-CDC-DBL',
		brand: 'Heritage Co.',
		price: 3790,
		comparePrice: null,
		status: 'APPROVED',
		categoryKeys: ['bedding'],
		seller: 2,
		images: [
			productPhoto('photo-1631049307264-da0ec9d70304'),
			productPhoto('photo-1522771739844-6a9f6d5f14af'),
		],
		en: {
			title: 'Cotton Duvet Cover — Double',
			description: '200 thread count cotton duvet cover (200×220 cm) with hidden button closure.',
		},
		uk: {
			title: 'Підодіяльник Cotton — Double',
			description: 'Бавовняний підодіяльник 200 TC (200×220 см) із прихованими ґудзиками.',
		},
		variants: [{ sku: 'HC-CDC-DBL-ONE', options: { size: '200x220cm', color: 'White' }, stock: 22 }],
		attrs: [{ name: 'Pieces', value: '1' }],
	},
];

/** @deprecated Use CATALOG_PRODUCTS */
export const EXTRA_PRODUCTS = CATALOG_PRODUCTS.slice(7);

export const EXTRA_PROMO_CODES = [
	{ code: 'SPRING15', description: 'Spring collection', discountPercent: 15, minOrderAmount: 600 },
	{ code: 'FREESHIP', description: 'Shipping promo', discountFixed: 100, minOrderAmount: 400 },
	{ code: 'LOYAL5', description: 'Loyalty reward', discountPercent: 5, minOrderAmount: 300 },
	{ code: 'BULK30', description: 'Bulk order', discountFixed: 300, minOrderAmount: 2500 },
	{ code: 'NEWBIE8', description: 'New buyer', discountPercent: 8, minOrderAmount: 450 },
] as const;

export const RETURN_REASONS = [
	'Wrong size received',
	'Color differs from photos',
	'Damaged during shipping',
	'Missing accessories',
	'Quality below expectations',
	'Ordered by mistake',
	'Late delivery',
	'Defective zipper',
	'Uncomfortable fit',
	'Changed my mind',
] as const;

export const REVIEW_TEXTS = [
	'Excellent quality and fast delivery.',
	'Good product, packaging could be better.',
	'Exactly as described, very happy.',
	'Nice item but sizing runs small.',
	'Beautiful craftsmanship, will buy again.',
	'Average experience, nothing special.',
	'Outstanding seller communication.',
	'Material feels premium in hand.',
	'Not worth the price in my opinion.',
	'Perfect gift, recipient loved it.',
] as const;

export function feeSnapshot(lineTotal: number, percent = 12, fixed = 0.5) {
	const platformFee = Math.round((lineTotal * percent) / 100 + fixed);
	return {
		currencySnapshot: 'UAH',
		buyerFeePercentSnapshot: 0,
		buyerFeeAmountSnapshot: 0,
		sellerFeePercentSnapshot: percent,
		sellerFeeAmountSnapshot: platformFee,
		platformFeePercentSnapshot: percent,
		platformFeeAmountSnapshot: platformFee,
		sellerPayoutAmountSnapshot: Math.max(0, lineTotal - platformFee),
	};
}
