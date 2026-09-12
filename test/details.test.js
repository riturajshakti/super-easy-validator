const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { validate, ErrorCodes } = require('../dist/index.js')

const codesOf = (rules, data, config) => (validate(rules, data, config).details ?? []).map((d) => d.code)
const codeOf = (rules, data, config) => codesOf(rules, data, config)[0]

describe('details shape', () => {
	test('details is undefined when validation passes', () =>
		assert.equal(validate({ a: 'string' }, { a: 'x' }).details, undefined))
	test('errors is undefined when validation passes', () =>
		assert.equal(validate({ a: 'string' }, { a: 'x' }).errors, undefined))
	test('details is an array when validation fails', () =>
		assert.ok(Array.isArray(validate({ a: 'string' }, { a: 1 }).details)))
	test('every entry has exactly message and code', () => {
		const { details } = validate({ a: 'string', b: 'number' }, { a: 1, b: 'x' })
		for (const d of details) {
			assert.deepEqual(Object.keys(d).sort(), ['code', 'message'])
			assert.equal(typeof d.message, 'string')
			assert.equal(typeof d.code, 'string')
		}
	})
})

describe('details and errors stay index-aligned', () => {
	const cases = [
		[{ a: 'string' }, { a: 1 }],
		[{ a: 'string', b: 'number', c: 'email' }, { a: 1, b: 'x', c: 'bad' }],
		[{ u: [{ n: 'name', a: 'natural' }] }, { u: [{ n: 'Jo', a: 1 }, {}] }],
		[{ a: { b: { c: 'string' } } }, { a: { b: { c: 1 } } }],
		[{ x: 'optional|email', y: 'optional|phone', $atleast: 'x|y' }, {}],
		[{ a: 'string', b: 'string' }, { a: 1, b: 2, extra: 3 }, { strict: true }],
	]

	for (const [rules, data, config] of cases) {
		test(`aligned for ${JSON.stringify(rules).slice(0, 44)}`, () => {
			const { errors, details } = validate(rules, data, config)
			assert.equal(details.length, errors.length)
			details.forEach((d, i) => assert.equal(d.message, errors[i]))
		})
	}
})

describe('presence codes', () => {
	test('REQUIRED for a missing leaf', () => assert.equal(codeOf({ a: 'string' }, {}), ErrorCodes.REQUIRED))
	test('REQUIRED for a missing nested object', () =>
		assert.equal(codeOf({ a: { b: 'string' } }, {}), ErrorCodes.REQUIRED))
	test('REQUIRED for a missing array of objects', () =>
		assert.equal(codeOf({ a: [{ b: 'string' }] }, {}), ErrorCodes.REQUIRED))
	test('REQUIRED for a null value', () => assert.equal(codeOf({ a: 'string' }, { a: null }), ErrorCodes.REQUIRED))
	test('DATA_REQUIRED when data itself is null', () =>
		assert.equal(codeOf({ a: 'string' }, null), ErrorCodes.DATA_REQUIRED))
	test('DATA_NOT_OBJECT when data is a primitive', () =>
		assert.equal(codeOf({ a: 'string' }, 42), ErrorCodes.DATA_NOT_OBJECT))
	test('UNEXPECTED_FIELD under strict', () =>
		assert.equal(codeOf({ a: 'string' }, { a: 'x', b: 1 }, { strict: true }), ErrorCodes.UNEXPECTED_FIELD))
})

