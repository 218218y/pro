import test from 'node:test';
import assert from 'node:assert/strict';

import {
  captureSavedNotesViaService,
  ensureNotesDraw,
  ensureNotesRuntime,
  ensureNotesService,
  exitNotesDrawModeViaService,
  persistNotesViaService,
  restoreNotesFromSaveViaService,
  sanitizeNotesHtmlViaService,
  subscribeNotesDrawMode,
  setNotesScreenDrawMode,
} from '../esm/native/runtime/notes_access.ts';

test('notes access uses canonical service/runtime/draw seams and preserves service behavior', () => {
  const saved: unknown[] = [{ id: 'n1' }];
  const restored: unknown[] = [];
  const persisted: unknown[] = [];
  const sanitized: string[] = [];

  const App = {
    services: {
      notes: {
        getForSave: () => saved,
        restoreFromSave: (next: unknown) => restored.push(next),
        persist: (meta?: unknown) => persisted.push(meta ?? null),
        sanitize: (html: string) => {
          sanitized.push(html);
          return String(html).replace(/<[^>]*>/g, '');
        },
      },
    },
  } as any;

  const svc = ensureNotesService(App);
  const rt = ensureNotesRuntime(App);
  const draw = ensureNotesDraw(App);

  assert.equal(typeof svc, 'object');
  assert.equal(typeof rt, 'object');
  assert.equal(typeof draw, 'object');

  const captured = captureSavedNotesViaService(App);
  assert.deepEqual(captured, saved);
  assert.notEqual(captured, saved);

  assert.equal(restoreNotesFromSaveViaService(App, [{ id: 'n2' }]), true);
  assert.deepEqual(restored, [[{ id: 'n2' }]]);

  assert.equal(persistNotesViaService(App, { source: 'rt' } as any), true);
  assert.equal(persisted.length, 1);

  assert.equal(sanitizeNotesHtmlViaService(App, '<b>x</b><script>y</script>'), 'xy');
  assert.deepEqual(sanitized, ['<b>x</b><script>y</script>']);

  assert.equal(setNotesScreenDrawMode(App, true), true);
  assert.equal(draw.isScreenDrawMode, true);
  assert.equal(exitNotesDrawModeViaService(App), true);
  assert.equal(draw.isScreenDrawMode, false);
});

test('notes draw mode subscriptions publish canonical transitions without duplicate churn', () => {
  const App = { services: { notes: {} } } as any;
  const seen: boolean[] = [];
  const unsubscribe = subscribeNotesDrawMode(App, active => {
    seen.push(active);
  });

  assert.equal(setNotesScreenDrawMode(App, true), true);
  assert.equal(setNotesScreenDrawMode(App, true), true);
  assert.equal(setNotesScreenDrawMode(App, false), true);
  assert.deepEqual(seen, [true, false]);

  unsubscribe();
  assert.equal(setNotesScreenDrawMode(App, true), true);
  assert.deepEqual(seen, [true, false]);
});

test('notes access reports owner rejections while preserving local recovery values', () => {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const App = {
    services: {
      errors: {
        report: (error: unknown, ctx?: unknown) => reports.push({ error, ctx }),
      },
      notes: {
        getForSave: () => {
          throw new Error('capture failed');
        },
        restoreFromSave: () => {
          throw new Error('restore failed');
        },
        persist: () => {
          throw new Error('persist failed');
        },
        sanitize: () => {
          throw new Error('sanitize failed');
        },
      },
      uiNotes: {
        exitScreenDrawMode: () => {
          throw new Error('ui exit failed');
        },
      },
    },
  } as any;

  assert.deepEqual(captureSavedNotesViaService(App), []);
  assert.equal(restoreNotesFromSaveViaService(App, [{ id: 'x' }]), false);
  assert.equal(persistNotesViaService(App, { source: 'test' } as any), false);
  assert.equal(sanitizeNotesHtmlViaService(App, '<b>x</b>'), '<b>x</b>');
  assert.equal(exitNotesDrawModeViaService(App), true);

  assert.deepEqual(
    reports.map(report => report.ctx?.op),
    [
      'notes.getForSave.ownerRejected',
      'notes.restoreFromSave.ownerRejected',
      'notes.persist.ownerRejected',
      'notes.sanitize.ownerRejected',
      'notes.ui.exitScreenDrawMode.ownerRejected',
    ]
  );
  assert.ok(reports.every(report => report.ctx?.where === 'native/runtime/notes_access'));
  assert.ok(reports.every(report => report.ctx?.fatal === false));
});
