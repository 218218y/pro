// Corner wing interior/door emission helpers.
//
// Keep the public wing cell owner focused on per-cell interior orchestration and
// delegate heavy shelf/storage/detail policy to dedicated interior pipeline owners.

import type { CornerWingCellFlowParams } from './corner_wing_cell_shared.js';
import { createCornerWingInteriorCellRuntime } from './corner_wing_cell_interiors_cell.js';
import { createCornerWingInteriorRuntime } from './corner_wing_cell_interiors_runtime.js';
import { createCornerWingInteriorShelfRuntime } from './corner_wing_cell_interiors_shelves.js';
import {
  createCornerWingInteriorLayoutOps,
  emitCornerWingExternalDrawers,
} from './corner_wing_cell_interiors_storage.js';
import { applyCornerWingCellLayout } from './corner_wing_cell_layouts.js';
import { applyCornerWingCellSketchExtras } from './corner_wing_cell_sketch_extras.js';

export function applyCornerWingCellInteriors(params: CornerWingCellFlowParams): void {
  const runtime = createCornerWingInteriorRuntime(params);
  if (runtime.cornerCells.length <= 0) return;

  const shelfRuntime = createCornerWingInteriorShelfRuntime(runtime);

  for (const cell of runtime.cornerCells) {
    const cellRuntime = createCornerWingInteriorCellRuntime(runtime, cell);
    const layoutOps = createCornerWingInteriorLayoutOps(runtime, cellRuntime, shelfRuntime);

    emitCornerWingExternalDrawers(runtime, cellRuntime, shelfRuntime);

    applyCornerWingCellLayout({
      cfgCell: cellRuntime.cfgCell,
      cell,
      cellW: cellRuntime.cellW,
      cellCenterX: cellRuntime.cellCenterX,
      cellKey: cellRuntime.cellKey,
      gridDivisions: cellRuntime.gridDivisions,
      localGridStep: cellRuntime.localGridStep,
      effectiveBottomY: cellRuntime.effectiveBottomY,
      effectiveTopY: cellRuntime.effectiveTopY,
      woodThick: runtime.woodThick,
      bodyMat: runtime.bodyMat,
      wingGroup: runtime.wingGroup,
      THREE: runtime.THREE,
      getCornerMat: runtime.getCornerMat,
      addGridShelf: layoutOps.addGridShelf,
      createRod: layoutOps.createRod,
      checkAndCreateInternalDrawer: layoutOps.checkAndCreateInternalDrawer,
      __z: cellRuntime.__z,
    });

    applyCornerWingCellSketchExtras({
      App: runtime.App,
      THREE: runtime.THREE,
      wingGroup: runtime.wingGroup,
      cfgCell: cellRuntime.cfgCell,
      cellIdx: cell.idx,
      cellKey: cellRuntime.cellKey,
      stackKey: runtime.__stackKey,
      cellD: cellRuntime.cellD,
      shelfMat: shelfRuntime.shelfMat,
      bodyMat: runtime.bodyMat,
      effectiveBottomY: cellRuntime.effectiveBottomY,
      effectiveTopY: cellRuntime.effectiveTopY,
      localGridStep: cellRuntime.localGridStep,
      cellInnerW: cellRuntime.cellInnerW,
      woodThick: runtime.woodThick,
      __internalDepth: cellRuntime.__internalDepth,
      cellInnerCenterX: cellRuntime.cellInnerCenterX,
      __fullDepthCenterZ: cellRuntime.__fullDepthCenterZ,
      __z: cellRuntime.__z,
      getCornerMat: runtime.getCornerMat,
      createInternalDrawerBox: runtime.createInternalDrawerBox,
      addOutlines: runtime.addOutlines,
      showContentsEnabled: runtime.showContentsEnabled,
      addFoldedClothes: runtime.addFoldedClothes,
      createRod: layoutOps.createRod,
      asRecord: runtime.asRecord,
    });
  }
}
