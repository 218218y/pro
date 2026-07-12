export type OrderPdfOverlayEditorInteractionMode =
  | { kind: 'idle' }
  | { kind: 'pdf-page-annotation' }
  | { kind: 'sketch-preview'; pendingPdfPageAnnotation: boolean };

export type OrderPdfOverlayEditorModeEvent =
  | { type: 'toggle-pdf-page-annotation' }
  | { type: 'close-pdf-page-annotation' }
  | { type: 'prepare-sketch-preview-toggle' }
  | { type: 'reconcile-sketch-visibility'; open: boolean };

const IDLE_MODE: OrderPdfOverlayEditorInteractionMode = Object.freeze({ kind: 'idle' });
const PDF_PAGE_ANNOTATION_MODE: OrderPdfOverlayEditorInteractionMode = Object.freeze({
  kind: 'pdf-page-annotation',
});

export function createOrderPdfOverlayEditorModeState(
  sketchOpen: boolean
): OrderPdfOverlayEditorInteractionMode {
  return sketchOpen ? { kind: 'sketch-preview', pendingPdfPageAnnotation: false } : IDLE_MODE;
}

export function isOrderPdfPageAnnotationModeOpen(state: OrderPdfOverlayEditorInteractionMode): boolean {
  return state.kind === 'pdf-page-annotation';
}

export function orderPdfOverlayEditorModeReducer(
  state: OrderPdfOverlayEditorInteractionMode,
  event: OrderPdfOverlayEditorModeEvent
): OrderPdfOverlayEditorInteractionMode {
  switch (event.type) {
    case 'toggle-pdf-page-annotation':
      if (state.kind === 'pdf-page-annotation') return IDLE_MODE;
      if (state.kind === 'sketch-preview') {
        return {
          kind: 'sketch-preview',
          pendingPdfPageAnnotation: !state.pendingPdfPageAnnotation,
        };
      }
      return PDF_PAGE_ANNOTATION_MODE;

    case 'close-pdf-page-annotation':
      if (state.kind === 'pdf-page-annotation') return IDLE_MODE;
      if (state.kind === 'sketch-preview' && state.pendingPdfPageAnnotation) {
        return { kind: 'sketch-preview', pendingPdfPageAnnotation: false };
      }
      return state;

    case 'prepare-sketch-preview-toggle':
      if (state.kind === 'pdf-page-annotation') return IDLE_MODE;
      if (state.kind === 'sketch-preview' && state.pendingPdfPageAnnotation) {
        return { kind: 'sketch-preview', pendingPdfPageAnnotation: false };
      }
      return state;

    case 'reconcile-sketch-visibility':
      if (event.open) {
        if (state.kind === 'sketch-preview') return state;
        return { kind: 'sketch-preview', pendingPdfPageAnnotation: false };
      }
      if (state.kind !== 'sketch-preview') return state;
      return state.pendingPdfPageAnnotation ? PDF_PAGE_ANNOTATION_MODE : IDLE_MODE;
  }
}
