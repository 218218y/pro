import test from 'node:test';
import assert from 'node:assert/strict';

import {
  beginCreatePointerInteraction,
  beginHandlePointerInteraction,
  beginNotePointerInteraction,
  finalizeCreatePointerInteraction,
  finalizePointerInteractionDraft,
  readCreatePreviewRect,
  resetPointerInteractionRefs,
  updatePointerInteractionDraft,
  type NotesOverlayInteractionRefs,
} from '../esm/native/ui/react/notes/notes_overlay_controller_pointer_runtime.ts';

function createRefs(): NotesOverlayInteractionRefs {
  return {
    createLastPointRef: { current: null },
    interactionBaseNotesRef: { current: null },
    interactionStartNotesRef: { current: null },
  };
}

test('beginCreatePointerInteraction resets prior snapshots and seeds a create interaction', () => {
  const refs = createRefs();
  refs.createLastPointRef.current = { x: 1, y: 2 };
  refs.interactionBaseNotesRef.current = [{ text: 'old' }] as any;
  refs.interactionStartNotesRef.current = [{ text: 'old' }] as any;

  const interaction = beginCreatePointerInteraction({ x: 30, y: 45 }, 7, refs);

  assert.deepEqual(interaction, { kind: 'create', startX: 30, startY: 45, pointerId: 7 });
  assert.deepEqual(refs.createLastPointRef.current, { x: 30, y: 45 });
  assert.equal(refs.interactionBaseNotesRef.current, null);
  assert.equal(refs.interactionStartNotesRef.current, null);
});

test('readCreatePreviewRect updates the cached endpoint and normalizes reverse drag rectangles', () => {
  const refs = createRefs();
  const rect = readCreatePreviewRect(
    { kind: 'create', startX: 100, startY: 90, pointerId: 5 },
    { x: 10, y: 20 },
    refs
  );

  assert.deepEqual(rect, { left: 10, top: 20, width: 90, height: 70 });
  assert.deepEqual(refs.createLastPointRef.current, { x: 10, y: 20 });
});

test('finalizeCreatePointerInteraction appends a new note for valid create drags and clears refs', () => {
  const refs = createRefs();
  refs.createLastPointRef.current = { x: 150, y: 120 };
  const base = [{ text: 'keep', style: { left: '1px', top: '2px' } }] as any[];
  const app = { services: { doors: { getOpen: () => true } } } as any;

  const result = finalizeCreatePointerInteraction({
    App: app,
    interaction: { kind: 'create', startX: 10, startY: 20, pointerId: 3 },
    endPoint: null,
    draftNotes: base as any,
    draftNotesRef: { current: base as any },
    captureEditorsIntoNotes: notes => notes,
    refs,
  });

  assert.equal(result.shouldExitDrawMode, false);
  assert.deepEqual(result.rect, { left: 10, top: 20, width: 140, height: 100 });
  assert.equal(result.nextDraft?.length, 2);
  assert.equal(result.nextDraft?.[0], base[0]);
  assert.deepEqual(result.nextDraft?.[1], {
    style: {
      left: '10px',
      top: '20px',
      width: '140px',
      height: '100px',
      baseTextColor: '#000000',
      baseFontSize: '4',
      textColor: '#000000',
      fontSize: '4',
    },
    text: '',
    doorsOpen: true,
  });
  assert.equal(refs.createLastPointRef.current, null);
  assert.equal(refs.interactionBaseNotesRef.current, null);
  assert.equal(refs.interactionStartNotesRef.current, null);
});

test('finalizeCreatePointerInteraction exits draw mode for undersized drags without creating notes', () => {
  const refs = createRefs();
  const uiNotes = {
    exits: 0,
    exitScreenDrawMode() {
      this.exits += 1;
    },
  };
  const result = finalizeCreatePointerInteraction({
    App: { services: { uiNotes } } as any,
    interaction: { kind: 'create', startX: 10, startY: 10, pointerId: 1 },
    endPoint: { x: 20, y: 25 },
    draftNotes: [] as any,
    draftNotesRef: { current: [] as any },
    captureEditorsIntoNotes: notes => notes,
    refs,
  });

  assert.equal(result.shouldExitDrawMode, true);
  assert.equal(result.nextDraft, null);
  assert.equal(uiNotes.exits, 1);
});

