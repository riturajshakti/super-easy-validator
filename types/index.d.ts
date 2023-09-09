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

	export interface ValidatorConfig {
		quotes?: 'none' | 'single-quotes' | 'double-quotes' | 'backtick';
	}

	export function validate(rules: ValidatorRules, data: ValidatorData, config?: ValidatorConfig): ValidatorResult;
}
