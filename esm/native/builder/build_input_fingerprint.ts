// Canonical build input fingerprinting.
//
// This module owns the semantic build-input identity used by scheduler and
// build-runner dedupe. `build.signature` remains the module/door shape only.

import type { BuildStateLike, ConfigStateLike, UiStateLike, UnknownRecord } from '../../../types/index.js';

import {
  DOOR_MOUNT_THICKNESS_CONFIG_KEYS,
  resolveDoorMountThicknessesFromConfig,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import { asRecord } from '../runtime/record.js';
import { applyBuildVisibleConfigMapGates } from './build_visible_config_gates.js';

export type BuildInputFingerprintReader = (state: unknown) => unknown;

export type BuildInputFingerprintParts = {
  signature: unknown;
  activeId: string;
  forceBuild: boolean;
};

function hasOwn(value: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function readRecord(value: unknown): UnknownRecord | null {
  return asRecord<UnknownRecord>(value);
}

const BUILD_INPUT_FINGERPRINT_DOOR_MOUNT_KEYS = [
  'doorMountMode',
  DOOR_MOUNT_THICKNESS_CONFIG_KEYS.overlay.frame,
  DOOR_MOUNT_THICKNESS_CONFIG_KEYS.overlay.shelf,
  DOOR_MOUNT_THICKNESS_CONFIG_KEYS.inset.frame,
  DOOR_MOUNT_THICKNESS_CONFIG_KEYS.inset.shelf,
] as const;

const BUILD_INPUT_FINGERPRINT_CONFIG_OMIT_KEYS = new Set<string>([
  '__snapshot',
  '__capturedAt',
  ...BUILD_INPUT_FINGERPRINT_DOOR_MOUNT_KEYS,
]);

const BUILD_INPUT_FINGERPRINT_UI_OMIT_KEYS = new Set<string>(['__activeId', 'forceBuild']);

const BUILD_INPUT_FINGERPRINT_RUNTIME_KEYS = ['sketchMode', 'globalClickMode', 'doorsOpen'] as const;

function hasAnyPresentKey(source: UnknownRecord | null, keys: readonly string[]): boolean {
  if (!source) return false;
  for (const key of keys) {
    if (hasOwn(source, key)) return true;
  }
  return false;
}

function hasEnumerableKeys(value: unknown): boolean {
  const rec = readRecord(value);
  return !!rec && Object.keys(rec).length > 0;
}

function readBuildInputFingerprintSnapshotValue(
  value: unknown,
  omitKeys: ReadonlySet<string> | null = null,
  seen: WeakSet<object> = new WeakSet<object>()
): unknown {
  if (value == null) return value;

  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'boolean') return value;
  if (valueType === 'number') return Number.isFinite(value) ? value : null;
  if (valueType === 'bigint') return String(value);
  if (valueType === 'function' || valueType === 'symbol' || valueType === 'undefined') return undefined;

  if (Array.isArray(value)) {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    const out = value.map(item => {
      const next = readBuildInputFingerprintSnapshotValue(item, omitKeys, seen);
      return typeof next === 'undefined' ? null : next;
    });
    seen.delete(value);
    return out;
  }

  const rec = readRecord(value);
  if (!rec) return String(value);
  if (seen.has(rec)) return '[Circular]';
  seen.add(rec);
  const out: UnknownRecord = {};
  for (const key of Object.keys(rec).sort()) {
    if (omitKeys?.has(key)) continue;
    const next = readBuildInputFingerprintSnapshotValue(rec[key], omitKeys, seen);
    if (typeof next !== 'undefined') out[key] = next;
  }
  seen.delete(rec);
  return out;
}

function readBuildInputFingerprintSnapshot(
  value: unknown,
  omitKeys: ReadonlySet<string> | null = null
): UnknownRecord | null {
  const snapshot = readBuildInputFingerprintSnapshotValue(value, omitKeys);
  const rec = readRecord(snapshot);
  return rec && hasEnumerableKeys(rec) ? rec : null;
}

function readBuildInputFingerprintConfigParts(state: UnknownRecord): UnknownRecord | null {
  const cfg = readRecord(state.config);
  if (!cfg) return null;

  const out = readBuildInputFingerprintSnapshot(cfg, BUILD_INPUT_FINGERPRINT_CONFIG_OMIT_KEYS) || {};
  applyBuildVisibleConfigMapGates(
    out as ConfigStateLike,
    (readRecord(state.ui) || {}) as UiStateLike,
    readRecord(state.mode)
  );

  if (hasAnyPresentKey(cfg, BUILD_INPUT_FINGERPRINT_DOOR_MOUNT_KEYS)) {
    const thickness = resolveDoorMountThicknessesFromConfig(cfg);
    out.doorMountMode = thickness.mode;
    out.doorMountThickness = {
      frameCm: thickness.frameThicknessCm,
      shelfCm: thickness.shelfThicknessCm,
    };
  }

  return Object.keys(out).length ? out : null;
}

function readBuildInputFingerprintUiParts(state: UnknownRecord): UnknownRecord | null {
  const ui = readRecord(state.ui);
  if (!ui) return null;

  return readBuildInputFingerprintSnapshot(ui, BUILD_INPUT_FINGERPRINT_UI_OMIT_KEYS);
}

function readBuildInputFingerprintModeParts(state: UnknownRecord): UnknownRecord | null {
  return readBuildInputFingerprintSnapshot(state.mode);
}

function readBuildInputFingerprintRuntimeParts(state: UnknownRecord): UnknownRecord | null {
  const runtime = readRecord(state.runtime);
  if (!runtime) return null;

  const out: UnknownRecord = {};
  for (const key of BUILD_INPUT_FINGERPRINT_RUNTIME_KEYS) {
    if (!hasOwn(runtime, key)) continue;
    const value = readBuildInputFingerprintSnapshotValue(runtime[key]);
    if (typeof value !== 'undefined') out[key] = value;
  }
  return Object.keys(out).length ? out : null;
}

function readSemanticBuildInputFingerprint(state: unknown, signature: unknown): unknown {
  const stateRec = readRecord(state);
  if (!stateRec) return signature;

  const config = readBuildInputFingerprintConfigParts(stateRec);
  const ui = readBuildInputFingerprintUiParts(stateRec);
  const mode = readBuildInputFingerprintModeParts(stateRec);
  const runtime = readBuildInputFingerprintRuntimeParts(stateRec);
  if (!config && !ui && !mode && !runtime) return signature;

  const semantic: UnknownRecord = { signature };
  if (config) semantic.config = config;
  if (ui) semantic.ui = ui;
  if (mode) semantic.mode = mode;
  if (runtime) semantic.runtime = runtime;
  return `semantic:${normalizeBuildInputFingerprintScalar(semantic)}`;
}

export function readTransientBuildUiFlag(state: unknown, key: string): unknown {
  const stateRec = readRecord(state);
  const uiRec = readRecord(stateRec?.ui);
  return uiRec ? uiRec[key] : undefined;
}

export function normalizeBuildInputFingerprintScalar(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return `str:${value}`;
  if (typeof value === 'number') return `num:${Number.isFinite(value) ? value : 'NaN'}`;
  if (typeof value === 'boolean') return value ? 'bool:1' : 'bool:0';
  if (typeof value === 'bigint') return `big:${String(value)}`;
  try {
    const snapshot = readBuildInputFingerprintSnapshotValue(value);
    const json = stableSerializeBuildInputFingerprintValue(snapshot);
    if (json) return `json:${json}`;
  } catch {
    // fall through
  }
  return `repr:${String(value)}`;
}

function stableSerializeBuildInputFingerprintValue(
  value: unknown,
  seen: WeakSet<object> = new WeakSet<object>()
): string {
  if (value === null) return 'null';
  if (typeof value === 'undefined') return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'bigint') return JSON.stringify(String(value));
  if (typeof value === 'function' || typeof value === 'symbol') return 'undefined';
  if (Array.isArray(value)) {
    if (seen.has(value)) return JSON.stringify('[Circular]');
    seen.add(value);
    const out = `[${value
      .map(item => {
        const next = stableSerializeBuildInputFingerprintValue(item, seen);
        return next === 'undefined' ? 'null' : next;
      })
      .join(',')}]`;
    seen.delete(value);
    return out;
  }
  const rec = readRecord(value);
  if (!rec) return JSON.stringify(String(value));
  if (seen.has(rec)) return JSON.stringify('[Circular]');
  seen.add(rec);
  const props: string[] = [];
  for (const key of Object.keys(rec).sort()) {
    const next = stableSerializeBuildInputFingerprintValue(rec[key], seen);
    if (next === 'undefined') continue;
    props.push(`${JSON.stringify(key)}:${next}`);
  }
  seen.delete(rec);
  return `{${props.join(',')}}`;
}

