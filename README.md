# Introduction

**`super-easy-validator`** a super simple npm plugin which helps to do validation in a much simpler way. Its inspired by laravel validator but its even better than laravel validator, as you are going see it very soon. Please write any issues on github if you found any.

# How to install

```sh
npm i super-easy-validator
```

# Usage

- **Step 1:** Create a `rules` object first. This will later be used for validating data.

```js
let rules = {
  mail: 'optional|email',
  phone: 'optional|phone',
  $atleast: 'mail|phone',
  name: 'name',
  gender: 'enums:male,female',
  adult: 'enums:true,false',
  creditCard: 'string|regex:/^[0-9]{16}$/',
  isMarried: 'boolean',
  userId: 'mongoid',
  profile: 'url',
  password: 'string|min:3|max:15',
  favoriteFoods: 'array|min:3|max:6',
  rating: 'number|enums:1,2,3,4,5',
  score: 'number|whole',
  accountBalance: 'number|min:0|decimalsize:2',
  hash: 'lower',
  hash2: 'upper',
  serverIp: 'ip',
  dob: 'date',
  time: 'time',
  address: 'object',
  'address.pin': 'numeric|size:6',
  'address.city': 'name',
};
```

- **Step 2:** Then you will need an object whose data you need to validate.

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
  hash: 'a6g8d7Fkf9Du',
  hash2: 'PDH78DI908g56',
  serverIp: '8.45.23.0',
  dob: '1996-01-10T23:50:00.0000+05:30',
  time: '23:50',
  address: {
    pin: '829119',
    city: 'Rock Port',
  },
};
```

- **Step 3:** Then, the final step is to validate the data using the rules created above:

```js
const Validator = require('super-easy-validator');

