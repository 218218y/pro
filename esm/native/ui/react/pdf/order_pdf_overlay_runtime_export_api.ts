import type { UnknownRecord } from '../../../../../types';
import type { OrderPdfDraft } from './order_pdf_overlay_contracts.js';

export type ExportCanvasModuleLike = {
  getOrderPdfDraft?: (app: unknown) => unknown;
  exportOrderPdfInteractiveFromDraft?: (app: unknown, draft: OrderPdfDraft) => Promise<void> | void;
  buildOrderPdfInteractiveBlobFromDraft?: (
    app: unknown,
    draft: OrderPdfDraft
  ) =>
    | Promise<{ blob: Blob; fileName?: string; projectName?: string } | null>
    | { blob: Blob; fileName?: string; projectName?: string }
    | null;
};

export type ExportApiBindingLike = UnknownRecord & {
  getOrderPdfDraft?: () => unknown;
  exportOrderPdfInteractiveFromDraft?: (draft: OrderPdfDraft) => unknown;
  buildOrderPdfInteractiveBlobFromDraft?: (draft: OrderPdfDraft) => unknown;
};
export function bindExportApiFromModule(
  mod: ExportCanvasModuleLike | null,
  app: unknown
): ExportApiBindingLike | null {
  if (!mod || !app) return null;
  const out: ExportApiBindingLike = {};
  const getOrderPdfDraft = mod.getOrderPdfDraft;
  if (typeof getOrderPdfDraft === 'function') {
    out.getOrderPdfDraft = () => getOrderPdfDraft(app);
  }
  const exportOrderPdfInteractiveFromDraft = mod.exportOrderPdfInteractiveFromDraft;
  if (typeof exportOrderPdfInteractiveFromDraft === 'function') {
    out.exportOrderPdfInteractiveFromDraft = (draft: OrderPdfDraft) =>
      exportOrderPdfInteractiveFromDraft(app, draft);
  }
  const buildOrderPdfInteractiveBlobFromDraft = mod.buildOrderPdfInteractiveBlobFromDraft;
  if (typeof buildOrderPdfInteractiveBlobFromDraft === 'function') {
    out.buildOrderPdfInteractiveBlobFromDraft = (draft: OrderPdfDraft) =>
      buildOrderPdfInteractiveBlobFromDraft(app, draft);
  }
  return Object.keys(out).length ? out : null;
}
