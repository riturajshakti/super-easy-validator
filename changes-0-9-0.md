# Changes for v0.9.0

Temporary tracking file. Records every change made in the 0.8.2 → 0.9.0 pass.
Delete once merged and released.

Implemented: suggestions.md items 1, 2, 3, 4, 5, 6, 7, 8 — all of them.

---

## Pass 1 — packaging

### Files added

| File | Purpose |
|---|---|
| `.github/workflows/ci.yml` | Build + test + `npm pack --dry-run` on Node 18/20/22 |
| `changes-0-9-0.md` | This file |

### Files removed

| File | Reason |
|---|---|
| `types/index.d.ts` | Superseded by generated `dist/*.d.ts`. Directory removed. |

### Files moved / renamed

| From | To | Reason |
|---|---|---|
| `LICENCE` | `LICENSE` | npm/GitHub only auto-detect the US spelling |

### package.json

- `version`: `0.8.2` → **`0.9.0`**
- `types`: `types/index.d.ts` → `dist/index.d.ts` (now generated)
- **Added `files`** allowlist: `dist/**/*.js`, `dist/**/*.d.ts`, `README.md`,
  `CHANGELOG.md`, `LICENSE`
- **Added `exports`** map with `types` / `require` / `default`, plus
  `./package.json`. Seals off deep imports into `dist/helpers.js`.
- **Added `engines`**: `node >=16.6` — the real floor, because
  `Array.prototype.at()` is used in `validateAtleastData` / `validateAtmostData`
- **Added `sideEffects: false`** for bundler tree-shaking
- **Added `homepage`** and **`bugs`** URLs
- `repository.url` → `git+https://…` (canonical npm form)
- `scripts.build` / `watch`: `npx tsc` → `tsc`
- **Added `test`**: `npm run build && node --test test/*.test.js`
- **Added `prepublishOnly`**: `npm run build && npm test`
- Removed `scripts.dev` (pointed at the deleted scratchpad)
- **Keywords cut 45 → 10** (removed `data`, `error`, `express`, `laravel`,
  `zod` and ~30 near-duplicates)

### tsconfig.json

- **`declaration: true`** — emits `.d.ts` from source
- **`sourceMap: false`** — dropped 34 kB of `.map` files from the tarball
- **`lib: ["ES2022"]`** — `target` stays `ES6`, but lib must cover
  `Array.prototype.at()` and `Object.entries()`

### .gitignore

- Removed `package-lock.json` and `test/` from the ignore list
- Added `*.tgz`

### src/types.ts

- **Added `RuleString`** = `Validation | \`${Validation}|${string}\`` and
  retyped `Rules` to use it, so rule strings are checked against the real
  union instead of bare `string`
- **Added `ValidatorResult`** interface

### src/index.ts (exports only)

- Added `export { validate }` and `export default Validator`
- Re-exported all public types
- Kept `module.exports = Validator` plus explicit `.validate` / `.default`
  so every existing import style keeps working

---

## Pass 2 — bug fixes

**No new features. No behaviour changed beyond these three defects.**

### Bug 1 — a bare `symbol` rule never ran

`src/index.ts` — the dispatch list in `validateSingleData` omitted `symbol`,
so the rule silently did nothing even though `checkDataType` fully implemented
it and `types.ts` advertised it.

```js
validate({ f: 'symbol' }, { f: 'not a symbol' })
// before → errors: undefined
// after  → ['f must be symbol']
```

Fix: added `symbol` to `'string,number,boolean,object,array,bigint'`.

### Bug 2 — falsy values treated as missing in the array-rule branch

`src/index.ts` — `if (!_internalData)` reported "is required" for any falsy
value, hiding the real type error.

```js
validate({ items: [{ a: 'string' }] }, { items: '' })
// before → ['items is required']       (misleading)
// after  → ['items must be of type array']
```

Fix: `=== undefined || === null` instead of falsiness. `null` and absent
still correctly report "is required".

### Bug 3 — `null` nested object reported the wrong message

Same family as bug 2, found while fixing it. Because `typeof null === 'object'`,
a null nested object fell through to the type branch.

```js
validate({ addr: { city: 'name' } }, { addr: null })
// before → ['addr must be of type object']
// after  → ['addr is required']
```

Fix: added an explicit undefined/null guard before the type check.

### Bug 4 — any non-string entry in an array rule crashed the validator

Reported from real use: writing a rule array with a RegExp literal instead of
a `regex:` string.

```js
validate({ password: ['string', 'min:3', /123456/i] }, { password: 'abc' })
// before → ['error occurred while data validation']   (an internal TypeError,
//           swallowed by the outer try/catch — the message says nothing)
// after  → ['password has an invalid rule: every rule in the array must be a string']
```

