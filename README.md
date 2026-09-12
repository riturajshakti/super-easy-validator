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

const { errors } = validate(rules, {
  name: 'John',
  email: 'not-an-email',
  password: 'abc',
  age: 15,
  role: 'superuser',
  website: 'example.com',
})
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

`errors` is `undefined` when everything passes — so `if (errors)` is the idiom. Alongside it, `details` pairs each message with a stable code at the same index:

```js
const { errors, details } = validate({ age: 'natural|min:18' }, { age: 15 })
// details → [{ message: 'age must be at least 18', code: 'TOO_SMALL' }]
```

---

## Structure: nested objects, arrays, and indexing

Nest rule objects as deep as you like. Use `arrayof:` to check every element, a single-element tuple `[{...}]` for arrays of objects, and brackets in a key to target specific elements.

```js
const rules = {
  address: {
    city: 'name',
    pin: 'string|natural|size:6',
    country: { code: 'alpha|upper|size:2' },
  },
  tags: 'array|min:2|arrayof:string|arrayof:max:10',
  users: [{ name: 'name', age: 'natural' }],

  coords: 'array|size:2',
  'coords[0]': 'number|min:-90|max:90',   // latitude
  'coords[1]': 'number|min:-180|max:180', // longitude
  'history[-1]': 'date',                  // the most recent entry
  matrix: 'arrayof:arrayof:number',       // arrays of arrays
}

const { errors } = validate(rules, {
  address: { city: 'Rock Port', pin: 'ABC', country: { code: 'in' } },
  tags: ['ok', 'waaaaaaaaaytoolong'],
  users: [{ name: 'Jo', age: 20 }, {}],
  coords: [200, -0.12],
  history: ['nope'],
  matrix: [[1], ['x']],
})
```

```js
[
  'address.pin must be a valid numeric string',
  'address.country.code must not contains lower case letters',
  'tags[1] must have length of at most 10',
  'users[1].name is required',
  'users[1].age is required',
  'coords[0] must be at most 90',
  'history[-1] must be a valid date',
  'matrix[1][0] must be a valid number'
]
```

Errors carry the full path, including array indexes.

---

## Operators: `$or`, `$and`, `$switch`

`$or` passes if **any** branch passes. `$and` requires **every** branch. `$switch` applies **one** rule, chosen by which `case` matches. Branches accept any rule value — strings, object rules, tuple rules, functions, or nested operators.

```js
const rules = {
  // one field, several valid shapes
  address: { $or: ['string|max:60', { city: 'name', pin: 'string|natural|size:6' }] },

  // $and with optional makes a nested object or array optional
  billing: { $and: ['optional', { line1: 'string|min:5', city: 'name' }] },
  products: { $and: ['optional', [{ title: 'string|min:5', price: 'positive' }]] },

  // one rule chosen by case; default supplies the error when nothing matches
  amount: {
    $switch: [
      { case: 'number|max:1000', then: 'positive', default: true },
      { case: 'number|min:1001', then: 'positive|decimalmax:2' },
    ],
  },
}

validate(rules, { address: { city: 'Rock Port', pin: 'ABC' }, amount: 'abc' })
```

```js
[
  'address.pin must be a valid numeric string',
  'amount must be a valid number'
]
```

`$or` reports the branch that best fits the value, so you get `address.pin ...` rather than a vague "address is invalid". `$and` with `optional` solves optional nested objects and arrays, which are otherwise not expressible.

→ [$or and $and](https://github.com/riturajshakti/super-easy-validator/blob/main/DOCS.md#or-and-and) · [$switch](https://github.com/riturajshakti/super-easy-validator/blob/main/DOCS.md#switch)

---

## Custom rules and cross-field validation

A rule value can be a function. It gets the value and its parent, and returns `undefined` to pass or `{ message, code }` to fail — so you own the wording and the code, and cross-field checks need no special syntax.

```js
const rules = {
  password: 'string|min:8',
  confirmPassword: (value, parent) =>
    value === parent.password
      ? undefined
      : { message: 'passwords must match', code: 'PASSWORD_MISMATCH' },

  from: 'date',
  to: (value, parent) =>
    new Date(value) > new Date(parent.from)
      ? undefined
      : { message: 'to must be after from', code: 'BAD_RANGE' },
}

validate(rules, {
  password: 'longenough', confirmPassword: 'different',
  from: '2024-06-01', to: '2024-01-01',
})
```

```js
['passwords must match', 'to must be after from']
```

Combine a function with built-in rules through `$and`:

```js
{ n: { $and: ['natural', (v) => v % 2 === 0 ? undefined : { message: 'must be even', code: 'NOT_EVEN' }] } }
```

→ [Custom rules](https://github.com/riturajshakti/super-easy-validator/blob/main/DOCS.md#custom-rules)

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
| **Operators** | `$or` `$and` `$switch` |
| **Messages** | `field:` `error:` and a `quotes` option |

String rules check for a string automatically; number rules check for a number. Prefix with `string` to validate numeric or boolean strings — `'string|natural'`, `'string|boolean'`.

An unknown rule throws `InvalidRuleError` rather than being ignored, so a typo surfaces at first run.

→ [Complete API reference, with an example for every rule](https://github.com/riturajshakti/super-easy-validator/blob/main/DOCS.md#reference)

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
