const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { validate, ErrorCodes } = require('../dist/index.js')

const errorsOf = (rules, data, config) => validate(rules, data, config).errors
const ok = (rules, data, config) => assert.equal(errorsOf(rules, data, config), undefined)
const fails = (rules, data, expected, config) => assert.deepEqual(errorsOf(rules, data, config), expected)
const throws = (rules, data) => assert.throws(() => validate(rules, data), { name: 'InvalidRuleError' })

const even = (v) => (typeof v === 'number' && v % 2 === 0 ? undefined : { message: 'must be even', code: 'NOT_EVEN' })

describe('custom rule basics', () => {
	test('undefined means the value passes', () => ok({ n: even }, { n: 4 }))
	test('an object return becomes an error', () => fails({ n: even }, { n: 3 }, ['must be even']))
	test('null also means pass', () => ok({ n: () => null }, { n: 'anything' }))
	test('the function is called even when the value is absent', () =>
		fails({ n: even }, {}, ['must be even']))
	test('the function receives undefined for an absent value', () => {
		let seen = 'unset'
		validate({ n: (v) => { seen = v; return undefined } }, {})
		assert.equal(seen, undefined)
	})
	test('the function receives null for a null value', () => {
		let seen = 'unset'
		validate({ n: (v) => { seen = v; return undefined } }, { n: null })
		assert.equal(seen, null)
	})
	test('the developer can accept absence explicitly', () =>
		ok({ n: (v) => (v === undefined ? undefined : even(v)) }, {}))
	test('the function is called exactly once per field', () => {
		let calls = 0
		validate({ n: () => { calls++; return undefined } }, { n: 1 })
		assert.equal(calls, 1)
	})
})

describe('the parent parameter', () => {
	test('receives the enclosing object', () => {
		let seen
		validate({ a: 'string', b: (v, p) => { seen = p; return undefined } }, { a: 'x', b: 1 })
		assert.deepEqual(seen, { a: 'x', b: 1 })
	})

	test('enables cross-field comparison', () => {
		const confirm = (v, p) =>
			v === p.password ? undefined : { message: 'passwords do not match', code: 'MISMATCH' }
		const rules = { password: 'string|min:3', confirm }
		ok(rules, { password: 'abcd', confirm: 'abcd' })
		fails(rules, { password: 'abcd', confirm: 'xyz' }, ['passwords do not match'])
	})

	test('enables date range checks', () => {
		const endAfterStart = (v, p) =>
			new Date(v) > new Date(p.from) ? undefined : { message: 'to must be after from', code: 'RANGE' }
		const rules = { from: 'date', to: endAfterStart }
		ok(rules, { from: '2024-01-01', to: '2024-06-01' })
		fails(rules, { from: '2024-06-01', to: '2024-01-01' }, ['to must be after from'])
	})

	test('enables conditional requirements', () => {
		const taxId = (v, p) =>
			p.type === 'business' && !v ? { message: 'taxId required for business', code: 'REQ' } : undefined
		const rules = { type: 'enums:personal,business', taxId }
		ok(rules, { type: 'personal' })
		fails(rules, { type: 'business' }, ['taxId required for business'])
	})

	test('the parent inside a nested object is that object', () => {
		let seen
		validate({ o: { n: (v, p) => { seen = p; return undefined } } }, { o: { n: 1, m: 2 } })
		assert.deepEqual(seen, { n: 1, m: 2 })
	})

	test('the parent inside a tuple element is that element', () => {
		let seen
		validate({ u: [{ n: (v, p) => { seen = p; return undefined } }] }, { u: [{ n: 1, k: 'a' }] })
		assert.deepEqual(seen, { n: 1, k: 'a' })
	})

	test('nested parent access works', () =>
		fails({ o: { n: (v, p) => (p.m === 1 ? undefined : { message: 'm must be 1', code: 'C' }) } }, { o: { n: 0, m: 2 } }, [
			'm must be 1',
		]))
})

