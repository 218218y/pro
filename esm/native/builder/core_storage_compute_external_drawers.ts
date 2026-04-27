import { _asObject, __asInt, __asNum } from './core_pure_shared.js';

export function computeExternalDrawersOpsForModule(input: unknown) {
  const inp = _asObject(input) || {};
  const keyPrefix = typeof inp.keyPrefix === 'string' ? String(inp.keyPrefix) : '';
  const wardrobeType = typeof inp.wardrobeType === 'string' ? inp.wardrobeType : 'hinged';
  if (wardrobeType !== 'hinged')
    return { moduleIndex: __asInt(inp.moduleIndex, 0), drawerHeightTotal: 0, drawers: [] };

  let moduleIndex = __asInt(inp.moduleIndex, 0);
  let startDoorId = __asInt(inp.startDoorId, 1);
  let externalCenterX = __asNum(inp.externalCenterX, 0);
  let externalW = __asNum(inp.externalW, 0);
  let D = __asNum(inp.depth, __asNum(inp.D, 0));
  let startY = __asNum(inp.startY, 0);
  let woodThick = __asNum(inp.woodThick, 0.018);

  let shoeDrawerHeight = __asNum(inp.shoeDrawerHeight, 0.2);
  let regDrawerHeight = __asNum(inp.regDrawerHeight, 0.22);

  const hasShoe = !!inp.hasShoe;
  let regCount = __asInt(inp.regCount, 0);
  if (regCount < 0) regCount = 0;

  let drawerHeightTotal = 0;
  if (hasShoe) drawerHeightTotal += shoeDrawerHeight;
  if (regCount > 0) drawerHeightTotal += regCount * regDrawerHeight;

  const drawers = [];
  if (drawerHeightTotal <= 0 || externalW <= 0 || D <= 0) {
    return { moduleIndex: moduleIndex, drawerHeightTotal: Math.max(0, drawerHeightTotal), drawers: [] };
  }

  const frontZ = __asNum(inp.frontZ, D / 2);
  const zClosed = frontZ + 0.01;
  const zOpen = frontZ + 0.35;
  const visualW = externalW - 0.004;
  const visualT = 0.02;
  const boxW = externalW - 0.044;
  const boxD = Math.max(woodThick, D - 0.1);
  const boxOffsetZ = -D / 2 + 0.005;
  const connectD = 0.03;
  const connectZ = -0.01 - connectD / 2 - 0.003;
  const connectW = externalW - 0.09;
  const connectH = regDrawerHeight - 0.06;

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
      visualH: shoeDrawerHeight - 0.008,
      visualT: visualT,
      boxW: boxW,
      boxH: shoeDrawerHeight - 0.04,
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
        visualH: regDrawerHeight - 0.008,
        visualT: visualT,
        boxW: boxW,
        boxH: regDrawerHeight - 0.04,
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
