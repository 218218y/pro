import {
  ORDER_PDF_TEMPLATE_PAGE_HEIGHT,
  listOrderPdfFieldSpecs,
  type OrderPdfFieldKey,
  type OrderPdfFieldSpec,
  type OrderPdfTemplateBoxLike,
} from '../../pdf/order_pdf_field_specs_runtime.js';
import type { OrderPdfImportedDraftFieldValues } from '../../pdf/order_pdf_document_fields_runtime.js';
import { getPdfJsLibFromModule, getProp, isPromiseLike } from './order_pdf_overlay_runtime.js';

const ORDER_PDF_IMPORT_TEMPLATE_PAGE_WIDTH = 595;
const ORDER_PDF_TEXT_ITEM_DEFAULT_HEIGHT = 12;

type UnknownRecord = Record<string, unknown>;

type PdfJsTextLayerItemLike = {
  str?: unknown;
  transform?: unknown;
  width?: unknown;
  height?: unknown;
  dir?: unknown;
  hasEOL?: unknown;
};

type PdfJsTextContentLike = { items?: unknown[] };
type PdfJsTextPageLike = {
  view?: unknown;
  getTextContent?: () => Promise<PdfJsTextContentLike> | PdfJsTextContentLike;
};

type PdfTextLayerPage = {
  width: number;
  height: number;
  items: PdfTextLayerItem[];
};

export type PdfTextLayerItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dir?: string;
  hasEOL?: boolean;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function readFiniteNumber(value: unknown, defaultValue: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

function readNumberTuple(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map(v => Number(v)).filter(v => Number.isFinite(v));
}

function readPdfJsPageSize(page: PdfJsTextPageLike): { width: number; height: number } {
  const view = readNumberTuple(page.view);
  const width =
    view.length >= 4 ? Math.abs((view[2] ?? 0) - (view[0] ?? 0)) : ORDER_PDF_IMPORT_TEMPLATE_PAGE_WIDTH;
  const height =
    view.length >= 4 ? Math.abs((view[3] ?? 0) - (view[1] ?? 0)) : ORDER_PDF_TEMPLATE_PAGE_HEIGHT;
  return {
    width: width > 0 ? width : ORDER_PDF_IMPORT_TEMPLATE_PAGE_WIDTH,
    height: height > 0 ? height : ORDER_PDF_TEMPLATE_PAGE_HEIGHT,
  };
}

function readPdfTextLayerItem(value: unknown): PdfTextLayerItem | null {
  const item = asRecord(value) as PdfJsTextLayerItemLike | null;
  if (!item) return null;
  const str = String(item.str ?? '').replace(/\u00a0/g, ' ');
  if (!str.trim()) return null;

  const transform = readNumberTuple(item.transform);
  if (transform.length < 6) return null;

  const x = readFiniteNumber(transform[4], Number.NaN);
  const y = readFiniteNumber(transform[5], Number.NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const transformHeight = Math.max(
    Math.abs(readFiniteNumber(transform[3], 0)),
    Math.abs(readFiniteNumber(transform[0], 0))
  );
  const height = Math.max(
    1,
    readFiniteNumber(item.height, transformHeight || ORDER_PDF_TEXT_ITEM_DEFAULT_HEIGHT)
  );
  const width = Math.max(0, readFiniteNumber(item.width, 0));

  return {
    str,
    x,
    y,
    width,
    height,
    dir: typeof item.dir === 'string' ? item.dir : undefined,
    hasEOL: item.hasEOL === true,
  };
}

function scaleFieldBoxToPage(
  box: OrderPdfTemplateBoxLike,
  pageWidth: number,
  pageHeight: number
): OrderPdfTemplateBoxLike {
  const sx = pageWidth / ORDER_PDF_IMPORT_TEMPLATE_PAGE_WIDTH;
  const sy = pageHeight / ORDER_PDF_TEMPLATE_PAGE_HEIGHT;
  return {
    x: box.x * sx,
    y: box.y * sy,
    w: box.w * sx,
    h: box.h * sy,
  };
}

function textItemIntersectsBox(item: PdfTextLayerItem, box: OrderPdfTemplateBoxLike): boolean {
  const tolerance = Math.max(4, Math.min(18, box.h * 0.35));
  const itemWidth = item.width > 0 ? item.width : Math.max(2, item.str.length * item.height * 0.45);
  const itemLeft = item.x;
  const itemRight = item.x + itemWidth;
  const itemBottom = item.y - item.height * 0.2;
  const itemTop = item.y + item.height;

  const boxLeft = box.x - tolerance;
  const boxRight = box.x + box.w + tolerance;
  const boxBottom = box.y - tolerance;
  const boxTop = box.y + box.h + tolerance;

  return itemRight >= boxLeft && itemLeft <= boxRight && itemTop >= boxBottom && itemBottom <= boxTop;
}

function normalizeExtractedFieldText(value: string): string {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t]{2,}/g, ' ').trim())
    .filter(line => line.length > 0)
    .join('\n')
    .trim();
}

