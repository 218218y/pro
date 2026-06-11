import { getModeId } from '../runtime/api.js';
import type { CanvasInteriorHoverFlowArgs } from './canvas_picking_interior_hover_shared.js';
import { tryHandleCanvasBraceShelvesHover } from './canvas_picking_interior_hover_brace_mode.js';
import { tryHandleCanvasPresetLayoutHover } from './canvas_picking_interior_hover_layout_mode.js';
import { tryHandleCanvasManualLayoutHover } from './canvas_picking_interior_hover_manual_mode.js';

export function tryHandleCanvasLayoutFamilyHover(args: CanvasInteriorHoverFlowArgs): boolean {
  const { App, primaryMode } = args;
  const layoutMode = getModeId(App, 'LAYOUT') || 'layout';
  if (primaryMode === layoutMode) return tryHandleCanvasPresetLayoutHover(args);

  const manualMode = getModeId(App, 'MANUAL_LAYOUT') || 'manual_layout';
  if (primaryMode === manualMode) return tryHandleCanvasManualLayoutHover(args);

  const braceMode = getModeId(App, 'BRACE_SHELVES') || 'brace_shelves';
  if (primaryMode !== braceMode) return false;
  return tryHandleCanvasBraceShelvesHover(args);
}
