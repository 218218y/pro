import type {
  OrderPdfBuilderContextLike,
  OrderPdfFieldSpecLike,
  PdfTextFieldLike,
} from './export_order_pdf_builder_shared.js';
import { getObjectMethods } from './export_order_pdf_shared.js';
import { createOrderPdfWidgetAppearance } from './export_order_pdf_field_appearance.js';
import {
  readOrderPdfNumberField,
  reportOrderPdfBuilderFieldError,
  type OrderPdfBuilderFieldAcrobatOps,
} from './export_order_pdf_builder_fields_shared.js';

export function createOrderPdfBuilderFieldAcrobatOps(
  ctx: OrderPdfBuilderContextLike
): OrderPdfBuilderFieldAcrobatOps {
  const { deps, textOps, runtime } = ctx;
  const { asArray, getFn, getProp } = deps;
  const { fixBidiForAcrobatText } = textOps;
  const { font, black, updateDefaultAppearance, PDFName, PDFNumber, PDFString, asText } = runtime;

  const ensureAcroFieldDAHasTf = (acroField: unknown, targetFontSize: number): void => {
    const dict = getProp(acroField, 'dict');
    const methods = getObjectMethods(dict);
    if (!methods?.get || !methods.set || !PDFString?.of) {
      throw new Error('Order PDF field default appearance is not writable');
    }
    // Imported Acrobat templates sometimes encode the slash as \057 inside
    // the DA *value*. pdf-lib's Tf parser cannot read that escape and silently
    // auto-sizes the widget (e.g. notes become 35pt instead of 12pt).
    const da = asText(methods.get(PDFName.of('DA'))).replace(/\\057/g, '/');
    const fontAlias = /\/([A-Za-z0-9_+.-]+)\s+(?:\d+(?:\.\d+)?)\s+Tf/.exec(da)?.[1] || 'ArimoU';
    methods.set(PDFName.of('DA'), PDFString.of(`/${fontAlias} ${targetFontSize} Tf 0 g`));
  };

  const clearRichTextField = (field: unknown): void => {
    try {
      const acroField = field ? getProp(field, 'acroField') : null;
      const dict = acroField ? getProp(acroField, 'dict') : null;
      const dictMethods = getObjectMethods(dict);
      if (!dictMethods) return;

      try {
        const del = getFn<(key: unknown) => unknown>(dict, 'delete');
        if (del) del.call(dict, PDFName.of('RV'));
      } catch (e) {
        reportOrderPdfBuilderFieldError(ctx, 'buildOrderPdfInteractive.clearRichTextField.deleteRV', e);
      }

      const ffKey = PDFName.of('Ff');
      const ffObj = dictMethods.get ? dictMethods.get(ffKey) : null;
      const ffObjWithNumber = readOrderPdfNumberField(ffObj);
      const ffNum =
        ffObjWithNumber && typeof ffObjWithNumber.asNumber === 'function' ? ffObjWithNumber.asNumber() : 0;
      const richTextFlag = 1 << 25;
      const nextFlags = (ffNum | 0) & ~richTextFlag;
      if (dictMethods.set) dictMethods.set(ffKey, PDFNumber.of(nextFlags));
    } catch (e) {
      reportOrderPdfBuilderFieldError(ctx, 'buildOrderPdfInteractive.clearRichTextField', e);
    }
  };

  const configureFieldForAcrobat = (
    field: PdfTextFieldLike,
    fontSize: number,
    spec: Pick<OrderPdfFieldSpecLike, 'align' | 'multiline'>,
    errorPrefix: string
  ): void => {
    clearRichTextField(field);

    if (spec.multiline) {
      try {
        field.enableMultiline();
      } catch (e) {
        reportOrderPdfBuilderFieldError(ctx, `${errorPrefix}.enableMultiline`, e);
      }
    }

    if (spec.align != null) {
      try {
        field.setAlignment(spec.align);
      } catch (e) {
        reportOrderPdfBuilderFieldError(ctx, `${errorPrefix}.setAlignment`, e);
      }
    }

    try {
      if (typeof updateDefaultAppearance === 'function') {
        updateDefaultAppearance(getProp(field, 'acroField'), black, font, fontSize);
      }
    } catch (e) {
      reportOrderPdfBuilderFieldError(ctx, `${errorPrefix}.updateDefaultAppearance`, e);
    }

    try {
      ensureAcroFieldDAHasTf(getProp(field, 'acroField'), fontSize);
    } catch (e) {
      reportOrderPdfBuilderFieldError(ctx, `${errorPrefix}.ensureDA`, e);
    }

    const acro = getProp(field, 'acroField');
    const acroDict = getProp(acro, 'dict');
    const da = getFn(acroDict, 'get')?.call(acroDict, PDFName.of('DA'));
    const widgets = asArray(getFn(acro, 'getWidgets')?.call(acro) || []);
    if (!da || !widgets.length) throw new Error('Order PDF field DA or widgets unavailable');
    for (const widget of widgets) {
      const set = getFn(getProp(widget, 'dict'), 'set');
      if (!set) throw new Error('Order PDF widget DA cannot be set');
      set.call(getProp(widget, 'dict'), PDFName.of('DA'), da);
    }
  };

  const writeFieldText = (field: PdfTextFieldLike, value: string, errorPrefix: string): void => {
    // Do not silently export a half-filled document if the appearance fails.
    try {
      field.setText(fixBidiForAcrobatText(value || ''));
      const update = getFn<(font: unknown, provider: unknown) => void>(field, 'updateAppearances');
      if (!update) throw new Error('Text field appearance generator unavailable');
      update.call(field, font, (pdfField: unknown, widget: unknown, appearanceFont: unknown) =>
        createOrderPdfWidgetAppearance(
          pdfField as { getText: () => string | undefined },
          widget,
          appearanceFont as {
            encodeText: (line: string) => unknown;
            widthOfTextAtSize: (line: string, size: number) => number;
          },
          runtime.appearanceKit
        )
      );
      const acro = getProp(field, 'acroField');
      const widgets = asArray(getFn(acro, 'getWidgets')?.call(acro) || []);
      if (!widgets.length) throw new Error('Order PDF field has no widgets');
      for (const widget of widgets) {
        const dict = getProp(widget, 'dict');
        const get = getFn(dict, 'get');
        if (!get?.call(dict, PDFName.of('AP'))) {
          throw new Error('Order PDF field has no /AP stream');
        }
      }
    } catch (error) {
      reportOrderPdfBuilderFieldError(ctx, `${errorPrefix}.appearance`, error);
      throw error;
    }
  };

  return {
    configureFieldForAcrobat,
    writeFieldText,
  };
}
