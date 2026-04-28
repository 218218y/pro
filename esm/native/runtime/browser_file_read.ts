import { buildErrorResult as buildNormalizedErrorResult } from './error_normalization.js';

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
  createReader?: (() => FileReaderLike) | null;
  unavailableMessage?: string;
  readFailureMessage?: string;
};

export type ReadFileDataUrlOptions = {
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

function buildUnavailableResult<T>(message: string): BrowserFileReadResult<T> {
  return { ok: false, reason: 'unavailable', message };
}

function buildErrorResult<T>(error: unknown, fallback: string): BrowserFileReadResult<T> {
  return buildNormalizedErrorResult('error', error, fallback);
}

export async function readFileTextResultViaBrowser(
  file: Blob,
  options?: ReadFileTextOptions | null
): Promise<BrowserFileReadResult<string>> {
  if (hasBlobText(file)) {
    try {
      return { ok: true, value: await file.text() };
    } catch (error) {
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
        resolve(
          buildErrorResult(reader.error, options?.readFailureMessage || 'browser file text read failed')
        );
      };
      reader.readAsText(file);
    } catch (error) {
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
        resolve(buildErrorResult(null, options?.readFailureMessage || 'browser file data url read failed'));
      };
      reader.onerror = () => {
        resolve(
          buildErrorResult(reader.error, options?.readFailureMessage || 'browser file data url read failed')
        );
      };
      reader.readAsDataURL(file);
    } catch (error) {
      resolve(buildErrorResult(error, options?.readFailureMessage || 'browser file data url read failed'));
    }
  });
}
