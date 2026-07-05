import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('[gmail-oauth-cloudflare] preloads Google Identity Services before the Gmail button is clicked', () => {
  const runtimeApis = read('esm/native/ui/react/pdf/order_pdf_overlay_component_runtime_apis.ts');
  assert.match(
    runtimeApis,
    /useEffect\(\(\) => \{[\s\S]*ensureGoogleIdentityServicesLoaded\(docMaybe, winMaybe\)/
  );

  const gmailDraft = read('esm/native/ui/react/pdf/gmail_draft.ts');
  assert.match(gmailDraft, /export function isGoogleIdentityServicesReady/);
  assert.match(
    gmailDraft,
    /if \(!isGoogleIdentityServicesReady\(win\)\) \{\s*await ensureGoogleIdentityServicesLoaded\(doc, win\);\s*\}/
  );
});

test('[gmail-oauth-cloudflare] Gmail export keeps popup activation before PDF work starts', () => {
  const gmailOps = read('esm/native/ui/react/pdf/order_pdf_overlay_gmail_ops.ts');
  const exportStart = gmailOps.indexOf('async function exportInteractiveToGmail');
  assert.notEqual(exportStart, -1);

  const exportBlockEnd = gmailOps.indexOf('async function exportInteractiveDownloadAndGmail', exportStart);
  const exportBlock = gmailOps.slice(exportStart, exportBlockEnd);

  const reservePos = exportBlock.indexOf('reserveGmailDraftWindow(winMaybe)');
  const tokenPos = exportBlock.indexOf('getGmailComposeAccessToken');
  const pdfBuildPos = exportBlock.indexOf('buildImagePdfAttachmentFromDraft(draft)');

  assert.ok(reservePos !== -1, 'Gmail export must reserve a popup synchronously');
  assert.ok(tokenPos > reservePos, 'OAuth token should be requested after reserving the popup');
  assert.ok(pdfBuildPos > tokenPos, 'OAuth popup request must happen before slow PDF generation');
  assert.match(exportBlock, /accessToken,/);
  assert.match(exportBlock, /reservedWindow,/);
  assert.match(exportBlock, /closeReservedGmailDraftWindow\(reservedWindow\)/);
});

test('[gmail-oauth-cloudflare] Cloudflare headers allow OAuth popups on the custom domain', () => {
  const headers = read('public/_headers');
  assert.match(headers, /Referrer-Policy:\s*strict-origin-when-cross-origin/i);
  assert.match(headers, /Cross-Origin-Opener-Policy:\s*same-origin-allow-popups/i);
});
