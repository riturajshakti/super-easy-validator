const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { validate, ErrorCodes } = require('../dist/index.js')

const errorsOf = (rules, data, config) => validate(rules, data, config).errors
const ok = (rules, data, config) => assert.equal(errorsOf(rules, data, config), undefined)
const fails = (rules, data, expected, config) => assert.deepEqual(errorsOf(rules, data, config), expected)
const throws = (rules, data) => assert.throws(() => validate(rules, data), { name: 'InvalidRuleError' })

describe('$or: scalar branches', () => {
	const rules = { id: { $or: ['objectid', 'uuid'] } }

	test('accepts the first branch', () => ok(rules, { id: '507f1f77bcf86cd799439011' }))
	test('accepts the second branch', () => ok(rules, { id: '123e4567-e89b-12d3-a456-426655440000' }))
	test('rejects a value matching neither', () => assert.ok(errorsOf(rules, { id: 'nope' }).length > 0))
	test('a single-branch $or behaves like the branch', () =>
		fails({ a: { $or: ['email'] } }, { a: 'bad' }, ['a must be a valid email']))
	test('three branches', () => {
		const r = { c: { $or: ['email', 'phone', 'username'] } }
		ok(r, { c: 'a@b.com' })
		ok(r, { c: '9876543210' })
		ok(r, { c: 'john_doe1' })
	})
})

describe('$or: object vs scalar branches', () => {
	const rules = { address: { $or: ['string|max:20', { city: 'name', pin: 'string|natural|size:6' }] } }

	test('accepts a short string', () => ok(rules, { address: '221B Baker Street' }))
	test('accepts a valid object', () => ok(rules, { address: { city: 'London', pin: '123456' } }))
	test('object data reports the object branch errors, not the string branch', () =>
		fails(rules, { address: { city: '123', pin: '123456' } }, ['address.city must be a valid name']))
	test('string data reports the string branch errors', () =>
		fails(rules, { address: 'a'.repeat(50) }, ['address must have length of at most 20']))
	test('a missing sub-field of the object branch is reported', () =>
		fails(rules, { address: { city: 'London' } }, ['address.pin is required']))
})

describe('$or: type preference picks the intended branch', () => {
	const rules = { v: { $or: ['string|min:10', { a: 'natural' }] } }

	test('object data selects the object branch', () =>
		fails(rules, { v: { a: -1 } }, ['v.a must be a valid natural number']))
	test('string data selects the string branch', () =>
		fails(rules, { v: 'short' }, ['v must have length of at least 10']))
	test('array data against object and array branches', () => {
		const r = { v: { $or: [{ a: 'string' }, 'array|min:3'] } }
		fails(r, { v: [1] }, ['v must have length of at least 3'])
	})
	test('number data prefers a number branch', () => {
		const r = { v: { $or: ['string|min:2', 'number|min:100'] } }
		fails(r, { v: 5 }, ['v must be at least 100'])
	})
})

describe('$or: fewest errors breaks a type tie', () => {
	test('the branch with fewer failures wins', () => {
		const rules = { v: { $or: [{ a: 'string', b: 'string', c: 'string' }, { a: 'string' }] } }
		fails(rules, { v: { a: 1 } }, ['v.a must be string'])
	})
})

describe('$and: every branch must pass', () => {
	test('passes when all branches pass', () =>
		ok({ p: { $and: ['string|min:8', 'regex:/[0-9]/'] } }, { p: 'abcd1234' }))
	test('reports failures from every branch', () => {
		const errors = errorsOf({ p: { $and: ['string|min:12', 'regex:/[0-9]/'] } }, { p: 'abc' })
		assert.equal(errors.length, 2)
	})
	test('a single failing branch is reported', () =>
		fails({ p: { $and: ['string', 'min:5'] } }, { p: 'ab' }, ['p must have length of at least 5']))
	test('combines an object branch with a scalar branch', () =>
		ok({ u: { $and: ['object', { name: 'string' }] } }, { u: { name: 'x' } }))
})

