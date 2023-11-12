import { quotes } from './config'
import { getError, getField, getPropByString, getSize } from './helpers'
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

function validate(rules: Rules, data: Data, config: ValidatorConfig = defaultValidatorConfig) {
	try {
		let allErrors: string[] | undefined = validateInternal(rules, data, config)

		const quote = quotes[config.quotes ?? 'none']
		allErrors = allErrors.map((e) => e.replace(/"/g, quote))
		allErrors = [...new Set(allErrors)]

		if (allErrors.length === 0) {
			allErrors = undefined
		}

		return { errors: allErrors }
	} catch (error) {
		console.log(error)
		return { errors: ['error occurred while data validation'] }
	}
}

function validateInternal(
	rules: Rules,
	data: Data | Data[],
	config: ValidatorConfig = defaultValidatorConfig,
	allErrors: string[] | undefined = [],
	variableName?: string,
) {
	try {
		if (!data) {
			allErrors.push(`"${variableName ?? '"data"'}" is required`)
			return allErrors
		}
		if (typeof data !== 'object' && !Array.isArray(data)) {
			allErrors.push(`"${variableName ?? '"data"'}" must be of type object/array`)
			return allErrors
		}
		for (let [key, value] of Object.entries(rules)) {
			let errors = [] as string[]
			let validations: Validation[] = []
			const label = variableName ? `"${variableName}.${key}"` : `"${key}"`;
			if (typeof value === 'string') {
				validations = (value as string).split('|') as Validation[]
			} else if (Array.isArray(value) && typeof value[0] === 'string') {
				validations = value as string[] as Validation[]
			} else if (typeof value === 'object' && !Array.isArray(value)) {
				const _internalData = (data as Data)[key]
				if (!allErrors) {
					allErrors = []
				}
				if(typeof _internalData !== 'object' || Array.isArray(_internalData)) {
					allErrors.push(`${label} must be of type object`)
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
				if(!_internalData) {
					allErrors.push(`${label} is required`)
					continue
				}
				if(!Array.isArray(_internalData)) {
					allErrors.push(`${label} must be of type array`)
					continue
				}
				for(let i = 0; i < (_internalData as Data[]).length; i++) {
					const _data = _internalData[i] as Data;
					let errorsList = validateInternal(
						(value as [Rules])[0],
						_data,
						config,
						errors,
						variableName ? `${variableName}.${key}[${i}]` : `${key}[${i}]`
					)
					allErrors.push(...errorsList)
				}
				continue
			}

			data = data as Data;
			let dataToSend = !key.includes('.') ? data[key] : getPropByString(data, key)

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
		console.log(error)
		return ['error occurred while data validation']
	}
}

function validateSingleData(key: string, value: any, validations: Validation[], errors: string[], variableName = '') {
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
		if ('string,number,boolean,object,array,bigint'.split(',').includes(validation)) {
			checkDataType(key, value, validation as DataType, previousValidations, validations, errors, variableName)
			if (errors.length) {
				break
			}
		}

		// ! email,url,domain,name,fullname,username,alpha,alphanumeric,phone,uuid,mongoid,date,dateonly,time,lower,upper,ip
		if (
			'email,url,domain,name,fullname,username,alpha,alphanumeric,phone,uuid,mongoid,date,dateonly,time,lower,upper,ip'
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

function validateAtleastData(data: Data, value: string[] | string, errors: string[], variableName = '') {
	let validateAtleast = (data: Data, validations: Validation[], errors: string[], variableName = '') => {
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
		errors.push(error ?? message)
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

function validateAtmostData(data: Data, value: string[] | string, errors: string[], variableName = '') {
	let validateAtmost = (data: Data, validations: Validation[], errors: string[], variableName = '') => {
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
		errors.push(error ?? message)
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
	errors: string[],
	variableName = ''
) {
	let field = getField(validations, key)
	let error = getError(validations)
	const label = variableName ? `${variableName}.${field ?? key}` : `${field ?? key}`

	if (value === undefined || value === null) {
		errors.push(error ?? `"${label}" is required`)
		return
	}

	if (dataType === 'symbol' && typeof value !== 'symbol') {
		errors.push(error ?? `"${label}" must be symbol`)
		return
	}

	const hasString = previousValidations.includes('string') || previousValidations.includes('arrayof:string')

	if (dataType === 'string' && typeof value !== 'string') {
		errors.push(error ?? `"${label}" must be string`)
		return
	}

	if (dataType === 'number' && hasString && Number.isNaN(+value)) {
		errors.push(error ?? `"${label}" must be a valid numeric string`)
		return
	} else if (dataType === 'number' && !hasString && typeof value !== 'number') {
		errors.push(error ?? `"${label}" must be a valid number`)
		return
	}

	if (dataType === 'bigint' && typeof value !== 'bigint') {
		errors.push(error ?? `"${label}" must be bigint`)
		return
	}

	if (dataType === 'boolean' && hasString && !['true', 'false'].includes(value)) {
		errors.push(error ?? `"${label}" must be a valid boolean string`)
		return
	} else if (dataType === 'boolean' && !hasString && typeof value !== 'boolean') {
		errors.push(error ?? `"${label}" must be a valid boolean`)
		return
	}

	if (dataType === 'array' && !Array.isArray(value)) {
		errors.push(error ?? `"${label}" must be an array`)
		return
	}

	if (dataType === 'object' && (Array.isArray(value) || typeof value !== 'object')) {
		errors.push(error ?? `"${label}" must be an object`)
		return
	}
}

function checkSpecificStringType(
	key: string,
	value: any,
	specificType: SpecificStringType,
	previousValidations: Validation[],
	validations: Validation[],
	errors: string[],
	variableName = ''
) {
	let field = getField(validations, key)
	let error = getError(validations)
	const label = variableName ? `${variableName}.${field ?? key}` : `${field ?? key}`

	if (value === undefined || value === null) {
		errors.push(error ?? `"${label}" is required`)
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
		errors.push(error ?? `"${label}" must be a valid email`)
		return
	}

	if (
		specificType === 'url' &&
		!/^(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})$/.test(
			value
		)
	) {
		errors.push(error ?? `"${label}" must be a valid url`)
		return
	}

	if (
		specificType === 'domain' &&
		!/^[a-zA-Z0-9][a-zA-Z0-9-_]{0,61}[a-zA-Z0-9]{0,1}\.([a-zA-Z]{1,6}|[a-zA-Z0-9-]{1,30}\.[a-zA-Z]{2,3})$/.test(value)
	) {
		errors.push(error ?? `"${label}" must be a valid domain`)
		return
	}

	if (specificType === 'name' && !/^([a-zA-Z]+[,.]?[ ]?|[a-zA-Z]+['-]?)+$/.test(value)) {
		errors.push(error ?? `"${label}" must be a valid name`)
		return
	}

	if (specificType === 'fullname' && !/^([a-zA-Z]{2,}\s[a-zA-Z]{1,}'?-?[a-zA-Z]{2,}\s?([a-zA-Z]{1,})?)$/.test(value)) {
		errors.push(error ?? `"${label}" must be a valid fullname`)
		return
	}

	if (specificType === 'username' && !/^[^\W_](?!.*?[._]{2})[\w.]{6,18}[^\W_]$/.test(value)) {
		errors.push(error ?? `"${label}" must be a valid username`)
		return
	}

	if (specificType === 'alpha' && !/^[A-Za-z]{1,}$/.test(value)) {
		errors.push(error ?? `"${label}" must be a valid alpha`)
		return
	}

	if (specificType === 'alphanumeric' && !/^[A-Za-z0-9]{1,}$/.test(value)) {
		errors.push(error ?? `"${label}" must be a valid alphanumeric`)
		return
	}

	if (specificType === 'phone' && !/^(?:\+\d{1,3}\s?)?(?:\(\d+\))?(?:\d+\s?)+(?:\d{1,4})$/.test(value)) {
		errors.push(error ?? `"${label}" must be a valid phone`)
		return
	}

	if (
		specificType === 'uuid' &&
		!/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(value)
	) {
		errors.push(error ?? `"${label}" must be a valid uuid`)
		return
	}

	if (specificType === 'mongoid' && !/^[0-9a-fA-F]{24}$/.test(value)) {
		errors.push(error ?? `"${label}" must be a valid mongodb id`)
		return
	}

	if (
		specificType === 'date' &&
		!/^(\d{4})(?:-?(0[1-9]|1[0-2])(?:-?([12]\d|0[1-9]|3[01]))?|(?:-?([12]\d|0[1-9]|3[01]))?-(0[1-9]|1[0-2]))(?:[T ](\d{2}):([0-5]\d):([0-5]\d)(?:\.(\d{1,4}))?)?(?:Z|([+-])([01]\d|2[0-3])(?::?([0-5]\d))?)?$/.test(
			value
		)
	) {
		errors.push(error ?? `"${label}" must be a valid date`)
		return
	}

	if (specificType === 'dateonly' && !/^(\d{4})-(0[1-9]|1[0-2])-([12]\d|0[1-9]|3[01])$/.test(value)) {
		errors.push(error ?? `"${label}" must be a valid date`)
		return
	}

	if (specificType === 'time' && !/^(?:[01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?(?:\.\d{1,4})?$/.test(value)) {
		errors.push(error ?? `"${label}" must be a valid time`)
		return
	}

	if (specificType === 'lower' && !/^[^A-Z]+$/.test(value)) {
		errors.push(error ?? `"${label}" must not contains upper case letters`)
		return
	}

	if (specificType === 'upper' && !/^[^a-z]+$/.test(value)) {
		errors.push(error ?? `"${label}" must not contains lower case letters`)
		return
	}

	if (
		specificType === 'ip' &&
		!/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(value)
	) {
		errors.push(error ?? `"${label}" must be a valid IP address`)
		return
	}
}

function checkSpecificNumberType(
	key: string,
	value: any,
	specificType: SpecificNumberType,
	previousValidations: Validation[],
	validations: Validation[],
	errors: string[],
	variableName = ''
) {
	let field = getField(validations, key)
	let error = getError(validations)
	const label = variableName ? `${variableName}.${field ?? key}` : `${field ?? key}`

	if (value === undefined || value === null) {
		errors.push(error ?? `"${label}" is required`)
		return
	}

	checkDataType(key, value, 'number', previousValidations, validations, errors, variableName)
	if (errors.length) {
		return
	}

	const hasString = previousValidations.includes('string') || previousValidations.includes('arrayof:string')

	if (specificType === 'int' && hasString && `${+value}`.includes('.')) {
		errors.push(error ?? `"${label}" must be a valid integer string`)
		return
	} else if (specificType === 'int' && !hasString && `${value}`.includes('.')) {
		errors.push(error ?? `"${label}" must be a valid integer`)
		return
	}

	if (specificType === 'positive' && hasString && +value <= 0) {
		errors.push(error ?? `"${label}" must be a valid positive numeric string`)
		return
	} else if (specificType === 'positive' && !hasString && value <= 0) {
		errors.push(error ?? `"${label}" must be a valid positive number`)
		return
	}

	if (specificType === 'negative' && hasString && +value >= 0) {
		errors.push(error ?? `"${label}" must be a valid negative numeric string`)
		return
	} else if (specificType === 'negative' && !hasString && value >= 0) {
		errors.push(error ?? `"${label}" must be a valid negative number`)
		return
	}

	if (specificType === 'natural' && hasString && (`${+value}`.includes('.') || +value <= 0)) {
		errors.push(error ?? `"${label}" must be a valid natural numeric string`)
		return
	} else if (specificType === 'natural' && !hasString && (`${value}`.includes('.') || value <= 0)) {
		errors.push(error ?? `"${label}" must be a valid natural number`)
		return
	}

	if (specificType === 'whole' && hasString && (`${+value}`.includes('.') || +value < 0)) {
		errors.push(error ?? `"${label}" must be a valid whole numeric string`)
		return
	} else if (specificType === 'whole' && !hasString && (`${value}`.includes('.') || value < 0)) {
		errors.push(error ?? `"${label}" must be a valid whole number`)
		return
	}
}

function checkConstraint(
	key: string,
	value: any,
	type: ConstraintType,
	previousValidations: Validation[],
	validations: Validation[],
	errors: string[],
	variableName = ''
) {
	let field = getField(validations, key)
	let error = getError(validations)
	const label = variableName ? `${variableName}.${field ?? key}` : `${field ?? key}`

	if (value === undefined || value === null) {
		errors.push(error ?? `"${label}" is required`)
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
			errors.push(error ?? `"${label}" must be equal to ${data}`)
			return
		}

		if (isNumber && +data !== value) {
			errors.push(error ?? `"${label}" must be equal to ${data}`)
			return
		}

		if (typeof value === 'boolean') {
			if ((data === 'true' && value === false) || (data === 'false' && value === true))
				errors.push(error ?? `"${label}" must be equal to ${data}`)
			return
		}
	}

	// ! size:
	if (type.startsWith('size:')) {
		let size = +type.substring(5)

		if (isString && !isNumeric && value.length !== size) {
			errors.push(error ?? `"${label}" must have length ${size}`)
			return
		}

		if (Array.isArray(value) && value.length !== size) {
			errors.push(error ?? `"${label}" must have length ${size}`)
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
				errors.push(error ?? `"${label}" must have ${size} digits`)
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
				errors.push(error ?? `"${label}" must be at least ${min.toISOString()}`)
				return
			}
		} else {
			if (isString && !isNumeric && value.length < min) {
				errors.push(error ?? `"${label}" must have length of at least ${min}`)
				return
			}

			if (Array.isArray(value) && value.length < min) {
				errors.push(error ?? `"${label}" must have length of at least ${min}`)
				return
			}

			if (((isString && isNumeric) || isNumber) && +value < min) {
				errors.push(error ?? `"${label}" must be at least ${min}`)
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
				errors.push(error ?? `"${label}" must be at most ${max.toISOString()}`)
				return
			}
		} else {
			if (isString && !isNumeric && value.length > max) {
				errors.push(error ?? `"${label}" must have length of at most ${max}`)
				return
			}

			if (Array.isArray(value) && value.length > max) {
				errors.push(error ?? `"${label}" must have length of at most ${max}`)
				return
			}

			if (((isString && isNumeric) || isNumber) && +value > max) {
				errors.push(error ?? `"${label}" must be at most ${max}`)
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
			errors.push(error ?? `"${label}" must be of type string`)
			return
		}

		if (!regex.test(value)) {
			errors.push(error ?? `"${label}" is invalid`)
			return
		}
	}

	// ! decimalsize
	if (type.startsWith('decimalsize:')) {
		let size: number = +type.substring(12)

		if (typeof value === 'string') {
			let n = +value
			if (Number.isNaN(n)) {
				errors.push(error ?? `"${label}" must be a valid numeric string`)
				return
			}
			if (!value.includes('.') && size > 0) {
				errors.push(error ?? `"${label}" must have ${size} decimal places`)
				return
			}
			let index = value.lastIndexOf('.')
			let digits = value.substring(index + 1)

			if (!value.includes('.') && size === 0) {
				return
			}

			if (digits.length !== size) {
				errors.push(error ?? `"${label}" must have ${size} decimal places`)
				return
			}
		}

		if (typeof value === 'number') {
			if (Number.isNaN(value)) {
				errors.push(error ?? `"${label}" must be a value number`)
				return
			}
			let str = `${value}`
			if (!str.includes('.') && size > 0) {
				errors.push(error ?? `"${label}" must have ${size} decimal places`)
				return
			}
			if (!str.includes('.') && size === 0) {
				return
			}

			let index = str.lastIndexOf('.')
			let digits = str.substring(index + 1)
			if (digits.length !== size) {
				errors.push(error ?? `"${label}" must have ${size} decimal places`)
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
				errors.push(error ?? `"${label}" must be a valid numeric string`)
				return
			}
			if (!value.includes('.') && min > 0) {
				errors.push(error ?? `"${label}" must have at least ${min} decimal places`)
				return
			}
			let index = value.lastIndexOf('.')
			let digits = value.substring(index + 1)

			if (!value.includes('.') && min === 0) {
				return
			}

			if (digits.length < min) {
				errors.push(error ?? `"${label}" must have at least ${min} decimal places`)
				return
			}
		}

		if (typeof value === 'number') {
			if (Number.isNaN(value)) {
				errors.push(error ?? `"${label}" must be a value number`)
				return
			}
			let str = `${value}`
			if (!str.includes('.') && min > 0) {
				errors.push(error ?? `"${label}" must have at least ${min} decimal places`)
				return
			}
			if (!str.includes('.') && min === 0) {
				return
			}

			let index = str.lastIndexOf('.')
			let digits = str.substring(index + 1)

			if (digits.length < min) {
				errors.push(error ?? `"${label}" must have at least ${min} decimal places`)
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
				errors.push(error ?? `"${label}" must be a valid numeric string`)
				return
			}

			if (!value.includes('.') && max > 0) {
				return
			}

			let index = value.lastIndexOf('.')
			let digits = value.substring(index + 1)

			if (digits.length > max) {
				errors.push(error ?? `"${label}" must have at most ${max} decimal places`)
				return
			}
		}

		if (typeof value === 'number') {
			if (Number.isNaN(value)) {
				errors.push(error ?? `"${label}" must be a value number`)
				return
			}
			let str = `${value}`

			if (!str.includes('.') && max > 0) {
				return
			}

			let index = str.lastIndexOf('.')
			let digits = str.substring(index + 1)
			if (digits.length > max) {
				errors.push(error ?? `"${label}" must have at most ${max} decimal places`)
				return
			}
		}
	}

	// ! enums
	if (type.startsWith('enums:')) {
		let array: any[] = type.substring(6).split(',')

		if (isString && !isNumeric) {
			if (!array.includes(value)) {
				errors.push(error ?? `"${label}" is invalid`)
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
				errors.push(error ?? `"${label}" is invalid`)
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
				errors.push(error ?? `"${label}" is invalid`)
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
	errors: string[],
	optionalArrays: any[][],
	nullableArrays: any[][],
	variableName = ''
) {
	let field = getField(validations, key)
	let error = getError(validations)
	const label = variableName ? `${variableName}.${field ?? key}` : `${field ?? key}`

	let validation = type.substring(8) as Validation

	if (!Array.isArray(value)) {
		errors.push(error ?? `"${label}" must be an array`)
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
		let newErrors = [] as string[]
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
				variableName
			)
		}

		// ! email,url,domain,name,fullname,username,alpha,alphanumeric,phone,uuid,mongoid,date,dateonly,time,lower,upper,ip
		if (
			'email,url,domain,name,fullname,username,alpha,alphanumeric,phone,uuid,mongoid,date,dateonly,time,lower,upper,ip'
				.split(',')
				.includes(validation)
		) {
			checkDataType(elementKey, element, 'string', previousValidations, validations, newErrors, variableName)
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
				variableName
			)
		}

		// ! int,positive,negative,natural,whole
		if ('int,positive,negative,natural,whole'.split(',').includes(validation)) {
			checkDataType(elementKey, element, 'number', previousValidations, validations, newErrors, variableName)
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
				variableName
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
				variableName
			)
		}

		// // ! Nested Array Check
		// if (validation.startsWith('arrayof:')) {
		// 	let arrayValidation = validation.substring(8);
		// 	if (arrayValidation === 'optional') {
		// 		subOptionalElement = true;
		// 	}
		// 	if (arrayValidation === 'nullable') {
		// 		subNullableElement = true;
		// 	}
		// 	checkSpecificArrayType(
		// 		`${key}[${index}]`,
		// 		element,
		// 		validation as ArrayType,
		// 		newErrors,
		// 		subOptionalElement,
		// 		subNullableElement
		// 	);
		// }

		errors.push(...newErrors)
	}
}

function validateStrictCheck(rules: Rules, data: Data, errors: string[], variableName = '') {
	let ruleKeys = Object.keys(rules)
	let dataKeys = Object.keys(data)
	let dataTopLevelKeys = dataKeys.filter((e) => !e.includes('.'))
	let keys = ruleKeys.filter((e) => !e.includes('.') && !['$atleast', '$atmost'].includes(e))
	for (let e of dataTopLevelKeys) {
		if (!keys.includes(e)) {
			const label = variableName ? `${variableName}.${e}` : e
			errors.push(`"${label}" is not required`)
		}
	}
}

const Validator = { validate }

module.exports = Validator
