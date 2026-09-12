# Version 0.0.1

- First publish

---

# Version 0.0.2

- Bug fixes: import issue

---

# Version 0.0.3

- Added complete API in `README.md`

--

# Version 0.0.6

- Added new features: `lower`, `upper`, and `ip`

---

# Version 0.1.0

- Added new feature: `$atleast`

---

# Version 0.2.0

- Added new features for array elements validation: `arrayof:`

---

# Version 0.3.0

- Changed ES version for old browser compatibility

---

# Version 0.4.0

- Added type safety

---

# Version 0.5.0

- Removed numeric type
- Added numeric string type checks for more specific number types: `number`, `positive`, `negative`, `int`, `whole`, `natural`
- Now all type of string numbers can be checked by adding a `string` before any number type check: e.g. `string|int`, `string|natural`, etc
- All these will also work with argument based validations
- `name` validation will now also checks for short names
- Added `fullname` validation

# Version 0.6.1

- `name` validation improved
- Added quotes option: `none`, `single-quotes`, `double-quotes`, `backtick` around field names in error messages
- Custom field name support for each field's error message using `field` keyword
- Custom error message support for each field using `error` keyword
- Improved docs

# Version 0.7.0

- Added: `uuid` validation
- `$atleast` now supports array based rule for validation of multiple group of fields
- Added: `$atmost` validation
- `$atmost` also supports array based rule for validation of multiple group of fields
- Added `size:` keyword support for `$atleast` and `$atmost` for custom field count validation

# Version 0.7.1

- Minor improvements in `README.md` documentation
- Added Express GET API validation example

# Version 0.7.2

- New Feature: `strict` option in `ValidatorConfig`
- Minor changes in `README.md`
- Bug Fix: Missing types checks of array based validation

# Version 0.8.0

- New Feature: _object_ based validation rules for nested objects
- New Feature: _object in tuple_ based validation rules for array objects
- Bug Fix: `name` validation now works fine

# Version 0.8.1

- Bug Fix: typescript type checks now works fine for nested array objects
- Modified: updated `README.md`

# Version 0.8.2

- New Feature: Added new feature for `phonecode` validation
- Modified: updated `README.md`

# Version 0.9.0

- Bug Fix: a bare `symbol` rule was never applied (it is now)
- Bug Fix: falsy values (`''`, `0`, `false`) in an array-rule field reported
  "is required" instead of the correct type error
- Bug Fix: a `null` nested object reported "must be of type object" instead of
  "is required"
- Bug Fix: a non-string entry in an array rule (e.g. a RegExp literal like
  `['string', /abc/i]`) crashed internally and returned the useless message
  "error occurred while data validation"; it now names the offending field
- Bug Fix: `arrayof:optional` and `arrayof:nullable` were missing from the
  TypeScript types, so these valid documented rules failed to compile
- New: full test suite — 262 tests using Node's built-in test runner, still
  zero dependencies
- New: TypeScript types are now generated from source, so rule strings are
  checked against the real validation union (`'mim:5'` is a compile error)
- New: `exports` map, `engines`, `sideEffects`, `homepage` and `bugs` fields
- New: CI workflow running build and tests on Node 18/20/22
- Modified: package is roughly half the size — source maps, `src/`, and a
  stray compiled scratch file are no longer published
- Modified: `README.md` corrections — the documented `null` keyword does not
  exist (use `nullable`), plus three list/import fixes
- Note: no validation behaviour changed apart from the three bug fixes above