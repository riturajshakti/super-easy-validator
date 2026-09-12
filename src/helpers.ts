import { Validation, Data } from './types';

function findPrefixed(validations: Validation[], prefix: string) {
  return validations.find(e => typeof e === 'string' && e.startsWith(prefix));
}

export function getField(validations: Validation[], key: string) {
  if(/\[[0-9]+\]$/.test(key)) {
    return;
  }
  let validation = findPrefixed(validations, 'field:');
  if(!validation) {
    return;
  }

  return validation.slice('field:'.length);
}

export function getError(validations: Validation[]) {
  let validation = findPrefixed(validations, 'error:');
  if(!validation) {
    return;
  }

  return validation.slice('error:'.length);
}

export function getSize(validations: Validation[]): number {
  let validation = findPrefixed(validations, 'size:');
  if(!validation) {
    return 1;
  }

  return +validation.slice('size:'.length);
}

export function getPropByString(obj: Data, propString: string) {
	if (!propString) return obj;

	let prop,
		props = propString.split('.');
	let i = 0;

	for (let iLen = props.length - 1; i < iLen; i++) {
		prop = props[i];

		let candidate = obj[prop];
		if (candidate !== undefined && candidate !== null && typeof candidate === 'object') {
			obj = candidate;
		} else {
			break;
		}
	}
	return obj[props[i]];
}