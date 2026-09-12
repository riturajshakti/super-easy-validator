const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { validate } = require('../dist/index.js')

const errorsOf = (rules, data) => validate(rules, data).errors
const accepts = (rule, values) => {
	for (const v of values) {
		test(`accepts ${JSON.stringify(v)}`, () => assert.equal(errorsOf({ f: rule }, { f: v }), undefined))
	}
}
const rejects = (rule, message, values) => {
	for (const v of values) {
		test(`rejects ${JSON.stringify(v)}`, () =>
			assert.deepEqual(errorsOf({ f: rule }, { f: v }), [`f ${message}`]))
	}
}

describe('name: latin scripts with diacritics', () => {
	accepts('name', ['José', 'María García', 'François', 'Müller', 'Björn', 'Søren', 'Renée', 'Zoë', 'Åsa', 'Þór', 'Ñoño', 'Beyoncé', 'Nguyễn'])
})

describe('name: non-latin scripts', () => {
	accepts('name', ['李小龙', '山田太郎', 'Владимир', 'Δημήτρης', 'محمد', 'राज'])
})

describe('name: separators', () => {
	accepts('name', [
		'John',
		'John Doe',
		'Mary Jane Watson',
		"O'Brien",
		'O’Brien',
		'Jean-Luc',
		'Anne-Marie',
		'Dr. Smith',
		'J. R. R. Tolkien',
		'St. John',
		'Smith Jr.',
		'de la Cruz',
		'van der Berg',
		'MacDonald',
		"D'Angelo",
		"Ana-María O'Neill",
	])
})

describe('name: rejections', () => {
	rejects('name', 'must be a valid name', [
		'',
		'  ',
		' John',
		'John ',
		'-John',
		'John-',
		'.John',
		'John--Doe',
		"John''Doe",
		'John,,Doe',
		'John..Doe',
		'John123',
		'test123',
		'John_Doe',
		'john@doe',
		'<script>',
		'123',
		'!!!',
	])
})

describe('fullname: accepts two or more words', () => {
	accepts('fullname', [
		'John Doe',
		'Mary Jane Watson',
		'J Doe',
		'John D',
		'Mary J Watson',
		'Jean-Luc Picard',
		'Anne-Marie Smith',
		"O'Brien Smith",
		"John O'Brien",
		'Dr. Smith',
		'J. R. R. Tolkien',
		'de la Cruz',
		'van der Berg',
		'María García',
		'José Luis Rodríguez',
		'山田 太郎',
		'Владимир Путин',
		'Nguyễn Văn Anh',
		'Smith Jr.',
	])
})

describe('fullname: rejections', () => {
	rejects('fullname', 'must be a valid fullname', [
		'John',
		'',
		'  ',
		'John ',
		' John Doe',
		'John  Doe',
		'John--Doe',
		'John123 Doe',
		'John_Doe Smith',
	])
})

describe('regression: no catastrophic backtracking', () => {
	const budgetMs = 1000

	test('name stays fast on a long non-matching string', () => {
		const start = process.hrtime.bigint()
		errorsOf({ f: 'name' }, { f: 'a'.repeat(10000) + '!' })
		const ms = Number(process.hrtime.bigint() - start) / 1e6
		assert.ok(ms < budgetMs, `name took ${ms.toFixed(1)}ms on 10k chars`)
	})

	test('name stays fast on alternating separators', () => {
		const start = process.hrtime.bigint()
		errorsOf({ f: 'name' }, { f: 'a-'.repeat(2000) + '!' })
		const ms = Number(process.hrtime.bigint() - start) / 1e6
		assert.ok(ms < budgetMs, `name took ${ms.toFixed(1)}ms on alternating input`)
	})

	test('fullname stays fast on a long non-matching string', () => {
		const start = process.hrtime.bigint()
		errorsOf({ f: 'fullname' }, { f: 'a'.repeat(10000) + '!' })
		const ms = Number(process.hrtime.bigint() - start) / 1e6
		assert.ok(ms < budgetMs, `fullname took ${ms.toFixed(1)}ms on 10k chars`)
	})

	test('fullname stays fast on repeated spaces', () => {
		const start = process.hrtime.bigint()
		errorsOf({ f: 'fullname' }, { f: 'a '.repeat(2000) + '!' })
		const ms = Number(process.hrtime.bigint() - start) / 1e6
		assert.ok(ms < budgetMs, `fullname took ${ms.toFixed(1)}ms on repeated spaces`)
	})
})

describe('arrayof works with the new name rules', () => {
	test('arrayof:name accepts unicode elements', () =>
		assert.equal(errorsOf({ f: 'arrayof:name' }, { f: ['José', '李小龙'] }), undefined))
	test('arrayof:fullname reports the offending index', () =>
		assert.deepEqual(errorsOf({ f: 'arrayof:fullname' }, { f: ['John Doe', 'John'] }), [
			'f[1] must be a valid fullname',
		]))
})
