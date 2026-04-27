import type { OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';
import type { DrawingRect } from './order_pdf_overlay_sketch_panel_runtime.js';
import {
  buildOrderPdfDrawingPointFromClient,
  resolveOrderPdfSketchCanvasPointerIntent,
} from './order_pdf_overlay_sketch_panel_runtime.js';
import {
  buildOrderPdfSketchTextBoxCreateRect,
  createOrderPdfSketchTextBoxPointerInteraction,
  shouldCreateOrderPdfSketchTextBoxFromPointerDrag,
} from './order_pdf_overlay_sketch_text_box_runtime.js';
import {
  createOrderPdfSketchTextBoxInteractionPreview,
  type OrderPdfSketchTextBoxInteractionPreview,
} from './order_pdf_overlay_sketch_text_box_interaction_preview.js';
import {
  createOrderPdfSketchTextCreateSession,
  resolveOrderPdfSketchTextCreateSessionPoint,
  type OrderPdfSketchTextCreateSession,
} from './order_pdf_overlay_sketch_text_box_create_interaction.js';
import { createOrderPdfSketchTextBoxFromRect } from './order_pdf_overlay_sketch_annotation_state_runtime.js';

export type OrderPdfSketchTextLayerCanvasPointerAction =
  | { kind: 'draw' }
  | { kind: 'commit-exit'; activeTextBoxId: string }
  | { kind: 'start-create'; session: OrderPdfSketchTextCreateSession }
  | { kind: 'noop' };

export type OrderPdfSketchTextLayerCreateCommitAction =
  | { kind: 'noop' }
  | { kind: 'create'; textBox: OrderPdfSketchTextBox };

function isElementLike(target: EventTarget | null): target is Element {
  if (!target || typeof target !== 'object') return false;
  if (!Reflect.has(target, 'closest')) return false;
  return typeof Reflect.get(target, 'closest') === 'function';
}

export function isOrderPdfSketchTextBoxChromeTarget(target: EventTarget | null): target is Element {
  if (!isElementLike(target)) return false;
  return Boolean(
    target.closest('.floating-toolbar') ||
    target.closest('.resize-handle') ||
    target.closest('.editor') ||
    target.closest('.note-hit')
  );
}

export function createOrderPdfSketchTextLayerInteractionPreview(args: {
  textBox: OrderPdfSketchTextBox;
  liveText: string;
  dir: string | null;
  pointerId: number;
  clientX: number;
  clientY: number;
  surfaceRect: DrawingRect | null;
}): { liveSource: OrderPdfSketchTextBox; previewSession: OrderPdfSketchTextBoxInteractionPreview } | null {
  const { textBox, liveText, dir, pointerId, clientX, clientY, surfaceRect } = args;
  if (!surfaceRect) return null;
  const liveSource = { ...textBox, text: liveText };
  return {
    liveSource,
    previewSession: createOrderPdfSketchTextBoxInteractionPreview({
      sourceBox: liveSource,
      interaction: createOrderPdfSketchTextBoxPointerInteraction({
        textBox: liveSource,
        dir,
        pointerId,
        clientX,
        clientY,
      }),
      surfaceWidth: surfaceRect.width,
      surfaceHeight: surfaceRect.height,
    }),
  };
}

export function resolveOrderPdfSketchTextLayerCanvasPointerAction(args: {
  activeTextBoxId: string | null;
  textMode: boolean;
  pointerId: number;
  clientX: number;
  clientY: number;
  rect: DrawingRect | null;
}): OrderPdfSketchTextLayerCanvasPointerAction {
  const { activeTextBoxId, clientX, clientY, pointerId, rect, textMode } = args;
  const pointerIntent = resolveOrderPdfSketchCanvasPointerIntent({
    tool: textMode ? 'text' : 'pen',
    activeTextBoxId,
  });
  if (pointerIntent === 'draw') return { kind: 'draw' };
  if (pointerIntent === 'text:commit-exit' && activeTextBoxId) {
    return { kind: 'commit-exit', activeTextBoxId };
  }
  const point = buildOrderPdfDrawingPointFromClient({ clientX, clientY, rect });
  if (!point) return { kind: 'noop' };
  const session = createOrderPdfSketchTextCreateSession({
    pointerId,
    start: point,
    startClientX: clientX,
    startClientY: clientY,
    surfaceRect: rect,
  });
  return session ? { kind: 'start-create', session } : { kind: 'noop' };
}

export function resolveOrderPdfSketchTextLayerCreateCommitAction(args: {
  session: OrderPdfSketchTextCreateSession;
  clientX: number;
  clientY: number;
  color?: string;
  fontSize?: number;
  bold?: boolean;
}): OrderPdfSketchTextLayerCreateCommitAction {
  const { clientX, clientY, session } = args;
  if (
    !shouldCreateOrderPdfSketchTextBoxFromPointerDrag({
      startClientX: session.startClientX,
      startClientY: session.startClientY,
      endClientX: clientX,
      endClientY: clientY,
    })
  ) {
    return { kind: 'noop' };
  }

  const finalPoint = resolveOrderPdfSketchTextCreateSessionPoint({
    session,
    clientX,
    clientY,
  });
  const createRect = buildOrderPdfSketchTextBoxCreateRect({ start: session.start, end: finalPoint });
  const fontSize = typeof args.fontSize === 'number' && Number.isFinite(args.fontSize) ? args.fontSize : 18;
  return {
    kind: 'create',
    textBox: createOrderPdfSketchTextBoxFromRect({
      rect: createRect,
      color: args.color || '#000000',
      fontSize,
      bold: !!args.bold,
    }),
  };
}