test('beginNotePointerInteraction captures editor content once and seeds a move interaction from note bounds', () => {
  const refs = createRefs();
  const draft = [
    { text: 'note', style: { left: '40px', top: '55px', width: '120px', height: '80px' } },
  ] as any[];
  let captureCalls = 0;

  const result = beginNotePointerInteraction({
    draftNotes: draft as any,
    draftNotesRef: { current: draft as any },
    captureEditorsIntoNotes(base) {
      captureCalls += 1;
      return base;
    },
    index: 0,
    readSavedNoteStyle: note => note?.style || {},
    point: { x: 70, y: 90 },
    pointerId: 8,
    refs,
  });

  assert.equal(captureCalls, 1);
  assert.equal(refs.interactionBaseNotesRef.current, draft as any);
  assert.equal(refs.interactionStartNotesRef.current, draft as any);
  assert.deepEqual(result, {
    base: draft,
    interaction: {
      kind: 'move',
      index: 0,
      startX: 70,
      startY: 90,
      startLeft: 40,
      startTop: 55,
      pointerId: 8,
    },
  });
});

test('beginHandlePointerInteraction seeds resize interactions for side and corner handles', () => {
  const refs = createRefs();
  const draft = [
    { text: 'note', style: { left: '15px', top: '25px', width: '130px', height: '90px' } },
  ] as any[];

  const result = beginHandlePointerInteraction({
    draftNotes: draft as any,
    draftNotesRef: { current: draft as any },
    captureEditorsIntoNotes: base => base,
    index: 0,
    dir: 'se',
    readSavedNoteStyle: note => note?.style || {},
    point: { x: 90, y: 110 },
    pointerId: 4,
    refs,
  });

  assert.deepEqual(result?.interaction, {
    kind: 'resize',
    index: 0,
    dir: 'se',
    startX: 90,
    startY: 110,
    startLeft: 15,
    startTop: 25,
    startWidth: 130,
    startHeight: 90,
    pointerId: 4,
  });
});

test('updatePointerInteractionDraft preserves identity for no-op moves and stores changed snapshots', () => {
  const refs = createRefs();
  const draft = [
    { text: 'note', style: { left: '10px', top: '15px', width: '100px', height: '60px' } },
  ] as any[];
  refs.interactionBaseNotesRef.current = draft as any;

  const move = {
    kind: 'move',
    index: 0,
    startX: 20,
    startY: 20,
    startLeft: 10,
    startTop: 15,
    pointerId: 2,
  } as const;

  const same = updatePointerInteractionDraft(
    move,
    { x: 20, y: 20 },
    draft as any,
    { current: draft as any },
    refs
  );
  assert.equal(same, draft as any);
  assert.equal(refs.interactionBaseNotesRef.current, draft as any);

  const changed = updatePointerInteractionDraft(
    move,
    { x: 40, y: 55 },
    draft as any,
    { current: draft as any },
    refs
  );
  assert.notEqual(changed, draft as any);
  assert.equal(changed[0]?.style?.left, '30px');
  assert.equal(changed[0]?.style?.top, '50px');
  assert.equal(refs.interactionBaseNotesRef.current, changed);
});

test('finalizePointerInteractionDraft suppresses no-op commits and clears stored snapshots', () => {
  const refs = createRefs();
  const start = [
    { text: 'same', style: { left: '10px', top: '20px', width: '100px', height: '70px' } },
  ] as any[];
  const currentClone = [
    { text: 'same', style: { left: '10px', top: '20px', width: '100px', height: '70px' } },
  ] as any;
  refs.interactionBaseNotesRef.current = currentClone;
  refs.interactionStartNotesRef.current = start as any;

  const result = finalizePointerInteractionDraft({
    draftNotes: start as any,
    draftNotesRef: { current: start as any },
    captureEditorsIntoNotes: base => base,
    refs,
  });

  assert.equal(result.shouldCommit, false);
  assert.equal(result.nextDraft, currentClone);
  assert.equal(refs.interactionBaseNotesRef.current, null);
  assert.equal(refs.interactionStartNotesRef.current, null);
});

test('resetPointerInteractionRefs clears all in-flight pointer snapshots', () => {
  const refs = createRefs();
  refs.createLastPointRef.current = { x: 9, y: 8 };
  refs.interactionBaseNotesRef.current = [{ text: 'a' }] as any;
  refs.interactionStartNotesRef.current = [{ text: 'b' }] as any;

  resetPointerInteractionRefs(refs);

  assert.equal(refs.createLastPointRef.current, null);
  assert.equal(refs.interactionBaseNotesRef.current, null);
  assert.equal(refs.interactionStartNotesRef.current, null);
});
