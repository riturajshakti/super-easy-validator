# Changelog

Full history: https://github.com/riturajshakti/super-easy-validator/releases

## 0.9.0

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
