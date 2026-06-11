import type { AppContainer } from '../../../../types/app.js';
import type { OrderPdfDraftLike, OrderPdfSketchAnnotationPageKeyLike } from '../../../../types/build.js';
import {
  paintOrderPdfSketchAnnotationLayer,
  paintOrderPdfSketchStrokes as paintCanonicalOrderPdfSketchStrokes,
  paintOrderPdfSketchTextBoxes as paintCanonicalOrderPdfSketchTextBoxes,
} from '../pdf/order_pdf_sketch_annotations_paint_runtime.js';
import type { ExportOrderPdfDeps } from './export_order_pdf_types.js';
import type {
  OrderPdfSketchStroke,
  OrderPdfSketchTextBox,
} from '../react/pdf/order_pdf_overlay_contracts.js';
import {
  isOrderPdfSketchAnnotationPageKey,
  listOrderPdfSketchStrokes as listCanonicalOrderPdfSketchStrokes,
  listOrderPdfSketchTextBoxes as listCanonicalOrderPdfSketchTextBoxes,
} from '../react/pdf/order_pdf_overlay_sketch_annotation_state_runtime.js';

export type ExportOrderPdfSketchStroke = OrderPdfSketchStroke;
export type ExportOrderPdfSketchTextBox = OrderPdfSketchTextBox;

type BlobCtorLike = typeof Blob;
type UrlApiLike = Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>;
type LoadedSketchCompositeImage = {
  width: number;
  height: number;
  drawSource: CanvasImageSource;
  cleanup: () => void;
};

type UnknownRecord = Record<string, unknown>;

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object';
}

function readWindowWithSketchImageApis(value: unknown): UnknownRecord | null {
  return isUnknownRecord(value) ? value : null;
}

function isBlobCtorLike(value: unknown): value is BlobCtorLike {
  return typeof value === 'function';
}

function isImageCtorLike(value: unknown): value is typeof Image {
  return typeof value === 'function';
}

function isExportOrderPdfSketchEraserTool(
  tool: ExportOrderPdfSketchStroke['tool'] | null | undefined
): boolean {
  return tool === 'eraser';
}

export function listOrderPdfSketchStrokes(
  draft: OrderPdfDraftLike | null | undefined,
  key: OrderPdfSketchAnnotationPageKeyLike
): ExportOrderPdfSketchStroke[] {
  return isOrderPdfSketchAnnotationPageKey(key) ? listCanonicalOrderPdfSketchStrokes(draft, key) : [];
}

export function listOrderPdfSketchTextBoxes(
  draft: OrderPdfDraftLike | null | undefined,
  key: OrderPdfSketchAnnotationPageKeyLike
): ExportOrderPdfSketchTextBox[] {
  return isOrderPdfSketchAnnotationPageKey(key) ? listCanonicalOrderPdfSketchTextBoxes(draft, key) : [];
}

