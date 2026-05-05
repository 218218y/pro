import type {
  ConfigStateLike,
  ConfigScalarKey,
  ConfigScalarValueMap,
  UnknownRecord,
} from '../../../types/index.js';

import { asRecord as asUnknownRecord } from './record.js';

export type BoardMaterialValue = ConfigScalarValueMap['boardMaterial'];
export type WardrobeTypeValue = ConfigScalarValueMap['wardrobeType'];
export type GlobalHandleTypeValue = ConfigScalarValueMap['globalHandleType'];
export type ConfigScalarState = ConfigStateLike & { [K in ConfigScalarKey]?: ConfigScalarValueMap[K] };
export type ConfigScalarDefaults = Partial<{ [K in ConfigScalarKey]: ConfigScalarValueMap[K] }>;
export type ConfigScalarDefaultValue = ConfigScalarValueMap[ConfigScalarKey] | undefined;

export type ReadConfigScalar = {
  <K extends ConfigScalarKey>(cfg: unknown, key: K): ConfigScalarValueMap[K] | undefined;
  (cfg: unknown, key: ConfigScalarKey): unknown;
};

export type ReadConfigScalarOrDefault = {
  <K extends ConfigScalarKey>(
    cfg: unknown,
    key: K,
    defaultValue?: ConfigScalarValueMap[K]
  ): ConfigScalarValueMap[K];
  (cfg: unknown, key: ConfigScalarKey, defaultValue?: ConfigScalarDefaultValue): unknown;
};

export type ReadConfigScalarOrDefaultFromRoot = {
  <K extends ConfigScalarKey>(
    storeOrApp: unknown,
    key: K,
    defaultValue?: ConfigScalarValueMap[K]
  ): ConfigScalarValueMap[K];
  (storeOrApp: unknown, key: ConfigScalarKey, defaultValue?: ConfigScalarDefaultValue): unknown;
};

export type ReadConfigArray = {
  <T = unknown>(cfg: unknown, key: string, defaultValue?: T[]): T[];
  (cfg: unknown, key: string, defaultValue?: unknown[]): unknown[];
};

function isObj(v: unknown): v is UnknownRecord {
  return !!asUnknownRecord(v);
}

export function isConfigState(value: unknown): value is ConfigScalarState {
  return isObj(value);
}

export const DEFAULTS: ConfigScalarDefaults = {
  wardrobeType: 'hinged',
  globalHandleType: 'standard',
  isLibraryMode: false,
  isMultiColorMode: false,
  showDimensions: true,
  isManualWidth: false,
  customUploadedDataURL: null,
  grooveLinesCount: null,
  boardMaterial: 'sandwich',
  dirty: false,
};

export function isBoardMaterialKey(key: ConfigScalarKey): key is 'boardMaterial' {
  return key === 'boardMaterial';
}

export function isWardrobeTypeKey(key: ConfigScalarKey): key is 'wardrobeType' {
  return key === 'wardrobeType';
}

export function isGlobalHandleTypeKey(key: ConfigScalarKey): key is 'globalHandleType' {
  return key === 'globalHandleType';
}

export function isBooleanConfigKey(
  key: ConfigScalarKey
): key is 'isLibraryMode' | 'isMultiColorMode' | 'showDimensions' | 'isManualWidth' | 'dirty' {
  return (
    key === 'isLibraryMode' ||
    key === 'isMultiColorMode' ||
    key === 'showDimensions' ||
    key === 'isManualWidth' ||
    key === 'dirty'
  );
}

export function isNullableStringConfigKey(key: ConfigScalarKey): key is 'customUploadedDataURL' {
  return key === 'customUploadedDataURL';
}

export function isNullableNumberConfigKey(key: ConfigScalarKey): key is 'grooveLinesCount' {
  return key === 'grooveLinesCount';
}

export function emptyConfigState(): ConfigScalarState {
  return Object.create(null);
}

export function getCfgFromSnapshot(cfg: unknown): ConfigScalarState {
  return isConfigState(cfg) ? cfg : emptyConfigState();
}

export function getCfgRecord(cfg: unknown): UnknownRecord {
  return asUnknownRecord(getCfgFromSnapshot(cfg)) ?? Object.create(null);
}

export function normalizeBoolean(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return !!value;
  const s = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!s) return defaultValue;
  if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true;
  if (s === 'false' || s === '0' || s === 'no' || s === 'off') return false;
  return !!value;
}

export function normalizeBoardMaterial(value: unknown, defaultValue: BoardMaterialValue): BoardMaterialValue {
  const s = String(value ?? '').trim();
  return s === 'sandwich' || s === 'melamine' ? s : defaultValue;
}

export function normalizeWardrobeType(value: unknown, defaultValue: WardrobeTypeValue): WardrobeTypeValue {
  const s = String(value ?? '').trim();
  return s === 'hinged' || s === 'sliding' ? s : defaultValue;
}

export function normalizeGlobalHandleType(
  value: unknown,
  defaultValue: GlobalHandleTypeValue
): GlobalHandleTypeValue {
  const s = String(value ?? '').trim();
  return s === 'standard' || s === 'edge' || s === 'none' ? s : defaultValue;
}

export function normalizeNullableGrooveLinesCount(
  value: unknown,
  defaultValue: number | null
): number | null {
  if (value === null) return null;
  if (typeof value === 'undefined' || value === '') return defaultValue;
  const n = Number(value);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.max(1, Math.floor(n));
}

export function readBoardMaterialDefault(value: unknown): BoardMaterialValue {
  return normalizeBoardMaterial(value, 'sandwich');
}

export function readWardrobeTypeDefault(value: unknown): WardrobeTypeValue {
  return normalizeWardrobeType(value, 'hinged');
}

export function readGlobalHandleTypeDefault(value: unknown): GlobalHandleTypeValue {
  return normalizeGlobalHandleType(value, 'standard');
}

export function readScalarValue(cfg: unknown, key: ConfigScalarKey): unknown {
  return getCfgFromSnapshot(cfg)[key];
}

export function pickDefaultScalar(
  key: ConfigScalarKey,
  defaultValue?: ConfigScalarDefaultValue
): ConfigScalarValueMap[ConfigScalarKey] | undefined {
  return typeof defaultValue !== 'undefined' ? defaultValue : DEFAULTS[key];
}
