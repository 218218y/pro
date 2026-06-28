import {
  CARCASS_BASE_DIMENSIONS,
  CORNER_WING_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { CornerWingCarcassFlowParams } from './corner_wing_carcass_shared.js';
import { addCornerHexHorizontalBoard } from './corner_wing_hex_cell_geometry.js';
import { isCornerMultiColorModeEnabled } from './corner_config_readers.js';
import {
  type CornerWingCarcassShellMetrics,
  resolveCornerWingHorizPlacement,
} from './corner_wing_carcass_shell_metrics.js';

const PLINTH_DIMENSIONS = CARCASS_BASE_DIMENSIONS.plinth;
const LEG_PLATFORM_DIMENSIONS = CARCASS_BASE_DIMENSIONS.legs.platform;

function asFinitePositive(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function resolvePlatformSideOverhang(
  sideMode: unknown,
  sideOverhangM: unknown,
  isLeftEdge: boolean,
  isRightEdge: boolean
): { left: number; right: number } {
  if (sideMode === 'flush') return { left: 0, right: 0 };
  const side = asFinitePositive(sideOverhangM, LEG_PLATFORM_DIMENSIONS.sideOverhangM);
  return {
    left: isLeftEdge ? side : 0,
    right: isRightEdge ? side : 0,
  };
}

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
    baseLegHeightM,
    baseLegPlatformMode,
    baseLegPlatformSideMode,
    baseLegPlatformSideOverhangM,
    baseLegPlatformFrontOverhangM,
    baseLegBottomPlatformHeightM,
    baseLegTopPlatformHeightM,
    baseH,
    cabinetBodyHeight,
    __stackKey,
    __stackSplitUnifiedFrame,
    __individualColors,
    __cfg,
    getCornerMat,
    bodyMat,
    addOutlines,
    wingGroup,
  } = ctx;
  const { cornerCells } = locals;
  const { readNumFrom, readStrFrom } = helpers;

  const __frameFloorMat = getCornerMat('corner_floor', bodyMat);
  const __useUnifiedTopMiddleFloorKey = __stackSplitUnifiedFrame && __stackKey === 'top';
  const __floorY = startY + woodThick / 2 + CORNER_WING_DIMENSIONS.connector.shellWallHeightClearanceM;

  const __resolveFloorPartId = (partId: string): string => {
    if (!__useUnifiedTopMiddleFloorKey) return partId;
    if (partId === 'corner_floor') return 'corner_stack_mid_floor';
    if (partId === 'corner_floor_blind') return 'corner_stack_mid_floor_blind';
    const cellMatch = /^corner_floor_c(\d+)$/.exec(partId);
    return cellMatch?.[1] ? `corner_stack_mid_floor_c${cellMatch[1]}` : partId;
  };

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
    const paintPartId = __resolveFloorPartId(partId);
    const floorMat = paintPartId === partId ? __frameFloorMat : getCornerMat(paintPartId, bodyMat);
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, woodThick, floorD), floorMat);
    f.position.set(centerX, __floorY, __hz.z);
    f.userData = {
      partId: paintPartId,
      moduleIndex: moduleIndex || 'corner',
      kind: 'floorSeg',
      __wpStack: __stackKey,
      __wpStackSplitUnifiedFrame: __stackSplitUnifiedFrame,
    };
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
        const paintPartId = __resolveFloorPartId(pid);
        const floorMat = paintPartId === pid ? __frameFloorMat : getCornerMat(paintPartId, bodyMat);
        if (
          !cell.__hexCellGeometry ||
          !addCornerHexHorizontalBoard({
            params,
            metrics,
            cell,
            partId: paintPartId,
            y: __floorY,
            material: floorMat,
          })
        ) {
          __addFloorSeg(w, cx, d, pid, key);
        }
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
    const paintPartId = __resolveFloorPartId('corner_floor');
    const floorMat = paintPartId === 'corner_floor' ? __frameFloorMat : getCornerMat(paintPartId, bodyMat);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(floorW, woodThick, __hz.depth), floorMat);
    floor.position.set(floorW / 2, __floorY, __hz.z);
    floor.userData = {
      partId: paintPartId,
      moduleIndex: 'corner',
      kind: 'floorSeg',
      __wpStack: __stackKey,
      __wpStackSplitUnifiedFrame: __stackSplitUnifiedFrame,
    };
    wingGroup.add(floor);
  }

  const __addLegPlatformSeg = (
    segW: number,
    centerX: number,
    depth: number,
    partId: string,
    y: number,
    moduleIndex: string | undefined,
    isLeftEdge: boolean,
    isRightEdge: boolean
  ) => {
    const h = partId.endsWith('_top')
      ? asFinitePositive(baseLegTopPlatformHeightM)
      : asFinitePositive(baseLegBottomPlatformHeightM);
    if (!(h > 0)) return;
    const d = Number.isFinite(depth) && depth > 0 ? depth : wingD;
    const frontOverhang = asFinitePositive(
      baseLegPlatformFrontOverhangM,
      LEG_PLATFORM_DIMENSIONS.frontOverhangM
    );
    const platformD = Math.max(LEG_PLATFORM_DIMENSIONS.minDepthM, d + frontOverhang);
    const sideOverhang = resolvePlatformSideOverhang(
      baseLegPlatformSideMode,
      baseLegPlatformSideOverhangM,
      isLeftEdge,
      isRightEdge
    );
    const left = centerX - segW / 2 - sideOverhang.left;
    const right = centerX + segW / 2 + sideOverhang.right;
    const platformW = Math.max(LEG_PLATFORM_DIMENSIONS.minWidthM, right - left);
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(platformW, h, platformD),
      getCornerMat(partId, bodyMat)
    );
    platform.position.set((left + right) / 2, y, -wingD + platformD / 2);
    platform.userData = {
      partId,
      moduleIndex: moduleIndex || 'corner',
      kind: 'legPlatformSeg',
      __wpStack: __stackKey,
    };
    addOutlines(platform);
    wingGroup.add(platform);
  };

  const __addLegPlatformPair = (
    segW: number,
    centerX: number,
    depth: number,
    moduleIndex: string | undefined,
    isLeftEdge: boolean,
    isRightEdge: boolean
  ) => {
    const legHeight = asFinitePositive(
      baseLegHeightM,
      Math.max(0, baseH - asFinitePositive(baseLegBottomPlatformHeightM))
    );
    const bottomH = asFinitePositive(baseLegBottomPlatformHeightM);
    const topH = asFinitePositive(baseLegTopPlatformHeightM);
    if (bottomH > 0) {
      __addLegPlatformSeg(
        segW,
        centerX,
        depth,
        'corner_leg_platform_bottom',
        stackOffsetY + legHeight + bottomH / 2,
        moduleIndex,
        isLeftEdge,
        isRightEdge
      );
    }
    if (topH > 0) {
      __addLegPlatformSeg(
        segW,
        centerX,
        depth,
        'corner_leg_platform_top',
        startY + cabinetBodyHeight + topH / 2,
        moduleIndex,
        isLeftEdge,
        isRightEdge
      );
    }
  };

  if (baseType === 'legs' && baseLegPlatformMode === 'stage') {
    if (cornerCells.length > 0) {
      const hasBlind = blindWidth > CORNER_WING_DIMENSIONS.panels.minBlindWidthM;
      if (hasBlind) {
        __addLegPlatformPair(blindWidth, blindWidth / 2, wingD, 'corner', true, false);
      }
      if (metrics.__wingIsUnifiedCabinet) {
        __addLegPlatformPair(activeWidth, blindWidth + activeWidth / 2, wingD, 'corner', !hasBlind, true);
      } else {
        for (let i = 0; i < cornerCells.length; i += 1) {
          const cell = cornerCells[i];
          const cx = readNumFrom(cell, 'centerX', 0);
          const w = readNumFrom(cell, 'width', 0);
          const d0 = readNumFrom(cell, 'depth', NaN);
          const d = Number.isFinite(d0) ? Math.max(CORNER_WING_DIMENSIONS.panels.minCellDepthM, d0) : wingD;
          const key = readStrFrom(cell, 'key', 'corner');
          __addLegPlatformPair(w, cx, d, key, !hasBlind && i === 0, i === cornerCells.length - 1);
        }
      }
    } else {
      const platformW = Math.max(CORNER_WING_DIMENSIONS.selector.fallbackMinWidthM, wingW - woodThick);
      __addLegPlatformPair(platformW, platformW / 2, wingD, 'corner', true, true);
    }
  }

  if (baseType !== 'plinth' || baseH <= CORNER_WING_DIMENSIONS.panels.minBlindWidthM) return;

  let __plinthMat = bodyMat;
  if (isCornerMultiColorModeEnabled(__cfg) && __individualColors['corner_plinth']) {
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
    pl.userData = { partId, moduleIndex: moduleIndex || 'corner', kind: 'plinthSeg', __wpStack: __stackKey };
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
