import test from 'node:test';
import assert from 'node:assert/strict';

import {
  captureProjectSnapshotMaybe,
  ensureModelsLoadedViaService,
  exportUserModelsViaService,
  getCustomUploadedTextureMaybe,
  mergeImportedModelsViaService,
  persistNotesViaService,
  resetAllEditModesViaService,
  sanitizeNotesHtmlViaService,
  setAutosaveAllowed,
} from '../esm/native/services/api.ts';
import { scheduleAutosaveViaService } from '../esm/native/runtime/autosave_access.ts';
import {
  ensureTexturesCacheService,
  setCustomUploadedTextureViaService,
} from '../esm/native/runtime/textures_cache_access.ts';

test('public service surface runtime: autosave, edit-state, and textures stay behavior-first', () => {
  const calls: string[] = [];
  const texture = { dispose() {} };
  const resetAllEditModes = () => calls.push('reset');
  const App = {
    services: Object.assign(Object.create(null), {
      autosave: {
        allow: false,
        schedule() {
          calls.push('schedule');
        },
      },
      editState: {
        resetAllEditModes,
        __wpResetAllEditModes: resetAllEditModes,
      },
    }),
  };

  assert.equal(setAutosaveAllowed(App, true), true);
  assert.equal(App.services.autosave.allow, true);
  assert.equal(scheduleAutosaveViaService(App), true);

  assert.equal(getCustomUploadedTextureMaybe(App), null);
  assert.equal(ensureTexturesCacheService(App).customUploadedTexture, null);
  assert.equal(setCustomUploadedTextureViaService(App, texture), texture);
  assert.equal(getCustomUploadedTextureMaybe(App), texture);

  assert.equal(resetAllEditModesViaService(App), true);
  assert.deepEqual(calls, ['schedule', 'reset']);
});

test('public service surface runtime: edit-state API heals drifted public reset method from the canonical slot', () => {
  const calls: string[] = [];
  const canonicalReset = () => calls.push('canonical-reset');
  const App = {
    services: {
      editState: {
        resetAllEditModes: () => calls.push('stale-reset'),
        __wpResetAllEditModes: canonicalReset,
      },
    },
  };

  assert.equal(resetAllEditModesViaService(App), true);
  assert.equal(App.services.editState.resetAllEditModes, canonicalReset);
  assert.deepEqual(calls, ['canonical-reset']);
});

test('public service surface runtime: models commands stay on the canonical service seam', () => {
  const calls: unknown[] = [];
  const App = {
    services: {
      models: {
        ensureLoaded(opts?: unknown) {
          calls.push(['ensureLoaded', opts ?? null]);
        },
        exportUserModels() {
          return [
            { id: ' m1 ', name: ' Model 1 ' },
            { id: 'm1', name: 'Duplicate wins' },
            { id: 'm2', name: 'Model 2' },
          ];
        },
        mergeImportedModels(list: unknown) {
          calls.push(['mergeImportedModels', list]);
          return { added: 2, updated: 1 };
        },
      },
    },
  };

  assert.equal(ensureModelsLoadedViaService(App, { silent: true }), true);
  assert.deepEqual(exportUserModelsViaService(App), [
    { id: 'm1', name: 'Duplicate wins' },
    { id: 'm2', name: 'Model 2' },
  ]);
  assert.deepEqual(
    mergeImportedModelsViaService(App, [
      { id: ' x1 ', name: ' X1 ' },
      { id: 'x1', name: 'Duplicate wins' },
      { id: 'x2', name: 'X2' },
    ] as any),
    { added: 2, updated: 1 }
  );

  assert.deepEqual(calls, [
    ['ensureLoaded', { silent: true }],
    [
      'mergeImportedModels',
      [
        { id: 'x1', name: 'Duplicate wins' },
        { id: 'x2', name: 'X2' },
      ],
    ],
  ]);
});

test('public service surface runtime: notes and project capture stay behavior-first through canonical service seams', () => {
  const persisted: unknown[] = [];
  const captures: unknown[] = [];
  const App = {
    services: {
      notes: {
        persist(meta?: unknown) {
          persisted.push(meta ?? null);
        },
        sanitize(html: string) {
          return html.replace(/<[^>]+>/g, '');
        },
      },
      project: {
        capture(scope: unknown) {
          captures.push(scope);
          return { ok: true, scope };
        },
      },
    },
  };

  assert.equal(persistNotesViaService(App, { source: 'public-surface' } as any), true);
  assert.equal(sanitizeNotesHtmlViaService(App, '<b>hello</b><i>!</i>'), 'hello!');
  assert.deepEqual(captureProjectSnapshotMaybe(App, 'persist'), { ok: true, scope: 'persist' });
  assert.deepEqual(persisted, [{ source: 'public-surface' }]);
  assert.deepEqual(captures, ['persist']);
});
