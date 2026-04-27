import test from 'node:test';
import assert from 'node:assert/strict';

import { createExportOrderPdfTextOps } from '../esm/native/ui/export/export_order_pdf_text.ts';

function createTextDeps(overrides: Record<string, unknown> = {}) {
  const cfg = {
    wardrobeType: 'sliding',
    boardMaterial: 'melamine',
    doorStyle: 'profile',
    modulesConfiguration: [{ doors: 1 }, { doors: 2 }],
    structureSelection: '[9,9,9]',
  };
  const ui = {
    raw: {
      doors: 3,
      width: 150,
      height: 240,
      depth: 55,
      singleDoorPos: 'left',
    },
    selectedModelId: 'model-1',
    doorStyle: 'profile',
  };

  return {
    asRecord: (value: unknown) =>
      value && typeof value === 'object' ? (value as Record<string, unknown>) : null,
    asObject: (value: unknown) =>
      (value && typeof value === 'object' ? value : {}) as Record<string, unknown>,
    getCfg: () => cfg,
    getUi: () => ui,
    getModelById: () => ({ name: '⭐ דגם כוכב' }),
    _exportReportNonFatalNoApp: () => undefined,
    _exportReportThrottled: () => undefined,
    _getProjectName: () => 'פרויקט בדיקה',
    _requireApp: <T>(app: T) => app,
    readModulesConfigurationListFromConfigSnapshot: (value: Record<string, unknown>, key: string) =>
      Array.isArray(value?.[key]) ? (value[key] as unknown[]) : [],
    ...overrides,
  } as any;
}

test('export order pdf text ops compose details, bidi, and layout behavior from one canonical seam', () => {
  const ops = createExportOrderPdfTextOps(createTextDeps());

  const details = ops.buildOrderDetailsText({} as never);
  assert.match(details, /דגם: דגם כוכב/);
  assert.match(details, /סוג: הזזה/);
  assert.match(details, /דלתות: 3, מלמין, פרופיל/);
  assert.match(details, /מידות \(ס"מ\): 150×240×55/);
  assert.match(details, /חלוקת גוף: 50-100/);

  const wrapped = ops.wrapTextToWidth(
    'alpha beta gamma',
    { widthOfTextAtSize: (text: string) => text.length } as never,
    12,
    10
  );
  assert.deepEqual(wrapped, ['alpha beta', 'gamma']);

  assert.equal(
    ops.buildOrderPdfFileName({ orderNumber: '17/', projectName: 'Project:Name' }),
    '17ProjectName.pdf'
  );
});

test('export order pdf text ops keep canonical draft defaults and bidi stabilization behavior', () => {
  const ops = createExportOrderPdfTextOps(createTextDeps());

  const draft = ops.getOrderPdfDraft({} as never);
  assert.equal(draft.projectName, 'פרויקט בדיקה');
  assert.match(draft.autoDetails, /דגם: דגם כוכב/);
  assert.match(draft.orderDate, /^\d{2}\/\d{2}\/\d{4}$/);

  const fixed = ops.fixBidiForAcrobatText('אבג 123 xyz');
  assert.equal(fixed.startsWith('\u200F'), true);
  assert.equal(fixed.includes('\u200E123 xyz\u200E'), true);

  const runs = ops.splitDirectionalRuns('ABC אבג DEF');
  assert.deepEqual(
    runs.map(run => run.dir),
    ['ltr', 'rtl', 'ltr']
  );
});
