import { GraphQLError } from 'graphql';
import { v2 as cloudinary } from 'cloudinary';
import * as profileRepo from '../repositories/profileRepository.js';
import * as userRepo from '../repositories/userRepository.js';
import { env } from '../config/env.js';

function ensureCloudinary() {
	if (env.CLOUDINARY_CLOUD_NAME) {
		cloudinary.config({
			cloud_name: env.CLOUDINARY_CLOUD_NAME,
			api_key: env.CLOUDINARY_API_KEY,
			api_secret: env.CLOUDINARY_API_SECRET,
		});
	}
}

type UserRecord = NonNullable<Awaited<ReturnType<typeof userRepo.findUserById>>>;

function serializeProfile(profile: NonNullable<UserRecord['profile']>) {
	return {
		id: profile.id,
		firstName: profile.firstName,
		lastName: profile.lastName,
		displayName: profile.displayName,
		bio: profile.bio,
		phone: profile.phone,
		avatarUrl: profile.avatarUrl,
		country: profile.country,
		city: profile.city,
	};
}

export async function updateProfile(
	userId: string,
	input: {
		firstName: string;
		lastName: string;
		displayName?: string | null;
		bio?: string | null;
		phone?: string | null;
		country?: string | null;
		city?: string | null;
	}
) {
	const existing = await profileRepo.findProfileByUserId(userId);
	if (!existing) {
		throw new GraphQLError('Profile not found', { extensions: { code: 'NOT_FOUND' } });
	}

	const updated = await profileRepo.updateProfileByUserId(userId, {
		firstName: input.firstName,
		lastName: input.lastName,
		displayName: input.displayName?.trim() || null,
		bio: input.bio?.trim() || null,
		phone: input.phone?.trim() || null,
		country: input.country?.trim() || null,
		city: input.city?.trim() || null,
	});

	return serializeProfile(updated);
}

export async function uploadProfileAvatar(userId: string, dataUrl: string) {
	const existing = await profileRepo.findProfileByUserId(userId);
	if (!existing) {
		throw new GraphQLError('Profile not found', { extensions: { code: 'NOT_FOUND' } });
	}

	let avatarUrl = dataUrl;

	if (env.CLOUDINARY_CLOUD_NAME) {
		ensureCloudinary();
		const result = await cloudinary.uploader.upload(dataUrl, {
			folder: 'krydix/avatars',
			resource_type: 'image',
		});
		avatarUrl = result.secure_url;
	}

	const updated = await profileRepo.updateProfileByUserId(userId, { avatarUrl });
	return serializeProfile(updated);
}

export async function removeProfileAvatar(userId: string) {
	const existing = await profileRepo.findProfileByUserId(userId);
	if (!existing) {
		throw new GraphQLError('Profile not found', { extensions: { code: 'NOT_FOUND' } });
	}

	const updated = await profileRepo.updateProfileByUserId(userId, { avatarUrl: null });
	return serializeProfile(updated);
}