describe('type codes', () => {
	test('NOT_STRING', () => assert.equal(codeOf({ a: 'string' }, { a: 1 }), ErrorCodes.NOT_STRING))
	test('NOT_NUMBER', () => assert.equal(codeOf({ a: 'number' }, { a: 'x' }), ErrorCodes.NOT_NUMBER))
	test('NOT_NUMERIC_STRING', () =>
		assert.equal(codeOf({ a: 'string|number' }, { a: 'x' }), ErrorCodes.NOT_NUMERIC_STRING))
	test('NOT_BOOLEAN', () => assert.equal(codeOf({ a: 'boolean' }, { a: 'x' }), ErrorCodes.NOT_BOOLEAN))
	test('NOT_BOOLEAN_STRING', () =>
		assert.equal(codeOf({ a: 'string|boolean' }, { a: 'yes' }), ErrorCodes.NOT_BOOLEAN_STRING))
	test('NOT_ARRAY', () => assert.equal(codeOf({ a: 'array' }, { a: {} }), ErrorCodes.NOT_ARRAY))
	test('NOT_OBJECT', () => assert.equal(codeOf({ a: 'object' }, { a: [] }), ErrorCodes.NOT_OBJECT))
	test('NOT_BIGINT', () => assert.equal(codeOf({ a: 'bigint' }, { a: 1 }), ErrorCodes.NOT_BIGINT))
	test('NOT_SYMBOL', () => assert.equal(codeOf({ a: 'symbol' }, { a: 'x' }), ErrorCodes.NOT_SYMBOL))
	test('NOT_OBJECT for a non-object nested value', () =>
		assert.equal(codeOf({ a: { b: 'string' } }, { a: 'x' }), ErrorCodes.NOT_OBJECT))
	test('NOT_ARRAY for a non-array in a tuple rule', () =>
		assert.equal(codeOf({ a: [{ b: 'string' }] }, { a: 'x' }), ErrorCodes.NOT_ARRAY))
})

describe('string format codes', () => {
	const cases = {
		NOT_EMAIL: ['email', 'bad'],
		NOT_URL: ['url', 'bad'],
		NOT_DOMAIN: ['domain', 'bad domain'],
		NOT_NAME: ['name', '123'],
		NOT_FULLNAME: ['fullname', 'John'],
		NOT_USERNAME: ['username', 'ab'],
		NOT_ALPHA: ['alpha', 'a1'],
		NOT_ALPHANUMERIC: ['alphanumeric', 'a b'],
		NOT_PHONE: ['phone', 'abc'],
		NOT_PHONECODE: ['phonecode', '91'],
		NOT_OBJECTID: ['objectid', 'bad'],
		NOT_UUID: ['uuid', 'bad'],
		NOT_DATE: ['date', 'bad'],
		NOT_DATEONLY: ['dateonly', '1996-01-10T23:50'],
		NOT_TIME: ['time', '25:00'],
		NOT_IP: ['ip', '256.1.1.1'],
		NOT_LOWERCASE: ['lower', 'ABC'],
		NOT_UPPERCASE: ['upper', 'abc'],
	}

	for (const [code, [rule, value]] of Object.entries(cases)) {
		test(`${code} for ${rule}`, () => assert.equal(codeOf({ a: rule }, { a: value }), ErrorCodes[code]))
	}

	test('date and dateonly have distinct codes despite identical messages', () => {
		const a = validate({ a: 'date' }, { a: 'bad' })
		const b = validate({ a: 'dateonly' }, { a: 'bad' })
		assert.equal(a.errors[0], b.errors[0])
		assert.notEqual(a.details[0].code, b.details[0].code)
	})
})

describe('number codes (string variants share one code)', () => {
	test('NOT_INTEGER', () => assert.equal(codeOf({ a: 'int' }, { a: 1.5 }), ErrorCodes.NOT_INTEGER))
	test('NOT_INTEGER for the string form', () =>
		assert.equal(codeOf({ a: 'string|int' }, { a: '1.5' }), ErrorCodes.NOT_INTEGER))
	test('NOT_POSITIVE', () => assert.equal(codeOf({ a: 'positive' }, { a: 0 }), ErrorCodes.NOT_POSITIVE))
	test('NOT_POSITIVE for the string form', () =>
		assert.equal(codeOf({ a: 'string|positive' }, { a: '-5' }), ErrorCodes.NOT_POSITIVE))
	test('NOT_NEGATIVE', () => assert.equal(codeOf({ a: 'negative' }, { a: 1 }), ErrorCodes.NOT_NEGATIVE))
	test('NOT_NATURAL', () => assert.equal(codeOf({ a: 'natural' }, { a: 0 }), ErrorCodes.NOT_NATURAL))
	test('NOT_WHOLE', () => assert.equal(codeOf({ a: 'whole' }, { a: -1 }), ErrorCodes.NOT_WHOLE))
})

