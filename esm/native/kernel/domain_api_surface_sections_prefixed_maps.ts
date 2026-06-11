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

export function readLegacyPrefixedAliasKey(value: unknown, prefix: string): string {
  const key = readMapKey(value);
  if (!key) return '';
  return key.indexOf(prefix) === 0 ? key.slice(prefix.length) : key;
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

export function readPrefixedMapLookupKeys(value: unknown, prefix: string): string[] {
  return uniqueNonEmptyKeys([
    normalizePrefixedMapKey(value, prefix),
    readLegacyPrefixedAliasKey(value, prefix),
  ]);
}

export function listPrefixedMapCleanupKeys(value: unknown, prefix: string): string[] {
  const canonicalKey = normalizePrefixedMapKey(value, prefix);
  return readPrefixedMapLookupKeys(value, prefix).filter(key => key !== canonicalKey);
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
    uniqueNonEmptyKeys([...(extraLookupKeys || []), ...readPrefixedMapLookupKeys(value, semantics.prefix)]),
    semantics.whenMissing,
    semantics.expectExplicitTrue
  );
}
