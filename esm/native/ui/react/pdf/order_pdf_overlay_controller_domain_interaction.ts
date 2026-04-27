import type {
  InputChangeEventLike,
  DragEventLike,
  StagePointerEventLike,
} from './order_pdf_overlay_interactions_shared.js';

import type { InlineDetailsConfirmState } from './order_pdf_overlay_contracts.js';
import type { UiFeedbackLike } from './order_pdf_overlay_controller_domain_feedback.js';

export type StageGestureState = {
  down: boolean;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
  startedOnEmpty: boolean;
};

export type InteractionApi = {
  captureStagePointerDown: (gesture: StageGestureState, event: StagePointerEventLike) => void;
  captureStagePointerMove: (gesture: StageGestureState, event: StagePointerEventLike) => void;
  createInitialStageGesture: () => StageGestureState;
  finishStagePointerUp: (gesture: StageGestureState, event: StagePointerEventLike) => boolean;
  installOrderPdfOverlayFocusTrap: (args: {
    open: boolean;
    docMaybe: Document | null;
    winMaybe: Window | null;
    overlayRef: { current: HTMLDivElement | null };
    orderNoInputRef: { current: HTMLInputElement | null };
    prevFocusRef: { current: HTMLElement | null };
    didInitialFocusRef: { current: boolean };
    reportNonFatal: (op: string, err: unknown, dedupeMs?: number) => void;
  }) => () => void;
  installOrderPdfOverlayKeyboardGuards: (args: {
    open: boolean;
    docMaybe: Document | null;
    winMaybe: Window | null;
    inlineConfirm: InlineDetailsConfirmState | null;
    confirmInlineOk: () => void;
    confirmInlineCancel: () => void;
    close: () => void;
    reportNonFatal: (op: string, err: unknown, dedupeMs?: number) => void;
  }) => () => void;
  loadPdfFileFromDrop: (args: {
    event: DragEventLike;
    fb: UiFeedbackLike;
    loadPdfIntoEditor: (file: File) => Promise<unknown>;
  }) => Promise<void>;
  loadPdfFileFromInput: (args: {
    event: InputChangeEventLike;
    fb: UiFeedbackLike;
    loadPdfIntoEditor: (file: File) => Promise<unknown>;
  }) => Promise<void>;
  preventStageDragEvent: (event: DragEventLike | null | undefined) => void;
  resetStageGesture: (gesture: StageGestureState) => void;
};
