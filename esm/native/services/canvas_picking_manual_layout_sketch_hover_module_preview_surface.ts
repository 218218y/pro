import type { ManualLayoutSketchHoverModuleContext } from './canvas_picking_manual_layout_sketch_hover_module_contracts.js';
import { resolveSketchModuleSurfacePreview } from './canvas_picking_sketch_module_surface_preview.js';
import {
  hideManualLayoutSketchHoverPreview,
  writeManualLayoutSketchHoverPreview,
} from './canvas_picking_manual_layout_sketch_hover_module_preview_shared.js';

function applySketchModuleSurfacePreviewResult(
  ctx: ManualLayoutSketchHoverModuleContext,
  result: ReturnType<typeof resolveSketchModuleSurfacePreview>
): boolean {
  if (result.hoverRecord && result.preview) {
    return writeManualLayoutSketchHoverPreview(ctx, {
      hoverRecord: result.hoverRecord,
      preview: result.preview,
    });
  }
  if (result.preview) {
    return writeManualLayoutSketchHoverPreview(ctx, {
      preview: result.preview,
    });
  }
  if (result.hoverRecord) {
    ctx.__wp_writeSketchHover(ctx.App, result.hoverRecord);
  }
  if (result.hidePreview) {
    return hideManualLayoutSketchHoverPreview(ctx);
  }
  return true;
}

export function tryHandleManualLayoutSketchHoverExistingVerticalRemovePreview(
  ctx: ManualLayoutSketchHoverModuleContext
): boolean {
  const {
    tool,
    hitModuleKey,
    intersects,
    info,
    cfgRef,
    hitLocalX,
    yClamped,
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
    isShelf,
    isRod,
    isDrawers,
    isExtDrawers,
    variant,
    shelfDepthOverrideM,
    boxH,
    boxWidthOverrideM,
    boxDepthOverrideM,
    storageH,
    boxes,
    storageBarriers,
    shelves,
    drawers,
    extDrawers,
    rods,
    __wp_isCornerKey,
    __wp_resolveSketchBoxGeometry,
    __wp_readSketchBoxDividers,
    __wp_resolveSketchBoxSegments,
  } = ctx;

  const allowExistingVerticalContentRemove = isBox || isShelf || isRod || isDrawers || isExtDrawers;
  if (!allowExistingVerticalContentRemove) return false;

  const existingVerticalRemovePreview = resolveSketchModuleSurfacePreview({
    host: { tool, moduleKey: hitModuleKey, isBottom: ctx.isBottom },
    tool,
    hitModuleKey,
    intersects,
    info,
    cfgRef,
    hitLocalX,
    yClamped,
    bottomY,
    topY,
    spanH,
    pad,
    woodThick,
    innerW,
    internalCenterX,
    internalDepth,
    internalZ,
    isBox: false,
    isStorage: false,
    isShelf: false,
    isRod: false,
    allowExistingShelfRemove: true,
    allowExistingRodRemove: true,
    variant,
    shelfDepthOverrideM,
    boxH,
    boxWidthOverrideM,
    boxDepthOverrideM,
    storageH,
    boxes,
    storageBarriers,
    shelves,
    drawers,
    extDrawers,
    rods,
    isCornerKey: __wp_isCornerKey,
    resolveSketchBoxGeometry: __wp_resolveSketchBoxGeometry,
    readSketchBoxDividers: __wp_readSketchBoxDividers,
    resolveSketchBoxSegments: __wp_resolveSketchBoxSegments,
  });
  if (!existingVerticalRemovePreview.handled) return false;
  return applySketchModuleSurfacePreviewResult(ctx, existingVerticalRemovePreview);
}

export function handleManualLayoutSketchHoverModuleSurfacePreview(
  ctx: ManualLayoutSketchHoverModuleContext
): boolean {
  const {
    tool,
    hitModuleKey,
    intersects,
    info,
    cfgRef,
    hitLocalX,
    yClamped,
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
    shelfDepthOverrideM,
    boxH,
    boxWidthOverrideM,
    boxDepthOverrideM,
    storageH,
    boxes,
    storageBarriers,
    shelves,
    drawers,
    extDrawers,
    rods,
    __wp_isCornerKey,
    __wp_resolveSketchBoxGeometry,
    __wp_readSketchBoxDividers,
    __wp_resolveSketchBoxSegments,
  } = ctx;

  const moduleSurfacePreview = resolveSketchModuleSurfacePreview({
    host: { tool, moduleKey: hitModuleKey, isBottom: ctx.isBottom },
    tool,
    hitModuleKey,
    intersects,
    info,
    cfgRef,
    hitLocalX,
    yClamped,
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
    shelfDepthOverrideM,
    boxH,
    boxWidthOverrideM,
    boxDepthOverrideM,
    storageH,
    boxes,
    storageBarriers,
    shelves,
    drawers,
    extDrawers,
    rods,
    isCornerKey: __wp_isCornerKey,
    resolveSketchBoxGeometry: __wp_resolveSketchBoxGeometry,
    readSketchBoxDividers: __wp_readSketchBoxDividers,
    resolveSketchBoxSegments: __wp_resolveSketchBoxSegments,
  });
  if (moduleSurfacePreview.handled) {
    return applySketchModuleSurfacePreviewResult(ctx, moduleSurfacePreview);
  }

  return hideManualLayoutSketchHoverPreview(ctx);
}
