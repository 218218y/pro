import { makeDrawerBoxPartId } from '../features/drawer_box_identity.js';
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
  SketchBoxExternalDrawerOpPlan,
  SketchBoxExternalDrawersContext,
  SketchBoxExternalDrawerStackPlan,
} from './render_interior_sketch_boxes_fronts_drawers_types.js';
import type { InteriorValueRecord } from './render_interior_ops_contracts.js';
import {
  pickSketchBoxVerticalSegment,
  resolveSketchBoxVerticalSegments,
  type SketchBoxVerticalSegment,
} from './render_interior_sketch_layout.js';

import {
  applySketchExternalDrawerFaceOverrides,
  resolveSketchExternalDrawerDoorMountMode,
  asRecordArray,
  asValueRecord,
  resolveSketchExternalDrawerFaceVerticalAlignment,
  toFiniteNumber,
} from './render_interior_sketch_shared.js';

function readStackCenterNorm(item: InteriorValueRecord): number | null {
  return toFiniteNumber(item.yNormC) ?? toFiniteNumber(item.yNorm);
}

function resolveExternalDrawerVerticalSegment(
  context: SketchBoxExternalDrawersContext,
  item: InteriorValueRecord
): SketchBoxVerticalSegment | null {
  const { shell, frontsArgs, woodThick } = context;
  const boxDividers = Array.isArray(frontsArgs.boxDividers) ? frontsArgs.boxDividers : [];
  const boxHorizontalDividers = Array.isArray(frontsArgs.boxHorizontalDividers)
    ? frontsArgs.boxHorizontalDividers
    : [];
  if (!boxHorizontalDividers.length) return null;
  const yNorm = readStackCenterNorm(item);
  if (yNorm == null) return null;
  const verticalSegments = resolveSketchBoxVerticalSegments({
    dividers: boxHorizontalDividers,
    verticalDividers: boxDividers,
    boxCenterX: shell.geometry.centerX,
    innerW: shell.geometry.innerW,
    boxCenterY: shell.centerY,
    innerH: shell.sideH,
    woodThick,
    xNorm: item.xNorm,
  });
  return verticalSegments.length
    ? pickSketchBoxVerticalSegment({
        segments: verticalSegments,
        boxCenterY: shell.centerY,
        innerH: shell.sideH,
        yNorm,
      })
    : null;
}

