import { computeExternalDrawersOpsForModule } from './pure_api.js';
import {
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M,
  readSketchDrawerHeightMFromItem,
  resolveSketchExternalDrawerMetrics,
} from '../features/sketch_drawer_sizing.js';

import type {
  SketchExternalDrawerOpPlan,
  SketchExternalDrawerRenderContext,
  SketchExternalDrawerStackPlan,
} from './render_interior_sketch_drawers_external_types.js';
import type { SketchExternalDrawerExtra } from './render_interior_sketch_shared.js';

import {
  applySketchExternalDrawerFaceOverrides,
  asRecordArray,
  asValueRecord,
  resolveSketchExternalDrawerFaceVerticalAlignment,
  toFiniteNumber,
} from './render_interior_sketch_shared.js';

export function createSketchExternalDrawerStackPlan(
  context: SketchExternalDrawerRenderContext,
  item: SketchExternalDrawerExtra | null | undefined,
  drawerIndex: number
): SketchExternalDrawerStackPlan | null {
  if (!item) return null;

  const countRaw = toFiniteNumber(item.count);
  const drawerCount = countRaw != null ? Math.max(1, Math.min(5, Math.floor(countRaw))) : 1;
  const metrics = resolveSketchExternalDrawerMetrics({
    drawerCount,
    drawerHeightM: readSketchDrawerHeightMFromItem(item, DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M),
    availableHeightM: Math.max(0, context.effectiveTopY - context.effectiveBottomY),
  });
  const drawerH = metrics.drawerH;
  const stackH = metrics.stackH;
  const centerY = resolveSketchExternalDrawerStackCenterY(context, item, stackH);
  if (centerY == null) return null;

  const baseY = centerY - stackH / 2;
  const drawerId = item.id != null && String(item.id) ? String(item.id) : String(drawerIndex);
  const keyPrefix = context.moduleKeyStr
    ? `sketch_ext_drawers_${context.moduleKeyStr}_${drawerId}_`
    : `sketch_ext_drawers_${drawerId}_`;
  const drawerFaceW = context.moduleDoorFaceSpan?.spanW ?? context.outerW;
  const drawerFaceOffsetX =
    (context.moduleDoorFaceSpan?.centerX ?? context.internalCenterX) - context.internalCenterX;
  const opsRec = asValueRecord(
    computeExternalDrawersOpsForModule({
      wardrobeType: 'hinged',
      moduleIndex: context.moduleIndex >= 0 ? context.moduleIndex : 0,
      startDoorId: 1,
      externalCenterX: context.internalCenterX,
      externalW: context.outerW,
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
    drawerFaceW,
    drawerFaceOffsetX,
    drawerOps,
  };
}

export function createSketchExternalDrawerOpPlan(
  context: SketchExternalDrawerRenderContext,
  stack: SketchExternalDrawerStackPlan,
  opValue: unknown,
  opIndex: number
): SketchExternalDrawerOpPlan | null {
  const op = asValueRecord(opValue);
  if (!op) return null;

  const closed = asValueRecord(op.closed);
  const open = asValueRecord(op.open);
  const px = toFiniteNumber(closed?.x) ?? context.internalCenterX;
  const py = toFiniteNumber(closed?.y) ?? stack.centerY;
  const pz = toFiniteNumber(closed?.z) ?? context.frontZ + 0.01;
  const partId = `${stack.keyPrefix}${opIndex + 1}`;
  const frontMat = context.resolvePartMaterial(partId);
  const visualW = Math.max(0.05, toFiniteNumber(op.visualW) ?? context.outerW - 0.004);
  const faceW = Math.max(0.05, toFiniteNumber(op.faceW) ?? visualW);
  const faceOffsetX = toFiniteNumber(op.faceOffsetX) ?? 0;
  const visualHRaw = Math.max(0.05, toFiniteNumber(op.visualH) ?? stack.drawerH - 0.008);
  const faceVertical = resolveSketchExternalDrawerFaceVerticalAlignment({
    drawerIndex: opIndex,
    drawerCount: stack.drawerOps.length || stack.drawerCount,
    centerY: py,
    visualH: visualHRaw,
    stackMinY: stack.baseY,
    stackMaxY: stack.baseY + stack.stackH,
    containerMinY: context.effectiveBottomY,
    containerMaxY: context.effectiveTopY,
    flushTargetMaxY: context.doorFaceTopY,
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
    boxW: Math.max(0.05, toFiniteNumber(op.boxW) ?? context.outerW - 0.044),
    boxH: Math.max(0.05, toFiniteNumber(op.boxH) ?? stack.drawerH - 0.04),
    boxD: Math.max(0.05, toFiniteNumber(op.boxD) ?? Math.max(context.woodThick, context.outerD - 0.1)),
    boxOffsetZ: toFiniteNumber(op.boxOffsetZ) ?? -context.outerD / 2 + 0.005,
    connectorW: toFiniteNumber(op.connectW),
    connectorH: toFiniteNumber(op.connectH),
    connectorD: toFiniteNumber(op.connectD),
    connectorZ: toFiniteNumber(op.connectZ) ?? -0.01 - 0.03 / 2 - 0.003,
  };
}

function resolveSketchExternalDrawerStackCenterY(
  context: SketchExternalDrawerRenderContext,
  item: SketchExternalDrawerExtra,
  stackH: number
): number | null {
  const yNormC = toFiniteNumber(item.yNormC);
  const yNormBase = toFiniteNumber(item.yNorm);
  if (yNormC != null) {
    return clampSketchExternalDrawerCenterY(
      context,
      context.effectiveBottomY + Math.max(0, Math.min(1, yNormC)) * context.spanH,
      stackH
    );
  }
  if (yNormBase != null) {
    return clampSketchExternalDrawerCenterY(
      context,
      context.effectiveBottomY + Math.max(0, Math.min(1, yNormBase)) * context.spanH + stackH / 2,
      stackH
    );
  }
  return null;
}

function clampSketchExternalDrawerCenterY(
  context: SketchExternalDrawerRenderContext,
  yCenter: number,
  stackH: number
): number {
  const lo = context.effectiveBottomY + stackH / 2;
  const hi = context.effectiveTopY - stackH / 2;
  if (!(hi > lo)) return Math.max(context.effectiveBottomY, Math.min(context.effectiveTopY, yCenter));
  return Math.max(lo, Math.min(hi, yCenter));
}
