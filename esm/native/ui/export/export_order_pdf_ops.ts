// Export canvas order-PDF workflow helpers.
//
// Keeps export_canvas.ts as the canonical owner entrypoint while delegating
// order-PDF draft/text, composite capture, and interactive pdf-lib assembly
// to dedicated seams.

import type { AppContainer } from '../../../../types/app.js';
import type { UnknownCallable } from '../../../../types/common.js';
import type { ExportOrderPdfOpsLike } from '../../../../types/build.js';
import type { ExportOrderPdfDeps as ExportOrderPdfDepsBase } from './export_order_pdf_types.js';
import { createExportOrderPdfTextOps } from './export_order_pdf_text.js';
import { createExportOrderPdfCaptureOps } from './export_order_pdf_capture.js';
import { createExportOrderPdfBuilderOps } from './export_order_pdf_builder.js';

type CallableLike = UnknownCallable;

export type ExportOrderPdfDeps = ExportOrderPdfDepsBase & {
  getFn: <T extends CallableLike = CallableLike>(obj: unknown, key: string) => T | null;
};

export function createExportOrderPdfOps(deps: ExportOrderPdfDeps): ExportOrderPdfOpsLike {
  const { _requireApp, _downloadBlob, _toast } = deps;
  const textOps = createExportOrderPdfTextOps(deps);
  const captureOps = createExportOrderPdfCaptureOps(deps);
  const builderOps = createExportOrderPdfBuilderOps(deps, textOps, captureOps);

  async function exportOrderPdfInteractiveFromDraft(App: AppContainer, draft: unknown): Promise<void> {
    const app = _requireApp(App);
    const safeDraft = textOps.normalizeOrderPdfDraft(draft);
    const res = await builderOps.buildOrderPdfInteractiveBlobFromDraft(app, safeDraft);
    if (!res) return;
    _downloadBlob(app, res.blob, res.fileName);
    _toast(app, 'ה-PDF נוצר והורד בהצלחה', 'success');
  }

  return {
    getOrderPdfDraft: textOps.getOrderPdfDraft,
    buildOrderPdfInteractiveBlobFromDraft: builderOps.buildOrderPdfInteractiveBlobFromDraft,
    exportOrderPdfInteractiveFromDraft,
  };
}
