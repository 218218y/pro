import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 55 order pdf sketch toolbar ownership split is anchored', () => {
  const facade = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_toolbar.tsx');
  const view = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_toolbar_view.tsx');
  const palettes = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_toolbar_palettes.tsx');
  const floatingPalette = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_toolbar_floating_palette.tsx'
  );
  const freehand = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_toolbar_freehand.ts');
  const types = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_toolbar_types.ts');
  const panel = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_view.tsx');
  const measurementContract = read('tests/order_pdf_overlay_sketch_panel_measurement_contracts.test.js');

  assert.ok(
    lineCount(facade) <= 8,
    'order_pdf_overlay_sketch_toolbar.tsx must stay a tiny public facade instead of regrowing toolbar JSX internals'
  );
  assert.match(facade, /order_pdf_overlay_sketch_toolbar_view\.js/);
  assert.match(facade, /order_pdf_overlay_sketch_toolbar_types\.js/);
  assert.doesNotMatch(
    facade,
    /createPortal|FREEHAND_TOOLS|ORDER_PDF_SKETCH_COLOR_SWATCHES|useOrderPdfSketchFloatingPalettePlacement|<aside/,
    'toolbar facade must not own palette placement, swatches, or toolbar JSX internals'
  );

  assert.match(view, /export const OrderPdfSketchToolbar = memo/);
  assert.match(view, /resolveFreehandToolDefinition/);
  assert.match(view, /OrderPdfSketchDrawToolPalette/);
  assert.match(view, /OrderPdfSketchWidthPalette/);
  assert.match(view, /OrderPdfSketchColorPalette/);
  assert.doesNotMatch(
    view,
    /createPortal|ORDER_PDF_SKETCH_COLOR_SWATCHES|ORDER_PDF_SKETCH_WIDTH_OPTIONS|FREEHAND_TOOLS/
  );

  assert.match(palettes, /export function OrderPdfSketchDrawToolPalette/);
  assert.match(palettes, /export function OrderPdfSketchWidthPalette/);
  assert.match(palettes, /export function OrderPdfSketchColorPalette/);
  assert.match(palettes, /ORDER_PDF_SKETCH_WIDTH_OPTIONS/);
  assert.match(palettes, /ORDER_PDF_SKETCH_COLOR_SWATCHES/);
  assert.match(palettes, /FREEHAND_TOOLS/);
  assert.doesNotMatch(palettes, /useOrderPdfSketchFloatingPalettePlacement|createPortal/);

  assert.match(floatingPalette, /export function OrderPdfSketchFloatingPalette/);
  assert.match(floatingPalette, /useOrderPdfSketchFloatingPalettePlacement/);
  assert.match(floatingPalette, /createPortal/);
  assert.match(floatingPalette, /getNodeDocument/);
  assert.doesNotMatch(
    floatingPalette,
    /ORDER_PDF_SKETCH_COLOR_SWATCHES|ORDER_PDF_SKETCH_WIDTH_OPTIONS|FREEHAND_TOOLS/
  );

  assert.match(freehand, /export const FREEHAND_TOOLS/);
  assert.match(freehand, /export function resolveFreehandToolDefinition/);
  assert.doesNotMatch(freehand, /<button|createPortal|ORDER_PDF_SKETCH_COLOR_SWATCHES/);

  for (const exportedType of [
    'OrderPdfSketchToolbarProps',
    'OrderPdfSketchFloatingPaletteProps',
    'FreehandToolDefinition',
  ]) {
    assert.match(types, new RegExp(`export type ${exportedType}`), `types owner must expose ${exportedType}`);
  }
  assert.doesNotMatch(types, /function |<button|createPortal|FREEHAND_TOOLS/);

  assert.match(panel, /from '\.\/order_pdf_overlay_sketch_toolbar\.js'/);
  assert.doesNotMatch(
    panel,
    /order_pdf_overlay_sketch_toolbar_(view|palettes|floating_palette|freehand|types)\.js/,
    'sketch panel view must keep using the public toolbar facade instead of private toolbar owners'
  );
  assert.match(measurementContract, /order_pdf_overlay_sketch_toolbar_floating_palette\.tsx/);
  assert.doesNotMatch(facade + view + palettes + floatingPalette + freehand + types, /export default\s+/);
});
