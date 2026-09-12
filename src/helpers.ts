import { Validation, Data } from './types.ts';

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

const BRACKET = /\[(-?\d*)(:?)(-?\d*)\]/g
const HAS_BRACKET = /\[-?\d*:?-?\d*\]/
const SLICE_BRACKET = /\[-?\d*:-?\d*\]/

export function hasIndexSyntax(key: string): boolean {
	return HAS_BRACKET.test(key)
}

export function isSliceKey(key: string): boolean {
	return SLICE_BRACKET.test(key)
}

function at(container: any[], raw: string) {
	const n = Number(raw)
	return container[n < 0 ? container.length + n : n]
}

export function resolveIndexedPath(obj: Data, key: string): { value: any; labels: string[] } {
	let current: any = obj
	let labels: string[] | undefined
	let prefix = ''

	for (const segment of key.split('.')) {
		const bracketStart = segment.indexOf('[')
		const base = bracketStart === -1 ? segment : segment.slice(0, bracketStart)

		if (base) {
			if (current === undefined || current === null || typeof current !== 'object') {
				return { value: undefined, labels: [] }
			}
			if (labels) {
				const picked: any[] = []
				const kept: string[] = []
				current.forEach((el: any, i: number) => {
					if (el !== undefined && el !== null && typeof el === 'object') {
						picked.push(el[base])
						kept.push(`${labels![i]}.${base}`)
					}
				})
				current = picked
				labels = kept
				prefix = ''
				continue
			}
			current = current[base]
		}

		prefix = prefix ? `${prefix}.${base}` : base

		if (bracketStart === -1) {
			continue
		}

		for (const m of segment.slice(bracketStart).matchAll(BRACKET)) {
			const [, from, colon, to] = m
			if (!Array.isArray(current)) {
				return { value: undefined, labels: [] }
			}
			if (colon) {
				const f = from === '' ? 0 : Number(from)
				const t = to === '' ? current.length : Number(to)
				const start = f < 0 ? Math.max(current.length + f, 0) : Math.min(f, current.length)
				const picked = current.slice(f, t)
				labels = picked.map((_: any, i: number) => `${prefix}[${start + i}]`)
				current = picked
			} else {
				current = at(current, from)
				prefix = `${prefix}[${from}]`
			}
		}
	}

	return { value: current, labels: labels ?? [] }
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