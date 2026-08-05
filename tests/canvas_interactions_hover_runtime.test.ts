import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CANVAS_HOVER_CURSOR_PRESERVE,
  createCanvasInteractionState,
  createHoverCursorApplier,
  createRectCacheOps,
} from '../esm/native/ui/interactions/canvas_interactions_shared.ts';
import { createCanvasHoverInteractionOps } from '../esm/native/ui/interactions/canvas_interactions_hover.ts';
import {
  consumeCanvasPostBuildHoverRefresh,
  requestCanvasPostBuildHoverRefresh,
} from '../esm/native/runtime/canvas_interaction_flags.ts';

function createDomEl() {
  return {
    style: { cursor: '' },
    getBoundingClientRect() {
      return { left: 10, top: 20, width: 100, height: 50 };
    },
    addEventListener() {},
    removeEventListener() {},
  } as any;
}

function createTooltipDomEl() {
  const bodyChildren: any[] = [];
  const document: any = {
    defaultView: { innerWidth: 900 },
    documentElement: { clientWidth: 900 },
    createElement(tagName: string) {
      const classes = new Set<string>();
      const attributes = new Map<string, string>();
      const element: any = {
        tagName: tagName.toUpperCase(),
        ownerDocument: document,
        parentNode: null,
        children: [] as any[],
        className: '',
        dir: '',
        style: { cursor: '' },
        textContent: '',
        classList: {
          add(...names: string[]) {
            for (const name of names) classes.add(name);
          },
          remove(...names: string[]) {
            for (const name of names) classes.delete(name);
          },
          toggle(name: string, force?: boolean) {
            const next = force == null ? !classes.has(name) : force;
            if (next) classes.add(name);
            else classes.delete(name);
            return next;
          },
          contains(name: string) {
            return classes.has(name);
          },
        },
        setAttribute(name: string, value: string) {
          attributes.set(name, value);
        },
        getAttribute(name: string) {
          return attributes.get(name) ?? null;
        },
        appendChild(child: any) {
          child.parentNode = element;
          element.children.push(child);
          return child;
        },
        remove() {
          if (!element.parentNode) return;
          const siblings = element.parentNode.children as any[];
          const index = siblings.indexOf(element);
          if (index >= 0) siblings.splice(index, 1);
          element.parentNode = null;
        },
      };
      return element;
    },
  };
  document.body = document.createElement('body');
  document.body.children = bodyChildren;

  const domEl = document.createElement('canvas');
  domEl.style.cursor = 'crosshair';
  domEl.getBoundingClientRect = () => ({ left: 10, top: 20, width: 100, height: 50 });
  domEl.addEventListener = () => undefined;
  domEl.removeEventListener = () => undefined;
  return { domEl, document, bodyChildren };
}

function createApp() {
  const rafQueue: Array<(ts: number) => void> = [];
  const cancelled: number[] = [];
  const hideCalls: string[] = [];
  const App = {
    render: {},
    deps: {
      browser: {
        requestAnimationFrame(cb: (ts: number) => void) {
          rafQueue.push(cb);
          return rafQueue.length;
        },
        cancelAnimationFrame(id: number) {
          cancelled.push(id);
        },
      },
    },
    services: {
      builder: {
        renderOps: {
          hideSketchPlacementPreview() {
            hideCalls.push('sketch');
          },
          hideInteriorLayoutHoverPreview() {
            hideCalls.push('layout');
          },
        },
      },
    },
  } as any;
  return { App, rafQueue, cancelled, hideCalls };
}

test('canvas hover interactions queue one RAF and use the latest pointer position for hover NDC', () => {
  const domEl = createDomEl();
  const state = createCanvasInteractionState();
  const rectOps = createRectCacheOps(domEl, state);
  const hoverCalls: Array<{ x: number; y: number }> = [];
  const { App, rafQueue } = createApp();

  const ops = createCanvasHoverInteractionOps(
    App,
    {
      domEl,
      triggerRender() {
        return undefined;
      },
      handleCanvasClickNDC() {
        return null;
      },
      handleCanvasHoverNDC(x: number, y: number) {
        hoverCalls.push({ x, y });
        return true;
      },
    },
    state,
    rectOps
  );

  ops.onPointerMove({ clientX: 30, clientY: 30, pointerId: 1 } as any);
  ops.onPointerMove({ clientX: 60, clientY: 45, pointerId: 1 } as any);

  assert.equal(rafQueue.length, 1);
  assert.equal(state.hoverMoveQueued, true);

  rafQueue[0]?.(16);

  assert.equal(state.hoverMoveQueued, false);
  assert.deepEqual(hoverCalls, [{ x: 0, y: 0 }]);
  assert.equal(domEl.style.cursor, 'pointer');
});

