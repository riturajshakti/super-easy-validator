# super-easy-validator

**Validate data with rules you write as plain strings.** Zero dependencies, ~19 kB, fully typed. No builder chains, no schema objects — just `'optional|email'`.

```sh
npm i super-easy-validator
```

**[📖 Full documentation — guide and complete API reference](https://github.com/riturajshakti/super-easy-validator/blob/main/DOCS.md)**

---

## Why

```js
// super-easy-validator
{ age: 'optional|natural|min:18' }

// the usual alternative
z.number().int().positive().min(18).optional()
```

- **Zero runtime dependencies** — ~19 kB to download, ~90 kB on disk
- **Type-safe rule strings** — `'mim:5'` is a compile error in TypeScript
- Works with plain JavaScript too
- Nested objects, arrays of objects, per-element array rules, custom messages

### Size comparison

| Package | Download | On disk | Dependencies |
|---|---|---|---|
| **super-easy-validator** | **19 kB** | **90 kB** | **0** |
| express-validator | 34 kB | 6.8 MB | 2 |
| yup | 65 kB | 780 kB | 4 |
| valibot | 189 kB | 1.8 MB | 0 |
| joi | 417 kB | 2.7 MB | 7 |
| zod | 1.0 MB | 8.2 MB | 0 |

"On disk" is the full `node_modules` footprint after install, including
transitive dependencies. Measured on the current release of each package.

These libraries are not all equivalent — zod and valibot infer TypeScript types
from your schema, and joi covers cases this package does not. If you need those,
use them. This package aims at the common cases, at a fraction of the weight.

---

## Quick start

```js
const { validate } = require('super-easy-validator')

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

const { errors } = validate(rules, data)
if (errors) console.log(errors)
```

```js
[
  'name must be a valid fullname',
  'email must be a valid email',
  'password must have length of at least 8',
  'age must be at least 18',
  'role is invalid',
  'website must be a valid url'
]
```

`errors` is `undefined` when everything passes — so `if (errors)` is the idiom.

---

## Example: validating an Express query string

Every value in `req.query` is a string, and most are optional. Rules like `objectid` and `enums:` check for a string automatically, so you only add `string` where you need a numeric-string check.

```js
const rules = {
  limit: 'optional|string|natural|max:100',
  page: 'optional|string|natural',
  productId: 'optional|objectid',
  sortBy: 'optional|enums:price,createdAt',
}

const { errors } = validate(rules, req.query)
if (errors) return res.status(400).json({ message: errors[0] })
```

```js
// for { limit: '500', page: '1', productId: 'abc', sortBy: 'name' }
[
  'limit must be at most 100',
  'productId must be a valid object id',
  'sortBy is invalid'
]
```

→ [Automatic string check](https://github.com/riturajshakti/super-easy-validator/blob/main/DOCS.md#3-automatic-string-check) · [Optional and nullable](https://github.com/riturajshakti/super-easy-validator/blob/main/DOCS.md#5-optional-and-nullable-values)

---

## Example: nested objects, arrays, and arrays of objects

Nest rule objects as deep as you like. Use `arrayof:` to check every element, and a single-element tuple `[{...}]` to validate every object in an array.

```js
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
```

```js
[
  'address.pin must be a valid numeric string',
  'address.country.code must not contains lower case letters',
  'tags[1] must have length of at most 10',
  'users[1].name is required',
  'users[1].age is required'
]
```

Errors are labelled with the full path, including array indices.

→ [Nested objects](https://github.com/riturajshakti/super-easy-validator/blob/main/DOCS.md#8-nested-object-validation) · [Array rules](https://github.com/riturajshakti/super-easy-validator/blob/main/DOCS.md#9-simple-array-validation) · [Arrays of objects](https://github.com/riturajshakti/super-easy-validator/blob/main/DOCS.md#10-array-objects-validation)

---

## Example: field groups and custom messages

`$atleast` and `$atmost` validate across a group of fields. `field:` renames a field in messages, `error:` replaces the message entirely, and `quotes` wraps field names.

```js
const rules = {
  email: 'optional|email',
  phone: 'optional|phone',
  $atleast: 'email|phone',
  age: 'natural|field:person age',
  score: 'number|error:score must be numeric',
}

const { errors } = validate(rules, { age: -5, score: 'x' }, { quotes: 'backtick' })
```

```js
[
  'at least one of `email` and `phone` is required',
  '`person age` must be a valid natural number',
  'score must be numeric'
]
```

→ [$atleast / $atmost](https://github.com/riturajshakti/super-easy-validator/blob/main/DOCS.md#3-atleast) · [Error options](https://github.com/riturajshakti/super-easy-validator/blob/main/DOCS.md#11-error-options) · [Strict mode](https://github.com/riturajshakti/super-easy-validator/blob/main/DOCS.md#12-strict-check)

---

## Example: one field, several valid shapes

`$or` passes if **any** branch passes. `$and` requires **every** branch. Branches can be rule strings, object rules, array-of-object rules, or nested operators.

```js
const rules = {
  // an address may be a one-line string or a structured object
  address: {
    $or: [
      'string|max:60',
      { city: 'name', pin: 'string|natural|size:6' },
    ],
  },

  // an id from either database
  userId: { $or: ['objectid', 'uuid'] },

  // $and makes a nested object optional — absent is fine, present is validated
  billing: {
    $and: ['optional', { line1: 'string|min:5', city: 'name' }],
  },
}

const { errors } = validate(rules, {
  address: { city: 'Rock Port', pin: 'ABC' },
  userId: '507f1f77bcf86cd799439011',
})
```

```js
['address.pin must be a valid numeric string']
```

`$or` reports the branch that best fits the value — object data is checked against the object branch, so you get `address.pin ...` rather than a vague "address is invalid".

Use `$and` with `optional` or `nullable` to make nested objects and arrays of objects optional, which is otherwise not expressible:

```js
{ products: { $and: ['optional', [{ title: 'string|min:5', price: 'positive' }]] } }
```

→ [$or and $and in full](https://github.com/riturajshakti/super-easy-validator/blob/main/DOCS.md#or-and-and)

---

## Every rule at a glance

Combine rules with `|`, or pass an array — `['string', 'min:3']` — when a rule contains a `|` itself.

| Group | Rules |
|---|---|
| **Presence** | `optional` `nullable` `$atleast` `$atmost` |
| **Types** | `string` `number` `boolean` `array` `object` `bigint` `symbol` |
| **Strings** | `email` `url` `domain` `name` `fullname` `username` `alpha` `alphanumeric` `phone` `phonecode` `objectid` `uuid` `date` `dateonly` `time` `lower` `upper` `ip` |
| **Numbers** | `int` `positive` `negative` `natural` `whole` |
| **Constraints** | `equal:` `size:` `min:` `max:` `regex:` `decimalsize:` `decimalmin:` `decimalmax:` `enums:` |
| **Arrays** | `arrayof:<any rule above>` |
| **Messages** | `field:` `error:` and a `quotes` option |

String rules check for a string automatically; number rules check for a number. Prefix with `string` to validate numeric or boolean strings — `'string|natural'`, `'string|boolean'`.

→ [Complete API reference, with an example for every rule](https://github.com/riturajshakti/super-easy-validator/blob/main/DOCS.md#api)

---

## TypeScript

Types are generated from source, so rule strings are checked against the real rule vocabulary:

```ts
import { validate } from 'super-easy-validator'
import type { Rules } from 'super-easy-validator'

const rules: Rules = { age: 'natural|min:18' }  // ✓
const oops: Rules = { age: 'mim:18' }           // ✗ compile error
```

---

## Error codes

Alongside `errors`, `validate` returns `details` — the same messages paired with a stable machine-readable code, at matching indexes.

```js
const { errors, details } = validate({ age: 'natural|min:18' }, { age: 15 })

errors  // ['age must be at least 18']
details // [{ message: 'age must be at least 18', code: 'TOO_SMALL' }]
```

Codes let you branch on *what* failed without parsing message text:

```js
const { ErrorCodes } = require('super-easy-validator')

const missing = details.filter(d => d.code === ErrorCodes.REQUIRED)
```

They also separate failures that share a message. `enums:` and `regex:` both report `is invalid`, but carry `ENUM_MISMATCH` and `REGEX_MISMATCH`. A custom `error:` replaces the message and keeps the code, so you can show your own wording and still branch on the cause.

→ [All error codes](https://github.com/riturajshakti/super-easy-validator/blob/main/DOCS.md#error-codes)

---

## Array indexing

Rule keys can target individual array elements, count from the end, or select a range:

```js
const rules = {
  coords: 'array|size:2',
  'coords[0]': 'number|min:-90|max:90',   // latitude
  'coords[1]': 'number|min:-180|max:180', // longitude
  'history[-1]': 'date',                  // the most recent entry
  'rgb[0:3]': 'whole|max:255',            // each of the first three
}
```

A bracket selects elements, so the rule applies to each selected element — `c` alone is the array, `c[0]` is one element. Slices follow `Array.prototype.slice`, and errors report the real index:

```js
validate({ 'c[0:2]': 'number' }, { c: ['a', 'b', 3] })
// → ['c[0] must be a valid number', 'c[1] must be a valid number']
```

→ [Array indexing in full](https://github.com/riturajshakti/super-easy-validator/blob/main/DOCS.md#array-indexing)

---

## Options

```js
validate(rules, data, { quotes: 'backtick', strict: true })
```

- **`quotes`** — `'none'` (default), `'single-quotes'`, `'double-quotes'`, `'backtick'`
- **`strict`** — reject any field in the data that has no rule, nested objects included
- **`arrayIndexingCheck`** — `true` by default. Set `false` to treat keys like `'c[0]'` as literal names instead of array indexes

---

## Links

- **[Full documentation](https://github.com/riturajshakti/super-easy-validator/blob/main/DOCS.md)** — guide and complete API reference
- [npm package](https://www.npmjs.com/package/super-easy-validator)
- [GitHub repository](https://github.com/riturajshakti/super-easy-validator)
- [Changelog](https://github.com/riturajshakti/super-easy-validator/blob/main/CHANGELOG.md)
- [Report an issue](https://github.com/riturajshakti/super-easy-validator/issues)

Requires Node 16.6+. MIT licensed. Issues and feature suggestions welcome.
