import type {
  ActionMetaLike,
  AppContainer,
  StateSnapshotTransactionHandleLike,
  UnknownRecord,
} from '../../../../../types';

import {
  createStructureRecomputeOpts as createStructureRecomputeOptsFromBatch,
  runStructurePatchRecomputeBatch,
  runStructureSnapshotRecomputeTransaction,
  type StructureRecomputeBuildTiming,
  type StructureUiOverrideMerge,
} from './structure_tab_recompute_batch.js';
import { mergeUiOverride } from './structure_tab_library_helpers.js';
import type { StructureRecomputeOpts } from './structure_tab_core_contracts.js';

export type { StructureRecomputeBuildTiming } from './structure_tab_recompute_batch.js';

export function createStructureRecomputeOpts(): StructureRecomputeOpts {
  return createStructureRecomputeOptsFromBatch();
}

export type ApplyStructureTemplateRecomputeBatchArgs<TPatch extends UnknownRecord = UnknownRecord> = {
  app: AppContainer;
  source: string;
  meta: ActionMetaLike;
  uiPatch?: TPatch | null;
  statePatch?: UnknownRecord | null;
  mutate?: () => void;
  buildTiming?: StructureRecomputeBuildTiming;
  forceBuild?: boolean;
};

export type ApplyStructureTemplateSnapshotRecomputeTransactionArgs<
  TPatch extends UnknownRecord = UnknownRecord,
> = {
  app: AppContainer;
  source: string;
  meta: ActionMetaLike;
  uiPatch: TPatch;
  prepareTransaction: () => StateSnapshotTransactionHandleLike;
  buildTiming?: StructureRecomputeBuildTiming;
  forceBuild?: boolean;
};

export function applyStructureTemplateRecomputeBatch<TPatch extends UnknownRecord = UnknownRecord>(
  args: ApplyStructureTemplateRecomputeBatchArgs<TPatch>
): void {
  runStructurePatchRecomputeBatch({
    ...args,
    uiPatch: (args.uiPatch || {}) as TPatch,
    recomputeOpts: createStructureRecomputeOpts(),
    mergeUiOverride: mergeUiOverride as StructureUiOverrideMerge,
  });
}

export function applyStructureTemplateSnapshotRecomputeTransaction<
  TPatch extends UnknownRecord = UnknownRecord,
>(args: ApplyStructureTemplateSnapshotRecomputeTransactionArgs<TPatch>): void {
  runStructureSnapshotRecomputeTransaction({
    ...args,
    recomputeOpts: createStructureRecomputeOpts(),
    mergeUiOverride: mergeUiOverride as StructureUiOverrideMerge,
  });
}
