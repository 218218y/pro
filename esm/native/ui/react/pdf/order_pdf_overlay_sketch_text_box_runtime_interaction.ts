import type { OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';
import { fitOrderPdfSketchTextBoxRect } from './order_pdf_overlay_sketch_text_box_runtime_geometry.js';
import {
  ORDER_PDF_SKETCH_TEXT_BOX_MIN_HEIGHT,
  ORDER_PDF_SKETCH_TEXT_BOX_MIN_WIDTH,
  ORDER_PDF_SKETCH_TEXT_BOX_RESIZE_DIRECTIONS,
  type OrderPdfSketchTextBoxInteraction,
  type OrderPdfSketchTextBoxResizeDirection,
} from './order_pdf_overlay_sketch_text_box_runtime_types.js';

const ORDER_PDF_SKETCH_TEXT_BOX_RESIZE_DIRECTION_SET: ReadonlySet<string> = new Set(
  ORDER_PDF_SKETCH_TEXT_BOX_RESIZE_DIRECTIONS
);

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