describe('malformed returns throw', () => {
	test('true throws', () => throws({ n: () => true }, { n: 1 }))
	test('false throws', () => throws({ n: () => false }, { n: 1 }))
	test('a string throws', () => throws({ n: () => 'bad' }, { n: 1 }))
	test('a number throws', () => throws({ n: () => 1 }, { n: 1 }))
	test('an array throws', () => throws({ n: () => ['m'] }, { n: 1 }))
	test('message without code throws', () => throws({ n: () => ({ message: 'm' }) }, { n: 1 }))
	test('code without message throws', () => throws({ n: () => ({ code: 'C' }) }, { n: 1 }))
	test('non-string message throws', () => throws({ n: () => ({ message: 1, code: 'C' }) }, { n: 1 }))
	test('non-string code throws', () => throws({ n: () => ({ message: 'm', code: 1 }) }, { n: 1 }))
	test('the message names the field', () =>
		assert.throws(() => validate({ age: () => true }, { age: 1 }), /'age'/))
	test('the message shows what was returned', () =>
		assert.throws(() => validate({ n: () => true }, { n: 1 }), /true/))
})

describe('a throwing custom rule surfaces rather than becoming INTERNAL_ERROR', () => {
	test('a developer error is rethrown as InvalidRuleError', () =>
		assert.throws(() => validate({ n: () => { throw new Error('boom') } }, { n: 1 }), {
			name: 'InvalidRuleError',
			message: /boom/,
		}))
	test('the message names the field', () =>
		assert.throws(() => validate({ age: () => { throw new Error('x') } }, { age: 1 }), /'age'/))
	test('it never returns the opaque catch-all', () => {
		let returned
		try {
			returned = errorsOf({ n: () => { throw new Error('boom') } }, { n: 1 })
		} catch (e) {
			assert.equal(e.name, 'InvalidRuleError')
			return
		}
		assert.fail(`expected a throw, got ${JSON.stringify(returned)}`)
	})
})

describe('custom rules inside $and', () => {
	test('runs alongside string rules', () => {
		const rules = { n: { $and: ['natural', even] } }
		ok(rules, { n: 4 })
		fails(rules, { n: 3 }, ['must be even'])
	})
	test('reports failures from both the string rule and the function', () =>
		assert.equal(errorsOf({ n: { $and: ['natural', even] } }, { n: 'x' }).length, 2))
	test('$and with optional skips when absent', () => ok({ n: { $and: ['optional', even] } }, {}))
	test('$and with optional still runs when present', () =>
		fails({ n: { $and: ['optional', even] } }, { n: 3 }, ['must be even']))
	test('two custom rules in one $and', () => {
		const positive = (v) => (v > 0 ? undefined : { message: 'must be positive', code: 'NEG' })
		assert.equal(errorsOf({ n: { $and: [even, positive] } }, { n: -3 }).length, 2)
	})
	test('the parent is available inside $and', () =>
		fails({ a: 'string', b: { $and: [(v, p) => (p.a === 'x' ? undefined : { message: 'needs a=x', code: 'C' })] } }, { a: 'y', b: 1 }, [
			'needs a=x',
		]))
})

describe('custom rules inside $or', () => {
	test('the function branch can satisfy the $or', () => ok({ n: { $or: [even, 'string'] } }, { n: 4 }))
	test('another branch can satisfy it', () => ok({ n: { $or: [even, 'string'] } }, { n: 'hi' }))
	test('reports when no branch passes', () => fails({ n: { $or: [even, 'string'] } }, { n: 3 }, ['must be even']))
	test('the parent is available inside $or', () =>
		fails({ a: 'string', b: { $or: [(v, p) => (p.a === 'x' ? undefined : { message: 'needs a=x', code: 'C' })] } }, { a: 'y', b: 1 }, [
			'needs a=x',
		]))
	test('a custom rule as the only branch', () => {
		ok({ n: { $or: [even] } }, { n: 2 })
		fails({ n: { $or: [even] } }, { n: 1 }, ['must be even'])
	})
})

