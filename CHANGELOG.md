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