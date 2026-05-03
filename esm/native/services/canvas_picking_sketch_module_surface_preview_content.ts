import { buildSketchModuleStackAwareMeasurementEntries } from './canvas_picking_sketch_neighbor_measurements.js';
import {
  createSketchModuleShelfPreviewGeometry,
  findNearestSketchModuleRod,
  findNearestSketchModuleStorageBarrier,
  clampSketchModuleStorageCenterY,
} from './canvas_picking_sketch_module_vertical_content.js';
import {
  findSketchBoxInnerShelfSpan,
  type ResolveSketchModuleSurfacePreviewArgs,
  type SketchModuleSurfacePreviewResult,
} from './canvas_picking_sketch_module_surface_preview_shared.js';

export function resolveSketchModuleContentPreview(args: {
  source: ResolveSketchModuleSurfacePreviewArgs;
  yClamped: number;
  variantPreview: string;
  shelfDepthOverrideM: number | null;
  storageHPreview: number;
  contentOp: 'add' | 'remove';
  bottomY: number;
  topY: number;
  spanH: number;
  pad: number;
  woodThick: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  backZ: number;
  regularDepth: number;
  removeEpsShelf: number;
  removeEpsBox: number;
  isStorage: boolean;
  isShelf: boolean;
  isRod: boolean;
  boxes: ResolveSketchModuleSurfacePreviewArgs['boxes'];
  storageBarriers: ResolveSketchModuleSurfacePreviewArgs['storageBarriers'];
  rods: ResolveSketchModuleSurfacePreviewArgs['rods'];
}): SketchModuleSurfacePreviewResult {
  const {
    source,
    bottomY,
    topY,
    spanH,
    pad,
    woodThick,
    innerW,
    internalCenterX,
    internalDepth,
    internalZ,
    backZ,
    regularDepth,
    removeEpsShelf,
    removeEpsBox,
    isStorage,
    isRod,
    boxes,
    storageBarriers,
    rods,
  } = args;

  let yClamped = args.yClamped;
  let variantPreview = args.variantPreview;
  let shelfDepthOverrideM = args.shelfDepthOverrideM;
  let storageHPreview = args.storageHPreview;
  let op: 'add' | 'remove' = args.contentOp;

  if (isStorage && storageBarriers.length) {
    const storageMatch = findNearestSketchModuleStorageBarrier({
      storageBarriers,
      bottomY,
      totalHeight: spanH,
      pointerY: yClamped,
    });
    if (storageMatch && storageMatch.dy <= removeEpsBox) {
      op = 'remove';
      if (storageMatch.heightM != null) storageHPreview = storageMatch.heightM;
      yClamped = clampSketchModuleStorageCenterY({
        bottomY,
        topY,
        pad,
        heightM: storageHPreview,
        pointerY: storageMatch.yAbs,
      });
    }
  }

  if (isRod && rods.length) {
    const rodMatch = findNearestSketchModuleRod({ rods, bottomY, totalHeight: spanH, pointerY: yClamped });
    if (rodMatch && rodMatch.dy <= removeEpsShelf) {
      op = 'remove';
      yClamped = Math.max(bottomY + pad, Math.min(topY - pad, rodMatch.yAbs));
    }
  }

  const boxShelfSpan = findSketchBoxInnerShelfSpan({
    boxes,
    bottomY,
    spanH,
    yClamped,
    innerW,
    internalCenterX,
    internalDepth,
    internalZ,
    woodThick,
    resolveSketchBoxGeometry: source.resolveSketchBoxGeometry,
  });
  const previewX = boxShelfSpan.centerX != null ? boxShelfSpan.centerX : internalCenterX;

  if (isStorage) {
    const depth0 = Number.isFinite(internalDepth) ? internalDepth : 0;
    const zFront = internalZ + depth0 / 2;
    return {
      handled: true,
      preview: {
        kind: 'storage',
        x: internalCenterX,
        y: yClamped,
        z: zFront - 0.06,
        w: Math.max(0.05, innerW - 0.025),
        h: storageHPreview,
        d: Math.max(0.0001, woodThick),
        woodThick,
        op,
      },
    };
  }

  if (isRod) {
    return {
      handled: true,
      preview: {
        kind: 'rod',
        x: internalCenterX,
        y: yClamped,
        z: internalZ,
        w: Math.max(0.05, innerW - 0.06),
        h: 0.03,
        d: 0.03,
        woodThick,
        op,
      },
    };
  }

  const shelfPreview = createSketchModuleShelfPreviewGeometry({
    innerW: boxShelfSpan.innerW != null ? boxShelfSpan.innerW : innerW,
    internalDepth: boxShelfSpan.innerD != null ? boxShelfSpan.innerD : internalDepth,
    backZ: boxShelfSpan.innerBackZ != null ? boxShelfSpan.innerBackZ : backZ,
    woodThick,
    regularDepth:
      boxShelfSpan.innerD != null && Number.isFinite(boxShelfSpan.innerD) && boxShelfSpan.innerD > 0
        ? Math.min(regularDepth, boxShelfSpan.innerD)
        : regularDepth,
    variant: variantPreview,
    shelfDepthOverrideM,
  });
  const clearanceMeasurements = buildSketchModuleStackAwareMeasurementEntries({
    bottomY,
    topY,
    totalHeight: spanH,
    pad,
    woodThick,
    cfgRef: source.cfgRef,
    info: source.info,
    shelves: source.shelves,
    drawers: source.drawers,
    extDrawers: source.extDrawers,
    targetCenterX: previewX,
    targetCenterY: yClamped,
    targetWidth: shelfPreview.w,
    targetHeight: shelfPreview.h,
    z: shelfPreview.z + shelfPreview.d / 2 + Math.max(0.004, shelfPreview.d * 0.08),
    styleKey: 'cell',
    textScale: 0.82,
  });
  return {
    handled: true,
    preview: {
      kind: 'shelf',
      variant: shelfPreview.variant,
      x: previewX,
      y: yClamped,
      z: shelfPreview.z,
      w: shelfPreview.w,
      h: shelfPreview.h,
      d: shelfPreview.d,
      woodThick,
      op,
      clearanceMeasurements,
    },
  };
}
