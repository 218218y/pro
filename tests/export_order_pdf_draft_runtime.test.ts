import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeOrderPdfExportDraft,
  resolveOrderPdfExportDraft,
} from '../esm/native/ui/export/export_order_pdf_draft_runtime.ts';

const asRecord = (value: unknown) =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

test('export order pdf draft runtime normalizes legacy details and html-only notes through one canonical seam', () => {
  const normalized = normalizeOrderPdfExportDraft(asRecord, {
    projectName: '',
    autoDetails: 'Auto details',
    manualDetails: 'Manual tail',
    detailsFull: false,
    manualEnabled: false,
    notes: '',
    notesHtml: '<div>הערה א</div><div>הערה ב</div>',
    includeRenderSketch: false,
    sketchAnnotations: {
      renderSketch: {
        strokes: [{ tool: 'pen', color: '#111111', width: 3, points: [{ x: 1, y: 2 }] }],
      },
    },
  });

  assert.equal(normalized.manualDetails, 'Auto details\n\nManual tail');
  assert.equal(normalized.detailsFull, true);
  assert.equal(normalized.detailsTouched, true);
  assert.equal(normalized.manualEnabled, true);
  assert.equal(normalized.notes, 'הערה א\nהערה ב\n');
  assert.equal(normalized.notesHtml, '<div>הערה א</div><div>הערה ב</div>');
  assert.equal(normalized.includeRenderSketch, false);
  assert.equal(normalized.includeOpenClosed, undefined);
  assert.equal(normalized.sketchAnnotations?.renderSketch?.strokes?.length, 1);
});

test('export order pdf draft runtime collapses stale full-details manualEnabled drift during normalization', () => {
  const normalized = normalizeOrderPdfExportDraft(asRecord, {
    autoDetails: 'Same details',
    manualDetails: 'Same details',
    manualDetailsHtml: '<div>Same details</div>',
    detailsFull: true,
    detailsTouched: true,
    manualEnabled: true,
  });

  assert.equal(normalized.manualDetails, 'Same details');
  assert.equal(normalized.detailsTouched, false);
  assert.equal(normalized.manualEnabled, false);
});

test('export order pdf draft runtime resolves fallbacks, recovered notes, and sketch flags together', () => {
  const resolved = resolveOrderPdfExportDraft({
    draft: {
      projectName: '',
      orderDate: '',
      autoDetails: 'Auto details',
      manualDetails: '',
      manualDetailsHtml: '<div>Auto details</div>',
      detailsFull: true,
      detailsTouched: false,
      manualEnabled: true,
      notes: '',
      notesHtml: '<div>רק HTML</div>',
      includeOpenClosed: false,
    } as any,
    fallbackProjectName: 'Project Fallback',
    fallbackOrderDate: '12/04/2026',
    autoDetailsFallback: 'Built auto details',
  });

  assert.deepEqual(resolved, {
    projectName: 'Project Fallback',
    orderNumber: '',
    orderDate: '12/04/2026',
    deliveryAddress: '',
    phone: '',
    mobile: '',
    notes: 'רק HTML\n',
    orderDetails: 'Built auto details',
    includeRenderSketch: true,
    includeOpenClosed: false,
  });
});
