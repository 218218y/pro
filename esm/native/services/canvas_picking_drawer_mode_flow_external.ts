import type { AppContainer, ModuleConfigLike } from '../../../types';
import {
  SKETCH_EXTERNAL_DRAWER_COUNT_MAX,
  SKETCH_EXTERNAL_DRAWER_COUNT_MIN,
} from './canvas_picking_external_drawer_count_policy.js';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';
import { resolveExternalDrawerFitFromBounds } from '../../shared/wardrobe_construction_validation_shared.js';
import {
  HEX_CELL_DRAWER_ADD_BLOCKED_MESSAGE,
  shouldBlockDrawerBuildInHexCell,
} from '../features/hex_cell/index.js';
import { getInternalGridMap } from '../runtime/cache_access.js';
import { __wp_toast, __wp_ui } from './canvas_picking_core_helpers.js';
import {
  applyShoeDrawerBaseAutoNoneIfNeeded,
  restoreShoeDrawerBaseIfNoShoeDrawersRemain,
} from './canvas_picking_shoe_drawer_base_auto_none.js';
import { createCanvasPickingConfigStructuralPatchMeta } from './canvas_picking_config_patch_meta.js';
import {
  commitCrossDrawerRemovePlan,
  tryRemoveSketchExternalDrawerByDirectHit,
  tryRemoveSketchInternalDrawerByDirectHit,
  type CrossDrawerRemovePlan,
} from './canvas_picking_drawer_cross_family.js';
import type { ModuleKey, PatchConfigForKeyFn } from './canvas_picking_drawer_mode_flow_shared.js';
import { asInternalGridInfo } from './canvas_picking_drawer_mode_flow_shared.js';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import {
  extDrawerModeHoverMatchesModule,
  readRecentExtDrawerModeHover,
  type ExtDrawerModeHoverRecord,
} from './canvas_picking_ext_drawer_mode_hover.js';
import { tryCommitSketchBoxRegularExternalDrawersHover } from './canvas_picking_regular_ext_drawers_free_box.js';
import { blockRemovableSideContentBuildIfModuleSideMissing } from './canvas_picking_removable_part_remove_constraints.js';

function readString(value: unknown): string {
  return formatIdentityValue(readIdentityValue(value));
}

function readHoverRemoveId(hover: ExtDrawerModeHoverRecord | null): string {
  return readString(hover?.removeId);
}

function readHoverRemovePid(hover: ExtDrawerModeHoverRecord | null): string {
  return readString(hover?.removePid);
}

function createInternalDrawerPartId(moduleKey: ModuleKey | 'corner' | null, drawerId: string): string {
  return `div_int_sketch_${String(moduleKey)}_${drawerId}`;
}

function tryApplyExtDrawerModeHoverRemoval(args: {
  App: AppContainer;
  hover: ExtDrawerModeHoverRecord | null;
  activeModuleKey: ModuleKey | 'corner' | null;
  foundModuleIndex: ModuleKey | 'corner' | null;
  patchConfigForKey: PatchConfigForKeyFn;
}): boolean {
  const { hover } = args;
  if (!hover || hover.op !== 'remove') return false;
  const targetModuleKey = args.activeModuleKey ?? args.foundModuleIndex;
  if (targetModuleKey == null || !extDrawerModeHoverMatchesModule(hover, targetModuleKey)) return false;

  let plan: CrossDrawerRemovePlan | null = null;
  let source = '';

  if (hover.kind === 'drawers') {
    const removeId = readHoverRemoveId(hover);
    if (!removeId) return false;
    plan = {
      kind: 'remove-sketch-internal-drawer',
      moduleKey: targetModuleKey,
      drawerId: removeId,
      partId: createInternalDrawerPartId(targetModuleKey, removeId),
    };
    source = 'extDrawers.hoverRemoveSketchInternal';
  } else if (hover.kind === 'ext_drawers') {
    const removeId = readHoverRemoveId(hover);
    const removePid = readHoverRemovePid(hover);
    if (removeId) {
      plan = {
        kind: 'remove-sketch-external-drawer',
        moduleKey: targetModuleKey,
        target: { scope: 'module', drawerId: removeId },
      };
    } else if (removePid) {
      plan = {
        kind: 'remove-standard-external-drawer',
        moduleKey: targetModuleKey,
        partId: removePid,
      };
    } else {
      return false;
    }
    source = 'extDrawers.hoverRemoveSketchExternal';
  }

  if (!plan || !source) return false;
  const changed = commitCrossDrawerRemovePlan({
    plan,
    patchConfigForKey: args.patchConfigForKey,
    source,
  });
  if (!changed) return false;

  if (hover.kind === 'ext_drawers') {
    restoreShoeDrawerBaseIfNoShoeDrawersRemain(
      args.App,
      'extDrawers.hoverRemoveSketchExternal:autoBaseRestore'
    );
  }
  return true;
}

