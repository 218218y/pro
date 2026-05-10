import { buildErrorResult as buildNormalizedErrorResult } from './error_normalization.js';
import { reportError } from './errors.js';

export type BrowserFileReadResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: 'unavailable' | 'error'; message: string };

export type FileReaderLike = {
  result: unknown;
  error?: unknown;
  onload: null | ((this: FileReader, evt: ProgressEvent<FileReader>) => unknown);
  onerror: null | ((this: FileReader, evt: ProgressEvent<FileReader>) => unknown);
  readAsText(file: Blob): void;
  readAsDataURL(file: Blob): void;
};

export type ReadFileTextOptions = {
  /** Optional app container used only for diagnostics; result semantics do not depend on it. */
  app?: unknown;
  createReader?: (() => FileReaderLike) | null;
  unavailableMessage?: string;
  readFailureMessage?: string;
};

export type ReadFileDataUrlOptions = {
  /** Optional app container used only for diagnostics; result semantics do not depend on it. */
  app?: unknown;
  createReader?: (() => FileReaderLike) | null;
  unavailableMessage?: string;
  readFailureMessage?: string;
};

type BlobTextLike = {
  text: () => Promise<string>;
};

type FileReaderCtorLike = new () => FileReaderLike;

function isFileReaderCtorLike(value: unknown): value is FileReaderCtorLike {
  return typeof value === 'function';
}

function hasBlobText(value: unknown): value is BlobTextLike {
  return !!value && typeof value === 'object' && typeof Reflect.get(value, 'text') === 'function';
}

function readFileReaderCtor(): FileReaderCtorLike | null {
  try {
    return isFileReaderCtorLike(FileReader) ? FileReader : null;
  } catch {
    return null;
  }
}

function resolveFileReaderFactory(
  createReader: (() => FileReaderLike) | null | undefined
): (() => FileReaderLike) | null {
  if (typeof createReader === 'function') return createReader;
  const ReaderCtor = readFileReaderCtor();
  return ReaderCtor ? () => new ReaderCtor() : null;
}

function reportBrowserFileReadFailure(App: unknown, error: unknown, op: string): void {
  reportError(
    App,
    error,
    { where: 'native/runtime/browser_file_read', op, fatal: false },
    {
      consoleFallback: false,
    }
  );
}

function buildUnavailableResult<T>(message: string): BrowserFileReadResult<T> {
  return { ok: false, reason: 'unavailable', message };
}

function buildErrorResult<T>(error: unknown, defaultMessage: string): BrowserFileReadResult<T> {
  return buildNormalizedErrorResult('error', error, defaultMessage);
}

export async function readFileTextResultViaBrowser(
  file: Blob,
  options?: ReadFileTextOptions | null
): Promise<BrowserFileReadResult<string>> {
  if (hasBlobText(file)) {
    try {
      return { ok: true, value: await file.text() };
    } catch (error) {
      reportBrowserFileReadFailure(options?.app, error, 'readFileText.blobTextRejected');
      return buildErrorResult(error, options?.readFailureMessage || 'browser file text read failed');
    }
  }

  const createReader = resolveFileReaderFactory(options?.createReader);
  if (!createReader) {
    return buildUnavailableResult(options?.unavailableMessage || 'browser file text read unavailable');
  }

  return await new Promise(resolve => {
    try {
      const reader = createReader();
      reader.onload = () => {
        const raw = reader.result;
        resolve({ ok: true, value: typeof raw === 'string' ? raw : '' });
      };
      reader.onerror = () => {
        reportBrowserFileReadFailure(options?.app, reader.error, 'readFileText.readerRejected');
        resolve(
          buildErrorResult(reader.error, options?.readFailureMessage || 'browser file text read failed')
        );
      };
      reader.readAsText(file);
    } catch (error) {
      reportBrowserFileReadFailure(options?.app, error, 'readFileText.readAsTextRejected');
      resolve(buildErrorResult(error, options?.readFailureMessage || 'browser file text read failed'));
    }
  });
}

export async function readFileDataUrlResultViaBrowser(
  file: Blob,
  options?: ReadFileDataUrlOptions | null
): Promise<BrowserFileReadResult<string>> {
  const createReader = resolveFileReaderFactory(options?.createReader);
  if (!createReader) {
    return buildUnavailableResult(options?.unavailableMessage || 'browser file data url read unavailable');
  }

  return await new Promise(resolve => {
    try {
      const reader = createReader();
      reader.onload = () => {
        const raw = reader.result;
        if (typeof raw === 'string' && raw) {
          resolve({ ok: true, value: raw });
          return;
        }
        reportBrowserFileReadFailure(options?.app, null, 'readFileDataUrl.emptyResult');
        resolve(buildErrorResult(null, options?.readFailureMessage || 'browser file data url read failed'));
      };
      reader.onerror = () => {
        reportBrowserFileReadFailure(options?.app, reader.error, 'readFileDataUrl.readerRejected');
        resolve(
          buildErrorResult(reader.error, options?.readFailureMessage || 'browser file data url read failed')
        );
      };
      reader.readAsDataURL(file);
    } catch (error) {
      reportBrowserFileReadFailure(options?.app, error, 'readFileDataUrl.readAsDataUrlRejected');
      resolve(buildErrorResult(error, options?.readFailureMessage || 'browser file data url read failed'));
    }
  });
}
