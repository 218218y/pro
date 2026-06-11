import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 64 order pdf sketch panel view ownership split is anchored', () => {
  const facade = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel.tsx');
  const types = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_types.ts');
  const view = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_view.tsx');
  const header = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_header.tsx');
  const cards = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_cards.tsx');
  const editorSurface = read('esm/native/ui/react/pdf/order_pdf_overlay_editor_surface.tsx');

  assert.ok(lineCount(facade) <= 4, 'sketch panel public module must stay a tiny facade');
  assert.match(facade, /order_pdf_overlay_sketch_panel_view\.js/);
  assert.match(facade, /order_pdf_overlay_sketch_panel_types\.js/);
  assert.doesNotMatch(
    facade,
    /useOrderPdfSketchPanelViewHooks|OrderPdfSketchToolbar|OrderPdfSketchCard|wp-pdf-sketch-panel-head|wp-pdf-sketch-grid/,
    'sketch panel facade must not own hook orchestration, toolbars, cards, or JSX internals'
  );

  assert.match(types, /export type OrderPdfOverlaySketchPanelProps/);
  assert.match(types, /OrderPdfDraft/);
  assert.match(types, /OrderPdfSketchAnnotationPageKey/);
  assert.doesNotMatch(
    types,
    /ReactElement|function |<section|OrderPdfSketchToolbar|useOrderPdfSketchPanelViewHooks/
  );

  assert.match(view, /export function OrderPdfOverlaySketchPanel/);
  assert.match(view, /useOrderPdfSketchPanelViewHooks/);
  assert.match(view, /OrderPdfSketchPanelHeader/);
  assert.match(view, /OrderPdfSketchPanelCards/);
  assert.match(view, /OrderPdfSketchToolbar/);
  assert.match(view, /OrderPdfSketchShapeToolbar/);
  assert.doesNotMatch(view, /OrderPdfSketchCard\s|wp-pdf-sketch-panel-titlebox|טוען את דפי הסקיצה/);

  assert.match(header, /export function OrderPdfSketchPanelHeader/);
  assert.match(header, /wp-pdf-sketch-panel-titlebox/);
  assert.match(header, /wp-pdf-sketch-status/);
  assert.doesNotMatch(header, /useOrderPdfSketchPanelViewHooks|OrderPdfSketchToolbar|OrderPdfSketchCard/);

  assert.match(cards, /export function OrderPdfSketchPanelCards/);
  assert.match(cards, /OrderPdfSketchCard/);
  assert.match(cards, /wp-pdf-sketch-grid/);
  assert.doesNotMatch(
    cards,
    /OrderPdfSketchToolbar|OrderPdfSketchPanelHeader|useOrderPdfSketchPanelViewHooks/
  );

  assert.match(editorSurface, /from '\.\/order_pdf_overlay_sketch_panel\.js';/);
  assert.doesNotMatch(
    editorSurface,
    /order_pdf_overlay_sketch_panel_(view|types|header|cards)\.js/,
    'editor surface must keep using the public sketch-panel facade instead of private panel owners'
  );

  assert.doesNotMatch(facade + types + view + header + cards, /export default\s+/);
});
