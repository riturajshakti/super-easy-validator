/**
 * @param {any} data
 * @param {'bigint' | 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date'} type
 * @param {string} variableName
 * @returns {{ok: boolean, message?: string}}
 */
function checkDataType(data, type, variableName) {
	if (data === null || data === undefined) {
		return { ok: false, message: `${variableName} is required` };
	}

	if (type === 'array') {
		if (Array.isArray(data)) {
			return { ok: true };
		}
		return { ok: false, message: `${variableName} must be an array` };
	}

	if (type === 'date') {
		if (data instanceof Date) {
			return { ok: true };
		}
		return { ok: false, message: `${variableName} must be a date` };
	}

	if (typeof data !== type) {
		return { ok: false, message: `${variableName} must be a ${type}` };
	}

	return { ok: true };
}

/**
 * @param {RegExp} regex
 * @param {string} str
 * @param {string} variableName
 * @returns {{ok: boolean, message?: string}}
 */
function checkRegex(regex, str, variableName) {
	let res = checkDataType(str, 'string', variableName);
	if (!res.ok) {
		return res;
	}

	if (!regex.test(str)) {
		return { ok: false, message: `${variableName} is invalid` };
	}

	return { ok: true };
}

/**
 * @param {number} n
 * @param {string} variableName
 * @returns {{ok: boolean, message?: string}}
 */
function checkNaturalNumber(n, variableName) {
	let res = checkDataType(n, 'number', variableName);
	if (!res.ok) {
		return res;
	}

	if (n <= 0) {
		return { ok: false, message: `${variableName} must be positive` };
	}

	if (`${n}`.includes('.')) {
		return { ok: false, message: `${variableName} must be natural number` };
	}

	return { ok: true };
}

/**
 * @param {number} n
 * @param {string} variableName
 * @returns {{ok: boolean, message?: string}}
 */
function checkPositiveNumber(n, variableName) {
	let res = checkDataType(n, 'number', variableName);
	if (!res.ok) {
		return res;
	}

	if (n <= 0) {
		return { ok: false, message: `${variableName} must be positive` };
	}

	return { ok: true };
}

/**
 * @param {number} n
 * @param {string} variableName
 * @returns {{ok: boolean, message?: string}}
 */
function checkWholeNumber(n, variableName) {
	let res = checkDataType(n, 'number', variableName);
	if (!res.ok) {
		return res;
	}

	if (n < 0) {
		return { ok: false, message: `${variableName} can't be negative` };
	}

	if (`${n}`.includes('.')) {
		return { ok: false, message: `${variableName} must not be a fractional number` };
	}

	return { ok: true };
}

/**
 * @param {number} n
 * @param {string} variableName
 * @returns {{ok: boolean, message?: string}}
 */
function checkInteger(n, variableName) {
	let res = checkDataType(n, 'number', variableName);
	if (!res.ok) {
		return res;
	}

	if (`${n}`.includes('.')) {
		return { ok: false, message: `${variableName} must be an integer` };
	}

	return { ok: true };
}

/**
 * @param {number} n
 * @param {number} start
 * @param {number} end
 * @param {string} variableName
 * @returns {{ok: boolean, message?: string}}
 */
function checkNumberRange(n, start, end, variableName) {
	let res = checkDataType(n, 'number', variableName);
	if (!res.ok) {
		return res;
	}

	if (n < start) {
		return { ok: false, message: `${variableName} is too short` };
	}

	if (n > end) {
		return { ok: false, message: `${variableName} is too big` };
	}

	return { ok: true };
}

/**
 * @param {string} str
 * @param {number} length
 * @param {string} variableName
 * @returns {{ok: boolean, message?: string}}
 */
function checkStringLength(str, length, variableName) {
	let res = checkDataType(str, 'string', variableName);
	if (!res.ok) {
		return res;
	}

	if (str.length !== length) {
		return { ok: false, message: `${variableName} must be ${length} characters.` };
	}

	return { ok: true };
}

/**
 * @param {string} str
 * @param {number} start
 * @param {number} end
 * @param {string} variableName
 * @returns {{ok: boolean, message?: string}}
 */
function checkStringRange(str, start, end, variableName) {
	let res = checkDataType(str, 'string', variableName);
	if (!res.ok) {
		return res;
	}

	if (str.length < start) {
		return { ok: false, message: `${variableName} is too short` };
	}

	if (str.length > end) {
		return { ok: false, message: `${variableName} is too long` };
	}

	return { ok: true };
}

/**
 * @param {number} n
 * @param {number} start
 * @param {number} end
 * @param {string} variableName
 * @returns {{ok: boolean, message?: string}}
 */
function checkNaturalNumberRange(n, start, end, variableName) {
	let res = checkDataType(n, 'number', variableName);
	if (!res.ok) {
		return res;
	}

	if (n <= 0 || `${n}`.includes('.')) {
		return { ok: false, message: `${variableName} must be a natural number` };
	}

	if (n < start) {
		return { ok: false, message: `${variableName} is too short` };
	}

	if (n > end) {
		return { ok: false, message: `${variableName} is too big` };
	}

	return { ok: true };
}

/**
 * @param {any} data
 * @param {any[]} list
 * @param {string} variableName
 * @returns {{ok: boolean, message?: string}}
 */
function checkEnum(data, list, variableName) {
	if (!data) {
		return { ok: false, message: `${variableName} is required` };
	}

	if (!list.includes(data)) {
		return { ok: false, message: `${variableName} must be any one of ${list.join(', ')}` };
	}

	return { ok: true };
}

/**
 * @param {string} email
 * @param {string} variableName
 * @returns {{ok: boolean, message?: string}}
 */
function checkEmail(email, variableName) {
	let res = checkRegex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, email, variableName);
	if (!res.ok) {
		return res;
	}

	return { ok: true };
}

/**
 * @param {string} phone
 * @param {string} variableName
 * @returns {{ok: boolean, message?: string}}
 */
function checkPhone(phone, variableName) {
	let res = checkRegex(/^(?:\+\d{1,3}\s?)?(?:\(\d+\))?(?:\d+\s?)+(?:\d{1,4})$/, phone, variableName);
	if (!res.ok) {
		return res;
	}

	return { ok: true };
}

/**
 * @param {string} id
 * @param {string} variableName
 * @returns {{ok: boolean, message?: string}}
 */
function checkMongoId(id, variableName) {
	let res = checkRegex(/^[0-9a-fA-F]{24}$/, id, variableName);
	if (!res.ok) {
		return res;
	}

	return { ok: true };
}

module.exports = {
	checkDataType,
	checkRegex,
	checkNaturalNumber,
	checkPositiveNumber,
	checkWholeNumber,
	checkInteger,
	checkNumberRange,
	checkStringRange,
	checkStringLength,
	checkNaturalNumberRange,
	checkEnum,
	checkEmail,
	checkPhone,
	checkMongoId,
};
