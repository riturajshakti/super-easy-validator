# Changelog

Full history: https://github.com/riturajshakti/super-easy-validator/releases

## 0.9.0

- New: `$or`, `$and` and `$switch` operators combine or choose between rules for
  one field. `$and` with `optional` makes nested objects and arrays of objects
  optional, which was previously not expressible
- New: a rule value can be a function — `(value, parent) => undefined | { message, code }`.
  The parent object makes cross-field checks such as password confirmation and
  date ranges straightforward
- New: array indexing in rule keys — `'c[0]'`, `'c[-1]'` and `'c[0:2]'`, with a
  new `arrayIndexingCheck` option to disable it
- New: `validate` also returns `details`, pairing each message with a stable
  code at the same index. `errors` is unchanged
- Security: the `name` rule was vulnerable to catastrophic backtracking (ReDoS);
  `name` and `fullname` are now linear-time and accept letters from any script
- Breaking: an unknown or malformed rule now throws `InvalidRuleError` instead
  of being silently ignored
- Deprecated: `mongoid` is renamed to `objectid`; the old name still works and
  warns once per process
- Fixed: nested arrays (`arrayof:arrayof:`), several error-path labels, a crash
  on dot-notation paths through `null`, and `decimalmax:0`
- Fixed: the build now sets `__esModule` correctly, improving bundler interop.
  Three redundant `module.exports` assignments were overwriting it; every
  `require()` and `import` style is unchanged
- Docs: guide and reference moved to `DOCS.md`; 895 tests

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
