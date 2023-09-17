import { Validation, Data } from './types';

export function getField(validations: Validation[], key: string) {
  if(/\[[0-9]+\]$/.test(key)) {
    return;
  }
  let validation = validations.find(e => e.startsWith('field:'));
  if(!validation) {
    return;
  }

  return validation.slice('field:'.length);
}

export function getError(validations: Validation[]) {
  let validation = validations.find(e => e.startsWith('error:'));
  if(!validation) {
    return;
  }

  return validation.slice('error:'.length);
}

export function getSize(validations: Validation[]): number {
  let validation = validations.find(e => e.startsWith('size:'));
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
		if (candidate !== undefined) {
			obj = candidate;
		} else {
			break;
		}
	}
	return obj[props[i]];
}