const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { validate, ErrorCodes } = require('../dist/index.js')

const errorsOf = (rules, data, config) => validate(rules, data, config).errors
const ok = (rules, data, config) => assert.equal(errorsOf(rules, data, config), undefined)
const fails = (rules, data, expected, config) => assert.deepEqual(errorsOf(rules, data, config), expected)
const throws = (rules, data) => assert.throws(() => validate(rules, data), { name: 'InvalidRuleError' })

describe('$switch: the worked example', () => {
	const rules = {
		amount: {
			$switch: [
				{ case: 'number|max:1000', then: 'positive', default: true },
				{ case: 'number|min:1001', then: 'positive|decimalmax:2' },
			],
		},
	}

	test('a small valid amount takes the first case', () => ok(rules, { amount: 500 }))
	test('a small invalid amount reports the first then', () =>
		fails(rules, { amount: -5 }, ['amount must be a valid positive number']))
	test('a large valid amount takes the second case', () => ok(rules, { amount: 5000 }))
	test('a large amount with too many decimals reports the second then', () =>
		fails(rules, { amount: 5000.123 }, ['amount must have at most 2 decimal places']))
	test('a non-number falls back to the default branch', () =>
		fails(rules, { amount: 'abc' }, ['amount must be a valid number']))
	test('an absent value falls back to the default branch', () =>
		fails(rules, {}, ['amount is required']))
	test('a boundary value takes the first case', () => ok(rules, { amount: 1000 }))
	test('one past the boundary takes the second case', () => ok(rules, { amount: 1001 }))
})

describe('$switch: case selection', () => {
	test('the first matching case wins', () =>
		fails({ a: { $switch: [{ case: 'number', then: 'min:100' }, { case: 'number', then: 'max:1' }] } }, { a: 5 }, [
			'a must be at least 100',
		]))
	test('evaluation stops at the first match', () => {
		let secondCaseEvaluated = false
		const rules = {
			a: {
				$switch: [
					{ case: 'number', then: 'positive' },
					{
						case: () => {
							secondCaseEvaluated = true
							return undefined
						},
						then: 'string',
					},
				],
			},
		}
		validate(rules, { a: 5 })
		assert.equal(secondCaseEvaluated, false)
	})
	test('a later case is used when earlier ones fail', () =>
		fails({ a: { $switch: [{ case: 'string', then: 'email' }, { case: 'number', then: 'positive' }] } }, { a: -1 }, [
			'a must be a valid positive number',
		]))
	test('a single-branch switch behaves like its then', () =>
		fails({ a: { $switch: [{ case: 'number', then: 'positive' }] } }, { a: -1 }, [
			'a must be a valid positive number',
		]))
})

describe('$switch: the default branch', () => {
	const rules = {
		a: {
			$switch: [
				{ case: 'string', then: 'email' },
				{ case: 'number', then: 'positive', default: true },
			],
		},
	}

	test('a matching case is used before the default', () =>
		fails(rules, { a: 'bad' }, ['a must be a valid email']))
	test('the default branch still matches normally', () => ok(rules, { a: 5 }))
	test('no match falls back to the default then', () =>
		fails(rules, { a: true }, ['a must be a valid number']))
	test('the default may be the first branch', () => {
		const r = { a: { $switch: [{ case: 'number', then: 'positive', default: true }, { case: 'string', then: 'email' }] } }
		fails(r, { a: true }, ['a must be a valid number'])
	})
	test('the default branch can carry an object then', () => {
		const r = { a: { $switch: [{ case: 'string', then: 'email' }, { case: 'object', then: { c: 'name' }, default: true }] } }
		assert.ok(errorsOf(r, { a: 5 }).length > 0)
	})
})

