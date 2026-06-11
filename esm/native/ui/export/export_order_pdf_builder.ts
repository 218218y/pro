// Interactive order-PDF builder kept separate from owner/capture/text seams.

import type { AppContainer } from '../../../../types/app.js';
import type { OrderPdfBuildResultLike, OrderPdfDraftLike } from '../../../../types/build.js';
import type { ExportOrderPdfDeps } from './export_order_pdf_types.js';
import type { ExportOrderPdfCaptureOps } from './export_order_pdf_capture.js';
import type { ExportOrderPdfTextOps } from './export_order_pdf_text_contracts.js';
import { createOrderPdfBuilderTemplateOps } from './export_order_pdf_builder_template.js';
import { createOrderPdfBuilderFieldOps } from './export_order_pdf_builder_fields.js';
import { loadOrderPdfBuilderRuntime } from './export_order_pdf_builder_runtime.js';
import { prepareOrderPdfBuildAssets } from './export_order_pdf_builder_assets.js';
import {
  buildOrderPdfDocumentResult,
  validateOrderPdfTemplateOrToast,
} from './export_order_pdf_builder_document.js';

export type ExportOrderPdfBuilderOps = {
  buildOrderPdfInteractiveBlobFromDraft: (
    app: AppContainer,
    draft: OrderPdfDraftLike
  ) => Promise<OrderPdfBuildResultLike | null>;
};

export function createExportOrderPdfBuilderOps(
  deps: ExportOrderPdfDeps,
  textOps: ExportOrderPdfTextOps,
  captureOps: ExportOrderPdfCaptureOps
): ExportOrderPdfBuilderOps {
  const { _buildOrderPdfFileName, _reportExportError, _requireApp, _toast, hasDom } = {
    _buildOrderPdfFileName: textOps.buildOrderPdfFileName,
    _reportExportError: deps._reportExportError,
    _requireApp: deps._requireApp,
    _toast: deps._toast,
    hasDom: deps.hasDom,
  };

  async function buildOrderPdfInteractiveBlobFromDraft(
    App: AppContainer,
    draft: OrderPdfDraftLike
  ): Promise<OrderPdfBuildResultLike | null> {
    const app = _requireApp(App);
    const safeDraft = textOps.normalizeOrderPdfDraft(draft);
    if (!hasDom(app)) {
      _toast(app, 'ייצוא PDF זמין רק בדפדפן', 'error');
      return null;
    }

    const prepared = await prepareOrderPdfBuildAssets(app, safeDraft, deps, textOps, captureOps);
    if (!prepared) return null;

    try {
      const runtime = await loadOrderPdfBuilderRuntime(app, deps, prepared.templateBytes, prepared.fontBytes);
      const templateOps = createOrderPdfBuilderTemplateOps({ App: app, deps, textOps, runtime });
      const fieldOps = createOrderPdfBuilderFieldOps({ App: app, deps, textOps, runtime });
      if (
        !validateOrderPdfTemplateOrToast({
          App: app,
          deps,
          validateTemplate: templateOps.validateTemplate,
        })
      ) {
        return null;
      }

      templateOps.applyNeedAppearances();
      return await buildOrderPdfDocumentResult({
        App: app,
        deps,
        textOps,
        runtime,
        fieldOps,
        resolvedDraft: prepared.resolvedDraft,
        compositeImageSlotBytes: prepared.compositeImageSlotBytes,
        buildOrderPdfFileName: _buildOrderPdfFileName,
      });
    } catch (e) {
      _reportExportError(app, 'buildOrderPdfInteractive', e, { interactivePdf: true });
      console.warn('[WardrobePro] Interactive PDF generation failed', e);
      _toast(app, 'שגיאה ביצירת PDF', 'error');
      return null;
    }
  }

  return {
    buildOrderPdfInteractiveBlobFromDraft,
  };
}
