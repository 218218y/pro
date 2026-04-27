import type {
  DragEventLike,
  StageGestureState,
  StagePointerEventLike,
} from './order_pdf_overlay_interactions_shared.js';

export function createInitialStageGesture(): StageGestureState {
  return {
    down: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    moved: false,
    startedOnEmpty: false,
  };
}

export function resetStageGesture(gesture: StageGestureState): void {
  gesture.down = false;
  gesture.pointerId = -1;
  gesture.startX = 0;
  gesture.startY = 0;
  gesture.moved = false;
  gesture.startedOnEmpty = false;
}

export function captureStagePointerDown(gesture: StageGestureState, e: StagePointerEventLike): void {
  if (!e) return;
  if (typeof e.button === 'number' && e.button !== 0) return;
  gesture.down = true;
  gesture.pointerId = typeof e.pointerId === 'number' ? e.pointerId : -1;
  gesture.startX = typeof e.clientX === 'number' ? e.clientX : 0;
  gesture.startY = typeof e.clientY === 'number' ? e.clientY : 0;
  gesture.moved = false;
  gesture.startedOnEmpty = e.target === e.currentTarget;
}

export function captureStagePointerMove(
  gesture: StageGestureState,
  e: StagePointerEventLike,
  thresholdPx = 6
): void {
  if (!gesture.down) return;
  if (gesture.pointerId >= 0 && typeof e.pointerId === 'number' && e.pointerId !== gesture.pointerId) return;
  const dx = (typeof e.clientX === 'number' ? e.clientX : 0) - gesture.startX;
  const dy = (typeof e.clientY === 'number' ? e.clientY : 0) - gesture.startY;
  if (Math.abs(dx) + Math.abs(dy) >= thresholdPx) gesture.moved = true;
}

export function finishStagePointerUp(gesture: StageGestureState, e: StagePointerEventLike): boolean {
  if (!gesture.down) return false;
  if (gesture.pointerId >= 0 && typeof e.pointerId === 'number' && e.pointerId !== gesture.pointerId)
    return false;
  const shouldClose = gesture.startedOnEmpty && !gesture.moved && e.target === e.currentTarget;
  resetStageGesture(gesture);
  return shouldClose;
}

export function preventStageDragEvent(
  e: Pick<DragEventLike, 'preventDefault' | 'stopPropagation'> | null | undefined
): void {
  if (!e) return;
  try {
    e.preventDefault?.();
    e.stopPropagation?.();
  } catch {
    // no-op; caller reports if it needs line-level diagnostics
  }
}
