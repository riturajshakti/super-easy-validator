const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const path = require('node:path')

const dist = path.join(__dirname, '..', 'dist', 'index.js')

function runScript(body) {
	return execFileSync(process.execPath, ['-e', body], { encoding: 'utf8', stderr: 'pipe' })
}

function warningsFrom(body) {
	const script = `
		const { validate } = require(${JSON.stringify(dist)})
		const lines = []
		console.warn = (m) => lines.push(m)
		${body}
		console.log(JSON.stringify(lines))
	`
	return JSON.parse(runScript(script).trim())
}

describe('objectid accepts the same values mongoid did', () => {
	const { validate } = require('../dist/index.js')
	const errorsOf = (rule, v) => validate({ f: rule }, { f: v }).errors

	test('accepts a 24-char hex string', () =>
		assert.equal(errorsOf('objectid', '507f1f77bcf86cd799439011'), undefined))
	test('accepts all zeroes', () => assert.equal(errorsOf('objectid', '000000000000000000000000'), undefined))
	test('accepts uppercase hex', () =>
		assert.equal(errorsOf('objectid', '507F1F77BCF86CD799439011'), undefined))
	test('rejects 23 chars', () =>
		assert.deepEqual(errorsOf('objectid', '507f1f77bcf86cd79943901'), ['f must be a valid object id']))
	test('rejects 25 chars', () =>
		assert.deepEqual(errorsOf('objectid', '507f1f77bcf86cd7994390111'), ['f must be a valid object id']))
	test('rejects non-hex characters', () =>
		assert.deepEqual(errorsOf('objectid', 'zzzf1f77bcf86cd799439011'), ['f must be a valid object id']))
	test('auto-applies the string check', () =>
		assert.deepEqual(errorsOf('objectid', 12345), ['f must be string']))
	test('works inside arrayof', () =>
		assert.deepEqual(validate({ f: 'arrayof:objectid' }, { f: ['bad'] }).errors, [
			'f[0] must be a valid object id',
		]))
	test('mongoid and objectid share one error message', () =>
		assert.deepEqual(errorsOf('mongoid', 'bad'), errorsOf('objectid', 'bad')))
})

describe('mongoid deprecation warning', () => {
	test('mongoid warns', () => {
		const warnings = warningsFrom(`validate({ f: 'mongoid' }, { f: '507f1f77bcf86cd799439011' })`)
		assert.equal(warnings.length, 1)
		assert.match(warnings[0], /'mongoid' rule is deprecated/)
		assert.match(warnings[0], /Use 'objectid' instead/)
	})

	test('objectid does not warn', () => {
		const warnings = warningsFrom(`validate({ f: 'objectid' }, { f: '507f1f77bcf86cd799439011' })`)
		assert.deepEqual(warnings, [])
	})

	test('warns only once per process, not once per call', () => {
		const warnings = warningsFrom(`
			for (let i = 0; i < 50; i++) {
				validate({ f: 'mongoid' }, { f: '507f1f77bcf86cd799439011' })
			}
		`)
		assert.equal(warnings.length, 1, 'a per-request validator must not flood logs')
	})

	test('warns for an invalid value too, not just a valid one', () => {
		const warnings = warningsFrom(`validate({ f: 'mongoid' }, { f: 'not-an-id' })`)
		assert.equal(warnings.length, 1)
	})

	test('warns when used inside arrayof', () => {
		const warnings = warningsFrom(`validate({ f: 'arrayof:mongoid' }, { f: ['507f1f77bcf86cd799439011'] })`)
		assert.equal(warnings.length, 1)
	})

	test('no warning is emitted when mongoid is never used', () => {
		const warnings = warningsFrom(`validate({ f: 'email' }, { f: 'a@b.com' })`)
		assert.deepEqual(warnings, [])
	})
})
