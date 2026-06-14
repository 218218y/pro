import type { AppContainer } from '../../../types';
import type { HitObjectLike, RaycastHitLike } from './canvas_picking_engine.js';
import type { ModuleKey, PatchConfigForKeyFn } from './canvas_picking_drawer_mode_flow_shared.js';
import { tryHandleExternalDrawerModeClick } from './canvas_picking_drawer_mode_flow_external.js';
import { tryHandleDrawerDividerModeClick } from './canvas_picking_drawer_mode_flow_divider.js';

export type CanvasDrawerModeClickArgs = {
  App: AppContainer;
  foundModuleIndex: ModuleKey | 'corner' | null;
  __activeModuleKey: ModuleKey | 'corner' | null;
  __isBottomStack: boolean;
  __isManualLayoutMode: boolean;
  __isIntDrawerEditMode: boolean;
  __isExtDrawerEditMode: boolean;
  __isDividerEditMode: boolean;
  foundDrawerId: string | null;
  foundPartId: string | null;
  primaryHitObject: HitObjectLike | null;
  moduleHitY: number | null;
  intersects: RaycastHitLike[];
  __patchConfigForKey: PatchConfigForKeyFn;
};

export function tryHandleCanvasDrawerModeClick(args: CanvasDrawerModeClickArgs): boolean {
  if (
    tryHandleExternalDrawerModeClick({
      App: args.App,
      foundModuleIndex: args.foundModuleIndex,
      activeModuleKey: args.__activeModuleKey,
      isBottomStack: args.__isBottomStack,
      isExtDrawerEditMode: args.__isExtDrawerEditMode,
      patchConfigForKey: args.__patchConfigForKey,
      intersects: args.intersects,
    })
  ) {
    return true;
  }

  return tryHandleDrawerDividerModeClick({
    App: args.App,
    isDividerEditMode: args.__isDividerEditMode,
    foundDrawerId: args.foundDrawerId,
    foundPartId: args.foundPartId,
    primaryHitObject: args.primaryHitObject,
  });
}
