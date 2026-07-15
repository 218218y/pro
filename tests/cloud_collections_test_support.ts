import { installCloudCollectionsService } from '../esm/native/services/cloud_collections_service.ts';

type TestStorage = {
  getJSON?: (key: string, fallback: unknown) => unknown;
  setJSON?: (key: string, value: unknown) => unknown;
  getString?: (key: string) => string | null | undefined;
  setString?: (key: string, value: string) => unknown;
};

export function installCloudCollectionsForTestApp(app: {
  services: { storage: TestStorage; [key: string]: unknown };
  deps?: Record<string, any>;
}): Promise<void> {
  const storage = app.services.storage;
  const committed = new Map<string, unknown>();
  const committedStrings = new Map<string, string>();
  const readExisting = storage.getJSON?.bind(storage);
  const writeExisting = storage.setJSON?.bind(storage);
  const readStringExisting = storage.getString?.bind(storage);
  const writeStringExisting = storage.setString?.bind(storage);

  storage.getJSON = (key: string, fallback: unknown) =>
    committed.has(key) ? committed.get(key) : (readExisting?.(key, fallback) ?? fallback);
  storage.setJSON = (key: string, value: unknown) => {
    const written = writeExisting?.(key, value);
    if (written === false) return false;
    committed.set(key, value);
    return true;
  };
  if (readStringExisting || writeStringExisting) {
    storage.getString = (key: string) =>
      committedStrings.has(key) ? committedStrings.get(key)! : (readStringExisting?.(key) ?? null);
    storage.setString = (key: string, value: string) => {
      const written = writeStringExisting?.(key, value);
      if (written === false) return false;
      committedStrings.set(key, value);
      return true;
    };
  }

  const tails = new Map<string, Promise<void>>();
  const browser = (app.deps ||= {}).browser || {};
  const navigatorValue = browser.navigator || { userAgent: 'node:test' };
  if (typeof navigatorValue.userAgent !== 'string') navigatorValue.userAgent = 'node:test';
  if (!navigatorValue.locks || typeof navigatorValue.locks.request !== 'function') {
    navigatorValue.locks = {
      request<T>(name: string, operation: () => Promise<T> | T): Promise<T> {
        const previous = tails.get(name) || Promise.resolve();
        const result = previous.then(operation, operation);
        tails.set(
          name,
          result.then(
            () => undefined,
            () => undefined
          )
        );
        return result;
      },
    };
  }
  browser.navigator = navigatorValue;
  app.deps.browser = browser;

  return installCloudCollectionsService(app as never).then(() => undefined);
}
