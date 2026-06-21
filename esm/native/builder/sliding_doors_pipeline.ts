// Sliding doors pipeline (Pure ESM)
//
// Goals:
// - Keep builder/core small
// - No silent recovery path: if ops are missing, throw with context
// - BuildContext-only API

import { DOOR_SYSTEM_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { isBuildContext } from './build_context.js';
import { computeSlidingDoorOps } from './pure_api.js';
import { requireBuilderRenderOps } from '../runtime/builder_service_access.js';
import { assertApp } from '../runtime/api.js';

import type { BuildContextLike, SlidingDoorOpLike, SlidingDoorOpsLike } from '../../../types/index.js';

export function scopeSlidingDoorPartIdForStack(partId: unknown, stackKey: unknown): string {
  const pid = typeof partId === 'string' ? partId : String(partId ?? '');
  if (!pid || stackKey !== 'bottom') return pid;
  if (pid.startsWith('lower_')) return pid;
  if (pid.startsWith('sliding') || pid.startsWith('slide')) return `lower_${pid}`;
  return pid;
}

export function scopeSlidingDoorOpsForStack(ops: SlidingDoorOpsLike, stackKey: unknown): SlidingDoorOpsLike {
  if (!ops || stackKey !== 'bottom' || !Array.isArray(ops.doors)) return ops;

  let changed = false;
  const doors = ops.doors.map((door: SlidingDoorOpLike) => {
    if (!door || typeof door !== 'object') return door;
    const scopedPartId = scopeSlidingDoorPartIdForStack(door.partId, stackKey);
    if (!scopedPartId || scopedPartId === door.partId) return door;
    changed = true;
    return { ...door, partId: scopedPartId };
  });

  return changed ? { ...ops, doors } : ops;
}

/**
 * Apply sliding doors ops if wardrobeType is "sliding".
 *
 * @param {import('../../../types').BuildContextLike} ctx BuildContext
 */
export function applySlidingDoorsIfNeeded(ctx: BuildContextLike) {
  if (!isBuildContext(ctx)) {
    throw new Error('[builder/sliding_doors] BuildContext required');
  }

  const App = assertApp(ctx.App, 'native/builder/sliding_doors.app');
  const THREE = ctx.THREE;
  if (!THREE) {
    throw new Error('[builder/sliding_doors] THREE is required in BuildContext');
  }

  const cfg = ctx.cfg || {};
  if (!cfg || cfg.wardrobeType !== 'sliding') return;

  if (typeof computeSlidingDoorOps !== 'function') {
    throw new Error('[WardrobePro] Sliding ops missing: computeSlidingDoorOps');
  }
  const ro = requireBuilderRenderOps(App, 'builder/sliding_doors');
  if (typeof ro.applySlidingDoorsOps !== 'function') {
    throw new Error('[WardrobePro] Sliding ops missing: builderRenderOps.applySlidingDoorsOps');
  }

  const totalW = Number(ctx.dims && ctx.dims.totalW);
  const woodThick = Number(ctx.dims && ctx.dims.woodThick);
  const depth = Number(ctx.dims && ctx.dims.D);
  const cabinetBodyHeight = Number(ctx.dims && ctx.dims.cabinetBodyHeight);
  const startY = Number(ctx.dims && ctx.dims.startY);
  const numDoors = Number(ctx.dims && ctx.dims.doorsCount);

  // Compute + apply ops (fail-fast).
  const rawOps: SlidingDoorOpsLike = computeSlidingDoorOps({
    totalW: totalW,
    woodThick: woodThick,
    depth: depth,
    cabinetBodyHeight: cabinetBodyHeight,
    startY: startY,
    numDoors: numDoors,
    overlap: DOOR_SYSTEM_DIMENSIONS.sliding.overlapM,
    railHeight: DOOR_SYSTEM_DIMENSIONS.sliding.railHeightM,
    railDepth: DOOR_SYSTEM_DIMENSIONS.sliding.railDepthM,
  });
  const stackKey = ctx.flags && typeof ctx.flags.__wpStack === 'string' ? String(ctx.flags.__wpStack) : 'top';
  const ops = scopeSlidingDoorOpsForStack(rawOps, stackKey);

  const ui = ctx.ui || null;
  const ok =
    !!(ops && ops.rail && Array.isArray(ops.doors)) &&
    !!ro.applySlidingDoorsOps({
      THREE: THREE,
      cfg: cfg,
      sketchMode: ctx.flags?.sketchMode === true,
      ui: ui,
      isGroovesEnabled: !!(ui && ui.groovesEnabled),
      ops: ops,
      doorStyle: (ctx.strings && ctx.strings.doorStyle) || '',
      globalFrontMat: ctx.materials && ctx.materials.globalFrontMat,
      getMaterial: ctx.fns && ctx.fns.getMaterial,
      getPartMaterial: ctx.resolvers && ctx.resolvers.getPartMaterial,
      getPartColorValue: ctx.resolvers && ctx.resolvers.getPartColorValue,
      createDoorVisual: ctx.create && ctx.create.createDoorVisual,
      getHandleType: ctx.resolvers && ctx.resolvers.getHandleType,
      isDoorRemoved: ctx.resolvers && ctx.resolvers.isDoorRemoved,
      isRemoveDoorMode: !!(ctx.resolvers && ctx.resolvers.isRemoveDoorMode),
      removeDoorsEnabled: !!(ctx.resolvers && ctx.resolvers.removeDoorsEnabled),
      __wpStack: stackKey,
      addOutlines: ctx.fns && ctx.fns.addOutlines,
    });

  if (!ok) {
    throw new Error('[WardrobePro] Sliding ops render failed');
  }
}
