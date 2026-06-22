import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeOrderPdfExportDraft,
  resolveOrderPdfExportDraft,
} from '../esm/native/ui/export/export_order_pdf_draft_runtime.ts';

const asRecord = (value: unknown) =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

test('export order pdf draft runtime normalizes canonical details and html-only notes through one seam', () => {
  const normalized = normalizeOrderPdfExportDraft(asRecord, {
    projectName: '',
    autoDetails: 'Auto details',
    detailsText: 'Edited full details',
    detailsTouched: true,
    notes: '',
    notesHtml: '<div>הערה א</div><div>הערה ב</div>',
    includeRenderSketch: false,
    sketchAnnotations: {
      renderSketch: {
        strokes: [{ tool: 'pen', color: '#111111', width: 3, points: [{ x: 1, y: 2 }] }],
      },
    },
  });

  assert.equal(normalized.detailsText, 'Edited full details');
  assert.equal(normalized.detailsTouched, true);
  assert.equal(normalized.notes, 'הערה א\nהערה ב\n');
  assert.equal(normalized.notesHtml, '<div>הערה א</div><div>הערה ב</div>');
  assert.equal(normalized.includeRenderSketch, false);
  assert.equal(normalized.includeOpenClosed, undefined);
  assert.equal(normalized.sketchAnnotations?.renderSketch?.strokes?.length, 1);
});

test('export order pdf draft runtime collapses stale touched drift during normalization', () => {
  const normalized = normalizeOrderPdfExportDraft(asRecord, {
    autoDetails: 'Same details',
    detailsText: 'Same details',
    detailsHtml: '<div>Same details</div>',
    detailsTouched: true,
  });

  assert.equal(normalized.detailsText, 'Same details');
  assert.equal(normalized.detailsTouched, false);
});

test('export order pdf draft runtime resolves defaults, recovered notes, and sketch flags together', () => {
  const resolved = resolveOrderPdfExportDraft({
    draft: {
      projectName: '',
      orderDate: '',
      autoDetails: 'Auto details',
      detailsText: '',
      detailsHtml: '<div>Auto details</div>',
      detailsTouched: false,
      notes: '',
      notesHtml: '<div>רק HTML</div>',
      includeOpenClosed: false,
    } as any,
    defaultProjectName: 'Project Default',
    defaultOrderDate: '12/04/2026',
    defaultAutoDetails: 'Built auto details',
  });

  assert.deepEqual(resolved, {
    projectName: 'Project Default',
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