describe('$switch: no case matched and no default', () => {
	const rules = { a: { $switch: [{ case: 'number|max:10', then: 'positive' }] } }

	test('reports NO_CASE_MATCHED', () => fails(rules, { a: 500 }, ['a does not match any case']))
	test('carries the NO_CASE_MATCHED code', () => {
		const { details } = validate(rules, { a: 500 })
		assert.equal(details[0].code, ErrorCodes.NO_CASE_MATCHED)
	})
	test('the message names the field', () =>
		fails({ amount: { $switch: [{ case: 'string', then: 'email' }] } }, { amount: 1 }, [
			'amount does not match any case',
		]))
	test('a matching case avoids the error', () => ok(rules, { a: 5 }))
	test('nested field names are preserved', () =>
		fails({ o: { a: { $switch: [{ case: 'string', then: 'email' }] } } }, { o: { a: 1 } }, [
			'o.a does not match any case',
		]))
})

describe('$switch: case and then accept every rule shape', () => {
	test('a string rule', () =>
		fails({ a: { $switch: [{ case: 'number', then: 'positive' }] } }, { a: -1 }, [
			'a must be a valid positive number',
		]))
	test('an array-form rule as the case', () =>
		fails({ a: { $switch: [{ case: ['string', 'min:3'], then: 'email' }] } }, { a: 'abcd' }, [
			'a must be a valid email',
		]))
	test('an object rule as the then', () =>
		fails({ a: { $switch: [{ case: 'object', then: { c: 'name' } }] } }, { a: { c: '123' } }, [
			'a.c must be a valid name',
		]))
	test('a tuple rule as the then', () =>
		fails({ a: { $switch: [{ case: 'array', then: [{ t: 'string' }] }] } }, { a: [{ t: 1 }] }, [
			'a[0].t must be string',
		]))
	test('a custom function as the case', () =>
		fails(
			{ a: { $switch: [{ case: (v) => (typeof v === 'number' ? undefined : { message: 'no', code: 'C' }), then: 'positive' }] } },
			{ a: -5 },
			['a must be a valid positive number']
		))
	test('a custom function as the then', () =>
		fails(
			{ a: { $switch: [{ case: 'number', then: (v) => (v % 2 === 0 ? undefined : { message: 'must be even', code: 'E' }) }] } },
			{ a: 3 },
			['must be even']
		))
	test('a custom case function receives the parent', () =>
		fails(
			{ t: 'string', a: { $switch: [{ case: (v, p) => (p.t === 'x' ? undefined : { message: 'no', code: 'C' }), then: 'positive' }] } },
			{ t: 'x', a: -1 },
			['a must be a valid positive number']
		))
})

describe('$switch combines with $and and $or', () => {
	test('$switch inside $and', () =>
		fails({ a: { $and: ['number', { $switch: [{ case: 'max:10', then: 'positive' }] }] } }, { a: -5 }, [
			'a must be a valid positive number',
		]))
	test('$switch inside $or', () =>
		fails({ a: { $or: ['string', { $switch: [{ case: 'number', then: 'min:100' }] }] } }, { a: 5 }, [
			'a must be at least 100',
		]))
	test('$or inside a switch then', () =>
		fails({ a: { $switch: [{ case: 'number', then: { $or: ['min:100', 'max:1'] } }] } }, { a: 50 }, [
			'a must be at least 100',
		]))
	test('$and inside a switch then', () =>
		fails({ a: { $switch: [{ case: 'number', then: { $and: ['positive', 'max:10'] } }] } }, { a: 50 }, [
			'a must be at most 10',
		]))
	test('$and inside a switch case', () =>
		ok({ a: { $switch: [{ case: { $and: ['number', 'positive'] }, then: 'max:100' }] } }, { a: 5 }))
	test('$switch inside $switch', () =>
		fails(
			{ a: { $switch: [{ case: 'number', then: { $switch: [{ case: 'max:10', then: 'positive' }] } }] } },
			{ a: -5 },
			['a must be a valid positive number']
		))
	test('$and with optional wrapping a switch', () => {
		const rules = { a: { $and: ['optional', { $switch: [{ case: 'number', then: 'positive' }] }] } }
		ok(rules, {})
		fails(rules, { a: -1 }, ['a must be a valid positive number'])
	})
	test('three levels of mixed operators', () =>
		fails(
			{ a: { $or: [{ $switch: [{ case: 'number', then: { $and: ['positive', 'min:10'] } }] }] } },
			{ a: 5 },
			['a must be at least 10']
		))
})

