import test from 'node:test';
import assert from 'node:assert/strict';

import {
  installNotesService,
  normalizeSavedNotes,
  sanitizeRichTextHTML,
} from '../esm/native/ui/notes_service.ts';
import { getUiNotesServiceMaybe } from '../esm/native/runtime/notes_access.ts';

test('notes service sanitizer falls back without DOM and saved notes are detached from config state', () => {
  const state: any = {
    config: {
      savedNotes: [
        {
          id: 'n1',
          text: '<script>x</script><b>Hello</b>',
          style: { left: '1px', top: '2px', textColor: '#123456' },
          doorsOpen: true,
        },
      ],
    },
  };
  const App: any = {
    store: {
      getState: () => state,
      setState(next: any) {
        state.config = next.config;
      },
      subscribe() {
        return () => {};
      },
    },
    actions: {
      config: {
        setSavedNotes(next: unknown) {
          state.config.savedNotes = Array.isArray(next) ? next : [];
          return true;
        },
      },
      meta: {
        noBuild(meta: any) {
          return meta;
        },
        noHistory(meta: any) {
          return meta;
        },
      },
    },
  };

  assert.equal(sanitizeRichTextHTML(App, '<script>x</script><b>Hello</b>'), 'xHello');

  const notes = installNotesService(App);
  const saved = notes.getForSave?.() || [];
  assert.equal(saved[0]?.text, 'xHello');
  assert.equal(saved[0]?.style.left, '1px');
  assert.equal(saved[0]?.style.top, '2px');
  assert.equal(saved[0]?.style.baseFontSize, '4');

  (saved[0] as any).style.left = '999px';
  assert.equal(state.config.savedNotes[0].style.left, '1px');

  const normalized = normalizeSavedNotes(App, state.config.savedNotes);
  normalized[0]!.style.top = '777px';
  assert.equal(state.config.savedNotes[0].style.top, '2px');
});

test('installNotesService keeps canonical notes/uiNotes methods stable across repeated installs and heals missing methods', () => {
  const notesSlot = Object.assign(Object.create(null), { keep: 'notes' });
  const uiNotesSlot = Object.assign(Object.create(null), { keep: 'uiNotes' });
  const App: any = {
    services: Object.assign(Object.create(null), { notes: notesSlot, uiNotes: uiNotesSlot }),
    store: {
      getState: () => ({ config: { savedNotes: [] } }),
      setState() {},
      subscribe() {
        return () => {};
      },
    },
    actions: {
      config: {
        setSavedNotes() {
          return true;
        },
      },
      meta: {
        noBuild(meta: any) {
          return meta;
        },
        noHistory(meta: any) {
          return meta;
        },
      },
    },
  };

  const notesAfterFirstInstall = installNotesService(App);
  const uiNotesAfterFirstInstall = getUiNotesServiceMaybe(App);

  assert.equal(notesAfterFirstInstall, notesSlot);
  assert.equal(uiNotesAfterFirstInstall, uiNotesSlot);
  assert.equal(notesAfterFirstInstall.keep, 'notes');
  assert.equal(uiNotesAfterFirstInstall?.keep, 'uiNotes');

  const sanitizeRef = notesAfterFirstInstall.sanitize;
  const getForSaveRef = notesAfterFirstInstall.getForSave;
  const restoreRef = notesAfterFirstInstall.restoreFromSave;
  const clearRef = notesAfterFirstInstall.clear;
  const persistRef = notesAfterFirstInstall.persist;
  const enterRef = uiNotesAfterFirstInstall?.enterScreenDrawMode;
  const exitRef = uiNotesAfterFirstInstall?.exitScreenDrawMode;

  assert.equal(typeof sanitizeRef, 'function');
  assert.equal(typeof getForSaveRef, 'function');
  assert.equal(typeof restoreRef, 'function');
  assert.equal(typeof clearRef, 'function');
  assert.equal(typeof persistRef, 'function');
  assert.equal(typeof enterRef, 'function');
  assert.equal(typeof exitRef, 'function');

  delete notesAfterFirstInstall.clear;
  if (uiNotesAfterFirstInstall) delete uiNotesAfterFirstInstall.exitScreenDrawMode;

  const notesAfterSecondInstall = installNotesService(App);
  const uiNotesAfterSecondInstall = getUiNotesServiceMaybe(App);

  assert.equal(notesAfterSecondInstall, notesSlot);
  assert.equal(uiNotesAfterSecondInstall, uiNotesSlot);
  assert.equal(notesAfterSecondInstall.sanitize, sanitizeRef);
  assert.equal(notesAfterSecondInstall.getForSave, getForSaveRef);
  assert.equal(notesAfterSecondInstall.restoreFromSave, restoreRef);
  assert.equal(notesAfterSecondInstall.persist, persistRef);
  assert.equal(uiNotesAfterSecondInstall?.enterScreenDrawMode, enterRef);
  assert.equal(notesAfterSecondInstall.clear instanceof Function, true);
  assert.equal(uiNotesAfterSecondInstall?.exitScreenDrawMode instanceof Function, true);
});

test('notes service restore, persist, and draw-mode hooks stay behavior-first through canonical seams', () => {
  const events: string[] = [];
  const persisted: any[] = [];
  const state: any = {
    config: { savedNotes: [] },
  };
  const App: any = {
    store: {
      getState: () => state,
      setState(next: any) {
        state.config = next.config;
      },
      subscribe() {
        return () => {};
      },
    },
    actions: {
      config: {
        setSavedNotes(next: unknown) {
          state.config.savedNotes = Array.isArray(next) ? next : [];
          events.push(`save:${state.config.savedNotes.length}`);
          return true;
        },
      },
      meta: {
        noBuild(meta: any) {
          return { ...meta, noBuild: true };
        },
        noHistory(meta: any) {
          return { ...meta, noHistory: true };
        },
        persist(meta: any) {
          persisted.push(meta);
        },
      },
    },
  };

  const notes = installNotesService(App);
  const uiNotes = getUiNotesServiceMaybe(App);
  notes.runtime!.onEnterDrawMode = () => events.push('enter');
  notes.runtime!.onExitDrawMode = () => events.push('exit');

  notes.restoreFromSave?.([
    {
      id: 'n1',
      text: '<b>Hello</b>',
      style: { left: '10px', top: '20px' },
    },
  ]);
  assert.equal(state.config.savedNotes.length, 1);
  assert.equal(state.config.savedNotes[0].text, 'Hello');

  uiNotes?.enterScreenDrawMode?.();
  uiNotes?.exitScreenDrawMode?.();
  notes.persist?.({ source: 'custom-source' });
  notes.clear?.();

  assert.equal(notes.draw?.isScreenDrawMode, false);
  assert.deepEqual(events, ['save:1', 'enter', 'exit', 'save:0']);
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0]?.source, 'custom-source');
  assert.equal(persisted[0]?.noBuild, true);
  assert.equal(persisted[0]?.noHistory, true);
  assert.equal(persisted[0]?.immediate, true);
});
