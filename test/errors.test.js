const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const Validator = require('../dist/index.js')
const { validate } = require('../dist/index.js')

const errorsOf = (rules, data, config) => validate(rules, data, config).errors
const fails = (rules, data, expected, config) => assert.deepEqual(errorsOf(rules, data, config), expected)

describe('field:', () => {
	test('renames the field in the message', () =>
		fails({ age: 'natural|field:person age' }, { age: 4.5 }, ['person age must be a valid natural number']))
	test('applies to required messages too', () =>
		fails({ age: 'natural|field:person age' }, {}, ['person age is required']))
})

describe('error:', () => {
	test('replaces the whole message', () =>
		fails({ age: 'natural|error:given age is not valid' }, { age: 4.5 }, ['given age is not valid']))
	test('array form allows a pipe inside the message', () =>
		fails({ name: ['name', 'error:bad name | pick another'] }, { name: '123' }, [
			'bad name | pick another',
		]))
})

describe('quotes', () => {
	const rules = { name: 'name', age: 'natural' }
	const data = { name: '...', age: -7 }

	test('none is the default', () =>
		fails(rules, data, ['name must be a valid name', 'age must be a valid natural number']))
	test('single-quotes', () =>
		fails(rules, data, ["'name' must be a valid name", "'age' must be a valid natural number"], {
			quotes: 'single-quotes',
		}))
	test('double-quotes', () =>
		fails(rules, data, ['"name" must be a valid name', '"age" must be a valid natural number'], {
			quotes: 'double-quotes',
		}))
	test('backtick', () =>
		fails(rules, data, ['`name` must be a valid name', '`age` must be a valid natural number'], {
			quotes: 'backtick',
		}))
})

describe('result shape', () => {
	test('errors is undefined when valid', () =>
		assert.equal(validate({ f: 'string' }, { f: 'x' }).errors, undefined))
	test('errors is an array when invalid', () =>
		assert.ok(Array.isArray(validate({ f: 'string' }, { f: 1 }).errors)))
	test('duplicate messages are de-duplicated', () => {
		const errors = errorsOf({ a: 'string|error:same', b: 'string|error:same' }, { a: 1, b: 2 })
		assert.deepEqual(errors, ['same'])
	})
	test('one field reports at most one error', () =>
		fails({ f: 'string|min:5|max:2' }, { f: 1 }, ['f must be string']))
})

describe('module surface', () => {
	test('default export exposes validate', () => assert.equal(typeof Validator.validate, 'function'))
	test('named export is the same function', () => assert.equal(Validator.validate, validate))
	test('.default interop points at the same object', () =>
		assert.equal(Validator.default.validate, validate))
})
