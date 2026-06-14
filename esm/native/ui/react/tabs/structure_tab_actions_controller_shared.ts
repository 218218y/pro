import type { ActionMetaLike, AppContainer, UnknownRecord } from '../../../../../types';
import {
  runStructurePatchRecomputeBatch,
  runStructureRecomputeFromUi,
  STRUCTURE_RECOMPUTE_OPTS,
} from './structure_tab_recompute_batch.js';
import { structureTabReportNonFatal } from './structure_tab_shared.js';
import { createStructureTabRecomputeWriteMeta } from './structure_tab_meta.js';

export { withImmediate } from './structure_tab_meta.js';
export type { StructureMetaAccess } from './structure_tab_meta.js';

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
  const actionMeta = createStructureTabRecomputeWriteMeta(source, meta);
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
