import type {
  ActionMetaLike,
  AppContainer,
  MetaActionsNamespaceLike,
  UnknownRecord,
} from '../../../../../types';
import {
  runStructurePatchRecomputeBatch,
  runStructureRecomputeFromUi,
  STRUCTURE_RECOMPUTE_OPTS,
} from './structure_tab_recompute_batch.js';
import { structureTabReportNonFatal } from './structure_tab_shared.js';

export { STRUCTURE_RECOMPUTE_OPTS } from './structure_tab_recompute_batch.js';

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

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function withImmediate(meta: ActionMetaLike): ActionMetaLike {
  return { ...meta, immediate: true };
}

export function readPreChestState(value: unknown): PreChestStateLike | null {
  return isRecord(value) ? value : null;
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
    runStructurePatchRecomputeBatch({
      app,
      source,
      meta: actionMeta,
      uiPatch,
      statePatch,
      mutate,
      recomputeOpts: STRUCTURE_RECOMPUTE_OPTS,
    });
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
    runStructureRecomputeFromUi(app, rawPatch, meta, STRUCTURE_RECOMPUTE_OPTS);
  } catch (__wpErr) {
    structureTabReportNonFatal(app, errorLine, __wpErr);
  }
}

export type StructureMetaAccess = Pick<
  MetaActionsNamespaceLike,
  'uiOnlyImmediate' | 'noBuild' | 'noHistory' | 'noHistoryImmediate'
>;
