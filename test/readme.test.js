const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { validate } = require('../dist/index.js')

describe('README: basic usage example', () => {
	const rules = {
		mail: 'optional|email',
		phone: 'optional|phone',
		$atleast: 'mail|phone',
		$atmost: 'mail|phone|size:1',
		name: 'name|field:person name',
		gender: 'enums:male,female',
		adult: 'enums:true,false',
		id: 'uuid',
		creditCard: 'string|regex:/^[0-9]{16}$/',
		isMarried: 'boolean',
		userId: 'mongoid',
		profile: 'url',
		password: 'string|min:3|max:15',
		favoriteFoods: 'array|min:3|max:6',
		rating: 'number|enums:1,2,3,4,5|error:rating is not correct, please fix it',
		ratings: 'arrayof:optional|arrayof:natural|arrayof:max:5|field:ratingsList',
		score: 'number|whole',
		accountBalance: 'number|min:0|decimalsize:2',
		hash: 'lower',
		hash2: 'upper',
		serverIp: 'ip',
		dob: 'date',
		time: 'time',
		address: {
			pin: 'string|natural|size:6',
			city: 'name',
			country: { code: 'alpha|upper|size:2' },
		},
		users: [{ name: 'name', age: 'natural', gender: 'enums:male,female' }],
		person: 'object',
		'person.address': 'string',
		limit: 'optional|string|natural|min:100',
	}

	const data = {
		name: 'test123',
		gender: 'Male',
		adult: true,
		id: '123e4567-e89b-12d3-a456-426655440000',
		creditCard: '1987654312345678',
		isMarried: 'no',
		profile: 'example.com',
		password: 'ab',
		favoriteFoods: ['chicken', 'egg roll', 'french fries'],
		rating: 4.5,
		ratings: [3, 5, undefined, true, 5.67],
		score: 234.5,
		accountBalance: 100.345,
		hash: 'a6g8d7Fkf9Du',
		hash2: 'PDH78DI908g56',
		serverIp: '8.45.23.0',
		dob: '1996-01-10T23:50:00.0000+05:30',
		time: '23:50',
		address: { pin: '829119', city: 'Rock Port', country: { code: 'IN' } },
		users: [{ name: 'John Doe', age: 20, gender: 'male' }, {}],
		limit: '90',
	}

	test('produces exactly the documented errors', () => {
		const { errors } = validate(rules, data, { quotes: 'backtick' })
		assert.deepEqual(errors, [
			'at least one of `mail` and `phone` is required',
			'`person name` must be a valid name',
			'`gender` is invalid',
			'`isMarried` must be a valid boolean',
			'`userId` is required',
			'`profile` must be a valid url',
			'`password` must have length of at least 3',
			'rating is not correct, please fix it',
			'`ratingsList[3]` must be a valid number',
			'`ratingsList[4]` must be a valid natural number',
			'`score` must be a valid whole number',
			'`accountBalance` must have 2 decimal places',
			'`hash` must not contains upper case letters',
			'`hash2` must not contains lower case letters',
			'`users[1].name` is required',
			'`users[1].age` is required',
			'`users[1].gender` is required',
			'`person` is required',
			'`person.address` is required',
			'`limit` must be at least 100',
		])
	})
})

describe('README: nested object example', () => {
	test('produces exactly the documented errors', () => {
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
})

describe('README: array objects example', () => {
	test('produces exactly the documented errors', () => {
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
})

describe('README: strict check example', () => {
	test('produces exactly the documented error', () => {
		const rules = { name: 'name', age: 'natural|min:18', gender: 'enums:male,female' }
		const user = { name: 'john doe', age: 30, gender: 'male', hobby: 'web development' }
		assert.deepEqual(validate(rules, user, { strict: true }).errors, ['hobby is not required'])
	})
})

describe('README: express query example', () => {
	test('accepts a realistic query string object', () => {
		const rules = {
			limit: 'optional|string|natural|max:100',
			page: 'optional|string|natural',
			searchKey: 'optional|string|min:1',
			productId: 'optional|mongoid',
			withProduct: 'optional|string|boolean',
			sortBy: 'optional|enums:expiry,price,createdAt',
			sortOrder: 'optional|enums:ascending,descending',
		}
		const query = {
			limit: '20',
			page: '1',
			searchKey: 'phone',
			productId: '507f1f77bcf86cd799439011',
			withProduct: 'true',
			sortBy: 'price',
			sortOrder: 'ascending',
		}
		assert.equal(validate(rules, query).errors, undefined)
	})
})