function cloneBytes(bytes: Uint8Array | null | undefined): Uint8Array | null {
  if (!(bytes instanceof Uint8Array)) return null;
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

function getBlobCtor(winMaybe: Window | null | undefined): BlobCtorLike | null {
  const win = readWindowWithSketchImageApis(winMaybe);
  const candidate = win ? Reflect.get(win, 'Blob') : null;
  if (isBlobCtorLike(candidate)) return candidate;
  return typeof Blob === 'function' ? Blob : null;
}

function getUrlApi(winMaybe: Window | null | undefined): UrlApiLike | null {
  const win = readWindowWithSketchImageApis(winMaybe);
  const raw = win ? Reflect.get(win, 'URL') : null;
  if (!raw || (typeof raw !== 'object' && typeof raw !== 'function')) return null;
  const createObjectURL = Reflect.get(raw, 'createObjectURL');
  const revokeObjectURL = Reflect.get(raw, 'revokeObjectURL');
  if (typeof createObjectURL !== 'function' || typeof revokeObjectURL !== 'function') return null;
  return {
    createObjectURL: object => Reflect.apply(createObjectURL, raw, [object]),
    revokeObjectURL: url => Reflect.apply(revokeObjectURL, raw, [url]),
  };
}

function getImageCtor(winMaybe: Window | null | undefined): typeof Image | null {
  const win = readWindowWithSketchImageApis(winMaybe);
  const candidate = win ? Reflect.get(win, 'Image') : null;
  if (isImageCtorLike(candidate)) return candidate;
  return typeof Image === 'function' ? Image : null;
}

async function loadCompositeImageBitmap(args: {
  blob: Blob;
  winMaybe: Window | null | undefined;
}): Promise<LoadedSketchCompositeImage | null> {
  const win = readWindowWithSketchImageApis(args.winMaybe);
  const createImageBitmap = win ? Reflect.get(win, 'createImageBitmap') : null;
  if (typeof createImageBitmap !== 'function') return null;
  const bitmap = await Reflect.apply(createImageBitmap, win, [args.blob]);
  const width = 'width' in bitmap && typeof bitmap.width === 'number' ? bitmap.width : 0;
  const height = 'height' in bitmap && typeof bitmap.height === 'number' ? bitmap.height : 0;
  return {
    width,
    height,
    drawSource: bitmap,
    cleanup: () => {
      if (typeof bitmap.close === 'function') bitmap.close();
    },
  };
}

async function loadCompositeImageElement(args: {
  blob: Blob;
  winMaybe: Window | null | undefined;
}): Promise<LoadedSketchCompositeImage> {
  const urlApi = getUrlApi(args.winMaybe);
  const ImageCtor = getImageCtor(args.winMaybe);
  if (!urlApi || !ImageCtor) throw new Error('Missing URL/Image APIs for sketch annotation export');

  const url = urlApi.createObjectURL(args.blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new ImageCtor();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed loading cached sketch composite PNG'));
      img.src = url;
    });
    return {
      width: image.naturalWidth || image.width || 0,
      height: image.naturalHeight || image.height || 0,
      drawSource: image,
      cleanup: () => {
        image.src = '';
        urlApi.revokeObjectURL(url);
      },
    };
  } catch (error) {
    urlApi.revokeObjectURL(url);
    throw error;
  }
}

async function loadCompositeImage(args: {
  pngBytes: Uint8Array;
  winMaybe: Window | null | undefined;
}): Promise<LoadedSketchCompositeImage> {
  const BlobCtor = getBlobCtor(args.winMaybe);
  if (!BlobCtor) throw new Error('Missing Blob API for sketch annotation export');
  const bytes = cloneBytes(args.pngBytes);
  if (!bytes) throw new Error('Missing PNG bytes for sketch annotation export');
  const buffer = new ArrayBuffer(bytes.byteLength);
  const safeBytes = new Uint8Array(buffer);
  safeBytes.set(bytes);
  const blob = new BlobCtor([buffer], { type: 'image/png' });
  const bitmapLoaded = await loadCompositeImageBitmap({ blob, winMaybe: args.winMaybe });
  if (bitmapLoaded) return bitmapLoaded;
  return await loadCompositeImageElement({ blob, winMaybe: args.winMaybe });
}

export function paintOrderPdfSketchStrokes(args: {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  strokes: readonly ExportOrderPdfSketchStroke[];
}): void {
  paintCanonicalOrderPdfSketchStrokes({
    ctx: args.ctx,
    canvasWidth: args.canvasWidth,
    canvasHeight: args.canvasHeight,
    strokes: args.strokes,
  });
}

export function paintOrderPdfSketchTextBoxes(args: {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  textBoxes: readonly ExportOrderPdfSketchTextBox[];
}): void {
  paintCanonicalOrderPdfSketchTextBoxes({
    ctx: args.ctx,
    canvasWidth: args.canvasWidth,
    canvasHeight: args.canvasHeight,
    textBoxes: args.textBoxes,
  });
}

export function paintOrderPdfSketchAnnotationsForPage(args: {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  draft: OrderPdfDraftLike | null | undefined;
  key: OrderPdfSketchAnnotationPageKeyLike;
}): void {
  const strokes = listOrderPdfSketchStrokes(args.draft, args.key);
  const textBoxes = listOrderPdfSketchTextBoxes(args.draft, args.key);
  paintOrderPdfSketchAnnotationLayer({
    ctx: args.ctx,
    canvasWidth: args.canvasWidth,
    canvasHeight: args.canvasHeight,
    strokes,
    textBoxes,
  });
}

