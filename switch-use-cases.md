# `$switch` — conditional validation

Planning document. No code written yet. Companion to `or-and-use-cases.md`.
Delete once the feature ships.

---

## Why this is not just `$or`

`$or` answers **"does it match *any* of these?"** — it tries every branch and
succeeds if one works. Branch order does not matter, and a failure cannot say
*which* branch you meant.

`$switch` answers **"which rule *applies* here?"** — it picks exactly one
branch by a condition, then validates against only that branch.

The difference shows up in the error message:

```js
// $or: a bad card number falls through every branch
{ $or: [ {type:'equal:card', cardNumber:'...'}, {type:'equal:upi', upiId:'...'} ] }
// → "payment is invalid"     (which one did the user mean?)

// $switch: the branch is chosen first, then validated
{ $switch: { on: 'type', cases: { card: {cardNumber:'...'}, upi: {upiId:'...'} } } }
// → "payment.cardNumber must be a valid card number"
```

For tagged unions `$switch` gives dramatically better errors, because it
commits to a branch before validating.

## What the engine already does

Worth knowing so the feature does not reinvent it. Rules **already** dispatch
on runtime type:

```js
validate({ a: 'size:3' }, { a: 'abcd' })  // → 'must have length 3'  LENGTH_MISMATCH
validate({ a: 'size:3' }, { a: [1, 2] })  // → 'must have length 3'  LENGTH_MISMATCH
validate({ a: 'size:3' }, { a: 12 })      // → 'must have 3 digits'  DIGITS_MISMATCH
```

So *implicit* type switching exists. What is missing is:

1. branching on a **value condition** (`n > 7`), not just a type
2. branching on **another field's** value
3. choosing an entire **rule set**, not just one constraint's interpretation

---

## Proposed shapes

### A. Switch on the value's own type

```js
{
  address: {
    $switch: {
      string: 'min:5|max:100',
      object: { city: 'name', pin: 'string|natural|size:6' },
      array:  'arrayof:string|min:1',
    },
  },
}
```

Keys are type names. The runtime type picks the branch. An unlisted type is an
error — which is the crucial difference from `$or`, where it would just be
"invalid".

### B. Switch on a condition over the value

```js
{
  amount: {
    $switch: [
      { when: 'number|max:1000', then: 'positive' },
      { when: 'number|min:1001', then: 'positive|decimalmax:2' },
    ],
    $default: 'error:amount must be a number',
  },
}
```

`when` is itself a rule. The first branch whose `when` passes is the one
applied. This is the `n > 7` case from your ask.

### C. Switch on a sibling field

```js
{
  accountType: 'enums:personal,business',
  taxId: {
    $switch: {
      on: 'accountType',
      cases: {
        personal: 'optional|string',
        business: 'string|regex:/^[0-9]{9}$/',
      },
    },
  },
}
```

This is the one `$or` genuinely cannot express — the rule for `taxId` depends
on a **different** field.

---

# Use cases

## 1. Your example — type-directed validation

```js
{
  value: {
    $switch: {
      string: 'min:1|max:50',
      number: 'positive|max:1000',
      boolean: 'equal:true',
    },
  },
}
```

## 2. Your example — threshold-directed validation

```js
{
  quantity: {
    $switch: [
      { when: 'number|max:7',  then: 'natural' },
      { when: 'number|min:8',  then: 'natural|max:100' },
    ],
  },
}
```

Small orders: any natural number. Large orders: capped at 100.

## 3. Required only when another field says so

```js
{
  hasDiscount: 'boolean',
  discountCode: {
    $switch: {
      on: 'hasDiscount',
      cases: {
        true:  'string|min:4|max:12',
        false: 'optional',
      },
    },
  },
}
```

The single most requested conditional-validation pattern, and currently
impossible.

## 4. Shipping rules by country

