import test from 'node:test';
import assert from 'node:assert/strict';

import {
  downloadJsonObjectResultViaBrowser,
  downloadJsonTextResultViaBrowser,
} from '../esm/native/ui/browser_file_download.ts';

function createDownloadContext(args?: { throwCreateObjectUrl?: boolean }) {
  const downloads: string[] = [];
  const blobRecords: Array<{ href: string; blob: Blob }> = [];
  let blobSeq = 0;
  const body = {
    appendChild(_node: unknown) {
      return undefined;
    },
  };
  const win = {
    URL: {
      createObjectURL(blob: Blob) {
        if (args?.throwCreateObjectUrl) throw new Error('download exploded');
        const href = `blob:browser-file-${(blobSeq += 1)}`;
        blobRecords.push({ href, blob });
        return href;
      },
      revokeObjectURL() {
        return undefined;
      },
    },
    setTimeout(fn: () => void) {
      fn();
      return 0;
    },
    document: null as Document | null,
  } as unknown as Window;
  const doc = {
    body,
    defaultView: win,
    createElement() {
      const anchor = {
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
  return { ctx: { docMaybe: doc, winMaybe: win }, downloads, blobRecords };
}

test('downloadJsonTextResultViaBrowser returns ok when browser download succeeds', async () => {
  const env = createDownloadContext();
  const result = downloadJsonTextResultViaBrowser(env.ctx, 'demo.json', '{"a":1}');
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(env.downloads, ['demo.json']);
  assert.equal(env.blobRecords.length, 1);
  assert.equal(await env.blobRecords[0]!.blob.text(), '{"a":1}');
});

test('downloadJsonTextResultViaBrowser returns download-unavailable when browser download primitives are missing', () => {
  const result = downloadJsonTextResultViaBrowser({}, 'demo.json', '{"a":1}');
  assert.deepEqual(result, {
    ok: false,
    reason: 'download-unavailable',
    message: 'browser blob download unavailable',
  });
});

test('downloadJsonObjectResultViaBrowser preserves stringify failures as error results', () => {
  const result = downloadJsonObjectResultViaBrowser(
    {},
    'demo.json',
    { a: 1 },
    {
      stringify() {
        throw new Error('stringify exploded');
      },
    }
  );
  assert.deepEqual(result, { ok: false, reason: 'error', message: 'stringify exploded' });
});

test('downloadJsonObjectResultViaBrowser preserves browser download errors as actionable messages', () => {
  const env = createDownloadContext({ throwCreateObjectUrl: true });
  const result = downloadJsonObjectResultViaBrowser(env.ctx, 'demo.json', { a: 1 });
  assert.deepEqual(result, { ok: false, reason: 'error', message: 'download exploded' });
});
