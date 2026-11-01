// Static appearances are required by PDF preview handlers that do not regenerate
// AcroForm widgets. /V keeps the original editable Unicode value; painting is
// independent of the user's PDF viewer and of Acrobat JavaScript.
import type {
  OrderPdfAppearanceKitLike,
  OrderPdfAppearanceOperatorLike,
} from './export_order_pdf_builder_contracts.js';
import { visualOrderForPdfFieldAppearance } from './export_order_pdf_field_bidi.js';

export function createOrderPdfWidgetAppearance(
  field: { getText: () => string | undefined },
  widget: unknown,
  font: { encodeText: (line: string) => unknown },
  kit: OrderPdfAppearanceKitLike
): OrderPdfAppearanceOperatorLike[] {
  // Let pdf-lib wrap the original logical text *before* reordering each
  // painted line. Reordering the entire paragraph before wrapping would put
  // the last Hebrew words at the top in longer multiline fields.
  // Reuse pdf-lib's clipping, alignment, font sizing and multiline layout.
  // Recover the emitted lines before replacing each Tj with one-glyph
  // shows: fontkit can shape/reorder an entire Hebrew run a second time.
  const textByEncodedGlyphs = new Map<string, string>();
  const measuringFont = Object.create(font) as typeof font;
  measuringFont.encodeText = (line: string) => {
    const encoded = font.encodeText(line);
    textByEncodedGlyphs.set(String(encoded), line);
    return encoded;
  };
  const operators = kit.defaultTextFieldAppearanceProvider(field, widget, measuringFont);
  const drawing: OrderPdfAppearanceOperatorLike[] = [];
  for (const operator of operators) {
    if (operator.name !== 'Tj') {
      drawing.push(operator);
      continue;
    }
    // pdf-lib may encode several *candidate* substrings while deciding where
    // to wrap a long paragraph. Match the Tj it ultimately emits to the
    // corresponding encoded line, not to the order of intermediate probes.
    const key = String(operator.args?.[0]);
    const line = textByEncodedGlyphs.get(key);
    if (line === undefined) throw new Error('Order PDF appearance line encoding not found');
    for (const character of visualOrderForPdfFieldAppearance(line)) {
      drawing.push(kit.showText(font.encodeText(character)));
    }
  }
  return drawing;
}
