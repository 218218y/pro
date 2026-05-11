// UI interactions: canvas pointer/mouse interactions (Pure ESM)

import type { AppContainer } from '../../../../types';
import { createCanvasHoverInteractionOps } from './canvas_interactions_hover.js';
import { createCanvasPointerInteractionOps } from './canvas_interactions_pointer.js';
import {
  createCanvasInteractionState,
  createEventBinding,
  createRectCacheOps,
  reportCanvasInteractionsNonFatal,
  type CanvasInteractionsDeps,
  type CanvasInteractionsOptions,
} from './canvas_interactions_shared.js';

export type { CanvasInteractionsDeps, CanvasInteractionsOptions } from './canvas_interactions_shared.js';

/**
 * Install canvas interactions on renderer.domElement (idempotent via UiRuntime key).
 * Returns a disposer.
 */
export function installCanvasInteractions(
  App: AppContainer,
  deps: CanvasInteractionsDeps,
  opts?: CanvasInteractionsOptions
): () => void {
  const domEl = deps?.domEl;

  if (!App || typeof App !== 'object') return () => undefined;
  if (!domEl || typeof domEl !== 'object') return () => undefined;

  const state = createCanvasInteractionState();
  const rectOps = createRectCacheOps(domEl, state);
  const add = createEventBinding(App, domEl);
  const normalizedOpts: Required<CanvasInteractionsOptions> = {
    clickMaxDistPx: typeof opts?.clickMaxDistPx === 'number' ? opts.clickMaxDistPx : 5,
    moveThrottleMs: typeof opts?.moveThrottleMs === 'number' ? opts.moveThrottleMs : 40,
    notesClickFirst: opts?.notesClickFirst !== false,
  };

  const hoverOps = createCanvasHoverInteractionOps(App, deps, state, rectOps);
  const pointerOps = createCanvasPointerInteractionOps(App, deps, state, normalizedOpts, rectOps);

  const onPointerMove: EventListener = e => {
    hoverOps.onPointerMove(e);
    pointerOps.onMoveRender(e);
  };

  const removers: Array<() => void> = [];
  removers.push(add('pointerdown', pointerOps.onPointerDown, { passive: true }));
  removers.push(add('pointerup', pointerOps.onPointerUp, { passive: true }));
  removers.push(add('pointercancel', pointerOps.onPointerCancel, { passive: true }));
  removers.push(add('pointerleave', hoverOps.onPointerLeave, { passive: true }));
  removers.push(add('mouseleave', hoverOps.onPointerLeave, { passive: true }));
  removers.push(add('pointermove', onPointerMove, { passive: true }));
  removers.push(add('wheel', pointerOps.onWheel, { passive: true }));
  removers.push(add('click', pointerOps.onClick, { passive: true }));

  const dispose = () => {
    if (state.disposed) return;
    state.disposed = true;
    try {
      hoverOps.disposeHover();
      for (const fn of removers) {
        try {
          fn();
        } catch {
          // ignore
        }
      }
    } catch (err) {
      reportCanvasInteractionsNonFatal(App, 'dispose', err);
    }
  };

  return dispose;
}
