import type { AppContainer, ModuleConfigLike } from '../../../types';
import { resolveExternalDrawerFitFromBounds } from '../../shared/wardrobe_construction_validation_shared.js';
import {
  HEX_CELL_DRAWER_ADD_BLOCKED_MESSAGE,
  shouldBlockDrawerBuildInHexCell,
} from '../features/hex_cell/index.js';
import { getInternalGridMap } from '../runtime/cache_access.js';
import { __wp_toast, __wp_ui } from './canvas_picking_core_helpers.js';
import { createCanvasPickingConfigStructuralPatchMeta } from './canvas_picking_config_patch_meta.js';
import { tryRemoveSketchExternalDrawerByDirectHit } from './canvas_picking_drawer_cross_family.js';
import type { ModuleKey, PatchConfigForKeyFn } from './canvas_picking_drawer_mode_flow_shared.js';
import { asInternalGridInfo } from './canvas_picking_drawer_mode_flow_shared.js';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import { tryCommitSketchBoxRegularExternalDrawersHover } from './canvas_picking_regular_ext_drawers_free_box.js';
import { blockRemovableSideContentBuildIfModuleSideMissing } from './canvas_picking_removable_part_remove_constraints.js';

export function tryHandleExternalDrawerModeClick(args: {
  App: AppContainer;
  foundModuleIndex: ModuleKey | 'corner' | null;
  activeModuleKey: ModuleKey | 'corner' | null;
  isBottomStack?: boolean;
  isExtDrawerEditMode: boolean;
  patchConfigForKey: PatchConfigForKeyFn;
  intersects?: RaycastHitLike[];
}): boolean {
  const { App, foundModuleIndex, activeModuleKey, isExtDrawerEditMode, patchConfigForKey } = args;
  if (!isExtDrawerEditMode) return false;

  if (
    tryRemoveSketchExternalDrawerByDirectHit({
      App,
      intersects: args.intersects || [],
      activeModuleKey,
      patchConfigForKey,
      source: 'extDrawers.removeSketchExternalByHit',
    })
  ) {
    return true;
  }

  if (tryCommitSketchBoxRegularExternalDrawersHover(App)) return true;
  if (foundModuleIndex === null) return false;

  const targetModuleKey = activeModuleKey ?? foundModuleIndex;
  patchConfigForKey(
    activeModuleKey,
    (cfg: ModuleConfigLike) => {
      const ui = __wp_ui(App);
      const drawerType =
        ui && typeof ui.currentExtDrawerType === 'string' ? ui.currentExtDrawerType : 'regular';
      const drawerCount = ui && typeof ui.currentExtDrawerCount === 'number' ? ui.currentExtDrawerCount : 1;

      if (drawerType === 'shoe') {
        const targetHasShoe = !cfg.hasShoeDrawer;
        if (
          targetHasShoe &&
          blockRemovableSideContentBuildIfModuleSideMissing({
            App,
            moduleKey: targetModuleKey,
            isBottomStack: !!args.isBottomStack,
          })
        )
          return;
        if (targetHasShoe && blockDrawerBuildInHexCell(App, cfg)) return;
        if (
          targetHasShoe &&
          !canApplyExternalDrawerChoice({
            App,
            moduleKey: targetModuleKey,
            isBottomStack: !!args.isBottomStack,
            hasShoe: targetHasShoe,
            regCount: cfg.extDrawersCount || 0,
            drawerType,
          })
        ) {
          return;
        }
        cfg.hasShoeDrawer = targetHasShoe;
      } else {
        const currentCount = cfg.extDrawersCount || 0;
        const target = drawerCount >= 1 && drawerCount <= 5 ? drawerCount : 1;
        const nextCount = currentCount === target ? 0 : target;
        if (
          nextCount > 0 &&
          blockRemovableSideContentBuildIfModuleSideMissing({
            App,
            moduleKey: targetModuleKey,
            isBottomStack: !!args.isBottomStack,
          })
        )
          return;
        if (nextCount > 0 && blockDrawerBuildInHexCell(App, cfg)) return;
        if (
          nextCount > 0 &&
          !canApplyExternalDrawerChoice({
            App,
            moduleKey: targetModuleKey,
            isBottomStack: !!args.isBottomStack,
            hasShoe: !!cfg.hasShoeDrawer,
            regCount: nextCount,
            drawerType,
          })
        ) {
          return;
        }
        cfg.extDrawersCount = nextCount;
      }
    },
    createCanvasPickingConfigStructuralPatchMeta('extDrawers.toggle')
  );

  return true;
}

function blockDrawerBuildInHexCell(App: AppContainer, cfg: ModuleConfigLike): boolean {
  if (!shouldBlockDrawerBuildInHexCell(cfg)) return false;
  __wp_toast(App, HEX_CELL_DRAWER_ADD_BLOCKED_MESSAGE, 'error');
  return true;
}

function readFinite(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function canApplyExternalDrawerChoice(args: {
  App: AppContainer;
  moduleKey: ModuleKey | 'corner' | null;
  isBottomStack: boolean;
  hasShoe: boolean;
  regCount: number;
  drawerType: string;
}): boolean {
  const { App, moduleKey } = args;
  if (moduleKey == null) return true;

  const gridMap = getInternalGridMap(App, args.isBottomStack);
  const info = asInternalGridInfo(gridMap[moduleKey]);
  const effectiveTopY = readFinite(info?.effectiveTopY);
  const woodThick = readFinite(info?.woodThick);
  if (effectiveTopY == null || woodThick == null) return true;

  const fit = resolveExternalDrawerFitFromBounds({
    startY: readFinite(info?.startY) ?? 0,
    effectiveTopY,
    woodThick,
    hasShoe: args.hasShoe,
    regCount: args.regCount,
  });
  if (fit.fitsRequested) return true;

  toastExternalDrawerFitFailure(App, args.drawerType, fit.requestedRegCount, fit.maxRegularDrawers);
  return false;
}

function toastExternalDrawerFitFailure(
  App: AppContainer,
  drawerType: string,
  requestedRegCount: number,
  maxRegularDrawers: number
): void {
  if (drawerType === 'shoe') {
    __wp_toast(App, 'אין מספיק מקום בארון זה למגירת נעליים עם המגירות הקיימות.', 'error');
    return;
  }

  const suffix =
    maxRegularDrawers > 0
      ? ` ניתן להכניס כאן עד ${maxRegularDrawers} מגירות.`
      : ' אין כאן מקום למגירה חיצונית בגובה הנוכחי.';
  __wp_toast(App, `אין מקום בארון זה ל-${requestedRegCount} מגירות חיצוניות.${suffix}`, 'error');
}
