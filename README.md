# Introduction

**`super-easy-validator`** a super simple npm plugin which helps to do validation in a much simpler way. Its inspired by laravel validator but its even better than laravel validator, as you are going see it very soon.

# How to install

```sh
npm i super-easy-validator
```

# Usage
* **Step 1:** Create a `rules` object first. This will later be used for validating data.

```js
let rules = {
    name: 'name',
    gender: 'enums:male,female',
    adult: 'enums:true,false',
    creditCard: 'regex:/^[0-9]{16}$/',
    isMarried: 'boolean',
    phone: 'optional|phone',
    userId: 'mongoid',
    profile: 'url',
    password: 'string|min:3|max:15',
    favoriteFoods: 'array|min:3|max:6',
    rating: 'number|enums:1,2,3,4,5',
    score: 'number|whole',
    accountBalance: 'number|min:0|decimalsize:2',
    dob: 'date',
    time: 'time',
    address: 'object',
    'address.pin': 'numeric|size:6',
    'address.city': 'name',
}
```

* **Step 2:** Then you will need an object whose data you need to validate.

```js
let data = {
    name: 'test123',
    gender: 'Male',
    adult: true,
    creditCard: '1987654312345678',
    isMarried: 'no',
    profile: 'example.com',
    password: 'ab',
    favoriteFoods: ['chicken', 'egg roll', 'french fries'],
    rating: 4.5,
    score: 234.5,
    accountBalance: 100.345,
    dob: '1996-01-10T23:50:00.0000+05:30',
    time: '23:50:00.0000',
    address: {
        pin: '829119',
        city: 'Rock Port'
    },
}
```

* **Step 3:** Then, the final step is to validate the data using the rules created above:

```js
const Validator = require('super-easy-validator');

let {
    errors
} = Validator.validate(rules, data);
if (errors) {
    console.log(errors);
}
```

This is how the output should look like:

```sh
[
  '"name" must be a valid name',
  '"gender" is invalid',        
  '"isMarried" must be boolean',
  '"userId" is required',
  '"profile" must be a valid url',
  '"password" must have length of at least 3',   
  '"rating" is invalid',
  '"score" must be a whole number',
  '"accountBalance" must have 2 decimal places'  
]
```

# Guide

## 1. Separators:

`Validator.validate` function requires the `rules` object having key-value pairs where keys are the names of the variables whose needs to be validated. Then the values are the rules in `string` format separated by pipe `|` operator without any spaces. You can give multiple rules for any value. e.g.

```js
    let rules = {
        name: `string|min:2|max:8`
    }
```

In this example, we are giving 3 rules to the name field:

1. `string`: As the name says, it means, the `name` field must be string

2. `min:2`: The `name` field must be at least 2 characters long

3. `max:8`: The `name` field must be at most 8 characters long

> **Note:** Instead of string validations with `|` separation you can also give validations in arrays. Here's an equivalent example for the same above rule

```js
let rules = [
    name: ['string', 'min:2', 'max:8']
]
```

## 2. Data Types:

You can add the following data type check:

* `string`
* `number`
* `boolean`
* `array`
* `object`
* `bigint`
* `symbol`

## 3. Automatic String Check:

In these cases, it will automatic check for `string` data type, and you don't need to explicitly add a `string` type check:

* `name`
* `phone`
* `email`
* `url`
* `domain`
* `username`
* `numeric`
* `alpha`
* `alphanumeric`
* `mongoid`
* `date`
* `dateonly`
* `time`

## 4. Automatic Number Check:

In these cases, it will automatic check for `number` data type, and you don't need to explicitly add a `number` type check:

* `int`
* `positive`
* `negative`
* `natural`
* `whole`

## 5. Optional and Nullable Values:

### Optional

By default, all the data validation is _compulsory_, if you want any data field to be `optional` (_undefined_ or _absent field_), then make sure to add `optional` validation. e.g.

```js
let rules = {
    phone: 'optional|phone'
}
```

In this case, `phone` can be optional (means this field can be absent).

### Nullable

If you want any field to be `nullable` , then use `nullable` validation, this make sure that the field can be null. e.g.

```js
let rules = {
    spouse: 'nullable|name'
}
```

Now, `spouse` can be _null_.

> **NOTE:** In this above case `spouse` can't be _undefined_ (its still required). If you want it to be both `optional` and `nullable` then use both:

```js
let rules = {
    spouse: 'optional|nullable|name'
}
```

> Now, its not required and even can have null value.

## 6. Argument based Validations:

It supports the following argument based validations (See API for more details):

* `equal:<value>`: equality check for string, number and boolean
* `size:<int>`: length check for strings and arrays and digits length check for numbers
* `min:<value>`: minimum length check for strings and arrays, minimum value check for numbers and date
* `max:<value>`: maximum length check for strings and arrays, maximum value check for numbers and date
* `regex:<regex>`: regular expressions check for strings
* `decimalsize:<value>`: check for exact number of digits after decimal points for numbers and numeric strings
* `decimalmin:<value>`: check for minimum number of digits after decimal points for numbers and numeric strings
* `decimalmax:<value>`: check for maximum number of digits after decimal points for numbers and numeric strings
* `enums:<value>`: check for enum values for strings, numbers and boolean

> **Info**: for more details and examples, see the API section.

## 7. Regular Expression Limitations:

If `string` validations has regex which itself has `|` , then it will fail for validation. You can't use pipe operator `|` for regular expressions when using string based validation rules. In those cases, use array based rules instead. e.g.

> **ERROR**: This will not work, as its regex has `|` operator:

```js
let rules = {
    gender: 'string|regex:/^(male)|(female)$/'
}
```

> **FIX**: Instead use this:

```js
let rules = {
    gender: ['string', 'regex:/^(male)|(female)$/']
}
```

# API

> Coming Soon
