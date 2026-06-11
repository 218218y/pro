import type {
  ActionMetaLike,
  UnknownRecord,
  CornerActionsLike,
  ModulesActionsLike,
  ModuleConfigLike,
  ModuleConfigPatchLike,
} from '../../../types';

import { asRecord, isRecord } from '../runtime/record.js';
import {
  ensureModulesConfigurationItemFromConfigSnapshot,
  ensureModulesConfigurationItemFromListSnapshot,
  ensureModulesConfigurationListAtForPatch,
} from '../features/modules_configuration/modules_config_api.js';
import {
  cloneCornerConfigurationSnapshot,
  cloneCornerConfigurationForLowerSnapshot,
  ensureCornerConfigurationCellForStack,
  ensureCornerConfigurationForStack,
  readCornerConfigurationSnapshotForStack,
  readCornerConfigurationCellForStack,
  resolveTopCornerCellDefaultLayoutFromUi,
} from '../features/modules_configuration/corner_cells_api.js';

export type ModuleStackName = 'top' | 'bottom';
export type ModulesBucketKey = 'modulesConfiguration' | 'stackSplitLowerModulesConfiguration';
export type ModuleConfigPatchFn = (draft: ModuleConfigLike, base: ModuleConfigLike) => unknown;
export type CornerConfigPatchFn = (draft: UnknownRecord, base: UnknownRecord) => unknown;
export type ModulePatchLike = ModuleConfigPatchLike | ModuleConfigPatchFn;
export type CornerPatchLike = UnknownRecord | CornerConfigPatchFn;
export type SetCfgScalarFn = (key: string, valueOrFn: unknown, meta?: ActionMetaLike) => unknown;
export type MergeMetaFn = (
  meta: ActionMetaLike | UnknownRecord | null | undefined,
  defaults: ActionMetaLike,
  sourceFallback: string
) => ActionMetaLike;
export type NormMetaFn = (
  meta: ActionMetaLike | UnknownRecord | null | undefined,
  source: string
) => ActionMetaLike;
export type SafeCallFn = (fn: () => unknown) => unknown;
export type EnsureAtFn = (idx: number) => ModuleConfigLike | null;
export type EnsureRootFn = () => UnknownRecord | null;
export type PatchAtFn = (idx: number, patch: ModulePatchLike, meta: ActionMetaLike) => unknown;
export type PatchRootFn = (patch: CornerPatchLike, meta: ActionMetaLike) => unknown;

export interface StateApiStackRouterContext {
  modulesNs: ModulesActionsLike;
  cornerNs: CornerActionsLike;
  getSetCfgScalar: () => SetCfgScalarFn | null;
  mergeMeta: MergeMetaFn;
  normMeta: NormMetaFn;
  readCfgSnapshot: () => UnknownRecord;
  readUiSnapshot: () => UnknownRecord;
  callSetCfgScalar: (key: string, valueOrFn: unknown, meta?: ActionMetaLike) => unknown;
  shallowCloneObj: (v: unknown) => UnknownRecord;
  safeCall: SafeCallFn;
}

export function normalizeModuleStack(stack: unknown): ModuleStackName {
  return String(stack || '').toLowerCase() === 'bottom' ? 'bottom' : 'top';
}

export function parseCornerCellIndex(moduleKey: unknown): number | null {
  if (typeof moduleKey !== 'string') return null;
  const match = /^corner:(\d+)$/.exec(moduleKey.trim());
  if (!match) return null;
  const index = Number(match[1]);
  return Number.isFinite(index) && index >= 0 ? index : null;
}

export function cloneRecord(ctx: StateApiStackRouterContext, value: unknown): UnknownRecord {
  return isRecord(value) ? ctx.shallowCloneObj(value) : {};
}

export function seedLowerCornerSnapshotForSplit(splitOnNow: boolean, base: UnknownRecord): UnknownRecord {
  if (!splitOnNow || isRecord(base.stackSplitLower)) return base;
  return Object.assign({}, base, {
    stackSplitLower: cloneCornerConfigurationForLowerSnapshot(base),
  });
}

export function asModuleConfig(value: unknown): ModuleConfigLike | null {
  return asRecord<ModuleConfigLike>(value);
}

export function cloneRecordList(ctx: StateApiStackRouterContext, arr: unknown): UnknownRecord[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((entry: unknown) => cloneRecord(ctx, entry));
}

export function readListCell(
  ctx: StateApiStackRouterContext,
  arr: unknown,
  idx: number
): UnknownRecord | null {
  if (!Array.isArray(arr) || idx < 0 || idx >= arr.length) return null;
  return isRecord(arr[idx]) ? ctx.shallowCloneObj(arr[idx]) : null;
}

export function readCornerCfg(ctx: StateApiStackRouterContext): UnknownRecord {
  const cfg = ctx.readCfgSnapshot();
  return isRecord(cfg.cornerConfiguration) ? cloneCornerConfigurationSnapshot(cfg.cornerConfiguration) : {};
}

export function readLowerCornerCfg(ctx: StateApiStackRouterContext): UnknownRecord {
  const cfg = ctx.readCfgSnapshot();
  return asRecord(readCornerConfigurationSnapshotForStack(cfg, 'bottom'), {}) || {};
}

export function quietMeta(ctx: StateApiStackRouterContext, source: string): ActionMetaLike {
  return ctx.mergeMeta(undefined, { silent: true, coalesce: true }, source);
}

export function topCornerCellNormalizeOptions(ctx: StateApiStackRouterContext) {
  return {
    defaultLayout: (index: number) => resolveTopCornerCellDefaultLayoutFromUi(ctx.readUiSnapshot(), index),
  };
}

