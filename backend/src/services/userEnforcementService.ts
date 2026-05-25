import * as repo from '../repositories/userEnforcementRepository.js';

export type { UserEnforcementResult } from '../repositories/userEnforcementRepository.js';

export async function enforceSoftBan(userId: string) {
	return repo.applySoftBanEffects(userId);
}

export async function enforceSoftDelete(userId: string) {
	return repo.applySoftDeleteEffects(userId);
}
