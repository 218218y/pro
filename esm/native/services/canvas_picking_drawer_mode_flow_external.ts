import type { AppContainer, ModuleConfigLike } from '../../../types';
import { __wp_ui } from './canvas_picking_core_helpers.js';
import {
  findDirectCrossDrawerHitInIntersects,
  removeSketchExternalDrawerFromConfig,
  sameModuleKey,
} from './canvas_picking_drawer_cross_family.js';
import type { ModuleKey, PatchConfigForKeyFn } from './canvas_picking_drawer_mode_flow_shared.js';
import type { RaycastHitLike } from './canvas_picking_engine.js';

export function tryHandleExternalDrawerModeClick(args: {
  App: AppContainer;
  foundModuleIndex: ModuleKey | 'corner' | null;
  activeModuleKey: ModuleKey | 'corner' | null;
  isExtDrawerEditMode: boolean;
  patchConfigForKey: PatchConfigForKeyFn;
  intersects?: RaycastHitLike[];
}): boolean {
  const { App, foundModuleIndex, activeModuleKey, isExtDrawerEditMode, patchConfigForKey } = args;
  if (!isExtDrawerEditMode || foundModuleIndex === null) return false;

  const sketchHit = findDirectCrossDrawerHitInIntersects(App, args.intersects || [], 'sketch_external');
  if (sketchHit && (!sketchHit.moduleIndex || sameModuleKey(sketchHit.moduleIndex, activeModuleKey))) {
    patchConfigForKey(
      activeModuleKey,
      (cfg: ModuleConfigLike) => {
        removeSketchExternalDrawerFromConfig(
          cfg,
          sketchHit.sketchExtDrawerId,
          sketchHit.sketchBoxId || undefined,
          sketchHit.partId
        );
      },
      { source: 'extDrawers.removeSketchExternalByHit', immediate: true }
    );
    return true;
  }

  patchConfigForKey(
    activeModuleKey,
    (cfg: ModuleConfigLike) => {
      const ui = __wp_ui(App);
      const drawerType =
        ui && typeof ui.currentExtDrawerType === 'string' ? ui.currentExtDrawerType : 'regular';
      const drawerCount = ui && typeof ui.currentExtDrawerCount === 'number' ? ui.currentExtDrawerCount : 1;

      if (drawerType === 'shoe') {
        cfg.hasShoeDrawer = !cfg.hasShoeDrawer;
      } else {
        const currentCount = cfg.extDrawersCount || 0;
        const target = drawerCount >= 1 && drawerCount <= 5 ? drawerCount : 1;
        cfg.extDrawersCount = currentCount === target ? 0 : target;
      }
    },
    { source: 'extDrawers.toggle', immediate: true }
  );

  return true;
}
