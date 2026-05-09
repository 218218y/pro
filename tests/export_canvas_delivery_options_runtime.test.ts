import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeCanvasExportOptions } from '../esm/native/ui/export/export_canvas_delivery_shared.ts';

test('canvas export normalizes clipboard failure policy through the canonical option', () => {
  const defaults = normalizeCanvasExportOptions({ mode: 'clipboard' });
  assert.equal(defaults.mode, 'clipboard');
  assert.equal(defaults.clipboardFailureMode, 'download');
  assert.equal(defaults.allowDownloadOnClipboardFailure, true);

  const noDownload = normalizeCanvasExportOptions({
    mode: 'clipboard',
    clipboardFailureMode: 'none',
  });
  assert.equal(noDownload.clipboardFailureMode, 'none');
  assert.equal(noDownload.allowDownloadOnClipboardFailure, false);
});

test('canvas export still accepts the existing download-fallback option name', () => {
  const normalized = normalizeCanvasExportOptions({
    mode: 'clipboard',
    fallback: 'none',
  });

  assert.equal(normalized.clipboardFailureMode, 'none');
  assert.equal(normalized.allowDownloadOnClipboardFailure, false);
});
