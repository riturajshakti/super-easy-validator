const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { validate } = require('../dist/index.js')

const errorsOf = (rules, data) => validate(rules, data).errors
const ok = (rules, data) => assert.equal(errorsOf(rules, data), undefined)
const fails = (rules, data, expected) => assert.deepEqual(errorsOf(rules, data), expected)

describe('equal', () => {
	test('matches a string', () => ok({ f: 'string|equal:sia' }, { f: 'sia' }))
	test('rejects a different string', () =>
		fails({ f: 'string|equal:sia' }, { f: 'bob' }, ['f must be equal to sia']))
	test('matches a number', () => ok({ f: 'number|equal:100' }, { f: 100 }))
	test('rejects a different number', () =>
		fails({ f: 'number|equal:100' }, { f: 99 }, ['f must be equal to 100']))
	test('matches a boolean', () => ok({ f: 'boolean|equal:true' }, { f: true }))
	test('rejects a different boolean', () =>
		fails({ f: 'boolean|equal:true' }, { f: false }, ['f must be equal to true']))
})

describe('size', () => {
	test('array of exact length', () => ok({ f: 'array|size:3' }, { f: [1, 2, 3] }))
	test('array of wrong length', () =>
		fails({ f: 'array|size:3' }, { f: [1] }, ['f must have length 3']))
	test('string of exact length', () => ok({ f: 'string|size:4' }, { f: 'abcd' }))
	test('string of wrong length', () =>
		fails({ f: 'string|size:4' }, { f: 'ab' }, ['f must have length 4']))
	test('number digit count', () => ok({ f: 'number|size:5' }, { f: 12345 }))
	test('number wrong digit count', () =>
		fails({ f: 'number|size:5' }, { f: 12 }, ['f must have 5 digits']))
	test('numeric string digit count', () => ok({ f: 'string|natural|size:6' }, { f: '829119' }))
})

describe('min', () => {
	test('array length at least', () => ok({ f: 'array|min:2' }, { f: [1, 2] }))
	test('array too short', () =>
		fails({ f: 'array|min:3' }, { f: [1] }, ['f must have length of at least 3']))
	test('string length at least', () => ok({ f: 'string|min:3' }, { f: 'abc' }))
	test('string too short', () =>
		fails({ f: 'string|min:3' }, { f: 'ab' }, ['f must have length of at least 3']))
	test('number at least', () => ok({ f: 'number|min:5' }, { f: 5 }))
	test('number below min', () => fails({ f: 'number|min:5' }, { f: 4 }, ['f must be at least 5']))
	test('numeric string below min', () =>
		fails({ f: 'string|natural|min:100' }, { f: '90' }, ['f must be at least 100']))
	test('date at least', () => ok({ f: 'date|min:2020-01-01' }, { f: '2023-06-15' }))
	test('date before min', () => {
		const errors = errorsOf({ f: 'date|min:2020-01-01' }, { f: '2019-06-15' })
		assert.equal(errors.length, 1)
		assert.match(errors[0], /^f must be at least 2020-01-01/)
	})
})

describe('max', () => {
	test('array length at most', () => ok({ f: 'array|max:3' }, { f: [1, 2] }))
	test('array too long', () =>
		fails({ f: 'array|max:2' }, { f: [1, 2, 3] }, ['f must have length of at most 2']))
	test('string length at most', () => ok({ f: 'string|max:5' }, { f: 'abc' }))
	test('string too long', () =>
		fails({ f: 'string|max:2' }, { f: 'abcd' }, ['f must have length of at most 2']))
	test('number at most', () => ok({ f: 'number|max:100' }, { f: 100 }))
	test('number above max', () => fails({ f: 'number|max:10' }, { f: 11 }, ['f must be at most 10']))
})

describe('regex', () => {
	test('matches', () => ok({ f: 'string|regex:/^[0-9]{16}$/' }, { f: '1987654312345678' }))
	test('does not match', () =>
		fails({ f: 'string|regex:/^[0-9]{16}$/' }, { f: '123' }, ['f is invalid']))
	test('honours flags', () => ok({ f: 'regex:/^[A-Z]+$/i' }, { f: 'abc' }))
	test('array form allows a pipe inside the pattern', () =>
		ok({ f: ['string', 'regex:/^(male)|(female)$/'] }, { f: 'male' }))
	test('rejects a non-string', () =>
		fails({ f: 'regex:/^a$/' }, { f: 5 }, ['f must be of type string']))
})

describe('decimalsize', () => {
	test('number with exact decimals', () => ok({ f: 'number|decimalsize:2' }, { f: 10.25 }))
	test('number with wrong decimals', () =>
		fails({ f: 'number|decimalsize:2' }, { f: 100.345 }, ['f must have 2 decimal places']))
	test('numeric string keeps trailing zeroes', () =>
		ok({ f: 'string|number|decimalsize:2' }, { f: '10.50' }))
	test('documented caveat: number drops trailing zeroes', () =>
		fails({ f: 'number|decimalsize:3' }, { f: 23.34 }, ['f must have 3 decimal places']))
})

describe('decimalmin', () => {
	test('meets the minimum', () => ok({ f: 'number|decimalmin:2' }, { f: 1.234 }))
	test('below the minimum', () =>
		fails({ f: 'number|decimalmin:3' }, { f: 1.2 }, ['f must have at least 3 decimal places']))
})

describe('decimalmax', () => {
	test('within the maximum', () => ok({ f: 'number|decimalmax:3' }, { f: 1.22 }))
	test('above the maximum', () =>
		fails({ f: 'number|decimalmax:2' }, { f: 1.2345 }, ['f must have at most 2 decimal places']))
})

describe('enums', () => {
	test('matches a string enum', () => ok({ f: 'enums:male,female' }, { f: 'male' }))
	test('rejects an unlisted string', () => fails({ f: 'enums:male,female' }, { f: 'Male' }, ['f is invalid']))
	test('matches a number enum', () => ok({ f: 'number|enums:1,2,3,4,5' }, { f: 4 }))
	test('rejects an unlisted number', () =>
		fails({ f: 'number|enums:1,2,3,4,5' }, { f: 4.5 }, ['f is invalid']))
	test('matches a boolean enum', () => ok({ f: 'enums:true,false' }, { f: true }))
	test('auto-applies the string check', () => ok({ f: 'enums:a,b' }, { f: 'a' }))
})
