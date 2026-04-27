import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearNotesTypingPersist,
  prepareDeletedDraftNotes,
  scheduleNotesTypingPersist,
} from '../esm/native/ui/react/notes/notes_overlay_editor_workflow_persistence_runtime.js';

type TimerEntry = {
  id: number;
  fn: () => void;
  cleared: boolean;
};

function createTimerApp() {
  let nextId = 1;
  const entries: TimerEntry[] = [];
  const cleared: Array<number | undefined> = [];
  const App: any = {
    deps: {
      browser: {
        setTimeout(fn: () => void) {
          const id = nextId++;
          entries.push({ id, fn, cleared: false });
          return id;
        },
        clearTimeout(id?: number) {
          cleared.push(id);
          const entry = entries.find(item => item.id === id);
          if (entry) entry.cleared = true;
        },
      },
    },
  };

  return {
    App,
    entries,
    cleared,
    run(id: number) {
      const entry = entries.find(item => item.id === id);
      assert.ok(entry, `missing timer ${id}`);
      entry.fn();
    },
  };
}

test('notes typing persist keeps one active browser-timer and ignores stale callbacks', () => {
  const timers = createTimerApp();
  const typingCommitTimerRef = { current: null as number | null };
  const typingCommitTokenRef = { current: 0 };
  const draftNotesRef = { current: [{ text: 'draft-1' }] as Array<{ text: string }> };
  const commits: Array<{ source: string; next: Array<{ text: string }> }> = [];

  scheduleNotesTypingPersist({
    App: timers.App,
    editMode: true,
    activeIndex: 0,
    typingCommitTimerRef,
    typingCommitTokenRef,
    draftNotesRef,
    captureEditorsIntoNotes(base) {
      return [...base, { text: `captured-${commits.length + 1}` }];
    },
    commitNotes(next, source) {
      commits.push({ source, next: next as Array<{ text: string }> });
    },
    source: 'react:notes:typing:first',
  });

  assert.equal(typingCommitTimerRef.current, 1);
  assert.equal(typingCommitTokenRef.current, 1);

  scheduleNotesTypingPersist({
    App: timers.App,
    editMode: true,
    activeIndex: 0,
    typingCommitTimerRef,
    typingCommitTokenRef,
    draftNotesRef,
    captureEditorsIntoNotes(base) {
      return [...base, { text: `captured-${commits.length + 1}` }];
    },
    commitNotes(next, source) {
      commits.push({ source, next: next as Array<{ text: string }> });
    },
    source: 'react:notes:typing:second',
  });

  assert.deepEqual(timers.cleared, [undefined, 1]);
  assert.equal(typingCommitTimerRef.current, 2);
  assert.equal(typingCommitTokenRef.current, 2);

  timers.run(1);
  assert.deepEqual(commits, []);
  assert.deepEqual(draftNotesRef.current, [{ text: 'draft-1' }]);

  timers.run(2);
  assert.equal(commits.length, 1);
  assert.equal(commits[0]?.source, 'react:notes:typing:second');
  assert.deepEqual(commits[0]?.next, [{ text: 'draft-1' }, { text: 'captured-1' }]);
  assert.deepEqual(draftNotesRef.current, [{ text: 'draft-1' }, { text: 'captured-1' }]);
  assert.equal(typingCommitTimerRef.current, null);
});

test('notes typing persist clear uses browser timers and suppresses late callbacks after cancel', () => {
  const timers = createTimerApp();
  const typingCommitTimerRef = { current: null as number | null };
  const typingCommitTokenRef = { current: 0 };
  const draftNotesRef = { current: [{ text: 'draft-1' }] as Array<{ text: string }> };
  const commits: string[] = [];

  scheduleNotesTypingPersist({
    App: timers.App,
    editMode: true,
    activeIndex: 0,
    typingCommitTimerRef,
    typingCommitTokenRef,
    draftNotesRef,
    captureEditorsIntoNotes(base) {
      return [...base, { text: 'captured-after-clear' }];
    },
    commitNotes(_next, source) {
      commits.push(source);
    },
    source: 'react:notes:typing:clear-me',
  });

  assert.equal(typingCommitTimerRef.current, 1);
  clearNotesTypingPersist(timers.App, typingCommitTimerRef, typingCommitTokenRef);
  assert.equal(typingCommitTimerRef.current, null);
  assert.equal(typingCommitTokenRef.current, 2);
  assert.deepEqual(timers.cleared, [undefined, 1]);

  timers.run(1);
  assert.deepEqual(commits, []);
  assert.deepEqual(draftNotesRef.current, [{ text: 'draft-1' }]);
});

test('notes typing persist skips semantic no-op clones so delayed saves do not churn commits', () => {
  const timers = createTimerApp();
  const base = [{ text: 'same-text' }] as Array<{ text: string }>;
  const typingCommitTimerRef = { current: null as number | null };
  const typingCommitTokenRef = { current: 0 };
  const draftNotesRef = { current: base };
  const commits: string[] = [];

  scheduleNotesTypingPersist({
    App: timers.App,
    editMode: true,
    activeIndex: 0,
    typingCommitTimerRef,
    typingCommitTokenRef,
    draftNotesRef,
    captureEditorsIntoNotes(baseNotes) {
      return baseNotes.map(note => ({ ...note }));
    },
    commitNotes(_next, source) {
      commits.push(source);
    },
    source: 'react:notes:typing:no-op',
  });

  timers.run(1);
  assert.deepEqual(commits, []);
  assert.equal(draftNotesRef.current, base);
  assert.equal(typingCommitTimerRef.current, null);
});

test('prepareDeletedDraftNotes captures live editor changes before deleting the targeted note', () => {
  const draft = [{ text: 'stale-first' }, { text: 'remove-me' }, { text: 'stale-third' }] as Array<{
    text: string;
  }>;

  const out = prepareDeletedDraftNotes({
    draftNotes: draft as any,
    index: 1,
    captureEditorsIntoNotes(base) {
      return [{ ...base[0], text: 'live-first' }, base[1], { ...base[2], text: 'live-third' }] as Array<{
        text: string;
      }>;
    },
  });

  assert.equal(out.deleted, true);
  assert.deepEqual(out.next, [{ text: 'live-first' }, { text: 'live-third' }]);
});

test('prepareDeletedDraftNotes stays a no-op when the requested delete index is out of range', () => {
  const draft = [{ text: 'keep-me' }] as Array<{ text: string }>;

  const out = prepareDeletedDraftNotes({
    draftNotes: draft as any,
    index: 9,
    captureEditorsIntoNotes(base) {
      return base;
    },
  });

  assert.equal(out.deleted, false);
  assert.equal(out.next, draft);
});
