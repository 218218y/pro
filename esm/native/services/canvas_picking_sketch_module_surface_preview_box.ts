import {
  createManualLayoutSketchBlockedHoverRecord,
  createManualLayoutSketchBoxHoverRecord,
} from './canvas_picking_manual_layout_sketch_hover_state.js';
import { resolveSketchModuleBoxAction } from './canvas_picking_sketch_module_box_workflow.js';
import { buildRectClearanceMeasurementEntries } from './canvas_picking_hover_clearance_measurements.js';
import {
  readNumber,
  resolveSketchModuleBoxFrontOverlay,
  type ResolveSketchModuleSurfacePreviewArgs,
  type SketchModuleSurfacePreviewResult,
} from './canvas_picking_sketch_module_surface_preview_shared.js';

export type SketchModuleBoxPreviewState = {
  hitLocalX: number | null;
  yClamped: number;
  boxHPreview: number;
  boxWidthPreviewM: number | null;
  boxDepthPreviewM: number | null;
  boxPreviewResult?: SketchModuleSurfacePreviewResult;
  resolvedBoxAction: ReturnType<typeof resolveSketchModuleBoxAction> | null;
};

export function resolveSketchModuleBoxPreviewState(args: {
  source: ResolveSketchModuleSurfacePreviewArgs;
  hitLocalX: number | null;
  yClamped: number;
  boxHPreview: number;
  boxWidthPreviewM: number | null;
  boxDepthPreviewM: number | null;
}): SketchModuleBoxPreviewState {
  const { source, hitLocalX, yClamped, boxHPreview, boxWidthPreviewM, boxDepthPreviewM } = args;
  if (!source.isBox) {
    return {
      hitLocalX,
      yClamped,
      boxHPreview,
      boxWidthPreviewM,
      boxDepthPreviewM,
      resolvedBoxAction: null,
    };
  }

  const resolvedBoxAction = resolveSketchModuleBoxAction({
    boxes: source.boxes,
    cursorXHint: readNumber(hitLocalX),
    cursorY: yClamped,
    boxH: boxHPreview,
    widthM: boxWidthPreviewM,
    depthM: boxDepthPreviewM,
    bottomY: source.bottomY,
    topY: source.topY,
    spanH: source.spanH,
    pad: source.pad,
    innerW: source.innerW,
    internalCenterX: source.internalCenterX,
    internalDepth: source.internalDepth,
    internalZ: source.internalZ,
    woodThick: source.woodThick,
    resolveSketchBoxGeometry: source.resolveSketchBoxGeometry,
    enableCenterSnap: true,
  });

  if (resolvedBoxAction?.op === 'blocked') {
    return {
      hitLocalX,
      yClamped,
      boxHPreview,
      boxWidthPreviewM,
      boxDepthPreviewM,
      resolvedBoxAction,
      boxPreviewResult: {
        handled: true,
        hoverRecord: createManualLayoutSketchBlockedHoverRecord(source.host),
        hidePreview: true,
      },
    };
  }

  if (!resolvedBoxAction) {
    return {
      hitLocalX,
      yClamped,
      boxHPreview,
      boxWidthPreviewM,
      boxDepthPreviewM,
      resolvedBoxAction,
      boxPreviewResult: { handled: true },
    };
  }

  let nextYClamped = yClamped;
  let nextHitLocalX = hitLocalX;
  let nextBoxHPreview = boxHPreview;
  let nextBoxWidthPreviewM = boxWidthPreviewM;
  let nextBoxDepthPreviewM = boxDepthPreviewM;
  let boxFrontOverlay = null;

  if (resolvedBoxAction.op === 'remove') {
    nextYClamped = Math.max(
      source.bottomY + source.pad,
      Math.min(source.topY - source.pad, resolvedBoxAction.centerY)
    );
    nextBoxHPreview = resolvedBoxAction.boxH;
    nextBoxWidthPreviewM = resolvedBoxAction.widthM;
    nextBoxDepthPreviewM = resolvedBoxAction.depthM;
    nextHitLocalX = resolvedBoxAction.centerX;
    if (resolvedBoxAction.sourceBox) {
      boxFrontOverlay = resolveSketchModuleBoxFrontOverlay({
        sourceBox: resolvedBoxAction.sourceBox,
        centerY: resolvedBoxAction.centerY,
        boxH: resolvedBoxAction.boxH,
        widthM: resolvedBoxAction.widthM,
        depthM: resolvedBoxAction.depthM,
        xNorm: resolvedBoxAction.xNorm,
        innerW: source.innerW,
        internalCenterX: source.internalCenterX,
        internalDepth: source.internalDepth,
        internalZ: source.internalZ,
        woodThick: source.woodThick,
        resolveSketchBoxGeometry: source.resolveSketchBoxGeometry,
        readSketchBoxDividers: source.readSketchBoxDividers,
        resolveSketchBoxSegments: source.resolveSketchBoxSegments,
      });
    }
  }

  const boxCanSlideHorizontally =
    Number.isFinite(source.innerW) &&
    Number(source.innerW) > Number(resolvedBoxAction.outerW) + Math.max(0.001, source.woodThick * 0.5);

  const clearanceMeasurements = buildRectClearanceMeasurementEntries({
    containerMinX: resolvedBoxAction.centerX - resolvedBoxAction.outerW / 2,
    containerMaxX: resolvedBoxAction.centerX + resolvedBoxAction.outerW / 2,
    containerMinY: source.bottomY,
    containerMaxY: source.topY,
    targetCenterX: resolvedBoxAction.centerX,
    targetCenterY: resolvedBoxAction.centerY,
    targetWidth: resolvedBoxAction.outerW,
    targetHeight: resolvedBoxAction.boxH,
    z:
      resolvedBoxAction.centerZ +
      resolvedBoxAction.outerD / 2 +
      Math.max(0.004, resolvedBoxAction.outerD * 0.08),
    showTop: true,
    showBottom: true,
    styleKey: 'cell',
    textScale: 0.82,
  });

  return {
    hitLocalX: nextHitLocalX,
    yClamped: nextYClamped,
    boxHPreview: nextBoxHPreview,
    boxWidthPreviewM: nextBoxWidthPreviewM,
    boxDepthPreviewM: nextBoxDepthPreviewM,
    resolvedBoxAction,
    boxPreviewResult: {
      handled: true,
      hoverRecord: createManualLayoutSketchBoxHoverRecord({
        host: source.host,
        op: resolvedBoxAction.op === 'remove' ? 'remove' : 'add',
        yCenter: resolvedBoxAction.centerY,
        xCenter: resolvedBoxAction.centerX,
        xNorm: resolvedBoxAction.xNorm,
        removeId: resolvedBoxAction.removeId,
      }),
      preview: {
        kind: 'box',
        fillFront: !!boxFrontOverlay,
        fillBack: true,
        snapToCenter: boxCanSlideHorizontally && resolvedBoxAction.centered,
        x: resolvedBoxAction.centerX,
        y: resolvedBoxAction.centerY,
        z: resolvedBoxAction.centerZ,
        w: resolvedBoxAction.outerW,
        d: resolvedBoxAction.outerD,
        woodThick: source.woodThick,
        boxH: resolvedBoxAction.boxH,
        op: resolvedBoxAction.op === 'remove' ? 'remove' : 'add',
        frontOverlayX: boxFrontOverlay ? boxFrontOverlay.x : undefined,
        frontOverlayY: boxFrontOverlay ? boxFrontOverlay.y : undefined,
        frontOverlayZ: boxFrontOverlay ? boxFrontOverlay.z : undefined,
        frontOverlayW: boxFrontOverlay ? boxFrontOverlay.w : undefined,
        frontOverlayH: boxFrontOverlay ? boxFrontOverlay.h : undefined,
        frontOverlayThickness: boxFrontOverlay ? boxFrontOverlay.d : undefined,
        clearanceMeasurements,
      },
    },
  };
}
