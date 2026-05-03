import type { OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';

export const ORDER_PDF_SKETCH_TEXT_BOX_MIN_WIDTH = 0.14;
export const ORDER_PDF_SKETCH_TEXT_BOX_MIN_HEIGHT = 0.08;
export const ORDER_PDF_SKETCH_TEXT_BOX_CREATE_POINTER_THRESHOLD_PX = 6;

export type OrderPdfSketchTextBoxRect = Pick<OrderPdfSketchTextBox, 'x' | 'y' | 'width' | 'height'>;
export type OrderPdfSketchTextBoxHandleDirection = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
export type OrderPdfSketchTextBoxResizeDirection = 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const ORDER_PDF_SKETCH_TEXT_BOX_HANDLE_DIRECTIONS: readonly OrderPdfSketchTextBoxHandleDirection[] =
  Object.freeze(['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw']);
export const ORDER_PDF_SKETCH_TEXT_BOX_RESIZE_DIRECTIONS: readonly OrderPdfSketchTextBoxResizeDirection[] =
  Object.freeze(['e', 'w', 'ne', 'nw', 'se', 'sw']);
export const ORDER_PDF_SKETCH_TEXT_BOX_MOVE_HANDLE_DIRECTIONS: readonly ('n' | 's')[] = Object.freeze([
  'n',
  's',
]);

export type OrderPdfSketchTextBoxInteraction =
  | {
      kind: 'move';
      pointerId: number;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
      startWidth: number;
      startHeight: number;
    }
  | {
      kind: 'resize';
      dir: OrderPdfSketchTextBoxResizeDirection;
      pointerId: number;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
      startWidth: number;
      startHeight: number;
    };
