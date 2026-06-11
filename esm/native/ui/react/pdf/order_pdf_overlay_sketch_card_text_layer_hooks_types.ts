import type { CSSProperties, MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';

import type {
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchTextBox,
  OrderPdfSketchTool,
} from './order_pdf_overlay_contracts.js';
import type { DrawingRect } from './order_pdf_overlay_sketch_panel_runtime.js';

export type OrderPdfSketchCardTextLayerArgs = {
  entryKey: OrderPdfSketchAnnotationPageKey;
  hostRef: MutableRefObject<HTMLDivElement | null>;
  tool: OrderPdfSketchTool;
  textBoxes: OrderPdfSketchTextBox[];
  getHostRect: (mode?: 'cached' | 'fresh') => DrawingRect | null;
  onSelect: (key: OrderPdfSketchAnnotationPageKey) => void;
  onUpsertTextBox: (key: OrderPdfSketchAnnotationPageKey, textBox: OrderPdfSketchTextBox) => void;
  onDeleteTextBox: (key: OrderPdfSketchAnnotationPageKey, id: string) => void;
  onEnterTextMode: () => void;
  onExitTextMode: () => void;
};

export type OrderPdfSketchCardTextLayerResult = {
  activeTextBoxId: string | null;
  colorPaletteOpen: boolean;
  createRectStyle: CSSProperties | null;
  registerEditorRef: (id: string, element: HTMLDivElement | null) => void;
  renderedTextBoxes: OrderPdfSketchTextBox[];
  sizePaletteOpen: boolean;
  activateTextBox: (id: string) => void;
  clearActiveTextBox: () => void;
  commitTextBoxById: (id: string) => boolean;
  deleteTextBox: (id: string) => void;
  handleApplyActiveTextBoxPatch: (patch: Partial<OrderPdfSketchTextBox>) => void;
  handleBoxPointerDown: (textBox: OrderPdfSketchTextBox, event: ReactPointerEvent<HTMLDivElement>) => void;
  handleCanvasPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => boolean;
  handleCanvasPointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => boolean;
  handleCanvasPointerFinish: (event: ReactPointerEvent<HTMLCanvasElement>) => boolean;
  handleResizeHandlePointerDown: (
    textBox: OrderPdfSketchTextBox,
    dir: string,
    event: ReactPointerEvent<HTMLDivElement>
  ) => void;
  toggleColorPalette: () => void;
  toggleSizePalette: () => void;
};

export type OrderPdfSketchTextLayerEditorRefs = Record<string, HTMLDivElement | null>;
