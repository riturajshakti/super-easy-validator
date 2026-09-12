const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { validate, ErrorCodes } = require('../dist/index.js')

const errorsOf = (rules, data, config) => validate(rules, data, config).errors
const ok = (rules, data, config) => assert.equal(errorsOf(rules, data, config), undefined)
const fails = (rules, data, expected, config) => assert.deepEqual(errorsOf(rules, data, config), expected)
const throws = (rules, data) => assert.throws(() => validate(rules, data), { name: 'InvalidRuleError' })

describe('positive indexing', () => {
	test('accepts a valid element', () => ok({ 'c[0]': 'number' }, { c: [1, 2, 3] }))
	test('reports the indexed element', () =>
		fails({ 'c[0]': 'number' }, { c: ['x', 2] }, ['c[0] must be a valid number']))
	test('reports a later index', () =>
		fails({ 'c[1]': 'number' }, { c: [1, 'x'] }, ['c[1] must be a valid number']))
	test('several indexes on one array', () =>
		fails({ 'c[0]': 'number', 'c[2]': 'number' }, { c: ['x', 2, 'y'] }, [
			'c[0] must be a valid number',
			'c[2] must be a valid number',
		]))
	test('out of range reads as missing', () =>
		fails({ 'c[9]': 'number' }, { c: [1] }, ['c[9] is required']))
	test('index on a non-array reads as missing', () =>
		fails({ 'c[0]': 'number' }, { c: 'notarray' }, ['c[0] is required']))
	test('index on an absent field reads as missing', () =>
		fails({ 'c[0]': 'number' }, {}, ['c[0] is required']))
	test('specific string types work', () =>
		fails({ 'c[0]': 'email' }, { c: ['bad'] }, ['c[0] must be a valid email']))
	test('constraints work', () =>
		fails({ 'c[0]': 'string|min:5' }, { c: ['ab'] }, ['c[0] must have length of at least 5']))
	test('optional allows a missing index', () => ok({ 'c[9]': 'optional|number' }, { c: [1] }))
})

describe('negative indexing', () => {
	test('accepts the last element', () => ok({ 'c[-1]': 'number' }, { c: [1, 2, 3] }))
	test('reports the last element', () =>
		fails({ 'c[-1]': 'number' }, { c: [1, 'x'] }, ['c[-1] must be a valid number']))
	test('reports the second to last', () =>
		fails({ 'c[-2]': 'number' }, { c: ['x', 2] }, ['c[-2] must be a valid number']))
	test('out of range reads as missing', () =>
		fails({ 'c[-9]': 'number' }, { c: [1] }, ['c[-9] is required']))
	test('negative index on a single-element array', () => ok({ 'c[-1]': 'number' }, { c: [7] }))
})

describe('slices apply the rule to each selected element', () => {
	test('all elements valid', () => ok({ 'c[0:2]': 'number' }, { c: [1, 2, 3] }))
	test('one element fails', () =>
		fails({ 'c[0:2]': 'number' }, { c: [1, 'x', 3] }, ['c[1] must be a valid number']))
	test('every element fails', () =>
		fails({ 'c[0:2]': 'number' }, { c: ['a', 'b', 3] }, [
			'c[0] must be a valid number',
			'c[1] must be a valid number',
		]))
	test('elements outside the slice are ignored', () => ok({ 'c[0:2]': 'number' }, { c: [1, 2, 'x'] }))
	test('open end', () =>
		fails({ 'c[1:]': 'number' }, { c: [1, 'x', 'y'] }, [
			'c[1] must be a valid number',
			'c[2] must be a valid number',
		]))
	test('open start', () => fails({ 'c[:2]': 'number' }, { c: ['a', 2, 3] }, ['c[0] must be a valid number']))
	test('negative slice', () =>
		fails({ 'c[-2:]': 'number' }, { c: [1, 'x', 'y'] }, [
			'c[1] must be a valid number',
			'c[2] must be a valid number',
		]))
	test('fully out of range selects nothing', () => ok({ 'c[5:9]': 'number' }, { c: [1, 2] }))
	test('clamps a too-large end', () =>
		fails({ 'c[1:99]': 'number' }, { c: [1, 'x'] }, ['c[1] must be a valid number']))
	test('empty array selects nothing', () => ok({ 'c[0:2]': 'number' }, { c: [] }))
	test('slice on a non-array reports an array error', () =>
		assert.ok(errorsOf({ 'c[0:2]': 'number' }, { c: 'x' }).length > 0))
	test('specific string types per element', () =>
		fails({ 'c[0:2]': 'email' }, { c: ['bad', 'a@b.com'] }, ['c[0] must be a valid email']))
})

