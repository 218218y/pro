import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectDetailsLines,
  extractManualTailFromValue,
  injectExtraLinesPreservingPositions,
  parseDetailsLine,
  splitInlineTailsIntoExtraLines,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_text_details_lines.ts';

test('order pdf details line helpers parse and collect canonical keyed rows', () => {
  assert.deepEqual(parseDetailsLine('שם לקוח: ישראל ישראלי'), {
    key: 'שם לקוח',
    label: 'שם לקוח',
    prefix: 'שם לקוח: ',
    value: 'ישראל ישראלי',
    raw: 'שם לקוח: ישראל ישראלי',
    hasColon: true,
  });

  const collected = collectDetailsLines('שם לקוח: ישראל\nטלפון: 050\nשורת חופש');
  assert.deepEqual(collected.order, ['שם לקוח', 'טלפון']);
  assert.deepEqual(collected.nonKeyLines, ['שורת חופש']);
});

test('order pdf details line helpers preserve inline tails and positioned extras', () => {
  assert.equal(extractManualTailFromValue('ישראל', 'ישראל כהן'), ' כהן');
  assert.equal(
    splitInlineTailsIntoExtraLines({
      text: 'שם לקוח: ישראל כהן',
      baseCollected: { byKey: { 'שם לקוח': parseDetailsLine('שם לקוח: ישראל')! } },
      aggressive: true,
    }),
    'שם לקוח: ישראל\nכהן'
  );

  const injected = injectExtraLinesPreservingPositions({
    mergedAuto: 'שם לקוח: ישראל\nטלפון: 050',
    baseCollected: collectDetailsLines('שם לקוח: ישראל\nטלפון: 050'),
    modifiedText: 'הערה מיוחדת\nשם לקוח: ישראל\nטלפון: 050\nקומה 3',
    newAuto: 'שם לקוח: ישראל\nטלפון: 050',
  });

  assert.equal(injected.mergedAuto, 'הערה מיוחדת\nשם לקוח: ישראל\nטלפון: 050\nקומה 3');
  assert.deepEqual(injected.extrasList, ['הערה מיוחדת', 'קומה 3']);
});
