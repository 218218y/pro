import type { ManualLayoutSketchHoverModuleContext } from './canvas_picking_manual_layout_sketch_hover_module_contracts.js';
import { tryHandleManualLayoutSketchHoverModuleBoxPreview } from './canvas_picking_manual_layout_sketch_hover_module_preview_box.js';
import { tryHandleManualLayoutSketchHoverModuleStackPreview } from './canvas_picking_manual_layout_sketch_hover_module_preview_stack.js';
import {
  handleManualLayoutSketchHoverModuleSurfacePreview,
  tryHandleManualLayoutSketchHoverExistingVerticalRemovePreview,
} from './canvas_picking_manual_layout_sketch_hover_module_preview_surface.js';

export function tryHandleManualLayoutSketchHoverModulePreviewFlow(
  ctx: ManualLayoutSketchHoverModuleContext
): boolean {
  if (tryHandleManualLayoutSketchHoverExistingVerticalRemovePreview(ctx)) return true;
  if (tryHandleManualLayoutSketchHoverModuleBoxPreview(ctx)) return true;
  if (tryHandleManualLayoutSketchHoverModuleStackPreview(ctx)) return true;
  return handleManualLayoutSketchHoverModuleSurfacePreview(ctx);
}
