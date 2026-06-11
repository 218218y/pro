import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureModelsService,
  getModelsServiceMaybe,
  ensureModelsLoadedViaService,
  ensureModelsLoadedViaServiceOrThrow,
  exportUserModelsViaService,
  mergeImportedModelsViaService,
  mergeImportedModelsViaServiceOrThrow,
  normalizeModelsCommandReason,
} from '../esm/native/runtime/models_access.ts';

test('models access runtime: canonical access helpers drive the models service surface', () => {
  const calls: string[] = [];
  const App: Record<string, unknown> = {
    services: {
      models: {
        ensureLoaded: () => calls.push('ensureLoaded'),
        exportUserModels: () => [{ id: 'm1', name: 'Model A' }],
        mergeImportedModels: () => ({ added: 2, updated: 1 }),
      },
    },
  };

  const ensured = ensureModelsService(App);
  assert.equal(getModelsServiceMaybe(App), ensured);
  assert.equal(ensureModelsLoadedViaService(App, { silent: true }), true);
  ensureModelsLoadedViaServiceOrThrow(App, { forceRebuild: true });
  assert.deepEqual(exportUserModelsViaService(App), [{ id: 'm1', name: 'Model A' }]);
  assert.deepEqual(mergeImportedModelsViaService(App, [{ id: 'a' }]), { added: 2, updated: 1 });
  assert.deepEqual(mergeImportedModelsViaServiceOrThrow(App, [{ id: 'a' }]), { added: 2, updated: 1 });
  assert.deepEqual(calls, ['ensureLoaded', 'ensureLoaded']);
});

test('models access runtime: export and merge flows canonicalize saved model collections', () => {
  const mergeCalls: unknown[] = [];
  const presetCalls: unknown[] = [];
  const App = {
    services: {
      models: {
        getAll() {
          return [];
        },
        getById() {
          return null;
        },
        exportUserModels() {
          return [
            { id: '  m1  ', name: '  Model A  ', extra: true },
            { id: 'm1', name: 'Duplicate should drop' },
            { id: ' ', name: 'broken' },
            { id: 'm2', name: '  Model B' },
          ];
        },
        mergeImportedModels(list: unknown) {
          mergeCalls.push(list);
          return { added: 1, updated: 0 };
        },
        setPresets(list: unknown) {
          presetCalls.push(list);
        },
      },
    },
  } as any;

  assert.deepEqual(exportUserModelsViaService(App), [
    { id: 'm1', name: 'Duplicate should drop' },
    { id: 'm2', name: 'Model B' },
  ]);

  assert.deepEqual(
    mergeImportedModelsViaService(App, [
      { id: '  m9 ', name: ' Imported 9 ' },
      { id: 'm9', name: 'duplicate drop' },
      { id: ' ', name: 'broken' },
      { id: 'm10', name: ' Imported 10' },
    ] as any),
    { added: 1, updated: 0 }
  );
  assert.deepEqual(mergeCalls, [
    [
      { id: 'm9', name: 'duplicate drop' },
      { id: 'm10', name: 'Imported 10' },
    ],
  ]);

  const svc = getModelsServiceMaybe(App);
  assert.equal(!!svc, true);
  svc?.setPresets([
    { id: ' preset-a ', name: ' Preset A ' },
    { id: 'preset-a', name: 'drop duplicate' },
    { id: 'preset-b', name: 'Preset B' },
    { id: '', name: 'broken' },
  ] as any);
  assert.deepEqual(presetCalls, [
    [
      { id: 'preset-a', name: 'drop duplicate' },
      { id: 'preset-b', name: 'Preset B' },
    ],
  ]);
});
test('models access runtime: strict helpers fail closed when canonical merge/load seams are missing', () => {
  assert.throws(() => ensureModelsLoadedViaServiceOrThrow({} as any), /services\.models\.ensureLoaded/i);
  assert.throws(
    () => mergeImportedModelsViaServiceOrThrow({} as any, [{ id: 'm1', name: 'Model A' }] as any),
    /services\.models\.mergeImportedModels/i
  );
});

test('models access runtime: command reasons normalize to the canonical union', () => {
  assert.equal(normalizeModelsCommandReason('locked'), 'locked');
  assert.equal(normalizeModelsCommandReason('models service not installed'), 'not-installed');
  assert.equal(normalizeModelsCommandReason('totally-unknown', 'missing'), 'missing');
});

test('models access runtime: normalized command results preserve command messages', () => {
  const App = {
    services: {
      models: {
        apply() {
          return { ok: false, reason: 'error', message: 'snapshot apply failed' };
        },
        getAll() {
          return [];
        },
        getById() {
          return null;
        },
      },
    },
  } as any;

  assert.deepEqual(getModelsServiceMaybe(App)?.apply('m1'), {
    ok: false,
    reason: 'error',
    message: 'snapshot apply failed',
  });
});

test('models access runtime: normalized saved model collections are deeply detached from live payloads', () => {
  const sourceProject = { settings: { width: 100 }, savedNotes: [{ id: 'n1', html: '<b>x</b>' }] };
  const App = {
    services: {
      models: {
        getAll() {
          return [{ id: 'm1', name: 'Model 1', project: sourceProject }];
        },
        exportUserModels() {
          return [{ id: 'm2', name: 'Model 2', project: sourceProject }];
        },
        getById() {
          return { id: 'm3', name: 'Model 3', project: sourceProject };
        },
        ensureLoaded() {
          return [{ id: 'm4', name: 'Model 4', project: sourceProject }];
        },
        mergeImportedModels(list: any) {
          mergeCalls.push(list);
          return { added: Array.isArray(list) ? list.length : 0, updated: 0 };
        },
      },
    },
  } as any;

  const mergeCalls: unknown[] = [];
  const svc = getModelsServiceMaybe(App)!;
  const all = svc.getAll();
  const exported = exportUserModelsViaService(App);
  const byId = svc.getById('m3')!;
  const loaded = svc.ensureLoaded();

  (all[0] as any).project.settings.width = 250;
  (exported[0] as any).project.savedNotes[0].html = '<i>changed</i>';
  (byId as any).project.settings.width = 500;
  (loaded[0] as any).project.settings.width = 700;

  assert.equal((sourceProject.settings as any).width, 100);
  assert.equal((sourceProject.savedNotes[0] as any).html, '<b>x</b>');

  const mergeInput = [{ id: 'merge-1', name: 'Merge 1', project: sourceProject }];
  mergeImportedModelsViaService(App, mergeInput as any);
  assert.equal(Array.isArray(mergeCalls[0]), true);
  assert.notEqual((mergeCalls[0] as any[])[0].project, sourceProject);
  (mergeCalls[0] as any[])[0].project.settings.width = 900;
  assert.equal((sourceProject.settings as any).width, 100);
});
