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
import {
  installCanvasAuthoringKeyboardInteraction,
  installCanvasDoorSplitAxisLockInteraction,
} from '../esm/native/ui/interactions/canvas_interactions_shared.ts';
import {
  clearCanvasPrecisionAxisLock,
  nudgeCanvasPrecisionLocalY,
  prepareCanvasPrecisionPointerMove,
  readCanvasPrecisionAxisLockScope,
  resolveCanvasPrecisionAxisLockedClientPoint,
  resolveCanvasPrecisionAxisLockedLocalPoint,
  setCanvasPrecisionAxisLockPressed,
} from '../esm/native/services/canvas_picking_precision_axis_lock.ts';

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

test('Enter commits the current manual split target and suppresses native focused-button activation', () => {
  const App = createApp();
  clearCanvasDoorSplitVerticalLock(App);
  assert.equal(resolveCanvasDoorSplitVerticalLockedWorldY(App, 1.42), 1.42);

  const win = new FakeEventTarget();
  const doc = new FakeEventTarget() as FakeEventTarget & { defaultView: FakeEventTarget };
  doc.defaultView = win;
  let commits = 0;
  const dispose = installCanvasAuthoringKeyboardInteraction(App, { ownerDocument: doc } as any, {
    onManualSplitCommitRequested: () => {
      commits += 1;
      return true;
    },
  });

  const marks: string[] = [];
  doc.dispatch('keydown', {
    key: 'Enter',
    repeat: false,
    target: { tagName: 'BUTTON' },
    preventDefault: () => marks.push('prevent'),
    stopPropagation: () => marks.push('stop'),
  });

  assert.equal(commits, 1);
  assert.deepEqual(marks, ['prevent', 'stop']);
  dispose();
});

test('Enter does not hijack controls when no manual split hover target is available', () => {
  const App = createApp();
  clearCanvasDoorSplitVerticalLock(App);

  const win = new FakeEventTarget();
  const doc = new FakeEventTarget() as FakeEventTarget & { defaultView: FakeEventTarget };
  doc.defaultView = win;
  let commits = 0;
  const dispose = installCanvasAuthoringKeyboardInteraction(App, { ownerDocument: doc } as any, {
    onManualSplitCommitRequested: () => {
      commits += 1;
      return true;
    },
  });

  const marks: string[] = [];
  doc.dispatch('keydown', {
    key: 'Enter',
    target: { tagName: 'BUTTON' },
    preventDefault: () => marks.push('prevent'),
    stopPropagation: () => marks.push('stop'),
  });
  assert.equal(commits, 0);
  assert.deepEqual(marks, []);
  dispose();
});

function createPrecisionApp(args: {
  primary: string;
  opts?: Record<string, unknown>;
  ui?: Record<string, unknown>;
  manualTool?: string;
  paint?: string;
}) {
  const state = {
    mode: { primary: args.primary, opts: args.opts || {} },
    ui: args.ui || {},
  };
  return {
    store: { getState: () => state },
    services: {
      tools: {
        getInteriorManualTool: () => args.manualTool || null,
        getPaintColor: () => args.paint || null,
      },
    },
  } as any;
}

test('precision Shift axis lock chooses the dominant direction once and keeps it until release', () => {
  const App = createPrecisionApp({ primary: 'manual_layout', manualTool: 'sketch_int_drawers' });
  clearCanvasPrecisionAxisLock(App);

  assert.deepEqual(resolveCanvasPrecisionAxisLockedClientPoint(App, { cx: 100, cy: 100 }), {
    cx: 100,
    cy: 100,
  });
  setCanvasPrecisionAxisLockPressed(App, true);

  assert.deepEqual(resolveCanvasPrecisionAxisLockedClientPoint(App, { cx: 106, cy: 102 }), {
    cx: 106,
    cy: 100,
  });
  assert.deepEqual(resolveCanvasPrecisionAxisLockedClientPoint(App, { cx: 110, cy: 170 }), {
    cx: 110,
    cy: 100,
  });

  setCanvasPrecisionAxisLockPressed(App, false);
  assert.deepEqual(resolveCanvasPrecisionAxisLockedClientPoint(App, { cx: 110, cy: 170 }), {
    cx: 110,
    cy: 170,
  });
});

