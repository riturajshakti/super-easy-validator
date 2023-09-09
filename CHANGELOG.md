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