describe('indexing inside nested objects', () => {
	test('one level', () => fails({ 'a.c[0]': 'number' }, { a: { c: ['x'] } }, ['a.c[0] must be a valid number']))
	test('two levels', () =>
		fails({ 'a.b.c[0]': 'number' }, { a: { b: { c: ['x'] } } }, ['a.b.c[0] must be a valid number']))
	test('negative index keeps the prefix', () =>
		fails({ 'a.c[-1]': 'number' }, { a: { c: [1, 'x'] } }, ['a.c[-1] must be a valid number']))
	test('slice keeps the prefix', () =>
		fails({ 'a.c[0:2]': 'number' }, { a: { c: ['x', 'y', 3] } }, [
			'a.c[0] must be a valid number',
			'a.c[1] must be a valid number',
		]))
	test('valid nested data passes', () => ok({ 'a.c[0]': 'number' }, { a: { c: [1] } }))
	test('missing intermediate object reads as missing', () =>
		fails({ 'a.c[0]': 'number' }, {}, ['a.c[0] is required']))
})

describe('indexing into arrays of objects', () => {
	test('index then property', () =>
		fails({ 'u[0].name': 'string' }, { u: [{ name: 1 }] }, ['u[0].name must be string']))
	test('negative index then property', () =>
		fails({ 'u[-1].name': 'string' }, { u: [{ name: 'a' }, { name: 2 }] }, ['u[-1].name must be string']))
	test('slice then property fans out per element', () =>
		fails({ 'u[0:2].name': 'string' }, { u: [{ name: 1 }, { name: 2 }] }, [
			'u[0].name must be string',
			'u[1].name must be string',
		]))
	test('slice then property with valid data', () =>
		ok({ 'u[0:2].name': 'string' }, { u: [{ name: 'a' }, { name: 'b' }] }))
	test('open-ended slice then property', () =>
		fails({ 'u[1:].name': 'string' }, { u: [{ name: 'a' }, { name: 2 }] }, ['u[1].name must be string']))
	test('deep property after an index', () =>
		fails({ 'u[0].a.b': 'string' }, { u: [{ a: { b: 1 } }] }, ['u[0].a.b must be string']))
})

describe('nested array indexing', () => {
	test('two brackets resolve', () => ok({ 'c[0][1]': 'number' }, { c: [[1, 2]] }))
	test('two brackets report correctly', () =>
		fails({ 'c[0][1]': 'number' }, { c: [[1, 'x']] }, ['c[0][1] must be a valid number']))
	test('negative outer index', () =>
		fails({ 'c[-1][0]': 'number' }, { c: [[1], ['x']] }, ['c[-1][0] must be a valid number']))
	test('missing inner element', () => fails({ 'c[0][9]': 'number' }, { c: [[1]] }, ['c[0][9] is required']))
})

describe('indexing inside $or and $and', () => {
	test('$or branch containing an indexed rule', () =>
		fails({ x: { $or: [{ 'c[0]': 'number' }, 'string'] } }, { x: { c: ['q'] } }, [
			'x.c[0] must be a valid number',
		]))
	test('$and branch containing an indexed rule', () =>
		fails({ x: { $and: [{ 'c[0]': 'number' }] } }, { x: { c: ['q'] } }, ['x.c[0] must be a valid number']))
	test('$or picks the branch that matches', () =>
		ok({ x: { $or: [{ 'c[0]': 'number' }, 'string'] } }, { x: 'plain' }))
	test('$and with optional and an indexed rule', () => {
		const rules = { x: { $and: ['optional', { 'c[0]': 'number' }] } }
		ok(rules, {})
		fails(rules, { x: { c: ['q'] } }, ['x.c[0] must be a valid number'])
	})
	test('indexed rule with a $or value', () =>
		fails({ 'c[0]': { $or: ['number', 'boolean'] } }, { c: ['x'] }, ['c[0] must be a valid number']))
})

