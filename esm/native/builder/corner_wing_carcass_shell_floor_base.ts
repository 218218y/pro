import {
  CARCASS_BASE_DIMENSIONS,
  CORNER_WING_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { CornerWingCarcassFlowParams } from './corner_wing_carcass_shared.js';
import {
  type CornerWingCarcassShellMetrics,
  resolveCornerWingHorizPlacement,
} from './corner_wing_carcass_shell_metrics.js';

const PLINTH_DIMENSIONS = CARCASS_BASE_DIMENSIONS.plinth;

export function applyCornerWingCarcassFloorAndBase(
  params: CornerWingCarcassFlowParams,
  metrics: CornerWingCarcassShellMetrics
): void {
  const { ctx, locals, helpers } = params;
  const {
    THREE,
    woodThick,
    startY,
    wingD,
    wingW,
    activeWidth,
    blindWidth,
    stackOffsetY,
    baseType,
    baseH,
    __individualColors,
    getCornerMat,
    bodyMat,
    addOutlines,
    wingGroup,
  } = ctx;
  const { App, cornerCells } = locals;
  const { getCfg, readNumFrom, readStrFrom } = helpers;

  const __floorMat = getCornerMat('corner_floor', bodyMat);
  const __floorY = startY + woodThick / 2 + CORNER_WING_DIMENSIONS.connector.shellWallHeightClearanceM;

  const __addFloorSeg = (
    segW: number,
    centerX: number,
    depth: number,
    partId: string,
    moduleIndex?: string
  ) => {
    const d = Number.isFinite(depth) && depth > 0 ? depth : wingD;
    const __hz = resolveCornerWingHorizPlacement(
      params,
      metrics,
      d,
      CORNER_WING_DIMENSIONS.panels.minWallDepthM
    );
    const floorD = __hz.depth;
    const w = Math.max(PLINTH_DIMENSIONS.minSegmentWidthM, segW + PLINTH_DIMENSIONS.segmentWidthEpsilonM);
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, woodThick, floorD), __floorMat);
    f.position.set(centerX, __floorY, __hz.z);
    f.userData = { partId, moduleIndex: moduleIndex || 'corner', kind: 'floorSeg' };
    wingGroup.add(f);
  };

  if (cornerCells.length > 0) {
    if (blindWidth > CORNER_WING_DIMENSIONS.panels.minBlindWidthM) {
      __addFloorSeg(blindWidth, blindWidth / 2, wingD, 'corner_floor_blind', 'corner');
    }
    if (metrics.__wingIsUnifiedCabinet) {
      __addFloorSeg(activeWidth, blindWidth + activeWidth / 2, wingD, 'corner_floor', 'corner');
    } else {
      for (const cell of cornerCells) {
        const cx = readNumFrom(cell, 'centerX', 0);
        const w = readNumFrom(cell, 'width', 0);
        const d0 = readNumFrom(cell, 'depth', NaN);
        const d = Number.isFinite(d0) ? Math.max(CORNER_WING_DIMENSIONS.panels.minCellDepthM, d0) : wingD;
        const idx = Math.floor(readNumFrom(cell, 'idx', 0));
        const pid = `corner_floor_c${idx}`;
        const key = readStrFrom(cell, 'key', 'corner');
        __addFloorSeg(w, cx, d, pid, key);
      }
    }
  } else {
    const floorW = Math.max(CORNER_WING_DIMENSIONS.selector.fallbackMinWidthM, wingW - woodThick);
    const __hz = resolveCornerWingHorizPlacement(
      params,
      metrics,
      wingD,
      CORNER_WING_DIMENSIONS.panels.minWallDepthM
    );
    const floor = new THREE.Mesh(new THREE.BoxGeometry(floorW, woodThick, __hz.depth), __floorMat);
    floor.position.set(floorW / 2, __floorY, __hz.z);
    wingGroup.add(floor);
  }

  if (baseType !== 'plinth' || baseH <= CORNER_WING_DIMENSIONS.panels.minBlindWidthM) return;

  let __plinthMat = bodyMat;
  if (getCfg(App).isMultiColorMode && __individualColors['corner_plinth']) {
    __plinthMat = getCornerMat('corner_plinth', bodyMat);
  }

  const __plinthY = stackOffsetY + baseH / 2;

  const __addPlinthSeg = (
    segW: number,
    centerX: number,
    depth: number,
    partId: string,
    moduleIndex?: string
  ) => {
    const d = Number.isFinite(depth) && depth > 0 ? depth : wingD;
    const plinthD = Math.max(PLINTH_DIMENSIONS.minSegmentDepthM, d - PLINTH_DIMENSIONS.depthClearanceM);
    const w = Math.max(PLINTH_DIMENSIONS.minSegmentWidthM, segW + PLINTH_DIMENSIONS.segmentWidthEpsilonM);
    const z = -wingD + d / 2 - PLINTH_DIMENSIONS.frontInsetM;
    const pl = new THREE.Mesh(new THREE.BoxGeometry(w, baseH, plinthD), __plinthMat);
    pl.position.set(centerX, __plinthY, z);
    pl.userData = { partId, moduleIndex: moduleIndex || 'corner', kind: 'plinthSeg' };
    addOutlines(pl);
    wingGroup.add(pl);
  };

  if (cornerCells.length > 0) {
    if (blindWidth > CORNER_WING_DIMENSIONS.panels.minBlindWidthM) {
      __addPlinthSeg(blindWidth, blindWidth / 2, wingD, 'corner_plinth_blind', 'corner');
    }
    if (metrics.__wingIsUnifiedCabinet) {
      __addPlinthSeg(activeWidth, blindWidth + activeWidth / 2, wingD, 'corner_plinth', 'corner');
    } else {
      for (const cell of cornerCells) {
        const cx = readNumFrom(cell, 'centerX', 0);
        const w = readNumFrom(cell, 'width', 0);
        const d0 = readNumFrom(cell, 'depth', NaN);
        const d = Number.isFinite(d0) ? Math.max(CORNER_WING_DIMENSIONS.panels.minCellDepthM, d0) : wingD;
        const idx = Math.floor(readNumFrom(cell, 'idx', 0));
        const pid = `corner_plinth_c${idx}`;
        const key = readStrFrom(cell, 'key', 'corner');
        __addPlinthSeg(w, cx, d, pid, key);
      }
    }
  } else {
    const __plD0 = Math.max(PLINTH_DIMENSIONS.minSegmentDepthM, wingD - PLINTH_DIMENSIONS.depthClearanceM);
    const z = -wingD / 2 - PLINTH_DIMENSIONS.frontInsetM;
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(wingW - PLINTH_DIMENSIONS.fallbackWidthClearanceM, baseH, __plD0),
      __plinthMat
    );
    plinth.position.set(wingW / 2, __plinthY, z);
    addOutlines(plinth);
    wingGroup.add(plinth);
  }
}
