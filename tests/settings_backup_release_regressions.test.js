import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function installFakeFile() {
  const originalFile = globalThis.File;
  class FakeFile extends Blob {
    constructor(parts, name, options) {
      super(parts, options);
      this.name = name;
    }
  }
  globalThis.File = FakeFile;
  return {
    FakeFile,
    restore() {
      globalThis.File = originalFile;
    },
  };
}

function transpileTsModule(file) {
  const source = fs.readFileSync(file, 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: file,
  }).outputText;
}

function loadTsModule(file, overrides = {}, cache = new Map()) {
  if (cache.has(file)) return cache.get(file);

  const transpiled = transpileTsModule(file);
  const mod = { exports: {} };
  cache.set(file, mod.exports);

  const localRequire = specifier => {
    if (specifier in overrides) return overrides[specifier];
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      const resolved = path.resolve(path.dirname(file), specifier.replace(/\.js$/, '.ts'));
      if (fs.existsSync(resolved)) {
        const loaded = loadTsModule(resolved, overrides, cache);
        cache.set(file, mod.exports);
        return loaded;
      }
    }
    return require(specifier);
  };

  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: localRequire,
    __dirname: path.dirname(file),
    __filename: file,
    console,
    process,
    Blob,
    File: globalThis.File,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  cache.set(file, mod.exports);
  return mod.exports;
}

function loadSettingsBackupModule() {
  const file = path.join(process.cwd(), 'esm/native/ui/settings_backup.ts');
  const overrides = {
    './store_access.js': {
      getCfg: app => app.store?.getState?.().config || {},
    },
    '../services/api.js': {
      assertApp: app => app,
      readSavedColors: app => app.maps?.getSavedColors?.() ?? null,
      writeColorSwatchesOrder: (app, value) => {
        app.__writtenColorOrder = value;
        return false;
      },
      writeSavedColors: (app, value) => {
        app.__writtenSavedColors = value;
        return true;
      },
      reportError: () => undefined,
      setCfgColorSwatchesOrder: (app, value) => {
        app.__cfgColorOrder = value;
        return undefined;
      },
      setCfgSavedColors: (app, value) => {
        app.__cfgSavedColors = value;
        return undefined;
      },
      renderModelUiViaActionsOrThrow: () => undefined,
      metaMerge: (_app, meta) => meta,
      metaRestore: (_app, meta) => meta,
      getStorageServiceMaybe: app => app.services?.storage ?? null,
      getStorageKey: (_app, _slot, fallback) => fallback,
      getModelsServiceMaybe: app => app.services?.models ?? null,
      exportUserModelsViaService: app => app.services?.models?.exportUserModels?.(),
      mergeImportedModelsViaServiceOrThrow: (app, list) =>
        app.services?.models?.mergeImportedModels?.(list) ?? { added: 0, updated: 0 },
      ensureModelsLoadedViaServiceOrThrow: app => app.services?.models?.ensureLoaded?.(),
      readFileTextResultViaBrowser: async file => ({ ok: true, value: await file.text() }),
      normalizeUnknownError: (error, fallback = '') => {
        if (error instanceof Error && error.message)
          return { message: error.message, name: error.name || undefined };
        if (typeof error === 'string' && error.trim()) return { message: error.trim() };
        if (error && typeof error === 'object' && typeof error.message === 'string' && error.message.trim()) {
          return {
            message: error.message.trim(),
            name: typeof error.name === 'string' ? error.name : undefined,
          };
        }
        return { message: fallback || 'Unexpected error' };
      },
      beginOwnedAsyncFamilyFlight: ({ owner, flights, key, run }) => {
        const active = owner ? flights.get(owner) : null;
        if (active) {
          return { ok: false, reused: active.key === key, activeKey: active.key, promise: active.promise };
        }
        const promise = Promise.resolve()
          .then(run)
          .finally(() => {
            if (owner && flights.get(owner)?.promise === promise) flights.delete(owner);
          });
        if (owner) flights.set(owner, { key, promise });
        return { ok: true, key, promise };
      },
      runOwnedAsyncFamilySingleFlight: ({ owner, flights, key, run, onBusy, onReuse }) => {
        const active = owner ? flights.get(owner) : null;
        if (active) {
          if (active.key === key) {
            onReuse?.();
            return active.promise;
          }
          return typeof onBusy === 'function' ? Promise.resolve(onBusy(active.key)) : active.promise;
        }
        const promise = Promise.resolve()
          .then(run)
          .finally(() => {
            if (owner && flights.get(owner)?.promise === promise) flights.delete(owner);
          });
        if (owner) flights.set(owner, { key, promise });
        return promise;
      },
    },
    './browser_file_download.js': {
      downloadJsonObjectResultViaBrowser: () => ({ ok: true }),
    },
    './feedback_confirm_runtime.js': {
      requestAppConfirmation: async () => ({ ok: true, confirmed: true }),
    },
    './settings_backup_contracts.js': {},
    './settings_backup_action_result.js': {
      buildSettingsBackupActionErrorResult: (kind, error, fallbackMessage) => ({
        ok: false,
        kind,
        reason: 'error',
        message:
          error instanceof Error && error.message
            ? error.message
            : error && typeof error === 'object' && typeof error.message === 'string' && error.message.trim()
              ? error.message.trim()
              : typeof error === 'string' && error.trim()
                ? error.trim()
                : fallbackMessage,
      }),
      buildSettingsBackupExportFailureResult: (reason, message) =>
        typeof message === 'string' && message.trim()
          ? { ok: false, kind: 'export', reason, message: message.trim() }
          : { ok: false, kind: 'export', reason },
      buildSettingsBackupExportSuccessResult: (modelsCount, colorsCount) => ({
        ok: true,
        kind: 'export',
        modelsCount:
          Number.isFinite(Number(modelsCount)) && Number(modelsCount) > 0
            ? Math.floor(Number(modelsCount))
            : 0,
        colorsCount:
          Number.isFinite(Number(colorsCount)) && Number(colorsCount) > 0
            ? Math.floor(Number(colorsCount))
            : 0,
      }),
      buildSettingsBackupImportFailureResult: (reason, message) =>
        typeof message === 'string' && message.trim()
          ? { ok: false, kind: 'import', reason, message: message.trim() }
          : { ok: false, kind: 'import', reason },
      buildSettingsBackupImportSuccessResult: (modelsAdded, colorsAdded) => ({
        ok: true,
        kind: 'import',
        modelsAdded:
          Number.isFinite(Number(modelsAdded)) && Number(modelsAdded) > 0
            ? Math.floor(Number(modelsAdded))
            : 0,
        colorsAdded:
          Number.isFinite(Number(colorsAdded)) && Number(colorsAdded) > 0
            ? Math.floor(Number(colorsAdded))
            : 0,
      }),
    },
  };
  return loadTsModule(file, overrides);
}