describe('$and with optional: the optional nested object gap', () => {
	const rules = { addr: { $and: ['optional', { city: 'name', pin: 'string|natural|size:6' }] } }

	test('absent passes', () => ok(rules, {}))
	test('present and valid passes', () => ok(rules, { addr: { city: 'London', pin: '123456' } }))
	test('present and invalid still reports', () =>
		fails(rules, { addr: { city: '123', pin: '123456' } }, ['addr.city must be a valid name']))
	test('explicitly undefined passes', () => ok(rules, { addr: undefined }))
	test('null is still rejected without nullable', () =>
		assert.ok(errorsOf(rules, { addr: null }).length > 0))
})

describe('$and with nullable', () => {
	const rules = { p: { $and: ['nullable', { bio: 'string' }] } }

	test('null passes', () => ok(rules, { p: null }))
	test('valid object passes', () => ok(rules, { p: { bio: 'hi' } }))
	test('absent is still required without optional', () =>
		assert.ok(errorsOf(rules, {}).length > 0))
})

describe('$and with optional and nullable together', () => {
	const rules = { p: { $and: ['optional|nullable', { bio: 'string' }] } }

	test('absent passes', () => ok(rules, {}))
	test('null passes', () => ok(rules, { p: null }))
	test('valid object passes', () => ok(rules, { p: { bio: 'hi' } }))
	test('invalid object reports', () => fails(rules, { p: { bio: 1 } }, ['p.bio must be string']))
})

describe('$and with optional: the optional array-of-objects gap', () => {
	const rules = { products: { $and: ['optional', [{ title: 'string|min:3', price: 'positive' }]] } }

	test('absent passes', () => ok(rules, {}))
	test('empty array passes', () => ok(rules, { products: [] }))
	test('valid list passes', () => ok(rules, { products: [{ title: 'Book', price: 10 }] }))
	test('invalid element reports with an index', () =>
		fails(rules, { products: [{ title: 'ab', price: 10 }] }, [
			'products[0].title must have length of at least 3',
		]))
	test('a non-array is rejected', () => assert.ok(errorsOf(rules, { products: 'x' }).length > 0))
})

describe('nesting: operators inside operators', () => {
	test('$or inside $and', () => {
		const rules = { a: { $and: ['optional', { $or: ['string|max:5', { c: 'name' }] }] } }
		ok(rules, {})
		ok(rules, { a: 'ab' })
		ok(rules, { a: { c: 'John' } })
		assert.ok(errorsOf(rules, { a: 'far too long a string' }).length > 0)
	})

	test('$and inside $or', () => {
		const rules = { a: { $or: [{ $and: ['string', 'min:3'] }, 'number'] } }
		ok(rules, { a: 'abcd' })
		ok(rules, { a: 42 })
		assert.ok(errorsOf(rules, { a: 'ab' }).length > 0)
	})

	test('three levels deep', () => ok({ a: { $or: [{ $or: [{ $or: ['number'] }] }] } }, { a: 5 }))

	test('four levels deep with a failure', () => {
		const rules = { a: { $and: [{ $or: [{ $and: ['number', 'min:10'] }] }] } }
		ok(rules, { a: 20 })
		assert.ok(errorsOf(rules, { a: 5 }).length > 0)
	})
})

describe('operators inside nested objects', () => {
	test('operator one level down', () => {
		const rules = { a: { b: { $or: ['string', 'number'] } } }
		ok(rules, { a: { b: 5 } })
		ok(rules, { a: { b: 'x' } })
		fails(rules, { a: { b: true } }, ['a.b must be string'])
	})

	test('operator two levels down', () => {
		const rules = { a: { b: { c: { $or: ['email', 'phone'] } } } }
		ok(rules, { a: { b: { c: 'x@y.com' } } })
		assert.ok(errorsOf(rules, { a: { b: { c: '!!!' } } }).length > 0)
	})

	test('the enclosing object is still required', () =>
		fails({ a: { b: { $or: ['string'] } } }, {}, ['a is required']))
})

