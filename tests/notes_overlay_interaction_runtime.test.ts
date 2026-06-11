import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyInteractionToDraftNotes,
  applyInteractionToNote,
  buildRectFromPoints,
  createEmptyNoteFromRect,
  createHandleNoteInteraction,
  createResizeNoteInteraction,
  didNotesChange,
  didNoteLayoutChange,
  finalizeInteractionDraftNotes,
  readSavedNoteBounds,
} from '../esm/native/ui/react/notes/notes_overlay_controller_interactions_shared.js';
import { MIN_SIZE } from '../esm/native/ui/react/notes/notes_overlay_helpers_shared.js';

test('notes overlay create rect normalizes reverse drag coordinates', () => {
  assert.deepEqual(buildRectFromPoints(120, 40, 10, 90), {
    left: 10,
    top: 40,
    width: 110,
    height: 50,
  });
});

test('notes overlay create note seeds px-based style defaults and keeps doors-open state', () => {
  const note = createEmptyNoteFromRect({ left: 12, top: 34, width: 150, height: 80 }, true);
  assert.deepEqual(note, {
    style: {
      left: '12px',
      top: '34px',
      width: '150px',
      height: '80px',
      baseTextColor: '#000000',
      baseFontSize: '4',
      textColor: '#000000',
      fontSize: '4',
    },
    text: '',
    doorsOpen: true,
  });
});

test('notes overlay move interaction clamps note position inside the non-negative workspace', () => {
  const note = {
    text: 'hello',
    style: { left: '8px', top: '9px', width: '100px', height: '60px' },
  } as any;

  const next = applyInteractionToNote(
    note,
    {
      kind: 'move',
      index: 0,
      startX: 20,
      startY: 30,
      startLeft: 8,
      startTop: 9,
      pointerId: 1,
    },
    { x: -90, y: -200 }
  );

  assert.equal(next.style?.left, '0px');
  assert.equal(next.style?.top, '0px');
  assert.equal(next.style?.width, '100px');
  assert.equal(next.style?.height, '60px');
});

test('notes overlay resize interaction preserves the minimum size while updating the active edges', () => {
  const note = {
    text: 'resize me',
    style: { left: '40px', top: '50px', width: '120px', height: '80px' },
  } as any;

  const next = applyInteractionToNote(
    note,
    {
      kind: 'resize',
      index: 0,
      dir: 'nw',
      startX: 100,
      startY: 100,
      startLeft: 40,
      startTop: 50,
      startWidth: 120,
      startHeight: 80,
      pointerId: 7,
    },
    { x: 190, y: 170 }
  );

  assert.equal(next.style?.left, '130px');
  assert.equal(next.style?.top, '120px');
  assert.equal(next.style?.width, `${MIN_SIZE}px`);
  assert.equal(next.style?.height, `${MIN_SIZE}px`);
});

test('notes overlay handle interactions keep north/south handles as move and side/corner handles as resize', () => {
  const move = createHandleNoteInteraction({
    index: 2,
    dir: 'n',
    startX: 40,
    startY: 50,
    pointerId: 9,
    bounds: { left: 10, top: 20, width: 120, height: 80 },
  });

  assert.deepEqual(move, {
    kind: 'move',
    index: 2,
    startX: 40,
    startY: 50,
    startLeft: 10,
    startTop: 20,
    pointerId: 9,
  });

  const resize = createHandleNoteInteraction({
    index: 2,
    dir: 'ne',
    startX: 40,
    startY: 50,
    pointerId: 9,
    bounds: { left: 10, top: 20, width: 120, height: 80 },
  });

  assert.deepEqual(resize, {
    kind: 'resize',
    index: 2,
    dir: 'ne',
    startX: 40,
    startY: 50,
    startLeft: 10,
    startTop: 20,
    startWidth: 120,
    startHeight: 80,
    pointerId: 9,
  });
});

test('notes overlay saved-note bounds normalize missing and undersized geometry', () => {
  assert.deepEqual(readSavedNoteBounds({ left: '15px', top: '25px', width: '10px', height: 'abc' }), {
    left: 15,
    top: 25,
    width: MIN_SIZE,
    height: MIN_SIZE,
  });
});

test('notes overlay layout change detection ignores identical geometry churn', () => {
  const prev = { text: 'same', style: { left: '10px', top: '20px', width: '100px', height: '70px' } } as any;
  const nextSame = {
    ...prev,
    style: { left: '10px', top: '20px', width: '100px', height: '70px', color: '#fff' },
  } as any;
  const nextMoved = {
    ...prev,
    style: { left: '11px', top: '20px', width: '100px', height: '70px' },
  } as any;

  assert.equal(didNoteLayoutChange(prev, nextSame), false);
  assert.equal(didNoteLayoutChange(prev, nextMoved), true);
});

