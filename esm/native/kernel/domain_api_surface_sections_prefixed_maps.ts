import type { UnknownRecord } from '../../../types';

export interface PrefixedMapSemantics {
  prefix: string;
  whenMissing: boolean;
  expectExplicitTrue: boolean;
}

export const splitDoorMapSemantics: PrefixedMapSemantics = {
  prefix: 'split_',
  whenMissing: true,
  expectExplicitTrue: false,
};

export const splitDoorBottomMapSemantics: PrefixedMapSemantics = {
  prefix: 'splitb_',
  whenMissing: false,
  expectExplicitTrue: true,
};

export const grooveMapSemantics: PrefixedMapSemantics = {
  prefix: 'groove_',
  whenMissing: false,
  expectExplicitTrue: true,
};

export function readMapKey(value: unknown): string {
  return String(value || '').trim();
}

export function normalizePrefixedMapKey(value: unknown, prefix: string): string {
  const key = readMapKey(value);
  if (!key) return '';
  return key.indexOf(prefix) === 0 ? key : prefix + key;
}

export function uniqueNonEmptyKeys(keys: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    const next = String(key || '').trim();
    if (!next || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out;
}

export function readToggleMapFlagForKeys(
  map: UnknownRecord,
  keys: readonly string[],
  whenMissing: boolean,
  expectExplicitTrue: boolean
): boolean {
  for (const entryKey of keys) {
    if (!Object.prototype.hasOwnProperty.call(map, entryKey)) continue;
    return expectExplicitTrue ? map[entryKey] === true : map[entryKey] !== false;
  }
  return whenMissing;
}

export function readPrefixedToggleMapFlag(
  readMap: () => UnknownRecord,
  value: unknown,
  semantics: PrefixedMapSemantics,
  extraLookupKeys?: Array<string | null | undefined>
): boolean {
  return readToggleMapFlagForKeys(
    readMap(),
    uniqueNonEmptyKeys([...(extraLookupKeys || []), normalizePrefixedMapKey(value, semantics.prefix)]),
    semantics.whenMissing,
    semantics.expectExplicitTrue
  );
}