function groupPdfTextItemsIntoLines(items: PdfTextLayerItem[]): PdfTextLayerItem[][] {
  const sorted = items.slice().sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PdfTextLayerItem[][] = [];

  for (const item of sorted) {
    const tolerance = Math.max(3, item.height * 0.65);
    const line = lines.find(existing => {
      const anchor = existing[0];
      return !!anchor && Math.abs(anchor.y - item.y) <= tolerance;
    });
    if (line) {
      line.push(item);
    } else {
      lines.push([item]);
    }
  }

  return lines;
}

function joinPdfTextLineItems(items: PdfTextLayerItem[], dir: OrderPdfFieldSpec['dir']): string {
  const sorted = items.slice().sort((a, b) => (dir === 'rtl' ? b.x - a.x : a.x - b.x));
  let out = '';
  let prev: PdfTextLayerItem | null = null;

  for (const item of sorted) {
    const text = String(item.str || '');
    if (!text) continue;
    if (!prev) {
      out += text;
    } else {
      const prevRight = prev.x + Math.max(prev.width, prev.str.length * prev.height * 0.45);
      const gap = dir === 'rtl' ? prev.x - (item.x + Math.max(item.width, 0)) : item.x - prevRight;
      const needsSpace = gap > Math.max(2, item.height * 0.2) && !out.endsWith(' ') && !text.startsWith(' ');
      out += needsSpace ? ` ${text}` : text;
    }
    prev = item;
  }

  return out;
}

function extractTextForField(page: PdfTextLayerPage, spec: OrderPdfFieldSpec): string {
  const box = scaleFieldBoxToPage(spec.templateBox, page.width, page.height);
  const inBox = page.items.filter(item => textItemIntersectsBox(item, box));
  if (!inBox.length) return '';

  const lines = groupPdfTextItemsIntoLines(inBox).map(line => joinPdfTextLineItems(line, spec.dir));
  return normalizeExtractedFieldText(lines.join('\n'));
}

function assignExtractedField(
  out: OrderPdfImportedDraftFieldValues,
  key: OrderPdfFieldKey,
  value: string
): void {
  if (!value) return;
  if (key === 'details') {
    out.detailsText = value;
  } else if (key === 'notes') {
    out.notes = value;
  } else {
    out[key] = value;
  }
}

export function extractOrderPdfDraftFieldsFromPdfTextItems(args: {
  pages: readonly PdfTextLayerPage[];
}): OrderPdfImportedDraftFieldValues {
  const firstPage = args.pages[0];
  if (!firstPage || !Array.isArray(firstPage.items) || !firstPage.items.length) return {};

  const out: OrderPdfImportedDraftFieldValues = {};
  for (const spec of listOrderPdfFieldSpecs()) {
    assignExtractedField(out, spec.key, extractTextForField(firstPage, spec));
  }

  return out;
}

async function readPdfJsTextLayerPages(bytes: Uint8Array): Promise<PdfTextLayerPage[]> {
  const mod = await import('pdfjs-dist/build/pdf.mjs');
  const pdfjs = getPdfJsLibFromModule(mod);
  if (!pdfjs) return [];

  const task = pdfjs.getDocument({
    data: bytes.slice(),
    disableWorker: true,
    verbosity: pdfjs.VerbosityLevel?.ERRORS ?? pdfjs.VerbosityLevel?.WARNINGS,
  });

  const promise = getProp(task, 'promise');
  if (!isPromiseLike(promise)) return [];

  let pdfDoc: unknown = null;
  try {
    pdfDoc = await promise;
    const docRecord = asRecord(pdfDoc);
    const numPagesRaw = docRecord ? docRecord.numPages : 0;
    const numPages = Math.max(0, Math.min(2, readFiniteNumber(numPagesRaw, 0)));
    const getPage =
      docRecord && typeof docRecord.getPage === 'function' ? docRecord.getPage.bind(docRecord) : null;
    if (!getPage || !numPages) return [];

    const pages: PdfTextLayerPage[] = [];
    for (let pageNumber = 1; pageNumber <= numPages; pageNumber += 1) {
      const page = (await getPage(pageNumber)) as PdfJsTextPageLike;
      if (!page || typeof page.getTextContent !== 'function') continue;
      const size = readPdfJsPageSize(page);
      const content = await page.getTextContent();
      const items = Array.isArray(content?.items)
        ? content.items.map(readPdfTextLayerItem).filter((item): item is PdfTextLayerItem => !!item)
        : [];
      pages.push({ ...size, items });
    }
    return pages;
  } finally {
    try {
      if (task && typeof task.destroy === 'function') task.destroy();
    } catch {
      // best effort cleanup only
    }
    try {
      const docRecord = asRecord(pdfDoc);
      if (docRecord && typeof docRecord.destroy === 'function') docRecord.destroy();
    } catch {
      // best effort cleanup only
    }
  }
}

export async function extractLoadedPdfDraftFieldsFromTextLayer(
  bytes: Uint8Array
): Promise<OrderPdfImportedDraftFieldValues> {
  try {
    const pages = await readPdfJsTextLayerPages(bytes);
    return extractOrderPdfDraftFieldsFromPdfTextItems({ pages });
  } catch {
    return {};
  }
}