test('notes overlay interaction draft helper reuses the captured snapshot and only updates the active note', () => {
  const noteA = {
    text: 'keep me',
    style: { left: '8px', top: '9px', width: '100px', height: '60px' },
  } as any;
  const noteB = {
    text: 'move me',
    style: { left: '40px', top: '50px', width: '120px', height: '80px' },
  } as any;
  const base = [noteA, noteB];

  const moved = applyInteractionToDraftNotes(
    base,
    {
      kind: 'move',
      index: 1,
      startX: 50,
      startY: 70,
      startLeft: 40,
      startTop: 50,
      pointerId: 11,
    },
    { x: 80, y: 95 }
  );

  assert.notEqual(moved, base);
  assert.equal(moved[0], noteA);
  assert.equal(moved[1]?.style?.left, '70px');
  assert.equal(moved[1]?.style?.top, '75px');
  assert.equal(base[1]?.style?.left, '40px');
  assert.equal(base[1]?.style?.top, '50px');

  const unchanged = applyInteractionToDraftNotes(
    base,
    {
      kind: 'move',
      index: 1,
      startX: 50,
      startY: 70,
      startLeft: 40,
      startTop: 50,
      pointerId: 11,
    },
    { x: 50, y: 70 }
  );

  assert.equal(unchanged, base);
});

test('notes overlay draft change helper suppresses identical note snapshots', () => {
  const same = [{ text: 'same', style: { left: '10px', top: '20px' } }] as any;
  const equalClone = [{ text: 'same', style: { left: '10px', top: '20px' } }] as any;
  const changed = [{ text: 'same', style: { left: '11px', top: '20px' } }] as any;

  assert.equal(didNotesChange(same, same), false);
  assert.equal(didNotesChange(same, equalClone), false);
  assert.equal(didNotesChange(same, changed), true);
});

test('notes overlay draft change helper ignores property-order churn in equivalent note snapshots', () => {
  const ordered = [
    {
      id: 'n1',
      text: 'same',
      doorsOpen: true,
      style: { left: '10px', top: '20px', width: '100px', height: '70px', textColor: '#111111' },
    },
  ] as any;
  const reordered = [
    {
      doorsOpen: true,
      text: 'same',
      id: 'n1',
      style: { textColor: '#111111', height: '70px', width: '100px', top: '20px', left: '10px' },
    },
  ] as any;

  assert.equal(didNotesChange(ordered, reordered), false);
});

test('notes overlay interaction finalizer suppresses no-op commit when drag returns to baseline', () => {
  const start = [
    { text: 'note', style: { left: '10px', top: '20px', width: '100px', height: '70px' } },
  ] as any;

  const settled = finalizeInteractionDraftNotes({
    startNotes: start,
    currentNotes: [
      { text: 'note', style: { left: '10px', top: '20px', width: '100px', height: '70px' } },
    ] as any,
    fallbackNotes: [],
    captureEditorsIntoNotes: base => base,
  });

  assert.equal(settled.shouldCommit, false);
  assert.deepEqual(settled.nextDraft, start);

  const moved = finalizeInteractionDraftNotes({
    startNotes: start,
    currentNotes: [
      { text: 'note', style: { left: '16px', top: '25px', width: '100px', height: '70px' } },
    ] as any,
    fallbackNotes: [],
    captureEditorsIntoNotes: base => base,
  });

  assert.equal(moved.shouldCommit, true);
  assert.equal(moved.nextDraft[0]?.style?.left, '16px');
  assert.equal(moved.nextDraft[0]?.style?.top, '25px');
});

test('notes overlay interaction helper preserves note identity when drag math resolves to the same layout', () => {
  const note = {
    text: 'same',
    style: { left: '10px', top: '20px', width: '100px', height: '70px' },
  } as any;

  const unchangedMove = applyInteractionToNote(
    note,
    {
      kind: 'move',
      index: 0,
      startX: 50,
      startY: 70,
      startLeft: 10,
      startTop: 20,
      pointerId: 21,
    },
    { x: 50, y: 70 }
  );
  assert.equal(unchangedMove, note);

  const unchangedResize = applyInteractionToNote(
    note,
    {
      kind: 'resize',
      index: 0,
      dir: 'se',
      startX: 120,
      startY: 140,
      startLeft: 10,
      startTop: 20,
      startWidth: 100,
      startHeight: 70,
      pointerId: 22,
    },
    { x: 120, y: 140 }
  );
  assert.equal(unchangedResize, note);
});

test('notes overlay draft interaction helper suppresses clamped no-op frames before cloning the note list', () => {
  const note = {
    text: 'stuck at zero',
    style: { left: '0px', top: '0px', width: '100px', height: '70px' },
  } as any;
  const base = [note];
  const next = applyInteractionToDraftNotes(
    base,
    {
      kind: 'move',
      index: 0,
      startX: 20,
      startY: 20,
      startLeft: 0,
      startTop: 0,
      pointerId: 23,
    },
    { x: -50, y: -40 }
  );
  assert.equal(next, base);
});

test('notes overlay interaction finalizer preserves the current draft identity for semantic no-op captured clones', () => {
  const current = [
    { id: 'n1', text: 'same', style: { left: '10px', top: '20px', width: '100px', height: '70px' } },
  ] as any[];

  const settled = finalizeInteractionDraftNotes({
    startNotes: current,
    currentNotes: current,
    fallbackNotes: [],
    captureEditorsIntoNotes: base => base.map(note => ({ ...note, style: { ...note.style } })) as any,
  });

  assert.equal(settled.nextDraft, current);
  assert.equal(settled.shouldCommit, false);
});
