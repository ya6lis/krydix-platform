export function formatLastSeen(iso: string, locale: string): string {
	const date = new Date(iso);
	const diffMs = Date.now() - date.getTime();
	const diffMin = Math.floor(diffMs / 60000);
	if (diffMin < 1) return 'now';
	if (diffMin < 60) return `${diffMin}m ago`;
	const diffHours = Math.floor(diffMin / 60);
	if (diffHours < 24) return `${diffHours}h ago`;
	const diffDays = Math.floor(diffHours / 24);
	if (diffDays === 1) return 'Yesterday';
	if (diffDays < 7) return `${diffDays}d ago`;
	const diffWeeks = Math.floor(diffDays / 7);
	if (diffWeeks < 5) return `${diffWeeks}w ago`;
	return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

export function formatRelativeWhen(iso: string, locale: string): string {
	const date = new Date(iso);
	const diffMs = Date.now() - date.getTime();
	const diffMin = Math.floor(diffMs / 60000);
	if (diffMin < 1) return 'now';
	if (diffMin < 60) return `${diffMin}m`;
	const diffHours = Math.floor(diffMin / 60);
	if (diffHours < 24) return `${diffHours}h`;
	const diffDays = Math.floor(diffHours / 24);
	if (diffDays === 1) return 'Yesterday';
	if (diffDays < 7) return `${diffDays} days`;
	if (diffDays < 14) return '1 wk';
	return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

export function formatMessageTime(iso: string, locale: string): string {
	return new Date(iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}

export function formatDaySeparator(iso: string, locale: string): string {
	const date = new Date(iso);
	const today = new Date();
	const yesterday = new Date();
	yesterday.setDate(today.getDate() - 1);

	const sameDay = (a: Date, b: Date) =>
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate();

	if (sameDay(date, today)) return 'Today';
	if (sameDay(date, yesterday)) return 'Yesterday';
	return date.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatMemberSince(iso: string, locale: string): string {
	return new Date(iso).toLocaleDateString(locale, { month: 'short', year: 'numeric' });
}

export function formatLocation(city: string | null, country: string | null): string | null {
	if (city && country) return `${city}, ${country}`;
	return city ?? country;
}

export function formatMoney(value: number, currency = 'USD'): string {
	return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
}

export function groupMessagesByDay<T extends { createdAt: string }>(
	messages: T[],
	locale: string,
): Array<{ label: string; messages: T[] }> {
	const groups: Array<{ label: string; messages: T[] }> = [];
	for (const message of messages) {
		const label = formatDaySeparator(message.createdAt, locale);
		const last = groups[groups.length - 1];
		if (!last || last.label !== label) {
			groups.push({ label, messages: [message] });
		} else {
			last.messages.push(message);
		}
	}
	return groups;
}
