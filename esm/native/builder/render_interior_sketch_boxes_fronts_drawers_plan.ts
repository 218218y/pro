import { computeExternalDrawersOpsForModule } from './pure_api.js';
import {
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M,
  SKETCH_EXTERNAL_DRAWER_COUNT_MAX,
  SKETCH_EXTERNAL_DRAWER_COUNT_MIN,
  readSketchDrawerHeightMFromItem,
  resolveSketchExternalDrawerMetrics,
} from '../features/sketch_drawer_sizing.js';
import { resolveExternalDrawerGeometry } from '../../shared/wardrobe_dimension_tokens_shared.js';

import type {
  SketchBoxExternalDrawerOpPlan,
  SketchBoxExternalDrawersContext,
  SketchBoxExternalDrawerStackPlan,
} from './render_interior_sketch_boxes_fronts_drawers_types.js';
import type { InteriorValueRecord } from './render_interior_ops_contracts.js';

import {
  applySketchExternalDrawerFaceOverrides,
  asRecordArray,
  asValueRecord,
  resolveSketchExternalDrawerFaceVerticalAlignment,
  toFiniteNumber,
} from './render_interior_sketch_shared.js';

export function createSketchBoxExternalDrawerStackPlan(
  context: SketchBoxExternalDrawersContext,
  item: InteriorValueRecord | null | undefined,
  drawerIndex: number
): SketchBoxExternalDrawerStackPlan | null {
  if (!item) return null;

  const { shell } = context;
  const { boxPid, height: hM, halfH, centerY: cy, innerBottomY, innerTopY } = shell;
  const countRaw = toFiniteNumber(item.count);
  const drawerCount =
    countRaw != null
      ? Math.max(
          SKETCH_EXTERNAL_DRAWER_COUNT_MIN,
          Math.min(SKETCH_EXTERNAL_DRAWER_COUNT_MAX, Math.floor(countRaw))
        )
      : 1;
  const metrics = resolveSketchExternalDrawerMetrics({
    drawerCount,
    drawerHeightM: readSketchDrawerHeightMFromItem(item, DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M),
    availableHeightM: Math.max(0, innerTopY - context.woodThick - innerBottomY),
  });
  const drawerH = metrics.drawerH;
  const stackH = metrics.stackH;
  const centerY = resolveSketchBoxExternalDrawerStackCenterY(context, item, cy, halfH, hM, stackH);
  if (centerY == null) return null;

  const baseY = centerY - stackH / 2;
  const drawerId = item.id != null && String(item.id) ? String(item.id) : String(drawerIndex);
  const keyPrefix = `${boxPid}_ext_drawers_${drawerId}_`;
  const span = context.resolveBoxDrawerSpan(item);
  const outerW = Math.max(0.08, span.outerW);
  const drawerFaceW = span.faceW;
  const drawerFaceOffsetX = span.faceCenterX - span.outerCenterX;
  const opsRec = asValueRecord(
    computeExternalDrawersOpsForModule({
      wardrobeType: 'hinged',
      moduleIndex: context.moduleIndex >= 0 ? context.moduleIndex : 0,
      startDoorId: 1,
      externalCenterX: span.outerCenterX,
      externalW: outerW,
      depth: context.outerD,
      frontZ: context.frontZ,
      startY: baseY - context.woodThick,
      woodThick: context.woodThick,
      keyPrefix,
      regCount: drawerCount,
      regDrawerHeight: drawerH,
      hasShoe: false,
    })
  );
  const drawerOps = asRecordArray(opsRec?.drawers);
  applySketchExternalDrawerFaceOverrides(drawerOps, drawerFaceW, drawerFaceOffsetX, context.frontZ);

  return {
    item,
    drawerIndex,
    drawerCount,
    drawerH,
    stackH,
    centerY,
    baseY,
    drawerId,
    keyPrefix,
    outerW,
    drawerFaceW,
    drawerFaceOffsetX,
    drawerOps,
  };
}

