import type { ManualLayoutSketchHoverModuleContext } from './canvas_picking_manual_layout_sketch_hover_module_contracts.js';
import {
  parseSketchExtDrawerCount,
  parseSketchExtDrawerHeightM,
  parseSketchIntDrawerHeightM,
} from './canvas_picking_manual_layout_sketch_vertical_stack.js';
import { resolveSketchBoxStackPreview } from './canvas_picking_sketch_box_stack_preview.js';
import { resolveSketchModuleStackPreview } from './canvas_picking_sketch_module_stack_preview.js';
import {
  createManualLayoutSketchHoverHost,
  resolveManualLayoutSketchHoverPointerX,
  writeManualLayoutSketchHoverPreview,
} from './canvas_picking_manual_layout_sketch_hover_module_preview_shared.js';

function resolveSketchDrawerContentKind(
  ctx: ManualLayoutSketchHoverModuleContext
): 'drawers' | 'ext_drawers' {
  return ctx.isExtDrawers ? 'ext_drawers' : 'drawers';
}

function resolveSelectedDrawerCount(ctx: ManualLayoutSketchHoverModuleContext): number | null {
  return ctx.isExtDrawers ? parseSketchExtDrawerCount(ctx.tool) : null;
}

function resolveSelectedDrawerHeightM(ctx: ManualLayoutSketchHoverModuleContext): number | null {
  if (ctx.isExtDrawers) return parseSketchExtDrawerHeightM(ctx.tool);
  if (ctx.isDrawers) return parseSketchIntDrawerHeightM(ctx.tool);
  return null;
}

export function tryHandleManualLayoutSketchHoverModuleStackPreview(
  ctx: ManualLayoutSketchHoverModuleContext
): boolean {
  const {
    activeModuleBox,
    isDrawers,
    isExtDrawers,
    yClamped,
    woodThick,
    hitModuleKey,
    cfgRef,
    info,
    shelves,
    bottomY,
    topY,
    spanH,
    pad,
    innerW,
    internalCenterX,
    internalDepth,
    internalZ,
    drawers,
    extDrawers,
    hitSelectorObj,
    __wp_isCornerKey,
    __wp_readSketchBoxDividers,
    __wp_resolveSketchBoxSegments,
    __wp_pickSketchBoxSegment,
  } = ctx;

  if (!isDrawers && !isExtDrawers) return false;

  const contentKind = resolveSketchDrawerContentKind(ctx);
  const selectedDrawerCount = resolveSelectedDrawerCount(ctx);
  const drawerHeightM = resolveSelectedDrawerHeightM(ctx);

  if (activeModuleBox) {
    const stackPreview = resolveSketchBoxStackPreview({
      host: createManualLayoutSketchHoverHost(ctx),
      contentKind,
      boxId: activeModuleBox.boxId,
      freePlacement: false,
      targetBox: activeModuleBox.box,
      targetGeo: activeModuleBox.geo,
      targetCenterY: activeModuleBox.centerY,
      targetHeight: activeModuleBox.height,
      pointerX: resolveManualLayoutSketchHoverPointerX(ctx.hitLocalX, activeModuleBox.geo.centerX),
      pointerY: yClamped,
      woodThick,
      selectedDrawerCount,
      drawerHeightM,
      readSketchBoxDividers: __wp_readSketchBoxDividers,
      resolveSketchBoxSegments: __wp_resolveSketchBoxSegments,
      pickSketchBoxSegment: __wp_pickSketchBoxSegment,
    });
    return writeManualLayoutSketchHoverPreview(ctx, stackPreview);
  }

  const stackPreview = resolveSketchModuleStackPreview({
    host: createManualLayoutSketchHoverHost(ctx),
    contentKind,
    moduleKey: hitModuleKey,
    cfgRef,
    info,
    shelves,
    bottomY,
    topY,
    totalHeight: spanH,
    pad,
    desiredCenterY: yClamped,
    innerW,
    internalCenterX,
    internalDepth,
    internalZ,
    drawers,
    extDrawers,
    woodThick,
    selectedDrawerCount,
    drawerHeightM,
    hitSelectorObj,
    isCornerKey: __wp_isCornerKey,
  });
  return writeManualLayoutSketchHoverPreview(ctx, stackPreview);
}