test('canvas hover interactions retarget a pending post-build hover refresh to the latest pointer position', () => {
  const domEl = createDomEl();
  const state = createCanvasInteractionState();
  const rectOps = createRectCacheOps(domEl, state);
  const { App, rafQueue } = createApp();
  requestCanvasPostBuildHoverRefresh(App, -0.6, 0.6, 'test.pending');

  const ops = createCanvasHoverInteractionOps(
    App,
    {
      domEl,
      triggerRender() {
        return undefined;
      },
      handleCanvasClickNDC() {
        return null;
      },
      handleCanvasHoverNDC() {
        return true;
      },
    },
    state,
    rectOps
  );

  ops.onPointerMove({ clientX: 60, clientY: 45, pointerId: 1 } as any);

  assert.equal(rafQueue.length, 1);
  const pending = consumeCanvasPostBuildHoverRefresh(App);
  assert.equal(pending?.ndcX, 0);
  assert.equal(pending?.ndcY, 0);
  assert.equal(pending?.reason, 'test.pending');
});

test('canvas hover pointerleave cancels queued hover work, clears previews, and triggers a render refresh', () => {
  const domEl = createDomEl();
  domEl.style.cursor = 'pointer';
  const state = createCanvasInteractionState();
  state.hoverRafId = 1;
  state.hoverMoveQueued = true;
  state.cursorManaged = true;

  const rectOps = createRectCacheOps(domEl, state);
  const renderCalls: boolean[] = [];
  const { App, cancelled, hideCalls } = createApp();

  const ops = createCanvasHoverInteractionOps(
    App,
    {
      domEl,
      triggerRender(updateShadows?: boolean) {
        renderCalls.push(updateShadows === true);
      },
      handleCanvasClickNDC() {
        return null;
      },
      handleCanvasHoverNDC() {
        return null;
      },
    },
    state,
    rectOps
  );

  ops.onPointerLeave({} as any);

  assert.deepEqual(cancelled, [1]);
  assert.equal(state.hoverRafId, 0);
  assert.equal(state.hoverMoveQueued, false);
  assert.equal(state.hasDown, false);
  assert.equal(state.downPointerId, null);
  assert.equal(domEl.style.cursor, '');
  assert.deepEqual(hideCalls, ['sketch', 'layout']);
  assert.deepEqual(renderCalls, [false]);
});

test('canvas hover cursor applier can preserve a precision edit cursor', () => {
  const domEl = createDomEl();
  domEl.style.cursor = 'url(point-cross.svg) 12 12, crosshair';
  const state = createCanvasInteractionState();
  state.cursorManaged = true;
  const { App } = createApp();

  const applyHoverCursor = createHoverCursorApplier(App, domEl, state);
  applyHoverCursor(CANVAS_HOVER_CURSOR_PRESERVE);

  assert.equal(domEl.style.cursor, 'url(point-cross.svg) 12 12, crosshair');
  assert.equal(state.cursorManaged, true);
});

test('canvas hover interactions render and clear the measurement part-name tooltip at the pointer', () => {
  const { domEl, bodyChildren } = createTooltipDomEl();
  const state = createCanvasInteractionState();
  state.cursorManaged = true;
  const rectOps = createRectCacheOps(domEl, state);
  const { App, rafQueue } = createApp();

  const ops = createCanvasHoverInteractionOps(
    App,
    {
      domEl,
      triggerRender() {
        return undefined;
      },
      handleCanvasClickNDC() {
        return null;
      },
      handleCanvasHoverNDC() {
        return {
          kind: 'viewer-measurement',
          cursor: CANVAS_HOVER_CURSOR_PRESERVE,
          partLabel: 'דופן שמאלית',
        };
      },
    },
    state,
    rectOps
  );

  ops.onPointerMove({ clientX: 60, clientY: 45, pointerId: 1 } as any);
  rafQueue[0]?.(16);

  assert.equal(bodyChildren.length, 1);
  const tooltip = bodyChildren[0];
  assert.equal(tooltip.getAttribute('aria-hidden'), 'false');
  assert.equal(tooltip.getAttribute('data-part-label'), 'דופן שמאלית');
  assert.equal(tooltip.children[0]?.textContent, 'דופן שמאלית');
  assert.equal(tooltip.children[1]?.textContent, 'לחיצה להצגת מידות החלק');
  assert.equal(tooltip.classList.contains('is-open'), true);
  assert.equal(tooltip.classList.contains('is-below'), true);
  assert.equal(domEl.style.cursor, 'crosshair');

  ops.onPointerLeave({} as any);
  assert.equal(tooltip.getAttribute('aria-hidden'), 'true');
  assert.equal(tooltip.classList.contains('is-open'), false);

  ops.disposeHover();
  assert.equal(bodyChildren.length, 0);
});