describe('constraint codes', () => {
	test('NOT_EQUAL', () => assert.equal(codeOf({ a: 'string|equal:x' }, { a: 'y' }), ErrorCodes.NOT_EQUAL))
	test('LENGTH_MISMATCH for a string', () =>
		assert.equal(codeOf({ a: 'string|size:4' }, { a: 'ab' }), ErrorCodes.LENGTH_MISMATCH))
	test('LENGTH_MISMATCH for an array', () =>
		assert.equal(codeOf({ a: 'array|size:3' }, { a: [1] }), ErrorCodes.LENGTH_MISMATCH))
	test('DIGITS_MISMATCH for a number', () =>
		assert.equal(codeOf({ a: 'number|size:5' }, { a: 12 }), ErrorCodes.DIGITS_MISMATCH))
	test('TOO_SHORT for string length', () =>
		assert.equal(codeOf({ a: 'string|min:5' }, { a: 'ab' }), ErrorCodes.TOO_SHORT))
	test('TOO_SHORT for array length', () =>
		assert.equal(codeOf({ a: 'array|min:3' }, { a: [1] }), ErrorCodes.TOO_SHORT))
	test('TOO_LONG for string length', () =>
		assert.equal(codeOf({ a: 'string|max:2' }, { a: 'abcd' }), ErrorCodes.TOO_LONG))
	test('TOO_SMALL for a number value', () =>
		assert.equal(codeOf({ a: 'number|min:5' }, { a: 2 }), ErrorCodes.TOO_SMALL))
	test('TOO_LARGE for a number value', () =>
		assert.equal(codeOf({ a: 'number|max:5' }, { a: 9 }), ErrorCodes.TOO_LARGE))
	test('DATE_TOO_EARLY', () =>
		assert.equal(codeOf({ a: 'date|min:2020-01-01' }, { a: '2019-01-01' }), ErrorCodes.DATE_TOO_EARLY))
	test('DATE_TOO_LATE', () =>
		assert.equal(codeOf({ a: 'date|max:2020-01-01' }, { a: '2021-01-01' }), ErrorCodes.DATE_TOO_LATE))
	test('REGEX_MISMATCH', () =>
		assert.equal(codeOf({ a: 'regex:/^a$/' }, { a: 'z' }), ErrorCodes.REGEX_MISMATCH))
	test('ENUM_MISMATCH', () => assert.equal(codeOf({ a: 'enums:x,y' }, { a: 'z' }), ErrorCodes.ENUM_MISMATCH))
	test('DECIMAL_SIZE_MISMATCH', () =>
		assert.equal(codeOf({ a: 'number|decimalsize:2' }, { a: 1.234 }), ErrorCodes.DECIMAL_SIZE_MISMATCH))
	test('DECIMAL_TOO_FEW', () =>
		assert.equal(codeOf({ a: 'number|decimalmin:3' }, { a: 1.2 }), ErrorCodes.DECIMAL_TOO_FEW))
	test('DECIMAL_TOO_MANY', () =>
		assert.equal(codeOf({ a: 'number|decimalmax:2' }, { a: 1.2345 }), ErrorCodes.DECIMAL_TOO_MANY))
	test('NOT_A_NUMBER for NaN', () =>
		assert.equal(codeOf({ a: 'number|decimalsize:2' }, { a: NaN }), ErrorCodes.NOT_A_NUMBER))

	test('TOO_SHORT and TOO_SMALL are distinct problems', () => {
		const codes = codesOf({ s: 'string|min:5', n: 'number|min:5' }, { s: 'ab', n: 2 })
		assert.deepEqual(codes, [ErrorCodes.TOO_SHORT, ErrorCodes.TOO_SMALL])
	})
})

describe('the enums/regex ambiguity is resolved by code', () => {
	test('identical messages, different codes', () => {
		const { errors, details } = validate({ e: 'enums:a,b', r: 'regex:/^a$/' }, { e: 'z', r: 'z' })
		assert.equal(errors[0], 'e is invalid')
		assert.equal(errors[1], 'r is invalid')
		assert.equal(details[0].code, ErrorCodes.ENUM_MISMATCH)
		assert.equal(details[1].code, ErrorCodes.REGEX_MISMATCH)
	})
})

describe('field group codes', () => {
	test('ATLEAST_NOT_MET', () =>
		assert.equal(
			codeOf({ a: 'optional|string', b: 'optional|string', $atleast: 'a|b' }, {}),
			ErrorCodes.ATLEAST_NOT_MET
		))
	test('ATMOST_EXCEEDED', () =>
		assert.equal(
			codeOf({ a: 'optional|string', b: 'optional|string', $atmost: 'a|b' }, { a: '1', b: '2' }),
			ErrorCodes.ATMOST_EXCEEDED
		))
	test('array form reports a code per group', () =>
		assert.deepEqual(
			codesOf({ a: 'optional|string', b: 'optional|string', x: 'optional|string', y: 'optional|string', $atleast: ['a|b', 'x|y'] }, {}),
			[ErrorCodes.ATLEAST_NOT_MET, ErrorCodes.ATLEAST_NOT_MET]
		))
})