test('precision Shift axis lock supports exact local vertical and horizontal placement coordinates', () => {
  const verticalApp = createPrecisionApp({
    primary: 'handle',
    opts: { handlePlacement: 'manual' },
  });
  clearCanvasPrecisionAxisLock(verticalApp);
  resolveCanvasPrecisionAxisLockedClientPoint(verticalApp, { cx: 50, cy: 50 });
  resolveCanvasPrecisionAxisLockedLocalPoint(verticalApp, { x: 0.2, y: 0.8 });
  setCanvasPrecisionAxisLockPressed(verticalApp, true);
  resolveCanvasPrecisionAxisLockedClientPoint(verticalApp, { cx: 51, cy: 60 });
  assert.deepEqual(resolveCanvasPrecisionAxisLockedLocalPoint(verticalApp, { x: 0.7, y: 1.2 }), {
    x: 0.2,
    y: 1.2,
  });

  const horizontalApp = createPrecisionApp({
    primary: 'groove',
    ui: { grooveManualEnabled: true },
  });
  clearCanvasPrecisionAxisLock(horizontalApp);
  resolveCanvasPrecisionAxisLockedClientPoint(horizontalApp, { cx: 80, cy: 90 });
  resolveCanvasPrecisionAxisLockedLocalPoint(horizontalApp, { x: 0.15, y: 0.65 });
  setCanvasPrecisionAxisLockPressed(horizontalApp, true);
  resolveCanvasPrecisionAxisLockedClientPoint(horizontalApp, { cx: 92, cy: 91 });
  assert.deepEqual(resolveCanvasPrecisionAxisLockedLocalPoint(horizontalApp, { x: 0.55, y: 1.1 }), {
    x: 0.55,
    y: 0.65,
  });
});

test('precision keyboard nudge moves positional authoring by exactly 1 cm and real pointer motion releases it', () => {
  const App = createPrecisionApp({
    primary: 'handle',
    opts: { handlePlacement: 'manual' },
  });
  clearCanvasPrecisionAxisLock(App);

  assert.deepEqual(resolveCanvasPrecisionAxisLockedLocalPoint(App, { x: 0.25, y: 0.8 }), {
    x: 0.25,
    y: 0.8,
  });
  assert.equal(nudgeCanvasPrecisionLocalY(App, 0.01), 0.81);
  assert.deepEqual(resolveCanvasPrecisionAxisLockedLocalPoint(App, { x: 0.25, y: 0.8 }), {
    x: 0.25,
    y: 0.81,
  });
  assert.equal(nudgeCanvasPrecisionLocalY(App, 0.01), 0.8200000000000001);
  assert.deepEqual(resolveCanvasPrecisionAxisLockedLocalPoint(App, { x: 0.25, y: 0.8 }), {
    x: 0.25,
    y: 0.8200000000000001,
  });
  assert.equal(nudgeCanvasPrecisionLocalY(App, -0.01), 0.81);

  prepareCanvasPrecisionPointerMove(App);
  assert.deepEqual(resolveCanvasPrecisionAxisLockedLocalPoint(App, { x: 0.3, y: 1.1 }), {
    x: 0.3,
    y: 1.1,
  });
});

test('generic positional-authoring Arrow keys and Enter reuse the shared keyboard owner', () => {
  const App = createPrecisionApp({
    primary: 'groove',
    ui: { grooveManualEnabled: true },
  });
  clearCanvasPrecisionAxisLock(App);
  resolveCanvasPrecisionAxisLockedLocalPoint(App, { x: 0.2, y: 0.9 });

  const win = new FakeEventTarget();
  const doc = new FakeEventTarget() as FakeEventTarget & { defaultView: FakeEventTarget };
  doc.defaultView = win;
  let refreshes = 0;
  let commits = 0;
  const dispose = installCanvasAuthoringKeyboardInteraction(App, { ownerDocument: doc } as any, {
    onVisualStateChanged: reason => {
      if (reason === 'nudge') refreshes += 1;
    },
    onPositionalAuthoringCommitRequested: () => {
      commits += 1;
      return true;
    },
  });

  const arrowMarks: string[] = [];
  doc.dispatch('keydown', {
    key: 'ArrowUp',
    target: { tagName: 'BODY' },
    preventDefault: () => arrowMarks.push('prevent'),
    stopPropagation: () => arrowMarks.push('stop'),
  });
  assert.deepEqual(arrowMarks, ['prevent', 'stop']);
  assert.equal(refreshes, 1);
  assert.deepEqual(resolveCanvasPrecisionAxisLockedLocalPoint(App, { x: 0.2, y: 0.9 }), {
    x: 0.2,
    y: 0.91,
  });

  const enterMarks: string[] = [];
  doc.dispatch('keydown', {
    key: 'Enter',
    repeat: false,
    target: { tagName: 'BUTTON' },
    preventDefault: () => enterMarks.push('prevent'),
    stopPropagation: () => enterMarks.push('stop'),
  });
  assert.equal(commits, 1);
  assert.deepEqual(enterMarks, ['prevent', 'stop']);
  dispose();
});

test('generic positional-authoring Enter leaves focused controls alone until a canvas target exists', () => {
  const App = createPrecisionApp({
    primary: 'handle',
    opts: { handlePlacement: 'manual' },
  });
  clearCanvasPrecisionAxisLock(App);

  const win = new FakeEventTarget();
  const doc = new FakeEventTarget() as FakeEventTarget & { defaultView: FakeEventTarget };
  doc.defaultView = win;
  let commits = 0;
  const dispose = installCanvasAuthoringKeyboardInteraction(App, { ownerDocument: doc } as any, {
    onPositionalAuthoringCommitRequested: () => {
      commits += 1;
      return true;
    },
  });

  const marks: string[] = [];
  doc.dispatch('keydown', {
    key: 'Enter',
    target: { tagName: 'BUTTON' },
    preventDefault: () => marks.push('prevent'),
    stopPropagation: () => marks.push('stop'),
  });
  assert.equal(commits, 0);
  assert.deepEqual(marks, []);
  dispose();
});

