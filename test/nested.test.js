const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { validate } = require('../dist/index.js')

const errorsOf = (rules, data, config) => validate(rules, data, config).errors
const ok = (rules, data, config) => assert.equal(errorsOf(rules, data, config), undefined)
const fails = (rules, data, expected, config) => assert.deepEqual(errorsOf(rules, data, config), expected)

describe('nested arrayof: validates inner elements', () => {
	const rules = { m: 'arrayof:arrayof:number' }

	test('accepts a valid grid', () => ok(rules, { m: [[1, 2], [3]] }))
	test('accepts empty inner arrays', () => ok(rules, { m: [[], []] }))
	test('accepts an empty outer array', () => ok(rules, { m: [] }))
	test('rejects a bad inner element', () =>
		fails(rules, { m: [[1], ['x']] }, ['m[1][0] must be a valid number']))
	test('rejects a non-array inner value', () => fails(rules, { m: [1] }, ['m[0] must be an array']))
	test('reports each failing inner element', () => {
		const errors = errorsOf(rules, { m: [['a'], ['b']] })
		assert.deepEqual(errors, ['m[0][0] must be a valid number', 'm[1][0] must be a valid number'])
	})
})

describe('nested arrayof: three levels', () => {
	const rules = { m: 'arrayof:arrayof:arrayof:number' }

	test('accepts a valid cube', () => ok(rules, { m: [[[1]], [[2, 3]]] }))
	test('rejects at the deepest level', () =>
		fails(rules, { m: [[['x']]] }, ['m[0][0][0] must be a valid number']))
})

describe('nested arrayof: specific string types', () => {
	test('arrayof:arrayof:email', () =>
		fails({ m: 'arrayof:arrayof:email' }, { m: [['bad']] }, ['m[0][0] must be a valid email']))
	test('arrayof:arrayof:objectid', () =>
		ok({ m: 'arrayof:arrayof:objectid' }, { m: [['507f1f77bcf86cd799439011']] }))
	test('arrayof:arrayof with a constraint', () =>
		fails({ m: 'arrayof:arrayof:max:2' }, { m: [['abcd']] }, ['m[0][0] must have length of at most 2']))
})

describe('path labels: arrayof inside an object', () => {
	test('one level deep is not doubled', () =>
		fails({ a: { m: 'arrayof:email' } }, { a: { m: ['bad'] } }, ['a.m[0] must be a valid email']))
	test('two levels deep is not doubled', () =>
		fails({ a: { b: { m: 'arrayof:email' } } }, { a: { b: { m: ['bad'] } } }, [
			'a.b.m[0] must be a valid email',
		]))
	test('nested arrayof inside an object', () =>
		fails({ a: { m: 'arrayof:arrayof:number' } }, { a: { m: [['x']] } }, [
			'a.m[0][0] must be a valid number',
		]))
})

describe('path labels: arrayof inside an array of objects', () => {
	test('is not doubled', () =>
		fails({ u: [{ m: 'arrayof:string' }] }, { u: [{ m: [1] }] }, ['u[0].m[0] must be string']))
	test('reports the right element index', () =>
		fails({ u: [{ m: 'arrayof:string' }] }, { u: [{ m: ['a'] }, { m: [1] }] }, [
			'u[1].m[0] must be string',
		]))
})

describe('path labels: nested tuple rules', () => {
	const rules = { m: [[{ a: 'string' }]] }

	test('accepts a valid nested structure', () => ok(rules, { m: [[{ a: 'x' }]] }))
	test('uses bracket notation for both levels', () =>
		fails(rules, { m: [[{ a: 1 }]] }, ['m[0][0].a must be string']))
	test('reports each failing outer element', () =>
		fails(rules, { m: [[{ a: 1 }], [{ a: 2 }]] }, [
			'm[0][0].a must be string',
			'm[1][0].a must be string',
		]))
	test('reports each failing inner element', () => {
		const errors = errorsOf(rules, { m: [[{ a: 1 }, { a: 2 }]] })
		assert.deepEqual(errors, ['m[0][0].a must be string', 'm[0][1].a must be string'])
	})
})

describe('mixed nesting still labels correctly', () => {
	test('object > tuple > object', () =>
		fails({ a: { u: [{ b: { c: 'string' } }] } }, { a: { u: [{ b: { c: 1 } }] } }, [
			'a.u[0].b.c must be string',
		]))
	test('tuple > object > arrayof', () =>
		fails({ u: [{ b: { m: 'arrayof:string' } }] }, { u: [{ b: { m: [1] } }] }, [
			'u[0].b.m[0] must be string',
		]))
	test('flat tuple is unchanged', () =>
		fails({ u: [{ a: 'string' }] }, { u: [{ a: 1 }] }, ['u[0].a must be string']))
	test('top-level arrayof is unchanged', () =>
		fails({ m: 'arrayof:string' }, { m: [1] }, ['m[0] must be string']))
})

describe('operators combine with nested structures', () => {
	test('$or with a tuple branch', () =>
		fails({ p: { $or: ['string', [{ t: 'string|min:3' }]] } }, { p: [{ t: 'ab' }] }, [
			'p[0].t must have length of at least 3',
		]))
	test('$or with a nested-object branch', () =>
		fails({ p: { $or: ['string', { a: { b: 'string' } }] } }, { p: { a: { b: 1 } } }, [
			'p.a.b must be string',
		]))
	test('$and with two object branches reports both', () =>
		fails({ p: { $and: [{ a: 'string' }, { b: 'number' }] } }, { p: { a: 1, b: 'x' } }, [
			'p.a must be string',
			'p.b must be a valid number',
		]))
	test('$or inside a nested array of objects', () =>
		fails({ u: [{ v: { $or: ['email', 'phone'] } }] }, { u: [{ v: 'ok@x.com' }, { v: '!!!' }] }, [
			'u[1].v must be a valid email',
		]))
	test('optional nested arrayof via $and', () => {
		const rules = { m: { $and: ['optional', 'arrayof:arrayof:number'] } }
		ok(rules, {})
		ok(rules, { m: [[1]] })
		fails(rules, { m: [['x']] }, ['m[0][0] must be a valid number'])
	})
})