The throw was `e.startsWith is not a function` inside `getField`, and it
happened for *any* non-string entry — a number, `null`, an object, a nested
array — not just RegExp.

Fix, in two places:

- `src/helpers.ts` — `getField` / `getError` / `getSize` now share a
  `findPrefixed` helper that checks `typeof e === 'string'` before calling
  `startsWith`, so a malformed entry can never throw.
- `src/index.ts` — the array-rule branch now detects a non-string entry up
  front and reports which field is at fault, instead of letting it reach the
  opaque catch-all.

### Type gap — `arrayof:optional` and `arrayof:nullable` were not in the types

Found while investigating bug 4. Both work at runtime and are documented in
the README, but neither appeared in the `ArrayType` union or the `arrayof:`
branch of `Validation`. So this **valid, documented** rule was a compile error:

```ts
const rules: Rules = { ratings: ['arrayof:optional', 'arrayof:natural'] }
// before → TS2322: '"arrayof:optional"' is not assignable to type 'RuleString'
// after  → compiles
```

Added `'optional'` and `'nullable'` to both unions in `src/types.ts`. This is
a types-only change; no runtime behaviour moved.

---

## Pass 3 — test suite

`test/` rewritten from scratch. The old `test/index.js` was a `console.log`
scratchpad with no assertions, pinned to the *published* `^0.6.1` rather than
the local build; `test/package.json` and `test/package-lock.json` are gone.

**`scratch/` deleted.** You were right — it was the same thing as a test
without assertions. Its content is now `test/readme.test.js`, asserted.

Zero new dependencies: Node's built-in `node:test` runner.

| File | Covers |
|---|---|
| `datatypes.test.js` | string, number, boolean, array, object, bigint, symbol |
| `stringtypes.test.js` | all 18 specific string types |
| `numbertypes.test.js` | int, positive, negative, natural, whole (+ string variants) |
| `constraints.test.js` | equal, size, min, max, regex, decimal\*, enums |
| `structure.test.js` | optional/nullable, arrayof, nested objects, array objects, $atleast, $atmost, strict |
| `errors.test.js` | field:, error:, quotes, result shape, module surface |
| `readme.test.js` | every worked example in README.md, asserted exactly |

**262 tests, 56 suites, all passing.** Each of the three bugs above has a
dedicated regression test marked `regression:`.

`readme.test.js` is the one to keep an eye on — it pins the documented output
of all five README examples, so the docs can no longer silently rot.

---

## Pass 4 — README corrections

Verified every worked example by execution. The three big ones (basic usage
20 errors, nested object 7 errors, array objects 8 errors) were already
correct and are now locked in by tests.

Four genuine errors found and fixed:

1. **The `null` keyword does not exist.** Section "2. nullable" documented
   `'null|string'` and `'optional|null|number'`. There is no `null` validation —
   only `nullable`. The documented code silently failed:
   `validate({o:'null|string'},{o:null})` → `['o is required']`.
   Fixed to `nullable` / `optional|nullable`.
2. **`require('./index')`** in the array-objects example — an internal path
   that would not work for a consumer. Fixed to `require('super-easy-validator')`.
3. **Automatic-string-check list** in the `string` API section omitted
   `fullname`, `phonecode` and `uuid`. Added.
4. **`arrayof:` supported list** omitted `arrayof:fullname` and `arrayof:uuid`,
   both of which work (verified). Added.

---

## Verification

- `npm test` → **262 passing, 0 failing**
- `tsc` builds clean
- Real tarball packed, installed into a clean directory, required through the
  `exports` map — `validate` works
- TypeScript consumer: `'mim:5'` is now a **compile error** (TS2322); valid
  rules compile clean
- README examples asserted exactly, in `readme.test.js`

### Size

| | Tarball | Unpacked | Files |
|---|---|---|---|
| v0.8.2 (published) | 37.7 kB | 183.9 kB | 23 |
| **v0.9.0** | **19.5 kB** | **98.1 kB** | **12** |

`test/` is not shipped — it is excluded by the `files` allowlist.

---

## One behaviour note (not a change)

The `phone` regex rejects a space after a parenthesised area code
(`+1 (555) 1234567`) and rejects hyphen separators (`+91-9876543210`), while
accepting `+1 (555)1234567`, `555 123 4567` and `+91 9876543210`. I hit this
writing tests and left it alone, since loosening the regex would be a feature
change. The tests document the actual behaviour. Worth revisiting later if
users report it.

---

## Still to do before publishing

1. Decide which lockfile to commit (`bun.lock` vs `package-lock.json`) —
   CI currently runs `npm install`
2. Delete `suggestions.md` and `changes-0-9-0.md` from the repo, or keep them
   untracked (both are currently excluded from the tarball either way)
