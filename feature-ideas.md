# Further feature ideas

Planning document. Companion to `or-and-use-cases.md` and
`switch-use-cases.md`. Every claim below was verified against the current
build. Delete once triaged.

Ordered by what I would actually do first.

---

## 0. Unknown rules pass silently — fix this before any new feature

**This is not a feature request. It is a correctness hole.**

```js
validate({ a: 'strng' },       { a: 123 })  // → undefined  (no error!)
validate({ a: 'totallyfake' }, { a: 1 })    // → undefined  (no error!)
```

A typo in a rule name **silently disables validation for that field**. The
dispatch chain tests `includes(validation)` against known rule lists; anything
unrecognised matches nothing and falls through. The field is then treated as
valid no matter what it contains.

The failure mode is the worst kind: your validation looks like it works, tests
pass because the data happens to be fine, and the hole only surfaces in
production with bad data.

This is especially sharp now that TypeScript types exist — TS users are
protected, but plain-JS users (a large share of installs) are not, and the
typed users are exactly the ones who need it least.

**Proposal:** an unrecognised rule token reports
`UNKNOWN_RULE` naming the field and the token:

```
a has an unknown rule: 'strng'
```

**Risk:** this is technically breaking. Anyone relying on a silently-ignored
rule would start seeing errors — but that code was already not validating what
it thought it was, so surfacing it is the point.

**Effort:** small. One `else` at the end of the dispatch chain in
`validateSingleData`.

---

## 1. Cross-field comparison

Partially works today, by accident:

```js
validate({ password: 'string', confirm: 'string|equal:password' },
         { password: 'abc123', confirm: 'abc123' })
// → ['confirm must be equal to password']
```

`equal:password` compares against the **literal string** `'password'`, not the
value of the `password` field. There is no way to say "same as that field".

And ordering constraints are not expressible at all:

```js
validate({ from: 'date', to: 'date' },
         { from: '2024-06-01', to: '2024-01-01' })
// → undefined      (a range that ends before it starts)
```

**Proposal:** a `$field:` prefix for argument-based rules:

```js
{
  password: 'string|min:8',
  confirm:  'string|equal:$field:password',

  startDate: 'date',
  endDate:   'date|min:$field:startDate',

  minPrice: 'number',
  maxPrice: 'number|min:$field:minPrice',
}
```

Works with `equal:`, `min:`, `max:` — the rules that already take a comparand.

**Why it matters:** password confirmation and date ranges are two of the most
common validations in any form, and neither is possible today. This is
arguably more frequently needed than `$switch`.

**Effort:** moderate. `checkConstraint` needs access to the sibling data
object, which `validateInternal` already holds.

---

## 2. Nested arrays — already on your bugs.txt

From `bugs.txt`: *"Nested array"*, *"Nested array objects"*.

```js
validate({ m: 'arrayof:arrayof:number' }, { m: [[1], ['x']] })  // → undefined
```

It silently passes — same root cause as #0. The recursive branch in
`checkSpecificArrayType` is **commented out** in the source (lines ~1050-1067).

```js
{ matrix: 'arrayof:arrayof:number' }        // grids, matrices
{ groups: 'arrayof:arrayof:objectid' }      // batched IDs
{ rows: [[{ cell: 'string' }]] }            // table of objects
```

**Effort:** the scaffolding is there and commented out; the reason it was
parked is presumably the `optional`/`nullable` tracking across depth. Moderate.

---

## 3. Array indexing rules — also on your bugs.txt

From `bugs.txt`: `array[i]`, `array[-i]`, `array[a:b]`.

```js
{
  'coords[0]': 'number|min:-90|max:90',    // latitude
  'coords[1]': 'number|min:-180|max:180',  // longitude
  'history[-1]': 'date',                   // most recent entry
  'top3[0:3]': 'arrayof:positive',         // first three
}
```

Dot-notation already exists (`'a.b.c'`), so this extends a pattern users know.
`getPropByString` would need index and slice support.

**Honest assessment:** narrower appeal than #1 or #2. Positional rules are
mostly useful for tuple-shaped arrays (coordinates, RGB, ranges), which are
less common than homogeneous lists. I would put this after #1 and #2.

---

## 4. Sanitizers / transforms

