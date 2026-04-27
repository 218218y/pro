export const ORDER_PDF_SKETCH_REFERENCE_PAGE_WIDTH = 595;
export const ORDER_PDF_SKETCH_DEFAULT_TEXT_BOX_WIDTH = 0.28;
export const ORDER_PDF_SKETCH_DEFAULT_TEXT_BOX_HEIGHT = 0.14;
export const ORDER_PDF_SKETCH_MIN_TEXT_BOX_WIDTH = 0.14;
export const ORDER_PDF_SKETCH_MIN_TEXT_BOX_HEIGHT = 0.08;
export const ORDER_PDF_SKETCH_DEFAULT_TEXT_BOX_FONT_SIZE = 18;
export const ORDER_PDF_SKETCH_MIN_TEXT_BOX_FONT_SIZE = 12;

export type OrderPdfSketchPaintTool = 'pen' | 'marker' | 'eraser' | 'line' | 'square' | 'circle' | 'ellipse';

export type OrderPdfSketchPaintPointLike = {
  x: number;
  y: number;
};

export type OrderPdfSketchPaintStrokeLike = {
  tool: OrderPdfSketchPaintTool;
  color: string;
  width: number;
  points: readonly OrderPdfSketchPaintPointLike[];
};

export type OrderPdfSketchPaintTextBoxLike = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fontSize: number;
  bold?: boolean;
  text: string;
};

type UnknownRecord = Record<string, unknown>;

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object';
}

function asUnknownRecord(value: unknown): UnknownRecord | null {
  return isUnknownRecord(value) ? value : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

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

function isOrderPdfSketchPaintTool(value: unknown): value is OrderPdfSketchPaintTool {
  return (
    value === 'pen' ||
    value === 'marker' ||
    value === 'eraser' ||
    value === 'line' ||
    value === 'square' ||
    value === 'circle' ||
    value === 'ellipse'
  );
}

function isOrderPdfSketchPaintPointLike(value: unknown): value is OrderPdfSketchPaintPointLike {
  const point = asUnknownRecord(value);
  return !!point && isFiniteNumber(point.x) && isFiniteNumber(point.y);
}

function isOrderPdfSketchPaintStrokeLike(value: unknown): value is OrderPdfSketchPaintStrokeLike {
  const stroke = asUnknownRecord(value);
  if (!stroke) return false;
  return (
    isOrderPdfSketchPaintTool(stroke.tool) &&
    typeof stroke.color === 'string' &&
    !!stroke.color.trim() &&
    isFiniteNumber(stroke.width) &&
    stroke.width > 0 &&
    Array.isArray(stroke.points) &&
    stroke.points.length > 0 &&
    stroke.points.every(isOrderPdfSketchPaintPointLike)
  );
}

function isOrderPdfSketchPaintTextBoxLike(value: unknown): value is OrderPdfSketchPaintTextBoxLike {
  const textBox = asUnknownRecord(value);
  if (!textBox) return false;
  if (!isFiniteNumber(textBox.x) || !isFiniteNumber(textBox.y)) return false;
  if (!isFiniteNumber(textBox.width) || textBox.width <= 0) return false;
  if (!isFiniteNumber(textBox.height) || textBox.height <= 0) return false;
  if (typeof textBox.color !== 'string' || !textBox.color.trim()) return false;
  if (!isFiniteNumber(textBox.fontSize) || textBox.fontSize <= 0) return false;
  if (typeof textBox.bold !== 'undefined' && typeof textBox.bold !== 'boolean') return false;
  return typeof textBox.text === 'string';
}

function isOrderPdfSketchPaintEraserTool(tool: OrderPdfSketchPaintTool | null | undefined): boolean {
  return tool === 'eraser';
}

function hexToRgba(color: string, alpha: number): string {
  const raw = String(color || '').trim();
  const hex = raw.startsWith('#') ? raw.slice(1) : raw;
  if (hex.length !== 3 && hex.length !== 6) return color;
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map(ch => ch + ch)
          .join('')
      : hex;
  const num = Number.parseInt(full, 16);
  if (!Number.isFinite(num)) return color;
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function normalizeOrderPdfSketchTextValue(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n').replace(/\r/g, '\n') : '';
}

export function normalizeOrderPdfSketchFontSize(fontSize: unknown): number {
  return Math.max(
    ORDER_PDF_SKETCH_MIN_TEXT_BOX_FONT_SIZE,
    Number(fontSize) || ORDER_PDF_SKETCH_DEFAULT_TEXT_BOX_FONT_SIZE
  );
}

export function fitOrderPdfSketchTextBoxRect(args: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Pick<OrderPdfSketchPaintTextBoxLike, 'x' | 'y' | 'width' | 'height'> {
  const width = clampMinMax(args.width, ORDER_PDF_SKETCH_MIN_TEXT_BOX_WIDTH, 1);
  const height = clampMinMax(args.height, ORDER_PDF_SKETCH_MIN_TEXT_BOX_HEIGHT, 1);
  const x = clampMinMax(clamp01(args.x), 0, Math.max(0, 1 - width));
  const y = clampMinMax(clamp01(args.y), 0, Math.max(0, 1 - height));
  return { x, y, width, height };
}

export function scaleOrderPdfSketchWidth(width: number, canvasWidth: number): number {
  const safeWidth = Math.max(1, Number(width) || 1);
  const scale = Math.max(0.5, canvasWidth / ORDER_PDF_SKETCH_REFERENCE_PAGE_WIDTH);
  return safeWidth * scale;
}

export function scaleOrderPdfSketchFontSize(fontSize: number, canvasWidth: number): number {
  return (
    normalizeOrderPdfSketchFontSize(fontSize) *
    Math.max(0.5, canvasWidth / ORDER_PDF_SKETCH_REFERENCE_PAGE_WIDTH)
  );
}

function measureOrderPdfSketchTextWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number
): number {
  if (typeof ctx.measureText === 'function') return ctx.measureText(text).width;
  return String(text).length * fontSize * 0.6;
}

export function wrapOrderPdfSketchTextLines(args: {
  ctx: CanvasRenderingContext2D;
  text: string;
  maxWidth: number;
  fontSize: number;
}): string[] {
  const paragraphs = normalizeOrderPdfSketchTextValue(args.text).split('\n');
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (!current || measureOrderPdfSketchTextWidth(args.ctx, candidate, args.fontSize) <= args.maxWidth) {
        current = candidate;
        continue;
      }
      lines.push(current);
      current = word;
    }
    if (current) lines.push(current);
  }
  return lines.length ? lines : [''];
}

