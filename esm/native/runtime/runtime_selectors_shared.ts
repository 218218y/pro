// Shared runtime selector contracts and defaults (ESM)
//
// Owns the runtime scalar key map and snapshot plumbing used by pure snapshot
// selectors and store/App adapters.

import type {
  RuntimeScalarKey,
  RuntimeScalarValueMap,
  RuntimeStateLike,
  UnknownRecord,
} from '../../../types/index.js';
import { asRecord as asUnknownRecord } from './record.js';

export type RuntimeRecordLike = RuntimeStateLike & Partial<Record<RuntimeScalarKey, unknown>> & UnknownRecord;

export const EMPTY_RUNTIME: RuntimeRecordLike = {};

export const DEFAULTS: { [K in RuntimeScalarKey]: RuntimeScalarValueMap[K] } = {
  sketchMode: false,
  globalClickMode: true,
  doorsOpen: false,
  doorsLastToggleTime: 0,
  drawersOpenId: null,
  restoring: false,
  systemReady: false,
  failFast: false,
  verboseConsoleErrors: true,
  verboseConsoleErrorsDedupeMs: 4000,
  debug: false,
  roomDesignActive: false,
  notesPicking: false,
  wardrobeWidthM: null,
  wardrobeHeightM: null,
  wardrobeDepthM: null,
  wardrobeDoorsCount: null,
};

export function isObj(v: unknown): v is UnknownRecord {
  return !!asUnknownRecord(v);
}

export function isRuntimeRecordLike(v: unknown): v is RuntimeRecordLike {
  return isObj(v);
}

export function getRtFromSnapshot(rt: unknown): RuntimeRecordLike {
  return isRuntimeRecordLike(rt) ? rt : EMPTY_RUNTIME;
}

export function readRuntimeValue(rt: unknown, key: RuntimeScalarKey | string): unknown {
  return getRtFromSnapshot(rt)[key];
}

export function getRuntimeScalarDefault<K extends RuntimeScalarKey>(
  key: K,
  fallback?: RuntimeScalarValueMap[K]
): RuntimeScalarValueMap[K] {
  return typeof fallback !== 'undefined' ? fallback : DEFAULTS[key];
}
