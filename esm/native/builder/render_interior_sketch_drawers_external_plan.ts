import { makeDrawerBoxPartId } from '../features/drawer_box_identity.js';
import { readRenderOpNumber } from './render_ops_number_contracts.js';
import { computeExternalDrawersOpsForModule } from './pure_api.js';
import {
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M,
  SKETCH_EXTERNAL_DRAWER_COUNT_MAX,
  SKETCH_EXTERNAL_DRAWER_COUNT_MIN,
  readSketchDrawerHeightMFromItem,
  resolveSketchExternalDrawerMetrics,
  sketchStackFitsAvailableHeight,
} from '../features/sketch_drawer_sizing.js';
import {
  DRAWER_DIMENSIONS,
  resolveExternalDrawerGeometry,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import { resolveSketchStackCenterYFromNormalizedItem } from '../features/sketch_stack_positioning.js';

import type {
  SketchExternalDrawerOpPlan,
  SketchExternalDrawerRenderContext,
  SketchExternalDrawerStackPlan,
} from './render_interior_sketch_drawers_external_types.js';
import type { SketchExternalDrawerExtra } from './render_interior_sketch_shared.js';

import {
  applySketchExternalDrawerFaceOverrides,
  resolveSketchExternalDrawerDoorMountMode,
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
  });
  const drawerH = metrics.drawerH;
  const stackH = metrics.stackH;
  if (
    !sketchStackFitsAvailableHeight(stackH, Math.max(0, context.effectiveTopY - context.effectiveBottomY))
  ) {
    return null;
  }
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
      doorMountMode: resolveSketchExternalDrawerDoorMountMode(context.input),
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
  const drawerDims = DRAWER_DIMENSIONS.sketch;

  const closed = asValueRecord(op.closed);
  const open = asValueRecord(op.open);
  const fallbackGeom = resolveExternalDrawerGeometry({
    externalWidthM: context.outerW,
    depthM: context.outerD,
    woodThicknessM: context.woodThick,
    frontZM: context.frontZ,
    drawerHeightM: stack.drawerH,
    doorMountMode: resolveSketchExternalDrawerDoorMountMode(context.input),
  });
  const px = readRenderOpNumber(closed?.x) ?? context.internalCenterX;
  const py = readRenderOpNumber(closed?.y) ?? stack.centerY;
  const pz = readRenderOpNumber(closed?.z) ?? fallbackGeom.zClosed;
  const partId = `${stack.keyPrefix}${opIndex + 1}`;
  const boxPartId = makeDrawerBoxPartId(partId);
  const frontMat = context.resolvePartMaterial(partId);
  const boxMat = context.resolveDrawerBoxMaterial(boxPartId);
  const visualW = Math.max(
    drawerDims.externalPreviewVisualMinWidthM,
    readRenderOpNumber(op.visualW) ?? fallbackGeom.visualW
  );
  const faceW = Math.max(drawerDims.externalPreviewVisualMinWidthM, readRenderOpNumber(op.faceW) ?? visualW);
  const faceOffsetX = readRenderOpNumber(op.faceOffsetX) ?? 0;
  const visualHRaw = Math.max(
    drawerDims.externalPreviewVisualMinHeightM,
    readRenderOpNumber(op.visualH) ?? fallbackGeom.visualH
  );
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
    boxPartId,
    frontMat,
    boxMat,
    visualW,
    faceW,
    faceOffsetX,
    visualH: Math.max(drawerDims.externalPreviewVisualMinHeightM, faceVertical.height),
    faceOffsetY: faceVertical.offsetY,
    faceMinY: faceVertical.minY,
    faceMaxY: faceVertical.maxY,
    visualD: Math.max(
      drawerDims.externalPreviewVisualMinDepthM,
      readRenderOpNumber(op.visualT) ?? context.visualT
    ),
    boxW: Math.max(
      drawerDims.externalPreviewBoxMinDimensionM,
      readRenderOpNumber(op.boxW) ?? fallbackGeom.boxW
    ),
    boxH: Math.max(
      drawerDims.externalPreviewBoxMinDimensionM,
      readRenderOpNumber(op.boxH) ?? fallbackGeom.boxH
    ),
    boxD: Math.max(
      drawerDims.externalPreviewBoxMinDimensionM,
      readRenderOpNumber(op.boxD) ?? fallbackGeom.boxD
    ),
    boxOffsetZ: readRenderOpNumber(op.boxOffsetZ) ?? fallbackGeom.boxOffsetZ,
    connectorW: readRenderOpNumber(op.connectW),
    connectorH: readRenderOpNumber(op.connectH),
    connectorD: readRenderOpNumber(op.connectD),
    connectorZ: readRenderOpNumber(op.connectZ) ?? fallbackGeom.connectZ,
  };
}

function resolveSketchExternalDrawerStackCenterY(
  context: SketchExternalDrawerRenderContext,
  item: SketchExternalDrawerExtra,
  stackH: number
): number | null {
  return resolveSketchStackCenterYFromNormalizedItem({
    item,
    bottomY: context.effectiveBottomY,
    topY: context.effectiveTopY,
    totalHeight: context.spanH,
    stackH,
  });
}