describe('rule authoring codes', () => {
	test('INVALID_RULE for a non-string rule entry', () =>
		assert.equal(codeOf({ a: ['string', /x/] }, { a: 'y' }), ErrorCodes.INVALID_RULE))
})

describe('custom error: replaces the message but keeps the code', () => {
	test('natural keeps NOT_NATURAL', () => {
		const { errors, details } = validate({ age: 'natural|error:bad age' }, { age: -5 })
		assert.deepEqual(errors, ['bad age'])
		assert.equal(details[0].code, ErrorCodes.NOT_NATURAL)
	})
	test('email keeps NOT_EMAIL', () => {
		const { details } = validate({ a: 'email|error:nope' }, { a: 'bad' })
		assert.equal(details[0].message, 'nope')
		assert.equal(details[0].code, ErrorCodes.NOT_EMAIL)
	})
	test('field: does not change the code', () =>
		assert.equal(codeOf({ age: 'natural|field:person age' }, { age: -5 }), ErrorCodes.NOT_NATURAL))
})

describe('quotes apply to details messages', () => {
	for (const [option, expected] of [
		['none', 'name must be a valid name'],
		['single-quotes', "'name' must be a valid name"],
		['double-quotes', '"name" must be a valid name'],
		['backtick', '`name` must be a valid name'],
	]) {
		test(`${option}`, () => {
			const { errors, details } = validate({ name: 'name' }, { name: '123' }, { quotes: option })
			assert.equal(details[0].message, expected)
			assert.equal(details[0].message, errors[0])
		})
	}
})

describe('de-duplication keeps the first code', () => {
	test('duplicate messages collapse in both arrays', () => {
		const { errors, details } = validate(
			{ a: 'string|error:same', b: 'string|error:same' },
			{ a: 1, b: 2 }
		)
		assert.deepEqual(errors, ['same'])
		assert.equal(details.length, 1)
		assert.equal(details[0].code, ErrorCodes.NOT_STRING)
	})
})

describe('ErrorCodes export', () => {
	test('is exported from the module root', () => assert.equal(typeof ErrorCodes, 'object'))
	test('every key maps to itself', () => {
		for (const [k, v] of Object.entries(ErrorCodes)) {
			assert.equal(k, v, `${k} should map to itself`)
		}
	})
	test('is available on the default export', () => {
		const Validator = require('../dist/index.js')
		assert.equal(Validator.ErrorCodes.REQUIRED, 'REQUIRED')
	})
	test('every emitted code is a declared constant', () => {
		const declared = new Set(Object.values(ErrorCodes))
		const samples = [
			[{ a: 'string' }, { a: 1 }],
			[{ a: 'natural' }, { a: -1 }],
			[{ a: 'email' }, { a: 'x' }],
			[{ a: 'array|size:2' }, { a: [] }],
			[{ a: 'enums:x' }, { a: 'z' }],
			[{ a: 'string' }, {}],
			[{ a: 'string' }, null],
			[{ a: ['string', 3] }, { a: 'x' }],
		]
		for (const [rules, data] of samples) {
			for (const code of codesOf(rules, data)) {
				assert.ok(declared.has(code), `${code} is not declared in ErrorCodes`)
			}
		}
	})
})

describe('nested paths carry codes', () => {
	test('nested object leaf', () =>
		assert.equal(codeOf({ a: { b: 'email' } }, { a: { b: 'bad' } }), ErrorCodes.NOT_EMAIL))
	test('array of objects leaf', () =>
		assert.equal(codeOf({ u: [{ n: 'natural' }] }, { u: [{ n: -1 }] }), ErrorCodes.NOT_NATURAL))
	test('arrayof element', () =>
		assert.equal(codeOf({ a: 'arrayof:email' }, { a: ['bad'] }), ErrorCodes.NOT_EMAIL))
	test('dot-notation key', () =>
		assert.equal(codeOf({ 'a.b': 'email' }, { a: { b: 'bad' } }), ErrorCodes.NOT_EMAIL))
})