export function compositeOrderPdfSketchStrokesOntoBase(args: {
  targetCtx: CanvasRenderingContext2D;
  createLayerCanvas: (width: number, height: number) => HTMLCanvasElement | null | undefined;
  canvasWidth: number;
  canvasHeight: number;
  strokes: readonly ExportOrderPdfSketchStroke[];
  textBoxes?: readonly ExportOrderPdfSketchTextBox[];
}): boolean {
  const { targetCtx, createLayerCanvas, canvasWidth, canvasHeight } = args;
  const strokes = Array.isArray(args.strokes) ? args.strokes : [];
  const textBoxes = Array.isArray(args.textBoxes) ? args.textBoxes : [];
  if (!canvasWidth || !canvasHeight || (!strokes.length && !textBoxes.length)) return false;

  const safeWidth = Math.max(1, Math.round(canvasWidth));
  const safeHeight = Math.max(1, Math.round(canvasHeight));
  const layerCanvas = createLayerCanvas(safeWidth, safeHeight);
  const layerCtx = layerCanvas?.getContext('2d');
  if (!layerCanvas || !layerCtx) {
    const fallbackStrokes = strokes.some(stroke => isExportOrderPdfSketchEraserTool(stroke.tool))
      ? strokes.filter(stroke => !isExportOrderPdfSketchEraserTool(stroke.tool))
      : strokes;
    if (!fallbackStrokes.length) return false;
    paintOrderPdfSketchStrokes({
      ctx: targetCtx,
      canvasWidth: safeWidth,
      canvasHeight: safeHeight,
      strokes: fallbackStrokes,
    });
    if (textBoxes.length) {
      paintOrderPdfSketchTextBoxes({
        ctx: targetCtx,
        canvasWidth: safeWidth,
        canvasHeight: safeHeight,
        textBoxes,
      });
    }
    return true;
  }

  layerCanvas.width = safeWidth;
  layerCanvas.height = safeHeight;
  paintOrderPdfSketchStrokes({
    ctx: layerCtx,
    canvasWidth: safeWidth,
    canvasHeight: safeHeight,
    strokes,
  });
  if (textBoxes.length) {
    paintOrderPdfSketchTextBoxes({
      ctx: layerCtx,
      canvasWidth: safeWidth,
      canvasHeight: safeHeight,
      textBoxes,
    });
  }
  targetCtx.drawImage(layerCanvas, 0, 0, safeWidth, safeHeight);
  return true;
}

export function createOrderPdfApplySketchAnnotationsToCompositePngOp(
  deps: Pick<ExportOrderPdfDeps, '_createDomCanvas' | '_exportReportThrottled' | 'getWindowMaybe'>,
  canvasToPngBytes: (canvas: HTMLCanvasElement) => Promise<Uint8Array>
) {
  return async function applySketchAnnotationsToCompositePngBytes(args: {
    app: AppContainer;
    draft: OrderPdfDraftLike | null | undefined;
    key: OrderPdfSketchAnnotationPageKeyLike;
    pngBytes: Uint8Array | null | undefined;
  }): Promise<Uint8Array | null> {
    const pngBytes = cloneBytes(args.pngBytes);
    if (!pngBytes?.byteLength) return pngBytes;
    const strokes = listOrderPdfSketchStrokes(args.draft, args.key);
    const textBoxes = listOrderPdfSketchTextBoxes(args.draft, args.key);
    if (!strokes.length && !textBoxes.length) return pngBytes;

    const winMaybe = deps.getWindowMaybe(args.app);
    let loaded: LoadedSketchCompositeImage | null = null;
    try {
      loaded = await loadCompositeImage({ pngBytes, winMaybe });
      const width = Math.max(1, Math.round(loaded.width));
      const height = Math.max(1, Math.round(loaded.height));
      const canvas = deps._createDomCanvas(args.app, width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return pngBytes;
      ctx.drawImage(loaded.drawSource, 0, 0, width, height);
      compositeOrderPdfSketchStrokesOntoBase({
        targetCtx: ctx,
        createLayerCanvas: (layerWidth, layerHeight) =>
          deps._createDomCanvas(args.app, layerWidth, layerHeight),
        canvasWidth: width,
        canvasHeight: height,
        strokes,
        textBoxes,
      });
      return await canvasToPngBytes(canvas);
    } catch (error) {
      deps._exportReportThrottled(args.app, 'buildOrderPdfInteractive.applySketchAnnotations', error, {
        throttleMs: 1000,
      });
      return pngBytes;
    } finally {
      loaded?.cleanup();
    }
  };
}
