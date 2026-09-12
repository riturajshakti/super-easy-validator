const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { validate } = require('../dist/index.js')

const errorsOf = (rules, data, config) => validate(rules, data, config).errors
const ok = (rules, data, config) => assert.equal(errorsOf(rules, data, config), undefined)
const fails = (rules, data, expected, config) => assert.deepEqual(errorsOf(rules, data, config), expected)

describe('optional and nullable', () => {
	test('optional allows an absent field', () => ok({ f: 'optional|string' }, {}))
	test('optional still validates a present field', () =>
		fails({ f: 'optional|string' }, { f: 1 }, ['f must be string']))
	test('optional does not allow null', () => fails({ f: 'optional|string' }, { f: null }, ['f is required']))
	test('nullable allows null', () => ok({ f: 'nullable|string' }, { f: null }))
	test('nullable does not allow absent', () => fails({ f: 'nullable|string' }, {}, ['f is required']))
	test('optional|nullable allows both', () => {
		ok({ f: 'optional|nullable|string' }, {})
		ok({ f: 'optional|nullable|string' }, { f: null })
	})
})

describe('arrayof', () => {
	test('each element is a string', () => ok({ f: 'arrayof:string' }, { f: ['a', 'b'] }))
	test('reports the offending index', () =>
		fails({ f: 'arrayof:string' }, { f: ['a', 1] }, ['f[1] must be string']))
	test('applies a constraint per element', () =>
		fails({ f: 'arrayof:max:10' }, { f: ['ok', 'this one is far too long'] }, [
			'f[1] must have length of at most 10',
		]))
	test('arrayof:optional skips undefined holes', () =>
		ok({ f: 'arrayof:optional|arrayof:email' }, { f: ['a@b.com', undefined] }))
	test('rejects a non-array', () => fails({ f: 'arrayof:string' }, { f: 'ab' }, ['f must be an array']))
	test('combines with array-level constraints', () =>
		fails({ f: 'array|min:3|arrayof:string' }, { f: ['a'] }, ['f must have length of at least 3']))
	test('numeric string elements', () =>
		ok({ f: 'arrayof:string|arrayof:natural' }, { f: ['1', '2'] }))
})

describe('nested objects', () => {
	const rules = { address: { city: 'name', country: { code: 'alpha|upper|size:2' } } }

	test('accepts a valid nested object', () =>
		ok(rules, { address: { city: 'Rock Port', country: { code: 'IN' } } }))
	test('labels errors with a dotted path', () =>
		fails(rules, { address: { city: 'Rock Port', country: { code: 'in' } } }, [
			'address.country.code must not contains lower case letters',
		]))
	test('reports a missing deep field', () =>
		fails(rules, { address: { city: 'Rock Port', country: {} } }, ['address.country.code is required']))
	test('regression: null nested object reports required, not a type error', () =>
		fails(rules, { address: null }, ['address is required']))
	test('absent nested object reports required', () => fails(rules, {}, ['address is required']))
	test('non-object reports a type error', () =>
		fails(rules, { address: 'x' }, ['address must be of type object']))
	test('dot-notation keys work', () =>
		fails({ person: 'object', 'person.address': 'string' }, {}, [
			'person is required',
			'person.address is required',
		]))
})

describe('array of objects', () => {
	const rules = { users: [{ name: 'name', age: 'natural' }] }

	test('accepts a valid list', () => ok(rules, { users: [{ name: 'John Doe', age: 20 }] }))
	test('accepts an empty list', () => ok(rules, { users: [] }))
	test('labels errors with an index', () =>
		fails(rules, { users: [{ name: 'John Doe', age: 20 }, {}] }, [
			'users[1].name is required',
			'users[1].age is required',
		]))
	test('regression: empty string reports a type error, not required', () =>
		fails(rules, { users: '' }, ['users must be of type array']))
	test('regression: zero reports a type error, not required', () =>
		fails(rules, { users: 0 }, ['users must be of type array']))
	test('regression: false reports a type error, not required', () =>
		fails(rules, { users: false }, ['users must be of type array']))
	test('null reports required', () => fails(rules, { users: null }, ['users is required']))
	test('absent reports required', () => fails(rules, {}, ['users is required']))
})

describe('$atleast', () => {
	const rules = { mail: 'optional|email', phone: 'optional|phone', $atleast: 'mail|phone' }

	test('passes when one is present', () => ok(rules, { mail: 'a@b.com' }))
	test('fails when none are present', () =>
		fails(rules, {}, ['at least one of mail and phone is required']))
	test('honours size:', () => {
		const sized = {
			a: 'optional|string',
			b: 'optional|string',
			c: 'optional|string',
			$atleast: 'a|b|c|size:2',
		}
		ok(sized, { a: 'x', b: 'y' })
		fails(sized, { a: 'x' }, ['at least 2 of a, b and c are required'])
	})
	test('supports multiple groups', () => {
		const grouped = {
			a: 'optional|string',
			b: 'optional|string',
			x: 'optional|string',
			y: 'optional|string',
			$atleast: ['a|b', 'x|y'],
		}
		ok(grouped, { a: '1', x: '2' })
		assert.equal(errorsOf(grouped, {}).length, 2)
	})
})

describe('$atmost', () => {
	const rules = { mail: 'optional|email', phone: 'optional|phone', $atmost: 'mail|phone' }

	test('passes with one present', () => ok(rules, { mail: 'a@b.com' }))
	test('passes with none present', () => ok(rules, {}))
	test('fails when too many are present', () =>
		fails(rules, { mail: 'a@b.com', phone: '9876543210' }, [
			'at most one of mail and phone can be given',
		]))
	test('honours size:', () => {
		const sized = {
			a: 'optional|string',
			b: 'optional|string',
			c: 'optional|string',
			$atmost: 'a|b|c|size:2',
		}
		ok(sized, { a: 'x', b: 'y' })
		fails(sized, { a: 'x', b: 'y', c: 'z' }, ['at most 2 of a, b and c can be given'])
	})
})

describe('strict mode', () => {
	const rules = { name: 'name', age: 'natural' }

	test('rejects an extra field', () =>
		fails(rules, { name: 'john doe', age: 30, hobby: 'code' }, ['hobby is not required'], {
			strict: true,
		}))
	test('allows exactly the declared fields', () =>
		ok(rules, { name: 'john doe', age: 30 }, { strict: true }))
	test('is off by default', () => ok(rules, { name: 'john doe', age: 30, hobby: 'code' }))
	test('applies to nested objects', () =>
		fails(
			{ address: { city: 'name' } },
			{ address: { city: 'Rock Port', extra: 1 } },
			['address.extra is not required'],
			{ strict: true }
		))
})
