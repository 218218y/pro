import type { ActionMetaLike, AppContainer, UnknownRecord } from '../../../../../types';

import { getUiSnapshot, runHistoryBatch } from '../actions/store_actions.js';
import {
  createStructuralModulesRecomputeOpts,
  patchViaActions,
  runAppStructuralModulesRecompute,
} from '../../../services/api.js';
import { mergeUiOverride } from './structure_tab_library_helpers.js';
import type { StructureRecomputeOpts } from './structure_tab_core_contracts.js';

export function createStructureRecomputeOpts(): StructureRecomputeOpts {
  return createStructuralModulesRecomputeOpts() as StructureRecomputeOpts;
}

export function applyStructureTemplateRecomputeBatch<TPatch extends UnknownRecord = UnknownRecord>(args: {
  app: AppContainer;
  source: string;
  meta: ActionMetaLike;
  uiPatch?: TPatch | null;
  statePatch?: UnknownRecord | null;
  mutate?: () => void;
}): void {
  const { app, source, meta, uiPatch, statePatch, mutate } = args;
  runHistoryBatch(
    app,
    () => {
      const rootPatch = statePatch && typeof statePatch === 'object' ? { ...statePatch } : null;
      const applied = rootPatch ? patchViaActions(app, rootPatch, meta) : false;
      if (!applied && typeof mutate === 'function') {
        mutate();
      }

      const override = mergeUiOverride(getUiSnapshot(app), uiPatch || {});
      runAppStructuralModulesRecompute(
        app,
        override,
        null,
        { source, force: true },
        createStructureRecomputeOpts(),
        {}
      );
    },
    meta
  );
}
