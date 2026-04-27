import type { OrderPdfSketchTool } from './order_pdf_overlay_contracts.js';

export type OrderPdfSketchRememberedTool = Exclude<OrderPdfSketchTool, 'text'>;
export type OrderPdfSketchCanvasPointerIntent = 'draw' | 'text:create' | 'text:commit-exit';

export type OrderPdfSketchControlState = {
  drawPaletteOpen: boolean;
  widthPaletteOpen: boolean;
  colorPaletteOpen: boolean;
  colorControlDisabled: boolean;
  widthControlDisabled: boolean;
};

export function resolveOrderPdfSketchToolTransition(args: {
  lastNonTextTool: OrderPdfSketchRememberedTool;
  nextTool: OrderPdfSketchTool;
}): {
  nextTool: OrderPdfSketchTool;
  nextLastNonTextTool: OrderPdfSketchRememberedTool;
} {
  const { lastNonTextTool, nextTool } = args;
  return {
    nextTool,
    nextLastNonTextTool: nextTool === 'text' ? lastNonTextTool : nextTool,
  };
}

export function resolveOrderPdfSketchExitTextTool(
  lastNonTextTool: OrderPdfSketchRememberedTool
): OrderPdfSketchRememberedTool {
  return lastNonTextTool;
}

export function resolveOrderPdfSketchCanvasPointerIntent(args: {
  tool: OrderPdfSketchTool;
  activeTextBoxId: string | null | undefined;
}): OrderPdfSketchCanvasPointerIntent {
  if (args.tool !== 'text') return 'draw';
  return args.activeTextBoxId ? 'text:commit-exit' : 'text:create';
}

export function resolveOrderPdfSketchControlState(args: {
  tool: OrderPdfSketchTool;
  activePalette: 'draw' | 'width' | 'color' | null;
}): OrderPdfSketchControlState {
  const { tool, activePalette } = args;
  const colorControlDisabled = tool === 'eraser' || tool === 'text';
  const widthControlDisabled = tool === 'text';
  return {
    drawPaletteOpen: activePalette === 'draw',
    widthPaletteOpen: activePalette === 'width',
    colorPaletteOpen: activePalette === 'color',
    colorControlDisabled,
    widthControlDisabled,
  };
}
