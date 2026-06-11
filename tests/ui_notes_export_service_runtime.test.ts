import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getUiNotesExportRuntimeServiceMaybe,
  getUiNotesExportServiceMaybe,
  isUiNotesExportInstalled,
} from '../esm/native/runtime/ui_notes_export_access.ts';
import { installNotesExport } from '../esm/native/ui/notes_export.ts';

test('installNotesExport installs canonical services.uiNotesExport API and runtime state without mixing them', () => {
  const existingApiSlot = Object.create(null) as Record<string, unknown>;
  existingApiSlot.keep = 'yes';

  const existingRuntimeSlot = Object.create(null) as Record<string, unknown>;
  existingRuntimeSlot.cache = 'runtime';

  const App: Record<string, unknown> = {
    services: Object.assign(Object.create(null), {
      uiNotesExport: existingApiSlot,
      uiNotesExportRuntime: existingRuntimeSlot,
    }),
  };

  assert.equal(installNotesExport(App), true);

  const api = getUiNotesExportServiceMaybe(App);
  const runtime = getUiNotesExportRuntimeServiceMaybe(App);

  assert.equal(api, existingApiSlot);
  assert.equal(api?.keep, 'yes');
  assert.equal(typeof api?.shouldIncludeNotesInExport, 'function');
  assert.equal(typeof api?.renderAllNotesToCanvas, 'function');
  assert.equal((api as Record<string, unknown> | null)?.installed, undefined);
  assert.equal((api as Record<string, unknown> | null)?.exportTransform, undefined);

  assert.equal(runtime, existingRuntimeSlot);
  assert.equal(runtime?.cache, 'runtime');
  assert.equal(runtime?.installed, true);
  assert.equal(isUiNotesExportInstalled(App), true);
});

test('installNotesExport is idempotent once the canonical API surface is already installed', () => {
  const App: Record<string, unknown> = {
    services: Object.create(null),
    store: {
      getState: () => ({ annotations: [], ui: { notesEnabled: false } }),
    },
  };

  assert.equal(installNotesExport(App), true);
  const apiAfterFirstInstall = getUiNotesExportServiceMaybe(App);
  const includeAfterFirstInstall = apiAfterFirstInstall?.shouldIncludeNotesInExport;
  const renderAfterFirstInstall = apiAfterFirstInstall?.renderAllNotesToCanvas;

  assert.equal(typeof includeAfterFirstInstall, 'function');
  assert.equal(typeof renderAfterFirstInstall, 'function');
  assert.equal(isUiNotesExportInstalled(App), true);

  assert.equal(installNotesExport(App), true);
  const apiAfterSecondInstall = getUiNotesExportServiceMaybe(App);

  assert.equal(apiAfterSecondInstall?.shouldIncludeNotesInExport, includeAfterFirstInstall);
  assert.equal(apiAfterSecondInstall?.renderAllNotesToCanvas, renderAfterFirstInstall);
  assert.equal(getUiNotesExportRuntimeServiceMaybe(App)?.installed, true);
});
