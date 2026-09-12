const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { validate } = require('../dist/index.js')

const errorsOf = (rules, data) => validate(rules, data).errors

describe('regression: non-string entries in an array rule', () => {
	const message = 'f has an invalid rule: every rule in the array must be a string'

	test('a RegExp literal reports a clear error instead of crashing', () =>
		assert.deepEqual(errorsOf({ f: ['string', /123456/i] }, { f: 'abc' }), [message]))

	test('a number reports a clear error', () =>
		assert.deepEqual(errorsOf({ f: ['string', 3] }, { f: 'abc' }), [message]))

	test('null reports a clear error', () =>
		assert.deepEqual(errorsOf({ f: ['string', null] }, { f: 'abc' }), [message]))

	test('an object reports a clear error', () =>
		assert.deepEqual(errorsOf({ f: ['string', {}] }, { f: 'abc' }), [message]))

	test('never surfaces the opaque catch-all message', () => {
		for (const bad of [/x/, 3, null, {}, []]) {
			const errors = errorsOf({ f: ['string', bad] }, { f: 'abc' })
			assert.ok(
				!errors.includes('error occurred while data validation'),
				`opaque message leaked for ${String(bad)}`
			)
		}
	})

	test('a valid all-string array still works', () =>
		assert.equal(errorsOf({ f: ['string', 'min:3'] }, { f: 'abcd' }), undefined))

	test('the documented regex-as-string form still works', () =>
		assert.deepEqual(errorsOf({ f: ['string', 'regex:/^[0-9]+$/'] }, { f: 'abc' }), ['f is invalid']))
})
