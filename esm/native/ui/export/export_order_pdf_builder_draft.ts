import type { AppContainer } from '../../../../types/app.js';
import type { OrderPdfDraftLike } from '../../../../types/build.js';
import type { ExportOrderPdfDeps } from './export_order_pdf_types.js';
import type { ExportOrderPdfTextOps } from './export_order_pdf_text_contracts.js';
import type { OrderPdfResolvedDraftLike } from './export_order_pdf_builder_contracts.js';

import {
  coerceOrderPdfTextValue,
  resolveOrderPdfDetailsTextFromDraft,
} from '../pdf/order_pdf_details_runtime.js';
import { resolveOrderPdfExportDraft } from './export_order_pdf_draft_runtime.js';

export function resolveOrderPdfString(value: unknown, fallback = ''): string {
  return coerceOrderPdfTextValue(value, fallback);
}

export function resolveOrderPdfOrderDetails(args: {
  App: AppContainer;
  draft: OrderPdfDraftLike;
  textOps: ExportOrderPdfTextOps;
}): string {
  const { App, draft, textOps } = args;
  return resolveOrderPdfDetailsTextFromDraft(
    draft,
    resolveOrderPdfString(textOps.buildOrderDetailsText(App))
  );
}

export function resolveOrderPdfDraft(
  App: AppContainer,
  draft: OrderPdfDraftLike,
  deps: ExportOrderPdfDeps,
  textOps: ExportOrderPdfTextOps
): OrderPdfResolvedDraftLike {
  return resolveOrderPdfExportDraft({
    draft,
    fallbackProjectName: deps._getProjectName(App) || 'פרויקט',
    fallbackOrderDate: textOps.formatOrderDateDdMmYyyy(new Date()),
    autoDetailsFallback: resolveOrderPdfString(textOps.buildOrderDetailsText(App)),
  });
}
