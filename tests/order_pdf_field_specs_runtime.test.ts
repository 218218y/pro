import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ORDER_PDF_FIELD_KEYS,
  ORDER_PDF_FIELD_SPECS,
  ORDER_PDF_IMAGE_TEMPLATE_BOXES,
  ORDER_PDF_REQUIRED_TEMPLATE_FIELDS,
  ORDER_PDF_TEMPLATE_BOXES,
  ORDER_PDF_TEMPLATE_PAGE_HEIGHT,
  computeOrderPdfOverlayFieldStyleMap,
  listOrderPdfFieldSpecs,
} from '../esm/native/ui/pdf/order_pdf_field_specs_runtime.ts';

test('[order-pdf] canonical field specs keep overlay/template/image mappings aligned', () => {
  const specs = listOrderPdfFieldSpecs();
  assert.deepEqual(
    specs.map(spec => spec.key),
    ORDER_PDF_FIELD_KEYS
  );
  assert.deepEqual(
    ORDER_PDF_REQUIRED_TEMPLATE_FIELDS,
    specs.map(spec => spec.templateFieldName)
  );

  for (const spec of specs) {
    assert.equal(spec.templateBox.x, spec.overlayRect.x);
    assert.equal(spec.templateBox.y, ORDER_PDF_TEMPLATE_PAGE_HEIGHT - spec.overlayRect.top);
    assert.equal(spec.templateBox.w, spec.overlayRect.w);
    assert.equal(spec.templateBox.h, spec.overlayRect.h);
    assert.deepEqual(ORDER_PDF_TEMPLATE_BOXES[spec.key], spec.templateBox);
    assert.deepEqual(ORDER_PDF_IMAGE_TEMPLATE_BOXES[spec.imageKey], spec.templateBox);
    assert.deepEqual(ORDER_PDF_FIELD_SPECS[spec.key], spec);
  }
});

test('[order-pdf] canonical field specs derive stable overlay CSS boxes from the same source rects', () => {
  const cssScale = 1.5;
  const styles = computeOrderPdfOverlayFieldStyleMap(cssScale);
  const details = ORDER_PDF_FIELD_SPECS.details.overlayRect;
  const orderDate = ORDER_PDF_FIELD_SPECS.orderDate.overlayRect;

  assert.deepEqual(styles.details, {
    left: details.x * cssScale,
    top: (details.top - details.h) * cssScale,
    width: details.w * cssScale,
    height: details.h * cssScale,
  });
  assert.deepEqual(styles.orderDate, {
    left: orderDate.x * cssScale,
    top: (orderDate.top - orderDate.h) * cssScale,
    width: orderDate.w * cssScale,
    height: orderDate.h * cssScale,
  });
});
