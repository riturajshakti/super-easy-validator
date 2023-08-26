// types/index.d.ts
declare module 'super-easy-validator' {
	export interface ValidatorResult {
		errors?: string[];
	}

	export interface ValidatorRules {
		[key: string]: string;
	}

	export interface ValidatorData {
		[key: string]: any;
	}

	export function validate(rules: ValidatorRules, data: ValidatorData): ValidatorResult;
}