export function createSketchBoxExternalDrawerStackPlan(
  context: SketchBoxExternalDrawersContext,
  item: InteriorValueRecord | null | undefined,
  drawerIndex: number
): SketchBoxExternalDrawerStackPlan | null {
  if (!item) return null;

  const { shell } = context;
  const { boxPid, height: hM, halfH, centerY: cy, innerBottomY, innerTopY } = shell;
  const verticalSegment = resolveExternalDrawerVerticalSegment(context, item);
  const shellBottomY = cy - halfH;
  const shellTopY = cy + halfH;
  const containerMinY = verticalSegment ? verticalSegment.bottomY : innerBottomY;
  const containerMaxY = verticalSegment ? verticalSegment.topY : innerTopY;
  const isOuterBottomSegment =
    !verticalSegment ||
    Math.abs(verticalSegment.bottomY - innerBottomY) <=
      DRAWER_DIMENSIONS.sketch.faceVerticalAlignmentEpsilonM;
  const isOuterTopSegment =
    !verticalSegment ||
    Math.abs(verticalSegment.topY - innerTopY) <= DRAWER_DIMENSIONS.sketch.faceVerticalAlignmentEpsilonM;
  const faceFlushTargetMinY = isOuterBottomSegment ? shellBottomY : containerMinY;
  const faceFlushTargetMaxY = isOuterTopSegment ? shellTopY : containerMaxY;
  const countRaw = toFiniteNumber(item.count);
  const hasShoeDrawer = item.hasShoeDrawer === true || item.hasShoe === true || item.shoeDrawer === true;
  const drawerCount =
    countRaw != null
      ? Math.max(
          hasShoeDrawer ? 0 : SKETCH_EXTERNAL_DRAWER_COUNT_MIN,
          Math.min(SKETCH_EXTERNAL_DRAWER_COUNT_MAX, Math.floor(countRaw))
        )
      : hasShoeDrawer
        ? 0
        : 1;
  if (!hasShoeDrawer && drawerCount <= 0) return null;
  const metrics = resolveSketchExternalDrawerMetrics({
    drawerCount: Math.max(SKETCH_EXTERNAL_DRAWER_COUNT_MIN, drawerCount),
    drawerHeightM: readSketchDrawerHeightMFromItem(item, DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M),
  });
  const drawerH = metrics.drawerH;
  const shoeDrawerH = DRAWER_DIMENSIONS.external.shoeHeightM;
  const stackH = (hasShoeDrawer ? shoeDrawerH : 0) + drawerCount * drawerH;
  if (!sketchStackFitsAvailableHeight(stackH, Math.max(0, containerMaxY - containerMinY))) {
    return null;
  }
  const centerY = resolveSketchBoxExternalDrawerStackCenterY(
    context,
    item,
    cy,
    halfH,
    hM,
    stackH,
    containerMinY,
    containerMaxY
  );
  if (centerY == null) return null;

  const baseY = centerY - stackH / 2;
  const drawerId = item.id != null && String(item.id) ? String(item.id) : String(drawerIndex);
  const keyPrefix = `${boxPid}_ext_drawers_${drawerId}_`;
  const span = context.resolveBoxDrawerSpan(item);
  const outerW = Math.max(DRAWER_DIMENSIONS.sketch.externalPreviewMinWidthM, span.outerW);
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
      doorMountMode: resolveSketchExternalDrawerDoorMountMode(context.input),
      keyPrefix,
      regCount: drawerCount,
      regDrawerHeight: drawerH,
      shoeDrawerHeight: shoeDrawerH,
      hasShoe: hasShoeDrawer,
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
    containerMinY,
    containerMaxY,
    faceFlushTargetMinY,
    faceFlushTargetMaxY,
    drawerId,
    keyPrefix,
    outerW,
    shelfInnerW: span.innerW,
    shelfCenterX: span.innerCenterX,
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
  const drawerDims = DRAWER_DIMENSIONS.sketch;

  const { shell } = context;
  const { boxMat, geometry: boxGeo } = shell;
  const closed = asValueRecord(op.closed);
  const open = asValueRecord(op.open);
  const fallbackGeom = resolveExternalDrawerGeometry({
    externalWidthM: stack.outerW,
    depthM: context.outerD,
    woodThicknessM: context.woodThick,
    frontZM: context.frontZ,
    drawerHeightM: stack.drawerH,
    doorMountMode: resolveSketchExternalDrawerDoorMountMode(context.input),
  });
  const px = toFiniteNumber(closed?.x) ?? boxGeo.centerX;
  const py = toFiniteNumber(closed?.y) ?? stack.centerY;
  const pz = toFiniteNumber(closed?.z) ?? fallbackGeom.zClosed;
  const partId = `${stack.keyPrefix}${opIndex + 1}`;
  const boxPartId = makeDrawerBoxPartId(partId);
  const frontMat = context.resolvePartMaterial(partId, boxMat);
  const boxDrawerMat = context.resolveDrawerBoxMaterial(boxPartId);
  const visualW = Math.max(
    drawerDims.externalPreviewVisualMinWidthM,
    toFiniteNumber(op.visualW) ?? fallbackGeom.visualW
  );
  const faceW = Math.max(drawerDims.externalPreviewVisualMinWidthM, toFiniteNumber(op.faceW) ?? visualW);
  const faceOffsetX = toFiniteNumber(op.faceOffsetX) ?? 0;
  const visualHRaw = Math.max(
    drawerDims.externalPreviewVisualMinHeightM,
    toFiniteNumber(op.visualH) ?? fallbackGeom.visualH
  );
  const faceVertical = resolveSketchExternalDrawerFaceVerticalAlignment({
    drawerIndex: opIndex,
    drawerCount: stack.drawerOps.length || stack.drawerCount,
    centerY: py,
    visualH: visualHRaw,
    stackMinY: stack.baseY,
    stackMaxY: stack.baseY + stack.stackH,
    containerMinY: stack.containerMinY,
    containerMaxY: stack.containerMaxY,
    flushTargetMinY: stack.faceFlushTargetMinY,
    flushTargetMaxY: stack.faceFlushTargetMaxY,
  });

  return {
    op,
    drawerId: stack.drawerId,
    isRegularExternalDrawer: stack.item.__wpRegularExternalDrawer === true,
    closed,
    open,
    opIndex,
    px,
    py,
    pz,
    partId,
    boxPartId,
    frontMat,
    boxMat: boxDrawerMat,
    visualW,
    faceW,
    faceOffsetX,
    visualH: Math.max(drawerDims.externalPreviewVisualMinHeightM, faceVertical.height),
    faceOffsetY: faceVertical.offsetY,
    faceMinY: faceVertical.minY,
    faceMaxY: faceVertical.maxY,
    visualD: Math.max(
      drawerDims.externalPreviewVisualMinDepthM,
      toFiniteNumber(op.visualT) ?? context.visualT
    ),
    boxW: Math.max(drawerDims.externalPreviewBoxMinDimensionM, toFiniteNumber(op.boxW) ?? fallbackGeom.boxW),
    boxH: Math.max(drawerDims.externalPreviewBoxMinDimensionM, toFiniteNumber(op.boxH) ?? fallbackGeom.boxH),
    boxD: Math.max(drawerDims.externalPreviewBoxMinDimensionM, toFiniteNumber(op.boxD) ?? fallbackGeom.boxD),
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
  stackH: number,
  containerMinY: number,
  containerMaxY: number
): number | null {
  const normBottomY = boxCenterY - boxHalfH;
  return resolveSketchStackCenterYFromNormalizedItem({
    item,
    bottomY: containerMinY,
    topY: containerMaxY,
    totalHeight: Math.max(0, containerMaxY - containerMinY),
    normBottomY,
    normHeight: boxHeight,
    stackH,
  });
}
