// Post-build extras pipeline (Pure ESM)
//
// Centralizes optional but user-visible build add-ons while keeping each post-build owner
// focused on one responsibility: dimensions, sketch/reveal overlays, and final state restore.

import { isBuildContext } from './build_context.js';
import { getShadowMap } from '../runtime/render_access.js';
import {
  applyEditHoldAfterBuild,
  applyLocalOpenStateAfterBuild,
  snapDrawersToTargetsViaService,
  syncDoorsVisualsNow,
} from '../runtime/doors_access.js';
import { reportError } from '../runtime/api.js';
import { readRuntimeScalarOrDefault } from '../runtime/runtime_selectors.js';
import { getStackKeyFromFlags, getStackSplitFromFlags } from '../features/stack_split/index.js';

import type { BuildContextLike } from '../../../types/index.js';

import { applyPostBuildDimensions } from './post_build_dimensions.js';
import {
  applyPendingSketchBoxDoorStateAfterBuild,
  applyPostBuildSketchVisualOverlays,
} from './post_build_visual_overlays.js';

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function readAppRecord(value: unknown): Record<string, unknown> | null {
  return isUnknownRecord(value) ? value : null;
}

function syncGlobalClickVisualStateAfterBuild(
  App: unknown,
  runtime: unknown,
  skipDoorVisualSync: boolean
): void {
  if (skipDoorVisualSync) return;

  const doorsOpen = !!readRuntimeScalarOrDefault(runtime, 'doorsOpen', false);
  const syncedDoorVisuals = syncDoorsVisualsNow(App, { open: doorsOpen });
  if (syncedDoorVisuals) return;

  // When the global door-visual owner is not installed, drawer snapping is still a
  // valid, narrower post-build operation. Keep it explicit so missing door sync is
  // visible instead of pretending a partial drawer update handled the whole route.
  snapDrawersToTargetsViaService(App);
}

function syncLocalClickVisualStateAfterBuild(
  App: unknown,
  skipLocalDoorSync: boolean,
  skipDoorVisualSync: boolean
): void {
  applyLocalOpenStateAfterBuild(App);
  if (!skipLocalDoorSync && !skipDoorVisualSync) syncDoorsVisualsNow(App);
}

function reportPostBuildRequiredDependencyMissing(App: unknown, op: string, message: string): Error {
  const error = new Error(message);
  reportError(App, error, { where: 'builder/post_build_extras', op, fatal: true });
  return error;
}

