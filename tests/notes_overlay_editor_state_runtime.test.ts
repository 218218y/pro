import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyStylePatchToNote,
  captureEditorsIntoNotes,
  filterEmptyNotes,
  notesChanged,
  preserveEquivalentNoteSnapshot,
  reconcileDraftNotesWithNormalized,
  removeNoteAtIndex,
} from '../esm/native/ui/react/notes/notes_overlay_editor_state.js';

test('captureEditorsIntoNotes sanitizes changed editor html and preserves untouched notes by identity', () => {
  const App = {
    services: {
      notes: {
        sanitize: (html: string) => html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').trim(),
      },
    },
  } as any;

  const base = [
    { text: '<b>same</b>', style: { left: '0px' } },
    { text: 'old', style: { left: '10px' } },
  ] as any[];

  const out = captureEditorsIntoNotes(
    App,
    [{ innerHTML: '<b>same</b>' } as any, { innerHTML: ' <i>fresh</i><script>boom()</script> ' } as any],
    base as any
  );

  assert.equal(out[0], base[0]);
  assert.notEqual(out[1], base[1]);
  assert.equal(out[1]?.text, '<i>fresh</i>');
});

test('filterEmptyNotes removes whitespace-only or empty-html notes but keeps real content', () => {
  const out = filterEmptyNotes([
    { text: '' },
    { text: '<div><br/></div>' },
    { text: '&nbsp;' },
    { text: '<p>real</p>' },
  ] as any);

  assert.deepEqual(out, [{ text: '<p>real</p>' }]);
});

test('filterEmptyNotes preserves array identity when no note is empty', () => {
  const notes = [{ text: '<p>real</p>' }, { text: 'also real' }] as any[];
  const out = filterEmptyNotes(notes as any);
  assert.equal(out, notes);
});

test('applyStylePatchToNote merges a style patch without mutating the original note', () => {
  const note = {
    text: 'x',
    style: {
      left: '10px',
      top: '20px',
      color: '#111111',
    },
  } as any;

  const next = applyStylePatchToNote(note, { top: '25px', color: '#ef4444' });

  assert.notEqual(next, note);
  assert.notEqual(next.style, note.style);
  assert.deepEqual(next.style, {
    left: '10px',
    top: '25px',
    color: '#ef4444',
  });
  assert.deepEqual(note.style, {
    left: '10px',
    top: '20px',
    color: '#111111',
  });
});

test('notesChanged tracks semantic note changes but ignores identical references', () => {
  const same = [{ text: 'a' }] as any[];
  assert.equal(notesChanged(same as any, same as any), false);
  assert.equal(notesChanged([{ text: 'a' }] as any, [{ text: 'a' }] as any), false);
  assert.equal(notesChanged([{ text: 'a' }] as any, [{ text: 'b' }] as any), true);
  assert.equal(notesChanged([{ text: 'a' }] as any, [{ text: 'a' }, { text: 'b' }] as any), true);
});

test('reconcileDraftNotesWithNormalized preserves draft identity for semantic no-op normalized refreshes', () => {
  const draft = [
    { id: 'n1', text: 'same', style: { left: '10px', top: '20px', width: '100px', height: '70px' } },
  ] as any[];
  const normalized = [
    { style: { height: '70px', width: '100px', top: '20px', left: '10px' }, text: 'same', id: 'n1' },
  ] as any[];

  const out = reconcileDraftNotesWithNormalized(draft as any, normalized as any);
  assert.equal(out, draft);
});

test('reconcileDraftNotesWithNormalized adopts the normalized snapshot when note content actually changes', () => {
  const draft = [{ id: 'n1', text: 'before', style: { left: '10px', top: '20px' } }] as any[];
  const normalized = [{ id: 'n1', text: 'after', style: { left: '10px', top: '20px' } }] as any[];

  const out = reconcileDraftNotesWithNormalized(draft as any, normalized as any);
  assert.equal(out, normalized);
});

test('removeNoteAtIndex preserves identity for out-of-range deletes and only removes the targeted note', () => {
  const notes = [
    { id: 'n1', text: 'a' },
    { id: 'n2', text: 'b' },
    { id: 'n3', text: 'c' },
  ] as any[];

  assert.equal(removeNoteAtIndex(notes as any, -1), notes);
  assert.equal(removeNoteAtIndex(notes as any, 7), notes);

  const out = removeNoteAtIndex(notes as any, 1);
  assert.notEqual(out, notes);
  assert.deepEqual(out, [
    { id: 'n1', text: 'a' },
    { id: 'n3', text: 'c' },
  ]);
});

test('applyStylePatchToNote preserves note identity for semantic no-op style patches', () => {
  const note = {
    text: 'x',
    style: {
      left: '10px',
      top: '20px',
      color: '#111111',
    },
  } as any;

  assert.equal(applyStylePatchToNote(note, { top: '20px' }), note);
  assert.equal(applyStylePatchToNote(note, { color: '#111111', top: '20px' }), note);
});

test('preserveEquivalentNoteSnapshot reuses the previous array for semantic no-op note clones and adopts real changes', () => {
  const prev = [{ id: 'n1', text: 'same', style: { left: '10px', top: '20px' } }] as any[];
  const semanticClone = [{ style: { top: '20px', left: '10px' }, text: 'same', id: 'n1' }] as any[];
  const changed = [{ id: 'n1', text: 'changed', style: { left: '10px', top: '20px' } }] as any[];

  assert.equal(preserveEquivalentNoteSnapshot(prev as any, semanticClone as any), prev);
  assert.equal(preserveEquivalentNoteSnapshot(prev as any, changed as any), changed);
});
