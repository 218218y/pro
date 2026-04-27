import test from 'node:test';
import assert from 'node:assert/strict';

import { exportSystemSettings, importSystemSettings } from '../esm/native/ui/settings_backup.ts';
import { getPerfEntries } from '../esm/native/runtime/perf_runtime_surface.ts';

type DownloadAnchor = {
  href: string;
  download: string;
  rel: string;
  style: { display?: string };
  click: () => void;
  remove: () => void;
};

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

function createDownloadContext() {
  const downloads: string[] = [];
  const anchors: DownloadAnchor[] = [];
  const body = {
    appendChild(node: DownloadAnchor) {
      anchors.push(node);
    },
  };
  const win = {
    URL: {
      createObjectURL() {
        return 'blob:settings-backup';
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
          downloads.push(anchor.download);
        },
        remove() {
          return undefined;
        },
      };
      return anchor;
    },
  } as unknown as Document;
  (win as unknown as { document: Document }).document = doc;
  return { doc, win, downloads, anchors };
}

test('exportSystemSettings returns a success result and triggers browser download', async () => {
  const { doc, downloads } = createDownloadContext();
  const app = {
    deps: { browser: { document: doc, window: doc.defaultView } },
    store: createStore({ savedColors: [{ id: 'c1', value: '#ffffff' }] }),
    services: {
      uiFeedback: {
        toast() {
          return undefined;
        },
      },
      models: {
        exportUserModels() {
          return [{ id: 'm1', name: 'Model 1' }];
        },
      },
      storage: {
        KEYS: {
          SAVED_MODELS: 'wardrobeSavedModels',
          SAVED_COLORS: 'wardrobeSavedColors',
        },
        getJSON(_key: string, fallback: unknown[]) {
          return fallback;
        },
      },
    },
  };

  const result = await exportSystemSettings(app as never);
  assert.deepEqual(result, { ok: true, kind: 'export', modelsCount: 1, colorsCount: 1 });
  assert.equal(downloads.length, 1);
  assert.match(downloads[0] || '', /^wardrobe_system_backup_\d{4}-\d{2}-\d{2}\.json$/);
  const perfEntries = getPerfEntries(app as never, 'settingsBackup.export');
  assert.equal(perfEntries.length, 1);
  assert.equal(perfEntries[0]?.status, 'ok');
});

test('importSystemSettings merges models/colors, syncs storage order, and clears input', async () => {
  const originalReader = (globalThis as { FileReader?: unknown }).FileReader;
  const originalFile = (globalThis as { File?: unknown }).File;
  const storageWrites: Record<string, unknown> = Object.create(null);
  const rendered: string[] = [];
  const confirmed: string[] = [];
  const colorState = [{ id: 'existing', name: 'Existing' }];

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

  try {
    const app = {
      store: createStore({ savedColors: [] }),
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
            rendered.push('render');
          },
        },
      },
      services: {
        uiFeedback: {
          confirm(_title: string, message: string, onYes: () => void) {
            confirmed.push(message);
            onYes();
          },
          toast() {
            return undefined;
          },
        },
        models: {
          mergeImportedModels(list: unknown[]) {
            return { added: list.length, updated: 0 };
          },
          ensureLoaded() {
            rendered.push('ensure');
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

    const payload = {
      type: 'system_backup',
      timestamp: Date.now(),
      savedModels: [{ id: 'm1', name: 'Imported Model' }],
      savedColors: [
        { id: 'existing', value: '#111111' },
        { id: 'new-color', value: '#222222' },
      ],
      presetOrder: ['a'],
      hiddenPresets: ['b'],
      colorSwatchesOrder: ['new-color', 'existing'],
    };

    const file = new FakeFile([JSON.stringify(payload)], 'backup.json', { type: 'application/json' });
    const input = { value: 'backup.json', files: [file] };
    const event = { currentTarget: input };

    const result = await importSystemSettings(app as never, event);

    assert.deepEqual(result, { ok: true, kind: 'import', modelsAdded: 1, colorsAdded: 1 });
    assert.equal(input.value, '');
    assert.deepEqual(colorState, [
      { id: 'existing', name: 'Existing' },
      { id: 'new-color', value: '#222222' },
    ]);
    assert.deepEqual(storageWrites['wardrobeSavedModels:presetOrder'], ['a']);
    assert.deepEqual(storageWrites['wardrobeSavedModels:hiddenPresets'], ['b']);
    assert.deepEqual(storageWrites['wardrobeSavedColors:order'], ['new-color', 'existing']);
    assert.deepEqual(storageWrites.colorOrderState, ['new-color', 'existing']);
    assert.deepEqual(rendered, ['render', 'ensure']);
    assert.equal(confirmed.length, 1);
    const perfEntries = getPerfEntries(app as never, 'settingsBackup.import');
    assert.equal(perfEntries.length, 1);
    assert.equal(perfEntries[0]?.status, 'ok');
  } finally {
    (globalThis as { FileReader?: unknown }).FileReader = originalReader;
    (globalThis as { File?: unknown }).File = originalFile;
  }
});
