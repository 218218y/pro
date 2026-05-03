import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  REFACTOR_COMPLETED_STAGE_LABELS,
  REFACTOR_INTEGRATION_ANCHORS,
} from '../tools/wp_refactor_stage_catalog.mjs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

const GUARD_FILE = 'tests/refactor_stage79_order_pdf_export_commands_ownership_guard.test.js';
const PUBLIC_COMMANDS = 'esm/native/ui/react/pdf/order_pdf_overlay_export_commands.ts';

function assertNoExportCommandOwnerBypass() {
  const files = fs
    .readdirSync('esm/native/ui/react/pdf')
    .filter(name => /\.(ts|tsx)$/.test(name))
    .map(name => `esm/native/ui/react/pdf/${name}`);

  const allowed = new Set([
    PUBLIC_COMMANDS,
    'esm/native/ui/react/pdf/order_pdf_overlay_export_commands_errors.ts',
    'esm/native/ui/react/pdf/order_pdf_overlay_export_commands_load_pdf.ts',
    'esm/native/ui/react/pdf/order_pdf_overlay_export_commands_downloads.ts',
    'esm/native/ui/react/pdf/order_pdf_overlay_export_commands_gmail.ts',
    'esm/native/ui/react/pdf/order_pdf_overlay_export_commands_pdfjs.ts',
    'esm/native/ui/react/pdf/order_pdf_overlay_export_commands_types.ts',
  ]);

  for (const file of files) {
    if (allowed.has(file)) continue;
    const source = read(file);
    assert.doesNotMatch(
      source,
      /from '\.\/order_pdf_overlay_export_commands_(errors|load_pdf|downloads|gmail|pdfjs|types)\.js';/,
      `${file} must consume the public order_pdf_overlay_export_commands facade instead of private command owners`
    );
  }
}

test('stage 79 order pdf export command ownership split is anchored', () => {
  const progress = read('docs/REFACTOR_WORKMAP_PROGRESS.md');
  const workmap = read('refactor_workmap.md');
  const nextPlan = read('docs/REFACTOR_NEXT_STAGE_PLAN.md');
  const integrationAudit = read('tools/wp_refactor_integration_audit.mjs');
  const pkg = JSON.parse(read('package.json'));

  assert.ok(REFACTOR_COMPLETED_STAGE_LABELS.includes('Stage 79'));
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 79 order pdf export command ownership split is anchored')
    ),
    'stage 79 must be registered in the shared refactor stage catalog anchors'
  );
  assert.ok(pkg.scripts['test:refactor-stage-guards'].includes(GUARD_FILE));
  assert.ok(integrationAudit.includes(GUARD_FILE), 'integration audit must require the stage 79 guard');
  assert.match(progress, /Stage 79/);
  assert.match(workmap, /Stage 79/);
  assert.match(nextPlan, /Stage 79 — Order PDF export\/editor flow review — completed/);
  assert.match(nextPlan, /Stage 80 — Measurement and performance guard closeout/);

  const facade = read(PUBLIC_COMMANDS);
  const types = read('esm/native/ui/react/pdf/order_pdf_overlay_export_commands_types.ts');
  const errors = read('esm/native/ui/react/pdf/order_pdf_overlay_export_commands_errors.ts');
  const loadPdf = read('esm/native/ui/react/pdf/order_pdf_overlay_export_commands_load_pdf.ts');
  const downloads = read('esm/native/ui/react/pdf/order_pdf_overlay_export_commands_downloads.ts');
  const gmail = read('esm/native/ui/react/pdf/order_pdf_overlay_export_commands_gmail.ts');
  const pdfjs = read('esm/native/ui/react/pdf/order_pdf_overlay_export_commands_pdfjs.ts');

  for (const owner of [
    'order_pdf_overlay_export_commands_load_pdf.js',
    'order_pdf_overlay_export_commands_downloads.js',
    'order_pdf_overlay_export_commands_gmail.js',
    'order_pdf_overlay_export_commands_pdfjs.js',
  ]) {
    assert.match(facade, new RegExp(owner.replace(/[.]/g, '\\.')), `command facade must re-export ${owner}`);
  }
  assert.doesNotMatch(
    facade,
    /readPdfFileBytes|triggerBlobDownloadViaBrowser|gmailAction|normalizeUnknownError|ensureOrderPdfJs\(/,
    'command facade must not own import lifecycle, download execution, Gmail execution, error normalization, or pdf.js loading'
  );

  assert.match(types, /export type LoadPdfCommandArgs/);
  assert.match(types, /export type DownloadInteractivePdfArgs/);
  assert.match(types, /export type DownloadImagePdfArgs/);
  assert.match(types, /export type GmailCommandArgs/);
  assert.match(types, /export type EnsureOrderPdfJsCommandArgs/);
  assert.doesNotMatch(types, /normalizeUnknownError|hasAnyOrderPdfImportedRichDraftFieldValue/);

  assert.match(errors, /normalizeUnknownError/);
  assert.match(errors, /export function buildLoadPdfError/);
  assert.match(errors, /export function buildGmailError/);
  assert.doesNotMatch(errors, /readPdfFileBytes|triggerBlobDownloadViaBrowser|gmailAction/);

  assert.match(loadPdf, /export async function loadOrderPdfIntoEditorWithDeps/);
  assert.match(loadPdf, /readPdfFileBytes\(file\)/);
  assert.match(loadPdf, /cleanPdfForEditorBackground\(bytes\)/);
  assert.match(loadPdf, /hasAnyOrderPdfImportedRichDraftFieldValue\(extracted\)/);
  assert.doesNotMatch(loadPdf, /triggerBlobDownloadViaBrowser|gmailAction|ensureOrderPdfJs/);

  assert.match(downloads, /export async function exportOrderPdfInteractiveWithDeps/);
  assert.match(downloads, /export async function exportOrderPdfImageWithDeps/);
  assert.match(downloads, /triggerBlobDownloadViaBrowser/);
  assert.doesNotMatch(downloads, /readPdfFileBytes|gmailAction|ensureOrderPdfJs/);

  assert.match(gmail, /export async function exportOrderPdfViaGmailWithDeps/);
  assert.match(gmail, /gmailAction\(draft\)/);
  assert.doesNotMatch(gmail, /triggerBlobDownloadViaBrowser|readPdfFileBytes|ensureOrderPdfJs/);

  assert.match(pdfjs, /export async function ensureOrderPdfJsWithDeps/);
  assert.match(pdfjs, /ensureOrderPdfJs\({/);
  assert.doesNotMatch(
    pdfjs,
    /readPdfFileBytes|triggerBlobDownloadViaBrowser|gmailAction|normalizeUnknownError/
  );

  const callbacks = read('esm/native/ui/react/pdf/order_pdf_overlay_export_actions_callbacks.ts');
  assert.match(callbacks, /from '\.\/order_pdf_overlay_export_commands\.js';/);
  assert.doesNotMatch(
    callbacks,
    /order_pdf_overlay_export_commands_(load_pdf|downloads|gmail|pdfjs|errors|types)\.js/,
    'React export callbacks must not bypass the public command facade'
  );

  assertNoExportCommandOwnerBypass();
});
