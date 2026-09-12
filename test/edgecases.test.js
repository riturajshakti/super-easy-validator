const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { validate } = require('../dist/index.js')

const errorsOf = (rules, data, config) => validate(rules, data, config).errors
const ok = (rules, data, config) => assert.equal(errorsOf(rules, data, config), undefined)
const fails = (rules, data, expected, config) => assert.deepEqual(errorsOf(rules, data, config), expected)

describe('top-level data guards', () => {
	test('null data', () => fails({ f: 'string' }, null, ['data is required']))
	test('undefined data', () => fails({ f: 'string' }, undefined, ['data is required']))
	test('string data', () => fails({ f: 'string' }, 'nope', ['data must be of type object/array']))
	test('number data', () => fails({ f: 'string' }, 42, ['data must be of type object/array']))
})

describe('numeric string variants', () => {
	test('string|positive rejects a negative', () =>
		fails({ f: 'string|positive' }, { f: '-5' }, ['f must be a valid positive numeric string']))
	test('string|negative rejects a positive', () =>
		fails({ f: 'string|negative' }, { f: '5' }, ['f must be a valid negative numeric string']))
	test('string|whole rejects a negative', () =>
		fails({ f: 'string|whole' }, { f: '-1' }, ['f must be a valid whole numeric string']))
	test('string|positive accepts a positive', () => ok({ f: 'string|positive' }, { f: '5' }))
	test('string|negative accepts a negative', () => ok({ f: 'string|negative' }, { f: '-5' }))
	test('string|whole accepts zero', () => ok({ f: 'string|whole' }, { f: '0' }))
})

describe('NaN against decimal constraints', () => {
	test('decimalsize', () => fails({ f: 'number|decimalsize:2' }, { f: NaN }, ['f must be a value number']))
	test('decimalmin', () => fails({ f: 'number|decimalmin:2' }, { f: NaN }, ['f must be a value number']))
	test('decimalmax', () => fails({ f: 'number|decimalmax:2' }, { f: NaN }, ['f must be a value number']))
})

describe('dot-notation keys', () => {
	test('resolves a deep path', () => ok({ 'a.b.c': 'string' }, { a: { b: { c: 'x' } } }))
	test('reports a missing deep path as required', () =>
		fails({ 'a.b.c': 'string' }, { a: {} }, ['a.b.c is required']))
	test('regression: a null intermediate does not crash', () =>
		fails({ 'a.b.c': 'string' }, { a: null }, ['a.b.c is required']))
	test('regression: a number intermediate does not crash', () =>
		fails({ 'a.b.c': 'string' }, { a: 5 }, ['a.b.c must be string']))
	test('regression: a boolean intermediate does not crash', () =>
		fails({ 'a.b.c': 'string' }, { a: true }, ['a.b.c must be string']))
	test('regression: never surfaces the opaque catch-all', () => {
		for (const mid of [null, 5, 'str', true, undefined, [], {}]) {
			const errors = errorsOf({ 'a.b.c': 'string' }, { a: mid }) ?? []
			assert.ok(
				!errors.includes('error occurred while data validation'),
				`opaque message leaked for intermediate ${String(mid)}`
			)
		}
	})
	test('indexes into an array', () => ok({ 'a.0': 'string' }, { a: ['x'] }))
})

describe('$atleast and $atmost array form', () => {
	const rules = {
		a: 'optional|string',
		b: 'optional|string',
		x: 'optional|string',
		y: 'optional|string',
	}

	test('$atleast reports each group separately', () =>
		fails({ ...rules, $atleast: ['a|b', 'x|y'] }, {}, [
			'at least one of a and b is required',
			'at least one of x and y is required',
		]))
	test('$atleast passes when each group has one', () =>
		ok({ ...rules, $atleast: ['a|b', 'x|y'] }, { a: '1', x: '2' }))
	test('$atmost reports each group separately', () =>
		fails({ ...rules, $atmost: ['a|b', 'x|y'] }, { a: '1', b: '2', x: '3', y: '4' }, [
			'at most one of a and b can be given',
			'at most one of x and y can be given',
		]))
	test('$atmost passes when each group has one', () =>
		ok({ ...rules, $atmost: ['a|b', 'x|y'] }, { a: '1', x: '2' }))
	test('$atleast counts presence, not truthiness', () =>
		ok({ a: 'optional|boolean', b: 'optional|boolean', $atleast: 'a|b' }, { a: false, b: false }))
	test('$atleast does not count size: as a field', () =>
		ok({ a: 'optional|string', b: 'optional|string', $atleast: 'a|b|size:2' }, { a: 'x', b: 'y' }))
})