```js
{
  country: 'alpha|upper|size:2',
  postalCode: {
    $switch: {
      on: 'country',
      cases: {
        US: 'string|regex:/^[0-9]{5}(-[0-9]{4})?$/',
        IN: 'string|natural|size:6',
        GB: 'string|regex:/^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i',
        CA: 'string|regex:/^[A-Z][0-9][A-Z] ?[0-9][A-Z][0-9]$/i',
      },
      $default: 'string|min:3|max:12',
    },
  },
}
```

`$default` handles every other country without listing all 195.

## 5. Payment method — better errors than `$or`

```js
{
  method: 'enums:card,upi,bank,cod',
  payment: {
    $switch: {
      on: 'method',
      cases: {
        card: { number: 'string|regex:/^[0-9]{16}$/', cvv: 'string|natural|size:3' },
        upi:  { upiId: 'string|regex:/^[a-z0-9.]+@[a-z]+$/' },
        bank: { account: 'string|natural|min:9', ifsc: 'string|alphanumeric|size:11' },
        cod:  'optional',
      },
    },
  },
}
```

A bad CVV reports `payment.cvv must have 3 digits`, not `payment is invalid`.

## 6. Age-gated fields

```js
{
  age: 'natural',
  guardianConsent: {
    $switch: [
      { when: 'natural|max:17', then: 'boolean|equal:true' },
      { when: 'natural|min:18', then: 'optional' },
    ],
  },
}
```

Minors must have consent; adults need not supply the field at all.

## 7. Tiered limits by plan

```js
{
  plan: 'enums:free,pro,enterprise',
  seats: {
    $switch: {
      on: 'plan',
      cases: {
        free:       'natural|max:3',
        pro:        'natural|max:50',
        enterprise: 'natural|max:10000',
      },
    },
  },
}
```

Business rules that today live in hand-written code after validation.

## 8. Media payload by kind

```js
{
  kind: 'enums:image,video,document',
  meta: {
    $switch: {
      on: 'kind',
      cases: {
        image:    { width: 'natural', height: 'natural', format: 'enums:png,jpg,webp' },
        video:    { duration: 'positive', codec: 'string', bitrate: 'natural' },
        document: { pages: 'natural', mime: 'enums:application/pdf' },
      },
    },
  },
}
```

## 9. Precision scaling with magnitude

```js
{
  price: {
    $switch: [
      { when: 'number|max:1',      then: 'positive|decimalmax:4' },
      { when: 'number|max:1000',   then: 'positive|decimalmax:2' },
      { when: 'number|min:1001',   then: 'positive|decimalmax:0' },
    ],
  },
}
```

Sub-unit prices need four decimals; large prices should be whole.

## 10. String or pre-parsed object

```js
{
  filter: {
    $switch: {
      string: 'min:1|max:200',
      object: { field: 'string', op: 'enums:eq,ne,gt,lt', value: 'string' },
    },
  },
}
```

## 11. Single value or list, with different constraints each

```js
{
  recipients: {
    $switch: {
      string: 'email',
      array:  'min:1|max:50|arrayof:email',
    },
  },
}
```

A single recipient is just an email. A list additionally has a cap.

## 12. Environment-conditional strictness

```js
{
  env: 'enums:dev,staging,prod',
  apiKey: {
    $switch: {
      on: 'env',
      cases: {
        dev:     'optional|string',
        staging: 'string|min:16',
        prod:    'string|min:32|alphanumeric',
      },
    },
  },
}
```

## 13. Nested `$switch` inside an array of objects

```js
{
  items: [
    {
      type: 'enums:physical,digital',
      details: {
        $switch: {
          on: 'type',
          cases: {
            physical: { weight: 'positive', dims: 'array|size:3|arrayof:positive' },
            digital:  { downloadUrl: 'url', sizeBytes: 'natural' },
          },
        },
      },
    },
  ],
}
```

Each item switches independently; paths stay `items[2].details.weight`.

## 14. `$switch` combined with `$or`

```js
{
  contact: {
    $switch: {
      on: 'preferredChannel',
      cases: {
        email: 'email',
        phone: { $or: ['phone', { code: 'phonecode', number: 'string|natural' }] },
      },
    },
  },
}
```

