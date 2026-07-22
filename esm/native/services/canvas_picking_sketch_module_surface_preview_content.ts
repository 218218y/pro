import {
  INTERIOR_STORAGE_BARRIER_POLICY,
  INTERIOR_STORAGE_PREVIEW_POLICY,
} from '../../shared/dimensions/interior_storage_policy.js';
import {
  SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY,
  SKETCH_BOX_ROD_PREVIEW_POLICY,
} from '../../shared/dimensions/sketch_box_preview_policy.js';
import { buildSketchModuleStackAwareMeasurementEntries } from './canvas_picking_sketch_neighbor_measurements.js';
import {
  doesSketchModuleVerticalRangeCollideWithDrawers,
  resolveSketchModuleRodCollisionHeight,
  resolveSketchModuleVerticalRangePlacementAgainstDrawers,
} from './canvas_picking_sketch_module_vertical_content_collision.js';
import {
  createSketchModuleShelfPreviewGeometry,
  findNearestSketchModuleRod,
  findNearestSketchModuleStorageBarrier,
  clampSketchModuleStorageCenterY,
} from './canvas_picking_sketch_module_vertical_content.js';
import {
  createRodAddHoverRecord,
  createShelfAddHoverRecord,
  createStorageAddHoverRecord,
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
  let op: 'add' | 'remove' | 'blocked' = args.contentOp;

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

  const isAddBlockedBySketchDrawers = (heightM: number, centerY: number = yClamped): boolean =>
    op === 'add' &&
    doesSketchModuleVerticalRangeCollideWithDrawers({
      cfgRef: source.cfgRef,
      drawers: source.drawers,
      extDrawers: source.extDrawers,
      bottomY,
      topY,
      totalHeight: spanH,
      pad,
      centerY,
      heightM,
    });

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
    const storagePlacement =
      op === 'add'
        ? resolveSketchModuleVerticalRangePlacementAgainstDrawers({
            cfgRef: source.cfgRef,
            drawers: source.drawers,
            extDrawers: source.extDrawers,
            bottomY,
            topY,
            totalHeight: spanH,
            pad,
            desiredCenterY: yClamped,
            heightM: storageHPreview,
          })
        : null;
    const storagePreviewY =
      op === 'add'
        ? (storagePlacement?.centerY ??
          clampSketchModuleStorageCenterY({
            bottomY,
            topY,
            pad,
            heightM: storageHPreview,
            pointerY: yClamped,
          }))
        : yClamped;
    const blockedBySketchDrawers = storagePlacement?.blocked === true;
    if (blockedBySketchDrawers) op = 'blocked';
    const storageAddYNorm = spanH > 0 ? Math.max(0, Math.min(1, (storagePreviewY - bottomY) / spanH)) : 0;
    const depth0 = Number.isFinite(internalDepth) ? internalDepth : 0;
    const zFront = internalZ + depth0 / 2;
    return {
      handled: true,
      hoverRecord:
        args.contentOp === 'add'
          ? createStorageAddHoverRecord({
              host: source.host,
              yNorm: storageAddYNorm,
              blockedReason: blockedBySketchDrawers ? 'collision' : null,
            })
          : undefined,
      preview: {
        kind: 'storage',
        x: internalCenterX,
        y: storagePreviewY,
        z: zFront + INTERIOR_STORAGE_BARRIER_POLICY.barrierFrontZOffsetM,
        w: Math.max(
          INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthMinM,
          innerW - INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthClearanceM
        ),
        h: storageHPreview,
        d: Math.max(INTERIOR_STORAGE_PREVIEW_POLICY.previewThicknessMinM, woodThick),
        woodThick,
        op,
        blockedReason: blockedBySketchDrawers ? 'collision' : undefined,
      },
    };
  }

  if (isRod) {
    const blockedBySketchDrawers = isAddBlockedBySketchDrawers(resolveSketchModuleRodCollisionHeight());
    if (blockedBySketchDrawers) op = 'blocked';
    const rodAddYNorm = spanH > 0 ? Math.max(0, Math.min(1, (yClamped - bottomY) / spanH)) : 0;
    return {
      handled: true,
      hoverRecord:
        args.contentOp === 'add'
          ? createRodAddHoverRecord({
              host: source.host,
              yNorm: rodAddYNorm,
              blockedReason: blockedBySketchDrawers ? 'collision' : null,
            })
          : undefined,
      preview: {
        kind: 'rod',
        x: internalCenterX,
        y: yClamped,
        z: internalZ,
        w: Math.max(
          SKETCH_BOX_ROD_PREVIEW_POLICY.rodMinLengthM,
          innerW - SKETCH_BOX_ROD_PREVIEW_POLICY.rodWidthClearanceM
        ),
        h: SKETCH_BOX_ROD_PREVIEW_POLICY.rodPreviewHeightM,
        d: SKETCH_BOX_ROD_PREVIEW_POLICY.rodPreviewDepthM,
        woodThick,
        op,
        blockedReason: blockedBySketchDrawers ? 'collision' : undefined,
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
  const blockedBySketchDrawers = isAddBlockedBySketchDrawers(shelfPreview.h);
  if (blockedBySketchDrawers) op = 'blocked';
  const addYNorm = spanH > 0 ? Math.max(0, Math.min(1, (yClamped - bottomY) / spanH)) : 0;
  const shelfAddHoverRecord =
    args.isShelf && args.contentOp === 'add'
      ? createShelfAddHoverRecord({
          host: source.host,
          yNorm: addYNorm,
          variant: variantPreview,
          depthM: shelfDepthOverrideM,
          blockedReason: blockedBySketchDrawers ? 'collision' : null,
        })
      : undefined;

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
    z:
      shelfPreview.z +
      shelfPreview.d / 2 +
      Math.max(
        SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementZOffsetMinM,
        shelfPreview.d * SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementZOffsetDepthRatio
      ),
    styleKey: 'cell',
    textScale: SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementTextScale,
  });
  return {
    handled: true,
    hoverRecord: shelfAddHoverRecord,
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
      blockedReason: blockedBySketchDrawers ? 'collision' : undefined,
      clearanceMeasurements,
    },
  };
}
