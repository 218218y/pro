import type { ActionMetaLike, AppContainer, UnknownRecord } from '../../../types';
import { isVisualKeyedMapName, writeMapKey } from '../runtime/maps_access.js';
import type { DomainApiSurfaceSectionsState } from './domain_api_surface_sections_contracts.js';
import {
  normalizePrefixedMapKey,
  readMapKey,
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
  value: unknown
): boolean {
  if (!mapName || !canonicalKey) return true;
  return areDomainMapValuesEquivalent(readDomainMapValue(state, mapName, canonicalKey), value);
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
  return shouldSkipCanonicalMapCommit(state, mapName, nextKey, value);
}

function readDomainGenericVisualMapWriteError(apiName: string, mapName: string): Error {
  return new Error(
    `[WardrobePro] ${apiName} cannot write visual/keyed map "${mapName}"; use a semantic runtime owner writer`
  );
}

export function assertDomainGenericMapWriteAllowed(apiName: string, mapName: string): void {
  if (isVisualKeyedMapName(mapName)) throw readDomainGenericVisualMapWriteError(apiName, mapName);
}

function isDomainGenericMapWriteAllowed(apiName: string, mapName: string): boolean {
  assertDomainGenericMapWriteAllowed(apiName, mapName);
  return !!mapName;
}

export function patchCanonicalMapValue(
  patchMap: (mapName: unknown, key: unknown, value: unknown, meta?: ActionMetaLike) => unknown,
  mapName: string,
  canonicalKey: string,
  value: unknown,
  meta?: ActionMetaLike
): unknown {
  if (!canonicalKey) return undefined;
  if (!isDomainGenericMapWriteAllowed('patchCanonicalMapValue', mapName)) return undefined;
  patchMap(mapName, canonicalKey, value, meta);
  return undefined;
}

export function writeCanonicalMapValueDirect(
  App: AppContainer,
  mapName: string,
  canonicalKey: string,
  value: unknown,
  meta?: ActionMetaLike
): boolean {
  if (!canonicalKey) return false;
  if (!isDomainGenericMapWriteAllowed('writeCanonicalMapValueDirect', mapName)) return false;
  return writeMapKey(App, mapName, canonicalKey, value, meta);
}

export function commitCanonicalMapValue(
  state: DomainApiSurfaceSectionsState,
  mapName: string,
  canonicalKey: string,
  value: unknown,
  meta?: ActionMetaLike
): unknown {
  if (!canonicalKey) return undefined;
  if (!isDomainGenericMapWriteAllowed('commitCanonicalMapValue', mapName)) return undefined;
  if (shouldSkipCanonicalMapCommit(state, mapName, canonicalKey, value)) return undefined;
  if (writeCanonicalMapValueDirect(state.App, mapName, canonicalKey, value, meta)) {
    return undefined;
  }
  return state.patchCanonicalMapViaCfg(mapName, canonicalKey, value, meta);
}

export function patchCanonicalPrefixedMapViaCfg(
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
  if (!isDomainGenericMapWriteAllowed('patchCanonicalPrefixedMapViaCfg', mapName)) return undefined;
  return state.patchCanonicalMapViaCfg(mapName, nextKey, value, meta);
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
  if (!isDomainGenericMapWriteAllowed('commitCanonicalPrefixedMapValue', mapName)) return undefined;
  return commitCanonicalMapValue(state, mapName, nextKey, value, meta);
}

export function writeSimpleMapValue(
  state: DomainApiSurfaceSectionsState,
  mapName: string,
  key: unknown,
  value: unknown,
  meta?: ActionMetaLike
): unknown {
  const nextMapName = readMapKey(mapName);
  const nextKey = readMapKey(key);
  if (!nextMapName || !nextKey) return undefined;
  if (!isDomainGenericMapWriteAllowed('writeSimpleMapValue', nextMapName)) return undefined;
  if (shouldSkipSimpleMapWrite(state, nextMapName, nextKey, value)) return undefined;
  if (writeMapKey(state.App, nextMapName, nextKey, value, meta)) return undefined;
  return state._cfgMapPatch(nextMapName, nextKey, value, meta);
}

export function toggleSimpleBooleanMapValue(
  state: DomainApiSurfaceSectionsState,
  mapName: string,
  key: unknown,
  readIsOn: (canonicalKey: string) => boolean,
  meta?: ActionMetaLike
): unknown {
  const nextKey = readMapKey(key);
  if (!nextKey) return undefined;
  return writeSimpleMapValue(state, mapName, nextKey, readIsOn(nextKey) ? null : true, meta);
}
