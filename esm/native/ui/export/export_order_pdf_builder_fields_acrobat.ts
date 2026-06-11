import type {
  OrderPdfBuilderContextLike,
  OrderPdfFieldSpecLike,
  PdfTextFieldLike,
} from './export_order_pdf_builder_shared.js';
import { getObjectMethods, getSetter } from './export_order_pdf_shared.js';
import {
  readOrderPdfNumberField,
  reportOrderPdfBuilderFieldError,
  type OrderPdfBuilderFieldAcrobatOps,
} from './export_order_pdf_builder_fields_shared.js';

export function createOrderPdfBuilderFieldAcrobatOps(
  ctx: OrderPdfBuilderContextLike
): OrderPdfBuilderFieldAcrobatOps {
  const { App, deps, textOps, runtime } = ctx;
  const { asArray, getFn, getProp } = deps;
  const { fixBidiForAcrobatText, acrobatBidiFixFormatScript } = textOps;
  const { pdfDoc, font, black, updateDefaultAppearance, PDFName, PDFNumber, PDFString, asText } = runtime;

  const ensureAcroFieldDAHasTf = (acroField: unknown, targetFontSize: number): boolean => {
    try {
      const dict = acroField ? getProp(acroField, 'dict') : null;
      const dictMethods = getObjectMethods(dict);
      if (!dictMethods?.get || !dictMethods.set) return false;

      const keyDA = PDFName.of('DA');
      const daObj = dictMethods.get(keyDA);
      const daText = asText(daObj) || '';
      if (/\bTf\b/.test(daText)) return true;

      const prefixMatch = /\/([A-Za-z0-9_+\-\.]+)\s+\d+(?:\.\d+)?/.exec(daText);
      const anyFontMatch = /\/([A-Za-z0-9_+\-\.]+)/.exec(daText);
      const fontName = (prefixMatch && prefixMatch[1]) || (anyFontMatch && anyFontMatch[1]) || 'Helv';

      let next = daText;
      if (prefixMatch && prefixMatch[0]) {
        next = daText.replace(prefixMatch[0], `/${fontName} ${targetFontSize} Tf`);
      } else if (daText && daText.trim().length) {
        next = `/${fontName} ${targetFontSize} Tf ${daText}`.trim();
      } else {
        next = `/${fontName} ${targetFontSize} Tf 0 g`;
      }

      const daPdf = PDFString && typeof PDFString.of === 'function' ? PDFString.of(next) : next;
      dictMethods.set(keyDA, daPdf);
      return /\bTf\b/.test(next);
    } catch (e) {
      reportOrderPdfBuilderFieldError(ctx, 'buildOrderPdfInteractive.ensureAcroFieldDAHasTf', e);
      return false;
    }
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

  const bidiFormatScript = acrobatBidiFixFormatScript();
  const pdfContext = getProp(pdfDoc, 'context');
  const ctxObj = pdfContext ? getFn(pdfContext, 'obj') : null;
  const ctxLookup = pdfContext ? getFn(pdfContext, 'lookup') : null;
  const bidiFormatAction = ctxObj
    ? ctxObj.call(pdfContext, { S: PDFName.of('JavaScript'), JS: bidiFormatScript })
    : null;

  const ensureBidiFormatAction = (dict: unknown): void => {
    try {
      if (!dict || !bidiFormatAction) return;
      const aaKey = PDFName.of('AA');
      let aa: unknown = null;
      const dictLike = getObjectMethods(dict);
      const aaObj = dictLike && typeof dictLike.get === 'function' ? dictLike.get(aaKey) : null;
      let aaResolved: unknown = aaObj;
      try {
        if (aaObj && ctxLookup) aaResolved = ctxLookup.call(pdfContext, aaObj);
      } catch (e) {
        reportOrderPdfBuilderFieldError(ctx, 'buildOrderPdfInteractive.ensureBidiFormatAction.lookup', e);
      }

      const aaResolvedDict = getSetter(aaResolved);
      if (aaResolvedDict) {
        aa = aaResolved;
      } else {
        aa = ctxObj ? ctxObj.call(pdfContext, {}) : null;
        if (aa && dictLike && typeof dictLike.set === 'function') dictLike.set(aaKey, aa);
      }
      const aaSet = getSetter(aa);
      if (aaSet) aaSet(PDFName.of('F'), bidiFormatAction);
    } catch (e) {
      reportOrderPdfBuilderFieldError(ctx, 'buildOrderPdfInteractive.ensureBidiFormatAction', e);
    }
  };

  const attachBidiFormatToField = (field: unknown): void => {
    try {
      const acro = field ? getProp(field, 'acroField') : null;
      const dict = acro ? getProp(acro, 'dict') : null;
      ensureBidiFormatAction(dict);
      const getWidgets = acro ? getFn(acro, 'getWidgets') : null;
      const widgets = asArray(getWidgets ? getWidgets.call(acro) : []);
      for (const widget of widgets) {
        const widgetDict = widget ? getProp(widget, 'dict') : null;
        ensureBidiFormatAction(widgetDict);
      }
    } catch (e) {
      reportOrderPdfBuilderFieldError(ctx, 'buildOrderPdfInteractive.attachBidiFormatToField', e);
    }
  };

  const patchFieldWidgetsAppearance = (field: unknown, errorPrefix: string): void => {
    try {
      const acro = getProp(field, 'acroField');
      const acroDict = acro ? getProp(acro, 'dict') : null;
      const dictGet = acroDict ? getFn(acroDict, 'get') : null;
      const da = dictGet ? dictGet.call(acroDict, PDFName.of('DA')) : null;
      const widgetsFn = acro ? getFn(acro, 'getWidgets') : null;
      const widgets = asArray(widgetsFn ? widgetsFn.call(acro) : []);
      for (const widget of widgets) {
        const widgetDict = widget ? getProp(widget, 'dict') : null;
        const del = widgetDict ? getFn(widgetDict, 'delete') : null;
        const set = widgetDict ? getFn(widgetDict, 'set') : null;
        if (del) del.call(widgetDict, PDFName.of('AP'));
        if (da && set) set.call(widgetDict, PDFName.of('DA'), da);
      }
    } catch (e) {
      reportOrderPdfBuilderFieldError(ctx, `${errorPrefix}.widgetsPatch`, e);
    }
  };

  const configureFieldForAcrobat = (
    field: PdfTextFieldLike,
    fontSize: number,
    spec: Pick<OrderPdfFieldSpecLike, 'align' | 'multiline'>,
    errorPrefix: string
  ): void => {
    clearRichTextField(field);
    attachBidiFormatToField(field);

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
  };

  const writeFieldText = (field: PdfTextFieldLike, value: string, errorPrefix: string): void => {
    try {
      field.setText(fixBidiForAcrobatText(value || ''));
    } catch (e) {
      reportOrderPdfBuilderFieldError(ctx, `${errorPrefix}.setText`, e);
    }
    patchFieldWidgetsAppearance(field, errorPrefix);
  };

  void App;

  return {
    configureFieldForAcrobat,
    writeFieldText,
  };
}
