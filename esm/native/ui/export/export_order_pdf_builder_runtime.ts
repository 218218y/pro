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
  const defaultTextFieldAppearanceProvider = getCtor<
    (field: unknown, widget: unknown, font: unknown) => { name: string }[]
  >(pdf, 'defaultTextFieldAppearanceProvider');
  const showText = getCtor<(encoded: unknown) => { name: string }>(pdf, 'showText');
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
    !defaultTextFieldAppearanceProvider ||
    !showText ||
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

  // The /DA recorded by pdf-lib refers to font.name. Acrobat needs that same
  // alias in /AcroForm/DR/Font when the user focuses and edits a text widget;
  // the /AP's own resource dictionary is not sufficient for interactive edits.
  const acroForm = (form as { acroForm?: { dict?: unknown } }).acroForm;
  const acroDict = acroForm?.dict as
    | { lookup?: (key: unknown, type: unknown) => unknown; set?: (key: unknown, value: unknown) => void }
    | undefined;
  const context = pdfDoc.context as { obj?: (value: unknown) => unknown } | undefined;
  const embedded = font as { name?: string; ref?: unknown };
  if (!acroDict?.lookup || !acroDict.set || !context?.obj || !embedded.name || !embedded.ref) {
    throw new Error('Cannot register the order PDF editable form font');
  }
  const ensureResourceDict = (parent: typeof acroDict, key: string) => {
    let resource = parent.lookup?.(PDFName.of(key), PDFDict) as typeof acroDict | undefined;
    if (!resource) {
      resource = context.obj?.({}) as typeof acroDict;
      parent.set?.(PDFName.of(key), resource);
    }
    if (!resource?.set) throw new Error(`Invalid order PDF /AcroForm/${key} resource`);
    return resource;
  };
  const dr = ensureResourceDict(acroDict, 'DR');
  const fonts = ensureResourceDict(dr, 'Font');
  fonts.set?.(PDFName.of(embedded.name), embedded.ref);

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
      return '';
    } catch (e) {
      deps._exportReportThrottled(App, 'buildOrderPdfInteractive.asText', e, { throttleMs: 1500 });
      return '';
    }
  };

  const parseFontNamesFromDA = (daObj: unknown): string[] => {
    const text = asText(daObj);
    const out: string[] = [];
    const re = /\/([A-Za-z0-9_+\-.]+)\s+\d+(?:\.\d+)?\s+Tf/g;
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
    appearanceKit: { defaultTextFieldAppearanceProvider, showText },
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
