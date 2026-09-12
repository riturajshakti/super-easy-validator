import { ErrorCodes, ValidationDetail } from './codes'
import { quotes } from './config'
import {
	assertValidOperatorNode,
	assertValidRuleString,
	assertValidRuleTokens,
	InvalidRuleError,
	isOperatorNode,
} from './rules'
import {
	getError,
	getField,
	getPropByString,
	getSize,
	hasIndexSyntax,
	isSliceKey,
	resolveIndexedPath,
} from './helpers'
import {
	ArrayType,
	ConstraintType,
	Data,
	DataType,
	Rules,
	SpecificNumberType,
	SpecificStringType,
	Validation,
	ValidatorConfig,
} from './types'

const defaultValidatorConfig = { quotes: 'none' } as const

let mongoidWarned = false

function warnDeprecatedMongoid() {
	if (mongoidWarned) {
		return
	}
	mongoidWarned = true
	console.warn(
		"[super-easy-validator] the 'mongoid' rule is deprecated and will be removed in a future release. Use 'objectid' instead."
	)
}

function validate(rules: Rules, data: Data, config: ValidatorConfig = defaultValidatorConfig) {
	try {
		const rawDetails: ValidationDetail[] = validateInternal(rules, data, config)

		const quote = quotes[config.quotes ?? 'none']
		const seen = new Set<string>()
		const details: ValidationDetail[] = []
		for (const detail of rawDetails) {
			const message = detail.message.replace(/"/g, quote)
			if (seen.has(message)) {
				continue
			}
			seen.add(message)
			details.push({ message, code: detail.code })
		}

		if (details.length === 0) {
			return { errors: undefined, details: undefined }
		}

		return { errors: details.map((e) => e.message), details }
	} catch (error) {
		if (error instanceof InvalidRuleError) {
			throw error
		}
		console.log(error)
		const message = 'error occurred while data validation'
		return { errors: [message], details: [{ message, code: ErrorCodes.INTERNAL_ERROR }] }
	}
}

function validateInternal(
	rules: Rules,
	data: Data | Data[],
	config: ValidatorConfig = defaultValidatorConfig,
	allErrors: ValidationDetail[] | undefined = [],
	variableName?: string,
) {
	try {
		if (!data) {
			allErrors.push({ message: `"${variableName ?? '"data"'}" is required`, code: ErrorCodes.DATA_REQUIRED })
			return allErrors
		}
		if (typeof data !== 'object' && !Array.isArray(data)) {
			allErrors.push({ message: `"${variableName ?? '"data"'}" must be of type object/array`, code: ErrorCodes.DATA_NOT_OBJECT })
			return allErrors
		}
		for (let [key, value] of Object.entries(rules)) {
			let errors = [] as ValidationDetail[]
			let validations: Validation[] = []
			const label = variableName ? `"${variableName}.${key}"` : `"${key}"`;
			if (typeof value === 'function') {
				const fieldName = variableName ? `${variableName}.${key}` : key
				const target =
					config.arrayIndexingCheck !== false && hasIndexSyntax(key)
						? resolveIndexedPath(data as Data, key).value
						: !key.includes('.')
						? (data as Data)[key]
						: getPropByString(data as Data, key)
				allErrors.push(
					...runCustomRule(value as (v: any, p: any) => any, target, data as Data, fieldName)
				)
				continue
			} else if (typeof value === 'string') {
				if (key !== '$atleast' && key !== '$atmost') {
					assertValidRuleString(value as string, variableName ? `${variableName}.${key}` : key)
				}
				validations = (value as string).split('|') as Validation[]
			} else if (Array.isArray(value) && typeof value[0] === 'string') {
				const fieldName = variableName ? `${variableName}.${key}` : key
				if (key !== '$atleast' && key !== '$atmost') {
					assertValidRuleTokens(value as string[], fieldName)
				}
				validations = value as string[] as Validation[]
			} else if (typeof value === 'object' && !Array.isArray(value) && isOperatorNode(value as object)) {
				const _internalData =
					config.arrayIndexingCheck !== false && hasIndexSyntax(key)
						? resolveIndexedPath(data as Data, key).value
						: !key.includes('.')
						? (data as Data)[key]
						: getPropByString(data as Data, key)
				const operatorErrors = validateOperatorNode(
					value as Record<string, unknown>,
					_internalData,
					config,
					variableName ? `${variableName}.${key}` : key,
					data as Data
				)
				allErrors.push(...operatorErrors)
				continue
			} else if (typeof value === 'object' && !Array.isArray(value)) {
				const _internalData = (data as Data)[key]
				if (!allErrors) {
					allErrors = []
				}
				if(_internalData === undefined || _internalData === null) {
					allErrors.push({ message: `${label} is required`, code: ErrorCodes.REQUIRED })
					continue
				}
				if(typeof _internalData !== 'object' || Array.isArray(_internalData)) {
					allErrors.push({ message: `${label} must be of type object`, code: ErrorCodes.NOT_OBJECT })
					continue
				}
				let errorsList = validateInternal(
					value as Rules,
					_internalData,
					config,
					errors,
					variableName ? `${variableName}.${key}` : key
				)
				allErrors.push(...errorsList)
				continue
			} else {
				const _internalData = (data as Data)[key]
				if (!allErrors) {
					allErrors = []
				}
				if(_internalData === undefined || _internalData === null) {
					allErrors.push({ message: `${label} is required`, code: ErrorCodes.REQUIRED })
					continue
				}
				if(!Array.isArray(_internalData)) {
					allErrors.push({ message: `${label} must be of type array`, code: ErrorCodes.NOT_ARRAY })
					continue
				}
				const innerRule = (value as [Rules])[0]
				for(let i = 0; i < (_internalData as Data[]).length; i++) {
					const _data = _internalData[i] as Data;
					const elementPath = variableName ? `${variableName}.${key}[${i}]` : `${key}[${i}]`
					if (Array.isArray(innerRule)) {
						let errorsList = validateInternal(
							{ [elementPath]: innerRule } as unknown as Rules,
							{ [elementPath]: _data } as Data,
							config,
							errors
						)
						allErrors.push(...errorsList)
						continue
					}
					let errorsList = validateInternal(
						innerRule,
						_data,
						config,
						errors,
						elementPath
					)
					allErrors.push(...errorsList)
				}
				continue
			}

			data = data as Data;
			const indexingEnabled = config.arrayIndexingCheck !== false
			const indexed = indexingEnabled && hasIndexSyntax(key)

			if (indexed && isSliceKey(key)) {
				const { value: slice, labels } = resolveIndexedPath(data, key)
				if (!Array.isArray(slice)) {
					errors.push({ message: `"${key}" must be an array`, code: ErrorCodes.NOT_ARRAY })
				} else {
					for (let s = 0; s < slice.length; s++) {
						validateSingleData(labels[s] ?? `${key}[${s}]`, slice[s], validations, errors, variableName)
					}
				}
				allErrors.push(...errors)
				continue
			}

			let dataToSend = indexed
				? resolveIndexedPath(data, key).value
				: !key.includes('.')
				? data[key]
				: getPropByString(data, key)

			if (key === '$atleast') {
				validateAtleastData(data, value as string, errors, variableName)
			} else if (key === '$atmost') {
				validateAtmostData(data, value as string, errors, variableName)
			} else {
				validateSingleData(key, dataToSend, validations, errors, variableName)
			}

			allErrors.push(...errors)
		}
		if (config.strict) {
			validateStrictCheck(rules, data, allErrors, variableName)
		}

		return allErrors
	} catch (error) {
		if (error instanceof InvalidRuleError) {
			throw error
		}
		console.log(error)
		return [{ message: 'error occurred while data validation', code: ErrorCodes.INTERNAL_ERROR }]
	}
}

function validateSingleData(key: string, value: any, validations: Validation[], errors: ValidationDetail[], variableName = '') {
	let optionalArrays: any[][] = []
	let nullableArrays: any[][] = []

	for (let validation of validations) {
		// !optional
		if (validation === 'optional' && value === undefined) {
			return
		}

		// !nullable
		if (validation === 'nullable' && value === null) {
			return
		}

		const previousValidations = validations.slice(0, validations.indexOf(validation))

		// ! string,number,boolean,object,array,bigint
		if ('string,number,boolean,object,array,bigint,symbol'.split(',').includes(validation)) {
			checkDataType(key, value, validation as DataType, previousValidations, validations, errors, variableName)
			if (errors.length) {
				break
			}
		}

		// ! email,url,domain,name,fullname,username,alpha,alphanumeric,phone,phonecode,uuid,mongoid,date,dateonly,time,lower,upper,ip
		if (
			'email,url,domain,name,fullname,username,alpha,alphanumeric,phone,phonecode,uuid,mongoid,objectid,date,dateonly,time,lower,upper,ip'
				.split(',')
				.includes(validation)
		) {
			checkSpecificStringType(
				key,
				value,
				validation as SpecificStringType,
				previousValidations,
				validations,
				errors,
				variableName
			)
			if (errors.length) {
				break
			}
		}

		// ! int,positive,negative,natural,whole
		if ('int,positive,negative,natural,whole'.split(',').includes(validation)) {
			checkSpecificNumberType(
				key,
				value,
				validation as SpecificNumberType,
				previousValidations,
				validations,
				errors,
				variableName
			)
			if (errors.length) {
				break
			}
		}

		// ! equal,size,min,max,regex,decimalsize,decimalmin,decimalmax,enums
		if (
			'equal,size,min,max,regex,decimalsize,decimalmin,decimalmax,enums'
				.split(',')
				.some((e) => validation.startsWith(e + ':'))
		) {
			checkConstraint(key, value, validation as ConstraintType, previousValidations, validations, errors, variableName)
			if (errors.length) {
				break
			}
		}

		// ! Nested Array Check
		if (validation.startsWith('arrayof:')) {
			checkSpecificArrayType(
				key,
				value,
				validation as ArrayType,
				previousValidations,
				validations,
				errors,
				optionalArrays,
				nullableArrays,
				variableName
			)
			if (errors.length) {
				break
			}
		}
	}
}

function branchHasModifier(branch: unknown, modifier: 'optional' | 'nullable'): boolean {
	if (typeof branch === 'string') {
		return branch.split('|').includes(modifier)
	}
	if (Array.isArray(branch) && branch.every((e) => typeof e === 'string')) {
		return (branch as string[]).includes(modifier)
	}
	return false
}

function runCustomRule(
	fn: (value: any, parent: any) => any,
	value: any,
	parent: any,
	fieldName: string
): ValidationDetail[] {
	let result
	try {
		result = fn(value, parent)
	} catch (error) {
		if (error instanceof InvalidRuleError) {
			throw error
		}
		const reason = error instanceof Error ? error.message : String(error)
		throw new InvalidRuleError(`'${fieldName}' custom rule threw an error: ${reason}`)
	}

	if (result === undefined || result === null) {
		return []
	}

	if (
		typeof result !== 'object' ||
		Array.isArray(result) ||
		typeof (result as any).message !== 'string' ||
		typeof (result as any).code !== 'string'
	) {
		throw new InvalidRuleError(
			`'${fieldName}' has an invalid custom rule: the function must return undefined, or an object with string 'message' and 'code' properties (received ${JSON.stringify(
				result
			)})`
		)
	}

	return [{ message: (result as any).message, code: (result as any).code as ValidationDetail['code'] }]
}

function validateBranch(
	branch: unknown,
	value: any,
	config: ValidatorConfig,
	fieldName: string,
	parent?: any
): ValidationDetail[] {
	if (typeof branch === 'function') {
		return runCustomRule(branch as (v: any, p: any) => any, value, parent, fieldName)
	}
	const shortKey = fieldName.includes('.') ? fieldName.slice(fieldName.lastIndexOf('.') + 1) : fieldName
	const parentName = fieldName.includes('.') ? fieldName.slice(0, fieldName.lastIndexOf('.')) : undefined
	const wrapper: Rules = { [shortKey]: branch as Rules[string] }
	const branchConfig = hasIndexSyntax(shortKey) ? { ...config, arrayIndexingCheck: false } : config
	return validateInternal(wrapper, { [shortKey]: value } as Data, branchConfig, [], parentName)
}

function branchTypeMatches(branch: unknown, value: any): boolean {
	const isPlainObject = typeof value === 'object' && value !== null && !Array.isArray(value)

	if (typeof branch === 'function') {
		return true
	}

	if (Array.isArray(branch)) {
		if (branch.every((e) => typeof e === 'string')) {
			return true
		}
		return Array.isArray(value)
	}
	if (typeof branch === 'object' && branch !== null) {
		if (isOperatorNode(branch as object)) {
			return true
		}
		return isPlainObject
	}
	if (typeof branch === 'string') {
		const tokens = branch.split('|')
		if (tokens.some((t) => t.startsWith('arrayof:'))) return Array.isArray(value)
		if (tokens.includes('object')) return isPlainObject
		if (tokens.includes('array')) return Array.isArray(value)
		if (tokens.includes('string')) return typeof value === 'string'
		if (tokens.includes('number')) return typeof value === 'number'
		if (tokens.includes('boolean')) return typeof value === 'boolean'
		return !isPlainObject && !Array.isArray(value)
	}
	return false
}

function assertUsableOrBranch(branch: unknown, fieldName: string) {
	const tokens =
		typeof branch === 'string'
			? branch.split('|')
			: Array.isArray(branch) && branch.every((e) => typeof e === 'string')
			? (branch as string[])
			: null
	if (!tokens) {
		return
	}
	const meaningful = tokens.filter((t) => t.length > 0 && t !== 'optional' && t !== 'nullable')
	if (meaningful.length === 0) {
		throw new InvalidRuleError(
			`'${fieldName}' has an invalid rule: a '$or' branch cannot be only 'optional' or 'nullable', because it would accept any value. Use '$and' to make the field optional.`
		)
	}
}

function validateOperatorNode(
	node: Record<string, unknown>,
	value: any,
	config: ValidatorConfig,
	fieldName: string,
	parent?: any
): ValidationDetail[] {
	const { operator, branches } = assertValidOperatorNode(node, fieldName)

	if (operator === '$or') {
		for (const branch of branches) {
			assertUsableOrBranch(branch, fieldName)
		}
	}

	if (value === undefined && branches.some((b) => branchHasModifier(b, 'optional'))) {
		return []
	}
	if (value === null && branches.some((b) => branchHasModifier(b, 'nullable'))) {
		return []
	}

	if (operator === '$switch') {
		let fallback: { then: unknown } | undefined

		for (const raw of branches) {
			const branch = raw as { case: unknown; then: unknown; default?: boolean }
			if (branch.default === true) {
				fallback = branch
			}
			const caseErrors = validateBranch(branch.case, value, config, fieldName, parent)
			if (caseErrors.length === 0) {
				return validateBranch(branch.then, value, config, fieldName, parent)
			}
		}

		if (fallback) {
			return validateBranch(fallback.then, value, config, fieldName, parent)
		}

		return [
			{
				message: `"${fieldName}" does not match any case`,
				code: ErrorCodes.NO_CASE_MATCHED,
			},
		]
	}

	if (operator === '$and') {
		const objectBranches = branches.filter(
			(b) => typeof b === 'object' && b !== null && !Array.isArray(b) && !isOperatorNode(b as object)
		) as Rules[]
		const mergedKeys =
			objectBranches.length > 1 ? Object.assign({}, ...objectBranches) as Rules : undefined

		const all: ValidationDetail[] = []
		let mergedDone = false
		for (const branch of branches) {
			if (branchHasModifier(branch, 'optional') || branchHasModifier(branch, 'nullable')) {
				const only = typeof branch === 'string' ? branch.split('|') : (branch as string[])
				if (only.every((t) => t === 'optional' || t === 'nullable')) {
					continue
				}
			}
			if (mergedKeys && objectBranches.includes(branch as Rules)) {
				if (mergedDone) {
					continue
				}
				mergedDone = true
				all.push(...validateBranch(mergedKeys, value, config, fieldName, parent))
				continue
			}
			all.push(...validateBranch(branch, value, config, fieldName, parent))
		}
		return all
	}

	const attempts = branches.map((branch) => ({
		branch,
		errors: validateBranch(branch, value, config, fieldName, parent),
		typed: branchTypeMatches(branch, value),
	}))

	const passed = attempts.find((a) => a.errors.length === 0)
	if (passed) {
		return []
	}

	const strictOnly = attempts.find(
		(a) => a.errors.length > 0 && a.errors.every((e) => e.code === ErrorCodes.UNEXPECTED_FIELD)
	)
	if (strictOnly) {
		return strictOnly.errors
	}

	const typedAttempts = attempts.filter((a) => a.typed)
	const pool = typedAttempts.length > 0 ? typedAttempts : attempts
	let best = pool[0]
	for (const attempt of pool) {
		if (attempt.errors.length < best.errors.length) {
			best = attempt
		}
	}
	return best.errors.filter((e) => e.code !== ErrorCodes.UNEXPECTED_FIELD)
}

function validateAtleastData(data: Data, value: string[] | string, errors: ValidationDetail[], variableName = '') {
	let validateAtleast = (data: Data, validations: Validation[], errors: ValidationDetail[], variableName = '') => {
		let error = getError(validations)
		let size = getSize(validations)
		let count = 0

		for (let key of validations) {
			let value = !key.includes('.') ? data[key] : getPropByString(data, key)
			if (value !== null && value !== undefined) {
				count++
			}
		}
		if (count >= size) {
			return
		}

		const variables = validations.filter((e) => !e.includes(':')).map((e) => (variableName ? `${variableName}.${e}` : e))
		const variablesString = variables
			.slice(0, -1)
			.map((e) => `"${e}"`)
			.join(', ')
		const sizeString = size === 1 ? 'one' : size
		const andString = variables.length > 1 ? 'and' : ''
		const lastVariable = variables.at(-1)
		const isAre = size === 1 ? 'is' : 'are'
		const message = `at least ${sizeString} of ${variablesString} ${andString} "${lastVariable}" ${isAre} required`
		errors.push({ message: error ?? message, code: ErrorCodes.ATLEAST_NOT_MET })
	}

	let validations: Validation[]
	if (Array.isArray(value)) {
		for (let e of value) {
			validations = e.split('|') as Validation[]
			validateAtleast(data, validations, errors, variableName)
		}
	} else {
		validations = value.split('|') as Validation[]
		validateAtleast(data, validations, errors, variableName)
	}
}

function validateAtmostData(data: Data, value: string[] | string, errors: ValidationDetail[], variableName = '') {
	let validateAtmost = (data: Data, validations: Validation[], errors: ValidationDetail[], variableName = '') => {
		let error = getError(validations)
		let size = getSize(validations)
		let count = 0

		for (let key of validations) {
			let value = !key.includes('.') ? data[key] : getPropByString(data, key)
			if (value !== null && value !== undefined) {
				count++
			}
		}
		if (count <= size) {
			return
		}

		const variables = validations
			.filter((e) => !e.includes(':'))
			.map((e) => (variableName ? `${variableName}.${e}` : e))
		const variablesString = variables
			.slice(0, -1)
			.map((e) => `"${e}"`)
			.join(', ')
		const sizeString = size === 1 ? 'one' : size
		const andString = variables.length > 1 ? 'and' : ''
		const lastVariable = variables.at(-1)
		const message = `at most ${sizeString} of ${variablesString} ${andString} "${lastVariable}" can be given`
		errors.push({ message: error ?? message, code: ErrorCodes.ATMOST_EXCEEDED })
	}

	let validations: Validation[]
	if (Array.isArray(value)) {
		for (let e of value) {
			validations = e.split('|') as Validation[]
			validateAtmost(data, validations, errors, variableName)
		}
	} else {
		validations = value.split('|') as Validation[]
		validateAtmost(data, validations, errors, variableName)
	}
}

function checkDataType(
	key: string,
	value: any,
	dataType: DataType,
	previousValidations: Validation[],
	validations: Validation[],
	errors: ValidationDetail[],
	variableName = ''
) {
	let field = getField(validations, key)
	let error = getError(validations)
	const label = variableName ? `${variableName}.${field ?? key}` : `${field ?? key}`

	if (value === undefined || value === null) {
		errors.push({ message: error ?? `"${label}" is required`, code: ErrorCodes.REQUIRED })
		return
	}

	if (dataType === 'symbol' && typeof value !== 'symbol') {
		errors.push({ message: error ?? `"${label}" must be symbol`, code: ErrorCodes.NOT_SYMBOL })
		return
	}

	const hasString = previousValidations.includes('string') || previousValidations.includes('arrayof:string')

	if (dataType === 'string' && typeof value !== 'string') {
		errors.push({ message: error ?? `"${label}" must be string`, code: ErrorCodes.NOT_STRING })
		return
	}

	if (dataType === 'number' && hasString && Number.isNaN(+value)) {
		errors.push({ message: error ?? `"${label}" must be a valid numeric string`, code: ErrorCodes.NOT_NUMERIC_STRING })
		return
	} else if (dataType === 'number' && !hasString && typeof value !== 'number') {
		errors.push({ message: error ?? `"${label}" must be a valid number`, code: ErrorCodes.NOT_NUMBER })
		return
	}

	if (dataType === 'bigint' && typeof value !== 'bigint') {
		errors.push({ message: error ?? `"${label}" must be bigint`, code: ErrorCodes.NOT_BIGINT })
		return
	}

	if (dataType === 'boolean' && hasString && !['true', 'false'].includes(value)) {
		errors.push({ message: error ?? `"${label}" must be a valid boolean string`, code: ErrorCodes.NOT_BOOLEAN_STRING })
		return
	} else if (dataType === 'boolean' && !hasString && typeof value !== 'boolean') {
		errors.push({ message: error ?? `"${label}" must be a valid boolean`, code: ErrorCodes.NOT_BOOLEAN })
		return
	}

	if (dataType === 'array' && !Array.isArray(value)) {
		errors.push({ message: error ?? `"${label}" must be an array`, code: ErrorCodes.NOT_ARRAY })
		return
	}

	if (dataType === 'object' && (Array.isArray(value) || typeof value !== 'object')) {
		errors.push({ message: error ?? `"${label}" must be an object`, code: ErrorCodes.NOT_OBJECT })
		return
	}
}

function checkSpecificStringType(
	key: string,
	value: any,
	specificType: SpecificStringType,
	previousValidations: Validation[],
	validations: Validation[],
	errors: ValidationDetail[],
	variableName = ''
) {
	let field = getField(validations, key)
	let error = getError(validations)
	const label = variableName ? `${variableName}.${field ?? key}` : `${field ?? key}`

	if (value === undefined || value === null) {
		errors.push({ message: error ?? `"${label}" is required`, code: ErrorCodes.REQUIRED })
		return
	}

	checkDataType(key, value, 'string', previousValidations, validations, errors, variableName)
	if (errors.length) {
		return
	}

	if (
		specificType === 'email' &&
		!/^[A-Z0-9_'%=+!`#~$*?^{}&|-]+([\.][A-Z0-9_'%=+!`#~$*?^{}&|-]+)*@[A-Z0-9-]+(\.[A-Z0-9-]+)+$/i.test(value)
	) {
		errors.push({ message: error ?? `"${label}" must be a valid email`, code: ErrorCodes.NOT_EMAIL })
		return
	}

	if (
		specificType === 'url' &&
		!/^(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})$/.test(
			value
		)
	) {
		errors.push({ message: error ?? `"${label}" must be a valid url`, code: ErrorCodes.NOT_URL })
		return
	}

	if (
		specificType === 'domain' &&
		!/^[a-zA-Z0-9][a-zA-Z0-9-_]{0,61}[a-zA-Z0-9]{0,1}\.([a-zA-Z]{1,6}|[a-zA-Z0-9-]{1,30}\.[a-zA-Z]{2,3})$/.test(value)
	) {
		errors.push({ message: error ?? `"${label}" must be a valid domain`, code: ErrorCodes.NOT_DOMAIN })
		return
	}

	if (specificType === 'name' && !/^\p{L}[\p{L}\p{M}]*\.?(?:[ '’\-]\p{L}[\p{L}\p{M}]*\.?)*$/u.test(value)) {
		errors.push({ message: error ?? `"${label}" must be a valid name`, code: ErrorCodes.NOT_NAME })
		return
	}

	if (
		specificType === 'fullname' &&
		!/^\p{L}[\p{L}\p{M}]*\.?(?:['’\-]\p{L}[\p{L}\p{M}]*\.?)*(?: \p{L}[\p{L}\p{M}]*\.?(?:['’\-]\p{L}[\p{L}\p{M}]*\.?)*)+$/u.test(
			value
		)
	) {
		errors.push({ message: error ?? `"${label}" must be a valid fullname`, code: ErrorCodes.NOT_FULLNAME })
		return
	}

	if (specificType === 'username' && !/^[^\W_](?!.*?[._]{2})[\w.]{6,18}[^\W_]$/.test(value)) {
		errors.push({ message: error ?? `"${label}" must be a valid username`, code: ErrorCodes.NOT_USERNAME })
		return
	}

	if (specificType === 'alpha' && !/^[A-Za-z]{1,}$/.test(value)) {
		errors.push({ message: error ?? `"${label}" must be a valid alpha`, code: ErrorCodes.NOT_ALPHA })
		return
	}

	if (specificType === 'alphanumeric' && !/^[A-Za-z0-9]{1,}$/.test(value)) {
		errors.push({ message: error ?? `"${label}" must be a valid alphanumeric`, code: ErrorCodes.NOT_ALPHANUMERIC })
		return
	}

	if (specificType === 'phone' && !/^(?:\+\d{1,3}\s?)?(?:\(\d+\))?(?:\d+\s?)+(?:\d{1,4})$/.test(value)) {
		errors.push({ message: error ?? `"${label}" must be a valid phone`, code: ErrorCodes.NOT_PHONE })
		return
	}

	if (specificType === 'phonecode' && !/^\+\d{1,3}$/.test(value)) {
		errors.push({ message: error ?? `"${label}" must be a valid phone code`, code: ErrorCodes.NOT_PHONECODE })
		return
	}

	if (
		specificType === 'uuid' &&
		!/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(value)
	) {
		errors.push({ message: error ?? `"${label}" must be a valid uuid`, code: ErrorCodes.NOT_UUID })
		return
	}

	if (specificType === 'mongoid' || specificType === 'objectid') {
		if (specificType === 'mongoid') {
			warnDeprecatedMongoid()
		}
		if (!/^[0-9a-fA-F]{24}$/.test(value)) {
			errors.push({ message: error ?? `"${label}" must be a valid object id`, code: ErrorCodes.NOT_OBJECTID })
			return
		}
	}

	if (
		specificType === 'date' &&
		!/^(\d{4})(?:-?(0[1-9]|1[0-2])(?:-?([12]\d|0[1-9]|3[01]))?|(?:-?([12]\d|0[1-9]|3[01]))?-(0[1-9]|1[0-2]))(?:[T ](\d{2}):([0-5]\d):([0-5]\d)(?:\.(\d{1,4}))?)?(?:Z|([+-])([01]\d|2[0-3])(?::?([0-5]\d))?)?$/.test(
			value
		)
	) {
		errors.push({ message: error ?? `"${label}" must be a valid date`, code: ErrorCodes.NOT_DATE })
		return
	}

	if (specificType === 'dateonly' && !/^(\d{4})-(0[1-9]|1[0-2])-([12]\d|0[1-9]|3[01])$/.test(value)) {
		errors.push({ message: error ?? `"${label}" must be a valid date`, code: ErrorCodes.NOT_DATEONLY })
		return
	}

	if (specificType === 'time' && !/^(?:[01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?(?:\.\d{1,4})?$/.test(value)) {
		errors.push({ message: error ?? `"${label}" must be a valid time`, code: ErrorCodes.NOT_TIME })
		return
	}

	if (specificType === 'lower' && !/^[^A-Z]+$/.test(value)) {
		errors.push({ message: error ?? `"${label}" must not contains upper case letters`, code: ErrorCodes.NOT_LOWERCASE })
		return
	}

	if (specificType === 'upper' && !/^[^a-z]+$/.test(value)) {
		errors.push({ message: error ?? `"${label}" must not contains lower case letters`, code: ErrorCodes.NOT_UPPERCASE })
		return
	}

	if (
		specificType === 'ip' &&
		!/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(value)
	) {
		errors.push({ message: error ?? `"${label}" must be a valid IP address`, code: ErrorCodes.NOT_IP })
		return
	}
}

function checkSpecificNumberType(
	key: string,
	value: any,
	specificType: SpecificNumberType,
	previousValidations: Validation[],
	validations: Validation[],
	errors: ValidationDetail[],
	variableName = ''
) {
	let field = getField(validations, key)
	let error = getError(validations)
	const label = variableName ? `${variableName}.${field ?? key}` : `${field ?? key}`

	if (value === undefined || value === null) {
		errors.push({ message: error ?? `"${label}" is required`, code: ErrorCodes.REQUIRED })
		return
	}

	checkDataType(key, value, 'number', previousValidations, validations, errors, variableName)
	if (errors.length) {
		return
	}

	const hasString = previousValidations.includes('string') || previousValidations.includes('arrayof:string')

	if (specificType === 'int' && hasString && `${+value}`.includes('.')) {
		errors.push({ message: error ?? `"${label}" must be a valid integer string`, code: ErrorCodes.NOT_INTEGER })
		return
	} else if (specificType === 'int' && !hasString && `${value}`.includes('.')) {
		errors.push({ message: error ?? `"${label}" must be a valid integer`, code: ErrorCodes.NOT_INTEGER })
		return
	}

	if (specificType === 'positive' && hasString && +value <= 0) {
		errors.push({ message: error ?? `"${label}" must be a valid positive numeric string`, code: ErrorCodes.NOT_POSITIVE })
		return
	} else if (specificType === 'positive' && !hasString && value <= 0) {
		errors.push({ message: error ?? `"${label}" must be a valid positive number`, code: ErrorCodes.NOT_POSITIVE })
		return
	}

	if (specificType === 'negative' && hasString && +value >= 0) {
		errors.push({ message: error ?? `"${label}" must be a valid negative numeric string`, code: ErrorCodes.NOT_NEGATIVE })
		return
	} else if (specificType === 'negative' && !hasString && value >= 0) {
		errors.push({ message: error ?? `"${label}" must be a valid negative number`, code: ErrorCodes.NOT_NEGATIVE })
		return
	}

	if (specificType === 'natural' && hasString && (`${+value}`.includes('.') || +value <= 0)) {
		errors.push({ message: error ?? `"${label}" must be a valid natural numeric string`, code: ErrorCodes.NOT_NATURAL })
		return
	} else if (specificType === 'natural' && !hasString && (`${value}`.includes('.') || value <= 0)) {
		errors.push({ message: error ?? `"${label}" must be a valid natural number`, code: ErrorCodes.NOT_NATURAL })
		return
	}

	if (specificType === 'whole' && hasString && (`${+value}`.includes('.') || +value < 0)) {
		errors.push({ message: error ?? `"${label}" must be a valid whole numeric string`, code: ErrorCodes.NOT_WHOLE })
		return
	} else if (specificType === 'whole' && !hasString && (`${value}`.includes('.') || value < 0)) {
		errors.push({ message: error ?? `"${label}" must be a valid whole number`, code: ErrorCodes.NOT_WHOLE })
		return
	}
}

function checkConstraint(
	key: string,
	value: any,
	type: ConstraintType,
	previousValidations: Validation[],
	validations: Validation[],
	errors: ValidationDetail[],
	variableName = ''
) {
	let field = getField(validations, key)
	let error = getError(validations)
	const label = variableName ? `${variableName}.${field ?? key}` : `${field ?? key}`

	if (value === undefined || value === null) {
		errors.push({ message: error ?? `"${label}" is required`, code: ErrorCodes.REQUIRED })
		return
	}

	const isNumeric = previousValidations.some((e) =>
		['number', 'positive', 'negative', 'int', 'whole', 'natural'].includes(e)
	)
	const isString = typeof value === 'string'
	const isNumber = typeof value === 'number'

	// ! equal:
	if (type.startsWith('equal:')) {
		let data = type.substring(6)

		if (isString && data !== value) {
			errors.push({ message: error ?? `"${label}" must be equal to ${data}`, code: ErrorCodes.NOT_EQUAL })
			return
		}

		if (isNumber && +data !== value) {
			errors.push({ message: error ?? `"${label}" must be equal to ${data}`, code: ErrorCodes.NOT_EQUAL })
			return
		}

		if (typeof value === 'boolean') {
			if ((data === 'true' && value === false) || (data === 'false' && value === true))
				errors.push({ message: error ?? `"${label}" must be equal to ${data}`, code: ErrorCodes.NOT_EQUAL })
			return
		}
	}

	// ! size:
	if (type.startsWith('size:')) {
		let size = +type.substring(5)

		if (isString && !isNumeric && value.length !== size) {
			errors.push({ message: error ?? `"${label}" must have length ${size}`, code: ErrorCodes.LENGTH_MISMATCH })
			return
		}

		if (Array.isArray(value) && value.length !== size) {
			errors.push({ message: error ?? `"${label}" must have length ${size}`, code: ErrorCodes.LENGTH_MISMATCH })
			return
		}

		if ((isString && isNumeric) || isNumber) {
			let valueString = `${+value}`
			let valueLength = valueString.length
			valueLength -= valueString
				.split('')
				.filter((e) => ['e', '-', '+', '.'].includes(e))
				.join('').length
			if (valueLength !== size) {
				errors.push({ message: error ?? `"${label}" must have ${size} digits`, code: ErrorCodes.DIGITS_MISMATCH })
				return
			}
		}
	}

	// ! min:
	if (type.startsWith('min:')) {
		let min: number | Date = +type.substring(4)
		if (Number.isNaN(min)) {
			min = new Date(Date.parse(type.substring(4)))
		}

		if (min instanceof Date) {
			let date = new Date(Date.parse(value))
			if (date < min) {
				errors.push({ message: error ?? `"${label}" must be at least ${min.toISOString()}`, code: ErrorCodes.DATE_TOO_EARLY })
				return
			}
		} else {
			if (isString && !isNumeric && value.length < min) {
				errors.push({ message: error ?? `"${label}" must have length of at least ${min}`, code: ErrorCodes.TOO_SHORT })
				return
			}

			if (Array.isArray(value) && value.length < min) {
				errors.push({ message: error ?? `"${label}" must have length of at least ${min}`, code: ErrorCodes.TOO_SHORT })
				return
			}

			if (((isString && isNumeric) || isNumber) && +value < min) {
				errors.push({ message: error ?? `"${label}" must be at least ${min}`, code: ErrorCodes.TOO_SMALL })
				return
			}
		}
	}

	// ! max:
	if (type.startsWith('max:')) {
		let max: number | Date = +type.substring(4)
		if (Number.isNaN(max)) {
			max = new Date(Date.parse(type.substring(4)))
		}

		if (max instanceof Date) {
			let date = new Date(Date.parse(value))
			if (date > max) {
				errors.push({ message: error ?? `"${label}" must be at most ${max.toISOString()}`, code: ErrorCodes.DATE_TOO_LATE })
				return
			}
		} else {
			if (isString && !isNumeric && value.length > max) {
				errors.push({ message: error ?? `"${label}" must have length of at most ${max}`, code: ErrorCodes.TOO_LONG })
				return
			}

			if (Array.isArray(value) && value.length > max) {
				errors.push({ message: error ?? `"${label}" must have length of at most ${max}`, code: ErrorCodes.TOO_LONG })
				return
			}

			if (((isString && isNumeric) || isNumber) && +value > max) {
				errors.push({ message: error ?? `"${label}" must be at most ${max}`, code: ErrorCodes.TOO_LARGE })
				return
			}
		}
	}

	// ! regex
	if (type.startsWith('regex:')) {
		let str: string = type.substring(6)
		let index = str.lastIndexOf('/')
		let main = str.substring(1, index)
		let flags = str.substring(index + 1)
		let regex = new RegExp(main, flags)

		if (typeof value !== 'string') {
			errors.push({ message: error ?? `"${label}" must be of type string`, code: ErrorCodes.NOT_STRING })
			return
		}

		if (!regex.test(value)) {
			errors.push({ message: error ?? `"${label}" is invalid`, code: ErrorCodes.REGEX_MISMATCH })
			return
		}
	}

	// ! decimalsize
	if (type.startsWith('decimalsize:')) {
		let size: number = +type.substring(12)

		if (typeof value === 'string') {
			let n = +value
			if (Number.isNaN(n)) {
				errors.push({ message: error ?? `"${label}" must be a valid numeric string`, code: ErrorCodes.NOT_NUMERIC_STRING })
				return
			}
			if (!value.includes('.') && size > 0) {
				errors.push({ message: error ?? `"${label}" must have ${size} decimal places`, code: ErrorCodes.DECIMAL_SIZE_MISMATCH })
				return
			}
			let index = value.lastIndexOf('.')
			let digits = value.substring(index + 1)

			if (!value.includes('.') && size === 0) {
				return
			}

			if (digits.length !== size) {
				errors.push({ message: error ?? `"${label}" must have ${size} decimal places`, code: ErrorCodes.DECIMAL_SIZE_MISMATCH })
				return
			}
		}

		if (typeof value === 'number') {
			if (Number.isNaN(value)) {
				errors.push({ message: error ?? `"${label}" must be a value number`, code: ErrorCodes.NOT_A_NUMBER })
				return
			}
			let str = `${value}`
			if (!str.includes('.') && size > 0) {
				errors.push({ message: error ?? `"${label}" must have ${size} decimal places`, code: ErrorCodes.DECIMAL_SIZE_MISMATCH })
				return
			}
			if (!str.includes('.') && size === 0) {
				return
			}

			let index = str.lastIndexOf('.')
			let digits = str.substring(index + 1)
			if (digits.length !== size) {
				errors.push({ message: error ?? `"${label}" must have ${size} decimal places`, code: ErrorCodes.DECIMAL_SIZE_MISMATCH })
				return
			}
		}
	}

	// ! decimalmin
	if (type.startsWith('decimalmin:')) {
		let min: number = +type.substring(11)

		if (typeof value === 'string') {
			let n = +value
			if (Number.isNaN(n)) {
				errors.push({ message: error ?? `"${label}" must be a valid numeric string`, code: ErrorCodes.NOT_NUMERIC_STRING })
				return
			}
			if (!value.includes('.') && min > 0) {
				errors.push({ message: error ?? `"${label}" must have at least ${min} decimal places`, code: ErrorCodes.DECIMAL_TOO_FEW })
				return
			}
			let index = value.lastIndexOf('.')
			let digits = value.substring(index + 1)

			if (!value.includes('.') && min === 0) {
				return
			}

			if (digits.length < min) {
				errors.push({ message: error ?? `"${label}" must have at least ${min} decimal places`, code: ErrorCodes.DECIMAL_TOO_FEW })
				return
			}
		}

		if (typeof value === 'number') {
			if (Number.isNaN(value)) {
				errors.push({ message: error ?? `"${label}" must be a value number`, code: ErrorCodes.NOT_A_NUMBER })
				return
			}
			let str = `${value}`
			if (!str.includes('.') && min > 0) {
				errors.push({ message: error ?? `"${label}" must have at least ${min} decimal places`, code: ErrorCodes.DECIMAL_TOO_FEW })
				return
			}
			if (!str.includes('.') && min === 0) {
				return
			}

			let index = str.lastIndexOf('.')
			let digits = str.substring(index + 1)

			if (digits.length < min) {
				errors.push({ message: error ?? `"${label}" must have at least ${min} decimal places`, code: ErrorCodes.DECIMAL_TOO_FEW })
				return
			}
		}
	}

	// ! decimalmax
	if (type.startsWith('decimalmax:')) {
		let max: number = +type.substring(11)

		if (typeof value === 'string') {
			let n = +value
			if (Number.isNaN(n)) {
				errors.push({ message: error ?? `"${label}" must be a valid numeric string`, code: ErrorCodes.NOT_NUMERIC_STRING })
				return
			}

			if (!value.includes('.')) {
				return
			}

			let index = value.lastIndexOf('.')
			let digits = value.substring(index + 1)

			if (digits.length > max) {
				errors.push({ message: error ?? `"${label}" must have at most ${max} decimal places`, code: ErrorCodes.DECIMAL_TOO_MANY })
				return
			}
		}

		if (typeof value === 'number') {
			if (Number.isNaN(value)) {
				errors.push({ message: error ?? `"${label}" must be a value number`, code: ErrorCodes.NOT_A_NUMBER })
				return
			}
			let str = `${value}`

			if (!str.includes('.')) {
				return
			}

			let index = str.lastIndexOf('.')
			let digits = str.substring(index + 1)
			if (digits.length > max) {
				errors.push({ message: error ?? `"${label}" must have at most ${max} decimal places`, code: ErrorCodes.DECIMAL_TOO_MANY })
				return
			}
		}
	}

	// ! enums
	if (type.startsWith('enums:')) {
		let array: any[] = type.substring(6).split(',')

		if (isString && !isNumeric) {
			if (!array.includes(value)) {
				errors.push({ message: error ?? `"${label}" is invalid`, code: ErrorCodes.ENUM_MISMATCH })
				return
			}
		}

		if (isNumber || isNumeric) {
			if (
				!array
					.filter((e) => !Number.isNaN(+e))
					.map((e) => +e)
					.includes(+value)
			) {
				errors.push({ message: error ?? `"${label}" is invalid`, code: ErrorCodes.ENUM_MISMATCH })
				return
			}
		}

		if (typeof value === 'boolean') {
			if (
				!array
					.filter((e) => e === 'true' || e === 'false')
					.map((e) => e === 'true')
					.includes(value)
			) {
				errors.push({ message: error ?? `"${label}" is invalid`, code: ErrorCodes.ENUM_MISMATCH })
				return
			}
		}
	}
}

function checkSpecificArrayType(
	key: string,
	value: any,
	type: ArrayType,
	previousValidations: Validation[],
	validations: Validation[],
	errors: ValidationDetail[],
	optionalArrays: any[][],
	nullableArrays: any[][],
	variableName = ''
) {
	let field = getField(validations, key)
	let error = getError(validations)
	const label = variableName ? `${variableName}.${field ?? key}` : `${field ?? key}`

	let validation = type.substring(8) as Validation

	if (!Array.isArray(value)) {
		errors.push({ message: error ?? `"${label}" must be an array`, code: ErrorCodes.NOT_ARRAY })
		return
	}

	let array = value as any[]

	if (validation === 'optional') {
		optionalArrays.push(array)
	}

	if (validation === 'nullable') {
		nullableArrays.push(array)
	}

	let isOptional = optionalArrays.includes(array)
	let isNullable = nullableArrays.includes(array)

	for (let index = 0; index <= array.length - 1; index++) {
		let element = array[index]
		let newErrors = [] as ValidationDetail[]
		let elementKey = `${label}[${index}]`

		if ((isOptional && element === undefined) || (isNullable && element === null)) {
			continue
		}

		// ! string,number,boolean,array,object,bigint,symbol
		if ('string,number,boolean,array,object,bigint,symbol'.split(',').includes(validation)) {
			checkDataType(
				elementKey,
				element,
				validation as DataType,
				previousValidations,
				validations,
				newErrors,
				''
			)
		}

		// ! email,url,domain,name,fullname,username,alpha,alphanumeric,phone,phonecode,uuid,mongoid,date,dateonly,time,lower,upper,ip
		if (
			'email,url,domain,name,fullname,username,alpha,alphanumeric,phone,phonecode,uuid,mongoid,objectid,date,dateonly,time,lower,upper,ip'
				.split(',')
				.includes(validation)
		) {
			checkDataType(elementKey, element, 'string', previousValidations, validations, newErrors, '')
			if (newErrors.length) {
				errors.push(...newErrors)
				continue
			}
			checkSpecificStringType(
				elementKey,
				element,
				validation as SpecificStringType,
				previousValidations,
				validations,
				newErrors,
				''
			)
		}

		// ! int,positive,negative,natural,whole
		if ('int,positive,negative,natural,whole'.split(',').includes(validation)) {
			checkDataType(elementKey, element, 'number', previousValidations, validations, newErrors, '')
			if (newErrors.length) {
				errors.push(...newErrors)
				continue
			}
			checkSpecificNumberType(
				elementKey,
				element,
				validation as SpecificNumberType,
				previousValidations,
				validations,
				newErrors,
				''
			)
		}

		// ! equal,size,min,max,regex,decimalsize,decimalmin,decimalmax,enums
		if (
			'equal,size,min,max,regex,decimalsize,decimalmin,decimalmax,enums'
				.split(',')
				.some((e) => validation.startsWith(`${e}:`))
		) {
			checkConstraint(
				elementKey,
				element,
				validation as ConstraintType,
				previousValidations,
				validations,
				newErrors,
				''
			)
		}

		// ! Nested Array Check
		if (validation.startsWith('arrayof:')) {
			checkSpecificArrayType(
				elementKey,
				element,
				validation as ArrayType,
				previousValidations,
				validations,
				newErrors,
				optionalArrays,
				nullableArrays,
				''
			)
		}

		errors.push(...newErrors)
	}
}

function validateStrictCheck(rules: Rules, data: Data, errors: ValidationDetail[], variableName = '') {
	let ruleKeys = Object.keys(rules)
	let dataKeys = Object.keys(data)
	let dataTopLevelKeys = dataKeys.filter((e) => !e.includes('.'))
	let keys = ruleKeys
		.filter((e) => !e.includes('.') && !['$atleast', '$atmost'].includes(e))
		.map((e) => {
			const bracket = e.indexOf('[')
			return bracket > 0 ? e.slice(0, bracket) : e
		})
	for (let e of dataTopLevelKeys) {
		if (!keys.includes(e)) {
			const label = variableName ? `${variableName}.${e}` : e
			errors.push({ message: `"${label}" is not required`, code: ErrorCodes.UNEXPECTED_FIELD })
		}
	}
}

const Validator = { validate, ErrorCodes }

export { validate, ErrorCodes }
export type { ErrorCode, ValidationDetail } from './codes'
export default Validator
export type {
	Rules,
	Data,
	ValidatorConfig,
	ValidatorResult,
	Validation,
	DataType,
	SpecificStringType,
	SpecificNumberType,
	ConstraintType,
	ArrayType,
	RuleBranch,
	OperatorNode,
	SwitchBranch,
	CustomRule,
	CustomRuleResult,
} from './types'

module.exports = Validator
module.exports.validate = validate
module.exports.default = Validator
