import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readFileDataUrlResultViaBrowser,
  readFileTextResultViaBrowser,
} from '../esm/native/runtime/browser_file_read.ts';

test('readFileTextResultViaBrowser prefers blob.text when available', async () => {
  const blob = new Blob(['hello world'], { type: 'text/plain' });
  const result = await readFileTextResultViaBrowser(blob);
  assert.deepEqual(result, { ok: true, value: 'hello world' });
});

test('readFileTextResultViaBrowser returns unavailable when no browser text reader exists', async () => {
  const original = (globalThis as { FileReader?: unknown }).FileReader;
  delete (globalThis as { FileReader?: unknown }).FileReader;
  try {
    const file = { size: 1, type: 'text/plain' } as Blob;
    const result = await readFileTextResultViaBrowser(file, { unavailableMessage: 'reader missing' });
    assert.deepEqual(result, { ok: false, reason: 'unavailable', message: 'reader missing' });
  } finally {
    (globalThis as { FileReader?: unknown }).FileReader = original;
  }
});

test('readFileDataUrlResultViaBrowser preserves reader failures with message', async () => {
  class FakeReader {
    result: unknown = null;
    error: unknown = new Error('texture exploded');
    onload: null | ((this: FileReader, evt: ProgressEvent<FileReader>) => unknown) = null;
    onerror: null | ((this: FileReader, evt: ProgressEvent<FileReader>) => unknown) = null;
    readAsText(_file: Blob): void {
      throw new Error('not used');
    }
    readAsDataURL(_file: Blob): void {
      this.onerror?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
    }
  }

  const result = await readFileDataUrlResultViaBrowser(new Blob(['demo']), {
    createReader: () => new FakeReader() as never,
    readFailureMessage: 'texture fallback failed',
  });

  assert.deepEqual(result, { ok: false, reason: 'error', message: 'texture exploded' });
});

test('readFileDataUrlResultViaBrowser returns ok result when reader produces a data URL', async () => {
  class FakeReader {
    result: unknown = null;
    error: unknown = null;
    onload: null | ((this: FileReader, evt: ProgressEvent<FileReader>) => unknown) = null;
    onerror: null | ((this: FileReader, evt: ProgressEvent<FileReader>) => unknown) = null;
    readAsText(_file: Blob): void {
      throw new Error('not used');
    }
    readAsDataURL(_file: Blob): void {
      this.result = 'data:image/png;base64,AAA';
      this.onload?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
    }
  }

  const result = await readFileDataUrlResultViaBrowser(new Blob(['demo']), {
    createReader: () => new FakeReader() as never,
  });

  assert.deepEqual(result, { ok: true, value: 'data:image/png;base64,AAA' });
});

test('readFileTextResultViaBrowser reports blob.text rejection through diagnostics without changing result', async () => {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const App: any = {
    services: {
      errors: {
        report(error: unknown, ctx?: unknown) {
          reports.push({ error, ctx });
        },
      },
    },
  };
  const file = {
    text: async () => {
      throw new Error('blob text rejected');
    },
  } as Blob;

  const result = await readFileTextResultViaBrowser(file, {
    app: App,
    readFailureMessage: 'read failed',
  });

  assert.deepEqual(result, { ok: false, reason: 'error', message: 'blob text rejected' });
  assert.equal(reports.length, 1);
  assert.equal(reports[0].ctx.where, 'native/runtime/browser_file_read');
  assert.equal(reports[0].ctx.op, 'readFileText.blobTextRejected');
  assert.equal(reports[0].ctx.fatal, false);
});

test('readFileDataUrlResultViaBrowser reports FileReader rejection through diagnostics', async () => {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const App: any = {
    services: {
      errors: {
        report(error: unknown, ctx?: unknown) {
          reports.push({ error, ctx });
        },
      },
    },
  };

  class FakeReader {
    result: unknown = null;
    error: unknown = new Error('file reader rejected');
    onload: null | ((this: FileReader, evt: ProgressEvent<FileReader>) => unknown) = null;
    onerror: null | ((this: FileReader, evt: ProgressEvent<FileReader>) => unknown) = null;
    readAsText(_file: Blob): void {
      throw new Error('not used');
    }
    readAsDataURL(_file: Blob): void {
      this.onerror?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
    }
  }

  const result = await readFileDataUrlResultViaBrowser(new Blob(['demo']), {
    app: App,
    createReader: () => new FakeReader() as never,
    readFailureMessage: 'data url read failed',
  });

  assert.deepEqual(result, { ok: false, reason: 'error', message: 'file reader rejected' });
  assert.equal(reports.length, 1);
  assert.equal(reports[0].ctx.where, 'native/runtime/browser_file_read');
  assert.equal(reports[0].ctx.op, 'readFileDataUrl.readerRejected');
  assert.equal(reports[0].ctx.fatal, false);
});
