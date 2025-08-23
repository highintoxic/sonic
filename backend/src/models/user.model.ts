export interface User {
	id: number;
	email: string;
	name?: string | null;
}

export interface CreateUserInput {
	email: string;
	name?: string | null;
}

export interface UpdateUserInput {
	email?: string;
	name?: string | null;
}