export function applyPostBuildExtras(input: BuildContextLike) {
  if (!isBuildContext(input)) {
    throw new Error('[builder/post_build_extras] BuildContext required');
  }

  const ctx = input;
  const args = {
    App: ctx.App,
    THREE: ctx.THREE,
    cfg: ctx.cfg,
    H: ctx.dims && ctx.dims.H,
    D: ctx.dims && ctx.dims.D,
    totalW: ctx.dims && ctx.dims.totalW,
    hasCornice: !!(ctx.flags && ctx.flags.hasCornice),
    isCornerMode: !!(ctx.flags && ctx.flags.isCornerMode),
    woodThick: ctx.dims && ctx.dims.woodThick,
    startY: ctx.dims && ctx.dims.startY,
    cabinetBodyHeight: ctx.dims && ctx.dims.cabinetBodyHeight,
    bodyMat: ctx.materials && ctx.materials.bodyMat,
    globalFrontMat: ctx.materials && ctx.materials.globalFrontMat,
    runtime: ctx.runtime,
    globalClickMode: !!(ctx.flags && ctx.flags.globalClickMode),
    hadEditHold: !!(ctx.flags && ctx.flags.hadEditHold),
    buildCornerWing:
      ctx.fns && typeof ctx.fns.buildCornerWing === 'function' ? ctx.fns.buildCornerWing : null,
    addDimensionLine:
      ctx.fns && typeof ctx.fns.addDimensionLine === 'function' ? ctx.fns.addDimensionLine : null,
    restoreNotesFromSave:
      ctx.fns && typeof ctx.fns.restoreNotesFromSave === 'function' ? ctx.fns.restoreNotesFromSave : null,
    notesToPreserve: ctx.notesToPreserve,
  };

  if (!args || !args.App) throw new Error('[builder/post_build_extras] App is required');
  const {
    App,
    THREE,
    cfg,
    H,
    D,
    totalW,
    hasCornice,
    isCornerMode,
    woodThick,
    startY,
    cabinetBodyHeight,
    bodyMat,
    globalFrontMat,
    runtime,
    globalClickMode,
    hadEditHold,
    buildCornerWing,
    addDimensionLine,
    restoreNotesFromSave,
    notesToPreserve,
  } = args;

  // Stack-split context (shared by dimensions + corner wing)
  const __stackSplit = getStackSplitFromFlags(ctx.flags);
  const stackSplitActive = __stackSplit.active;
  const splitBottomHeightCm = __stackSplit.lowerHeightCm;
  const splitBottomDepthCm = __stackSplit.lowerDepthCm;
  const __stackKey = getStackKeyFromFlags(ctx.flags);
  const doorsCountNow =
    ctx && ctx.dims && typeof ctx.dims.doorsCount === 'number' ? Number(ctx.dims.doorsCount) : NaN;
  const noMainWardrobe = !!(
    cfg &&
    cfg.wardrobeType !== 'sliding' &&
    Number.isFinite(doorsCountNow) &&
    Math.round(doorsCountNow) === 0
  );
  const shouldRenderDimensions = !!(cfg && cfg.showDimensions && (!noMainWardrobe || isCornerMode));

  // Dimensions
  if (shouldRenderDimensions && THREE) {
    applyPostBuildDimensions({
      ctx,
      App,
      THREE,
      cfg,
      H,
      D,
      totalW,
      hasCornice,
      isCornerMode,
      addDimensionLine,
      noMainWardrobe,
      stackSplitActive,
      splitBottomHeightCm,
      splitBottomDepthCm,
      stackKey: __stackKey,
    });
  }

  // Corner wing
  if (isCornerMode) {
    if (typeof buildCornerWing !== 'function') {
      throw reportPostBuildRequiredDependencyMissing(
        App,
        'cornerWing.missingBuilder',
        '[builder/post_build_extras] isCornerMode=true but modules.buildCornerWing is missing'
      );
    }
    const __cornerWingMeta = stackSplitActive
      ? __stackKey === 'top'
        ? { stackKey: 'top', baseType: 'none', stackSplitEnabled: true, stackOffsetZ: 0 }
        : {
            stackKey: 'bottom',
            stackSplitEnabled: true,
            stackOffsetZ: 0,
            baseLegStyle: ctx.strings?.baseLegStyle,
            baseLegColor: ctx.strings?.baseLegColor,
            basePlinthHeightCm: ctx.strings?.basePlinthHeightCm,
            baseLegHeightCm: ctx.strings?.baseLegHeightCm,
            baseLegWidthCm: ctx.strings?.baseLegWidthCm,
          }
      : null;
    if (__cornerWingMeta) {
      buildCornerWing(
        Number(totalW),
        Number(cabinetBodyHeight),
        Number(D),
        Number(woodThick),
        Number(startY),
        {
          body: bodyMat,
          front: globalFrontMat,
        },
        __cornerWingMeta
      );
    } else {
      buildCornerWing(
        Number(totalW),
        Number(cabinetBodyHeight),
        Number(D),
        Number(woodThick),
        Number(startY),
        {
          body: bodyMat,
          front: globalFrontMat,
        }
      );
    }
  }

  // Door/drawer visuals sync after rebuild (P1: state-driven, no render-ops imperative kick)
  const appRec = readAppRecord(App);
  const skipNextLocalDoorSync = !!appRec?.__wpSkipNextLocalDoorSync;
  const skipNextDoorVisualSync = !!appRec?.__wpSkipNextDoorVisualSync;
  if (skipNextLocalDoorSync && appRec) delete appRec.__wpSkipNextLocalDoorSync;
  if (skipNextDoorVisualSync && appRec) delete appRec.__wpSkipNextDoorVisualSync;

  if (globalClickMode) {
    syncGlobalClickVisualStateAfterBuild(App, runtime, skipNextDoorVisualSync);
  }

  if (!globalClickMode) {
    syncLocalClickVisualStateAfterBuild(App, skipNextLocalDoorSync, skipNextDoorVisualSync);
    if (hadEditHold) {
      applyEditHoldAfterBuild(App);
    }
  }

  applyPendingSketchBoxDoorStateAfterBuild(App);

  if (THREE) {
    applyPostBuildSketchVisualOverlays({
      App,
      THREE,
      ctx,
      cfg,
      bodyMat,
      globalFrontMat,
      stackKey: __stackKey,
    });
  }

  // Shadow map refresh
  const shadowMap = getShadowMap(App);
  if (shadowMap) {
    shadowMap.needsUpdate = true;
  }

  // Notes restore
  if (Array.isArray(notesToPreserve) && notesToPreserve.length > 0) {
    if (typeof restoreNotesFromSave !== 'function') {
      throw reportPostBuildRequiredDependencyMissing(
        App,
        'notesRestore.missingRestoreFn',
        '[builder/post_build_extras] notesToPreserve exists but notes.restoreNotesFromSave is missing'
      );
    }
    restoreNotesFromSave(notesToPreserve);
  }
}
