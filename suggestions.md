# Suggestions

Review of `super-easy-validator` v0.8.2 against current npm packaging practice.
Written 2026-09-12. Last release was 2024-03-22.

The library design is sound. Everything below is about packaging, release
process, and safety nets — the parts that were easy to skip in 2023 and are
now the difference between a package people trust and one they bounce off.

Each item is marked with why it matters and what to do.

---

## 1. There are no tests

**Severity: high — this is the biggest gap.**

`src/test.ts` and `test/index.js` are manual scratchpads: they build one big
rules object, call `validate`, and `console.log` the result. Nothing asserts
anything. Nothing fails. `npm test` is not even defined, so `npm test` exits
with an error.

Why it matters: this library is a pile of regexes and ordering-sensitive
branches. It is exactly the kind of code that breaks silently. You cannot
safely accept a PR, refactor `checkConstraint`, or bump a dependency without
a suite that goes red.

What to do — use Node's built-in runner, so you stay at zero dependencies:

```js
// test/validate.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import Validator from 'super-easy-validator'

test('natural rejects negatives', () => {
  const { errors } = Validator.validate({ age: 'natural' }, { age: -1 })
  assert.deepEqual(errors, ['age must be a valid natural number'])
})

test('valid data returns undefined errors', () => {
  const { errors } = Validator.validate({ age: 'natural' }, { age: 30 })
  assert.equal(errors, undefined)
})
```

```json
"scripts": { "test": "node --test test/" }
```

Seed it from the README examples — the big one in "Basic usage" already has a
documented expected output of 20 errors, so it converts directly into an
assertion. That single test would lock in most of the surface area at once.

Target the regex validators especially (`email`, `url`, `date`, `username`),
since those are where subtle breakage hides.

---

## 2. `files` is not set — you ship your source and scratch files

**Severity: high — easy fix, immediate win.**

`package.json` has no `files` field and there is no `.npmignore`. npm
therefore publishes nearly everything not covered by `.gitignore`.

Verified against the actually-published 0.8.2 on npm, the tarball contains:

- `dist/` — correct, this is what `main` points at
- `dist/*.js.map` — source maps, ~34kB, useless to consumers without sources
- `dist/test.js` + `dist/test.js.map` — your **scratchpad, compiled and shipped**
- `src/*.ts` — all five source files including `src/test.ts`
- `tsconfig.json`, `.prettierignore` — your build config

Unpacked size is 95.2 kB for a library whose actual runtime is one 36 kB file.
A package that advertises "ultra light weight" ships roughly three times what
it needs, plus a scratch file.

What to do — add an allowlist:

```json
"files": ["dist/**/*.js", "types", "README.md", "CHANGELOG.md", "LICENCE"]
```

Then turn off source maps for the published build (`"sourceMap": false`), or
keep them for local debugging and just exclude them via `files` as above.
Also stop compiling the scratchpad: move `src/test.ts` out of `src/`, or add
`"exclude": ["src/test.ts"]` to `tsconfig.json`.

Run `npm pack --dry-run` before every publish and read the file list. That
one habit catches this class of mistake permanently.

---

## 3. No `exports` map, and ESM consumers are second-class

**Severity: high — this is what most affects real users today.**

`src/index.ts` ends with `module.exports = Validator`, where
`Validator = { validate }`. The package is CommonJS-only, with `main` and a
hand-written `types/index.d.ts`.

Two concrete consequences:

**a. The README's own import style is inconsistent with the type
declarations.** `types/index.d.ts` declares `export function validate(...)`,
i.e. a named export. But the runtime object is a default-ish CJS export.
Both of these appear in your README:

```js
const Validator = require('super-easy-validator')   // Validator.validate(...)
const { validate } = require('super-easy-validator') // destructured
```

Both happen to work under CJS. Under a bundler doing ESM interop,
`import { validate } from 'super-easy-validator'` may or may not resolve
depending on the bundler's CJS-interop heuristics. You are relying on luck.

**b. There is no `exports` field**, so deep imports like
`super-easy-validator/dist/helpers.js` are legal and someone will eventually
depend on them, freezing your internals.

What to do — declare the surface explicitly:

```json
"exports": {
  ".": {
    "types": "./types/index.d.ts",
    "import": "./dist/index.mjs",
    "require": "./dist/index.js"
  }
},
"main": "dist/index.js",
"types": "types/index.d.ts"
```

Shipping a real ESM build is the bigger job. A pragmatic middle step: keep
CJS-only but add `exports` with just the `require` and `types` conditions.
That at least seals deep imports and makes resolution explicit, today.

Related: prefer `export default Validator` / named exports in TS over raw
`module.exports =`, and let the compiler emit the interop. It also removes
the `.d.ts`-vs-runtime mismatch.

---

## 4. Types are hand-written and can drift from the implementation

**Severity: medium.**

`types/index.d.ts` is maintained by hand and is far weaker than
`src/types.ts`. The internal `Validation` union is an excellent piece of
work — template-literal types that actually catch `'mim:5'` at compile time.
But the *public* declaration throws all of that away:

```ts
export interface ValidatorRules {
  [key: string]: string | string[] | ValidatorRules | ValidatorRules[];
}
```