test('precision Shift scope is limited to positional authoring modes and covers requested tools', () => {
  for (const manualTool of [
    'shelf',
    'sketch_int_drawers',
    'sketch_ext_drawers:4',
    'sketch_box:80',
    'sketch_box_divider',
  ]) {
    const App = createPrecisionApp({ primary: 'manual_layout', manualTool });
    assert.equal(readCanvasPrecisionAxisLockScope(App), `manual_layout:${manualTool}`);
  }

  assert.equal(
    readCanvasPrecisionAxisLockScope(
      createPrecisionApp({ primary: 'handle', opts: { handlePlacement: 'manual' } })
    ),
    'handle:manual'
  );
  assert.equal(
    readCanvasPrecisionAxisLockScope(
      createPrecisionApp({ primary: 'groove', ui: { grooveManualEnabled: true } })
    ),
    'groove:manual'
  );
  assert.equal(
    readCanvasPrecisionAxisLockScope(
      createPrecisionApp({
        primary: 'paint',
        paint: 'mirror',
        ui: { currentMirrorDraftWidthCm: '45', currentMirrorDraftHeightCm: '90' },
      })
    ),
    'paint:mirror-sized'
  );
  assert.equal(
    readCanvasPrecisionAxisLockScope(
      createPrecisionApp({
        primary: 'paint',
        paint: 'black_glass',
        ui: { currentMirrorDraftWidthCm: '45', currentMirrorDraftHeightCm: '90' },
      })
    ),
    'paint:black_glass-sized'
  );
  assert.equal(
    readCanvasPrecisionAxisLockScope(
      createPrecisionApp({
        primary: 'paint',
        paint: 'frosted_glass',
        ui: { currentMirrorDraftWidthCm: '45', currentMirrorDraftHeightCm: '90' },
      })
    ),
    'paint:frosted_glass-sized'
  );

  assert.equal(readCanvasPrecisionAxisLockScope(createPrecisionApp({ primary: 'measure' })), null);
  assert.equal(
    readCanvasPrecisionAxisLockScope(createPrecisionApp({ primary: 'paint', paint: '#ffffff' })),
    null
  );
  assert.equal(
    readCanvasPrecisionAxisLockScope(
      createPrecisionApp({ primary: 'split', opts: { splitVariant: 'custom' } })
    ),
    null
  );
});

test('sized black and frosted glass use the same Shift axis lock as other precision authoring tools', () => {
  for (const paint of ['black_glass', 'frosted_glass']) {
    const App = createPrecisionApp({
      primary: 'paint',
      paint,
      ui: { currentMirrorDraftWidthCm: '45', currentMirrorDraftHeightCm: '90' },
    });
    clearCanvasPrecisionAxisLock(App);

    assert.deepEqual(resolveCanvasPrecisionAxisLockedClientPoint(App, { cx: 100, cy: 100 }), {
      cx: 100,
      cy: 100,
    });
    assert.deepEqual(resolveCanvasPrecisionAxisLockedLocalPoint(App, { x: 0.2, y: 0.8 }), {
      x: 0.2,
      y: 0.8,
    });

    setCanvasPrecisionAxisLockPressed(App, true);
    assert.deepEqual(resolveCanvasPrecisionAxisLockedClientPoint(App, { cx: 112, cy: 102 }), {
      cx: 112,
      cy: 100,
    });
    assert.deepEqual(resolveCanvasPrecisionAxisLockedLocalPoint(App, { x: 0.5, y: 1.1 }), {
      x: 0.5,
      y: 0.8,
    });

    setCanvasPrecisionAxisLockPressed(App, false);
    assert.deepEqual(resolveCanvasPrecisionAxisLockedLocalPoint(App, { x: 0.5, y: 1.1 }), {
      x: 0.5,
      y: 1.1,
    });
  }
});

test('manual-split Enter auto-repeat stays captured without toggling the cut repeatedly', () => {
  const App = createApp();
  clearCanvasDoorSplitVerticalLock(App);
  resolveCanvasDoorSplitVerticalLockedWorldY(App, 1.15);

  const win = new FakeEventTarget();
  const doc = new FakeEventTarget() as FakeEventTarget & { defaultView: FakeEventTarget };
  doc.defaultView = win;
  let commits = 0;
  const dispose = installCanvasAuthoringKeyboardInteraction(App, { ownerDocument: doc } as any, {
    onManualSplitCommitRequested: () => {
      commits += 1;
      return true;
    },
  });

  const marks: string[] = [];
  doc.dispatch('keydown', {
    key: 'Enter',
    repeat: true,
    target: { tagName: 'BUTTON' },
    preventDefault: () => marks.push('prevent'),
    stopPropagation: () => marks.push('stop'),
  });
  assert.equal(commits, 0);
  assert.deepEqual(marks, ['prevent', 'stop']);
  dispose();
});
