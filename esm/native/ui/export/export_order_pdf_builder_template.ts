import type {
  OrderPdfBuilderContextLike,
  OrderPdfBuilderTemplateOps,
  PdfTextFieldLike,
} from './export_order_pdf_builder_shared.js';
import { getObjectMethods } from './export_order_pdf_shared.js';

function readNameValue(value: unknown): string {
  if (!value || typeof value !== 'object' || !('name' in value)) return '';
  const name = value.name;
  return typeof name === 'string' ? name : String(name || '');
}

export function createOrderPdfBuilderTemplateOps(
  ctx: OrderPdfBuilderContextLike
): OrderPdfBuilderTemplateOps {
  const { App, deps, runtime } = ctx;
  const { asArray, getFn, getProp, _exportReportThrottled } = deps;
  const { pdfDoc, form, PDFName, PDFBool, PDFDict, PDFArray, PDFRef, parseFontNamesFromDA } = runtime;

  const validateTemplate = (
    requiredTemplateFields: readonly string[]
  ): { ok: boolean; problems: string[] } => {
    const problems: string[] = [];
    try {
      const pdfContext = getProp(pdfDoc, 'context');
      const lookup = getFn<(target: unknown, type?: unknown) => unknown>(pdfContext, 'lookup');
      const catalog = getProp(pdfDoc, 'catalog');
      const catalogMethods = getObjectMethods(catalog);
      const acroObj = catalogMethods?.get ? catalogMethods.get(PDFName.of('AcroForm')) : null;
      const acro = acroObj && lookup ? lookup.call(pdfContext, acroObj, PDFDict) : null;
      if (!acro) {
        problems.push('חסר /AcroForm (שדות הטופס נמחקו מהתבנית)');
        return { ok: false, problems };
      }

      const acroMethods = getObjectMethods(acro);
      const fieldsObj = acroMethods?.get ? acroMethods.get(PDFName.of('Fields')) : null;
      const fieldsArr = fieldsObj && lookup ? lookup.call(pdfContext, fieldsObj, PDFArray) : null;
      if (!fieldsArr) {
        problems.push('חסר /AcroForm/Fields (רשימת השדות נשברה)');
        return { ok: false, problems };
      }

      try {
        const fieldsSize = getFn<() => number>(fieldsArr, 'size');
        const fieldsGet = getFn<(...args: readonly unknown[]) => unknown>(fieldsArr, 'get');
        const count = fieldsSize ? fieldsSize.call(fieldsArr) : 0;
        for (let i = 0; i < count; i++) {
          const entry = fieldsGet ? fieldsGet.call(fieldsArr, i) : null;
          const isRef = PDFRef && entry instanceof PDFRef;
          const resolved = lookup ? lookup.call(pdfContext, isRef ? entry : entry) : null;
          const dict = resolved && PDFDict && resolved instanceof PDFDict ? resolved : null;
          if (!dict) {
            problems.push('רשימת השדות בתבנית מכילה ערך לא תקין');
            break;
          }
          const dictMethods = getObjectMethods(dict);
          const typeValue = dictMethods?.get ? dictMethods.get(PDFName.of('Type')) : null;
          const typeName = readNameValue(typeValue);
          if (typeName === 'Catalog') {
            problems.push('רשימת השדות בתבנית פגומה (מכילה Catalog במקום שדה)');
            break;
          }
        }
      } catch (e) {
        _exportReportThrottled(App, 'buildOrderPdfInteractive.validateTemplate.fieldsScan', e, {
          throttleMs: 1500,
        });
      }

      const missingFields: string[] = [];
      for (const fieldName of requiredTemplateFields) {
        try {
          form.getTextField(fieldName);
        } catch (e) {
          _exportReportThrottled(App, 'buildOrderPdfInteractive.validateTemplate.getField', e, {
            throttleMs: 1500,
          });
          missingFields.push(fieldName);
        }
      }
      if (missingFields.length) problems.push(`חסרים שדות בטופס: ${missingFields.join(', ')}`);

      try {
        const drObj = acroMethods?.get ? acroMethods.get(PDFName.of('DR')) : null;
        const dr = drObj && lookup ? lookup.call(pdfContext, drObj, PDFDict) : null;
        const drMethods = getObjectMethods(dr);
        const fontObj = drMethods?.get ? drMethods.get(PDFName.of('Font')) : null;
        const fontDict = fontObj && lookup ? lookup.call(pdfContext, fontObj, PDFDict) : null;

        const referenced = new Set<string>();
        for (const fieldName of requiredTemplateFields) {
          let field: PdfTextFieldLike | null = null;
          try {
            field = form.getTextField(fieldName);
          } catch (e) {
            _exportReportThrottled(App, 'buildOrderPdfInteractive.validateTemplate.getFieldForFonts', e, {
              throttleMs: 1500,
            });
            field = null;
          }
          if (!field) continue;

          const acroField = getProp(field, 'acroField');
          const dict = acroField ? getProp(acroField, 'dict') : null;
          const dictGet = dict ? getFn(dict, 'get') : null;
          const defaultAppearance = dictGet ? dictGet.call(dict, PDFName.of('DA')) : null;
          for (const fontName of parseFontNamesFromDA(defaultAppearance)) referenced.add(fontName);

          const widgetsFn = acroField ? getFn(acroField, 'getWidgets') : null;
          const widgets = asArray(widgetsFn ? widgetsFn.call(acroField) : []);
          for (const widget of widgets) {
            const widgetDict = widget ? getProp(widget, 'dict') : null;
            const widgetGet = widgetDict ? getFn(widgetDict, 'get') : null;
            const widgetDa = widgetGet ? widgetGet.call(widgetDict, PDFName.of('DA')) : null;
            for (const fontName of parseFontNamesFromDA(widgetDa)) referenced.add(fontName);
          }
        }

        if (referenced.size) {
          if (!fontDict) {
            problems.push('חסר /AcroForm/DR/Font אבל השדות משתמשים ב-DA עם פונט');
          } else {
            const missingFonts: string[] = [];
            const fontMethods = getObjectMethods(fontDict);
            for (const fontName of Array.from(referenced)) {
              const hasFont = fontMethods?.get ? fontMethods.get(PDFName.of(fontName)) : null;
              if (!hasFont) missingFonts.push(fontName);
            }
            if (missingFonts.length) {
              problems.push(`פונטים חסרים בתבנית (DR/Font): ${missingFonts.join(', ')}`);
            }
          }
        }
      } catch (e) {
        _exportReportThrottled(App, 'buildOrderPdfInteractive.validateTemplate.fontDictCheck', e, {
          throttleMs: 1500,
        });
      }
    } catch (e) {
      _exportReportThrottled(App, 'buildOrderPdfInteractive.validateTemplate.outer', e, {
        throttleMs: 1500,
      });
      problems.push('בדיקת תבנית PDF נכשלה (ייתכן שהתבנית פגומה)');
    }

    return { ok: problems.length === 0, problems };
  };

  const applyNeedAppearances = (): void => {
    try {
      const setNeedAppearances = getFn(form, 'setNeedAppearances');
      if (setNeedAppearances) setNeedAppearances.call(form, true);
    } catch (e) {
      _exportReportThrottled(App, 'buildOrderPdfInteractive.setNeedAppearances', e, {
        throttleMs: 1500,
      });
    }

    try {
      const acroForm = getProp(form, 'acroForm');
      const acroDict = acroForm ? getProp(acroForm, 'dict') : null;
      const dictSet = acroDict ? getFn(acroDict, 'set') : null;
      if (dictSet && PDFBool && PDFBool.True) {
        dictSet.call(acroDict, PDFName.of('NeedAppearances'), PDFBool.True);
      }
    } catch (e) {
      _exportReportThrottled(App, 'buildOrderPdfInteractive.setNeedAppearancesFallback', e, {
        throttleMs: 1500,
      });
    }
  };

  return {
    validateTemplate,
    applyNeedAppearances,
  };
}