export function paintOrderPdfSketchStrokes<TStroke extends OrderPdfSketchPaintStrokeLike>(args: {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  strokes: readonly TStroke[];
}): void {
  const { ctx, canvasWidth, canvasHeight } = args;
  const strokes = Array.isArray(args.strokes) ? args.strokes.filter(isOrderPdfSketchPaintStrokeLike) : [];
  if (!canvasWidth || !canvasHeight || !strokes.length) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const stroke of strokes) {
    const points = stroke.points;
    const first = points[0];
    if (!first) continue;
    const isEraser = isOrderPdfSketchPaintEraserTool(stroke.tool);

    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(first.x * canvasWidth, first.y * canvasHeight);
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      ctx.lineTo(point.x * canvasWidth, point.y * canvasHeight);
    }

    if (points.length === 1) {
      const radius = Math.max(1, scaleOrderPdfSketchWidth(stroke.width, canvasWidth) / 2);
      ctx.arc(first.x * canvasWidth, first.y * canvasHeight, radius, 0, Math.PI * 2, false);
      ctx.fillStyle = isEraser
        ? '#000000'
        : stroke.tool === 'marker'
          ? hexToRgba(stroke.color, 0.35)
          : stroke.color;
      ctx.fill();
      continue;
    }

    ctx.lineWidth = scaleOrderPdfSketchWidth(stroke.width, canvasWidth);
    ctx.strokeStyle = isEraser
      ? '#000000'
      : stroke.tool === 'marker'
        ? hexToRgba(stroke.color, 0.32)
        : stroke.color;
    ctx.stroke();
  }

  ctx.restore();
}

export function paintOrderPdfSketchTextBoxes<TTextBox extends OrderPdfSketchPaintTextBoxLike>(args: {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  textBoxes: readonly TTextBox[];
}): void {
  const { ctx, canvasWidth, canvasHeight } = args;
  const textBoxes = Array.isArray(args.textBoxes)
    ? args.textBoxes.filter(isOrderPdfSketchPaintTextBoxLike)
    : [];
  if (!canvasWidth || !canvasHeight || !textBoxes.length) return;

  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';

  for (const textBox of textBoxes) {
    const text = normalizeOrderPdfSketchTextValue(textBox.text).trim();
    if (!text) continue;
    const left = textBox.x * canvasWidth;
    const top = textBox.y * canvasHeight;
    const width = Math.max(1, textBox.width * canvasWidth);
    const height = Math.max(1, textBox.height * canvasHeight);
    const padding = Math.max(6, Math.round(Math.min(width, height) * 0.08));
    const fontSize = scaleOrderPdfSketchFontSize(textBox.fontSize, canvasWidth);
    const lineHeight = Math.max(fontSize * 1.35, fontSize + 6);
    const lines = wrapOrderPdfSketchTextLines({
      ctx,
      text,
      maxWidth: Math.max(1, width - padding * 2),
      fontSize,
    });

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = textBox.color;
    ctx.font = `${textBox.bold ? '700 ' : ''}${fontSize}px Arial, sans-serif`;
    let y = top + padding;
    for (const line of lines) {
      if (y + lineHeight > top + height - padding + 1) break;
      ctx.fillText(line, left + width - padding, y);
      y += lineHeight;
    }
  }

  ctx.restore();
}

export function paintOrderPdfSketchAnnotationLayer(args: {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  strokes: readonly OrderPdfSketchPaintStrokeLike[];
  textBoxes?: readonly OrderPdfSketchPaintTextBoxLike[];
}): void {
  const { ctx, canvasWidth, canvasHeight } = args;
  const strokes = Array.isArray(args.strokes) ? args.strokes : [];
  const textBoxes = Array.isArray(args.textBoxes) ? args.textBoxes : [];
  if (!canvasWidth || !canvasHeight || (!strokes.length && !textBoxes.length)) return;
  if (strokes.length) {
    paintOrderPdfSketchStrokes({
      ctx,
      canvasWidth,
      canvasHeight,
      strokes,
    });
  }
  if (textBoxes.length) {
    paintOrderPdfSketchTextBoxes({
      ctx,
      canvasWidth,
      canvasHeight,
      textBoxes,
    });
  }
}
