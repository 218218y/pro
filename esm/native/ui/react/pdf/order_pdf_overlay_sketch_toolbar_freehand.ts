import type { OrderPdfSketchFreehandTool } from './order_pdf_overlay_sketch_panel_controller.js';
import type { FreehandToolDefinition } from './order_pdf_overlay_sketch_toolbar_types.js';

export const FREEHAND_TOOLS: readonly FreehandToolDefinition[] = [
  { tool: 'pen', label: 'עט', iconClassName: 'fas fa-pen' },
  { tool: 'marker', label: 'מרקר', iconClassName: 'fas fa-highlighter' },
];

export function resolveFreehandToolDefinition(tool: OrderPdfSketchFreehandTool): FreehandToolDefinition {
  return FREEHAND_TOOLS.find(definition => definition.tool === tool) || FREEHAND_TOOLS[0];
}
