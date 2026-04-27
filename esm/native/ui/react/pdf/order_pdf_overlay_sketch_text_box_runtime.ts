import type { OrderPdfSketchPoint, OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';

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

const ORDER_PDF_SKETCH_TEXT_BOX_RESIZE_DIRECTION_SET: ReadonlySet<string> = new Set(
  ORDER_PDF_SKETCH_TEXT_BOX_RESIZE_DIRECTIONS
);

export function areOrderPdfSketchTextBoxesEqual(
  prev: OrderPdfSketchTextBox | null | undefined,
  next: OrderPdfSketchTextBox | null | undefined
): boolean {
  if (prev === next) return true;
  if (!prev || !next) return false;
  return (
    prev.id === next.id &&
    Object.is(prev.createdAt, next.createdAt) &&
    Object.is(prev.x, next.x) &&
    Object.is(prev.y, next.y) &&
    Object.is(prev.width, next.width) &&
    Object.is(prev.height, next.height) &&
    prev.color === next.color &&
    Object.is(prev.fontSize, next.fontSize) &&
    !!prev.bold === !!next.bold &&
    prev.text === next.text
  );
}

export function shouldUpsertOrderPdfSketchTextBox(args: {
  current: OrderPdfSketchTextBox | null | undefined;
  next: OrderPdfSketchTextBox;
}): boolean {
  return !areOrderPdfSketchTextBoxesEqual(args.current, args.next);
}

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

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function clampMinMax(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value <= min) return min;
  if (value >= max) return max;
  return value;
}

export function fitOrderPdfSketchTextBoxRect(args: OrderPdfSketchTextBoxRect): OrderPdfSketchTextBoxRect {
  const width = clampMinMax(args.width, ORDER_PDF_SKETCH_TEXT_BOX_MIN_WIDTH, 1);
  const height = clampMinMax(args.height, ORDER_PDF_SKETCH_TEXT_BOX_MIN_HEIGHT, 1);
  const x = clampMinMax(args.x, 0, Math.max(0, 1 - width));
  const y = clampMinMax(args.y, 0, Math.max(0, 1 - height));
  return { x, y, width, height };
}