describe('the arrayIndexingCheck option', () => {
	test('is enabled by default', () =>
		fails({ 'c[0]': 'number' }, { c: ['x'] }, ['c[0] must be a valid number']))
	test('explicit true behaves the same', () =>
		fails({ 'c[0]': 'number' }, { c: ['x'] }, ['c[0] must be a valid number'], {
			arrayIndexingCheck: true,
		}))
	test('false treats the key literally', () =>
		ok({ 'c[0]': 'string' }, { 'c[0]': 'x' }, { arrayIndexingCheck: false }))
	test('false stops indexing into the array', () =>
		fails({ 'c[0]': 'number' }, { c: [1] }, ['c[0] is required'], { arrayIndexingCheck: false }))
	test('false leaves slice keys literal', () =>
		ok({ 'c[0:2]': 'string' }, { 'c[0:2]': 'x' }, { arrayIndexingCheck: false }))
	test('false does not affect dotted paths', () =>
		fails({ 'a.b': 'string' }, { a: { b: 1 } }, ['a.b must be string'], { arrayIndexingCheck: false }))
	test('false does not affect ordinary keys', () =>
		fails({ a: 'string' }, { a: 1 }, ['a must be string'], { arrayIndexingCheck: false }))
})

describe('indexed keys work with the rest of the library', () => {
	test('unknown rules still throw', () => throws({ 'c[0]': 'strng' }, { c: [1] }))
	test('unknown rules on a slice still throw', () => throws({ 'c[0:2]': 'mim:3' }, { c: [1, 2] }))
	test('error: overrides the message', () =>
		fails({ 'c[0]': 'number|error:first must be numeric' }, { c: ['x'] }, ['first must be numeric']))
	test('quotes apply to indexed labels', () =>
		fails({ 'c[0]': 'number' }, { c: ['x'] }, ['`c[0]` must be a valid number'], { quotes: 'backtick' }))
	test('details carry the right code', () => {
		const { details } = validate({ 'c[0]': 'number' }, { c: ['x'] })
		assert.deepEqual(details, [{ message: 'c[0] must be a valid number', code: ErrorCodes.NOT_NUMBER }])
	})
	test('errors and details stay aligned for a slice', () => {
		const { errors, details } = validate({ 'c[0:2]': 'number' }, { c: ['a', 'b'] })
		assert.equal(details.length, errors.length)
		details.forEach((d, i) => assert.equal(d.message, errors[i]))
	})
	test('strict mode counts the base key as declared', () =>
		ok({ 'c[0]': 'number' }, { c: [1] }, { strict: true }))
	test('strict mode still reports a genuinely extra key', () =>
		fails({ 'c[0]': 'number' }, { c: [1], z: 2 }, ['z is not required'], { strict: true }))
	test('strict mode with a slice rule', () =>
		ok({ 'c[0:2]': 'number' }, { c: [1, 2] }, { strict: true }))
	test('combines with an array rule on the same field', () =>
		fails({ c: 'array|min:3', 'c[0]': 'number' }, { c: ['x'] }, [
			'c must have length of at least 3',
			'c[0] must be a valid number',
		]))
})

describe('realistic uses', () => {
	test('coordinate pair bounds', () => {
		const rules = {
			coords: 'array|size:2',
			'coords[0]': 'number|min:-90|max:90',
			'coords[1]': 'number|min:-180|max:180',
		}
		ok(rules, { coords: [51.5, -0.12] })
		fails(rules, { coords: [200, -0.12] }, ['coords[0] must be at most 90'])
	})

	test('rgb triple', () => {
		const rules = { rgb: 'array|size:3', 'rgb[0:3]': 'whole|max:255' }
		ok(rules, { rgb: [12, 200, 255] })
		fails(rules, { rgb: [12, 300, 255] }, ['rgb[1] must be at most 255'])
	})

	test('first and last of a history list', () => {
		const rules = { 'history[0]': 'date', 'history[-1]': 'date' }
		ok(rules, { history: ['2024-01-01', '2024-06-01'] })
		fails(rules, { history: ['nope', '2024-06-01'] }, ['history[0] must be a valid date'])
	})

	test('nested object with an indexed field', () => {
		const rules = { 'order.items[0].sku': 'string|min:3' }
		ok(rules, { order: { items: [{ sku: 'ABC' }] } })
		fails(rules, { order: { items: [{ sku: 'A' }] } }, [
			'order.items[0].sku must have length of at least 3',
		])
	})
})
