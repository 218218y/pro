import type { ManualLayoutSketchHoverModuleFlowArgs } from './canvas_picking_manual_layout_sketch_hover_module_contracts.js';
import { resolveManualLayoutSketchHoverModuleContext } from './canvas_picking_manual_layout_sketch_hover_module_context.js';
import { tryHandleManualLayoutSketchHoverModuleDividerFlow } from './canvas_picking_manual_layout_sketch_hover_module_divider_flow.js';
import { tryHandleManualLayoutSketchHoverModulePreviewFlow } from './canvas_picking_manual_layout_sketch_hover_module_preview_flow.js';

export {
  resolveManualLayoutSketchHoverModuleContext,
  tryHandleManualLayoutSketchHoverModuleDividerFlow,
  tryHandleManualLayoutSketchHoverModulePreviewFlow,
};

export function tryHandleManualLayoutSketchHoverModuleFlow(
  args: ManualLayoutSketchHoverModuleFlowArgs
): boolean {
  const ctx = resolveManualLayoutSketchHoverModuleContext(args);
  if (!ctx) return false;
  if (tryHandleManualLayoutSketchHoverModuleDividerFlow(ctx)) return true;
  return tryHandleManualLayoutSketchHoverModulePreviewFlow(ctx);
}
