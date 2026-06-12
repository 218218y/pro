import type { ActionMetaLike, AppContainer, UnknownRecord } from '../../../../../types';

import {
  createStructureRecomputeOpts as createStructureRecomputeOptsFromBatch,
  runStructurePatchRecomputeBatch,
  type StructureUiOverrideMerge,
} from './structure_tab_recompute_batch.js';
import { mergeUiOverride } from './structure_tab_library_helpers.js';
import type { StructureRecomputeOpts } from './structure_tab_core_contracts.js';

export function createStructureRecomputeOpts(): StructureRecomputeOpts {
  return createStructureRecomputeOptsFromBatch();
}

export function applyStructureTemplateRecomputeBatch<TPatch extends UnknownRecord = UnknownRecord>(args: {
  app: AppContainer;
  source: string;
  meta: ActionMetaLike;
  uiPatch?: TPatch | null;
  statePatch?: UnknownRecord | null;
  mutate?: () => void;
}): void {
  runStructurePatchRecomputeBatch({
    ...args,
    uiPatch: (args.uiPatch || {}) as TPatch,
    recomputeOpts: createStructureRecomputeOpts(),
    mergeUiOverride: mergeUiOverride as StructureUiOverrideMerge,
  });
}
