// Sliding doors pipeline (Pure ESM)
//
// Goals:
// - Keep builder/core small
// - No silent fallback: if ops are missing, throw with context
// - BuildContext-only API (no legacy arg objects)

import { isBuildContext } from './build_context.js';
import { computeSlidingDoorOps } from './pure_api.js';
import { requireBuilderRenderOps } from '../runtime/builder_service_access.js';
import { assertApp } from '../runtime/api.js';

import type { BuildContextLike, SlidingDoorOpsLike } from '../../../types/index.js';

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
  const ops: SlidingDoorOpsLike = computeSlidingDoorOps({
    totalW: totalW,
    woodThick: woodThick,
    depth: depth,
    cabinetBodyHeight: cabinetBodyHeight,
    startY: startY,
    numDoors: numDoors,
    overlap: 0.03,
    railHeight: 0.04,
    railDepth: 0.075,
  });

  const ui = ctx.ui || null;
  const ok =
    !!(ops && ops.rail && Array.isArray(ops.doors)) &&
    !!ro.applySlidingDoorsOps({
      THREE: THREE,
      cfg: cfg,
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
      addOutlines: ctx.fns && ctx.fns.addOutlines,
    });

  if (!ok) {
    throw new Error('[WardrobePro] Sliding ops render failed');
  }
}
