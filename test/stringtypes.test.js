const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { validate } = require('../dist/index.js')

const errorsOf = (rules, data) => validate(rules, data).errors
const ok = (rules, data) => assert.equal(errorsOf(rules, data), undefined)
const fails = (rules, data, expected) => assert.deepEqual(errorsOf(rules, data), expected)

const accepts = (rule, values) => {
	for (const v of values) {
		test(`accepts ${JSON.stringify(v)}`, () => ok({ f: rule }, { f: v }))
	}
}
const rejects = (rule, message, values) => {
	for (const v of values) {
		test(`rejects ${JSON.stringify(v)}`, () => fails({ f: rule }, { f: v }, [`f ${message}`]))
	}
}

describe('email', () => {
	accepts('email', ['a@b.com', 'first.last@sub.domain.co.uk', "o'brien@mail.org"])
	rejects('email', 'must be a valid email', ['plainstring', 'a@', '@b.com', 'a b@c.com', 'a@b'])
	test('auto-applies the string check', () =>
		fails({ f: 'email' }, { f: 123 }, ['f must be string']))
})

describe('url', () => {
	accepts('url', ['https://example.com', 'http://www.example.com/path', 'www.example.com'])
	rejects('url', 'must be a valid url', ['example.com', 'not a url', 'ftp://x'])
})

describe('domain', () => {
	accepts('domain', ['example.com', 'sub-domain.co.in'])
	rejects('domain', 'must be a valid domain', ['https://example.com', 'not a domain'])
})

describe('name', () => {
	accepts('name', ['John', 'John Doe', "O'Brien", 'Jean-Luc', 'Dr. Smith'])
	rejects('name', 'must be a valid name', ['test123', '...', '@@@'])
})

describe('fullname', () => {
	accepts('fullname', ['John Doe', 'Mary Jane Watson'])
	rejects('fullname', 'must be a valid fullname', ['John', 'test123'])
})

describe('username', () => {
	accepts('username', ['john_doe', 'user.name1'])
	rejects('username', 'must be a valid username', ['ab', '_leading', 'has..dots'])
})

describe('alpha', () => {
	accepts('alpha', ['abc', 'ABC', 'MixedCase'])
	rejects('alpha', 'must be a valid alpha', ['abc123', 'with space', ''])
})

describe('alphanumeric', () => {
	accepts('alphanumeric', ['abc123', 'ABC', '123'])
	rejects('alphanumeric', 'must be a valid alphanumeric', ['with space', 'has-dash', ''])
})

describe('phone', () => {
	accepts('phone', ['+91 9876543210', '9876543210', '+1 (555)1234567', '555 123 4567'])
	rejects('phone', 'must be a valid phone', ['abc', '++91', '+1 (555) 1234567', '+91-9876543210'])
})

describe('phonecode', () => {
	accepts('phonecode', ['+1', '+91', '+963'])
	rejects('phonecode', 'must be a valid phone code', ['91', '+1234', '+'])
})

describe('mongoid', () => {
	accepts('mongoid', ['507f1f77bcf86cd799439011'])
	rejects('mongoid', 'must be a valid mongodb id', ['507f1f77bcf86cd79943901', 'zzzf1f77bcf86cd799439011'])
})

describe('uuid', () => {
	accepts('uuid', ['123e4567-e89b-12d3-a456-426655440000'])
	rejects('uuid', 'must be a valid uuid', ['123e4567-e89b-12d3-a456', 'not-a-uuid'])
})

describe('date', () => {
	accepts('date', [
		'1996-01-10',
		'1996-01-10T23:50:34',
		'1996-01-10T23:50:34.6789Z',
		'1996-01-10T23:50:34.6789+05:30',
	])
	rejects('date', 'must be a valid date', ['not-a-date', '1996-13-45'])
})

describe('dateonly', () => {
	accepts('dateonly', ['1996-01-10', '2023-12-30'])
	rejects('dateonly', 'must be a valid date', ['1996-01-10T23:50', 'not-a-date'])
})

describe('time', () => {
	accepts('time', ['23:55', '23:55:00', '23:55:00.34'])
	rejects('time', 'must be a valid time', ['25:00', 'noon'])
})

describe('lower', () => {
	accepts('lower', ['abc', 'a6g8d7', 'with space'])
	rejects('lower', 'must not contains upper case letters', ['Abc', 'ABC'])
})

describe('upper', () => {
	accepts('upper', ['ABC', 'PDH78'])
	rejects('upper', 'must not contains lower case letters', ['Abc', 'abc'])
})

describe('ip', () => {
	accepts('ip', ['8.45.23.0', '255.255.255.255', '0.0.0.0'])
	rejects('ip', 'must be a valid IP address', ['256.1.1.1', '1.2.3', 'localhost'])
})
