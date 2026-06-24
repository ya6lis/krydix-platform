import {
	PLATFORM_CURRENCY,
	PLATFORM_CURRENCY_LOCALE,
	PLATFORM_CURRENCY_SYMBOL,
} from '@/constants/constants';

type FormatMoneyOptions = {
	fractionDigits?: 0 | 2;
	locale?: string;
};

function createMoneyFormatter(fractionDigits: number, locale: string): Intl.NumberFormat {
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: PLATFORM_CURRENCY,
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits,
	});
}

const defaultFormatter = createMoneyFormatter(2, PLATFORM_CURRENCY_LOCALE);
const wholeFormatter = createMoneyFormatter(0, PLATFORM_CURRENCY_LOCALE);

/** Formats a numeric amount as Ukrainian hryvnia (UAH / ₴). */
export function formatMoney(value: number, options?: FormatMoneyOptions): string {
	const locale = options?.locale ?? PLATFORM_CURRENCY_LOCALE;
	const fractionDigits = options?.fractionDigits ?? 2;

	if (locale === PLATFORM_CURRENCY_LOCALE) {
		return (fractionDigits === 0 ? wholeFormatter : defaultFormatter).format(value);
	}

	return createMoneyFormatter(fractionDigits, locale).format(value);
}

/** Compact revenue display for dashboards (e.g. 1.5k ₴, 2.3M ₴). */
export function formatMoneyCompact(value: number): string {
	if (value >= 1_000_000) {
		return `${(value / 1_000_000).toLocaleString(PLATFORM_CURRENCY_LOCALE, { maximumFractionDigits: 1 })}M ${PLATFORM_CURRENCY_SYMBOL}`;
	}
	if (value >= 1_000) {
		return `${(value / 1_000).toLocaleString(PLATFORM_CURRENCY_LOCALE, { maximumFractionDigits: 1 })}k ${PLATFORM_CURRENCY_SYMBOL}`;
	}
	return formatMoney(value, { fractionDigits: 0 });
}

/** Y-axis tick labels for revenue charts. */
export function formatMoneyChartTick(value: number): string {
	if (value >= 1000) {
		return `${(value / 1000).toLocaleString(PLATFORM_CURRENCY_LOCALE, { maximumFractionDigits: 0 })}k ${PLATFORM_CURRENCY_SYMBOL}`;
	}
	return formatMoney(value, { fractionDigits: 0 });
}
