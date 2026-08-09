import type { ManualLayoutSketchHoverModuleContext } from './canvas_picking_manual_layout_sketch_hover_module_contracts.js';
import { shouldBlockDrawerBuildInHexCell } from '../features/hex_cell/index.js';
import {
  parseSketchExtDrawerCount,
  parseSketchExtDrawerHeightM,
  parseSketchExtDrawerType,
  parseSketchIntDrawerHeightM,
} from './canvas_picking_manual_layout_sketch_vertical_stack.js';
import { resolveSketchBoxStackPreview } from './canvas_picking_sketch_box_stack_preview.js';
import { resolveSketchModuleStackPreview } from './canvas_picking_sketch_module_stack_preview.js';
import { decodeSketchBoxContentCommandHover } from './canvas_picking_sketch_box_content_command.js';
import { replaceManualLayoutSketchBoxCommandHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import {
  createManualLayoutSketchHoverHost,
  hideManualLayoutSketchHoverPreview,
  resolveManualLayoutSketchHoverPointerX,
  writeManualLayoutSketchHoverPreview,
} from './canvas_picking_manual_layout_sketch_hover_module_preview_shared.js';

function markSketchDrawerPreviewBlockedByHexCell(
  cfgRef: unknown,
  stackPreview: { hoverRecord?: Record<string, unknown>; preview?: Record<string, unknown> | null } | null
): void {
  if (!stackPreview || !shouldBlockDrawerBuildInHexCell(cfgRef)) return;
  const decoded = decodeSketchBoxContentCommandHover(stackPreview.hoverRecord);
  if (decoded.ok) {
    if (decoded.value.command.op === 'remove') return;
    const replacement = replaceManualLayoutSketchBoxCommandHoverRecord(stackPreview.hoverRecord, {
      ...decoded.value.command,
      blockedReason: 'hex-cell',
    });
    if (!replacement) return;
    stackPreview.hoverRecord = replacement;
  } else {
    if (stackPreview.hoverRecord?.op === 'remove') return;
    stackPreview.hoverRecord = { ...stackPreview.hoverRecord, __wpBlockedReason: 'hex-cell' };
  }
  stackPreview.preview = { ...stackPreview.preview, op: 'blocked', blockedReason: 'hex-cell' };
}

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

function resolveSelectedExternalDrawerType(
  ctx: ManualLayoutSketchHoverModuleContext
): 'regular' | 'shoe' | undefined {
  return ctx.isExtDrawers ? parseSketchExtDrawerType(ctx.tool) : undefined;
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
    rods,
    storageBarriers,
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
    boxes,
    hitSelectorObj,
    __wp_isCornerKey,
    __wp_readSketchBoxDividers,
    __wp_readSketchBoxHorizontalDividers,
    __wp_resolveSketchBoxSegments,
    __wp_pickSketchBoxSegment,
    __wp_resolveSketchBoxVerticalSegments,
    __wp_pickSketchBoxVerticalSegment,
  } = ctx;

  if (!isDrawers && !isExtDrawers) return false;

  const contentKind = resolveSketchDrawerContentKind(ctx);
  const selectedDrawerCount = resolveSelectedDrawerCount(ctx);
  const drawerHeightM = resolveSelectedDrawerHeightM(ctx);
  const externalDrawerType = resolveSelectedExternalDrawerType(ctx);

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
      externalDrawerType,
      drawerHeightM,
      readSketchBoxDividers: __wp_readSketchBoxDividers,
      readSketchBoxHorizontalDividers: __wp_readSketchBoxHorizontalDividers,
      resolveSketchBoxSegments: __wp_resolveSketchBoxSegments,
      pickSketchBoxSegment: __wp_pickSketchBoxSegment,
      resolveSketchBoxVerticalSegments: __wp_resolveSketchBoxVerticalSegments,
      pickSketchBoxVerticalSegment: __wp_pickSketchBoxVerticalSegment,
    });
    if (!stackPreview) {
      ctx.__wp_writeSketchHover(ctx.App, null);
      return hideManualLayoutSketchHoverPreview(ctx);
    }
    markSketchDrawerPreviewBlockedByHexCell(cfgRef, stackPreview);
    return writeManualLayoutSketchHoverPreview(ctx, stackPreview);
  }

  const stackPreview = resolveSketchModuleStackPreview({
    host: createManualLayoutSketchHoverHost(ctx),
    contentKind,
    moduleKey: hitModuleKey,
    cfgRef,
    info,
    shelves,
    rods,
    storageBarriers,
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
    boxes,
    woodThick,
    selectedDrawerCount,
    externalDrawerType,
    drawerHeightM,
    hitSelectorObj,
    isCornerKey: __wp_isCornerKey,
  });
  if (!stackPreview) {
    ctx.__wp_writeSketchHover(ctx.App, null);
    return hideManualLayoutSketchHoverPreview(ctx);
  }
  markSketchDrawerPreviewBlockedByHexCell(cfgRef, stackPreview);
  return writeManualLayoutSketchHoverPreview(ctx, stackPreview);
}