describe('operators inside arrays of objects', () => {
	const rules = { u: [{ v: { $or: ['email', 'phone'] } }] }

	test('each element validates independently', () => ok(rules, { u: [{ v: 'a@b.com' }, { v: '9876543210' }] }))
	test('the failing index is named', () =>
		fails(rules, { u: [{ v: 'a@b.com' }, { v: '!!!' }] }, ['u[1].v must be a valid email']))
	test('multiple failing elements', () => {
		const errors = errorsOf(rules, { u: [{ v: '!!!' }, { v: '???' }] })
		assert.equal(errors.length, 2)
	})
})

describe('operator at the discriminated-union level', () => {
	const rules = {
		payment: {
			$or: [
				{ type: 'equal:card', number: 'string|regex:/^[0-9]{16}$/' },
				{ type: 'equal:upi', upiId: 'string|min:5' },
			],
		},
	}

	test('accepts a valid card', () => ok(rules, { payment: { type: 'card', number: '1234567812345678' } }))
	test('accepts a valid upi', () => ok(rules, { payment: { type: 'upi', upiId: 'john@okbank' } }))
	test('reports something for an invalid card', () =>
		assert.ok(errorsOf(rules, { payment: { type: 'card', number: '12' } }).length > 0))
})

describe('existing behaviour is unchanged', () => {
	test('a plain nested object is still required', () =>
		fails({ a: { c: 'name' } }, {}, ['a is required']))
	test('a plain nested object still rejects a non-object', () =>
		fails({ a: { c: 'name' } }, { a: 'x' }, ['a must be of type object']))
	test('a plain tuple rule is still required', () => fails({ p: [{ t: 'string' }] }, {}, ['p is required']))
	test('a plain tuple rule still rejects a non-array', () =>
		fails({ p: [{ t: 'string' }] }, { p: 'x' }, ['p must be of type array']))
	test('$atleast still works alongside operators', () => {
		const rules = { a: 'optional|string', b: 'optional|string', $atleast: 'a|b', c: { $or: ['string'] } }
		ok(rules, { a: 'x', c: 'y' })
		assert.ok(errorsOf(rules, { c: 'y' }).length > 0)
	})
	test('nested object rules with many keys are untouched', () =>
		fails(
			{ addr: { line1: 'string|min:10', city: 'name', country: { code: 'alpha|upper|size:2' } } },
			{ addr: { line1: 'short', city: 'London', country: { code: 'in' } } },
			[
				'addr.line1 must have length of at least 10',
				'addr.country.code must not contains lower case letters',
			]
		))
})

describe('strict mode with operators', () => {
	test('the matched object branch declares its keys', () =>
		fails({ a: { $or: [{ c: 'name' }] } }, { a: { c: 'John', extra: 1 } }, ['a.extra is not required'], {
			strict: true,
		}))
	test('no strict error when the branch declares every key', () =>
		ok({ a: { $or: [{ c: 'name', d: 'string' }] } }, { a: { c: 'John', d: 'x' } }, { strict: true }))
})

describe('details and codes flow through operators', () => {
	test('details are produced for operator failures', () => {
		const { details } = validate({ a: { $or: ['email'] } }, { a: 'bad' })
		assert.equal(details.length, 1)
		assert.equal(details[0].code, ErrorCodes.NOT_EMAIL)
	})
	test('errors and details stay aligned', () => {
		const { errors, details } = validate({ a: { $and: ['string|min:10', 'regex:/[0-9]/'] } }, { a: 'ab' })
		assert.equal(details.length, errors.length)
		details.forEach((d, i) => assert.equal(d.message, errors[i]))
	})
	test('quotes apply to operator errors', () =>
		fails({ a: { $or: ['email'] } }, { a: 'bad' }, ['`a` must be a valid email'], { quotes: 'backtick' }))
	test('custom error: works inside a branch', () =>
		fails({ a: { $or: ['email|error:bad contact'] } }, { a: 'x' }, ['bad contact']))
})

