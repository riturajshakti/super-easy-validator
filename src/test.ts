const Validator = require('./index');

let data = {
	name: 'test123',
	gender: 'Male',
	adult: true,
	creditCard: '1987654312345678',
	isMarried: 'no',
	profile: 'example.com',
	password: 'ab',
	favoriteFoods: ['chicken', 'egg roll', 'french fries'],
	rating: 4.5,
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
	},
};

let rules = {
	name: 'name',
	gender: 'enums:male,female',
	adult: 'enums:true,false',
	creditCard: 'string|regex:/^[0-9]{16}$/',
	isMarried: 'boolean',
	phone: 'optional|phone',
	userId: 'mongoid',
	profile: 'url',
	password: 'string|min:3|max:15',
	favoriteFoods: 'array|min:3|max:6',
	rating: 'number|enums:1,2,3,4,5',
	score: 'number|whole',
	accountBalance: 'number|min:0|decimalsize:2',
	hash: 'lower',
	hash2: 'upper',
	serverIp: 'ip',
	dob: 'date',
	time: 'time',
	address: 'object',
	'address.pin': 'numeric|size:6',
	'address.city': 'name',
};

let { errors } = Validator.validate(rules, data);
if (errors) {
	// errors.forEach((e: string) => console.log(e));
	console.log(errors);
}

// Output
// [
// 	'"name" must be a valid name',
// 	'"gender" is invalid',
// 	'"isMarried" must be boolean',
// 	'"userId" is required',
// 	'"profile" must be a valid url',
// 	'"password" must have length of at least 3',
// 	'"rating" is invalid',
// 	'"score" must be a whole number',
// 	'"accountBalance" must have 2 decimal places',
// 	'"hash" must not contains upper case letters',
// ]