describe('arrayof with optional and nullable elements', () => {
	test('nullable in pipe form', () =>
		ok({ f: 'arrayof:nullable|arrayof:email' }, { f: [null, 'a@b.com'] }))
	test('optional and nullable together', () =>
		ok({ f: ['arrayof:optional', 'arrayof:nullable', 'arrayof:email'] }, { f: [null, undefined, 'a@b.com'] }))
	test('nullable does not excuse an invalid element', () =>
		fails({ f: 'arrayof:nullable|arrayof:email' }, { f: [null, 'bad'] }, ['f[1] must be a valid email']))
	test('a sparse hole reads as missing without arrayof:optional', () =>
		fails({ f: 'arrayof:string' }, { f: ['a', , 'c'] }, ['f[1] is required']))
})

describe('degenerate rules and data', () => {
	test('empty rules with empty data', () => ok({}, {}))
	test('empty rules with strict rejects every field', () => fails({}, { a: 1 }, ['a is not required'], { strict: true }))
	test('an empty rule string validates nothing', () => ok({ f: '' }, { f: 'anything' }))
	test('an empty array rule is treated as an array-of-objects rule', () =>
		fails({ f: [] }, { f: 'x' }, ['f must be of type array']))
	test('an empty data object reports every required field', () =>
		fails({ a: 'string', b: 'number' }, {}, ['a is required', 'b is required']))
})

describe('boundary values', () => {
	test('size:0 accepts an empty string', () => ok({ f: 'string|size:0' }, { f: '' }))
	test('size:0 accepts an empty array', () => ok({ f: 'array|size:0' }, { f: [] }))
	test('min:0 accepts an empty array', () => ok({ f: 'array|min:0' }, { f: [] }))
	test('size counts digits only, ignoring sign and point', () => {
		ok({ f: 'number|size:3' }, { f: -123 })
		ok({ f: 'number|size:3' }, { f: 1.23 })
		ok({ f: 'number|size:3' }, { f: 123 })
	})
	test('size rejects the wrong digit count', () =>
		fails({ f: 'number|size:3' }, { f: 1234 }, ['f must have 3 digits']))
	test('max at the exact boundary passes', () => ok({ f: 'number|max:10' }, { f: 10 }))
	test('min at the exact boundary passes', () => ok({ f: 'number|min:10' }, { f: 10 }))
})

describe('enums and regex edge cases', () => {
	test('a single enum value', () => ok({ f: 'enums:only' }, { f: 'only' }))
	test('an empty enum member matches an empty string', () => ok({ f: 'enums:a,,b' }, { f: '' }))
	test('a numeric string is not a number enum', () =>
		fails({ f: 'number|enums:1,2' }, { f: '1' }, ['f must be a valid number']))
	test('regex without flags', () => ok({ f: 'regex:/^a+$/' }, { f: 'aaa' }))
	test('regex without flags is case sensitive', () =>
		fails({ f: 'regex:/^a+$/' }, { f: 'AAA' }, ['f is invalid']))
	test('regex with the i flag', () => ok({ f: 'regex:/^a+$/i' }, { f: 'AAA' }))
})

describe('unicode', () => {
	test('accented characters count as single characters', () => ok({ f: 'string|min:3' }, { f: 'héllo' }))
	test('an emoji counts by code unit', () => ok({ f: 'string|size:2' }, { f: '👍' }))
	test('a unicode name is accepted', () => ok({ f: 'name' }, { f: 'José' }))
})

describe('strict mode in nested structures', () => {
	test('reports an extra field inside an array of objects', () =>
		fails({ u: [{ a: 'string' }] }, { u: [{ a: 'x', b: 1 }] }, ['u[0].b is not required'], {
			strict: true,
		}))
	test('reports an extra field in a deeply nested object', () =>
		fails(
			{ a: { b: { c: 'string' } } },
			{ a: { b: { c: 'x', d: 1 } } },
			['a.b.d is not required'],
			{ strict: true }
		))
})

describe('equal with mismatched types', () => {
	test('a non-string, non-number, non-boolean value is not compared', () =>
		ok({ f: 'equal:5' }, { f: [5] }))
	test('a number against a non-numeric target', () =>
		fails({ f: 'equal:abc' }, { f: 5 }, ['f must be equal to abc']))
	test('auto-detect matches a string form', () => ok({ f: 'equal:200' }, { f: '200' }))
	test('auto-detect matches a number form', () => ok({ f: 'equal:200' }, { f: 200 }))
})