describe('malformed operator nodes throw', () => {
	test('$or is not an array', () => throws({ a: { $or: 'string' } }, { a: 'x' }))
	test('$or is empty', () => throws({ a: { $or: [] } }, { a: 'x' }))
	test('$and is not an array', () => throws({ a: { $and: {} } }, { a: 'x' }))
	test('$and is empty', () => throws({ a: { $and: [] } }, { a: 'x' }))
	test('$or beside a sibling key', () => throws({ a: { $or: ['string'], city: 'name' } }, { a: 'x' }))
	test('$and and $or in one object', () =>
		throws({ a: { $and: ['string'], $or: ['number'] } }, { a: 'x' }))
	test('the message names the field', () =>
		assert.throws(() => validate({ addr: { $or: [] } }, { addr: 'x' }), /'addr'/))
	test('the message names the operator', () =>
		assert.throws(() => validate({ a: { $or: [] } }, { a: 'x' }), /\$or/))
	test('an unknown rule inside a branch throws', () =>
		throws({ a: { $or: ['strng'] } }, { a: 'x' }))
	test('an unknown rule in a nested branch object throws', () =>
		throws({ a: { $or: [{ b: 'strng' }] } }, { a: { b: 'x' } }))
})

describe('unknown rules throw everywhere', () => {
	test('a bare typo', () => throws({ a: 'strng' }, { a: 'x' }))
	test('an argument-rule typo', () => throws({ a: 'mim:5' }, { a: 1 }))
	test('an unknown arrayof suffix', () => throws({ a: 'arrayof:nope' }, { a: [1] }))
	test('an empty arrayof', () => throws({ a: 'arrayof:' }, { a: [1] }))
	test('a typo in an array-form rule', () => throws({ a: ['string', 'mim:3'] }, { a: 'x' }))
	test('a typo inside a nested object rule', () => throws({ a: { b: 'strng' } }, { a: { b: 'x' } }))
	test('a typo inside a tuple rule', () => throws({ u: [{ v: 'strng' }] }, { u: [{ v: 'x' }] }))
	test('the message names the field and the token', () =>
		assert.throws(() => validate({ age: 'naturel' }, { age: 1 }), /'age'.*'naturel'/))

	test('every valid rule name is accepted', () => {
		const names = [
			'optional', 'nullable', 'string', 'number', 'boolean', 'array', 'object', 'bigint', 'symbol',
			'email', 'url', 'domain', 'name', 'fullname', 'username', 'alpha', 'alphanumeric', 'phone',
			'phonecode', 'mongoid', 'objectid', 'uuid', 'date', 'dateonly', 'time', 'lower', 'upper', 'ip',
			'int', 'positive', 'negative', 'natural', 'whole',
		]
		for (const n of names) {
			assert.doesNotThrow(() => validate({ a: `optional|${n}` }, {}), `${n} should be valid`)
		}
	})

	test('every argument rule prefix is accepted', () => {
		const args = [
			'equal:x', 'size:3', 'min:1', 'max:9', 'regex:/^a$/', 'decimalsize:2', 'decimalmin:1',
			'decimalmax:3', 'enums:a,b', 'field:Label', 'error:msg',
		]
		for (const a of args) {
			assert.doesNotThrow(() => validate({ a: `optional|${a}` }, {}), `${a} should be valid`)
		}
	})

	test('arrayof composes with valid inner rules', () => {
		for (const r of ['arrayof:string', 'arrayof:optional', 'arrayof:min:3', 'arrayof:enums:a,b']) {
			assert.doesNotThrow(() => validate({ a: r }, { a: [] }), `${r} should be valid`)
		}
	})
})

