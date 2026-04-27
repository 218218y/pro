import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function readSource(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

const pdfLibHelper = readSource('esm/native/ui/react/pdf/order_pdf_overlay_pdf_lib.ts');
const exportShared = readSource('esm/native/ui/react/pdf/order_pdf_overlay_export_ops_shared.ts');
const imagePdfOps = readSource('esm/native/ui/react/pdf/order_pdf_overlay_export_ops_image_pdf.ts');
const imagePdfSupport = readSource(
  'esm/native/ui/react/pdf/order_pdf_overlay_export_ops_image_pdf_support.ts'
);
const pdfImportExtract = readSource('esm/native/ui/react/pdf/order_pdf_overlay_pdf_import_extract.ts');
const pdfImportInteractive = readSource(
  'esm/native/ui/react/pdf/order_pdf_overlay_pdf_import_interactive.ts'
);
const pdfImportPages = readSource('esm/native/ui/react/pdf/order_pdf_overlay_pdf_import_pages.ts');
const pdfImportShared = readSource('esm/native/ui/react/pdf/order_pdf_overlay_pdf_import_shared.ts');
const sketchPreview = readSource('esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview.ts');
const notesControllerTypes = readSource('esm/native/ui/react/notes/notes_overlay_controller_types.ts');
const notesControllerState = readSource('esm/native/ui/react/notes/notes_overlay_controller_state.ts');
const notesWorkflowShared = readSource('esm/native/ui/react/notes/notes_overlay_editor_workflow_shared.ts');
const notesWorkflowPersistenceRuntime = readSource(
  'esm/native/ui/react/notes/notes_overlay_editor_workflow_persistence_runtime.ts'
);

const pdfInteropFiles = [
  exportShared,
  imagePdfOps,
  imagePdfSupport,
  pdfImportExtract,
  pdfImportInteractive,
  pdfImportPages,
  pdfImportShared,
  sketchPreview,
];

const notesTimerFiles = [
  notesControllerTypes,
  notesControllerState,
  notesWorkflowShared,
  notesWorkflowPersistenceRuntime,
];

test('ui type hardening installs one canonical pdf-lib bridge', () => {
  assert.match(pdfLibHelper, /export async function loadPdfLibNamespace\(/);
  assert.match(pdfLibHelper, /export function readPdfDocumentCtor\(/);
  assert.match(pdfLibHelper, /export async function loadPdfDocumentCtor\(/);
  assert.match(pdfLibHelper, /export async function loadPdfNameCtor\(/);
  assert.match(pdfLibHelper, /export type PdfLibWritableDocumentLike/);
});

test('ui type hardening routes order-pdf seams through the local pdf-lib bridge', () => {
  for (const source of pdfInteropFiles) {
    assert.doesNotMatch(source, /import type \{[^\n]*PDF(Document|Image|Page|Name)/);
    assert.doesNotMatch(source, /const \{\s*PDF(Document|Name)/);
  }
  assert.match(imagePdfOps, /order_pdf_overlay_pdf_lib\.js/);
  assert.match(pdfImportExtract, /order_pdf_overlay_pdf_lib\.js/);
  assert.match(pdfImportInteractive, /order_pdf_overlay_pdf_lib\.js/);
  assert.match(pdfImportPages, /order_pdf_overlay_pdf_lib\.js/);
  assert.match(pdfImportShared, /order_pdf_overlay_pdf_lib\.js/);
  assert.match(sketchPreview, /order_pdf_overlay_pdf_lib\.js/);
});

test('ui type hardening normalizes notes typing timers to TimeoutHandleLike', () => {
  for (const source of notesTimerFiles) {
    assert.doesNotMatch(source, /ReturnType<typeof setTimeout>/);
    assert.match(source, /TimeoutHandleLike/);
  }
});
