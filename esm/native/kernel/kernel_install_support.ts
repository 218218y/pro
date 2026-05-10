import type { AppContainer, ActionMetaLike, ConfigSlicePatch, UnknownRecord } from '../../../types';

import {
  hasDedicatedCanonicalPatchDispatch,
  hasDedicatedSliceWriterSeam,
  patchSliceWithDedicatedWriter,
  touchMetaWithDedicatedWriter,
} from '../runtime/slice_write_access.js';
import type {
  DedicatedMetaTouchOptions,
  DedicatedSliceWriteOptions,
} from '../runtime/slice_write_access_shared.js';
import { shouldFailFast } from '../runtime/api.js';
import { cloneViaPlatform } from '../runtime/platform_access.js';
import { reportError } from '../runtime/errors.js';
import { readCornerConfigurationFromConfigSnapshot } from '../features/modules_configuration/corner_cells_api.js';
import { asRecord, asRecordOrNull, isRecord } from './kernel_shared.js';

const kernelCatchTs: Record<string, number> = Object.create(null);

const KERNEL_CONFIG_WRITE_OPTS: DedicatedSliceWriteOptions = {
  storeWriter: 'setConfig',
  preferStoreWriter: true,
  skipNamespacePatch: false,
};

const KERNEL_UI_WRITE_OPTS: DedicatedSliceWriteOptions = {
  storeWriter: 'setUi',
  preferStoreWriter: true,
  skipNamespacePatch: false,
};

const KERNEL_TOUCH_OPTS: DedicatedMetaTouchOptions = {
  preferStoreWriter: true,
};

function kernelShouldFailFast(App: AppContainer | null | undefined): boolean {
  try {
    return shouldFailFast(App);
  } catch {
    return false;
  }
}

function readKernelCloneToJSONValue(value: object): unknown {
  try {
    const maybe = value as { toJSON?: () => unknown };
    return typeof maybe.toJSON === 'function' ? maybe.toJSON() : value;
  } catch {
    return undefined;
  }
}

function cloneKernelJsonValue(value: unknown, seen: WeakSet<object> = new WeakSet<object>()): unknown {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol')
    return undefined;
  if (typeof value === 'bigint') return undefined;
  if (Array.isArray(value)) {
    if (seen.has(value)) return undefined;
    seen.add(value);
    try {
      const out: unknown[] = [];
      for (const entry of value) {
        const cloned = cloneKernelJsonValue(entry, seen);
        out.push(typeof cloned === 'undefined' ? null : cloned);
      }
      return out;
    } finally {
      seen.delete(value);
    }
  }
  if (!isRecord(value)) return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);
  try {
    const toJsonValue = readKernelCloneToJSONValue(value);
    if (toJsonValue !== value) return cloneKernelJsonValue(toJsonValue, seen);
    const out: UnknownRecord = {};
    for (const [key, entry] of Object.entries(value)) {
      const cloned = cloneKernelJsonValue(entry, seen);
      if (typeof cloned !== 'undefined') out[key] = cloned;
    }
    return out;
  } finally {
    seen.delete(value);
  }
}

export type KernelInstallSupport = {
  setStoreConfigPatch: (patch: ConfigSlicePatch, meta: ActionMetaLike) => boolean;
  setStoreUiSnapshot: (ui: UnknownRecord, meta: ActionMetaLike, config?: UnknownRecord) => boolean;
  touchStore: (meta: ActionMetaLike) => boolean;
  cloneKernelValue: (value: unknown, defaultValue?: unknown) => unknown;
  reportKernelError: (error: unknown, ctx: unknown) => boolean;
  reportNonFatal: (op: string, error: unknown, opts?: { throttleMs?: number; failFast?: boolean }) => void;
  readCornerCfgFromStoreConfig: (cfg: unknown) => UnknownRecord;
  readLowerCornerCfgFromCornerCfg: (cornerCfg: UnknownRecord) => UnknownRecord | null;
};