let { errors } = Validator.validate(rules, data);
if (errors) {
  console.log(errors);
}
```

This is how the output should look like:

```js
[
  'at least one of "mail", "phone" is required',
  '"name" must be a valid name',
  '"gender" is invalid',
  '"isMarried" must be boolean',
  '"userId" is required',
  '"profile" must be a valid url',       
  '"password" must have length of at least 3',
  '"rating" is invalid',
  '"score" must be a whole number',      
  '"accountBalance" must have 2 decimal places',
  '"hash" must not contains upper case letters',
  '"hash2" must not contains lower case letters'
]
```

# Guide

## 1. Separators:

`Validator.validate` function requires the `rules` object having key-value pairs where keys are the names of the variables whose needs to be validated. Then the values are the rules in `string` format separated by pipe `|` operator without any spaces. You can give multiple rules for any value. e.g.

```js
let rules = {
  name: `string|min:2|max:8`,
};
```

In this example, we are giving 3 rules to the name field:

1. `string`: As the name says, it means, the `name` field must be string

2. `min:2`: The `name` field must be at least 2 characters long

3. `max:8`: The `name` field must be at most 8 characters long

> **Note:** Instead of string validations with `|` separation you can also give validations in arrays. Here's an equivalent example for the same above rule

```js
let rules = {
  name: ['string', 'min:2', 'max:8']
}
```

## 2. Data Types:

You can add the following data type check:

- `string`
- `number`
- `boolean`
- `array`
- `object`
- `bigint`
- `symbol`

## 3. Automatic String Check:

In these cases, it will automatic check for `string` data type, and you don't need to explicitly add a `string` type check:

- `name`
- `phone`
- `email`
- `url`
- `domain`
- `username`
- `numeric`
- `alpha`
- `alphanumeric`
- `mongoid`
- `date`
- `dateonly`
- `time`
- `lower`
- `upper`
- `ip`

## 4. Automatic Number Check:

In these cases, it will automatic check for `number` data type, and you don't need to explicitly add a `number` type check:

- `int`
- `positive`
- `negative`
- `natural`
- `whole`

## 5. Optional and Nullable Values:

### Optional

By default, all the data validation is _compulsory_, if you want any data field to be `optional` (_undefined_ or _absent field_), then make sure to add `optional` validation. e.g.

```js
let rules = {
  phone: 'optional|phone',
};
```

In this case, `phone` can be optional (means this field can be absent).

### Atleast

Some times it is required to have at least one field among the list of few optional fields. Let's say we have optional `email` and `phone` of a user but atleast one of them should always be present. In that case we can use `$atleast`, this will make sure we have atleast `email` or `phone` field. e.g.

```js
let rules = {
  email: 'optional|email',
  phone: 'optional|phone',
  $atleast: 'email|phone'
};
```

### Nullable

If you want any field to be `nullable` , then use `nullable` validation, this make sure that the field can be null. e.g.

```js
let rules = {
  spouse: 'nullable|name',
};
```

Now, `spouse` can be _null_.

> **NOTE:** In this above case `spouse` can't be _undefined_ (its still required). If you want it to be both `optional` and `nullable` then use both:

```js
let rules = {
  spouse: 'optional|nullable|name',
};
```

> Now, its not required and even can have null value.

## 6. Argument based Validations:

It supports the following argument based validations (See API for more details):

- `equal:<value>`: equality check for string, number and boolean
- `size:<int>`: length check for strings and arrays and digits length check for numbers
- `min:<value>`: minimum length check for strings and arrays, minimum value check for numbers and date (date should be in ISO format)
- `max:<value>`: maximum length check for strings and arrays, maximum value check for numbers and date (date should be in ISO format)
- `regex:<regex>`: regular expressions check for strings
- `decimalsize:<value>`: check for exact number of digits after decimal points for numbers and numeric strings
- `decimalmin:<value>`: check for minimum number of digits after decimal points for numbers and numeric strings
- `decimalmax:<value>`: check for maximum number of digits after decimal points for numbers and numeric strings
- `enums:<value>`: check for enum values for strings, numbers and boolean

> **INFO**: for more details and examples, see the API section.

> **LIMITATIONS**: To know about the limitations of `decimalsize:<value>` , `decimalmin:<value>` and `decimalmax:<value>` , see the API section

## 7. Regular Expression Limitations:

If `string` validations has regex which itself has `|` , then it will fail for validation. You can't use pipe operator `|` for regular expressions when using string based validation rules. In those cases, use array based rules instead. e.g.

> **ERROR**: This will not work, as its regex has `|` operator:

```js
let rules = {
  gender: 'string|regex:/^(male)|(female)$/',
};
```

> **FIX**: Instead use this:

```js
let rules = {
  gender: ['string', 'regex:/^(male)|(female)$/'],
};
```

# API

## Nullable Types

### 1. **`optional`**

`optional` validation makes the variable optional means it can be _undefined_ or _missing field_.

```js
let rules = {
  organization: 'optional|string',
};
```

In the example above, organization field can be absent or it must be _string_.

### 2. **`$atleast`**

Some times it is required to have at least one field among the list of few optional fields. Suppose we have optional `otpUnlock`, `faceUnlock` and `pinUnlock` fields, but atleast one of them is required. In that case we can use `$atleast`. e.g.

```js
let rules = {
  otpUnlock: 'optional|boolean',
  faceUnlock: 'optional|boolean',
  pinUnlock: 'optional|boolean',
  $atleast: 'otpUnlock|faceUnlock|pinUnlock'
};
```

or, you can even pass these fields in array:

```js
let rules = {
  otpUnlock: 'optional|boolean',
  faceUnlock: 'optional|boolean',
  pinUnlock: 'optional|boolean',
  $atleast: ['otpUnlock', 'faceUnlock', 'pinUnlock']
};
```
This will make sure at least one of the 3 is `true`.

### 3. **`nullable`**

`nullable` validation makes the variable nullable means it can be _null_.

```js
let rules = {
  organization: 'null|string',
};
```

In the example above, organization field can be either _null_ or _string_.

> **NOTE:** If you want any field to support both _undefined_ or _null_, then apply both validation. e.g.

```js
let rules = {
  age: 'optional|null|number',
};
```

> In the example above, the `age` could be absent, _null_ or even any number.

## Data Types

### 1. **`string`**

`string` validation is used to check if a field is string or not. e.g.

```js
let rules = {
  fieldName: 'string',
};
```

> **Note:** This validation automatically applies in cases of: `email` , `url` , `domain` , `name` , `username` , `numeric` , `alpha` , `alphanumeric` , `phone` , `mongoid` , `date` , `dateonly` , `time` , `lower` , `upper` , `ip` , and `regex:<value>` .

### 2. **`number`**

`number` validation is used to check if a field is number or not. e.g.

```js
let rules = {
  fieldName: 'number',
};
```

> **Note:** This validation automatically applies in cases of: `int` , `positive` , `negative` , `natural` , `whole` .

### 3. **`boolean`**

`boolean` validation is used to check if a field is boolean (_true_ or _false_). e.g.

```js
let rules = {
  fieldName: 'boolean',
};
```

### 4. **`array`**

`array` validation is used to check if a field is an array. e.g.

```js
let rules = {
  fieldName: 'array',
};
```

### 5. **`object`**

`object` validation is used to check if a field is an _object_. e.g.

```js
let rules = {
  address: 'object',
  'address.pin': 'regex:/^[0-9]{6}$/',
  'address.city': 'name',
};
```

You can also write validation for nested properties of object using dot `.`

> **NOTE:** In case if `address` is array, it will fail the validation. Although array in javascript is also an object but it will still fail, as array and object have completely different roles.

### 6. **`bigint`**

`bigint` validation is used to check if a field is a _bigint_ type. e.g.

```js
let rules = {
  field: 'bigint',
};
```

### 7. **`symbol`**

`symbol` validation is used to check if a field is a _symbol_ type. e.g.

```js
let rules = {
  field: 'symbol',
};
```

## Specific String Types

> **NOTE:** These validations automatically check if the field is a _string_ data type.

### 1. **`email`**

`email` validation is used to check if a field is a valid email string. e.g.

```js
let rules = {
  myEmail: 'email',
};
```

### 2. **`url`**

`url` validation is used to check if a field is a valid URL string. e.g.

```js
let rules = {
  profile: 'url',
};
```

### 3. **`domain`**

`domain` validation is used to check if a field is a valid domain string. e.g.

```js
let rules = {
  domain: 'domain',
};
```

### 4. **`name`**

`name` validation is used to check if a field is a valid name string. e.g.

```js
let rules = {
  studentName: 'name',
};
```

### 5. **`username`**

`username` validation is used to check if a field is a valid username string. This is primarily used to generate a unique ID for each user for any particular site. e.g.

```js
let rules = {
  username: 'username',
};
```

### 6. **`numeric`**

`numeric` validation is used to check if a field is a valid numeric string. This includes any type of number string as long as it can be converted to number data type without resulting in `NaN` . e.g.

```js
let rules = {
  otp: 'numeric',
};
```

### 7. **`alpha`**

`alpha` validation is used to check if a string contains only alphabets. This includes lowercase as well as uppercase alphabets. e.g.

```js
let rules = {
  keyword: 'alpha',
};
```

### 8. **`alphanumeric`**

`alphanumeric` validation is used to check if a string contains only alphabets and digits. This includes lowercase as well as uppercase alphabets. e.g.

```js
let rules = {
  passwordHash: 'alphanumeric',
};
```

### 9. **`phone`**

`phone` validation is used to check if a string contains valid phone number. This could also include a `+` or even a `space` . e.g.

```js
let rules = {
  phone: 'optional|phone',
};
```

### 10. **`mongoid`**

`mongoid` validation is used to check if a string is valid mongodb ID. e.g.

```js
let rules = {
  userId: 'mongoid',
};
```

### 11. **`date`**

`date` validation is used to check if a string is valid ISO date. This may also include the time as well. e.g.

```js
let rules = {
  dob: 'date',
};
```

This will validate the following strings:

```js
'1996-01-10';
'1996-01-10T23:50';
'1996-01-10T23:50:34';
'1996-01-10T23:50:34.6';
'1996-01-10T23:50:34.6789';
'1996-01-10T23:50:34.6789Z';
'1996-01-10T23:50:34.6789+05:30';
'1996-01-10T23:50:34.6789-03:00';
```

### 12. **`dateonly`**

`dateonly` validation is used to check if a string is valid ISO date. This must include date only without time. e.g.

```js
let rules = {
  dob: 'dateonly',
};
```

This will validate the following strings:

```js
'1996-01-10';
'2023-12-30';
'9999-04-01';
```

### 13. **`time`**

`time` validation is used to check if a string is valid ISO time. This must include time only. e.g.

```js
let rules = {
  startedAt: 'time',
};
```

This will validate the following time strings:

```js
'23:55:00';
'23:55:00.34';
'23:55:00.3400';
```

### 14. **`lower`**

`lower` validation is used to check if a string is all lowercase. This could include any character except uppercase letters. e.g.

```js
let rules = {
  name: 'lower',
};
```

### 15. **`upper`**

`upper` validation is used to check if a string is all uppercase. This could include any character except lowercase letters. e.g.

```js
let rules = {
  name: 'upper',
};
```

### 16. **`ip`**

`ip` validation is used to check if a string is a valid IP address. e.g.

```js
let rules = {
  name: 'ip',
};
```

## Specific Number Validation

> **NOTE:** These validations automatically check if the field is a _number_ data type.

### 1. **`int`**

`int` validation is used to check if a number is valid integer. e.g.

```js
let rules = {
  temperature: 'int',
};
```

### 2. **`positive`**

`positive` validation is used to check if a number is a positive number (Can't be 0 or negative). e.g.

```js
let rules = {
  price: 'positive',
};
```

### 3. **`negative`**

`negative` validation is used to check if a number is a negative number (Can't be 0 or positive). e.g.

```js
let rules = {
  concaveFocalLength: 'negative',
};
```

### 4. **`natural`**

`natural` validation is used to check if a number is a valid natural number (must be positive integers). e.g.

```js
let rules = {
  iq: 'natural',
};
```

### 5. **`whole`**

`whole` validation is used to check if a number is a valid whole number (can be positive integers or 0). e.g.

```js
let rules = {
  score: 'whole',
};
```

## Argument Based Validations

These validations require some argument(s).

### 1. **`equal`**

`equal:<value>` validation is used to check if a field has a specific value. It works for string, number and boolean data type

- **For numbers**, it will check if the number equals `<value>`
- **For strings**, it will check if the string equals `<value>`
- **For boolean**, it will check if the boolean equals `<value>`.

```js
let rules = {
  marks: 'number|equal:100', // marks should be number with value 100
  isTopper: 'boolean|equal:true', // isTopper should be boolean with value true
  name: 'string|equal:sia', // name should be string with value 'sia'
  status: 'equal:200', // auto detect
};
```

In this case, if the `status` is a string type then it must be `'200'` , else if the status is number, then it must be `200` .

### 2. **`size`**

`size:<value>` validation is used to check if a field has a specific size.

- **For numbers**, it will check if the number size is of `<value>` digits.
- **For strings**, it will check if the string length is `<value>`.
- **For arrays**, it will check if the array length is `<value>`.

e.g.

```js
let rules = {
  foods: 'array|size:3', // array should have 3 elements
  otp: 'string|numeric|size:6', // numeric string should have 6 digits
  pinCode: 'number|size:5', // pinCode should be number and must have 5 digits
  field: 'size:4', // Auto detect
};
```

> **NOTE:** In case if the data type is not defined as in previous case for `field` , then it will detect the data type of the `field` and then apply this validation but only if `field` is of type `string` , `number` or `array` .

### 3. **`min`**

`min:<value>` validation is used to check if a field has minimum of value `<value>` .

- **For numbers**, it will check if the number is more than or equal to `<value>`.
- **For strings**, it will check if the string length is more than or equal to `<value>`.
- **For arrays**, it will check if the array length is more than or equal to `<value>`.
- **For date string**, it will check if the date is more than or equal to `<value>`. Make sure that the date should be in ISO string format.

e.g.

```js
let rules = {
  foods: 'array|min:3', // array should have minimum 3 elements
  otp: 'string|numeric|min:6', // numeric string should have minimum 6 digits
  pinCode: 'number|min:5', // pinCode should be >= 5
  dob: 'date|min:2023-01:01T11:50:34.9876Z', // date should be >= '2023-01:01T11:50:34.9876Z'
  field: 'min:4', // Auto detect
};
```

> **NOTE:** In case if the data type is not defined as in the previous case for `field` , then it will detect the data type of the `field` and then apply `min:` validation but only if `field` is of type `string` , `number` , `array` or `date` .

### 4. **`max`**

`max:<value>` validation is used to check if a field has maximum of value `<value>` .

- **For numbers**, it will check if the number is less than or equal to `<value>`.
- **For strings**, it will check if the string length is less than or equal to `<value>`.
- **For arrays**, it will check if the array length is less than or equal to `<value>`.
- **For date string**, it will check if the date is less than or equal to `<value>`. Make sure that the date should be in ISO string format.

e.g.

```js
let rules = {
  foods: 'array|max:3', // array should have maximum 3 elements
  otp: 'string|numeric|max:6', // numeric string should have maximum 6 digits
  pinCode: 'number|max:5', // pinCode should be <= 5
  dob: 'date|max:2023-01:01T11:50:34.9876Z', // date should be <= '2023-01:01T11:50:34.9876Z'
  field: 'max:4', // Auto detect
};
```

> **NOTE:** In case if the data type is not defined as in the previous case for `field` , then it will detect the data type of the `field` and then apply `max:` validation but only if `field` is of type `string` , `number` , `array` or `date` .

### 5. **`regex`**

`regex:<value>` validation is used to check if string matches a specific regular expression `<value>` . This will automatically apply `string` validation, as it only works for string data type.

e.g.

```js
let rules = {
  hash: 'regex:/^[A-Z0-9]{128}$/i', // hash should match this regular expression
};
```

> **ERROR:** In case if the regular expression contains pipe `|` operator, then it will not work as expected as `|` is a special operator used for separation purpose. e.g. The following is incorrect validation:

e.g.

```js
let rules = {
  gender: 'string|regex:/^(male)|(female)$/',
};
```

> **FIX:** To get rid of this issue, write validation using array instead of string. e.g.

```js
let rules = {
  gender: ['string', 'regex:/^(male)|(female)$/i'],
};
```

> Now, it will work fine.

### 6. **`decimalsize`**

`decimalsize:<value>` validation is used to check if a field has `<value>` digits after decimal point.

- **For numbers**, it will check if the number has `<value>` digits after decimal point.
- **For strings**, it will check if the numeric string has `<value>` digits after decimal point. In this case it will automatically apply `numeric` validation.

e.g.

```js
let rules = {
  price: 'numeric|decimalsize:2', // price should be a numeric string with 2 digits after decimal point
  pi: 'number|decimalsize:6', // pi should be number with 6 digits after decimal point
  rate: 'decimalsize:3', // Auto detect
};
```

> **NOTE:** In case if the data type is not defined as in the previous case for `rate` , then it will detect the data type of the `rate` and then apply `decimalsize:` validation but only if `rate` is of type `string` or `number` .

> **WARNING:** In case if the data type is `number` , then it will trim the last zeroes after decimal point and then apply validation. So, The following example may not work as expected.

```js
let rules = {
  score: 'number|decimalsize:3',
};
```

> This will fail the validation if score is `23.340` or `23.000` because the last zeroes after decimal point will be removed and then it will check for validation. But this only happens with `number` and not with `numeric` string.

### 7. **`decimalmin`**

`decimalmin:<value>` validation is used to check if a field has minimum `<value>` digits after decimal point.

- **For numbers**, it will check if the number has minimum `<value>` digits after decimal point.
- **For strings**, it will check if the numeric string has minimum `<value>` digits after decimal point. In this case it will automatically apply `numeric` validation.

e.g.

```js
let rules = {
  price: 'numeric|decimalmin:2', // price should be a numeric string with minimum 2 digits after decimal point
  pi: 'number|decimalmin:6', // pi should be number with minimum 6 digits after decimal point
  rate: 'decimalmin:3', // Auto detect
};
```

> **NOTE:** In case if the data type is not defined as in the previous case for `rate` , then it will detect the data type of the `rate` and then apply `decimalmin:` validation but only if `rate` is of type `string` or `number` .

> **WARNING:** In case if the data type is `number` , then it will trim the last zeroes after decimal point and then apply validation. So, The following example may not work as expected.

```js
let rules = {
  score: 'number|decimalmin:3',
};
```

> This will fail the validation if score is `23.3400` or `23.000` because the last zeroes after decimal point will be removed and then it will check for validation. But this only happens with `number` and not with `numeric` string.

### 8. **`decimalmax`**

`decimalmax:<value>` validation is used to check if a field has maximum `<value>` digits after decimal point.

- **For numbers**, it will check if the number has maximum `<value>` digits after decimal point.
- **For strings**, it will check if the numeric string has maximum `<value>` digits after decimal point. In this case it will automatically apply `numeric` validation.

e.g.

```js
let rules = {
  price: 'numeric|decimalmax:2', // price should be a numeric string with maximum 2 digits after decimal point
  pi: 'number|decimalmax:6', // pi should be number with maximum 6 digits after decimal point
  rate: 'decimalmax:3', // Auto detect
};
```

> **NOTE:** In case if the data type is not defined as in the previous case for `rate` , then it will detect the data type of the `rate` and then apply `decimalmax:` validation but only if `rate` is of type `string` or `number` .

> **WARNING:** In case if the data type is `number` , then it will trim the last zeroes after decimal point and then apply validation. So, The following example may not work as expected.

```js
let rules = {
  score: 'number|decimalmax:3',
};
```

> This will still pass the validation if score is `23.3400` or `23.00000` because the last zeroes after decimal point will be removed and then it will check for validation. But this only happens with `number` and not with `numeric` string.

### 9. **`enums`**

`enums:<values>` validation is used to check if a field has a value which lies in comma separated `<values>` . It works for `string` , `number` and `boolean` data type.

- **For numbers**, it will convert each enum `<values>` into _number_ and then check if anyone of them matches with field value.
- **For strings**, it will convert each enum `<values>` into _string_ and then check if anyone of them matches with field value.
- **For boolean**, it will convert each enum `<values>` into _boolean_ and then check if anyone of them matches with field value. This will only check for boolean values (`true`/`false` and not any _truthy_ / _falsy_ values)

```js
let rules = {
  rating: 'number|enums:1,2,3,4,5', // rating should be any one of these numbers: 1, 2, 3, 4, or 5
  status: 'string|enums:pending,success,failed', // status should be string with anyone of: 'pending', 'success', or 'failed'
  isMarried: 'boolean|enums:true,false', // isMarried should be boolean with value either true or false
  subject: 'enums:english,maths,science', // auto detect
};
```

> **NOTE:** In case if the data type is not defined as in the previous case for `subject` , then it will detect the data type of the `subject` and then apply `enums:` validation but only if `subject` is of type `string` , `number` or `boolean` .

> **WARNING:** Don't add spaces while writing enum values as it will then include spaces while doing validation. e.g.

```js
let rules = {
  grade: 'string|enums: A+, A, B+, B, C, F',
};
```

> This will check if the grade contains anyone of `' A+'` , `' A'` , `' B+'` , `' C'` and `' F'` , instead of checking `'A+'` , `'A'` , `'B+'` , `'C'` and `'F'` . So make sure to put spaces only when required.
