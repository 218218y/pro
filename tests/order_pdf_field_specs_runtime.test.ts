import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ORDER_PDF_FIELD_KEYS,
  ORDER_PDF_FIELD_SPECS,
  ORDER_PDF_IMAGE_TEMPLATE_BOXES,
  ORDER_PDF_REQUIRED_TEMPLATE_FIELDS,
  ORDER_PDF_TEMPLATE_BOXES,
  ORDER_PDF_TEMPLATE_PAGE_HEIGHT,
  ORDER_PDF_TEMPLATE_PAGE_WIDTH,
  computeOrderPdfOverlayFieldStyleMap,
  listOrderPdfFieldSpecs,
} from '../esm/native/ui/pdf/order_pdf_field_specs_runtime.ts';

const EXPECTED_TEMPLATE_FIELDS = Object.freeze({
  orderNumber: { name: 'order_number', rect: { x: 411.7, top: 142.8898, w: 82.2, h: 16.5 } },
  orderDate: { name: 'order_date', rect: { x: 34.5, top: 142.8898, w: 82.2, h: 16.5 } },
  projectName: { name: 'customer_name', rect: { x: 370.5, top: 216.5898, w: 163.3, h: 17 } },
  deliveryAddress: { name: 'address', rect: { x: 38.7, top: 244.0898, w: 404.055, h: 17 } },
  phone: { name: 'phone', rect: { x: 204.6, top: 215.5898, w: 115.6, h: 17 } },
  mobile: { name: 'mobile', rect: { x: 38.7, top: 215.5898, w: 124.7, h: 17 } },
  details: { name: 'order_details', rect: { x: 34, top: 691.8898, w: 526, h: 414 } },
  notes: { name: 'notes', rect: { x: 34, top: 775.8898, w: 526, h: 49 } },
} as const);

test('[order-pdf] canonical field specs keep overlay/template/image mappings aligned', () => {
  assert.equal(ORDER_PDF_TEMPLATE_PAGE_WIDTH, 595.2756);
  assert.equal(ORDER_PDF_TEMPLATE_PAGE_HEIGHT, 841.8898);

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
    const expected = EXPECTED_TEMPLATE_FIELDS[spec.key];
    assert.equal(spec.templateFieldName, expected.name);
    assert.deepEqual(spec.overlayRect, expected.rect);
    assert.equal(Object.hasOwn(spec, 'fallbackFieldName'), false);
    assert.match(spec.generatedFieldName, /^wp_/);
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
