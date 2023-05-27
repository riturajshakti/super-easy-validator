import {
	ArrayType,
	ConstraintType,
	Data,
	DataType,
	Rules,
	SpecificNumberType,
	SpecificStringType,
	Validation,
} from './types';

function validate(rules: Rules, data: Data) {
	try {
		let allErrors: string[] | undefined = [];
		for (let key in rules) {
			let errors = [] as string[];
			let value = rules[key];
			let validations: Validation[];
			if (typeof value === 'string') {
				validations = value.split('|') as Validation[];
			} else {
				validations = value as Validation[];
			}

			let dataToSend = !key.includes('.') ? data[key] : getPropByString(data, key);

			if (key !== '$atleast') {
				validateSingleData(key, dataToSend, validations, errors);
			} else {
				validateAtleastData(data, validations as string[], errors);
			}

			allErrors.push(...errors);
		}

		if (allErrors.length === 0) {
			allErrors = undefined;
		}

		return { errors: allErrors };
	} catch (error) {
		console.log(error);
		return { errors: ['error occurred while data validation'] };
	}
}

function validateSingleData(key: string, value: any, validations: Validation[], errors: string[]) {
	let optionalArrays: any[][] = [];
	let nullableArrays: any[][] = [];

	for (let validation of validations) {
		// !optional
		if (validation === 'optional' && value === undefined) {
			return;
		}

		// !nullable
		if (validation === 'nullable' && value === null) {
			return;
		}

		// ! string,number,boolean,object,array,bigint
		if ('string,number,boolean,object,array,bigint'.split(',').includes(validation)) {
			checkDataType(key, value, validation as DataType, errors);
			if (errors.length) {
				break;
			}
		}

		// ! email,url,domain,name,username,numeric,alpha,alphanumeric,phone,mongoid,date,dateonly,time,lower,upper,ip
		if (
			'email,url,domain,name,username,numeric,alpha,alphanumeric,phone,mongoid,date,dateonly,time,lower,upper,ip'
				.split(',')
				.includes(validation)
		) {
			checkSpecificStringType(key, value, validation as SpecificStringType, errors);
			if (errors.length) {
				break;
			}
		}

		// ! int,positive,negative,natural,whole
		if ('int,positive,negative,natural,whole'.split(',').includes(validation)) {
			checkSpecificNumberType(key, value, validation as SpecificNumberType, errors);
			if (errors.length) {
				break;
			}
		}

		// ! equal,size,min,max,regex,decimalsize,decimalmin,decimalmax,enums
		if (
			'equal,size,min,max,regex,decimalsize,decimalmin,decimalmax,enums'
				.split(',')
				.some((e) => validation.startsWith(e + ':'))
		) {
			checkConstraint(key, value, validation as ConstraintType, errors);
			if (errors.length) {
				break;
			}
		}

		// ! Nested Array Check
		if (validation.startsWith('arrayof:')) {
			checkSpecificArrayType(key, value, validation as ArrayType, errors, optionalArrays, nullableArrays);
			if (errors.length) {
				break;
			}
		}
	}
}

function validateAtleastData(data: Data, keys: string[], errors: string[]) {
	for (let key of keys) {
		let value = !key.includes('.') ? data[key] : getPropByString(data, key);
		if (value) {
			return;
		}
	}
	errors.push(`at least one of ${keys.map((e) => `"${e}"`).join(', ')} is required`);
}

function checkDataType(key: string, value: any, dataType: DataType, errors: string[]) {
	if (value === undefined || value === null) {
		errors.push(`"${key}" is required`);
		return;
	}

	if (dataType === 'symbol' && typeof value !== 'symbol') {
		errors.push(`"${key}" must be symbol`);
		return;
	}

	if (dataType === 'string' && typeof value !== 'string') {
		errors.push(`"${key}" must be string`);
		return;
	}

	if (dataType === 'number' && typeof value !== 'number') {
		errors.push(`"${key}" must be number`);
		return;
	}

	if (dataType === 'bigint' && typeof value !== 'bigint') {
		errors.push(`"${key}" must be bigint`);
		return;
	}

	if (dataType === 'boolean' && typeof value !== 'boolean') {
		errors.push(`"${key}" must be boolean`);
		return;
	}

	if (dataType === 'array' && !Array.isArray(value)) {
		errors.push(`"${key}" must be an array`);
		return;
	}

	if (dataType === 'object' && (Array.isArray(value) || typeof value !== 'object')) {
		errors.push(`"${key}" must be an object`);
		return;
	}
}

