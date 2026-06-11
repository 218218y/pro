import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicPath = path.join(
  root,
  'esm/native/ui/react/pdf/order_pdf_overlay_sketch_annotation_state_runtime.ts'
);
const corePath = path.join(
  root,
  'esm/native/ui/react/pdf/order_pdf_overlay_sketch_annotation_state_core_runtime.ts'
);
const draftPath = path.join(
  root,
  'esm/native/ui/react/pdf/order_pdf_overlay_sketch_annotation_state_draft_runtime.ts'
);
const shellPublicPath = path.join(root, 'esm/native/ui/react/pdf/order_pdf_overlay_shell_interactions.ts');
const shellRuntimePath = path.join(
  root,
  'esm/native/ui/react/pdf/order_pdf_overlay_shell_interactions_runtime.ts'
);

function lineCount(filePath) {
  return fs.readFileSync(filePath, 'utf8').trimEnd().split(/\n/).length;
}

test('[order-pdf] annotation state public seam is a thin re-export over split runtime modules', () => {
  const source = fs.readFileSync(publicPath, 'utf8');
  assert.match(source, /annotation_state_core_runtime/);
  assert.match(source, /annotation_state_draft_runtime/);
  assert.ok(lineCount(publicPath) <= 5);
  assert.ok(lineCount(corePath) <= 8);
  assert.ok(lineCount(draftPath) > 80);
});

test('[order-pdf] shell interactions public seam is thin and delegates to split runtime policy', () => {
  const source = fs.readFileSync(shellPublicPath, 'utf8');
  assert.match(source, /shell_interactions_runtime/);
  assert.match(source, /installOrderPdfOverlayKeyboardGuards/);
  assert.match(source, /installOrderPdfOverlayFocusTrap/);
  const runtimeLines = lineCount(shellRuntimePath);
  const publicLines = lineCount(shellPublicPath);
  assert.ok(runtimeLines > 120);
  assert.ok(publicLines <= 180);
  assert.ok(runtimeLines - publicLines >= 50);
});