describe('INTERNAL_ERROR path', () => {
	const quiet = (fn) => {
		const log = console.log
		console.log = () => {}
		try {
			return fn()
		} finally {
			console.log = log
		}
	}

	test('a malformed regex rule reports INTERNAL_ERROR', () => {
		const { errors, details } = quiet(() => validate({ a: 'regex:/[/' }, { a: 'x' }))
		assert.deepEqual(errors, ['error occurred while data validation'])
		assert.deepEqual(details, [
			{ message: 'error occurred while data validation', code: ErrorCodes.INTERNAL_ERROR },
		])
	})

	test('a throwing getter reports INTERNAL_ERROR rather than escaping', () => {
		const data = {
			get a() {
				throw new Error('boom')
			},
		}
		const { details } = quiet(() => validate({ a: 'string' }, data))
		assert.equal(details[0].code, ErrorCodes.INTERNAL_ERROR)
	})

	test('errors and details stay aligned on the internal path', () => {
		const { errors, details } = quiet(() => validate({ a: 'regex:/[/' }, { a: 'x' }))
		assert.equal(details.length, errors.length)
		assert.equal(details[0].message, errors[0])
	})
})

describe('codes for every array element, not just the first', () => {
	test('arrayof reports one detail per failing element', () =>
		assert.deepEqual(codesOf({ f: 'arrayof:email' }, { f: ['bad', 'a@b.com', 'worse'] }), [
			ErrorCodes.NOT_EMAIL,
			ErrorCodes.NOT_EMAIL,
		]))
	test('arrayof constraint per element', () =>
		assert.deepEqual(codesOf({ f: 'arrayof:max:2' }, { f: ['abc', 'de', 'fghi'] }), [
			ErrorCodes.TOO_LONG,
			ErrorCodes.TOO_LONG,
		]))
	test('arrayof against a non-array reports NOT_ARRAY once', () =>
		assert.deepEqual(codesOf({ f: 'arrayof:string' }, { f: 'nope' }), [ErrorCodes.NOT_ARRAY]))
	test('element messages carry the index', () => {
		const { details } = validate({ f: 'arrayof:email' }, { f: ['bad'] })
		assert.match(details[0].message, /^f\[0\]/)
	})
})

describe('codes survive deep nesting', () => {
	test('three-level object', () =>
		assert.deepEqual(codesOf({ a: { b: { c: 'email' } } }, { a: { b: { c: 'bad' } } }), [ErrorCodes.NOT_EMAIL]))
	test('array of objects inside an object', () =>
		assert.deepEqual(codesOf({ a: { u: [{ n: 'natural' }] } }, { a: { u: [{ n: -1 }] } }), [
			ErrorCodes.NOT_NATURAL,
		]))
	test('object nested inside an array of objects', () =>
		assert.deepEqual(codesOf({ u: [{ a: { b: 'email' } }] }, { u: [{ a: { b: 'bad' } }] }), [
			ErrorCodes.NOT_EMAIL,
		]))
})

describe('distinct codes are never collapsed by de-duplication', () => {
	test('date and dateonly share a message but both survive', () => {
		const { errors, details } = validate({ a: 'date', b: 'dateonly' }, { a: 'bad', b: 'bad' })
		assert.equal(errors.length, 2)
		assert.deepEqual(
			details.map((d) => d.code),
			[ErrorCodes.NOT_DATE, ErrorCodes.NOT_DATEONLY]
		)
	})
	test('enums and regex share a message but both survive', () =>
		assert.deepEqual(codesOf({ a: 'enums:x', b: 'regex:/^z$/' }, { a: 'q', b: 'q' }), [
			ErrorCodes.ENUM_MISMATCH,
			ErrorCodes.REGEX_MISMATCH,
		]))
})

describe('order is preserved across mixed failure kinds', () => {
	test('codes follow rule declaration order', () =>
		assert.deepEqual(
			codesOf(
				{ a: 'string', b: 'natural', c: 'email', d: 'array|min:2', e: 'enums:x' },
				{ a: 1, b: -1, c: 'bad', d: [], e: 'q' }
			),
			[
				ErrorCodes.NOT_STRING,
				ErrorCodes.NOT_NATURAL,
				ErrorCodes.NOT_EMAIL,
				ErrorCodes.TOO_SHORT,
				ErrorCodes.ENUM_MISMATCH,
			]
		))
})