function checkSpecificStringType(key: string, value: any, specificType: SpecificStringType, errors: string[]) {
	if (value === undefined || value === null) {
		errors.push(`"${key}" is required`);
		return;
	}

	checkDataType(key, value, 'string', errors);
	if (errors.length) {
		return;
	}

	if (
		specificType === 'email' &&
		!/^[A-Z0-9_'%=+!`#~$*?^{}&|-]+([\.][A-Z0-9_'%=+!`#~$*?^{}&|-]+)*@[A-Z0-9-]+(\.[A-Z0-9-]+)+$/i.test(value)
	) {
		errors.push(`"${key}" must be a valid email`);
		return;
	}

	if (
		specificType === 'url' &&
		!/^(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})$/.test(
			value
		)
	) {
		errors.push(`"${key}" must be a valid url`);
		return;
	}

	if (
		specificType === 'domain' &&
		!/^[a-zA-Z0-9][a-zA-Z0-9-_]{0,61}[a-zA-Z0-9]{0,1}\.([a-zA-Z]{1,6}|[a-zA-Z0-9-]{1,30}\.[a-zA-Z]{2,3})$/.test(value)
	) {
		errors.push(`"${key}" must be a valid domain`);
		return;
	}

	if (specificType === 'name' && !/^([a-zA-Z]{2,}\s[a-zA-Z]{1,}'?-?[a-zA-Z]{2,}\s?([a-zA-Z]{1,})?)$/.test(value)) {
		errors.push(`"${key}" must be a valid name`);
		return;
	}

	if (specificType === 'username' && !/^[^\W_](?!.*?[._]{2})[\w.]{6,18}[^\W_]$/.test(value)) {
		errors.push(`"${key}" must be a valid username`);
		return;
	}

	if (specificType === 'numeric' && Number.isNaN(+value)) {
		errors.push(`"${key}" must be a valid numeric string`);
		return;
	}

	if (specificType === 'alpha' && !/^[A-Za-z]{1,}$/.test(value)) {
		errors.push(`"${key}" must be a valid alpha`);
		return;
	}

	if (specificType === 'alphanumeric' && !/^[A-Za-z0-9]{1,}$/.test(value)) {
		errors.push(`"${key}" must be a valid alphanumeric`);
		return;
	}

	if (specificType === 'phone' && !/^(?:\+\d{1,3}\s?)?(?:\(\d+\))?(?:\d+\s?)+(?:\d{1,4})$/.test(value)) {
		errors.push(`"${key}" must be a valid phone`);
		return;
	}

	if (specificType === 'mongoid' && !/^[0-9a-fA-F]{24}$/.test(value)) {
		errors.push(`"${key}" must be a valid mongodb id`);
		return;
	}

	if (
		specificType === 'date' &&
		!/^(\d{4})(?:-?(0[1-9]|1[0-2])(?:-?([12]\d|0[1-9]|3[01]))?|(?:-?([12]\d|0[1-9]|3[01]))?-(0[1-9]|1[0-2]))(?:[T ](\d{2}):([0-5]\d):([0-5]\d)(?:\.(\d{1,4}))?)?(?:Z|([+-])([01]\d|2[0-3])(?::?([0-5]\d))?)?$/.test(
			value
		)
	) {
		errors.push(`"${key}" must be a valid date`);
		return;
	}

	if (specificType === 'dateonly' && !/^(\d{4})-(0[1-9]|1[0-2])-([12]\d|0[1-9]|3[01])$/.test(value)) {
		errors.push(`"${key}" must be a valid date`);
		return;
	}

	if (specificType === 'time' && !/^(?:[01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?(?:\.\d{1,4})?$/.test(value)) {
		errors.push(`"${key}" must be a valid time`);
		return;
	}

	if (specificType === 'lower' && !/^[^A-Z]+$/.test(value)) {
		errors.push(`"${key}" must not contains upper case letters`);
		return;
	}

	if (specificType === 'upper' && !/^[^a-z]+$/.test(value)) {
		errors.push(`"${key}" must not contains lower case letters`);
		return;
	}

	if (
		specificType === 'ip' &&
		!/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(value)
	) {
		errors.push(`"${key}" must be a valid IP address`);
		return;
	}
}

function checkSpecificNumberType(key: string, value: any, specificType: SpecificNumberType, errors: string[]) {
	if (value === undefined || value === null) {
		errors.push(`"${key}" is required`);
		return;
	}

	checkDataType(key, value, 'number', errors);
	if (errors.length) {
		return;
	}

	if (specificType === 'int' && `${value}`.includes('.')) {
		errors.push(`"${key}" must be a valid integer`);
		return;
	}

	if (specificType === 'positive' && value <= 0) {
		errors.push(`"${key}" must be a positive number`);
		return;
	}

	if (specificType === 'negative' && value >= 0) {
		errors.push(`"${key}" must be a negative number`);
		return;
	}

	if (specificType === 'natural' && (`${value}`.includes('.') || value <= 0)) {
		errors.push(`"${key}" must be a natural number`);
		return;
	}

	if (specificType === 'whole' && (`${value}`.includes('.') || value < 0)) {
		errors.push(`"${key}" must be a whole number`);
		return;
	}
}

function checkConstraint(key: string, value: any, type: ConstraintType, errors: string[]) {
	if (value === undefined || value === null) {
		errors.push(`"${key}" is required`);
		return;
	}

	// ! equal:
	if (type.startsWith('equal:')) {
		let data = type.substring(6);

		if (typeof value === 'string' && data !== value) {
			errors.push(`"${key}" must be equal to ${data}`);
			return;
		}

		if (typeof value === 'number' && +data !== value) {
			errors.push(`"${key}" must be equal to ${data}`);
			return;
		}

		if (typeof value === 'boolean') {
			if ((data === 'true' && value === false) || (data === 'false' && value === true))
				errors.push(`"${key}" must be equal to ${data}`);
			return;
		}
	}

	// ! size:
	if (type.startsWith('size:')) {
		let size = +type.substring(5);

		if (typeof value === 'string' && value.length !== size) {
			errors.push(`"${key}" must have length ${size}`);
			return;
		}

		if (Array.isArray(value) && value.length !== size) {
			errors.push(`"${key}" must have length ${size}`);
			return;
		}

		if (typeof value === 'number') {
			let valueString = `${value}`;
			let valueLength = valueString.length;
			valueLength -= valueString
				.split('')
				.filter((e) => ['e', '-', '+', '.'].includes(e))
				.join('').length;
			if (valueLength !== size) {
				errors.push(`"${key}" must have ${size} digits`);
				return;
			}
		}
	}

	// ! min:
	if (type.startsWith('min:')) {
		let min: number | Date = +type.substring(4);
		if (Number.isNaN(min)) {
			min = new Date(Date.parse(type.substring(4)));
		}

		if (min instanceof Date) {
			let date = new Date(Date.parse(value));
			if (date < min) {
				errors.push(`"${key}" must be at least ${min.toISOString()}`);
				return;
			}
		} else {
			if (typeof value === 'string' && value.length < min) {
				errors.push(`"${key}" must have length of at least ${min}`);
				return;
			}

			if (Array.isArray(value) && value.length < min) {
				errors.push(`"${key}" must have length of at least ${min}`);
				return;
			}

			if (typeof value === 'number' && value < min) {
				errors.push(`"${key}" must have length of at least ${min}`);
				return;
			}
		}
	}

	// ! max:
	if (type.startsWith('max:')) {
		let max: number | Date = +type.substring(4);
		if (Number.isNaN(max)) {
			max = new Date(Date.parse(type.substring(4)));
		}

		if (max instanceof Date) {
			let date = new Date(Date.parse(value));
			if (date > max) {
				errors.push(`"${key}" must be at most ${max.toISOString()}`);
				return;
			}
		} else {
			if (typeof value === 'string' && value.length > max) {
				errors.push(`"${key}" must have length of at most ${max}`);
				return;
			}

			if (Array.isArray(value) && value.length > max) {
				errors.push(`"${key}" must have length of at most ${max}`);
				return;
			}

			if (typeof value === 'number' && value > max) {
				errors.push(`"${key}" must have length of at most ${max}`);
				return;
			}
		}
	}

	// ! regex
	if (type.startsWith('regex:')) {
		let str: string = type.substring(6);
		let index = str.lastIndexOf('/');
		let main = str.substring(1, index);
		let flags = str.substring(index + 1);
		let regex = new RegExp(main, flags);

		if (typeof value !== 'string') {
			errors.push(`"${key}" must be of type string`);
			return;
		}

		if (!regex.test(value)) {
			errors.push(`"${key}" is invalid`);
			return;
		}
	}

	// ! decimalsize
	if (type.startsWith('decimalsize:')) {
		let size: number = +type.substring(12);

		if (typeof value === 'string') {
			let n = +value;
			if (Number.isNaN(n)) {
				errors.push(`"${key}" must be a valid numeric string`);
				return;
			}
			if (!value.includes('.') && size > 0) {
				errors.push(`"${key}" must have ${size} decimal places`);
				return;
			}
			let index = value.lastIndexOf('.');
			let digits = value.substring(index + 1);

			if (!value.includes('.') && size === 0) {
				return;
			}

			if (digits.length !== size) {
				errors.push(`"${key}" must have ${size} decimal places`);
				return;
			}
		}

		if (typeof value === 'number') {
			if (Number.isNaN(value)) {
				errors.push(`"${key}" must be a value number`);
				return;
			}
			let str = `${value}`;
			if (!str.includes('.') && size > 0) {
				errors.push(`"${key}" must have ${size} decimal places`);
				return;
			}
			if (!str.includes('.') && size === 0) {
				return;
			}

			let index = str.lastIndexOf('.');
			let digits = str.substring(index + 1);
			if (digits.length !== size) {
				errors.push(`"${key}" must have ${size} decimal places`);
				return;
			}
		}
	}

	// ! decimalmin
	if (type.startsWith('decimalmin:')) {
		let min: number = +type.substring(11);

		if (typeof value === 'string') {
			let n = +value;
			if (Number.isNaN(n)) {
				errors.push(`"${key}" must be a valid numeric string`);
				return;
			}
			if (!value.includes('.') && min > 0) {
				errors.push(`"${key}" must have at least ${min} decimal places`);
				return;
			}
			let index = value.lastIndexOf('.');
			let digits = value.substring(index + 1);

			if (!value.includes('.') && min === 0) {
				return;
			}

			if (digits.length < min) {
				errors.push(`"${key}" must have at least ${min} decimal places`);
				return;
			}
		}

		if (typeof value === 'number') {
			if (Number.isNaN(value)) {
				errors.push(`"${key}" must be a value number`);
				return;
			}
			let str = `${value}`;
			if (!str.includes('.') && min > 0) {
				errors.push(`"${key}" must have at least ${min} decimal places`);
				return;
			}
			if (!str.includes('.') && min === 0) {
				return;
			}

			let index = str.lastIndexOf('.');
			let digits = str.substring(index + 1);

			if (digits.length < min) {
				errors.push(`"${key}" must have at least ${min} decimal places`);
				return;
			}
		}
	}

	// ! decimalmax
	if (type.startsWith('decimalmax:')) {
		let max: number = +type.substring(11);

		if (typeof value === 'string') {
			let n = +value;
			if (Number.isNaN(n)) {
				errors.push(`"${key}" must be a valid numeric string`);
				return;
			}

			if (!value.includes('.') && max > 0) {
				return;
			}

			let index = value.lastIndexOf('.');
			let digits = value.substring(index + 1);

			if (digits.length > max) {
				errors.push(`"${key}" must have at most ${max} decimal places`);
				return;
			}
		}

		if (typeof value === 'number') {
			if (Number.isNaN(value)) {
				errors.push(`"${key}" must be a value number`);
				return;
			}
			let str = `${value}`;

			if (!str.includes('.') && max > 0) {
				return;
			}

			let index = str.lastIndexOf('.');
			let digits = str.substring(index + 1);
			if (digits.length > max) {
				errors.push(`"${key}" must have at most ${max} decimal places`);
				return;
			}
		}
	}

	// ! enums
	if (type.startsWith('enums:')) {
		let array: any[] = type.substring(6).split(',');

		if (typeof value === 'string') {
			if (!array.includes(value)) {
				errors.push(`"${key}" is invalid`);
				return;
			}
		}

		if (typeof value === 'number') {
			if (
				!array
					.filter((e) => !Number.isNaN(+e))
					.map((e) => +e)
					.includes(value)
			) {
				errors.push(`"${key}" is invalid`);
				return;
			}
		}

		if (typeof value === 'boolean') {
			if (
				!array
					.filter((e) => e === 'true' || e === 'false')
					.map((e) => e === 'true')
					.includes(value)
			) {
				errors.push(`"${key}" is invalid`);
				return;
			}
		}
	}
}

function checkSpecificArrayType(
	key: string,
	value: any,
	type: ArrayType,
	errors: string[],
	optionalArrays: any[][],
	nullableArrays: any[][]
) {
	let validation = type.substring(8) as Validation;

	if (!Array.isArray(value)) {
		errors.push(`"${key}" must be an array`);
		return;
	}

	let array = value as any[];

	if (validation === 'optional') {
		optionalArrays.push(array);
	}

	if (validation === 'nullable') {
		nullableArrays.push(array);
	}

	let isOptional = optionalArrays.includes(array);
	let isNullable = nullableArrays.includes(array);

	for (let index = 0; index <= array.length - 1; index++) {
		let element = array[index];
		let newErrors = [] as string[];
		let elementKey = `${key}[${index}]`;

		if ((isOptional && element === undefined) || (isNullable && element === null)) {
			continue;
		}

		// ! string,number,boolean,array,object,bigint,symbol
		if ('string,number,boolean,array,object,bigint,symbol'.split(',').includes(validation)) {
			checkDataType(elementKey, element, validation as DataType, newErrors);
		}

		// ! email,url,domain,name,username,numeric,alpha,alphanumeric,phone,mongoid,date,dateonly,time,lower,upper,ip
		if (
			'email,url,domain,name,username,numeric,alpha,alphanumeric,phone,mongoid,date,dateonly,time,lower,upper,ip'
				.split(',')
				.includes(validation)
		) {
			checkDataType(elementKey, element, 'string', newErrors);
			if (newErrors.length) {
				errors.push(...newErrors);
				continue;
			}
			checkSpecificStringType(elementKey, element, validation as SpecificStringType, newErrors);
		}

		// ! int,positive,negative,natural,whole
		if ('int,positive,negative,natural,whole'.split(',').includes(validation)) {
			checkDataType(elementKey, element, 'number', newErrors);
			if (newErrors.length) {
				errors.push(...newErrors);
				continue;
			}
			checkSpecificNumberType(elementKey, element, validation as SpecificNumberType, newErrors);
		}

		// ! equal,size,min,max,regex,decimalsize,decimalmin,decimalmax,enums
		if (
			'equal,size,min,max,regex,decimalsize,decimalmin,decimalmax,enums'
				.split(',')
				.some((e) => validation.startsWith(`${e}:`))
		) {
			checkConstraint(elementKey, element, validation as ConstraintType, newErrors);
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

		errors.push(...newErrors);
	}
}

function getPropByString(obj: Data, propString: string) {
	if (!propString) return obj;

	let prop,
		props = propString.split('.');
	let i = 0;

	for (let iLen = props.length - 1; i < iLen; i++) {
		prop = props[i];

		let candidate = obj[prop];
		if (candidate !== undefined) {
			obj = candidate;
		} else {
			break;
		}
	}
	return obj[props[i]];
}

const Validation = { validate };

module.exports = Validation;