describe('$switch in nested structures', () => {
	test('inside a nested object', () =>
		fails({ o: { a: { $switch: [{ case: 'number', then: 'positive' }] } } }, { o: { a: -1 } }, [
			'o.a must be a valid positive number',
		]))
	test('two levels deep', () =>
		fails({ x: { o: { a: { $switch: [{ case: 'number', then: 'positive' }] } } } }, { x: { o: { a: -1 } } }, [
			'x.o.a must be a valid positive number',
		]))
	test('inside a tuple element', () =>
		fails({ u: [{ a: { $switch: [{ case: 'number', then: 'positive' }] } }] }, { u: [{ a: -1 }] }, [
			'u[0].a must be a valid positive number',
		]))
	test('reports each failing tuple element', () =>
		assert.equal(
			errorsOf({ u: [{ a: { $switch: [{ case: 'number', then: 'positive' }] } }] }, { u: [{ a: -1 }, { a: -2 }] }).length,
			2
		))
	test('on an indexed key', () =>
		fails({ 'c[0]': { $switch: [{ case: 'number', then: 'positive' }] } }, { c: [-1] }, [
			'c[0] must be a valid positive number',
		]))
	test('on a dotted path', () =>
		fails({ 'o.a': { $switch: [{ case: 'number', then: 'positive' }] } }, { o: { a: -1 } }, [
			'o.a must be a valid positive number',
		]))
})

describe('$switch with strict mode', () => {
	test('the selected object then declares its keys', () =>
		fails({ a: { $switch: [{ case: 'object', then: { c: 'name' } }] } }, { a: { c: 'John', z: 1 } }, [
			'a.z is not required',
		], { strict: true }))
	test('no strict error when every key is declared', () =>
		ok({ a: { $switch: [{ case: 'object', then: { c: 'name' } }] } }, { a: { c: 'John' } }, { strict: true }))
})

describe('$switch works with details, codes and options', () => {
	test('details carry the then rule code', () => {
		const { details } = validate({ a: { $switch: [{ case: 'number', then: 'positive' }] } }, { a: -1 })
		assert.equal(details[0].code, ErrorCodes.NOT_POSITIVE)
	})
	test('errors and details stay aligned', () => {
		const { errors, details } = validate(
			{ a: { $switch: [{ case: 'number', then: { $and: ['positive', 'min:10'] } }] } },
			{ a: -1 }
		)
		assert.equal(details.length, errors.length)
		details.forEach((d, i) => assert.equal(d.message, errors[i]))
	})
	test('quotes apply to switch errors', () =>
		fails({ a: { $switch: [{ case: 'number', then: 'positive' }] } }, { a: -1 }, [
			'`a` must be a valid positive number',
		], { quotes: 'backtick' }))
	test('quotes apply to NO_CASE_MATCHED', () =>
		fails({ a: { $switch: [{ case: 'string', then: 'email' }] } }, { a: 1 }, [
			'`a` does not match any case',
		], { quotes: 'backtick' }))
	test('error: inside a then overrides the message', () =>
		fails({ a: { $switch: [{ case: 'number', then: 'positive|error:bad amount' }] } }, { a: -1 }, ['bad amount']))
})

