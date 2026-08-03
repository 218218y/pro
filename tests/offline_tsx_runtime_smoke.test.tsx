import assert from 'node:assert/strict';
import test from 'node:test';

import fontkit from '@pdf-lib/fontkit';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';
import { getDocument, version as pdfjsVersion } from 'pdfjs-dist/legacy/build/pdf.mjs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as THREE from 'three';
import { createStore } from 'zustand/vanilla';

import {
  isOrderPdfChunkHttpFailure,
  isOrderPdfChunkRequest,
} from './support/order_pdf_diagnostic_classifier.js';

test('offline TSX runtime profile loads every project package family without a browser', async () => {
  const html = renderToStaticMarkup(<span>offline-runtime-ok</span>);
  assert.match(html, /offline-runtime-ok/u);

  const vector = new THREE.Vector3(1, 2, 3).multiplyScalar(2);
  assert.deepEqual(vector.toArray(), [2, 4, 6]);

  const store = createStore(() => ({ ready: true }));
  assert.equal(store.getState().ready, true);

  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  document.addPage([120, 80]);
  const bytes = await document.save();
  assert.ok(bytes.byteLength > 100);

  assert.equal(typeof getDocument, 'function');
  assert.match(pdfjsVersion, /^\d+\.\d+\.\d+$/u);

  assert.equal(typeof createClient, 'function');

  const request = {
    resourceType: () => 'script',
    url: () => 'https://example.test/assets/OrderPdfInPlaceEditorOverlay.js',
  };
  assert.equal(isOrderPdfChunkRequest(request), true);
  assert.equal(
    isOrderPdfChunkHttpFailure({
      request: () => request,
      status: () => 503,
    }),
    true
  );
});
