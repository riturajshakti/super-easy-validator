const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { validate } = require('../dist/index.js')

describe('README: quick start', () => {
	test('produces exactly the documented errors', () => {
		const rules = {
			name: 'fullname',
			email: 'email',
			password: 'string|min:8',
			age: 'optional|natural|min:18',
			role: 'enums:admin,user,guest',
			website: 'optional|url',
		}
		const data = {
			name: 'John',
			email: 'not-an-email',
			password: 'abc',
			age: 15,
			role: 'superuser',
			website: 'example.com',
		}
		assert.deepEqual(validate(rules, data).errors, [
			'name must be a valid fullname',
			'email must be a valid email',
			'password must have length of at least 8',
			'age must be at least 18',
			'role is invalid',
			'website must be a valid url',
		])
	})

	test('errors is undefined when everything passes', () => {
		const rules = { name: 'fullname', email: 'email', password: 'string|min:8' }
		const data = { name: 'John Doe', email: 'john@example.com', password: 'longenough' }
		assert.equal(validate(rules, data).errors, undefined)
	})
})

describe('README: express query example', () => {
	const rules = {
		limit: 'optional|string|natural|max:100',
		page: 'optional|string|natural',
		productId: 'optional|objectid',
		sortBy: 'optional|enums:price,createdAt',
	}

	test('produces exactly the documented errors', () => {
		const query = { limit: '500', page: '1', productId: 'abc', sortBy: 'name' }
		assert.deepEqual(validate(rules, query).errors, [
			'limit must be at most 100',
			'productId must be a valid object id',
			'sortBy is invalid',
		])
	})

	test('accepts a valid query', () => {
		const query = {
			limit: '20',
			page: '1',
			productId: '507f1f77bcf86cd799439011',
			sortBy: 'price',
		}
		assert.equal(validate(rules, query).errors, undefined)
	})
})

describe('README: nested objects, arrays, arrays of objects', () => {
	test('produces exactly the documented errors', () => {
		const rules = {
			address: {
				city: 'name',
				pin: 'string|natural|size:6',
				country: { code: 'alpha|upper|size:2' },
			},
			tags: 'array|min:2|arrayof:string|arrayof:max:10',
			users: [{ name: 'name', age: 'natural' }],
		}
		const data = {
			address: { city: 'Rock Port', pin: 'ABC', country: { code: 'in' } },
			tags: ['ok', 'waaaaaaaaaytoolong'],
			users: [{ name: 'Jo', age: 20 }, {}],
		}
		assert.deepEqual(validate(rules, data).errors, [
			'address.pin must be a valid numeric string',
			'address.country.code must not contains lower case letters',
			'tags[1] must have length of at most 10',
			'users[1].name is required',
			'users[1].age is required',
		])
	})
})

describe('README: field groups and custom messages', () => {
	test('produces exactly the documented errors', () => {
		const rules = {
			email: 'optional|email',
			phone: 'optional|phone',
			$atleast: 'email|phone',
			age: 'natural|field:person age',
			score: 'number|error:score must be numeric',
		}
		const { errors } = validate(rules, { age: -5, score: 'x' }, { quotes: 'backtick' })
		assert.deepEqual(errors, [
			'at least one of `email` and `phone` is required',
			'`person age` must be a valid natural number',
			'score must be numeric',
		])
	})
})

describe('README: TypeScript example compiles as documented', () => {
	test('the valid rule works at runtime too', () =>
		assert.equal(validate({ age: 'natural|min:18' }, { age: 20 }).errors, undefined))
})

describe('README: options', () => {
	test('strict rejects undeclared fields', () =>
		assert.deepEqual(validate({ a: 'string' }, { a: 'x', b: 1 }, { strict: true }).errors, [
			'b is not required',
		]))
	test('quotes wraps field names', () =>
		assert.deepEqual(validate({ a: 'string' }, { a: 1 }, { quotes: 'backtick' }).errors, [
			'`a` must be string',
		]))
})

describe('DOCS.md: worked examples stay correct', () => {
	test('nested object example', () => {
		const rules = {
			address: {
				line1: 'string|min:10',
				line2: 'optional|string|min:10',
				city: 'name',
				state: 'name',
				pin: 'string|natural|size:6',
				country: { code: 'alpha|upper|size:2', phoneCode: 'regex:/^\\+[0-9]{1,3}$/' },
			},
		}
		const data = {
			address: {
				line1: 800,
				line2: false,
				city: 'N/A',
				state: 'N/A',
				pin: 'ABC123',
				country: { phoneCode: '+9999' },
			},
		}
		assert.deepEqual(validate(rules, data).errors, [
			'address.line1 must be string',
			'address.line2 must be string',
			'address.city must be a valid name',
			'address.state must be a valid name',
			'address.pin must be a valid numeric string',
			'address.country.code is required',
			'address.country.phoneCode is invalid',
		])
	})

	test('array objects example', () => {
		const rules = {
			products: [
				{
					title: 'string|min:5',
					description: 'string|min:20',
					price: 'positive',
					category: 'enums:Electronics,Kitchen,Fashion,Others',
				},
			],
		}
		const data = {
			products: [
				{
					title: 'Smartphone',
					description: 'High-performance smartphone with a stunning display and advanced features.',
					price: 599.99,
				},
				{ title: 'Coffee Maker', price: 'InvalidPrice', category: 'Kitchen' },
				{
					title: 'Designer Dress',
					description: 'Elegant and stylish designer dress for special occasions.',
					price: 149.99,
					category: 'InvalidCategory',
				},
				{
					title: 123,
					description: 'Premium-quality notebook for all your creative and professional needs.',
					price: '29.99',
					category: 'Others',
				},
				{ title: 'Invalid', description: 'Short desc', price: -10, category: 'Fashion' },
				{
					title: 'Laptop',
					description: 'Powerful laptop with cutting-edge technology.',
					price: 999.99,
					category: 'Electronics',
				},
			],
		}
		assert.deepEqual(validate(rules, data).errors, [
			'products[0].category is required',
			'products[1].description is required',
			'products[1].price must be a valid number',
			'products[2].category is invalid',
			'products[3].title must be string',
			'products[3].price must be a valid number',
			'products[4].description must have length of at least 20',
			'products[4].price must be a valid positive number',
		])
	})

	test('strict check example', () => {
		const rules = { name: 'name', age: 'natural|min:18', gender: 'enums:male,female' }
		const user = { name: 'john doe', age: 30, gender: 'male', hobby: 'web development' }
		assert.deepEqual(validate(rules, user, { strict: true }).errors, ['hobby is not required'])
	})
})
