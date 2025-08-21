declare module 'bcryptjs' {
	export function genSaltSync(rounds?: number): string;
	export function hashSync(data: string, salt?: string | number): string;
	export function compareSync(data: string, encrypted: string): boolean;
	export function genSalt(rounds?: number): Promise<string>;
	export function hash(data: string, salt?: string | number): Promise<string>;
	export function compare(data: string, encrypted: string): Promise<boolean>;
	const _default: {
		genSaltSync: typeof genSaltSync;
		hashSync: typeof hashSync;
		compareSync: typeof compareSync;
		genSalt: typeof genSalt;
		hash: typeof hash;
		compare: typeof compare;
	};
	export default _default;
}
