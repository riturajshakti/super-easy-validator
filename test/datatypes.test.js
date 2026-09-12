const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { validate } = require('../dist/index.js')

const errorsOf = (rules, data, config) => validate(rules, data, config).errors
const ok = (rules, data, config) => assert.equal(errorsOf(rules, data, config), undefined)
const fails = (rules, data, expected, config) => assert.deepEqual(errorsOf(rules, data, config), expected)

describe('string', () => {
	test('accepts a string', () => ok({ f: 'string' }, { f: 'hello' }))
	test('accepts an empty string', () => ok({ f: 'string' }, { f: '' }))
	test('rejects a number', () => fails({ f: 'string' }, { f: 1 }, ['f must be string']))
	test('rejects a boolean', () => fails({ f: 'string' }, { f: true }, ['f must be string']))
	test('reports missing as required', () => fails({ f: 'string' }, {}, ['f is required']))
	test('reports null as required', () => fails({ f: 'string' }, { f: null }, ['f is required']))
})

describe('number', () => {
	test('accepts a number', () => ok({ f: 'number' }, { f: 42 }))
	test('accepts zero', () => ok({ f: 'number' }, { f: 0 }))
	test('accepts a negative', () => ok({ f: 'number' }, { f: -7.5 }))
	test('rejects a numeric string without string rule', () =>
		fails({ f: 'number' }, { f: '42' }, ['f must be a valid number']))
	test('string|number accepts a numeric string', () => ok({ f: 'string|number' }, { f: '42' }))
	test('string|number rejects a non-numeric string', () =>
		fails({ f: 'string|number' }, { f: 'abc' }, ['f must be a valid numeric string']))
})

describe('boolean', () => {
	test('accepts true', () => ok({ f: 'boolean' }, { f: true }))
	test('accepts false', () => ok({ f: 'boolean' }, { f: false }))
	test('rejects a boolean string without string rule', () =>
		fails({ f: 'boolean' }, { f: 'true' }, ['f must be a valid boolean']))
	test('string|boolean accepts "true"', () => ok({ f: 'string|boolean' }, { f: 'true' }))
	test('string|boolean accepts "false"', () => ok({ f: 'string|boolean' }, { f: 'false' }))
	test('string|boolean rejects "yes"', () =>
		fails({ f: 'string|boolean' }, { f: 'yes' }, ['f must be a valid boolean string']))
})

describe('array', () => {
	test('accepts an array', () => ok({ f: 'array' }, { f: [1, 2] }))
	test('accepts an empty array', () => ok({ f: 'array' }, { f: [] }))
	test('rejects an object', () => fails({ f: 'array' }, { f: {} }, ['f must be an array']))
	test('rejects a string', () => fails({ f: 'array' }, { f: 'ab' }, ['f must be an array']))
})

describe('object', () => {
	test('accepts an object', () => ok({ f: 'object' }, { f: { a: 1 } }))
	test('rejects an array', () => fails({ f: 'object' }, { f: [] }, ['f must be an object']))
	test('rejects a string', () => fails({ f: 'object' }, { f: 'x' }, ['f must be an object']))
})

describe('bigint', () => {
	test('accepts a bigint', () => ok({ f: 'bigint' }, { f: 10n }))
	test('rejects a number', () => fails({ f: 'bigint' }, { f: 10 }, ['f must be bigint']))
})

describe('symbol (regression: bare symbol rule was never dispatched)', () => {
	test('accepts a symbol', () => ok({ f: 'symbol' }, { f: Symbol('x') }))
	test('rejects a string', () => fails({ f: 'symbol' }, { f: 'nope' }, ['f must be symbol']))
	test('rejects a number', () => fails({ f: 'symbol' }, { f: 1 }, ['f must be symbol']))
	test('optional|symbol allows absent', () => ok({ f: 'optional|symbol' }, {}))
	test('arrayof:symbol still works', () =>
		fails({ f: 'arrayof:symbol' }, { f: ['a'] }, ['f[0] must be symbol']))
})
