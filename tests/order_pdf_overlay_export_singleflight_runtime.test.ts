import test from 'node:test';
import assert from 'node:assert/strict';

import { getOrderPdfOverlayActionToast } from '../esm/native/ui/react/pdf/order_pdf_overlay_action_feedback.js';
import {
  buildOrderPdfOverlayActionFlightKey,
  readOrderPdfOverlayActionKindFromFlightKey,
  readOrderPdfOverlayBusyResult,
  readOrderPdfOverlayFileFlightKey,
  runOrderPdfOverlayActionSingleFlight,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_export_singleflight.js';

test('order pdf export single-flight reuses duplicate same-key work per app and clears after completion', async () => {
  let runCalls = 0;
  let releaseRun: (() => void) | null = null;
  const gate = new Promise<void>(resolve => {
    releaseRun = resolve;
  });
  const app = { id: 'app-a' } as any;

  const first = runOrderPdfOverlayActionSingleFlight({
    app,
    key: 'export-interactive',
    run: async () => {
      runCalls += 1;
      await gate;
      return { ok: true, kind: 'export-interactive' } as const;
    },
  });
  const second = runOrderPdfOverlayActionSingleFlight({
    app,
    key: 'export-interactive',
    run: async () => {
      runCalls += 1;
      return { ok: true, kind: 'export-interactive' } as const;
    },
  });

  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(runCalls, 1);

  releaseRun?.();
  assert.deepEqual(await first, { ok: true, kind: 'export-interactive' });

  const third = runOrderPdfOverlayActionSingleFlight({
    app,
    key: 'export-interactive',
    run: async () => {
      runCalls += 1;
      return { ok: true, kind: 'export-interactive' } as const;
    },
  });
  assert.deepEqual(await third, { ok: true, kind: 'export-interactive' });
  assert.equal(runCalls, 2);
});

test('order pdf export single-flight returns busy for conflicting keys on the same app and stays independent across apps', async () => {
  let releaseRun: (() => void) | null = null;
  const gate = new Promise<void>(resolve => {
    releaseRun = resolve;
  });
  const appA = { id: 'app-a' } as any;
  const appB = { id: 'app-b' } as any;

  const first = runOrderPdfOverlayActionSingleFlight({
    app: appA,
    key: 'export-gmail',
    run: async () => {
      await gate;
      return { ok: true, kind: 'export-gmail' } as const;
    },
  });

  const conflicting = await runOrderPdfOverlayActionSingleFlight({
    app: appA,
    key: 'export-download-gmail',
    run: async () => ({ ok: true, kind: 'export-download-gmail' }) as const,
  });
  assert.deepEqual(conflicting, { ok: false, kind: 'export-download-gmail', reason: 'busy' });

  const independent = await runOrderPdfOverlayActionSingleFlight({
    app: appB,
    key: 'export-download-gmail',
    run: async () => ({ ok: true, kind: 'export-download-gmail' }) as const,
  });
  assert.deepEqual(independent, { ok: true, kind: 'export-download-gmail' });

  releaseRun?.();
  assert.deepEqual(await first, { ok: true, kind: 'export-gmail' });
});

test('order pdf export single-flight derives stable load keys and maps them back to action kinds', () => {
  const file = {
    name: 'order.pdf',
    size: 2048,
    lastModified: 1733011200000,
    type: 'application/pdf',
  } as File;

  const key = readOrderPdfOverlayFileFlightKey(file);
  assert.equal(key, 'order.pdf::2048::1733011200000::application/pdf');
  assert.equal(readOrderPdfOverlayFileFlightKey(null), null);

  const flightKey = buildOrderPdfOverlayActionFlightKey({ kind: 'load-pdf', file });
  assert.equal(flightKey, 'load-pdf:order.pdf::2048::1733011200000::application/pdf');
  assert.equal(readOrderPdfOverlayActionKindFromFlightKey(flightKey!), 'load-pdf');
  assert.equal(buildOrderPdfOverlayActionFlightKey({ kind: 'load-pdf', file: null }), null);
  assert.equal(buildOrderPdfOverlayActionFlightKey({ kind: 'export-image-pdf' }), 'export-image-pdf');

  assert.deepEqual(getOrderPdfOverlayActionToast(readOrderPdfOverlayBusyResult('load-pdf')), {
    message: 'טעינת PDF כבר מתבצעת כרגע',
    kind: 'info',
  });
  assert.deepEqual(getOrderPdfOverlayActionToast(readOrderPdfOverlayBusyResult('export-interactive')), {
    message: 'הורדת PDF כבר מתבצעת כרגע',
    kind: 'info',
  });
});
