export function createStore(config: Record<string, unknown>) {
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

export type FakeFileCtor = new (
  parts: BlobPart[],
  name: string,
  options?: BlobPropertyBag
) => Blob & { name: string };

export function installFakeFilePrimitives(mode: 'success' | 'read-error' = 'success') {
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
      if (mode === 'read-error') {
        this.onerror?.();
        return;
      }
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

export function createImportApp(opts?: { confirm?: boolean }) {
  const confirmed: string[] = [];
  const app = {
    store: createStore({ savedColors: [] }),
    maps: {
      getSavedColors() {
        return [];
      },
      setSavedColors() {
        return undefined;
      },
      setColorSwatchesOrder() {
        return undefined;
      },
    },
    actions: {
      models: {
        renderModelUI() {
          return undefined;
        },
      },
    },
    services: {
      uiFeedback: {
        confirm(_title: string, message: string, onYes: () => void, onNo: () => void) {
          confirmed.push(message);
          if (opts?.confirm === false) onNo();
          else onYes();
        },
      },
      models: {
        mergeImportedModels(list: unknown[]) {
          return { added: list.length, updated: 0 };
        },
        ensureLoaded() {
          return undefined;
        },
      },
      storage: {
        KEYS: {
          SAVED_MODELS: 'wardrobeSavedModels',
          SAVED_COLORS: 'wardrobeSavedColors',
        },
        setJSON() {
          return undefined;
        },
        getJSON(_key: string, fallback: unknown[]) {
          return fallback;
        },
      },
    },
  };
  return { app, confirmed };
}
