import type { AppContainer } from '../../../../types/app.js';
import type { ExportOrderPdfDeps } from './export_order_pdf_types.js';
import type {
  OrderPdfBuilderRuntimeLike,
  PdfClassLike,
  PdfDocLike,
} from './export_order_pdf_builder_shared.js';
import { getCtor, getTextCodec } from './export_order_pdf_shared.js';

function readPdfTextCodec(value: unknown): { asString?: () => string; decodeText?: () => string } | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

export async function loadOrderPdfBuilderRuntime(
  App: AppContainer,
  deps: ExportOrderPdfDeps,
  templateBytes: Uint8Array,
  fontBytes: Uint8Array
): Promise<OrderPdfBuilderRuntimeLike> {
  const { asObject } = deps;

  const pdfLib = await import('pdf-lib');
  const fontkitMod = await import('@pdf-lib/fontkit');
  const fontkit = (() => {
    const mod = asObject(fontkitMod);
    return mod['default'] || fontkitMod;
  })();

  const pdf = asObject(pdfLib);
  const PDFDocument = getCtor<{ load: (bytes: Uint8Array) => Promise<PdfDocLike> }>(pdf, 'PDFDocument');
  const rgb = getCtor<(r: number, g: number, b: number) => unknown>(pdf, 'rgb');
  const TextAlignment = asObject(pdf['TextAlignment']);
  const updateDefaultAppearance = getCtor<
    (acroField: unknown, color: unknown, font: unknown, fontSize: number) => unknown
  >(pdf, 'updateDefaultAppearance');

  const PDFName = getCtor<{ of: (name: string) => unknown }>(pdf, 'PDFName');
  const PDFNumber = getCtor<{ of: (n: number) => unknown }>(pdf, 'PDFNumber');
  const PDFBool = getCtor<{ True?: unknown }>(pdf, 'PDFBool');
  const PDFDict = getCtor<PdfClassLike>(pdf, 'PDFDict');
  const PDFArray = getCtor<PdfClassLike>(pdf, 'PDFArray');
  const PDFRef = getCtor<PdfClassLike>(pdf, 'PDFRef');
  const PDFString = getCtor<PdfClassLike & { of?: (s: string) => unknown }>(pdf, 'PDFString');
  const PDFHexString = getCtor<PdfClassLike>(pdf, 'PDFHexString');

  if (
    !PDFDocument ||
    !rgb ||
    !PDFName ||
    !PDFNumber ||
    !PDFBool ||
    !PDFDict ||
    !PDFArray ||
    !PDFRef ||
    !PDFString ||
    !PDFHexString
  ) {
    throw new Error('[WardrobePro][ESM] Missing pdf-lib runtime surface');
  }

  const pdfDoc = await PDFDocument.load(templateBytes);
  if (fontkit && typeof pdfDoc.registerFontkit === 'function') pdfDoc.registerFontkit(fontkit);

  const font = await pdfDoc.embedFont(fontBytes, { subset: false });
  const pages = pdfDoc.getPages();
  const firstPage = pages && pages[0] ? pages[0] : pdfDoc.addPage();
  const { width: pageWidth, height: pageHeight } = firstPage.getSize();
  const black = rgb(0, 0, 0);
  const form = pdfDoc.getForm();

  const asText = (obj: unknown): string => {
    try {
      if (!obj) return '';
      const objAsRecord = readPdfTextCodec(obj);
      if (
        PDFString &&
        obj instanceof PDFString &&
        objAsRecord &&
        typeof objAsRecord.asString === 'function'
      ) {
        return objAsRecord.asString();
      }
      if (
        PDFHexString &&
        obj instanceof PDFHexString &&
        objAsRecord &&
        typeof objAsRecord.decodeText === 'function'
      ) {
        return objAsRecord.decodeText();
      }
      const textCodec = getTextCodec(obj);
      if (textCodec && typeof textCodec.decodeText === 'function') return textCodec.decodeText();
      if (textCodec && typeof textCodec.asString === 'function') return textCodec.asString();
      return String(obj);
    } catch (e) {
      deps._exportReportThrottled(App, 'buildOrderPdfInteractive.asText', e, { throttleMs: 1500 });
      return '';
    }
  };

  const parseFontNamesFromDA = (daObj: unknown): string[] => {
    const text = asText(daObj);
    const out: string[] = [];
    const re = /\/([A-Za-z0-9_+\-\.]+)\s+\d+(?:\.\d+)?\s+Tf/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text))) {
      if (match[1] && !out.includes(match[1])) out.push(match[1]);
    }
    return out;
  };

  return {
    pdfDoc,
    form,
    font,
    firstPage,
    pageWidth,
    pageHeight,
    black,
    TextAlignment,
    updateDefaultAppearance: updateDefaultAppearance ?? null,
    PDFName,
    PDFNumber,
    PDFBool: PDFBool ?? null,
    PDFDict,
    PDFArray,
    PDFRef,
    PDFString: PDFString ?? null,
    PDFHexString: PDFHexString ?? null,
    asText,
    parseFontNamesFromDA,
  };
}
