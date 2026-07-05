import type { UnknownRecord } from '../../../types';

import { isKnownMapName } from './maps_access_normalizers.js';
import { isConfigPatchProtocolKey, readConfigPatchReplaceMap } from './cfg_access_patch_metadata.js';

const STORE_CONFIG_MAP_WRITE_CAPABILITY = Symbol('WardrobePro.storeConfigMapWriteCapability');

export type StoreConfigMapWriteCapability = typeof STORE_CONFIG_MAP_WRITE_CAPABILITY;

export type StoreConfigMapWriteOptions = {
  configMapWriteCapability?: StoreConfigMapWriteCapability;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

export function hasStoreConfigMapWriteCapability(opts: unknown): boolean {
  return asRecord(opts)?.configMapWriteCapability === STORE_CONFIG_MAP_WRITE_CAPABILITY;
}

export function withStoreConfigMapWriteCapability<T extends UnknownRecord>(
  opts: T
): T & StoreConfigMapWriteOptions {
  return {
    ...opts,
    configMapWriteCapability: STORE_CONFIG_MAP_WRITE_CAPABILITY,
  };
}

export function readKnownConfigMapPatchKeys(configPatch: unknown): string[] {
  const patch = asRecord(configPatch);
  if (!patch) return [];
  return Object.keys(patch).filter(key => !isConfigPatchProtocolKey(key) && isKnownMapName(key));
}

export function readKnownConfigMapReplaceKeys(configPatch: unknown): string[] {
  const replace = readConfigPatchReplaceMap(configPatch);
  if (!replace) return [];
  return Object.keys(replace).filter(key => !!replace[key] && isKnownMapName(key));
}

export function assertStoreConfigMapWriteAllowed(
  configPatch: unknown,
  apiName: string,
  opts?: unknown
): void {
  if (hasStoreConfigMapWriteCapability(opts)) return;

  const mapKeys = readKnownConfigMapPatchKeys(configPatch);
  const replaceKeys = readKnownConfigMapReplaceKeys(configPatch);
  if (!mapKeys.length && !replaceKeys.length) return;

  const parts: string[] = [];
  if (mapKeys.length) parts.push(`branches (${mapKeys.join(', ')})`);
  if (replaceKeys.length) parts.push(`replace keys (${replaceKeys.join(', ')})`);
  throw new Error(
    `[WardrobePro] ${apiName} cannot write known config map ${parts.join(
      ' and '
    )}; use applyProjectSnapshot/applyPaintSnapshot or a semantic map writer.`
  );
}
