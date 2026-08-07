import type { ActionMetaLike, AppContainer, ModuleConfigLike } from '../../../types';
import type { CanvasPickingClickModuleRefs, ModuleKey } from './canvas_picking_click_contracts.js';
import { __wp_reportPickingIssue } from './canvas_picking_core_support_errors.js';
import {
  commitCanvasModuleStructuralPatch,
  readCanvasModuleConfigForStack,
} from './canvas_picking_structural_commit.js';

export function createCanvasPickingClickModuleRefs(args: {
  App: AppContainer;
  foundModuleIndex: ModuleKey | null;
  foundModuleStack: 'top' | 'bottom';
}): CanvasPickingClickModuleRefs {
  const { App, foundModuleIndex, foundModuleStack } = args;
  const __activeModuleKey = foundModuleIndex;
  const __activeStack = foundModuleStack === 'bottom' ? 'bottom' : 'top';
  const __isBottomStack = __activeStack === 'bottom';

  const __ensureConfigRefForKey = (mk: ModuleKey | 'corner' | null): ModuleConfigLike | null => {
    if (mk == null) return null;
    return readCanvasModuleConfigForStack({
      App,
      stack: __activeStack,
      moduleKey: mk,
      op: 'clickModuleRefs.ensure',
    });
  };

  const __patchConfigForKey = (
    mk: ModuleKey | 'corner' | null,
    patchFn: (cfg: ModuleConfigLike) => void,
    meta: ActionMetaLike
  ): boolean => {
    if (mk == null) {
      __wp_reportPickingIssue(
        App,
        new Error('[WardrobePro][canvasPicking] structural click has no active module key.'),
        { where: 'canvasPicking.structuralCommit', op: 'clickModuleRefs.missingModuleKey', throttleMs: 1000 }
      );
      return false;
    }
    return commitCanvasModuleStructuralPatch({
      App,
      stack: __activeStack,
      moduleKey: mk,
      mutate: patchFn,
      meta,
      op: 'clickModuleRefs.patch',
    }).committed;
  };

  const __getActiveConfigRef = () => __ensureConfigRefForKey(__activeModuleKey);

  const __ensureCornerCellConfigRef = (cellIdx: number): ModuleConfigLike | null =>
    readCanvasModuleConfigForStack({
      App,
      stack: 'top',
      moduleKey: `corner:${cellIdx}`,
      op: 'clickModuleRefs.cornerCell',
    });

  return {
    __activeModuleKey,
    __activeStack,
    __isBottomStack,
    __ensureConfigRefForKey,
    __patchConfigForKey,
    __getActiveConfigRef,
    __ensureCornerCellConfigRef,
  };
}
