import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOrderPdfDetailsText,
  paintOrderPdfTextInBox,
  prepareOrderPdfTextLayout,
  resolveOrderPdfDetailsPageSplit,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops_image_pdf_support.js';

function createCanvasContextSpy() {
  const fillTexts: Array<{ text: string; x: number; y: number }> = [];
  let measureCount = 0;
  const ctx = {
    fillStyle: 'black',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    font: '',
    direction: 'ltr',
    save() {},
    restore() {},
    fillRect() {},
    beginPath() {},
    rect() {},
    clip() {},
    fillText(text: string, x: number, y: number) {
      fillTexts.push({ text: String(text), x, y });
    },
    measureText(text: string) {
      measureCount += 1;
      return { width: String(text).length * 8 } as TextMetrics;
    },
  } as unknown as CanvasRenderingContext2D;
  return {
    ctx,
    fillTexts,
    getMeasureCount: () => measureCount,
  };
}

test('[order-pdf] prepared details split can be painted without re-wrapping', () => {
  const spy = createCanvasContextSpy();
  const boxPx = { x: 0, y: 0, w: 56, h: 36, sx: 1, sy: 1 };
  const split = resolveOrderPdfDetailsPageSplit({
    ctx: spy.ctx,
    allText: 'aaaaa bbbbb ccccc ddddd',
    boxPx,
    fontFamily: 'Arial, sans-serif',
    report: () => undefined,
  });

  assert.deepEqual(split.page1Lines, ['aaaaa', 'bbbbb']);
  assert.deepEqual(split.overflowLines, ['ccccc', 'ddddd']);
  assert.equal(split.page1Text, 'aaaaa\nbbbbb');
  assert.equal(split.overflowText, 'ccccc\nddddd');

  const afterSplitMeasureCount = spy.getMeasureCount();
  assert.ok(afterSplitMeasureCount > 0);

  paintOrderPdfTextInBox({
    ctx: spy.ctx,
    boxPx,
    text: split.page1Text,
    fontPx: 12,
    fontFamily: 'Arial, sans-serif',
    dir: 'rtl',
    align: 'right',
    multiline: true,
    preparedLines: split.page1Lines,
    report: () => undefined,
  });

  assert.equal(spy.getMeasureCount(), afterSplitMeasureCount);
  assert.deepEqual(
    spy.fillTexts.map(entry => entry.text),
    ['aaaaa', 'bbbbb']
  );
});

test('[order-pdf] prepared layout preserves wrapped lines and visible max-line window', () => {
  const spy = createCanvasContextSpy();
  const prepared = prepareOrderPdfTextLayout({
    ctx: spy.ctx,
    boxPx: { w: 56, h: 36 },
    text: 'aaaaa bbbbb ccccc ddddd',
    fontPx: 12,
    multiline: true,
  });

  assert.deepEqual(prepared.lines, ['aaaaa', 'bbbbb', 'ccccc', 'ddddd']);
  assert.deepEqual(prepared.drawLines, ['aaaaa', 'bbbbb']);
  assert.equal(prepared.maxLines, 2);
});

test('[order-pdf] image-pdf details text uses the canonical full-details touched semantics', () => {
  assert.equal(
    buildOrderPdfDetailsText({
      autoDetails: 'auto details',
      manualDetails: 'manual details',
      detailsFull: true,
      detailsTouched: false,
      manualEnabled: true,
    } as any),
    'manual details'
  );
});
