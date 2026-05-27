import { logger } from '../utils/logger.js';
import { ORDER_JOB_INTERVAL_MS } from '../constants/monetization.js';
import { runAutoConfirmReceipts, runPayoutReleaseJobs } from './payoutService.js';

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

export async function runOrderMonetizationJobs(): Promise<void> {
	if (running) return;
	running = true;
	try {
		const autoConfirmed = await runAutoConfirmReceipts();
		const { promoted, released } = await runPayoutReleaseJobs();
		if (autoConfirmed > 0 || promoted > 0 || released > 0) {
			logger.info({ autoConfirmed, promoted, released }, 'Order monetization jobs completed');
		}
	} catch (error) {
		logger.error(error, 'Order monetization jobs failed');
	} finally {
		running = false;
	}
}

export function startOrderMonetizationJobs(): void {
	if (timer) return;
	void runOrderMonetizationJobs();
	timer = setInterval(() => {
		void runOrderMonetizationJobs();
	}, ORDER_JOB_INTERVAL_MS);
	logger.info({ intervalMs: ORDER_JOB_INTERVAL_MS }, 'Order monetization jobs scheduled');
}

export function stopOrderMonetizationJobs(): void {
	if (timer) {
		clearInterval(timer);
		timer = null;
	}
}