function createApp() {
  return {
    store: {
      getState() {
        return { ui: {}, config: { savedColors: [] }, runtime: {}, mode: {}, meta: {} };
      },
    },
    maps: {
      getSavedColors() {
        return [];
      },
    },
    services: {
      models: {
        mergeImportedModels(list) {
          return { added: list.length, updated: 0 };
        },
        ensureLoaded() {
          return undefined;
        },
      },
      storage: {
        getJSON(_key, fallback) {
          return fallback;
        },
      },
    },
  };
}

test('settings backup release regressions accept BOM-prefixed JSON and preserve parse failures', async () => {
  const env = installFakeFile();
  try {
    const mod = loadSettingsBackupModule();
    const bomFile = new env.FakeFile(
      [
        '\uFEFF' +
          JSON.stringify({
            type: 'system_backup',
            timestamp: Date.now(),
            savedColors: [{ id: 'c1', value: '#fff' }],
          }),
      ],
      'backup.json',
      { type: 'application/json' }
    );
    const bomInput = { value: 'backup.json', files: [bomFile] };
    const bomResult = await mod.importSystemSettings(createApp(), { currentTarget: bomInput });
    assert.equal(
      JSON.stringify(bomResult),
      JSON.stringify({ ok: true, kind: 'import', modelsAdded: 0, colorsAdded: 1 })
    );
    assert.equal(bomInput.value, '');

    const badFile = new env.FakeFile(['{not-json'], 'broken.json', { type: 'application/json' });
    const badInput = { value: 'broken.json', files: [badFile] };
    const badResult = await mod.importSystemSettings(createApp(), { currentTarget: badInput });
    assert.equal(badResult.ok, false);
    assert.equal(badResult.kind, 'import');
    assert.equal(badResult.reason, 'invalid-json');
    assert.equal(typeof badResult.message, 'string');
    assert.notEqual(badResult.message.trim(), '');
    assert.equal(badInput.value, '');
  } finally {
    env.restore();
  }
});

test('settings backup release regressions preserve upstream export build failures', async () => {
  const mod = loadSettingsBackupModule();
  const app = createApp();
  app.services.models.exportUserModels = () => {
    throw new Error('export models exploded');
  };
  const result = await mod.exportSystemSettings(app);
  assert.equal(
    JSON.stringify(result),
    JSON.stringify({ ok: false, kind: 'export', reason: 'error', message: 'export models exploded' })
  );
});