export function ensureListCellDirect(
  ctx: StateApiStackRouterContext,
  bucketKey: ModulesBucketKey,
  index: number
): UnknownRecord | null {
  const setCfgScalar = ctx.getSetCfgScalar();
  if (!setCfgScalar) {
    const cfg = ctx.readCfgSnapshot();
    const ensured = ensureModulesConfigurationListAtForPatch(
      bucketKey,
      cfg[bucketKey],
      cfg[bucketKey],
      index,
      {
        uiSnapshot: ctx.readUiSnapshot(),
        cfgSnapshot: cfg,
      }
    );
    return asRecord(
      ensureModulesConfigurationItemFromListSnapshot(bucketKey, ensured, index, {
        uiSnapshot: ctx.readUiSnapshot(),
        cfgSnapshot: cfg,
      })
    );
  }

  setCfgScalar(
    bucketKey,
    function ensureModulesListCell(prev: unknown) {
      return ensureModulesConfigurationListAtForPatch(bucketKey, prev, prev, index, {
        uiSnapshot: ctx.readUiSnapshot(),
        cfgSnapshot: ctx.readCfgSnapshot(),
      });
    },
    quietMeta(ctx, 'actions:modules:ensureForStack')
  );

  const cfg = ctx.readCfgSnapshot();
  return asRecord(
    ensureModulesConfigurationItemFromConfigSnapshot(cfg, bucketKey, index, {
      uiSnapshot: ctx.readUiSnapshot(),
      cfgSnapshot: cfg,
    })
  );
}

export function ensureCornerRootDirect(
  ctx: StateApiStackRouterContext,
  stack: ModuleStackName
): UnknownRecord {
  const setCfgScalar = ctx.getSetCfgScalar();
  if (!setCfgScalar) {
    const cfg = ctx.readCfgSnapshot();
    const ensured = ensureCornerConfigurationForStack(
      cfg.cornerConfiguration,
      cfg.cornerConfiguration,
      stack
    );
    return stack === 'bottom'
      ? asRecord(readCornerConfigurationSnapshotForStack(ensured, 'bottom'), {}) || {}
      : asRecord(cloneCornerConfigurationSnapshot(ensured), {}) || {};
  }

  setCfgScalar(
    'cornerConfiguration',
    function ensureCornerRoot(prev: unknown) {
      const base = seedLowerCornerSnapshotForSplit(
        !!ctx.readUiSnapshot().stackSplitEnabled,
        cloneRecord(ctx, prev)
      );
      return ensureCornerConfigurationForStack(base, prev, stack);
    },
    quietMeta(ctx, 'actions:corner:ensureForStack')
  );

  return stack === 'bottom' ? readLowerCornerCfg(ctx) : readCornerCfg(ctx);
}

export function ensureCornerCellDirect(
  ctx: StateApiStackRouterContext,
  stack: ModuleStackName,
  idx: number
): UnknownRecord | null {
  const setCfgScalar = ctx.getSetCfgScalar();
  if (!setCfgScalar) {
    const cfg = ctx.readCfgSnapshot();
    const ensured = ensureCornerConfigurationCellForStack(
      cfg.cornerConfiguration,
      cfg.cornerConfiguration,
      stack,
      idx,
      stack === 'top' ? topCornerCellNormalizeOptions(ctx) : undefined
    );
    return asRecord(readCornerConfigurationCellForStack(ensured, stack, idx));
  }

  setCfgScalar(
    'cornerConfiguration',
    function ensureCornerCell(prev: unknown) {
      const base = seedLowerCornerSnapshotForSplit(
        !!ctx.readUiSnapshot().stackSplitEnabled,
        cloneRecord(ctx, prev)
      );
      return ensureCornerConfigurationCellForStack(
        base,
        prev,
        stack,
        idx,
        stack === 'top' ? topCornerCellNormalizeOptions(ctx) : undefined
      );
    },
    quietMeta(ctx, 'actions:corner:ensureCellForStack')
  );

  const cfg = ctx.readCfgSnapshot();
  return asRecord(readCornerConfigurationCellForStack(cfg, stack, idx));
}

export function isCallable<T>(value: unknown): value is T {
  return typeof value === 'function';
}

export function asCallable<T>(value: unknown): T | null {
  return isCallable<T>(value) ? value : null;
}

export function asEnsureAt(value: unknown): EnsureAtFn | null {
  return asCallable<EnsureAtFn>(value);
}

export function asEnsureRoot(value: unknown): EnsureRootFn | null {
  return asCallable<EnsureRootFn>(value);
}

export function asPatchAt(value: unknown): PatchAtFn | null {
  return asCallable<PatchAtFn>(value);
}

export function asPatchRoot(value: unknown): PatchRootFn | null {
  return asCallable<PatchRootFn>(value);
}

export function asModulePatchLike(value: unknown): ModulePatchLike {
  if (isCallable<ModuleConfigPatchFn>(value)) return value;
  return asRecord<ModuleConfigPatchLike>(value) ?? {};
}

export function asCornerPatchLike(value: unknown): CornerPatchLike {
  if (isCallable<CornerConfigPatchFn>(value)) return value;
  return asRecord(value) ?? {};
}

export function isDelegatingStackPatchFn(fn: unknown): boolean {
  return typeof fn === 'function' && Reflect.get(fn, '__wp_delegatesStackPatch') === true;
}

export function readModuleIndex(moduleKey: unknown): number | null {
  const parsed = parseInt(String(moduleKey ?? ''), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
}

export function readModulesBucketKey(stack: ModuleStackName): ModulesBucketKey {
  return stack === 'bottom' ? 'stackSplitLowerModulesConfiguration' : 'modulesConfiguration';
}
