import test from 'node:test';
import assert from 'node:assert/strict';

import { exportSystemSettings, importSystemSettings } from '../esm/native/ui/settings_backup.ts';
import { reportSettingsBackupActionResult } from '../esm/native/ui/settings_backup_action_feedback.ts';

function createStore(config: Record<string, unknown>) {
  return {
    getState() {
      return {
        ui: {},
        config,
        runtime: {},
        mode: {},
        meta: {},
      };
    },
  };
}

type DownloadAnchor = {
  href: string;
  download: string;
  rel: string;
  style: { display?: string };
  click: () => void;
  remove: () => void;
};

type FakeFileCtor = new (
  parts: BlobPart[],
  name: string,
  options?: BlobPropertyBag
) => Blob & { name: string };

function createDownloadContext() {
  let downloadedBlob: Blob | null = null;
  const body = {
    appendChild(_node: DownloadAnchor) {
      return undefined;
    },
  };
  const win = {
    URL: {
      createObjectURL(blob: Blob) {
        downloadedBlob = blob;
        return 'blob:settings-roundtrip';
      },
      revokeObjectURL() {
        return undefined;
      },
    },
    setTimeout(fn: () => void) {
      fn();
      return 0;
    },
    navigator: { userAgent: 'node-test' },
    location: { href: 'https://example.test/' },
    document: null as Document | null,
  } as unknown as Window;
  const doc = {
    body,
    defaultView: win,
    querySelector() {
      return null;
    },
    createElement() {
      const anchor: DownloadAnchor = {
        href: '',
        download: '',
        rel: '',
        style: {},
        click() {
          return undefined;
        },
        remove() {
          return undefined;
        },
      };
      return anchor;
    },
  } as unknown as Document;
  (win as unknown as { document: Document }).document = doc;
  return {
    doc,
    readDownloadedText: async () => {
      assert.ok(downloadedBlob, 'expected export to create a blob');
      return await downloadedBlob!.text();
    },
  };
}

function summarizeSavedModels(value: unknown) {
  return Array.isArray(value)
    ? value.map(model => ({
        id: (model as Record<string, unknown>)?.id,
        name: (model as Record<string, unknown>)?.name,
        width: (model as Record<string, unknown>)?.width,
      }))
    : [];
}

function installFakeFile() {
  const originalReader = (globalThis as { FileReader?: unknown }).FileReader;
  const originalFile = (globalThis as { File?: unknown }).File;

  class FakeFile extends Blob {
    name: string;

    constructor(parts: BlobPart[], name: string, options?: BlobPropertyBag) {
      super(parts, options);
      this.name = name;
    }
  }

  class FakeFileReader {
    result: string | null = null;
    onload: ((evt: ProgressEvent<FileReader>) => void) | null = null;
    onerror: (() => void) | null = null;

    readAsText(file: Blob) {
      void file.text().then(text => {
        this.result = text;
        this.onload?.({ target: { result: text } } as unknown as ProgressEvent<FileReader>);
      });
    }
  }

  (globalThis as { FileReader?: unknown }).FileReader = FakeFileReader;
  (globalThis as { File?: unknown }).File = FakeFile;

  return {
    FakeFile: FakeFile as unknown as FakeFileCtor,
    restore() {
      (globalThis as { FileReader?: unknown }).FileReader = originalReader;
      (globalThis as { File?: unknown }).File = originalFile;
    },
  };
}

