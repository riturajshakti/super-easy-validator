const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const Validator = require('../dist/index.js')
const { validate } = require('../dist/index.js')

describe('the pre-details API is unchanged', () => {
	test('destructuring only errors still works', () => {
		const { errors } = validate({ a: 'string' }, { a: 1 })
		assert.deepEqual(errors, ['a must be string'])
	})

	test('errors is undefined on success, so if (errors) still works', () => {
		const { errors } = validate({ a: 'string' }, { a: 'x' })
		assert.equal(errors, undefined)
		assert.ok(!errors)
	})

	test('errors is a plain array of strings, not objects', () => {
		const { errors } = validate({ a: 'string', b: 'number' }, { a: 1, b: 'x' })
		assert.ok(Array.isArray(errors))
		for (const e of errors) {
			assert.equal(typeof e, 'string')
		}
	})

	test('errors[0] is usable directly as a message', () => {
		const { errors } = validate({ email: 'email' }, { email: 'bad' })
		assert.equal(errors[0], 'email must be a valid email')
	})

	test('adding details did not change any message text', () => {
		const { errors } = validate(
			{
				name: 'name',
				age: 'natural|min:18',
				email: 'optional|email',
				tags: 'array|min:2',
				addr: { city: 'name' },
				users: [{ n: 'name' }],
			},
			{ name: '123', age: 5, email: 'bad', tags: [1], addr: { city: '!' }, users: [{}] }
		)
		assert.deepEqual(errors, [
			'name must be a valid name',
			'age must be at least 18',
			'email must be a valid email',
			'tags must have length of at least 2',
			'addr.city must be a valid name',
			'users[0].n is required',
		])
	})

	test('the module default export still exposes validate', () =>
		assert.equal(typeof Validator.validate, 'function'))

	test('named and default validate are the same function', () =>
		assert.equal(Validator.validate, validate))

	test('.default interop still works', () =>
		assert.equal(typeof Validator.default.validate, 'function'))

	test('quotes option still applies to errors', () => {
		const { errors } = validate({ a: 'name' }, { a: '123' }, { quotes: 'backtick' })
		assert.deepEqual(errors, ['`a` must be a valid name'])
	})

	test('strict option still works', () => {
		const { errors } = validate({ a: 'string' }, { a: 'x', b: 1 }, { strict: true })
		assert.deepEqual(errors, ['b is not required'])
	})

	test('field: and error: still work', () => {
		assert.deepEqual(validate({ a: 'natural|field:the age' }, { a: -1 }).errors, [
			'the age must be a valid natural number',
		])
		assert.deepEqual(validate({ a: 'natural|error:custom' }, { a: -1 }).errors, ['custom'])
	})

	test('de-duplication of errors is unchanged', () => {
		const { errors } = validate({ a: 'string|error:same', b: 'string|error:same' }, { a: 1, b: 2 })
		assert.deepEqual(errors, ['same'])
	})

	test('a third argument is still optional', () => {
		assert.equal(validate({ a: 'string' }, { a: 'x' }).errors, undefined)
	})

	test('ignoring details entirely is safe', () => {
		const result = validate({ a: 'string' }, { a: 1 })
		assert.equal(result.errors.length, 1)
	})
})
