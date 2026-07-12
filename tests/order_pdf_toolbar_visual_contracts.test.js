import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

function readSource(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('order PDF toolbar uses floating icon-only action buttons with a clear image attachment label', () => {
  const toolbar = readSource('esm/native/ui/react/pdf/order_pdf_overlay_toolbar.tsx');
  const css = readSource('css/react_styles.css');

  for (const testId of [
    'order-pdf-refresh-button',
    'order-pdf-load-button',
    'order-pdf-download-button',
    'order-pdf-print-button',
    'order-pdf-gmail-button',
  ]) {
    const buttonPattern = new RegExp(
      `className="[^"]*wp-pdf-editor-toolbar-action-btn[^"]*"[\\s\\S]*?data-testid="${testId}"`
    );
    assert.match(toolbar, buttonPattern, `${testId} must use the floating icon-only toolbar action class`);
  }

  assert.doesNotMatch(toolbar, /<span>עדכן<\/span>/);
  assert.doesNotMatch(toolbar, /<span>טען PDF<\/span>/);
  assert.doesNotMatch(toolbar, /<span>הורד PDF<\/span>/);
  assert.doesNotMatch(toolbar, /<span>הדפס PDF<\/span>/);
  assert.doesNotMatch(toolbar, /<span>מייל<\/span>/);
  assert.match(toolbar, /className="wp-pdf-editor-imgopts-label">צרף תמונות:<\/span>/);

  assert.doesNotMatch(toolbar, /<i className="fas fa-images" \/>/);
  assert.doesNotMatch(toolbar, /<i className="fas fa-door-open" \/>/);

  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-editor-toolbar \{[\s\S]*?background:\s*transparent;[\s\S]*?border:\s*0;[\s\S]*?box-shadow:\s*none;/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-editor-toolbar \.wp-pdf-editor-btn \{[\s\S]*?width:\s*46px;[\s\S]*?height:\s*46px;[\s\S]*?border-radius:\s*50%;[\s\S]*?box-shadow:\s*var\(--wp-r-shadow-floating\);/
  );
  assert.match(css, /body\.wp-ui-react \.wp-pdf-editor-imgopts-label \{/);
});

test('order PDF toolbar centers the main actions against the whole viewport and gives zoom text a white readable badge', () => {
  const css = readSource('css/react_styles.css');

  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-editor-toolbar \{[\s\S]*?display:\s*block;[\s\S]*?min-height:\s*62px;/
  );
  assert.doesNotMatch(
    css,
    /body\.wp-ui-react \.wp-pdf-editor-toolbar \{[\s\S]*?grid-template-columns:\s*max-content minmax\(0, 1fr\) max-content;/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-editor-toolbar-left \{[\s\S]*?position:\s*absolute;[\s\S]*?left:\s*10px;[\s\S]*?transform:\s*translateY\(-50%\);/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-editor-toolbar-right \{[\s\S]*?position:\s*absolute;[\s\S]*?right:\s*10px;[\s\S]*?transform:\s*translateY\(-50%\);/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-editor-toolbar-center \{[\s\S]*?width:\s*max-content;[\s\S]*?max-width:\s*calc\(100vw - 32px\);[\s\S]*?margin-inline:\s*auto;/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-editor-zoom-val \{[\s\S]*?background:\s*rgba\(255, 255, 255, 0\.96\);[\s\S]*?box-shadow:\s*var\(--wp-r-shadow-control\);/
  );
});

test('order PDF drawing actions are floating icon-only buttons at the bottom left, with no bottom CTAs', () => {
  const controls = readSource('esm/native/ui/react/pdf/order_pdf_overlay_editor_mode_controls.tsx');
  const css = readSource('css/react_styles.css');

  assert.match(controls, /className="wp-pdf-floating-draw-dock"/);
  assert.match(controls, /data-testid="order-pdf-page-annotation-toggle"/);
  assert.match(controls, /data-testid="order-pdf-sketch-preview-toggle"/);
  assert.match(controls, /className="fas fa-file-pdf wp-pdf-floating-draw-icon-base"/);
  assert.match(controls, /className="fas fa-images wp-pdf-floating-draw-icon-base"/);
  assert.doesNotMatch(controls, /wp-pdf-sketch-cta-wrap/);
  assert.doesNotMatch(controls, /wp-pdf-sketch-cta/);
  assert.doesNotMatch(controls, />צייר על PDF</);
  assert.doesNotMatch(controls, />הצג סקיצות לציור</);

  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-floating-draw-dock \{[\s\S]*?position:\s*fixed;[\s\S]*?top:\s*auto;[\s\S]*?left:\s*20px;[\s\S]*?bottom:\s*22px;[\s\S]*?display:\s*flex;[\s\S]*?z-index:\s*var\(--wp-z-pdf-floating-draw-dock\);/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-floating-draw-btn \{[\s\S]*?width:\s*46px;[\s\S]*?height:\s*46px;[\s\S]*?border-radius:\s*50%;/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-floating-draw-btn\.is-on \{[\s\S]*?background:\s*linear-gradient\(135deg, #fee2e2, #fecaca\);[\s\S]*?color:\s*#b91c1c;/
  );
  assert.doesNotMatch(css, /wp-pdf-page-annotation-cta/);
  assert.doesNotMatch(css, /wp-pdf-sketch-cta/);
});

test('order PDF page annotation mode shows an in-overlay edit status and consumes the first empty-stage click', () => {
  const controls = readSource('esm/native/ui/react/pdf/order_pdf_overlay_editor_mode_controls.tsx');
  const modes = readSource('esm/native/ui/react/pdf/order_pdf_overlay_editor_modes.ts');
  const stage = readSource('esm/native/ui/react/pdf/order_pdf_overlay_editor_stage.tsx');
  const css = readSource('css/react_styles.css');

  assert.match(controls, /className="wp-pdf-editor-mode-toast"/);
  assert.match(controls, /מצב עריכה: ציור והערות על עמוד ה-PDF/);
  assert.match(modes, /createInitialStageGesture/);
  assert.match(modes, /finishStagePointerUp/);
  assert.match(modes, /event\.target === event\.currentTarget/);
  assert.match(modes, /dispatchInteractionMode\(\{ type: 'close-pdf-page-annotation' \}\)/);
  assert.match(stage, /onPointerUpCapture=\{onStagePointerUpCapture\}/);

  assert.match(controls, /לחץ על הרקע הריק כדי לצאת מהציור/);
  assert.doesNotMatch(controls, /לחץ כאן או/);
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-editor-mode-toast \{[\s\S]*?position:\s*fixed;[\s\S]*?top:\s*82px;[\s\S]*?left:\s*50%;[\s\S]*?margin:\s*0;[\s\S]*?transform:\s*translateX\(-50%\);/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-editor-mode-toast:hover,[\s\S]*?transform:\s*translate\(-50%, -1px\);/
  );
  assert.match(css, /body\.wp-ui-react \.wp-pdf-editor-mode-toast \.status-hint \{[\s\S]*?color:\s*#b91c1c;/);
});

test('order PDF sketch preview shows a top ready status after sketch images are available', () => {
  const overlay = readSource('esm/native/ui/react/pdf/OrderPdfInPlaceEditorOverlay.tsx');
  const controls = readSource('esm/native/ui/react/pdf/order_pdf_overlay_editor_mode_controls.tsx');
  const contracts = readSource('esm/native/ui/react/pdf/order_pdf_overlay_editor_surface_contracts.ts');
  const previewHook = readSource(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_controller_hook.ts'
  );
  const previewTypes = readSource(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_controller_types.ts'
  );
  const css = readSource('css/react_styles.css');

  assert.match(previewTypes, /sketchPreviewReady:\s*boolean;/);
  assert.match(previewHook, /const sketchPreviewReady =/);
  assert.match(previewHook, /sketchPreviewLoadedSignatureRef\.current === sketchPreviewSignature/);
  assert.match(overlay, /ready:\s*sketchPreview\.sketchPreviewReady/);
  assert.match(contracts, /ready:\s*boolean;/);
  assert.match(controls, /data-testid="order-pdf-sketch-preview-ready-toast"/);
  assert.match(controls, /תמונות סקיצה נוצרו/);
  assert.match(controls, /אפשר לגלול ולערוך/);
  assert.match(controls, /role="status"/);
  assert.match(controls, /aria-live="polite"/);
  assert.match(css, /body\.wp-ui-react \.wp-pdf-editor-mode-toast--sketch-ready \{/);
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-editor-mode-toast--sketch-ready \.status-dot \{[\s\S]*?background:\s*#22c55e;/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-editor-mode-toast--sketch-ready \.status-hint \{[\s\S]*?color:\s*#15803d;/
  );
});

test('order PDF sketch toolbar keeps refresh as the last drawing action under clear page', () => {
  const sketchToolbar = readSource('esm/native/ui/react/pdf/order_pdf_overlay_sketch_toolbar_view.tsx');
  const clearIndex = sketchToolbar.indexOf('data-tooltip="נקה עמוד"');
  const refreshIndex = sketchToolbar.indexOf("data-tooltip={busy ? 'טוען סקיצות…' : 'רענן סקיצות'}");

  assert.ok(clearIndex >= 0, 'clear page action must exist');
  assert.ok(refreshIndex >= 0, 'refresh sketches action must exist');
  assert.ok(refreshIndex > clearIndex, 'refresh sketches must be rendered after clear page');
  assert.doesNotMatch(
    sketchToolbar.slice(refreshIndex),
    /data-tooltip="(?:בטל קו אחרון|החזר קו אחרון|נקה עמוד)"/,
    'refresh sketches must remain the final action in the toolbar stack'
  );
});

test('order PDF page and sketch drawing modes are mutually exclusive', () => {
  const overlay = readSource('esm/native/ui/react/pdf/OrderPdfInPlaceEditorOverlay.tsx');
  const modes = readSource('esm/native/ui/react/pdf/order_pdf_overlay_editor_modes.ts');
  const controls = readSource('esm/native/ui/react/pdf/order_pdf_overlay_editor_mode_controls.tsx');
  const contracts = readSource('esm/native/ui/react/pdf/order_pdf_overlay_editor_surface_contracts.ts');
  const previewHook = readSource(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_controller_hook.ts'
  );
  const previewTypes = readSource(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_controller_types.ts'
  );

  assert.match(previewTypes, /closeSketchPreview:\s*\(\) => void;/);
  assert.match(previewHook, /const closeSketchPreview = useCallback/);
  assert.match(
    previewHook,
    /restoreSketchPreviewSessionState\(\);[\s\S]*?sketchPreviewSessionSnapshotRef\.current = null;[\s\S]*?return false;/
  );
  assert.match(overlay, /onClose:\s*sketchPreview\.closeSketchPreview/);

  assert.match(contracts, /onClose:\s*\(\) => void;/);
  const modeState = readSource('esm/native/ui/react/pdf/order_pdf_overlay_editor_mode_state.ts');
  assert.match(modes, /useReducer\(/);
  assert.match(modes, /orderPdfOverlayEditorModeReducer/);
  assert.match(modes, /reconcile-sketch-visibility/);
  assert.match(modes, /if \(sketchOpen\) onCloseSketchPreview\(\);/);
  assert.match(modes, /prepare-sketch-preview-toggle/);
  assert.match(modeState, /kind: 'pdf-page-annotation'/);
  assert.match(modeState, /kind: 'sketch-preview'; pendingPdfPageAnnotation: boolean/);
  assert.match(modeState, /state\.pendingPdfPageAnnotation \? PDF_PAGE_ANNOTATION_MODE : IDLE_MODE/);
  assert.doesNotMatch(modes, /useState\(/);
  assert.match(controls, /onClick=\{onTogglePdfPageAnnotationMode\}/);
  assert.match(controls, /onClick=\{onToggleSketchPreview\}/);
});

test('order PDF tooltips use the shared fixed viewport tooltip system', () => {
  const toolbar = readSource('esm/native/ui/react/pdf/order_pdf_overlay_toolbar.tsx');
  const controls = readSource('esm/native/ui/react/pdf/order_pdf_overlay_editor_mode_controls.tsx');
  const sketchToolbar = readSource('esm/native/ui/react/pdf/order_pdf_overlay_sketch_toolbar_view.tsx');
  const shapeToolbar = readSource('esm/native/ui/react/pdf/order_pdf_overlay_sketch_shape_toolbar.tsx');
  const css = readSource('css/react_styles.css');
  const tooltipPlacement = readSource('esm/native/ui/react/components/TooltipPlacement.ts');

  assert.match(toolbar, /wp-r-styled-tooltip wp-pdf-ui-hint/);
  assert.match(controls, /data-tooltip=\{pdfPageAnnotationTooltip\}/);
  assert.match(controls, /data-tooltip=\{sketchPreviewTooltip\}/);
  assert.match(controls, /wp-r-styled-tooltip wp-pdf-ui-hint wp-pdf-ui-hint--above/);
  assert.match(sketchToolbar, /wp-r-styled-tooltip wp-pdf-ui-hint wp-pdf-ui-hint--side-left/);
  assert.match(shapeToolbar, /wp-r-styled-tooltip wp-pdf-ui-hint wp-pdf-ui-hint--side-right/);

  assert.match(
    tooltipPlacement,
    /if \(target\.classList\.contains\('wp-pdf-ui-hint--above'\)\) return 'above';/
  );
  assert.match(
    tooltipPlacement,
    /if \(target\.classList\.contains\('wp-pdf-ui-hint--side-left'\)\) return 'side-left';/
  );
  assert.match(
    tooltipPlacement,
    /if \(target\.classList\.contains\('wp-pdf-ui-hint--side-right'\)\) return 'side-right';/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-r-floating-tooltip,[\s\S]*?body\.wp-ui-react \.wp-r-floating-tooltip-arrow \{[\s\S]*?position:\s*fixed;[\s\S]*?body\.wp-ui-react \.wp-r-floating-tooltip \{[\s\S]*?max-width:\s*min\(320px, calc\(100vw - 16px\)\);/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-r-floating-tooltip-arrow\.is-side-left \{[\s\S]*?border-left-color:\s*#1e293b;/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-r-floating-tooltip-arrow\.is-side-right \{[\s\S]*?border-right-color:\s*#1e293b;/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-editor-toolbar:hover,[\s\S]*?z-index:\s*var\(--wp-z-pdf-editor-tooltip-host\);/
  );
});

test('PDF page annotation note tooltips can escape the PDF page clipping layer', () => {
  const css = readSource('css/react_styles.css');

  assert.match(css, /body\.wp-ui-react \.wp-pdf-page-annotation-layer \{[\s\S]*?overflow:\s*visible;/);
  assert.doesNotMatch(css, /body\.wp-ui-react \.wp-pdf-page-annotation-layer \{[\s\S]*?overflow:\s*hidden;/);
});

test('regular canvas note toolbar uses the styled tooltip hints from the PDF note toolbar', () => {
  const boldToolbar = readSource('esm/native/ui/react/notes/notes_overlay_note_card_toolbar_bold.tsx');
  const colorToolbar = readSource('esm/native/ui/react/notes/notes_overlay_note_card_toolbar_color.tsx');
  const sizeToolbar = readSource('esm/native/ui/react/notes/notes_overlay_note_card_toolbar_size.tsx');
  const deleteToolbar = readSource('esm/native/ui/react/notes/notes_overlay_note_card_toolbar_delete.tsx');

  for (const source of [boldToolbar, colorToolbar, sizeToolbar, deleteToolbar]) {
    assert.match(source, /wp-r-styled-tooltip wp-pdf-ui-hint wp-pdf-ui-hint--side-right/);
    assert.match(source, /data-tooltip=/);
  }

  assert.match(boldToolbar, /data-tooltip="מודגש"/);
  assert.match(colorToolbar, /data-tooltip="צבע טקסט"/);
  assert.match(sizeToolbar, /data-tooltip="גודל טקסט"/);
  assert.match(deleteToolbar, /data-tooltip="מחק הערה"/);
});

test('order PDF color swatches do not show hexadecimal tooltips', () => {
  const sketchPalettes = readSource('esm/native/ui/react/pdf/order_pdf_overlay_sketch_toolbar_palettes.tsx');
  const noteToolbar = readSource('esm/native/ui/react/pdf/order_pdf_overlay_sketch_note_toolbar.tsx');

  assert.doesNotMatch(sketchPalettes, /data-tooltip=\{swatch\}/);
  assert.doesNotMatch(sketchPalettes, /wp-pdf-sketch-color-swatch wp-r-styled-tooltip wp-pdf-ui-hint/);
  assert.match(sketchPalettes, /aria-label=\{`בחר צבע \${swatch}`\}/);
  assert.doesNotMatch(noteToolbar, /data-tooltip=\{color\}/);
});

test('order PDF sketch drawing toolbar and floating palettes do not create internal scrollbars', () => {
  const css = readSource('css/react_styles.css');

  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-sketch-toolbar-stack \{[\s\S]*?max-height:\s*none;[\s\S]*?overflow:\s*visible;/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-sketch-toolbar--floating\.is-fixed \{[\s\S]*?position:\s*fixed;/
  );
  assert.match(css, /body\.wp-ui-react \.wp-pdf-sketch-floating-palette \{[\s\S]*?overflow:\s*visible;/);
  assert.doesNotMatch(css, /body\.wp-ui-react \.wp-pdf-sketch-toolbar-stack \{[\s\S]*?overflow-y:\s*auto;/);
  assert.doesNotMatch(css, /body\.wp-ui-react \.wp-pdf-sketch-floating-palette \{[\s\S]*?overflow:\s*auto;/);

  const sketchToolbar = readSource('esm/native/ui/react/pdf/order_pdf_overlay_sketch_toolbar_view.tsx');
  const shapeToolbar = readSource('esm/native/ui/react/pdf/order_pdf_overlay_sketch_shape_toolbar.tsx');
  const floatingPalette = readSource(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_toolbar_floating_palette.tsx'
  );
  assert.doesNotMatch(sketchToolbar, /maxHeight:\s*`\$\{toolbarPlacement\.maxHeight\}px`/);
  assert.doesNotMatch(shapeToolbar, /maxHeight:\s*`\$\{toolbarPlacement\.maxHeight\}px`/);
  assert.doesNotMatch(floatingPalette, /maxHeight:\s*`\$\{placement\.maxHeight\}px`/);
});

test('order PDF image attachment toggles keep text-only labels and show a pressed check badge', () => {
  const toolbar = readSource('esm/native/ui/react/pdf/order_pdf_overlay_toolbar.tsx');
  const css = readSource('css/react_styles.css');

  assert.match(
    toolbar,
    /data-testid="order-pdf-toggle-render-sketch"[\s\S]*?<span className="wp-pdf-editor-toggle-check" aria-hidden="true">[\s\S]*?✓[\s\S]*?<span>[\s\S]*?הדמיה\/סקיצה/
  );
  assert.match(
    toolbar,
    /data-testid="order-pdf-toggle-open-closed"[\s\S]*?<span className="wp-pdf-editor-toggle-check" aria-hidden="true">[\s\S]*?✓[\s\S]*?<span>[\s\S]*?פתוח\/סגור/
  );
  assert.doesNotMatch(toolbar, /<i className="fas fa-images" \/>/);
  assert.doesNotMatch(toolbar, /<i className="fas fa-door-open" \/>/);

  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-editor-toggle \{[\s\S]*?padding:\s*10px 14px;[\s\S]*?box-shadow:\s*var\(--wp-r-shadow-pdf-toggle\);/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-editor-toggle\.is-on \{[\s\S]*?background:\s*linear-gradient\(180deg, rgba\(219, 234, 254, 1\), rgba\(191, 219, 254, 0\.96\)\);[\s\S]*?border-color:\s*rgba\(37, 99, 235, 0\.56\);[\s\S]*?box-shadow:\s*var\(--wp-r-shadow-pdf-toggle-on\);[\s\S]*?transform:\s*translateY\(1px\);/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-editor-toggle \.wp-pdf-editor-toggle-check \{[\s\S]*?position:\s*absolute;[\s\S]*?opacity:\s*0;[\s\S]*?transform:\s*scale\(0\.76\) translateY\(3px\);/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-editor-toggle\.is-on \.wp-pdf-editor-toggle-check \{[\s\S]*?opacity:\s*1;[\s\S]*?transform:\s*scale\(1\) translateY\(0\);/
  );
  assert.doesNotMatch(css, /body\.wp-ui-react \.wp-pdf-editor-toggle::after\s*\{/);
  assert.doesNotMatch(css, /body\.wp-ui-react \.wp-pdf-editor-toggle\.is-on::after\s*\{/);
});