export function createBuildInputFingerprint(parts: BuildInputFingerprintParts): unknown {
  const activeId = parts.activeId || '';
  const signaturePart = normalizeBuildInputFingerprintScalar(parts.signature);
  if (!activeId && !parts.forceBuild) {
    const signature = parts.signature;
    if (
      signature == null ||
      typeof signature === 'string' ||
      typeof signature === 'number' ||
      typeof signature === 'boolean' ||
      typeof signature === 'bigint'
    ) {
      return signature;
    }
    return `sig:${signaturePart}`;
  }
  return `sig:${signaturePart}|active:${activeId}|force:${parts.forceBuild ? '1' : '0'}`;
}

export function readBuildInputFingerprintFromState(
  state: BuildStateLike | null | undefined,
  readSignature: BuildInputFingerprintReader
): unknown {
  const signature = state == null ? null : readSemanticBuildInputFingerprint(state, readSignature(state));
  const activeIdRaw = readTransientBuildUiFlag(state, '__activeId');
  const activeId = activeIdRaw == null ? '' : String(activeIdRaw);
  const forceBuild = !!readTransientBuildUiFlag(state, 'forceBuild');
  return createBuildInputFingerprint({ signature, activeId, forceBuild });
}

export function readBuildInputFingerprintFromArgs(
  args: readonly unknown[],
  readSignature: BuildInputFingerprintReader
): unknown {
  if (!Array.isArray(args) || args.length === 0) return null;
  return readBuildInputFingerprintFromState(args[0] as BuildStateLike | null | undefined, readSignature);
}