export function createSketchBoxExternalDrawerOpPlan(
  context: SketchBoxExternalDrawersContext,
  stack: SketchBoxExternalDrawerStackPlan,
  opValue: unknown,
  opIndex: number
): SketchBoxExternalDrawerOpPlan | null {
  const op = asValueRecord(opValue);
  if (!op) return null;

  const { shell } = context;
  const { boxMat, geometry: boxGeo, innerBottomY, innerTopY } = shell;
  const closed = asValueRecord(op.closed);
  const open = asValueRecord(op.open);
  const fallbackGeom = resolveExternalDrawerGeometry({
    externalWidthM: stack.outerW,
    depthM: context.outerD,
    woodThicknessM: context.woodThick,
    frontZM: context.frontZ,
    drawerHeightM: stack.drawerH,
  });
  const px = toFiniteNumber(closed?.x) ?? boxGeo.centerX;
  const py = toFiniteNumber(closed?.y) ?? stack.centerY;
  const pz = toFiniteNumber(closed?.z) ?? fallbackGeom.zClosed;
  const partId = `${stack.keyPrefix}${opIndex + 1}`;
  const frontMat = context.resolvePartMaterial(partId, boxMat);
  const visualW = Math.max(0.05, toFiniteNumber(op.visualW) ?? fallbackGeom.visualW);
  const faceW = Math.max(0.05, toFiniteNumber(op.faceW) ?? visualW);
  const faceOffsetX = toFiniteNumber(op.faceOffsetX) ?? 0;
  const visualHRaw = Math.max(0.05, toFiniteNumber(op.visualH) ?? fallbackGeom.visualH);
  const faceVertical = resolveSketchExternalDrawerFaceVerticalAlignment({
    drawerIndex: opIndex,
    drawerCount: stack.drawerOps.length || stack.drawerCount,
    centerY: py,
    visualH: visualHRaw,
    stackMinY: stack.baseY,
    stackMaxY: stack.baseY + stack.stackH,
    containerMinY: innerBottomY,
    containerMaxY: innerTopY - context.woodThick,
  });

  return {
    op,
    closed,
    open,
    opIndex,
    px,
    py,
    pz,
    partId,
    frontMat,
    visualW,
    faceW,
    faceOffsetX,
    visualH: Math.max(0.05, faceVertical.height),
    faceOffsetY: faceVertical.offsetY,
    faceMinY: faceVertical.minY,
    faceMaxY: faceVertical.maxY,
    visualD: Math.max(0.005, toFiniteNumber(op.visualT) ?? context.visualT),
    boxW: Math.max(0.05, toFiniteNumber(op.boxW) ?? fallbackGeom.boxW),
    boxH: Math.max(0.05, toFiniteNumber(op.boxH) ?? fallbackGeom.boxH),
    boxD: Math.max(0.05, toFiniteNumber(op.boxD) ?? fallbackGeom.boxD),
    boxOffsetZ: toFiniteNumber(op.boxOffsetZ) ?? fallbackGeom.boxOffsetZ,
    connectorW: toFiniteNumber(op.connectW),
    connectorH: toFiniteNumber(op.connectH),
    connectorD: toFiniteNumber(op.connectD),
    connectorZ: toFiniteNumber(op.connectZ) ?? fallbackGeom.connectZ,
  };
}

function resolveSketchBoxExternalDrawerStackCenterY(
  context: SketchBoxExternalDrawersContext,
  item: InteriorValueRecord,
  boxCenterY: number,
  boxHalfH: number,
  boxHeight: number,
  stackH: number
): number | null {
  const yNormC = toFiniteNumber(item.yNormC);
  const yNormBase = toFiniteNumber(item.yNorm);
  if (yNormC != null) {
    return context.clampDrawerCenterY(
      boxCenterY - boxHalfH + Math.max(0, Math.min(1, yNormC)) * boxHeight,
      stackH
    );
  }
  if (yNormBase != null) {
    return context.clampDrawerCenterY(
      boxCenterY - boxHalfH + Math.max(0, Math.min(1, yNormBase)) * boxHeight + stackH / 2,
      stackH
    );
  }
  return null;
}
