import type { ActionMetaLike, AppContainer, UnknownRecord } from '../../../types';
import { writeMapKey } from '../runtime/maps_access.js';
import type { DomainApiSurfaceSectionsState } from './domain_api_surface_sections_contracts.js';
import {
  listPrefixedMapCleanupKeys,
  normalizePrefixedMapKey,
  readMapKey,
  uniqueNonEmptyKeys,
  type PrefixedMapSemantics,
} from './domain_api_surface_sections_prefixed_maps.js';

function readOwnMapValue(map: UnknownRecord, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
}

function isPlainDomainValueObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function areDomainMapValuesEquivalent(left: unknown, right: unknown, depth = 3): boolean {
  if (left == null && right == null) return true;
  if (Object.is(left, right)) return true;
  if (depth <= 0) return false;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
      if (!areDomainMapValuesEquivalent(left[index], right[index], depth - 1)) return false;
    }
    return true;
  }

  if (isPlainDomainValueObject(left) || isPlainDomainValueObject(right)) {
    if (!isPlainDomainValueObject(left) || !isPlainDomainValueObject(right)) return false;
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    for (const key of leftKeys) {
      if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
      if (!areDomainMapValuesEquivalent(left[key], right[key], depth - 1)) return false;
    }
    return true;
  }

  return false;
}

export function readDomainMapValue(
  state: DomainApiSurfaceSectionsState,
  mapName: string,
  key: string
): unknown {
  if (!mapName || !key) return undefined;
  const map = state._map(mapName);
  return map && typeof map === 'object' ? readOwnMapValue(map, key) : undefined;
}

export function shouldSkipSimpleMapWrite(
  state: DomainApiSurfaceSectionsState,
  mapName: string,
  key: string,
  value: unknown
): boolean {
  return !!mapName && !!key && areDomainMapValuesEquivalent(readDomainMapValue(state, mapName, key), value);
}

export function shouldSkipCanonicalMapCommit(
  state: DomainApiSurfaceSectionsState,
  mapName: string,
  canonicalKey: string,
  value: unknown,
  aliasesToClear?: Array<string | null | undefined>
): boolean {
  if (!mapName || !canonicalKey) return true;
  if (!areDomainMapValuesEquivalent(readDomainMapValue(state, mapName, canonicalKey), value)) return false;
  for (const alias of uniqueNonEmptyKeys((aliasesToClear || []).filter(key => key && key !== canonicalKey))) {
    if (!areDomainMapValuesEquivalent(readDomainMapValue(state, mapName, alias), null)) return false;
  }
  return true;
}

export function shouldSkipCanonicalPrefixedMapCommit(
  state: DomainApiSurfaceSectionsState,
  mapName: string,
  valueOrKey: unknown,
  semantics: PrefixedMapSemantics,
  value: unknown,
  canonicalKey?: string
): boolean {
  const nextKey = canonicalKey || normalizePrefixedMapKey(valueOrKey, semantics.prefix);
  if (!nextKey) return true;
  return shouldSkipCanonicalMapCommit(
    state,
    mapName,
    nextKey,
    value,
    listPrefixedMapCleanupKeys(valueOrKey, semantics.prefix)
  );
}

export function patchCanonicalMapValue(
  patchMap: (mapName: unknown, key: unknown, value: unknown, meta?: ActionMetaLike) => unknown,
  mapName: string,
  canonicalKey: string,
  value: unknown,
  meta?: ActionMetaLike,
  aliasesToClear?: Array<string | null | undefined>
): unknown {
  if (!canonicalKey) return undefined;
  const cleanupKeys = uniqueNonEmptyKeys((aliasesToClear || []).filter(key => key && key !== canonicalKey));
  patchMap(mapName, canonicalKey, value, meta);
  for (const key of cleanupKeys) patchMap(mapName, key, null, meta);
  return undefined;
}

export function writeCanonicalMapValueDirect(
  App: AppContainer,
  mapName: string,
  canonicalKey: string,
  value: unknown,
  meta?: ActionMetaLike,
  aliasesToClear?: Array<string | null | undefined>
): boolean {
  if (!canonicalKey) return false;
  const wrote = writeMapKey(App, mapName, canonicalKey, value, meta);
  const cleanupKeys = uniqueNonEmptyKeys((aliasesToClear || []).filter(key => key && key !== canonicalKey));
  for (const key of cleanupKeys) writeMapKey(App, mapName, key, null, meta);
  return wrote;
}

export function commitCanonicalMapValue(
  state: DomainApiSurfaceSectionsState,
  mapName: string,
  canonicalKey: string,
  value: unknown,
  meta?: ActionMetaLike,
  aliasesToClear?: Array<string | null | undefined>
): unknown {
  if (!canonicalKey) return undefined;
  if (shouldSkipCanonicalMapCommit(state, mapName, canonicalKey, value, aliasesToClear)) return undefined;
  if (writeCanonicalMapValueDirect(state.App, mapName, canonicalKey, value, meta, aliasesToClear)) {
    return undefined;
  }
  return state.patchCanonicalMapFallback(mapName, canonicalKey, value, meta, aliasesToClear);
}

export function patchCanonicalPrefixedMapFallback(
  state: DomainApiSurfaceSectionsState,
  mapName: string,
  valueOrKey: unknown,
  semantics: PrefixedMapSemantics,
  value: unknown,
  meta?: ActionMetaLike,
  canonicalKey?: string
): unknown {
  const nextKey = canonicalKey || normalizePrefixedMapKey(valueOrKey, semantics.prefix);
  if (!nextKey) return undefined;
  return state.patchCanonicalMapFallback(
    mapName,
    nextKey,
    value,
    meta,
    listPrefixedMapCleanupKeys(valueOrKey, semantics.prefix)
  );
}

export function commitCanonicalPrefixedMapValue(
  state: DomainApiSurfaceSectionsState,
  mapName: string,
  valueOrKey: unknown,
  semantics: PrefixedMapSemantics,
  value: unknown,
  meta?: ActionMetaLike,
  canonicalKey?: string
): unknown {
  const nextKey = canonicalKey || normalizePrefixedMapKey(valueOrKey, semantics.prefix);
  if (!nextKey) return undefined;
  return commitCanonicalMapValue(
    state,
    mapName,
    nextKey,
    value,
    meta,
    listPrefixedMapCleanupKeys(valueOrKey, semantics.prefix)
  );
}

export function writeSimpleMapValueWithFallback(
  state: DomainApiSurfaceSectionsState,
  mapName: string,
  key: unknown,
  value: unknown,
  meta?: ActionMetaLike
): unknown {
  const nextMapName = readMapKey(mapName);
  const nextKey = readMapKey(key);
  if (!nextMapName || !nextKey) return undefined;
  if (shouldSkipSimpleMapWrite(state, nextMapName, nextKey, value)) return undefined;
  if (writeMapKey(state.App, nextMapName, nextKey, value, meta)) return undefined;
  return state._cfgMapPatch(nextMapName, nextKey, value, meta);
}

export function toggleSimpleBooleanMapValueWithFallback(
  state: DomainApiSurfaceSectionsState,
  mapName: string,
  key: unknown,
  readIsOn: (canonicalKey: string) => boolean,
  meta?: ActionMetaLike
): unknown {
  const nextKey = readMapKey(key);
  if (!nextKey) return undefined;
  return writeSimpleMapValueWithFallback(state, mapName, nextKey, readIsOn(nextKey) ? null : true, meta);
}
