import {
  resolveSketchBoxVisibleFrontOverlay,
  type SketchFrontOverlay,
} from './canvas_picking_manual_layout_sketch_front_overlay.js';
import {
  readNumber,
  readRecordNumber,
  readRecordValue,
} from './canvas_picking_sketch_module_surface_preview_records.js';
import type {
  SketchBoxInnerShelfSpanArgs,
  SketchModuleBoxFrontOverlayArgs,
} from './canvas_picking_sketch_module_surface_preview_contracts.js';

export function findSketchBoxInnerShelfSpan(args: SketchBoxInnerShelfSpanArgs): {
  innerW: number | null;
  centerX: number | null;
  innerD: number | null;
  innerBackZ: number | null;
} {
  const {
    boxes,
    bottomY,
    spanH,
    yClamped,
    innerW,
    internalCenterX,
    internalDepth,
    internalZ,
    woodThick,
    resolveSketchBoxGeometry,
  } = args;
  for (let bi = 0; bi < boxes.length; bi++) {
    const box = boxes[bi];
    if (!box || typeof box !== 'object') continue;
    const yNorm = readRecordNumber(box, 'yNorm');
    if (yNorm == null) continue;
    const hM = readRecordNumber(box, 'heightM');
    if (hM == null || !(hM > 0)) continue;
    const cy = bottomY + Math.max(0, Math.min(1, yNorm)) * spanH;
    const half = hM / 2;
    if (Math.abs(yClamped - cy) > half) continue;
    const wM = readNumber(readRecordValue(box, 'widthM'));
    const dM = readNumber(readRecordValue(box, 'depthM'));
    const xNorm = readNumber(readRecordValue(box, 'xNorm'));
    const boxGeo = resolveSketchBoxGeometry({
      innerW,
      internalCenterX,
      internalDepth,
      internalZ,
      woodThick,
      widthM: wM != null && wM > 0 ? wM : null,
      depthM: dM != null && dM > 0 ? dM : null,
      xNorm: xNorm != null ? xNorm : null,
    });
    return {
      innerW: boxGeo.innerW,
      centerX: boxGeo.centerX,
      innerD: boxGeo.innerD,
      innerBackZ: boxGeo.innerBackZ,
    };
  }
  return {
    innerW: null,
    centerX: null,
    innerD: null,
    innerBackZ: null,
  };
}

export function resolveSketchModuleBoxFrontOverlay(
  args: SketchModuleBoxFrontOverlayArgs
): SketchFrontOverlay | null {
  const overlayGeo = args.resolveSketchBoxGeometry({
    innerW: args.innerW,
    internalCenterX: args.internalCenterX,
    internalDepth: args.internalDepth,
    internalZ: args.internalZ,
    woodThick: args.woodThick,
    widthM: args.widthM,
    depthM: args.depthM,
    xNorm: args.xNorm != null ? args.xNorm : undefined,
  });
  const overlaySegments = args.resolveSketchBoxSegments({
    dividers: args.readSketchBoxDividers(args.sourceBox),
    boxCenterX: overlayGeo.centerX,
    innerW: overlayGeo.innerW,
    woodThick: args.woodThick,
  });
  return resolveSketchBoxVisibleFrontOverlay({
    box: args.sourceBox,
    boxCenterY: args.centerY,
    boxHeight: args.boxH,
    woodThick: args.woodThick,
    geo: overlayGeo,
    segments: overlaySegments,
    fullWidth: true,
  });
}
