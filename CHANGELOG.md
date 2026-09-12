# Changelog

Full history: https://github.com/riturajshakti/super-easy-validator/releases

## 0.9.0

- New: a rule value can be a function — `(value, parent) => undefined | { message, code }`.
  It returns `undefined` to pass, or an object you author entirely, so there is
  no registration step and no inferred wording. `parent` is the containing
  object, which makes cross-field checks such as password confirmation and date
  ranges straightforward. Works anywhere a rule value is accepted, and combines
  with built-in rules through `$and` / `$or`. A malformed return or a thrown
  error is reported as an `InvalidRuleError` naming the field
- New: array indexing in rule keys — `'c[0]'`, `'c[-1]'` and `'c[0:2]'` select
  elements, count from the end, and select ranges. A bracket selects elements,
  so the rule applies to each selected element. Composes with dotted paths
  (`'u[0].name'`, `'a.c[0:2]'`) and nested arrays (`'c[0][1]'`)
- New: `arrayIndexingCheck` option, `true` by default. Set it to `false` to
  treat bracketed keys as literal names
- New: `$or` and `$and` operators combine several rules for one field. `$or`
  passes if any branch passes; `$and` requires every branch and reports all
  failures. Branches may be rule strings, object rules, array-of-object rules,
  or nested operators, to any depth
- New: `$and` with `optional` or `nullable` makes a nested object or an array
  of objects optional — previously not expressible
- Breaking: an unknown or malformed rule now throws `InvalidRuleError` instead
  of being silently ignored. Previously `{ a: 'strng' }` disabled validation
  for that field without warning. Rules are authored, not user input, so this
  surfaces at first run rather than in production
- New: `validate` now also returns `details` — the same messages paired with a
  stable `code`, at matching indexes. `ErrorCodes` and the `ErrorCode` /
  `ValidationDetail` types are exported. Fully backward compatible: `errors`
  is unchanged in shape, content and wording
- New: codes separate failures that share a message — `enums:` and `regex:`
  both say "is invalid" but carry `ENUM_MISMATCH` and `REGEX_MISMATCH`, and
  `min:` splits into `TOO_SHORT` / `TOO_SMALL` / `DATE_TOO_EARLY` by type.
  A custom `error:` replaces the message but keeps the code
- Security: the `name` rule was vulnerable to catastrophic backtracking (ReDoS).
  A 20-character input took ~15 seconds; both `name` and `fullname` are now
  linear-time
- Fix: `name` and `fullname` rejected every non-ASCII name (`José`, `李小龙`,
  `Владимир`). Letters from all scripts are now accepted
- Fix: `fullname` rejected ordinary names such as `J Doe`, `Mary J Watson`,
  `Jean-Luc Picard` and `Dr. Smith`; it now means "two or more words"
- Fix: a dot-notation rule whose intermediate value was `null` (e.g. `'a.b.c'`
  against `{ a: null }`) crashed internally
- Deprecated: `mongoid` is renamed to `objectid`. `mongoid` still works and
  behaves identically, but logs a warning once per process
- Fix: a bare `symbol` rule was never applied
- Fix: falsy values (`''`, `0`, `false`) in an array-rule field reported
  "is required" instead of the correct type error
- Fix: a `null` nested object reported "must be of type object" instead of
  "is required"
- Fix: a non-string entry in an array rule (e.g. `['string', /abc/i]`) crashed
  internally and returned "error occurred while data validation"; it now names
  the offending field
- Fix: `arrayof:optional` and `arrayof:nullable` were missing from the types
- New: 269 tests using Node's built-in runner, still zero dependencies
- New: TypeScript types generated from source, so rule strings are checked
  against the real validation union
- New: `exports` map, `engines`, `sideEffects`, `homepage`, `bugs`
- New: CI on Node 18/20/22
- Changed: package roughly half the size — source maps, `src/` and a stray
  compiled scratch file are no longer published
- Changed: detailed guide and API reference moved to `DOCS.md` on GitHub
- Docs: the documented `null` keyword does not exist — use `nullable`

## 0.8.x

- `phonecode` validation (0.8.2)
- TypeScript fixes for nested array objects (0.8.1)
- Object-based rules for nested objects, and tuple-based rules for arrays of
  objects; `name` validation fix (0.8.0)

## 0.7.x

- `strict` option (0.7.2)
- Express GET API example (0.7.1)
- `uuid`, `$atmost`, `size:` support for `$atleast` / `$atmost`, and array-based
  rules for multiple field groups (0.7.0)

## 0.6.1

- Quotes option, `field:` and `error:` keywords, improved `name` validation

## 0.5.0

- Numeric string checks via `string` + a number type (e.g. `string|natural`);
  added `fullname`; removed the old `numeric` type

## 0.1.0 – 0.4.0

- `$atleast`, `arrayof:`, type safety, and older-browser ES target

## 0.0.x

- Initial releases
