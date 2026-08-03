import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isOrderPdfChunkHttpFailure,
  isOrderPdfChunkRequest,
  type OrderPdfRequestLike,
  type OrderPdfResponseLike,
} from './support/order_pdf_diagnostic_classifier.js';

function requestFixture(resourceType: string, url: string): OrderPdfRequestLike {
  return {
    resourceType: () => resourceType,
    url: () => url,
  };
}

function responseFixture(status: number, request: OrderPdfRequestLike): OrderPdfResponseLike {
  return {
    request: () => request,
    status: () => status,
  };
}

test('Order PDF diagnostic classifier accepts the canonical release chunk request', () => {
  const request = requestFixture(
    'script',
    'https://example.test/assets/wardrobepro.chunk-OrderPdfInPlaceEditorOverlay.js'
  );

  assert.equal(isOrderPdfChunkRequest(request), true);
  assert.equal(isOrderPdfChunkHttpFailure(responseFixture(404, request)), true);
});

test('Order PDF diagnostic classifier accepts a requestfailed Order PDF script', () => {
  const request = requestFixture('script', 'https://example.test/assets/order_pdf_overlay_pdf_lib.js');
  assert.equal(isOrderPdfChunkRequest(request), true);
});

test('Order PDF diagnostic classifier rejects an unrelated failed script', () => {
  const request = requestFixture('script', 'https://example.test/assets/unrelated-feature.js');
  assert.equal(isOrderPdfChunkRequest(request), false);
  assert.equal(isOrderPdfChunkHttpFailure(responseFixture(404, request)), false);
});

test('Order PDF diagnostic classifier rejects non-script resources with matching URLs', () => {
  for (const resourceType of ['image', 'fetch', 'xhr']) {
    const request = requestFixture(resourceType, 'https://example.test/api/order-pdf/asset');
    assert.equal(isOrderPdfChunkRequest(request), false, resourceType);
    assert.equal(isOrderPdfChunkHttpFailure(responseFixture(404, request)), false, resourceType);
  }
});

test('Order PDF diagnostic classifier treats only HTTP error statuses as failures', () => {
  const request = requestFixture('script', 'https://example.test/assets/OrderPdf-editor.js');

  for (const status of [200, 204, 206, 304, 399]) {
    assert.equal(isOrderPdfChunkHttpFailure(responseFixture(status, request)), false, String(status));
  }
  for (const status of [400, 404, 500, 503]) {
    assert.equal(isOrderPdfChunkHttpFailure(responseFixture(status, request)), true, String(status));
  }
});
