import type { MutableRefObject } from 'react';

import type { OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';
import type { OrderPdfSketchTextBoxInteractionPreview } from './order_pdf_overlay_sketch_text_box_interaction_preview.js';
import type { OrderPdfSketchTextCreateSession } from './order_pdf_overlay_sketch_text_box_create_interaction.js';

export type OrderPdfSketchClientPoint = { clientX: number; clientY: number };

export type OrderPdfSketchTextLayerInteractionSession = OrderPdfSketchTextBoxInteractionPreview;
export type OrderPdfSketchTextLayerCreateSession = OrderPdfSketchTextCreateSession;

export type OrderPdfSketchTextLayerInteractionSessionArgs = {
  hostRef: MutableRefObject<HTMLDivElement | null>;
  persistLiveTextBox: (textBox: OrderPdfSketchTextBox, allowDelete: boolean) => boolean;
};

export type OrderPdfSketchTextLayerInteractionSessionResult = {
  interactionPreviewBox: OrderPdfSketchTextBox | null;
  clearInteractionPreviewBox: () => void;
  resetInteractionSession: () => void;
  setInteractionSession: (session: OrderPdfSketchTextLayerInteractionSession | null) => void;
};

export type OrderPdfSketchTextLayerCreateSessionArgs = {
  hostRef: MutableRefObject<HTMLDivElement | null>;
};

export type OrderPdfSketchTextLayerCreateSessionResult = {
  createSession: OrderPdfSketchTextLayerCreateSession | null;
  createSessionRef: MutableRefObject<OrderPdfSketchTextLayerCreateSession | null>;
  cancelScheduledCreateSessionFrame: () => void;
  flushCreateSessionPoint: (
    point: OrderPdfSketchClientPoint | null
  ) => OrderPdfSketchTextLayerCreateSession | null;
  resetCreateSession: () => void;
  scheduleCreateSessionPoint: (point: OrderPdfSketchClientPoint) => void;
  setCreateSessionState: (session: OrderPdfSketchTextLayerCreateSession | null) => void;
};
