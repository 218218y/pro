import type {
  ActionMetaLike,
  AppContainer,
  MetaActionsNamespaceLike,
  UnknownRecord,
} from '../../../../../types';
import {
  createStructuralModulesRecomputeOpts,
  patchViaActions,
  runAppStructuralModulesRecompute,
} from '../../../services/api.js';
import { getUiSnapshot, runHistoryBatch } from '../actions/store_actions.js';
import { structureTabReportNonFatal } from './structure_tab_shared.js';

export type CornerPatch = {
  cornerMode?: boolean;
  cornerSide?: 'left' | 'right';
  cornerWidth?: number;
  cornerDoors?: number;
  cornerHeight?: number;
  cornerDepth?: number;
};

export type PreChestStateLike = UnknownRecord & {
  doors?: unknown;
  width?: unknown;
  height?: unknown;
  depth?: unknown;
  isManual?: unknown;
  base?: unknown;
};

export type MutableRefLike<T> = { current: T };

export const STRUCTURE_RECOMPUTE_OPTS = createStructuralModulesRecomputeOpts();

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function withImmediate(meta: ActionMetaLike): ActionMetaLike {
  return { ...meta, immediate: true };
}

export function readPreChestState(value: unknown): PreChestStateLike | null {
  return isRecord(value) ? value : null;
}

function mergeUiOverride(
  baseUi: UnknownRecord | null | undefined,
  uiPatch: UnknownRecord | null | undefined
): UnknownRecord | null {
  if (!uiPatch || typeof uiPatch !== 'object')
    return baseUi && typeof baseUi === 'object' ? { ...baseUi } : null;
  const base = baseUi && typeof baseUi === 'object' ? baseUi : {};
  const patch = uiPatch;
  const out: UnknownRecord = { ...base, ...patch };
  const baseRaw = base.raw && typeof base.raw === 'object' ? (base.raw as UnknownRecord) : null;
  const patchRaw = patch.raw && typeof patch.raw === 'object' ? (patch.raw as UnknownRecord) : null;
  if (baseRaw || patchRaw) out.raw = { ...(baseRaw || {}), ...(patchRaw || {}) };
  return out;
}

export function commitStructureStatePatchWithRecompute(args: {
  app: AppContainer;
  source: string;
  meta: ActionMetaLike;
  uiPatch?: UnknownRecord | null;
  statePatch?: UnknownRecord | null;
  mutate?: () => void;
  errorLine: string;
}): void {
  const { app, source, meta, uiPatch, statePatch, mutate, errorLine } = args;
  const actionMeta = { ...meta, immediate: true, noBuild: true };
  try {
    runHistoryBatch(
      app,
      () => {
        const rootPatch = statePatch && typeof statePatch === 'object' ? { ...statePatch } : null;
        const applied = rootPatch ? patchViaActions(app, rootPatch, actionMeta) : false;
        if (!applied && typeof mutate === 'function') mutate();
        runAppStructuralModulesRecompute(
          app,
          mergeUiOverride(getUiSnapshot(app) as UnknownRecord | null | undefined, uiPatch),
          null,
          { source, force: true },
          STRUCTURE_RECOMPUTE_OPTS,
          {}
        );
      },
      actionMeta
    );
  } catch (__wpErr) {
    structureTabReportNonFatal(app, errorLine, __wpErr);
  }
}

export function recomputeStructureFromUi(
  app: AppContainer,
  rawPatch: UnknownRecord | null,
  meta: ActionMetaLike,
  errorLine: string
): void {
  try {
    runAppStructuralModulesRecompute(app, rawPatch, meta, null, STRUCTURE_RECOMPUTE_OPTS, {});
  } catch (__wpErr) {
    structureTabReportNonFatal(app, errorLine, __wpErr);
  }
}

export type StructureMetaAccess = Pick<
  MetaActionsNamespaceLike,
  'uiOnlyImmediate' | 'noBuild' | 'noHistory' | 'noHistoryImmediate'
>;