Consumers get `string`. They get no autocomplete and no typo checking, even
though you already built the type that would give them both.

What to do — emit declarations instead of writing them:

```json
// tsconfig.json
"declaration": true,
"declarationDir": "types"
```

and export the real types from `src/index.ts` so `Rules` uses `Validation`
rather than bare `string`. This turns your best feature into something users
can actually feel. It is the single highest-leverage change for perceived
quality.

Note this will surface real typing work — `Rules` is recursive and
`Validation` is a big union — but the payoff is that the rule strings become
self-documenting in every editor.

---

## 5. No CI, no automated publish

**Severity: medium.**

Publishing is manual: build locally, `npm publish`, hope `dist/` was current.
That is how a stale or missing `dist/` reaches the registry.

What to do — a minimal GitHub Actions workflow:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
      - run: npm test
```

Then add `"prepublishOnly": "npm run build && npm test"` so a broken or
untested build can never be published by hand either.

---

## 6. Missing standard metadata fields

**Severity: low — but these are free.**

`package.json` is missing:

- **`engines`** — declare the minimum Node you support, e.g.
  `"engines": { "node": ">=14" }`. Your code uses `Array.prototype.at()`
  (in `validateAtleastData`/`validateAtmostData`), which requires **Node 16.6+**.
  Right now nothing communicates or enforces that, so a Node 14 user gets a
  confusing runtime `TypeError` instead of an install-time warning.
- **`homepage`** and **`bugs`** — you explicitly ask for issue reports in the
  README, but npm shows no issues link. Point `bugs` at
  `https://github.com/riturajshakti/super-easy-validator/issues`.
- **`sideEffects: false`** — lets bundlers tree-shake.
- **`LICENCE` spelling** — the file is `LICENCE` (British). npm and GitHub
  both look for `LICENSE`. Renaming gets the license auto-detected and
  displayed. Minor, but it is the kind of thing that signals maintenance.

Also: **45 keywords is counterproductive.** Keywords like `data`, `error`,
`express`, `laravel`, `zod` are keyword-stuffing. npm's search ranks on
relevance and downloads; irrelevant keywords mostly make the listing look
spammy to a human evaluating whether to trust the package. Cut to ~10 honest
ones.

---

## 7. `package-lock.json` is gitignored

**Severity: low, but it is backwards.**

`.gitignore` contains `package-lock.json`, yet a `package-lock.json` is
committed anyway (it is tracked in git). The intent and the reality disagree.

The modern convention: **libraries should commit the lockfile.** It does not
affect consumers — npm ignores a dependency's lockfile — but it makes *your*
CI and contributor installs reproducible. Remove it from `.gitignore` and
keep it tracked.

Same file also ignores `bugs.txt` / `features.txt` / `test/`, which is why
your own TODO notes are invisible to collaborators. Consider moving those
into GitHub Issues, which is where contributors will look.

---

## 8. Two real bugs found while reviewing

These are implementation issues rather than packaging, but they belong on
the list because tests (item 1) would have caught both.

**a. A bare `symbol` rule never runs.** In `validateSingleData`
(`src/index.ts:147`) the dispatch list is
`'string,number,boolean,object,array,bigint'` — `symbol` is missing.
`checkDataType` fully implements the symbol case and `src/types.ts` advertises
`'symbol'` as a valid `Validation`, but the rule silently does nothing:

```js
validate({ f: 'symbol' }, { f: 'definitely not a symbol' })
// → errors: undefined   (should be an error)
```

`arrayof:symbol` works correctly, because its dispatch list at
`src/index.ts:950` *does* include `symbol`. Fix: add `symbol` to the list at
line 147.

**b. Falsy values are treated as missing in array-rule position.**
`validateInternal` uses `if (!_internalData)` at `src/index.ts:83`, so any
falsy value reports "is required" rather than a type error:

```js
validate({ items: [{ a: 'string' }] }, { items: '' })
// → ['items is required']   (misleading; it is present, just not an array)
```

Use `=== undefined || === null` instead of falsiness. The same pattern is at
`src/index.ts:44`. (Top-level `string`/`number` rules handle `''` and `0`
correctly — this is specific to the object/array-rule branches.)

---

## Suggested order

1. Add `files` (item 2) — five minutes, shrinks the package immediately
2. Fix the two bugs (item 8) — small, and they are real
3. Add tests (item 1) — unblocks everything else safely
4. Add CI + `prepublishOnly` (item 5)
5. Generate types (item 4) — biggest user-visible quality jump
6. Add `exports` (item 3)
7. Metadata cleanup (items 6, 7)

Items 1–4 would get this to current standards. Item 5 keeps it there.

---

## What is already right

Worth saying, since the list above is all criticism:

- Genuinely zero runtime dependencies, as advertised
- `strict: true` in `tsconfig.json`
- Real semver discipline and a maintained `CHANGELOG.md` per release
- An unusually thorough README — 1700 lines with a full API reference
- The published package works: `npm install super-easy-validator` and
  `require()` both succeed on the current release
- The README's headline example still produces exactly the 20 documented
  errors, verified against a fresh build — the docs have not rotted
