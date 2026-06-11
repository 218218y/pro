import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mergeAutoRegionByDetailsLinesBestEffort,
  mergeDetectedAutoRegion,
  tryMergeAutoRegionByLines,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_text_details_merge_support.ts';

test('order pdf merge support keeps inline suffixes and positioned extras through the canonical support seam', () => {
  const result = mergeAutoRegionByDetailsLinesBestEffort(
    'שם לקוח: ישראל\nטלפון: 050',
    'הערה למעלה\nשם לקוח: ישראל כהן\nטלפון: 050\nקומה 3',
    'שם לקוח: דוד\nטלפון: 050'
  );

  assert.ok(result);
  assert.equal(result?.mergedAuto, 'הערה למעלה\nשם לקוח: דוד כהן\nטלפון: 050\nקומה 3');
  assert.match(result?.preview ?? '', /שורות ששונו: שם לקוח/);
  assert.match(result?.preview ?? '', /תוספות: הערה למעלה \| קומה 3/);
});

test('order pdf merge support marks ambiguous line merges unsafe when new keyed rows appear', () => {
  const result = tryMergeAutoRegionByLines(
    'שם לקוח: ישראל\nטלפון: 050',
    'שם לקוח: ישראל\nטלפון: 050\nעיר: בני ברק',
    'שם לקוח: דוד\nטלפון: 051'
  );

  assert.deepEqual(result, {
    unsafe: true,
    mergedAuto: 'שם לקוח: דוד\nטלפון: 051',
    preview: 'שורות חדשות: עיר',
  });
});

test('order pdf merge support resolves clean detected regions without preserving stale manual leftovers', () => {
  const result = mergeDetectedAutoRegion({
    base: 'שם לקוח: ישראל\nטלפון: 050',
    detected: {
      prefix: 'כותרת\n',
      autoLike: 'שם לקוח: ישראל\nטלפון: 050',
      suffix: '\nסוף',
    },
    newAuto: 'שם לקוח: דוד\nטלפון: 051',
  });

  assert.deepEqual(result, {
    kind: 'none',
    cleanText: 'כותרת\nשם לקוח: דוד\nטלפון: 051\nסוף',
    keepText: 'כותרת\nשם לקוח: דוד\nטלפון: 051\nסוף',
    cleanAutoRegion: 'שם לקוח: דוד\nטלפון: 051',
    keepAutoRegion: 'שם לקוח: דוד\nטלפון: 051',
    preview: '',
  });
});
