import { reportError } from '../../../services/api.js';
import { asRecord, getFn } from './order_pdf_overlay_runtime_shared.js';
import type { ExportApiBindingLike, ExportCanvasModuleLike } from './order_pdf_overlay_runtime_export_api.js';
import { bindExportApiFromModule } from './order_pdf_overlay_runtime_export_api.js';

let _exportCanvasModulePromise: Promise<ExportCanvasModuleLike | null> | null = null;

export async function ensureExportApiReady(app: unknown): Promise<ExportApiBindingLike | null> {
  if (!app) return null;

  try {
    if (!_exportCanvasModulePromise) {
      _exportCanvasModulePromise = import('../../export_canvas.js')
        .then(mod => {
          const r = asRecord(mod);
          if (!r) throw new Error('[WardrobePro] export_canvas module shape invalid');
          const out: ExportCanvasModuleLike = {};
          const getOrderPdfDraft = getFn<NonNullable<ExportCanvasModuleLike['getOrderPdfDraft']>>(
            r,
            'getOrderPdfDraft'
          );
          if (getOrderPdfDraft) out.getOrderPdfDraft = getOrderPdfDraft;
          const exportOrderPdfInteractiveFromDraft = getFn<
            NonNullable<ExportCanvasModuleLike['exportOrderPdfInteractiveFromDraft']>
          >(r, 'exportOrderPdfInteractiveFromDraft');
          if (exportOrderPdfInteractiveFromDraft) {
            out.exportOrderPdfInteractiveFromDraft = exportOrderPdfInteractiveFromDraft;
          }
          const buildOrderPdfInteractiveBlobFromDraft = getFn<
            NonNullable<ExportCanvasModuleLike['buildOrderPdfInteractiveBlobFromDraft']>
          >(r, 'buildOrderPdfInteractiveBlobFromDraft');
          if (buildOrderPdfInteractiveBlobFromDraft) {
            out.buildOrderPdfInteractiveBlobFromDraft = buildOrderPdfInteractiveBlobFromDraft;
          }
          if (
            !out.getOrderPdfDraft &&
            !out.exportOrderPdfInteractiveFromDraft &&
            !out.buildOrderPdfInteractiveBlobFromDraft
          ) {
            throw new Error('[WardrobePro] export_canvas PDF named exports missing');
          }
          return out;
        })
        .catch(err => {
          _exportCanvasModulePromise = null;
          throw err;
        });
    }
    const mod = await _exportCanvasModulePromise;
    return bindExportApiFromModule(mod, app);
  } catch (__wpErr) {
    reportError(
      app,
      __wpErr,
      { where: 'native/ui/react/pdf/order_pdf_overlay', op: 'exportCanvas.module', nonFatal: true },
      { consoleFallback: false }
    );
    return null;
  }
}
