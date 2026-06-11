import type { PdfLibCopyPagesFn, PdfLibRemovePageFn } from './order_pdf_overlay_contracts.js';
import type { PdfLibNameCtorLike as PdfNameLike } from './order_pdf_overlay_pdf_lib.js';
import { getFn, getProp, orderPdfOverlayReportNonFatal } from './order_pdf_overlay_runtime.js';

export type { PdfLibCopyPagesFn, PdfLibRemovePageFn };

export function shiftNumber(queue: number[]): number | null {
  const next = queue.shift();
  return typeof next === 'number' ? next : null;
}

export function isBlobLike(value: unknown): value is Blob {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof getFn<() => Promise<ArrayBuffer>>(value, 'arrayBuffer') === 'function'
  );
}

function readPdfDictGet(value: unknown): ((key: unknown) => unknown) | null {
  return getFn<(key: unknown) => unknown>(value, 'get');
}

function readPdfArrayItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const asArray = getFn<() => unknown[]>(value, 'asArray');
  if (asArray) {
    try {
      const out = asArray();
      return Array.isArray(out) ? out : [];
    } catch {
      return [];
    }
  }
  return [];
}

function readAcroFieldWidgets(field: unknown, PDFName: PdfNameLike): unknown[] {
  const fieldGetWidgets = getFn<() => unknown[]>(field, 'getWidgets');
  if (fieldGetWidgets) {
    try {
      const out = fieldGetWidgets();
      if (Array.isArray(out) && out.length) return out;
    } catch {
      // fall through to acro/dict-based extraction
    }
  }

  const acro = getProp(field, 'acroField');
  const acroGetWidgets = getFn<() => unknown[]>(acro, 'getWidgets');
  if (acroGetWidgets) {
    try {
      const out = acroGetWidgets();
      if (Array.isArray(out) && out.length) return out;
    } catch {
      // fall through to acro/dict-based extraction
    }
  }

  const acroDict = getProp(acro, 'dict');
  const acroDictGet = readPdfDictGet(acroDict);
  if (acroDictGet) {
    try {
      const kids = acroDictGet(PDFName.of('Kids'));
      const kidItems = readPdfArrayItems(kids);
      if (kidItems.length) return kidItems;
    } catch {
      // ignore and fall back to terminal widget mode
    }
  }

  return acro ? [acro] : [];
}

function readWidgetPageRef(widget: unknown, PDFName: PdfNameLike): unknown {
  const dict = getProp(widget, 'dict') || widget;
  const dictGet = readPdfDictGet(dict);
  if (dictGet) {
    try {
      const pageRef = dictGet(PDFName.of('P'));
      if (pageRef) return pageRef;
    } catch {
      // fall through to bound P() reader
    }
  }
  const P = getFn<() => unknown>(widget, 'P');
  if (P) {
    try {
      return P();
    } catch {
      return null;
    }
  }
  return null;
}

export async function collectTrailingNonFormPageIndexes(pdfDoc: {
  getPages?: () => unknown[];
  getForm?: () => { getFields?: () => unknown[] } | null;
}): Promise<number[]> {
  try {
    const { loadPdfNameCtor } = await import('./order_pdf_overlay_pdf_lib.js');
    const PDFName = await loadPdfNameCtor();
    const pages = typeof pdfDoc.getPages === 'function' ? pdfDoc.getPages() : [];
    const total = Array.isArray(pages) ? pages.length : 0;
    if (!total) return [];

    const pageRefToIndex = new Map<string, number>();
    for (let i = 0; i < total; i++) {
      try {
        const ref = getProp(pages[i], 'ref');
        if (ref) pageRefToIndex.set(String(ref), i);
      } catch (__wpErr) {
        orderPdfOverlayReportNonFatal('orderPdfImport:pageRefToIndex', __wpErr);
      }
    }

    const formPageIndexes = new Set<number>();
    try {
      const form = typeof pdfDoc.getForm === 'function' ? pdfDoc.getForm() : null;
      const fields = form && typeof form.getFields === 'function' ? form.getFields() : [];
      for (const field of fields || []) {
        const widgets = readAcroFieldWidgets(field, PDFName);
        for (const widget of widgets || []) {
          try {
            const pObj = readWidgetPageRef(widget, PDFName);
            if (!pObj) continue;
            const idx = pageRefToIndex.get(String(pObj));
            if (typeof idx === 'number' && idx >= 0) formPageIndexes.add(idx);
          } catch (__wpErr) {
            orderPdfOverlayReportNonFatal('orderPdfImport:widgetPageIndex', __wpErr);
          }
        }
      }
    } catch (__wpErr) {
      orderPdfOverlayReportNonFatal('orderPdfImport:formFields', __wpErr);
    }

    const nonForm: number[] = [];
    for (let i = 0; i < total; i++) {
      if (!formPageIndexes.has(i)) nonForm.push(i);
    }
    if (!nonForm.length) return [];

    const out: number[] = [];
    let expect = total - 1;
    for (let i = nonForm.length - 1; i >= 0; i--) {
      const idx = nonForm[i];
      if (idx !== expect) break;
      out.push(idx);
      expect--;
    }
    out.reverse();
    return out.filter(i => i > 0);
  } catch {
    return [];
  }
}
