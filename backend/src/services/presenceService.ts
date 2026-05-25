import * as userRepo from '../repositories/userRepository.js';
import { LAST_SEEN_TOUCH_INTERVAL_MS, USER_ONLINE_THRESHOLD_MS } from '../constants/constants.js';

const lastTouchByUser = new Map<string, number>();

export function isUserOnline(lastSeenAt: Date | null | undefined, fallback: Date): boolean {
	const seen = lastSeenAt ?? fallback;
	return Date.now() - seen.getTime() <= USER_ONLINE_THRESHOLD_MS;
}

export function touchLastSeen(userId: string, force = false): void {
	const now = Date.now();
	const last = lastTouchByUser.get(userId) ?? 0;
	if (!force && now - last < LAST_SEEN_TOUCH_INTERVAL_MS) return;

	lastTouchByUser.set(userId, now);
	void userRepo.updateUserLastSeenAt(userId).catch(() => undefined);
}

export function resetLastSeenThrottleForTests(): void {
	lastTouchByUser.clear();
}
