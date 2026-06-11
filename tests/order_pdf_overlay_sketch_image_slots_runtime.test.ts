import test from 'node:test';
import assert from 'node:assert/strict';

import { makeEmptyDraft } from '../esm/native/ui/react/pdf/order_pdf_overlay_text.js';
import {
  applyOrderPdfImportedImageDefaultsToDraft,
  buildOrderPdfSketchImageSelectionSignature,
  readOrderPdfSketchImageDraftFlags,
  readOrderPdfSketchImageSlotEnabled,
  resolveOrderPdfSketchImageDraftFlags,
  resolveOrderPdfImportedImageFlags,
  resolveOrderPdfSketchImageAppendPlan,
  resolveOrderPdfSketchImageOptionsTitle,
  resolveOrderPdfSketchImageTailPageMap,
  resolveOrderPdfSketchImageToolbarState,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_image_slots_runtime.js';

test('order pdf sketch-image runtime resolves imported-image flags and tail page mapping canonically', () => {
  assert.deepEqual(resolveOrderPdfImportedImageFlags(0), {
    hasImportedPdfImages: false,
    hasImportedPdfRenderImage: false,
    hasImportedPdfOpenImage: false,
  });
  assert.deepEqual(resolveOrderPdfImportedImageFlags(2), {
    hasImportedPdfImages: true,
    hasImportedPdfRenderImage: true,
    hasImportedPdfOpenImage: true,
  });
  assert.deepEqual(resolveOrderPdfSketchImageTailPageMap([3, 4]), { renderSketch: 3, openClosed: 4 });
  assert.deepEqual(resolveOrderPdfSketchImageTailPageMap([7]), { renderSketch: 7 });
  assert.deepEqual(resolveOrderPdfSketchImageTailPageMap([]), {});
});

test('order pdf sketch-image runtime keeps toolbar copy and selection signature aligned', () => {
  assert.equal(resolveOrderPdfSketchImageOptionsTitle(false), 'בחירת תמונות לייצוא');
  assert.match(resolveOrderPdfSketchImageOptionsTitle(true), /לשמור את התמונה שהגיעה מה-PDF/);

  assert.deepEqual(
    resolveOrderPdfSketchImageToolbarState({
      key: 'renderSketch',
      hasImportedPdfImage: true,
      enabled: false,
    }),
    {
      title: 'ישמור את התמונה שהגיעה מה-PDF (הדמיה/סקיצה)',
      suffix: ' (PDF)',
    }
  );
  assert.deepEqual(
    resolveOrderPdfSketchImageToolbarState({ key: 'openClosed', hasImportedPdfImage: false, enabled: true }),
    {
      title: 'פתוח/סגור מהסקיצה הנוכחית',
      suffix: '',
    }
  );

  assert.equal(buildOrderPdfSketchImageSelectionSignature(null, 7), '1:1:7');
  assert.equal(
    buildOrderPdfSketchImageSelectionSignature({ includeRenderSketch: false, includeOpenClosed: true }, 5),
    '0:1:5'
  );
});

test('order pdf sketch-image runtime applies imported-tail defaults and reads slot enablement canonically', () => {
  const draft = makeEmptyDraft();
  const next = applyOrderPdfImportedImageDefaultsToDraft({
    draft,
    importedTailPageIndexes: [8],
  });

  assert.equal(readOrderPdfSketchImageSlotEnabled(draft, 'renderSketch'), true);
  assert.equal(readOrderPdfSketchImageSlotEnabled(next, 'renderSketch'), false);
  assert.equal(readOrderPdfSketchImageSlotEnabled(next, 'openClosed'), true);
});

test('order pdf sketch-image runtime falls back to imported tail pages when a built slot is missing', () => {
  const plan = resolveOrderPdfSketchImageAppendPlan({
    draft: { includeRenderSketch: true, includeOpenClosed: true },
    builtTailPageIndexes: [11],
    importedTailPageIndexes: [21, 22],
  });

  assert.deepEqual(plan, [
    { key: 'renderSketch', source: 'built', pageIndex: 11 },
    { key: 'openClosed', source: 'imported', pageIndex: 22 },
  ]);
});

test('order pdf sketch-image runtime prefers imported pages when a slot is toggled off and preserves extras', () => {
  const plan = resolveOrderPdfSketchImageAppendPlan({
    draft: { includeRenderSketch: false, includeOpenClosed: true },
    builtTailPageIndexes: [11, 12, 13],
    importedTailPageIndexes: [21, 22, 23],
  });

  assert.deepEqual(plan, [
    { key: 'renderSketch', source: 'imported', pageIndex: 21 },
    { key: 'openClosed', source: 'built', pageIndex: 12 },
    { key: null, source: 'imported', pageIndex: 23 },
    { key: null, source: 'built', pageIndex: 13 },
  ]);
});

test('order pdf sketch-image runtime canonicalizes flag reads and preserves no-op imported defaults', () => {
  assert.deepEqual(readOrderPdfSketchImageDraftFlags({ source: {}, preserveUndefinedFlags: true }), {
    includeRenderSketch: undefined,
    includeOpenClosed: undefined,
  });
  assert.deepEqual(resolveOrderPdfSketchImageDraftFlags({ includeRenderSketch: false }), {
    includeRenderSketch: false,
    includeOpenClosed: true,
  });

  const draft = makeEmptyDraft();
  const unchanged = applyOrderPdfImportedImageDefaultsToDraft({
    draft,
    importedTailPageIndexes: [],
  });
  const alreadyImported = applyOrderPdfImportedImageDefaultsToDraft({
    draft: { ...draft, includeRenderSketch: false },
    importedTailPageIndexes: [8],
  });

  assert.equal(unchanged, draft);
  assert.equal(alreadyImported.includeRenderSketch, false);
});
