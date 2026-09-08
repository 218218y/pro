import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearCanvasDoorSplitPointerHover,
  clearCanvasDoorSplitVerticalLock,
  nudgeCanvasDoorSplitPointerWorldY,
  prepareCanvasDoorSplitPointerMove,
  resolveCanvasDoorSplitPointerWorldY,
  resolveCanvasDoorSplitVerticalLockedWorldY,
  setCanvasDoorSplitVerticalLockPressed,
} from '../esm/native/services/canvas_picking_door_split_pointer_y.ts';
import { installCanvasDoorSplitAxisLockInteraction } from '../esm/native/ui/interactions/canvas_interactions_shared.ts';

function createApp(mode = { primary: 'split', opts: { splitVariant: 'custom' } }) {
  return {
    store: {
      getState: () => ({ mode }),
    },
  } as any;
}

test('manual split Shift lock holds the latest world Y until Shift is released', () => {
  const App = createApp();
  clearCanvasDoorSplitVerticalLock(App);

  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 1.25), 1.25);

  setCanvasDoorSplitVerticalLockPressed(App, true);
  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 1.75), 1.25);
  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 2.15), 1.25);

  setCanvasDoorSplitVerticalLockPressed(App, false);
  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 2.15), 2.15);
});

test('Shift pressed before the first manual-split projection locks on the first valid Y', () => {
  const App = createApp();
  clearCanvasDoorSplitVerticalLock(App);
  setCanvasDoorSplitVerticalLockPressed(App, true);

  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, null), null);
  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 0.8), 0.8);
  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 1.4), 0.8);
});

test('manual split arrow nudge moves the shared authoring height by exactly 1 cm and physical pointer motion releases it', () => {
  const App = createApp();
  clearCanvasDoorSplitVerticalLock(App);

  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 1.2), 1.2);
  assert.equal(nudgeCanvasDoorSplitPointerWorldY(App, 0.01), 1.21);
  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 1.2), 1.21);
  assert.equal(nudgeCanvasDoorSplitPointerWorldY(App, -0.01), 1.2);
  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 1.2), 1.2);

  prepareCanvasDoorSplitPointerMove(App);
  assert.equal(nudgeCanvasDoorSplitPointerWorldY(App, 0.01), null);
  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 1.55), 1.55);
  assert.equal(nudgeCanvasDoorSplitPointerWorldY(App, 0.01), 1.56);

  clearCanvasDoorSplitPointerHover(App);
  assert.equal(nudgeCanvasDoorSplitPointerWorldY(App, 0.01), null);
});

test('Shift adopts a keyboard-nudged height, keeps later arrow nudges locked across doors, and releases back to pointer Y', () => {
  const App = createApp();
  clearCanvasDoorSplitVerticalLock(App);

  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 1.0), 1.0);
  assert.equal(nudgeCanvasDoorSplitPointerWorldY(App, 0.01), 1.01);
  setCanvasDoorSplitVerticalLockPressed(App, true);
  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 1.7), 1.01);
  assert.equal(nudgeCanvasDoorSplitPointerWorldY(App, 0.01), 1.02);

  prepareCanvasDoorSplitPointerMove(App);
  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 2.3), 1.02);
  setCanvasDoorSplitVerticalLockPressed(App, false);
  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 2.3), 2.3);
});

test('shared pointer-Y resolver applies the same locked height used by hover and click callers', () => {
  const App = createApp();
  clearCanvasDoorSplitVerticalLock(App);

  assert.equal(resolveCanvasDoorSplitPointerWorldY({ App, referenceY: 1.1, lockVertical: true }), 1.1);
  setCanvasDoorSplitVerticalLockPressed(App, true);
  assert.equal(resolveCanvasDoorSplitPointerWorldY({ App, referenceY: 1.9, lockVertical: true }), 1.1);
  assert.equal(resolveCanvasDoorSplitPointerWorldY({ App, referenceY: 1.9, lockVertical: false }), 1.9);
});

class FakeEventTarget {
  listeners = new Map<string, Set<(event: any) => void>>();

  addEventListener(type: string, listener: (event: any) => void): void {
    const set = this.listeners.get(type) || new Set<(event: any) => void>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: (event: any) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string, event: any): void {
    for (const listener of this.listeners.get(type) || []) listener(event);
  }
}

test('canvas keyboard integration maps held Shift to the manual-split vertical lock and cleans it up', () => {
  const App = createApp();
  clearCanvasDoorSplitVerticalLock(App);
  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 1.35), 1.35);

  const win = new FakeEventTarget();
  const doc = new FakeEventTarget() as FakeEventTarget & { defaultView: FakeEventTarget };
  doc.defaultView = win;
  const domEl = { ownerDocument: doc } as any;
  let nudgeRefreshes = 0;
  const dispose = installCanvasDoorSplitAxisLockInteraction(App, domEl, () => {
    nudgeRefreshes += 1;
  });

  doc.dispatch('keydown', { key: 'Shift', repeat: false, target: { tagName: 'BODY' } });
  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 2.1), 1.35);

  doc.dispatch('keyup', { key: 'Shift', target: { tagName: 'BODY' } });
  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 2.1), 2.1);

  const arrowMarks: string[] = [];
  doc.dispatch('keydown', {
    key: 'ArrowUp',
    repeat: false,
    target: { tagName: 'BODY' },
    preventDefault: () => arrowMarks.push('prevent'),
    stopPropagation: () => arrowMarks.push('stop'),
  });
  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 2.1), 2.11);
  assert.deepEqual(arrowMarks, ['prevent', 'stop']);
  assert.equal(nudgeRefreshes, 1);

  doc.dispatch('keydown', { key: 'Shift', repeat: false, target: { tagName: 'BODY' } });
  win.dispatch('blur', {});
  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 2.6), 2.6);

  dispose();
  assert.equal(doc.listeners.get('keydown')?.size || 0, 0);
  assert.equal(doc.listeners.get('keyup')?.size || 0, 0);
  assert.equal(win.listeners.get('blur')?.size || 0, 0);
});

test('manual-split Shift shortcut ignores editable targets', () => {
  const App = createApp();
  clearCanvasDoorSplitVerticalLock(App);
  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 0.9), 0.9);

  const win = new FakeEventTarget();
  const doc = new FakeEventTarget() as FakeEventTarget & { defaultView: FakeEventTarget };
  doc.defaultView = win;
  const dispose = installCanvasDoorSplitAxisLockInteraction(App, { ownerDocument: doc } as any);

  doc.dispatch('keydown', { key: 'Shift', repeat: false, target: { tagName: 'INPUT' } });
  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 1.7), 1.7);

  dispose();
});