describe('regression: arrayof branches inside $or', () => {
	const rules = { a: { $or: ['string', 'arrayof:email'] } }

	test('array data selects the arrayof branch', () =>
		fails(rules, { a: ['bad'] }, ['a[0] must be a valid email']))
	test('a valid array passes', () => ok(rules, { a: ['x@y.com'] }))
	test('string data still selects the string branch', () => ok(rules, { a: 'hello' }))
	test('nested arrayof is selected for array data', () =>
		fails({ a: { $or: ['string', 'arrayof:arrayof:number'] } }, { a: [['x']] }, [
			'a[0][0] must be a valid number',
		]))
	test('arrayof with a constraint branch', () =>
		fails({ a: { $or: ['number', 'arrayof:max:2'] } }, { a: ['abcd'] }, [
			'a[0] must have length of at most 2',
		]))
})

describe('regression: strict mode with $and merges branch keys', () => {
	const rules = { a: { $and: [{ c: 'name' }, { d: 'string' }] } }

	test('keys from every branch count as declared', () =>
		ok(rules, { a: { c: 'John', d: 'x' } }, { strict: true }))
	test('a genuinely undeclared key is still reported', () =>
		fails(rules, { a: { c: 'John', d: 'x', zz: 1 } }, ['a.zz is not required'], { strict: true }))
	test('a single object branch is unaffected', () =>
		fails({ a: { $and: [{ c: 'name' }] } }, { a: { c: 'John', extra: 1 } }, ['a.extra is not required'], {
			strict: true,
		}))
	test('three branches all contribute keys', () =>
		ok({ a: { $and: [{ c: 'name' }, { d: 'string' }, { e: 'number' }] } }, { a: { c: 'John', d: 'x', e: 1 } }, {
			strict: true,
		}))
	test('validation errors from every branch are still reported', () =>
		fails(rules, { a: { c: '123', d: 1 } }, ['a.c must be a valid name', 'a.d must be string']))
})

describe('regression: strict mode with a failed $or', () => {
	test('a matched branch still reports an extra key', () =>
		fails({ a: { $or: [{ c: 'name' }] } }, { a: { c: 'John', extra: 1 } }, ['a.extra is not required'], {
			strict: true,
		}))
	test('a matched branch with no extra key passes', () =>
		ok({ a: { $or: [{ c: 'name' }] } }, { a: { c: 'John' } }, { strict: true }))
	test('no strict noise when no branch matched', () =>
		fails({ a: { $or: [{ c: 'name' }] } }, { a: { zzz: 1 } }, ['a.c is required'], { strict: true }))
})

describe('regression: a $or branch cannot be only optional or nullable', () => {
	test('bare optional throws', () => throws({ a: { $or: ['optional', { c: 'name' }] } }, { a: { c: '1' } }))
	test('bare nullable throws', () => throws({ a: { $or: ['nullable', { c: 'name' }] } }, { a: null }))
	test('bare optional|nullable throws', () =>
		throws({ a: { $or: ['optional|nullable', { c: 'name' }] } }, {}))
	test('the array form also throws', () =>
		throws({ a: { $or: [['optional'], { c: 'name' }] } }, { a: { c: '1' } }))
	test('the message points at $and', () =>
		assert.throws(() => validate({ a: { $or: ['optional', { c: 'name' }] } }, {}), /\$and/))

	test('optional combined with a real rule is allowed', () =>
		fails({ a: { $or: ['optional|string', { c: 'name' }] } }, { a: 5 }, ['a must be string']))
	test('$and with bare optional is still allowed', () =>
		ok({ a: { $and: ['optional', { c: 'name' }] } }, {}))
	test('$and with bare nullable is still allowed', () =>
		ok({ a: { $and: ['nullable', { c: 'name' }] } }, { a: null }))
	test('an invalid value is no longer silently accepted', () =>
		assert.throws(() => validate({ a: { $or: ['optional', { c: 'name' }] } }, { a: { c: '123' } })))
})