function shouldSkipExtDrawerModeDirectRemoval(args: {
  hover: ExtDrawerModeHoverRecord | null;
  activeModuleKey: ModuleKey | 'corner' | null;
  foundModuleIndex: ModuleKey | 'corner' | null;
}): boolean {
  const { hover } = args;
  if (!hover || hover.op !== 'add') return false;
  const targetModuleKey = args.activeModuleKey ?? args.foundModuleIndex;
  return extDrawerModeHoverMatchesModule(hover, targetModuleKey);
}

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

  const hover = readRecentExtDrawerModeHover(App);
  if (
    tryApplyExtDrawerModeHoverRemoval({
      App,
      hover,
      activeModuleKey,
      foundModuleIndex,
      patchConfigForKey,
    })
  ) {
    return true;
  }

  const skipDirectRemoval = shouldSkipExtDrawerModeDirectRemoval({
    hover,
    activeModuleKey,
    foundModuleIndex,
  });

  if (!skipDirectRemoval) {
    if (
      tryRemoveSketchExternalDrawerByDirectHit({
        App,
        intersects: args.intersects || [],
        activeModuleKey,
        patchConfigForKey,
        source: 'extDrawers.removeSketchExternalByHit',
      })
    ) {
      restoreShoeDrawerBaseIfNoShoeDrawersRemain(App, 'extDrawers.removeSketchExternalByHit:autoBaseRestore');
      return true;
    }

    if (
      tryRemoveSketchInternalDrawerByDirectHit({
        App,
        intersects: args.intersects || [],
        activeModuleKey,
        patchConfigForKey,
        source: 'extDrawers.removeSketchInternalByHit',
      })
    ) {
      return true;
    }
  }

  if (tryCommitSketchBoxRegularExternalDrawersHover(App)) return true;
  if (foundModuleIndex === null) return false;

  const targetModuleKey = activeModuleKey ?? foundModuleIndex;
  let addedShoeDrawer = false;
  let removedShoeDrawer = false;
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
        addedShoeDrawer = targetHasShoe;
        removedShoeDrawer = !targetHasShoe;
      } else {
        const currentCount = cfg.extDrawersCount || 0;
        const normalizedDrawerCount = Number.isFinite(drawerCount) ? Math.floor(drawerCount) : NaN;
        const target =
          normalizedDrawerCount >= SKETCH_EXTERNAL_DRAWER_COUNT_MIN &&
          normalizedDrawerCount <= SKETCH_EXTERNAL_DRAWER_COUNT_MAX
            ? normalizedDrawerCount
            : SKETCH_EXTERNAL_DRAWER_COUNT_MIN;
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

  if (addedShoeDrawer) {
    applyShoeDrawerBaseAutoNoneIfNeeded(App, 'extDrawers.shoe:autoBaseNone');
  } else if (removedShoeDrawer) {
    restoreShoeDrawerBaseIfNoShoeDrawersRemain(App, 'extDrawers.shoe:autoBaseRestore');
  }

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