test('settings backup roundtrip restores models/colors/orders and emits a single success toast', async () => {
  const sourceDownload = createDownloadContext();
  const sourceApp = {
    deps: { browser: { document: sourceDownload.doc, window: sourceDownload.doc.defaultView } },
    store: createStore({ savedColors: [{ id: 'c1', value: '#f7f7f7' }] }),
    services: {
      models: {
        exportUserModels() {
          return [{ id: 'm1', name: 'Source Model', width: 180 }];
        },
      },
      storage: {
        KEYS: {
          SAVED_MODELS: 'wardrobeSavedModels',
          SAVED_COLORS: 'wardrobeSavedColors',
        },
        getJSON(key: string, fallback: unknown[]) {
          if (key === 'wardrobeSavedModels:presetOrder') return ['m1'];
          if (key === 'wardrobeSavedModels:hiddenPresets') return ['legacy-hidden'];
          if (key === 'wardrobeSavedColors:order') return ['c1'];
          return fallback;
        },
      },
    },
  };

  const exportResult = await exportSystemSettings(sourceApp as never);
  assert.deepEqual(exportResult, { ok: true, kind: 'export', modelsCount: 1, colorsCount: 1 });
  const exportedText = await sourceDownload.readDownloadedText();

  const env = installFakeFile();
  try {
    const mergedModels: unknown[][] = [];
    const storageWrites: Record<string, unknown> = Object.create(null);
    const colorState = [{ id: 'existing', value: '#111111' }];
    const lifecycle: string[] = [];
    const targetApp = {
      store: createStore({ savedColors: colorState }),
      maps: {
        getSavedColors() {
          return colorState;
        },
        setSavedColors(next: unknown[]) {
          colorState.splice(0, colorState.length, ...(next as typeof colorState));
        },
        setColorSwatchesOrder(next: unknown[]) {
          storageWrites.colorOrderState = next.slice();
        },
      },
      actions: {
        models: {
          renderModelUI() {
            lifecycle.push('render');
          },
        },
      },
      services: {
        uiFeedback: {
          confirm(_title: string, _message: string, onYes: () => void) {
            onYes();
          },
          toast() {
            return undefined;
          },
        },
        models: {
          mergeImportedModels(list: unknown[]) {
            mergedModels.push(list);
            return { added: list.length, updated: 0 };
          },
          ensureLoaded() {
            lifecycle.push('ensure');
          },
        },
        storage: {
          KEYS: {
            SAVED_MODELS: 'wardrobeSavedModels',
            SAVED_COLORS: 'wardrobeSavedColors',
          },
          setJSON(key: string, value: unknown) {
            storageWrites[key] = value;
          },
          getJSON(_key: string, fallback: unknown[]) {
            return fallback;
          },
        },
      },
    };

    const file = new env.FakeFile([exportedText], 'backup.json', { type: 'application/json' });
    const input = { value: 'backup.json', files: [file] };
    const importResult = await importSystemSettings(targetApp as never, { currentTarget: input });

    assert.deepEqual(importResult, { ok: true, kind: 'import', modelsAdded: 1, colorsAdded: 1 });
    assert.equal(input.value, '');
    assert.deepEqual(mergedModels.map(summarizeSavedModels), [
      [{ id: 'm1', name: 'Source Model', width: 180 }],
    ]);
    assert.equal(
      Array.isArray((mergedModels[0]?.[0] as Record<string, unknown>)?.modulesConfiguration),
      true
    );
    assert.equal(typeof (mergedModels[0]?.[0] as Record<string, unknown>)?.cornerConfiguration, 'object');
    assert.deepEqual(colorState, [
      { id: 'existing', value: '#111111' },
      { id: 'c1', value: '#f7f7f7' },
    ]);
    assert.deepEqual(storageWrites['wardrobeSavedModels:presetOrder'], ['m1']);
    assert.deepEqual(storageWrites['wardrobeSavedModels:hiddenPresets'], ['legacy-hidden']);
    assert.deepEqual(storageWrites['wardrobeSavedColors:order'], ['c1', 'existing']);
    assert.deepEqual(storageWrites.colorOrderState, ['c1', 'existing']);
    assert.deepEqual(lifecycle, ['render', 'ensure']);

    const seen: Array<{ message: string; type?: string }> = [];
    const toast = reportSettingsBackupActionResult(
      {
        toast(message: string, type?: string) {
          seen.push({ message, type });
        },
      },
      importResult
    );
    assert.deepEqual(toast, {
      message: 'השחזור הסתיים בהצלחה! (נוספו 1 דגמים ו-1 גוונים)',
      type: 'success',
    });
    assert.deepEqual(seen, [
      {
        message: 'השחזור הסתיים בהצלחה! (נוספו 1 דגמים ו-1 גוונים)',
        type: 'success',
      },
    ]);
  } finally {
    env.restore();
  }
});
