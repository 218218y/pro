import { _asObject } from './core_pure_shared.js';
import {
  DRAWER_DIMENSIONS,
  MATERIAL_DIMENSIONS,
  resolveExternalDrawerGeometry,
} from '../../shared/wardrobe_dimension_tokens_shared.js';

function readComputeNumber(value: unknown, defaultValue: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
}

function readComputeInt(value: unknown, defaultValue: number): number {
  const n = readComputeNumber(value, defaultValue);
  return Number.isFinite(n) ? Math.trunc(n) : defaultValue;
}

export function computeExternalDrawersOpsForModule(input: unknown) {
  const inp = _asObject(input) || {};
  const keyPrefix = typeof inp.keyPrefix === 'string' ? String(inp.keyPrefix) : '';
  const wardrobeType = typeof inp.wardrobeType === 'string' ? inp.wardrobeType : 'hinged';
  if (wardrobeType !== 'hinged')
    return { moduleIndex: readComputeInt(inp.moduleIndex, 0), drawerHeightTotal: 0, drawers: [] };

  let moduleIndex = readComputeInt(inp.moduleIndex, 0);
  let startDoorId = readComputeInt(inp.startDoorId, 1);
  let externalCenterX = readComputeNumber(inp.externalCenterX, 0);
  let externalW = readComputeNumber(inp.externalW, 0);
  let D = readComputeNumber(inp.depth, readComputeNumber(inp.D, 0));
  let startY = readComputeNumber(inp.startY, 0);
  let woodThick = readComputeNumber(inp.woodThick, MATERIAL_DIMENSIONS.wood.thicknessM);
  const doorMountMode = String(inp.doorMountMode || '') === 'inset' ? 'inset' : 'overlay';

  let shoeDrawerHeight = readComputeNumber(inp.shoeDrawerHeight, DRAWER_DIMENSIONS.external.shoeHeightM);
  let regDrawerHeight = readComputeNumber(inp.regDrawerHeight, DRAWER_DIMENSIONS.external.regularHeightM);

  const hasShoe = !!inp.hasShoe;
  let regCount = readComputeInt(inp.regCount, 0);
  if (regCount < 0) regCount = 0;

  let drawerHeightTotal = 0;
  if (hasShoe) drawerHeightTotal += shoeDrawerHeight;
  if (regCount > 0) drawerHeightTotal += regCount * regDrawerHeight;

  const drawers = [];
  if (drawerHeightTotal <= 0 || externalW <= 0 || D <= 0) {
    return { moduleIndex: moduleIndex, drawerHeightTotal: Math.max(0, drawerHeightTotal), drawers: [] };
  }

  const frontZ = readComputeNumber(inp.frontZ, D / 2);
  const geom = resolveExternalDrawerGeometry({
    externalWidthM: externalW,
    depthM: D,
    woodThicknessM: woodThick,
    frontZM: frontZ,
    drawerHeightM: regDrawerHeight,
    doorMountMode,
  });
  const zClosed = geom.zClosed;
  const zOpen = geom.zOpen;
  const visualW = geom.visualW;
  const visualT = geom.visualT;
  const boxW = geom.boxW;
  const boxD = geom.boxD;
  const boxOffsetZ = geom.boxOffsetZ;
  const connectD = geom.connectD;
  const connectZ = geom.connectZ;
  const connectW = geom.connectW;
  const connectH = geom.connectH;

  if (hasShoe) {
    const shoeY = startY + woodThick + shoeDrawerHeight / 2;
    const shoePart = 'd' + startDoorId + '_draw_shoe';
    drawers.push({
      kind: 'shoe',
      partId: shoePart,
      grooveKey: 'groove_' + shoePart,
      dividerKey: keyPrefix + 'div_ext_' + moduleIndex + '_shoe',
      moduleIndex: moduleIndex,
      visualW: visualW,
      visualH: shoeDrawerHeight - DRAWER_DIMENSIONS.external.visualHeightClearanceM,
      visualT: visualT,
      boxW: boxW,
      boxH: shoeDrawerHeight - DRAWER_DIMENSIONS.external.boxHeightClearanceM,
      boxD: boxD,
      boxOffsetZ: boxOffsetZ,
      connectW: connectW,
      connectH: connectH,
      connectD: connectD,
      connectZ: connectZ,
      closed: { x: externalCenterX, y: shoeY, z: zClosed },
      open: { x: externalCenterX, y: shoeY, z: zOpen },
    });
  }

  if (regCount > 0) {
    const baseOffset = hasShoe ? shoeDrawerHeight : 0;
    for (let k = 0; k < regCount; k++) {
      const dY = startY + woodThick + baseOffset + k * regDrawerHeight + regDrawerHeight / 2;
      const partId = 'd' + startDoorId + '_draw_' + (k + 1);
      drawers.push({
        kind: 'regular',
        partId: partId,
        grooveKey: 'groove_' + partId,
        dividerKey: keyPrefix + 'div_ext_' + moduleIndex + '_' + (k + 1),
        moduleIndex: moduleIndex,
        visualW: visualW,
        visualH: regDrawerHeight - DRAWER_DIMENSIONS.external.visualHeightClearanceM,
        visualT: visualT,
        boxW: boxW,
        boxH: regDrawerHeight - DRAWER_DIMENSIONS.external.boxHeightClearanceM,
        boxD: boxD,
        boxOffsetZ: boxOffsetZ,
        connectW: connectW,
        connectH: connectH,
        connectD: connectD,
        connectZ: connectZ,
        closed: { x: externalCenterX, y: dY, z: zClosed },
        open: { x: externalCenterX, y: dY, z: zOpen },
      });
    }
  }

  return { moduleIndex: moduleIndex, drawerHeightTotal: Math.max(0, drawerHeightTotal), drawers: drawers };
}