Switch picks the channel; `$or` allows two shapes within it.

## 15. Date range required only for custom periods

```js
{
  period: 'enums:today,week,month,custom',
  range: {
    $switch: {
      on: 'period',
      cases: {
        custom: { from: 'date', to: 'date' },
      },
      $default: 'optional',
    },
  },
}
```

## 16. Recursive structures by node type

```js
{
  node: {
    $switch: {
      on: 'kind',
      cases: {
        leaf:   { value: 'string' },
        branch: { children: 'array|min:1' },
      },
    },
  },
}
```

## 17. Legacy and current schema by version

```js
{
  version: 'natural',
  body: {
    $switch: [
      { when: 'equal:1', on: 'version', then: { name: 'string' } },
      { when: 'equal:2', on: 'version', then: { firstName: 'name', lastName: 'name' } },
    ],
  },
}
```

## 18. Unit-dependent bounds

```js
{
  unit: 'enums:celsius,fahrenheit,kelvin',
  temperature: {
    $switch: {
      on: 'unit',
      cases: {
        celsius:    'number|min:-273|max:1000',
        fahrenheit: 'number|min:-459|max:1832',
        kelvin:     'number|min:0|max:1273',
      },
    },
  },
}
```

Physically impossible values rejected per unit — genuinely impossible today.

---

## What `$switch` adds over `$or`

| | `$or` | `$switch` |
|---|---|---|
| Selection | tries all, any may match | picks exactly one |
| Errors on failure | "value is invalid" | the chosen branch's real errors |
| Depends on another field | no | yes, via `on:` |
| Value conditions (`n > 7`) | no | yes, via `when:` |
| Unlisted case | indistinguishable | explicit `$default` or error |
| Order matters | no | yes, for `when:` lists |

They are complementary. `$or` for "any of these shapes", `$switch` for "it
depends".

---

## Design questions

### 1. Three syntaxes, or one?

I have sketched three forms (type map, `when`/`then` list, `on`/`cases`).
Three is probably two too many.

My lean: **one form** — `{ $switch: { on, cases, $default } }` — where `on` is
optional and defaults to the value itself, and a case key may be a type name,
a literal value, or a rule string used as a predicate. That unifies A, B and C
without three parsers.

### 2. What if no case matches and there is no `$default`?

Error with a new code `NO_CASE_MATCHED`, I think — silence would hide typos in
case keys.

### 3. Can `on:` reference a nested or parent field?

`on: 'type'` is a sibling. Should `on: 'meta.type'` work? Should a nested
`$switch` be able to look at an ancestor's field? Sibling-only is far simpler;
dotted paths within the same object are a modest extension. Reaching upward is
where it gets genuinely hard.

My lean: sibling and dotted-sibling only, at least initially.

### 4. Does `when:` ordering need to be explicit?

For `when` lists, first match wins, so order is load-bearing. That is
conventional for `switch`, but it is a footgun if someone writes the general
case first.

### 5. Interaction with `strict: true`

If a `$switch` selects an object branch, only that branch's keys are declared.
Same question as `$or`, same likely answer.

### 6. Should this ship before or after `$or`?

`$switch` is more powerful but more complex. `$or` alone solves the optional
nested object and optional array-of-objects gaps, which are the most-felt
limitations today.

My strong lean: **`$or` / `$and` first**, ship it, then `$switch` once the
recursion and error-reporting patterns are proven in real use.

---

## Feasibility

Same mechanism as `$or`: a new shape in the rule dispatch chain. Each `case`
value is an ordinary rule value, so the existing dispatch validates it
unchanged.

The genuinely new work is **reading another field** for `on:`. Today
`validateInternal` walks rules against the current data object, and sibling
access is already available there — `getPropByString` exists and handles
dotted paths. So `on:` within the same object is a small addition.

The harder parts are error reporting and making `strict` behave sensibly.

Estimated scope: larger than `$or`, mostly in tests — the combinatorics of
switch × branch-type × nesting are substantial.
