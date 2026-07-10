import test from 'node:test';
import assert from 'node:assert/strict';

import { createDoorVisualCacheKey } from '../esm/native/builder/visuals_and_contents_door_visual_cache.ts';
import { normalizeUndoSnapshot } from '../esm/native/kernel/kernel_history_system_shared.ts';
import { buildProjectFileFlightFingerprint } from '../esm/native/ui/project_file_flight_key.ts';
import { buildOrderPdfSketchPreviewBlobCacheSignature } from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_blob_cache.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

test('history snapshot serialization is stable, scalar-type aware, and cycle-safe', () => {
  const left: Record<string, unknown> = { b: 2, a: 1, scalar: '1' };
  left.self = left;
  const right: Record<string, unknown> = { scalar: '1', a: 1, b: 2 };
  right.self = right;

  assert.equal(normalizeUndoSnapshot(left, isRecord), normalizeUndoSnapshot(right, isRecord));
  assert.notEqual(
    normalizeUndoSnapshot({ scalar: 1 }, isRecord),
    normalizeUndoSnapshot({ scalar: '1' }, isRecord)
  );
});

test('door visual cache keys keep scalar types distinct', () => {
  assert.notEqual(createDoorVisualCacheKey('door', [1]), createDoorVisualCacheKey('door', ['1']));
  assert.notEqual(createDoorVisualCacheKey('door', [false]), createDoorVisualCacheKey('door', ['0']));
});

test('project file fingerprints are stable and delimiter-safe', () => {
  const first = buildProjectFileFlightFingerprint({
    name: 'a|n:1',
    size: 1,
    mediaType: 'text/plain',
    lastModified: 2,
  });
  const second = buildProjectFileFlightFingerprint({
    name: 'a',
    size: 1,
    mediaType: 'n:1|text/plain',
    lastModified: 2,
  });

  assert.notEqual(first, second);
  assert.equal(
    first,
    buildProjectFileFlightFingerprint({ name: 'a|n:1', size: 1, mediaType: 'text/plain', lastModified: 2 })
  );
});

test('PDF preview cache signature is stable and changes with ordered imported pages', () => {
  const base = {
    draft: null,
    pdfSourceTick: 4,
    loadedPdfOriginalBytes: new Uint8Array([1, 2, 3]),
  };
  const first = buildOrderPdfSketchPreviewBlobCacheSignature({ ...base, importedTailIndexes: [2, 3] });
  const same = buildOrderPdfSketchPreviewBlobCacheSignature({ ...base, importedTailIndexes: [2, 3] });
  const reordered = buildOrderPdfSketchPreviewBlobCacheSignature({ ...base, importedTailIndexes: [3, 2] });

  assert.equal(first, same);
  assert.notEqual(first, reordered);
});
