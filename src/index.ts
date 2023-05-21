import Validator from './validator';

let body = {
	name: 'raj kumar',
	gender: 'female',
	adult: 'false',
	creditCard: '1234567891234567',
	married: true,
	phone: '+911234567890',
	commentId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
	url: 'http://yahoo.in/index.html?name=raj&password=javhcsd',
	password: '123',
	foods: ['apple', 'orange', 'mango'],
	rating: 5,
	score: 98765,
	price: '78.0098',
	date: '8765-01-01T00:00:00.000+00:00',
	time: '23:00:00.0',
	address: {
		pin: '908765',
	},
	array: [[undefined, 1, 2, '3'], undefined, ['true', false], ['hi', 'bye']],
};

let rules = {
	name: 'name',
	gender: 'enums:male,female',
	adult: 'enums:true,false',
	creditCard: ['string', 'regex:/^[0-9]{16}$/'],
	married: 'boolean',
	phone: 'phone|equal:+911234567890',
	commentId: 'string|mongoid',
	url: 'url',
	password: 'string|min:3|max:10',
	foods: ['array', 'min:3', 'max:6'],
	rating: 'number|int|min:1|max:5',
	score: 'number|size:5',
	price: 'decimalmin:2',
	date: 'date',
	time: 'time',
	address: 'object',
	'address.pin': 'numeric|size:6',
	array: 'array|arrayof:optional|arrayof:array|arrayof:arrayof:optional|arrayof:arrayof:string',
};

let { errors } = Validator.validate(rules, body);
if (errors) {
	errors.forEach((e) => console.log(e));
}
