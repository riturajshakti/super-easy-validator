const Validator = require('./index')

let rules = {
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
		country: {
			code: 'alpha|upper|size:2',
		},
	},
	users: [
		{
			name: 'name',
			age: 'natural',
			gender: 'enums:male,female',
		},
	],
	person: 'object',
	'person.address': 'string',
	limit: 'optional|string|natural|min:100',
}

let data = {
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
	address: {
		pin: '829119',
		city: 'Rock Port',
		country: {
			code: 'IN',
		},
	},
	users: [
		{
			name: 'pawan',
			age: 20,
			gender: 'male',
			isMarried: true,
		},
		{},
	],
	limit: '90',
	test: false,
	okBye: 78,
}

let { errors } = Validator.validate(rules, data, {
	quotes: 'backtick',
	strict: true,
})
if (errors) {
	console.log(errors)
}

// Output
// [
//   'at least one of `mail` and `phone` is required',
//   '`person name` must be a valid name',
//   '`gender` is invalid',
//   '`isMarried` must be a valid boolean',
//   '`userId` is required',
//   '`profile` must be a valid url',
//   '`password` must have length of at least 3',
//   'rating is not correct, please fix it',
//   '`ratingsList[3]` must be a valid number',
//   '`ratingsList[4]` must be a valid natural number',
//   '`score` must be a valid whole number',
//   '`accountBalance` must have 2 decimal places',
//   '`hash` must not contains upper case letters',
//   '`hash2` must not contains lower case letters',
//   '`users[0].isMarried` is not required',
//   '`users[1].name` is required',
//   '`users[1].age` is required',
//   '`users[1].gender` is required',
//   '`person` is required',
//   '`person.address` is required',
//   '`limit` must be at least 100',
//   '`test` is not required',
//   '`okBye` is not required'
// ]