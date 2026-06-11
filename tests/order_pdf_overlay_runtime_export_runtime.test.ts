import test from 'node:test';
import assert from 'node:assert/strict';

import { bindExportApiFromModule } from '../esm/native/ui/react/pdf/order_pdf_overlay_runtime_export_api.js';
import {
  asExportApiLike,
  getOrderPdfDraftFn,
  getPdfJsLibFromModule,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_runtime_export_pdfjs.js';

test('getPdfJsLibFromModule accepts either direct or default PDF.js-like module shapes', () => {
  const direct = { getDocument: () => 'direct' } as any;
  const wrapped = { default: { getDocument: () => 'wrapped' } } as any;

  assert.equal(getPdfJsLibFromModule(direct)?.getDocument(), 'direct');
  assert.equal(getPdfJsLibFromModule(wrapped)?.getDocument(), 'wrapped');
  assert.equal(getPdfJsLibFromModule({ default: {} } as any), null);
});

test('getOrderPdfDraftFn and asExportApiLike only expose callable PDF export hooks', async () => {
  const getDraft = getOrderPdfDraftFn({ getOrderPdfDraft: () => ({ projectName: 'draft' }) });
  assert.deepEqual(await getDraft?.(), { projectName: 'draft' });
  assert.equal(getOrderPdfDraftFn({ getOrderPdfDraft: 7 } as any), null);

  const api = asExportApiLike({
    exportOrderPdfInteractiveFromDraft: async (draft: unknown) => ({ exported: draft }),
    buildOrderPdfInteractiveBlobFromDraft: (draft: unknown) => ({
      blob: new Blob(['x']),
      fileName: String((draft as any).projectName),
    }),
    ignored: 123,
  });

  assert.deepEqual(await api?.exportOrderPdfInteractiveFromDraft?.({ projectName: 'alpha' } as any), {
    exported: { projectName: 'alpha' },
  });
  const blobResult = await api?.buildOrderPdfInteractiveBlobFromDraft?.({ projectName: 'beta' } as any);
  assert.equal(blobResult?.fileName, 'beta');
  assert.ok(blobResult?.blob instanceof Blob);
});

test('bindExportApiFromModule captures the app once and returns null for missing module/app', async () => {
  const calls: Array<{ kind: string; app: unknown; draft?: unknown }> = [];
  const app = { id: 'app' };
  const mod = {
    getOrderPdfDraft(appArg: unknown) {
      calls.push({ kind: 'draft', app: appArg });
      return { projectName: 'bound draft' };
    },
    exportOrderPdfInteractiveFromDraft(appArg: unknown, draft: unknown) {
      calls.push({ kind: 'interactive', app: appArg, draft });
      return { ok: true };
    },
    buildOrderPdfInteractiveBlobFromDraft(appArg: unknown, draft: unknown) {
      calls.push({ kind: 'blob', app: appArg, draft });
      return { blob: new Blob(['pdf']), fileName: 'order.pdf' };
    },
  } as any;

  const binding = bindExportApiFromModule(mod, app);
  assert.ok(binding);
  assert.deepEqual(binding?.getOrderPdfDraft?.(), { projectName: 'bound draft' });
  assert.deepEqual(await binding?.exportOrderPdfInteractiveFromDraft?.({ id: 1 } as any), { ok: true });
  const blobResult = await binding?.buildOrderPdfInteractiveBlobFromDraft?.({ id: 2 } as any);
  assert.equal(blobResult?.fileName, 'order.pdf');
  assert.equal(calls.length, 3);
  assert.deepEqual(
    calls.map(call => call.app),
    [app, app, app]
  );
  assert.equal(bindExportApiFromModule(null, app), null);
  assert.equal(bindExportApiFromModule(mod, null), null);
});
