const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { validate } = require('../dist/index.js')

const errorsOf = (rules, data) => validate(rules, data).errors

describe('non-string entries in an array rule throw', () => {
	const badEntries = [
		['a RegExp literal', /123456/i],
		['a number', 3],
		['null', null],
		['an object', {}],
		['an array', []],
	]

	for (const [label, bad] of badEntries) {
		test(`${label} throws InvalidRuleError`, () => {
			assert.throws(() => validate({ f: ['string', bad] }, { f: 'abc' }), {
				name: 'InvalidRuleError',
				message: /every rule in the array must be a string/,
			})
		})
	}

	test('the thrown message names the offending field', () => {
		assert.throws(() => validate({ password: ['string', /x/] }, { password: 'a' }), /'password'/)
	})

	test('a nested field is named by its full path', () => {
		assert.throws(() => validate({ a: { b: ['string', 3] } }, { a: { b: 'x' } }), /'a\.b'/)
	})

	test('never returns the opaque catch-all instead of throwing', () => {
		for (const [, bad] of badEntries) {
			let returned
			try {
				returned = errorsOf({ f: ['string', bad] }, { f: 'abc' })
			} catch (e) {
				assert.equal(e.name, 'InvalidRuleError')
				continue
			}
			assert.fail(`expected a throw, got ${JSON.stringify(returned)}`)
		}
	})

	test('a valid all-string array still works', () =>
		assert.equal(errorsOf({ f: ['string', 'min:3'] }, { f: 'abcd' }), undefined))

	test('the documented regex-as-string form still works', () =>
		assert.deepEqual(errorsOf({ f: ['string', 'regex:/^[0-9]+$/'] }, { f: 'abc' }), ['f is invalid']))
})
