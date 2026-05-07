import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../css/react_styles.css', import.meta.url), 'utf8');

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readRule(selector) {
  const match = new RegExp(`${escapeRegExp(selector)}\\s*\\{([\\s\\S]*?)\\}`).exec(css);
  assert.ok(match, `missing CSS rule for ${selector}`);
  return match[1];
}

function assertDeclaration(selector, property, value) {
  assert.match(
    readRule(selector),
    new RegExp(`${escapeRegExp(property)}\\s*:\\s*${escapeRegExp(value)}\\s*;`)
  );
}

function assertNoImportant(selector) {
  assert.doesNotMatch(readRule(selector), /!important/);
}

function readRuleIndex(selector) {
  const match = new RegExp(`${escapeRegExp(selector)}\\s*\\{`).exec(css);
  assert.ok(match, `missing CSS rule for ${selector}`);
  return match.index;
}

function assertRuleOrder(earlier, later) {
  const earlierIndex = readRuleIndex(earlier);
  const laterIndex = readRuleIndex(later);
  assert.ok(earlierIndex < laterIndex, `${later} must stay after ${earlier}`);
}

test('notes overlay interaction states are expressed through cascade order without important overrides', () => {
  const passiveBox = 'body.wp-ui-react .annotation-box';
  const activeBox = 'body.wp-ui-react .annotation-box.active-edit';
  const passiveEditor = 'body.wp-ui-react .annotation-box .editor';
  const activeEditor = 'body.wp-ui-react .annotation-box.active-edit .editor';
  const hitPad = 'body.wp-ui-react .annotation-box .note-hit-pad';
  const hitTarget = 'body.wp-ui-react .annotation-box .note-hit';
  const resizeHandle = 'body.wp-ui-react .resize-handle';
  const activeResizeHandle = 'body.wp-ui-react .annotation-box.active-edit .resize-handle';
  const toolbar = 'body.wp-ui-react .annotation-box .floating-toolbar';
  const activeToolbar = 'body.wp-ui-react .annotation-box.active-edit .floating-toolbar';

  assertDeclaration(passiveBox, 'pointer-events', 'none');
  assertDeclaration(passiveBox, 'touch-action', 'none');
  assertDeclaration(activeBox, 'pointer-events', 'auto');
  assertRuleOrder(passiveBox, activeBox);

  assertDeclaration(passiveEditor, 'pointer-events', 'none');
  assertDeclaration(activeEditor, 'pointer-events', 'auto');
  assertRuleOrder(passiveEditor, activeEditor);

  assertDeclaration(hitPad, 'pointer-events', 'none');
  assertDeclaration(hitTarget, 'pointer-events', 'auto');
  assertRuleOrder(hitPad, hitTarget);

  assertDeclaration(resizeHandle, 'display', 'none');
  assertDeclaration(resizeHandle, 'touch-action', 'none');
  assertDeclaration(activeResizeHandle, 'display', 'flex');
  assertRuleOrder(resizeHandle, activeResizeHandle);

  assertDeclaration(toolbar, 'display', 'none');
  assertDeclaration(activeToolbar, 'display', 'flex');
  assertRuleOrder(toolbar, activeToolbar);

  [
    passiveBox,
    activeBox,
    passiveEditor,
    activeEditor,
    hitPad,
    hitTarget,
    resizeHandle,
    activeResizeHandle,
    toolbar,
    activeToolbar,
  ].forEach(assertNoImportant);
});

test('notes overlay visibility and PDF sketch text layers stay explicit without important overrides', () => {
  const overlay = 'body.wp-ui-react #notes-overlay';
  const drawingOverlay =
    "body.wp-ui-react.is-drawing #notes-overlay,\nbody.wp-ui-react #notes-overlay[style*='pointer-events: auto']";
  const notesHidden = 'body.wp-ui-react #viewer-container.notes-hidden .annotation-box';
  const doorsOpenHidden =
    "body.wp-ui-react[data-door-status='open'] .annotation-box[data-doors-open='false']";
  const doorsClosedHidden =
    "body.wp-ui-react[data-door-status='closed'] .annotation-box[data-doors-open='true']";
  const floatingPalette = 'body.wp-ui-react .wp-pdf-sketch-floating-palette';
  const pdfTextBox = 'body.wp-ui-react .wp-pdf-sketch-card-text-layer.is-text-mode .annotation-box';
  const pdfTextEditor =
    'body.wp-ui-react .wp-pdf-sketch-card-text-layer.is-text-mode .annotation-box .editor';

  assertDeclaration(overlay, 'pointer-events', 'none');
  assertDeclaration(overlay, 'touch-action', 'none');
  assertDeclaration(drawingOverlay, 'pointer-events', 'auto');
  assertRuleOrder(overlay, drawingOverlay);

  assertDeclaration(notesHidden, 'display', 'none');
  assertDeclaration(doorsOpenHidden, 'display', 'none');
  assertDeclaration(doorsClosedHidden, 'display', 'none');

  assertDeclaration(floatingPalette, 'position', 'fixed');
  assertDeclaration(floatingPalette, 'right', 'auto');
  assertDeclaration(floatingPalette, 'transform', 'none');

  assertDeclaration(pdfTextBox, 'pointer-events', 'auto');
  assertDeclaration(pdfTextEditor, 'pointer-events', 'auto');
  assertRuleOrder('body.wp-ui-react .annotation-box', pdfTextBox);
  assertRuleOrder('body.wp-ui-react .annotation-box .editor', pdfTextEditor);

  [
    overlay,
    drawingOverlay,
    notesHidden,
    doorsOpenHidden,
    doorsClosedHidden,
    floatingPalette,
    pdfTextBox,
    pdfTextEditor,
  ].forEach(assertNoImportant);
});