describe('malformed $switch nodes throw', () => {
	test('branches must be an array', () => throws({ a: { $switch: { case: 'number' } } }, { a: 1 }))
	test('at least one branch is required', () => throws({ a: { $switch: [] } }, { a: 1 }))
	test('a branch must be an object', () => throws({ a: { $switch: ['number'] } }, { a: 1 }))
	test('a branch needs a case', () => throws({ a: { $switch: [{ then: 'number' }] } }, { a: 1 }))
	test('a branch needs a then', () => throws({ a: { $switch: [{ case: 'number' }] } }, { a: 1 }))
	test('unknown branch keys are rejected', () =>
		throws({ a: { $switch: [{ case: 'number', then: 'positive', xx: 1 }] } }, { a: 1 }))
	test('default must be a boolean', () =>
		throws({ a: { $switch: [{ case: 'number', then: 'positive', default: 'yes' }] } }, { a: 1 }))
	test('only one branch may be the default', () =>
		throws(
			{ a: { $switch: [{ case: 'number', then: 'positive', default: true }, { case: 'string', then: 'email', default: true }] } },
			{ a: 1 }
		))
	test('$switch cannot sit beside another key', () =>
		throws({ a: { $switch: [{ case: 'number', then: 'positive' }], c: 'name' } }, { a: 1 }))
	test('$switch cannot combine with $or', () =>
		throws({ a: { $switch: [{ case: 'number', then: 'positive' }], $or: ['string'] } }, { a: 1 }))
	test('an unknown rule inside a case throws', () =>
		throws({ a: { $switch: [{ case: 'strng', then: 'positive' }] } }, { a: 1 }))
	test('an unknown rule inside a then throws', () =>
		throws({ a: { $switch: [{ case: 'number', then: 'positiv' }] } }, { a: 1 }))
	test('the message names the field', () =>
		assert.throws(() => validate({ amount: { $switch: [] } }, { amount: 1 }), /'amount'/))
	test('the message names $switch', () =>
		assert.throws(() => validate({ a: { $switch: [] } }, { a: 1 }), /\$switch/))
})

describe('realistic uses', () => {
	test('payload shape by type', () => {
		const rules = {
			type: 'enums:image,video',
			meta: {
				$switch: [
					{ case: (v, p) => (p.type === 'image' ? undefined : { message: 'x', code: 'C' }), then: { width: 'natural', height: 'natural' } },
					{ case: (v, p) => (p.type === 'video' ? undefined : { message: 'x', code: 'C' }), then: { duration: 'positive' } },
				],
			},
		}
		ok(rules, { type: 'image', meta: { width: 800, height: 600 } })
		ok(rules, { type: 'video', meta: { duration: 12.5 } })
		fails(rules, { type: 'image', meta: { width: 800 } }, ['meta.height is required'])
	})

	test('precision scaling with magnitude', () => {
		const rules = {
			price: {
				$switch: [
					{ case: 'number|max:1', then: 'positive|decimalmax:4' },
					{ case: 'number|max:1000', then: 'positive|decimalmax:2' },
					{ case: 'number', then: 'positive|decimalmax:0', default: true },
				],
			},
		}
		ok(rules, { price: 0.1234 })
		ok(rules, { price: 99.99 })
		ok(rules, { price: 5000 })
		fails(rules, { price: 5000.55 }, ['price must have at most 0 decimal places'])
	})

	test('decimalmax:0 accepts whole numbers', () => {
		ok({ p: 'number|decimalmax:0' }, { p: 5000 })
		ok({ p: 'number|decimalmax:0' }, { p: 0 })
		fails({ p: 'number|decimalmax:0' }, { p: 1.5 }, ['p must have at most 0 decimal places'])
	})

	test('string or pre-parsed object', () => {
		const rules = {
			filter: {
				$switch: [
					{ case: 'string', then: 'min:1|max:200' },
					{ case: 'object', then: { field: 'string', op: 'enums:eq,ne' } },
				],
			},
		}
		ok(rules, { filter: 'name=x' })
		ok(rules, { filter: { field: 'name', op: 'eq' } })
		fails(rules, { filter: { field: 'name', op: 'zz' } }, ['filter.op is invalid'])
	})
})
