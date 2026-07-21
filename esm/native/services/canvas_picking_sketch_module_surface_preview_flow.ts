import { INTERIOR_SHELF_GEOMETRY_POLICY } from '../../shared/dimensions/interior_fittings_policy.js';
import { SKETCH_BOX_PREVIEW_CORE_POLICY } from '../../shared/dimensions/sketch_box_preview_policy.js';
import { findNearestSketchModuleShelf } from './canvas_picking_sketch_module_vertical_content.js';
import { resolveSketchModuleBoxPreviewState } from './canvas_picking_sketch_module_surface_preview_box.js';
import { resolveSketchModuleShelfRemovePreview } from './canvas_picking_sketch_module_surface_preview_shelf.js';
import { isSketchInternalDrawersTool } from '../features/sketch_drawer_sizing.js';
import {
  type ResolveSketchModuleSurfacePreviewArgs,
  type SketchModuleSurfacePreviewResult,
} from './canvas_picking_sketch_module_surface_preview_shared.js';

import { resolveSketchModuleRodRemovePreview } from './canvas_picking_sketch_module_surface_preview_rod.js';
import { resolveSketchModuleStorageRemovePreview } from './canvas_picking_sketch_module_surface_preview_storage.js';
import { resolveSketchModuleContentPreview } from './canvas_picking_sketch_module_surface_preview_content.js';

export function resolveSketchModuleSurfacePreview(
  args: ResolveSketchModuleSurfacePreviewArgs
): SketchModuleSurfacePreviewResult {
  const {
    bottomY,
    topY,
    spanH,
    pad,
    woodThick,
    innerW,
    internalCenterX,
    internalDepth,
    internalZ,
    isBox,
    isStorage,
    isShelf,
    isRod,
    variant,
    storageH,
    boxes,
    storageBarriers,
    shelves,
    rods,
  } = args;
  const allowExistingShelfRemove = isShelf || args.allowExistingShelfRemove === true;
  const allowExistingRodRemove = isRod || args.allowExistingRodRemove === true;
  const allowExistingStorageRemove = isStorage || args.allowExistingStorageRemove === true;
  if (
    !isBox &&
    !isStorage &&
    !isShelf &&
    !isRod &&
    !allowExistingShelfRemove &&
    !allowExistingRodRemove &&
    !allowExistingStorageRemove
  )
    return { handled: false };

  let yClamped = args.yClamped;
  let variantPreview = variant;
  let boxHPreview = args.boxH;
  let boxWidthPreviewM = args.boxWidthOverrideM;
  let boxDepthPreviewM = args.boxDepthOverrideM;
  let storageHPreview = storageH;
  let contentOp: 'add' | 'remove' = 'add';

  const regShelfDepth = INTERIOR_SHELF_GEOMETRY_POLICY.regularDepthM;
  const regularDepth = internalDepth > 0 ? Math.min(internalDepth, regShelfDepth) : regShelfDepth;
  const backZ = internalZ - internalDepth / 2;
  const removeEpsShelf = SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsShelfM;
  const removeEpsBox = SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsBoxM;
  const isDrawersTool = isSketchInternalDrawersTool(args.tool);

  const shelfRemovePreview = allowExistingShelfRemove
    ? resolveSketchModuleShelfRemovePreview({
        host: args.host,
        hitModuleKey: args.hitModuleKey,
        intersects: args.intersects,
        info: args.info,
        cfgRef: args.cfgRef,
        yClamped,
        bottomY,
        topY,
        spanH,
        pad,
        shelves,
        drawers: args.drawers,
        extDrawers: args.extDrawers,
        variant,
        shelfDepthOverrideM: args.shelfDepthOverrideM,
        innerW,
        internalDepth,
        internalCenterX,
        backZ,
        woodThick,
        regularDepth,
        isDrawers: isDrawersTool,
        isCornerKey: args.isCornerKey,
        removeEpsShelf,
      })
    : {
        handled: false,
        yClamped,
        variantPreview: variant,
        shelfDepthOverrideM: args.shelfDepthOverrideM,
      };
  yClamped = shelfRemovePreview.yClamped;
  variantPreview = shelfRemovePreview.variantPreview;
  let shelfDepthOverrideM = shelfRemovePreview.shelfDepthOverrideM;
  if (shelfRemovePreview.handled && shelfRemovePreview.result) return shelfRemovePreview.result;

  if (allowExistingStorageRemove) {
    const storageRemovePreview = resolveSketchModuleStorageRemovePreview({
      source: args,
      removeEpsBox,
      bottomY,
      topY,
      pad,
      spanH,
      internalCenterX,
      internalDepth,
      internalZ,
      innerW,
      woodThick,
      yClamped,
      storageBarriers,
    });
    if (storageRemovePreview) return storageRemovePreview;
  }

  if (allowExistingRodRemove) {
    const rodRemovePreview = resolveSketchModuleRodRemovePreview({
      source: args,
      removeEpsShelf,
      bottomY,
      topY,
      pad,
      spanH,
      internalCenterX,
      internalZ,
      innerW,
      woodThick,
      yClamped,
      rods,
    });
    if (rodRemovePreview) return rodRemovePreview;
  }

  if (!isBox && !isStorage && !isShelf && !isRod) return { handled: false };

  if (isShelf && shelves.length) {
    const shelfMatch = findNearestSketchModuleShelf({
      shelves,
      bottomY,
      totalHeight: spanH,
      pointerY: yClamped,
    });
    if (shelfMatch && shelfMatch.dy <= removeEpsShelf) {
      contentOp = 'remove';
      yClamped = Math.max(bottomY + pad, Math.min(topY - pad, shelfMatch.yAbs));
      variantPreview = shelfMatch.variant || variantPreview;
      if (shelfMatch.depthM != null) shelfDepthOverrideM = shelfMatch.depthM;
    }
  }

  const boxPreviewState = resolveSketchModuleBoxPreviewState({
    source: args,
    hitLocalX: args.hitLocalX,
    yClamped,
    boxHPreview,
    boxWidthPreviewM,
    boxDepthPreviewM,
  });
  yClamped = boxPreviewState.yClamped;
  boxHPreview = boxPreviewState.boxHPreview;
  boxWidthPreviewM = boxPreviewState.boxWidthPreviewM;
  boxDepthPreviewM = boxPreviewState.boxDepthPreviewM;

  if (isBox) {
    return boxPreviewState.boxPreviewResult ?? { handled: true };
  }

  return resolveSketchModuleContentPreview({
    source: args,
    yClamped,
    variantPreview,
    shelfDepthOverrideM,
    storageHPreview,
    contentOp,
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
    isShelf,
    isRod,
    boxes,
    storageBarriers,
    rods,
  });
}
