import type {
  ActionMetaLike,
  AppContainer,
  ConfigStateLike,
  CurtainsActionsLike,
  DividersActionsLike,
  DoorsActionsLike,
  DrawersActionsLike,
  FlagsActionsLike,
  GroovesActionsLike,
  RuntimeStateLike,
  TexturesActionsLike,
  UiStateLike,
  UnknownRecord,
  ViewActionsLike,
} from '../../../types';
import type {
  DomainCurtainsSelect,
  DomainDividersSelect,
  DomainDoorsSelect,
  DomainDrawersSelect,
  DomainFlagsSelect,
  DomainGroovesSelect,
  DomainSelectSurface,
  DomainTexturesSelect,
  DomainViewSelect,
} from './domain_api_shared.js';
import { writeMapKey } from '../runtime/maps_access.js';

export interface DomainApiSurfaceSectionsContext {
  App: AppContainer;
  select: DomainSelectSurface;
  mapActions: UnknownRecord;
  doorsActions: DoorsActionsLike;
  drawersActions: DrawersActionsLike;
  dividersActions: DividersActionsLike;
  viewActions: ViewActionsLike;
  flagsActions: FlagsActionsLike;
  texturesActions: TexturesActionsLike;
  groovesActions: GroovesActionsLike;
  curtainsActions: CurtainsActionsLike;
  _cfg: () => ConfigStateLike;
  _ui: () => UiStateLike;
  _rt: () => RuntimeStateLike;
  _meta: (meta: ActionMetaLike | UnknownRecord | null | undefined, source: string) => ActionMetaLike;
  _map: (mapName: unknown) => UnknownRecord;
  _num: (value: unknown) => number | null;
  _cfgMapPatch: (mapName: unknown, key: unknown, val: unknown, meta?: ActionMetaLike) => unknown;
}

export interface DomainApiSurfaceSectionsState extends DomainApiSurfaceSectionsContext {
  selectRoot: UnknownRecord;
  doorsSelect: DomainDoorsSelect;
  drawersSelect: DomainDrawersSelect;
  dividersSelect: DomainDividersSelect;
  viewSelect: DomainViewSelect;
  flagsSelect: DomainFlagsSelect;
  groovesSelect: DomainGroovesSelect;
  curtainsSelect: DomainCurtainsSelect;
  texturesSelect: DomainTexturesSelect;
  readDoorsRemovedMap: () => UnknownRecord;
  readDoorsSplitMap: () => UnknownRecord;
  readDoorsSplitBottomMap: () => UnknownRecord;
  readDoorsHingeMap: () => UnknownRecord;
  readDoorsHandlesMap: () => UnknownRecord;
  readDoorsIsOpen: () => boolean;
  readDividersMap: () => UnknownRecord;
  readDividerIsOn: (dividerKey: unknown) => boolean;
  readGroovesMap: () => UnknownRecord;
  readGrooveIsOn: (partIdOrKey: unknown) => boolean;
  readCurtainsMap: () => UnknownRecord;
  readSplitFlag: (doorBaseId: unknown) => boolean;
  readSplitBottomFlag: (doorBaseId: unknown) => boolean;
  readGrooveFlag: (partIdOrKey: unknown) => boolean;
  patchCanonicalMapFallback: (
    mapName: string,
    canonicalKey: string,
    value: unknown,
    meta?: ActionMetaLike,
    aliasesToClear?: Array<string | null | undefined>
  ) => unknown;
}

export const DOMAIN_API_SECTION_KEYS = [
  'selectRoot',
  'mapActions',
  'doorsSelect',
  'doorsActions',
  'drawersSelect',
  'drawersActions',
  'dividersSelect',
  'dividersActions',
  'viewSelect',
  'viewActions',
  'flagsSelect',
  'flagsActions',
  'texturesSelect',
  'texturesActions',
  'groovesSelect',
  'groovesActions',
  'curtainsSelect',
  'curtainsActions',
] as const;

export type DomainApiSurfaceSectionKey = (typeof DOMAIN_API_SECTION_KEYS)[number];
export type DomainApiSurfaceSectionBag = Record<DomainApiSurfaceSectionKey, UnknownRecord>;
export type DomainApiSurfaceSectionBindingFactory = (
  state: DomainApiSurfaceSectionsState
) => DomainApiSurfaceSectionBag[DomainApiSurfaceSectionKey];
export type DomainApiSurfaceSectionBindings = DomainApiSurfaceSectionBag;
export type DomainApiSurfaceSectionSurfaces = DomainApiSurfaceSectionBag;

export interface DomainApiSurfaceSectionsOwner {
  state: DomainApiSurfaceSectionsState;
  bindings: DomainApiSurfaceSectionBindings;
  surfaces: DomainApiSurfaceSectionSurfaces;
}

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

export function uniqueSurfaceTargets(surfaces: Array<UnknownRecord | null | undefined>): UnknownRecord[] {
  const out: UnknownRecord[] = [];
  const seen = new Set<UnknownRecord>();
  for (const surface of surfaces) {
    if (!surface || typeof surface !== 'object') continue;
    if (seen.has(surface)) continue;
    seen.add(surface);
    out.push(surface);
  }
  return out;
}

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

export function isSegmentedDoorBaseId(partId: string): boolean {
  return (
    /^(?:lower_)?d\d+$/.test(partId) ||
    /^(?:lower_)?corner_door_\d+$/.test(partId) ||
    /^(?:lower_)?corner_pent_door_\d+$/.test(partId)
  );
}

export function canonicalRemovedDoorPartId(partId: unknown): string {
  const raw = readMapKey(partId);
  if (!raw) return '';
  const clean = raw.indexOf('removed_') === 0 ? raw.slice(8) : raw;
  if (!clean) return '';
  if (/(?:_(?:full|top|bot|mid))$/i.test(clean)) return clean;
  return isSegmentedDoorBaseId(clean) ? clean + '_full' : clean;
}

export function listRemovedDoorLookupKeys(partId: unknown): string[] {
  const raw = readMapKey(partId);
  if (!raw) return [];
  const clean = raw.indexOf('removed_') === 0 ? raw.slice(8) : raw;
  const canonical = canonicalRemovedDoorPartId(clean);
  const fullInherited = /_(?:top|bot|mid)$/i.test(canonical)
    ? canonical.replace(/_(top|bot|mid)$/i, '_full')
    : '';
  return uniqueNonEmptyKeys([
    raw,
    clean,
    clean ? 'removed_' + clean : '',
    canonical,
    canonical ? 'removed_' + canonical : '',
    fullInherited,
    fullInherited ? 'removed_' + fullInherited : '',
  ]);
}

export function listRemovedDoorCleanupKeys(partId: unknown): string[] {
  const raw = readMapKey(partId);
  if (!raw) return [];
  const clean = raw.indexOf('removed_') === 0 ? raw.slice(8) : raw;
  const canonical = canonicalRemovedDoorPartId(clean);
  return uniqueNonEmptyKeys([clean, raw, clean ? 'removed_' + clean : '']).filter(
    key => key !== canonical && key !== (canonical ? 'removed_' + canonical : '')
  );
}