export function buildOrderPdfSketchTextBoxCreateRect(args: {
  start: OrderPdfSketchPoint;
  end: OrderPdfSketchPoint;
}): OrderPdfSketchTextBoxRect {
  const startX = clamp01(args.start.x);
  const startY = clamp01(args.start.y);
  const endX = clamp01(args.end.x);
  const endY = clamp01(args.end.y);
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const right = Math.max(startX, endX);
  const bottom = Math.max(startY, endY);
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export function shouldCreateOrderPdfSketchTextBoxFromPointerDrag(args: {
  startClientX: number;
  startClientY: number;
  endClientX: number;
  endClientY: number;
  thresholdPx?: number | null;
}): boolean {
  const threshold = Math.max(
    0,
    Number(args.thresholdPx) || ORDER_PDF_SKETCH_TEXT_BOX_CREATE_POINTER_THRESHOLD_PX
  );
  const dx = Math.abs(args.endClientX - args.startClientX);
  const dy = Math.abs(args.endClientY - args.startClientY);
  return dx >= threshold || dy >= threshold;
}

export function createOrderPdfSketchTextBoxMoveInteraction(args: {
  textBox: OrderPdfSketchTextBox;
  pointerId: number;
  clientX: number;
  clientY: number;
}): Extract<OrderPdfSketchTextBoxInteraction, { kind: 'move' }> {
  const { textBox, pointerId, clientX, clientY } = args;
  return {
    kind: 'move',
    pointerId,
    startClientX: clientX,
    startClientY: clientY,
    startX: textBox.x,
    startY: textBox.y,
    startWidth: textBox.width,
    startHeight: textBox.height,
  };
}

export function createOrderPdfSketchTextBoxResizeInteraction(args: {
  textBox: OrderPdfSketchTextBox;
  dir: OrderPdfSketchTextBoxResizeDirection;
  pointerId: number;
  clientX: number;
  clientY: number;
}): Extract<OrderPdfSketchTextBoxInteraction, { kind: 'resize' }> {
  const { textBox, dir, pointerId, clientX, clientY } = args;
  return {
    kind: 'resize',
    dir,
    pointerId,
    startClientX: clientX,
    startClientY: clientY,
    startX: textBox.x,
    startY: textBox.y,
    startWidth: textBox.width,
    startHeight: textBox.height,
  };
}

export function isOrderPdfSketchTextBoxResizeDirection(
  value: string | null | undefined
): value is OrderPdfSketchTextBoxResizeDirection {
  return typeof value === 'string' && ORDER_PDF_SKETCH_TEXT_BOX_RESIZE_DIRECTION_SET.has(value);
}

export function createOrderPdfSketchTextBoxPointerInteraction(args: {
  textBox: OrderPdfSketchTextBox;
  dir?: string | null;
  pointerId: number;
  clientX: number;
  clientY: number;
}): OrderPdfSketchTextBoxInteraction {
  const { textBox, pointerId, clientX, clientY } = args;
  const dir = typeof args.dir === 'string' ? args.dir.trim().toLowerCase() : '';
  if (!isOrderPdfSketchTextBoxResizeDirection(dir)) {
    return createOrderPdfSketchTextBoxMoveInteraction({ textBox, pointerId, clientX, clientY });
  }
  return createOrderPdfSketchTextBoxResizeInteraction({ textBox, dir, pointerId, clientX, clientY });
}

export function applyOrderPdfSketchTextBoxInteraction(args: {
  textBox: OrderPdfSketchTextBox;
  interaction: OrderPdfSketchTextBoxInteraction;
  surfaceWidth: number;
  surfaceHeight: number;
  clientX: number;
  clientY: number;
}): OrderPdfSketchTextBox {
  const { textBox, interaction, surfaceWidth, surfaceHeight, clientX, clientY } = args;
  if (
    !Number.isFinite(surfaceWidth) ||
    surfaceWidth <= 0 ||
    !Number.isFinite(surfaceHeight) ||
    surfaceHeight <= 0
  ) {
    return textBox;
  }

  const dx = (clientX - interaction.startClientX) / surfaceWidth;
  const dy = (clientY - interaction.startClientY) / surfaceHeight;

  if (interaction.kind === 'move') {
    const nextRect = fitOrderPdfSketchTextBoxRect({
      x: interaction.startX + dx,
      y: interaction.startY + dy,
      width: interaction.startWidth,
      height: interaction.startHeight,
    });
    return Object.is(nextRect.x, textBox.x) &&
      Object.is(nextRect.y, textBox.y) &&
      Object.is(nextRect.width, textBox.width) &&
      Object.is(nextRect.height, textBox.height)
      ? textBox
      : {
          ...textBox,
          ...nextRect,
        };
  }

  let x = interaction.startX;
  let y = interaction.startY;
  let width = interaction.startWidth;
  let height = interaction.startHeight;

  if (interaction.dir.includes('e'))
    width = Math.max(ORDER_PDF_SKETCH_TEXT_BOX_MIN_WIDTH, interaction.startWidth + dx);
  if (interaction.dir.includes('s'))
    height = Math.max(ORDER_PDF_SKETCH_TEXT_BOX_MIN_HEIGHT, interaction.startHeight + dy);

  if (interaction.dir.includes('w')) {
    const nextWidth = Math.max(ORDER_PDF_SKETCH_TEXT_BOX_MIN_WIDTH, interaction.startWidth - dx);
    const nextX = interaction.startX + dx;
    width = nextWidth;
    x = nextX;
  }

  if (interaction.dir.includes('n')) {
    const nextHeight = Math.max(ORDER_PDF_SKETCH_TEXT_BOX_MIN_HEIGHT, interaction.startHeight - dy);
    const nextY = interaction.startY + dy;
    height = nextHeight;
    y = nextY;
  }

  const nextRect = fitOrderPdfSketchTextBoxRect({ x, y, width, height });
  return Object.is(nextRect.x, textBox.x) &&
    Object.is(nextRect.y, textBox.y) &&
    Object.is(nextRect.width, textBox.width) &&
    Object.is(nextRect.height, textBox.height)
    ? textBox
    : {
        ...textBox,
        ...nextRect,
      };
}

export function isOrderPdfSketchTextEmpty(text: string | null | undefined): boolean {
  return !String(text || '').trim();
}
