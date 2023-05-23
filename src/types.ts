export type Rules = {
	[key: string]: string | string[];
};

export interface Data {
	[key: string]: any;
}

export type DataType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'bigint' | 'symbol';

export type SpecificStringType =
	| 'email'
	| 'url'
	| 'domain'
	| 'name'
	| 'username'
	| 'numeric'
	| 'alpha'
	| 'alphanumeric'
	| 'phone'
	| 'mongoid'
	| 'date'
	| 'dateonly'
	| 'time'
	| 'lower'
	| 'upper'
	| 'ip';

export type SpecificNumberType = 'int' | 'positive' | 'negative' | 'natural' | 'whole';

export type ConstraintType =
	| `equal:${string}` // string, number, boolean
	| `size:${number}` // string, array, number
	| `min:${number}` // string, number, array, date
	| `max:${number}` // string, number, array, date
	| `regex:${string}`
	| `decimalsize:${number}`
	| `decimalmin:${number}`
	| `decimalmax:${number}`
	| `enums:${string}`; // string, number, boolean (comma separated)

export type ArrayType =
	// basic data types
	| 'arrayof:string'
	| 'arrayof:number'
	| 'arrayof:boolean'
	| 'arrayof:array'
	| 'arrayof:object'
	| 'arrayof:bigint'
	| 'arrayof:symbol'

	// specific string types
	| 'arrayof:email'
	| 'arrayof:url'
	| 'arrayof:domain'
	| 'arrayof:name'
	| 'arrayof:username'
	| 'arrayof:numeric'
	| 'arrayof:alpha'
	| 'arrayof:alphanumeric'
	| 'arrayof:phone'
	| 'arrayof:mongoid'
	| 'arrayof:date'
	| 'arrayof:dateonly'
	| 'arrayof:time'

	// specific number types
	| 'arrayof:int'
	| 'arrayof:positive'
	| 'arrayof:negative'
	| 'arrayof:natural'
	| 'arrayof:whole'

	// special constraints
	| `arrayof:equal:${string}` // string, number, boolean
	| `arrayof:size:${number}` // string, array, number
	| `arrayof:min:${number}` // string, number, array, date
	| `arrayof:max:${number}` // string, number, array, date
	| `arrayof:regex:${string}`
	| `arrayof:decimalsize:${number}`
	| `arrayof:decimalmin:${number}`
	| `arrayof:decimalmax:${number}`
	| `arrayof:enums:${string}`; // string, number (comma separated)

export type Validation =
	| 'optional'
	| 'symbol'
	| 'string'
	| 'number'
	| 'bigint'
	| 'object'
	| 'boolean'
	| 'array'
	| 'nullable'
	| 'email'
	| 'url'
	| 'domain'
	| 'name'
	| 'username'
	| 'numeric' // numeric string
	| 'alpha'
	| 'alphanumeric'
	| 'phone'
	| 'mongoid'
	| 'date'
	| 'dateonly'
	| 'time'
	| 'lower'
	| 'upper'
	| 'ip'
	| 'int'
	| 'positive'
	| 'negative'
	| 'natural'
	| 'whole'
	| `equal:${string}` // string, number, boolean
	| `size:${number}` // string, array, number
	| `min:${number}` // string, number, array, date
	| `max:${number}` // string, number, array, date
	| `regex:${string}` // string
	| `decimalsize:${number}` // string, number
	| `decimalmin:${number}` // string, number
	| `decimalmax:${number}` // string, number
	| `enums:${string}` // string, number, boolean (comma separated)
	| `arrayof:${
			// basic data types
			| 'string'
				| 'number'
				| 'boolean'
				| 'array'
				| 'object'
				| 'bigint'
				| 'symbol'

				// specific string types
				| 'email'
				| 'url'
				| 'domain'
				| 'name'
				| 'username'
				| 'numeric'
				| 'alpha'
				| 'alphanumeric'
				| 'phone'
				| 'mongoid'
				| 'date'
				| 'dateonly'
				| 'time'

				// specific number types
				| 'int'
				| 'positive'
				| 'negative'
				| 'natural'
				| 'whole'

				// special constraints
				| `equal:${string}` // string, number, boolean
				| `size:${number}` // string, array, number
				| `min:${number}` // string, number, array, date
				| `max:${number}` // string, number, array, date
				| `regex:${string}`
				| `decimalsize:${number}`
				| `decimalmin:${number}`
				| `decimalmax:${number}`
				| `enums:${string}` // string, number (comma separated)
	  }`;