export function createKernelInstallSupport(App: AppContainer): KernelInstallSupport {
  const setStoreConfigPatch = (patch: ConfigSlicePatch, meta: ActionMetaLike): boolean => {
    if (!hasDedicatedSliceWriterSeam(App, 'config', KERNEL_CONFIG_WRITE_OPTS)) return false;
    patchSliceWithDedicatedWriter(App, 'config', patch, meta, KERNEL_CONFIG_WRITE_OPTS);
    return true;
  };

  const setStoreUiSnapshot = (ui: UnknownRecord, meta: ActionMetaLike, config?: UnknownRecord): boolean => {
    const canWriteUi = hasDedicatedSliceWriterSeam(App, 'ui', KERNEL_UI_WRITE_OPTS);
    const canWriteCfg =
      config == null ||
      !isRecord(config) ||
      hasDedicatedSliceWriterSeam(App, 'config', KERNEL_CONFIG_WRITE_OPTS);

    if (!canWriteUi || !canWriteCfg) return false;

    patchSliceWithDedicatedWriter(App, 'ui', ui, meta, KERNEL_UI_WRITE_OPTS);
    if (config && typeof config === 'object') {
      patchSliceWithDedicatedWriter(App, 'config', { ...config }, meta, KERNEL_CONFIG_WRITE_OPTS);
    }
    return true;
  };

  const touchStore = (meta: ActionMetaLike): boolean => {
    if (!hasDedicatedCanonicalPatchDispatch(App, {})) return false;
    touchMetaWithDedicatedWriter(App, meta, KERNEL_TOUCH_OPTS);
    return true;
  };

  const cloneKernelValue = (value: unknown, defaultValue?: unknown): unknown => {
    if (value == null || typeof value !== 'object') return value;
    const cloned = cloneViaPlatform(App, value, defaultValue);
    if (cloned !== value) return cloned;
    try {
      const serialized = JSON.stringify(value);
      if (typeof serialized === 'string') {
        const parsed: unknown = JSON.parse(serialized);
        const jsonCloned = cloneKernelJsonValue(parsed);
        if (typeof jsonCloned !== 'undefined') return jsonCloned;
      }
    } catch {
      // fall through to branch-level sanitization
    }
    const sanitized = cloneKernelJsonValue(value);
    if (typeof sanitized !== 'undefined') return sanitized;
    return defaultValue !== undefined ? defaultValue : Array.isArray(value) ? [] : {};
  };

  const reportKernelError = (error: unknown, ctx: unknown): boolean => {
    try {
      reportError(App, error, ctx);
      return true;
    } catch {
      return false;
    }
  };

  const reportNonFatal = (
    op: string,
    error: unknown,
    opts?: { throttleMs?: number; failFast?: boolean }
  ): void => {
    const throttleMs = opts && typeof opts.throttleMs === 'number' ? Math.max(0, opts.throttleMs) : 5000;
    try {
      const now = Date.now();
      const last = kernelCatchTs[op] || 0;
      if (throttleMs > 0 && now - last < throttleMs) {
        if (opts && opts.failFast && kernelShouldFailFast(App)) throw error;
        return;
      }
      kernelCatchTs[op] = now;
    } catch {
      // ignore throttle bookkeeping
    }
    reportError(App, error, { where: 'kernel/kernel', op, nonFatal: true });
    if (opts && opts.failFast && kernelShouldFailFast(App)) throw error;
  };

  const readCornerCfgFromStoreConfig = (cfg: unknown): UnknownRecord => {
    const cornerConfig = readCornerConfigurationFromConfigSnapshot(cfg);
    return asRecord(cornerConfig, {});
  };

  const readLowerCornerCfgFromCornerCfg = (cornerCfg: UnknownRecord): UnknownRecord | null => {
    const value = cornerCfg['stackSplitLower'];
    return asRecordOrNull(value);
  };

  return {
    setStoreConfigPatch,
    setStoreUiSnapshot,
    touchStore,
    cloneKernelValue,
    reportKernelError,
    reportNonFatal,
    readCornerCfgFromStoreConfig,
    readLowerCornerCfgFromCornerCfg,
  };
}
