const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { validate } = require('../dist/index.js')

const errorsOf = (rules, data) => validate(rules, data).errors
const ok = (rules, data) => assert.equal(errorsOf(rules, data), undefined)
const fails = (rules, data, expected) => assert.deepEqual(errorsOf(rules, data), expected)

describe('int', () => {
	test('accepts an integer', () => ok({ f: 'int' }, { f: 42 }))
	test('accepts a negative integer', () => ok({ f: 'int' }, { f: -42 }))
	test('accepts zero', () => ok({ f: 'int' }, { f: 0 }))
	test('rejects a float', () => fails({ f: 'int' }, { f: 4.5 }, ['f must be a valid integer']))
	test('auto-applies the number check', () =>
		fails({ f: 'int' }, { f: 'x' }, ['f must be a valid number']))
	test('string|int accepts an integer string', () => ok({ f: 'string|int' }, { f: '42' }))
	test('string|int rejects a float string', () =>
		fails({ f: 'string|int' }, { f: '4.5' }, ['f must be a valid integer string']))
})

describe('positive', () => {
	test('accepts a positive number', () => ok({ f: 'positive' }, { f: 1 }))
	test('accepts a positive float', () => ok({ f: 'positive' }, { f: 0.5 }))
	test('rejects zero', () => fails({ f: 'positive' }, { f: 0 }, ['f must be a valid positive number']))
	test('rejects a negative', () => fails({ f: 'positive' }, { f: -1 }, ['f must be a valid positive number']))
	test('string|positive accepts "5"', () => ok({ f: 'string|positive' }, { f: '5' }))
})

describe('negative', () => {
	test('accepts a negative number', () => ok({ f: 'negative' }, { f: -1 }))
	test('rejects zero', () => fails({ f: 'negative' }, { f: 0 }, ['f must be a valid negative number']))
	test('rejects a positive', () => fails({ f: 'negative' }, { f: 1 }, ['f must be a valid negative number']))
})

describe('natural', () => {
	test('accepts a positive integer', () => ok({ f: 'natural' }, { f: 5 }))
	test('rejects zero', () => fails({ f: 'natural' }, { f: 0 }, ['f must be a valid natural number']))
	test('rejects a negative', () => fails({ f: 'natural' }, { f: -5 }, ['f must be a valid natural number']))
	test('rejects a float', () => fails({ f: 'natural' }, { f: 4.5 }, ['f must be a valid natural number']))
	test('string|natural accepts "6"', () => ok({ f: 'string|natural' }, { f: '6' }))
	test('string|natural rejects "0"', () =>
		fails({ f: 'string|natural' }, { f: '0' }, ['f must be a valid natural numeric string']))
})

describe('whole', () => {
	test('accepts a positive integer', () => ok({ f: 'whole' }, { f: 5 }))
	test('accepts zero', () => ok({ f: 'whole' }, { f: 0 }))
	test('rejects a negative', () => fails({ f: 'whole' }, { f: -1 }, ['f must be a valid whole number']))
	test('rejects a float', () => fails({ f: 'whole' }, { f: 234.5 }, ['f must be a valid whole number']))
})