describe('custom rules in nested structures', () => {
	test('inside a nested object', () => fails({ o: { n: even } }, { o: { n: 3 } }, ['must be even']))
	test('two levels deep', () => fails({ a: { b: { n: even } } }, { a: { b: { n: 3 } } }, ['must be even']))
	test('inside a tuple element', () => fails({ u: [{ n: even }] }, { u: [{ n: 3 }] }, ['must be even']))
	test('runs for every tuple element', () =>
		assert.equal(errorsOf({ u: [{ n: even }] }, { u: [{ n: 1 }, { n: 3 }] }).length, 1))
	test('on an indexed key', () => fails({ 'c[0]': even }, { c: [3] }, ['must be even']))
	test('on a negative index', () => fails({ 'c[-1]': even }, { c: [2, 3] }, ['must be even']))
	test('on a slice key', () => fails({ 'c[0:2]': even }, { c: [3, 5] }, ['must be even']))
	test('on a dotted path', () => fails({ 'a.n': even }, { a: { n: 3 } }, ['must be even']))
})

describe('custom rules work with the rest of the library', () => {
	test('the custom code appears in details', () => {
		const { details } = validate({ n: even }, { n: 3 })
		assert.deepEqual(details, [{ message: 'must be even', code: 'NOT_EVEN' }])
	})
	test('errors and details stay aligned', () => {
		const { errors, details } = validate({ a: even, b: even }, { a: 1, b: 3 })
		assert.equal(details.length, errors.length)
		details.forEach((d, i) => assert.equal(d.message, errors[i]))
	})
	test('any code string is accepted', () => {
		const { details } = validate({ n: () => ({ message: 'm', code: 'MY_OWN_CODE' }) }, { n: 1 })
		assert.equal(details[0].code, 'MY_OWN_CODE')
	})
	test('a built-in code may be reused', () => {
		const { details } = validate({ n: () => ({ message: 'm', code: ErrorCodes.REQUIRED }) }, { n: 1 })
		assert.equal(details[0].code, ErrorCodes.REQUIRED)
	})
	test('identical messages are de-duplicated', () =>
		fails({ a: even, b: even }, { a: 1, b: 3 }, ['must be even']))
	test('strict mode counts the key as declared', () => ok({ n: even }, { n: 4 }, { strict: true }))
	test('strict mode still reports an extra key', () =>
		fails({ n: even }, { n: 4, z: 1 }, ['z is not required'], { strict: true }))
	test('mixes with ordinary string rules on other fields', () =>
		fails({ a: 'natural', n: even }, { a: -1, n: 3 }, ['a must be a valid natural number', 'must be even']))
})

describe('realistic uses', () => {
	test('password confirmation', () => {
		const rules = {
			password: 'string|min:8',
			confirmPassword: (v, p) =>
				v === p.password ? undefined : { message: 'passwords must match', code: 'PASSWORD_MISMATCH' },
		}
		ok(rules, { password: 'longenough', confirmPassword: 'longenough' })
		fails(rules, { password: 'longenough', confirmPassword: 'different' }, ['passwords must match'])
	})

	test('a total that must equal the sum of its parts', () => {
		const rules = {
			items: 'array|arrayof:number',
			total: (v, p) =>
				v === (p.items || []).reduce((a, b) => a + b, 0)
					? undefined
					: { message: 'total does not match items', code: 'BAD_TOTAL' },
		}
		ok(rules, { items: [1, 2, 3], total: 6 })
		fails(rules, { items: [1, 2, 3], total: 7 }, ['total does not match items'])
	})

	test('a domain rule the built-ins do not cover', () => {
		const luhn = (v) => {
			const digits = String(v).split('').reverse().map(Number)
			const sum = digits.reduce((acc, d, i) => acc + (i % 2 ? ((d *= 2) > 9 ? d - 9 : d) : d), 0)
			return sum % 10 === 0 ? undefined : { message: 'invalid card number', code: 'BAD_CARD' }
		}
		ok({ card: luhn }, { card: '4539578763621486' })
		fails({ card: luhn }, { card: '1234567812345678' }, ['invalid card number'])
	})

	test('combined with built-in rules through $and', () => {
		const rules = { age: { $and: ['natural|min:18', (v) => (v % 1 === 0 ? undefined : { message: 'no fractions', code: 'FRAC' })] } }
		ok(rules, { age: 30 })
		assert.ok(errorsOf(rules, { age: 10 }).length > 0)
	})
})
