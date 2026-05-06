// Builder core pure door and sliding computations.
import {
  DOOR_SYSTEM_DIMENSIONS,
  MATERIAL_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';

import {
  _asObject,
  __asArray,
  __asInt,
  __asNum,
  __normalizeModulesStructure,
  __sumDoors,
} from './core_pure_shared.js';
import type { HingedDoorPivotSpec, UnknownRecord } from './core_pure_shared.js';

export function computeHingedDoorPivotMap(input: unknown) {
  const inp = _asObject(input) || {};
  let totalW = __asNum(inp.totalW, 0);
  let woodThick = __asNum(inp.woodThick, MATERIAL_DIMENSIONS.wood.thicknessM);
  let singleUnitWidth = __asNum(inp.singleUnitWidth, 0);
  const hingeMap: UnknownRecord = _asObject(inp.hingeMap) || {};

  // Door-to-wall alignment policy (hinged doors):
  // - Outer wardrobe sides: doors overlap HALF of the thickness (nice flush look).
  // - Regular INTERNAL dividers: use a smaller overlap (about ONE THIRD) so a subtle
  //   center reveal remains visible and the middle doors don't look like a single slab.
  // - "Special per-cell" boundaries (double full-depth walls): keep HALF overlap for
  //   best alignment with the added full-depth partitions.
  // - When "special per-cell" dims are applied, the module loop may add TWO full-depth
  //   partitions at the boundary (one per module). The right module effectively has an
  //   extra left wall inside its span; we compensate in door geometry to keep symmetry.
  const _moduleIsCustomRaw = Array.isArray(inp.moduleIsCustom) ? __asArray(inp.moduleIsCustom) : null;

  let modules = __normalizeModulesStructure(inp.modulesStructure);
  const moduleInternalWidths = Array.isArray(inp.moduleInternalWidths)
    ? __asArray(inp.moduleInternalWidths).map(v => __asNum(v, NaN))
    : null;
  const map: Record<number, HingedDoorPivotSpec> = {};
  let currentX = -totalW / 2 + woodThick;
  let doorId = 1;

  const moduleIsCustom: boolean[] | null =
    _moduleIsCustomRaw && _moduleIsCustomRaw.length === modules.length
      ? _moduleIsCustomRaw.map(v => !!v)
      : null;

  // Boundary i is between module i and i+1.
  const specialBoundary: boolean[] | null = moduleIsCustom
    ? modules.map((_m, i) =>
        i < modules.length - 1 ? !!(moduleIsCustom[i] || moduleIsCustom[i + 1]) : false
      )
    : null;

  // Overlays (in meters).
  const OVERLAY_OUTER = woodThick / 2;
  const OVERLAY_INNER = woodThick / 3;
  const OVERLAY_SPECIAL = woodThick / 2;

  for (let mi = 0; mi < modules.length; mi++) {
    const mod = modules[mi];
    let modDoors = __asInt(mod.doors, 1);
    if (modDoors < 1) modDoors = 1;
    const modWidth =
      moduleInternalWidths && Number.isFinite(moduleInternalWidths[mi])
        ? moduleInternalWidths[mi]
        : singleUnitWidth * modDoors;
    // If the boundary to our LEFT is a "special" one (custom dims on either side), the builder loop
    // adds an extra full-depth wall INSIDE this module at its left edge. Compensate by shifting the
    // effective door start to the right and shrinking the door span by that wall thickness.
    const extraLeftWall = mi > 0 && specialBoundary && specialBoundary[mi - 1] ? woodThick : 0;
    const effectiveStartX = currentX + extraLeftWall;
    const effectiveSpanW = Math.max(0, modWidth - extraLeftWall);

    // Slight seam reveal between multiple leaves in the SAME module, so two doors don't read
    // like one big slab when viewed head-on.
    let leafGap =
      modDoors > 1
        ? Math.min(
            DOOR_SYSTEM_DIMENSIONS.hinged.sameModuleLeafGapMaxM,
            woodThick / DOOR_SYSTEM_DIMENSIONS.hinged.sameModuleLeafGapWoodDivisor
          )
        : 0; // meters
    if (leafGap > 0) {
      const maxTotalGap = effectiveSpanW * DOOR_SYSTEM_DIMENSIONS.hinged.sameModuleLeafGapSpanRatioMax; // don't eat more than 10% of the span
      const totalDesired = (modDoors - 1) * leafGap;
      if (totalDesired > maxTotalGap) leafGap = maxTotalGap / (modDoors - 1);
    }
    const totalGap = (modDoors - 1) * leafGap;
    const baseLeafW = modDoors > 0 ? Math.max(0, (effectiveSpanW - totalGap) / modDoors) : singleUnitWidth;

    for (let di = 0; di < modDoors; di++) {
      // Base (inset) door leaf inside the module opening.
      let doorLeftEdge = effectiveStartX + di * (baseLeafW + leafGap);
      let doorW = baseLeafW;

      // Door overlays on vertical walls.
      // - Outer wardrobe sides: woodThick/2.
      // - Regular internal dividers: woodThick/3 (leaves a small reveal).
      // - Special boundaries (per-cell dims): woodThick/2.
      if (di === 0) {
        const isOuterLeft = mi === 0;
        const isSpecialLeft = !isOuterLeft && specialBoundary && specialBoundary[mi - 1];
        const overlayL = isOuterLeft ? OVERLAY_OUTER : isSpecialLeft ? OVERLAY_SPECIAL : OVERLAY_INNER;
        doorLeftEdge -= overlayL;
        doorW += overlayL;
      }
      if (di === modDoors - 1) {
        const isOuterRight = mi === modules.length - 1;
        const isSpecialRight = !isOuterRight && specialBoundary && specialBoundary[mi];
        const overlayR = isOuterRight ? OVERLAY_OUTER : isSpecialRight ? OVERLAY_SPECIAL : OVERLAY_INNER;
        doorW += overlayR;
      }
      let isLeftHinge = true;
      let pivotX = doorLeftEdge;
      let meshOffsetX = doorW / 2;

      if (modDoors === 1) {
        const hingeKey = 'door_hinge_' + doorId;
        const def = mi === modules.length - 1 ? 'right' : 'left';
        let chosen = hingeMap[hingeKey];
        let dir = chosen === 'left' || chosen === 'right' ? chosen : def;
        if (dir === 'left') {
          isLeftHinge = true;
          pivotX = doorLeftEdge;
          meshOffsetX = doorW / 2;
        } else {
          isLeftHinge = false;
          pivotX = doorLeftEdge + doorW;
          meshOffsetX = -doorW / 2;
        }
      } else {
        if (di === 0) {
          isLeftHinge = true;
          pivotX = doorLeftEdge;
          meshOffsetX = doorW / 2;
        } else {
          isLeftHinge = false;
          pivotX = doorLeftEdge + doorW;
          meshOffsetX = -doorW / 2;
        }
      }

      map[doorId] = {
        doorId: doorId,
        moduleIndex: mi,
        doorIndex: di,
        doorWidth: doorW,
        doorLeftEdge: doorLeftEdge,
        pivotX: pivotX,
        meshOffsetX: meshOffsetX,
        isLeftHinge: isLeftHinge,
      };
      doorId++;
    }

    currentX += modWidth + (mi < modules.length - 1 ? woodThick : 0);
  }

  return map;
}

// Pre-compute deterministic sliding door placement specs.
// Returns { internalWidthForDoors, doorWidth, specs[] }.

export function computeSlidingDoorSpecs(input: unknown) {
  const inp = _asObject(input) || {};
  let totalW = __asNum(inp.totalW, 0);
  let woodThick = __asNum(inp.woodThick, MATERIAL_DIMENSIONS.wood.thicknessM);
  let numDoors = __asInt(inp.numDoors, DOOR_SYSTEM_DIMENSIONS.sliding.defaultDoorsCount);
  if (numDoors < 1) numDoors = 1;
  let overlap = __asNum(inp.overlap, DOOR_SYSTEM_DIMENSIONS.sliding.overlapM);
  let railDepth = __asNum(inp.railDepth, DOOR_SYSTEM_DIMENSIONS.sliding.railDepthM);
  let railZ = __asNum(inp.railZ, 0);

  let internalWidthForDoors = totalW - 2 * woodThick;
  let doorWidth = (internalWidthForDoors + (numDoors - 1) * overlap) / numDoors;
  const offsetZ = railDepth / DOOR_SYSTEM_DIMENSIONS.sliding.railTrackLaneDivisor;
  let specs = new Array(numDoors);

  for (let i = 0; i < numDoors; i++) {
    let isOuter;
    if (numDoors % 2 !== 0) isOuter = i % 2 !== 0;
    else isOuter = i % 2 === 0;

    const z = railZ + (isOuter ? offsetZ : -offsetZ);
    let x = -internalWidthForDoors / 2 + i * (doorWidth - overlap) + doorWidth / 2;

    specs[i] = {
      index: i,
      isOuter: !!isOuter,
      x: x,
      z: z,
      minX: -internalWidthForDoors / 2 + doorWidth / 2,
      maxX: internalWidthForDoors / 2 - doorWidth / 2,
      width: doorWidth,
    };
  }

  return {
    internalWidthForDoors: internalWidthForDoors,
    doorWidth: doorWidth,
    specs: specs,
  };
}

// Build deterministic "render-ops" for sliding doors (DOM-free, THREE-free).
// This returns geometry/placement data only; rendering is handled by App.services.builder.renderOps.
// Output:
// {
//   rail: { z, depth, height, width, topY, bottomY, lineOffsetY, lineOffsetZ },
//   door: { heightNet, centerY, bottomY },
//   doorWidth,
//   overlap,
//   doors: [ { partId, index, total, x, y, z, width, height, isOuter, minX, maxX } ]
// }
/**
 * @returns {import('../../../types').SlidingDoorOpsLike}
 */

export function computeSlidingDoorOps(input: unknown) {
  const inp = _asObject(input) || {};
  let totalW = __asNum(inp.totalW, 0);
  let woodThick = __asNum(inp.woodThick, MATERIAL_DIMENSIONS.wood.thicknessM);
  let D = __asNum(inp.depth, __asNum(inp.D, 0));
  let cabinetBodyHeight = __asNum(inp.cabinetBodyHeight, 0);
  let startY = __asNum(inp.startY, 0);
  let numDoors = __asInt(inp.numDoors, DOOR_SYSTEM_DIMENSIONS.sliding.defaultDoorsCount);
  if (numDoors < 1) numDoors = 1;

  let overlap = __asNum(inp.overlap, DOOR_SYSTEM_DIMENSIONS.sliding.overlapM);
  let railHeight = __asNum(inp.railHeight, DOOR_SYSTEM_DIMENSIONS.sliding.railHeightM);
  let railDepth = __asNum(inp.railDepth, DOOR_SYSTEM_DIMENSIONS.sliding.railDepthM);

  const openingBottomY = startY + woodThick;
  const openingTopY = startY + cabinetBodyHeight - woodThick;
  const openingHeight = Math.max(0, openingTopY - openingBottomY);
  const requestedShellClearance = Math.max(
    DOOR_SYSTEM_DIMENSIONS.sliding.shellClearanceMinM,
    Math.min(
      DOOR_SYSTEM_DIMENSIONS.sliding.shellClearanceMaxM,
      woodThick / DOOR_SYSTEM_DIMENSIONS.sliding.shellClearanceWoodDivisor
    )
  );
  const maxShellClearance = Math.max(0, openingHeight / 2 - railHeight);
  const shellClearance = Math.min(requestedShellClearance, maxShellClearance);

  let railZ = D / 2 - railDepth / 2 - DOOR_SYSTEM_DIMENSIONS.sliding.railBackInsetM;
  const topY = openingTopY - shellClearance - railHeight / 2;
  const bottomY = openingBottomY + shellClearance + railHeight / 2;

  const doorTopOverlap = Math.min(
    DOOR_SYSTEM_DIMENSIONS.sliding.doorTopOverlapMaxM,
    Math.max(0, railHeight - DOOR_SYSTEM_DIMENSIONS.sliding.doorTopOverlapRailInsetM)
  );
  const doorBottomY = bottomY + railHeight / 2;
  const doorTopY = topY - railHeight / 2 + doorTopOverlap;
  const doorHeightNet = Math.max(DOOR_SYSTEM_DIMENSIONS.sliding.doorHeightMinM, doorTopY - doorBottomY);
  const doorCenterY = doorBottomY + doorHeightNet / 2;

  let specRes = computeSlidingDoorSpecs({
    totalW: totalW,
    woodThick: woodThick,
    numDoors: numDoors,
    overlap: overlap,
    railDepth: railDepth,
    railZ: railZ,
  });

  let internalWidthForDoors = specRes.internalWidthForDoors;
  let doorWidth = specRes.doorWidth;
  let specs = specRes.specs;

  let doors = new Array(numDoors);
  for (let i = 0; i < numDoors; i++) {
    const sp = specs[i] || {};
    doors[i] = {
      partId: 'sliding_door_' + (i + 1),
      index: i,
      total: numDoors,
      x: __asNum(sp.x, 0),
      y: doorCenterY,
      z: __asNum(sp.z, railZ),
      width: __asNum(sp.width, doorWidth),
      height: doorHeightNet,
      isOuter: !!sp.isOuter,
      minX: __asNum(sp.minX, -internalWidthForDoors / 2 + doorWidth / 2),
      maxX: __asNum(sp.maxX, internalWidthForDoors / 2 - doorWidth / 2),
    };
  }

  return {
    rail: {
      z: railZ,
      depth: railDepth,
      height: railHeight,
      width: totalW - 2 * woodThick,
      topY: topY,
      bottomY: bottomY,
      lineOffsetY: -railHeight / 2 - DOOR_SYSTEM_DIMENSIONS.sliding.railLineOffsetYExtraM,
      lineOffsetZ: railDepth / DOOR_SYSTEM_DIMENSIONS.sliding.railTrackLaneDivisor,
    },
    door: {
      heightNet: doorHeightNet,
      bottomY: doorBottomY,
      centerY: doorCenterY,
    },
    doorWidth: doorWidth,
    overlap: overlap,
    doors: doors,
  };
}

// Stage 3G-1: Build deterministic render-ops for external drawers (hinged only).
// Pure (no THREE, no render bag probing). Rendering is handled by App.services.builder.renderOps.applyExternalDrawersOps.
// Output:
// {
//   moduleIndex,
//   drawerHeightTotal,
//   drawers: [
//     {
//       kind: 'shoe'|'regular',
//       partId, grooveKey, dividerKey,
//       moduleIndex,
//       visualW, visualH, visualT,
//       boxW, boxH, boxD,
//       boxOffsetZ,
//       connectW, connectH, connectD, connectZ,
//       closed: { x,y,z }, open: { x,y,z }
//     }
//   ]
// }
/**
 * @returns {import('../../../types').ExternalDrawersOpsLike}
 */
