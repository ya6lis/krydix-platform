import { Role } from '../constants/enums.js';

export interface AuthUser {
	id: string;
	role: Role;
	email: string;
}

export interface GraphQLContext {
	user: AuthUser | null;
}