```js
validate({ a: 'string|min:3' }, { a: '  ab  ' })  // → undefined
```

`'  ab  '` is 6 characters so it passes `min:3`, but the meaningful content is
2. Every form library trims before validating.

**Proposal:** an optional transform pass returning cleaned data:

```js
const { errors, data } = validate(
  { email: 'trim|lower|email', age: 'toNumber|natural' },
  { email: '  JOHN@EXAMPLE.COM ', age: '25' }
)
// data → { email: 'john@example.com', age: 25 }
```

**The big caveat:** this changes the library's identity. Right now it is a
*pure validator* — it inspects and never mutates. Adding transforms makes it a
parser, which is a different product with a bigger API surface and new
questions (does `data` copy or mutate? what if a transform throws?).

**My honest view:** valuable but strategically significant. `trim` alone would
cover most of the real need, so a minimal version — trim, lower, upper,
toNumber, toBoolean — might capture 90% of the value at 10% of the complexity.
Worth deciding deliberately rather than drifting into.

---

## 5. Async validation

```js
{ email: 'email|unique:users.email' }
```

Database-uniqueness checks are the classic case.

**My recommendation: do not build this.** It would force `validate` to return
a Promise (or add a parallel `validateAsync`), pull in a data-source concept,
and put I/O inside a zero-dependency synchronous library. The value does not
justify what it costs the package's character. Uniqueness checks belong in the
layer that owns the database.

Listing it so it is explicitly declined rather than forgotten.

---

## 6. Custom rule registration

```js
Validator.addRule('even', {
  test: (v) => typeof v === 'number' && v % 2 === 0,
  message: (label) => `${label} must be an even number`,
  code: 'NOT_EVEN',
})

validate({ n: 'even' }, { n: 3 })  // → ['n must be an even number']
```

Escape hatch for domain rules — VAT numbers, internal ID formats, business
codes — without waiting for a release.

**Interaction with #0:** these two want each other. Unknown-rule detection
needs a registry of valid names; custom rules need to add to that registry.
Build #0 first with an extensible list, and this becomes small.

**Caveat:** global registration is stateful, which sits awkwardly with a pure
function. A per-call `{ rules: {...} }` config option may be cleaner.

---

## 7. Rule reuse / named schemas

```js
const addressSchema = { line1: 'string|min:5', city: 'name', pin: 'string|size:6' }

const rules = {
  billing: addressSchema,
  shipping: { $or: ['optional', addressSchema] },
}
```

**This already works** — rule objects are plain JavaScript, so composition is
free. Worth *documenting* rather than building. A short "composing schemas"
section in DOCS.md would surface a capability users may not realise they have.

**Effort:** documentation only.

---

## 8. `errors` as a field-keyed object

```js
const { errors, byField } = validate(rules, data)
// byField → { email: ['must be a valid email'], age: ['must be at least 18'] }
```

Form libraries want errors keyed by field to render messages inline. Today you
must parse the field name out of the message string, which is fragile.

**Note:** `details` already gives structured access, and adding a `field` key
to each detail object would serve this more cheaply than a third array:

```js
details // [{ message, code, field: 'address.city' }]
```

**My lean:** add `field` to `ValidationDetail` rather than a separate
structure. Smaller change, composes with what exists, and lets consumers group
however they like.

---

## Suggested order

1. **#0 unknown rules** — correctness hole, small fix, and everything else
   compounds on top of a validator you can trust
2. **`$or` / `$and`** — from the other doc; unlocks optional nested objects
3. **#1 cross-field** — password confirmation and date ranges are everyday needs
4. **#8 `field` in details** — small, high value for form UIs
5. **#2 nested arrays** — clears a long-standing item from `bugs.txt`
6. **`$switch`** — after `$or` proves the patterns
7. **#6 custom rules** — natural follow-on from #0
8. **#4 transforms** — only after deciding the validator/parser question
9. **#3 array indexing** — narrower appeal
10. **#5 async** — recommend declining

---

## One non-feature suggestion

`features.txt` lists *"add some blogs about this plugin"*.

That is probably worth more than items 3-9 combined. The package solves a real
problem and is genuinely smaller than the alternatives, but nobody knows it
exists. A post comparing it against zod on bundle size, with the measured
numbers already in the README, would do more for adoption than another rule.
