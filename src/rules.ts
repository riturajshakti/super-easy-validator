const BARE_RULES = new Set([
	'optional',
	'nullable',
	'string',
	'number',
	'boolean',
	'array',
	'object',
	'bigint',
	'symbol',
	'email',
	'url',
	'domain',
	'name',
	'fullname',
	'username',
	'alpha',
	'alphanumeric',
	'phone',
	'phonecode',
	'mongoid',
	'objectid',
	'uuid',
	'date',
	'dateonly',
	'time',
	'lower',
	'upper',
	'ip',
	'int',
	'positive',
	'negative',
	'natural',
	'whole',
])

const ARGUMENT_RULES = new Set([
	'equal',
	'size',
	'min',
	'max',
	'regex',
	'decimalsize',
	'decimalmin',
	'decimalmax',
	'enums',
	'field',
	'error',
])

export const OPERATORS = new Set(['$and', '$or'])

export const GROUP_KEYS = new Set(['$atleast', '$atmost'])

export class InvalidRuleError extends Error {
	constructor(message: string) {
		super(`[super-easy-validator] ${message}`)
		this.name = 'InvalidRuleError'
	}
}

function assertKnownToken(token: string, field: string) {
	if (token.startsWith('arrayof:')) {
		const inner = token.slice('arrayof:'.length)
		if (inner.length === 0) {
			throw new InvalidRuleError(`'${field}' has an invalid rule: 'arrayof:' needs a rule after the colon`)
		}
		assertKnownToken(inner, field)
		return
	}

	if (BARE_RULES.has(token)) {
		return
	}

	const colon = token.indexOf(':')
	if (colon > 0) {
		const prefix = token.slice(0, colon)
		if (ARGUMENT_RULES.has(prefix)) {
			return
		}
		throw new InvalidRuleError(`'${field}' has an unknown rule: '${prefix}:'`)
	}

	throw new InvalidRuleError(`'${field}' has an unknown rule: '${token}'`)
}

export function assertValidRuleString(rule: string, field: string) {
	for (const token of rule.split('|')) {
		if (token.length === 0) {
			continue
		}
		assertKnownToken(token, field)
	}
}

export function assertValidRuleTokens(tokens: string[], field: string) {
	for (const token of tokens) {
		if (typeof token !== 'string') {
			throw new InvalidRuleError(`'${field}' has an invalid rule: every rule in the array must be a string`)
		}
		if (token.length === 0) {
			continue
		}
		assertKnownToken(token, field)
	}
}

export function isOperatorNode(value: object): boolean {
	const keys = Object.keys(value)
	if (keys.length === 0) {
		return false
	}
	return keys.some((k) => OPERATORS.has(k))
}

export function assertValidOperatorNode(value: Record<string, unknown>, field: string) {
	const keys = Object.keys(value)
	const operators = keys.filter((k) => OPERATORS.has(k))

	if (operators.length > 1) {
		throw new InvalidRuleError(`'${field}' cannot combine ${operators.join(' and ')} in one object`)
	}

	const operator = operators[0]
	const extras = keys.filter((k) => k !== operator)
	if (extras.length > 0) {
		throw new InvalidRuleError(
			`'${field}' cannot mix '${operator}' with other keys (found: ${extras.join(', ')}); wrap them in a branch instead`
		)
	}

	const branches = value[operator]
	if (!Array.isArray(branches)) {
		throw new InvalidRuleError(`'${field}' has an invalid rule: '${operator}' must be an array of branches`)
	}
	if (branches.length === 0) {
		throw new InvalidRuleError(`'${field}' has an invalid rule: '${operator}' needs at least one branch`)
	}

	return { operator, branches }
}
