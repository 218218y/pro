import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearNotesExportTransform,
  ensureUiNotesExportRuntimeService,
  getNotesExportTransform,
  markUiNotesExportInstalled,
  setNotesExportTransform,
} from '../esm/native/runtime/ui_notes_export_access.ts';

test('ui notes export runtime state keeps install flag and export transform in canonical runtime service', () => {
  const App: Record<string, unknown> = { services: Object.create(null) };

  const runtime = ensureUiNotesExportRuntimeService(App);
  assert.equal(runtime.installed, undefined);
  assert.equal(getNotesExportTransform(App), null);

  markUiNotesExportInstalled(App);
  const transform = { kind: 'affine', sx: 2 } as const;
  assert.equal(setNotesExportTransform(App, transform), transform);
  assert.equal(getNotesExportTransform(App), transform);
  assert.equal(runtime.installed, true);

  clearNotesExportTransform(App);
  assert.equal(getNotesExportTransform(App), null);
  assert.equal(runtime.exportTransform, null);
});
