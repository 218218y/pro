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

test('[gmail-oauth-cloudflare] Gmail export does not open a placeholder tab before PDF work', () => {
  const gmailOps = read('esm/native/ui/react/pdf/order_pdf_overlay_gmail_ops.ts');
  const exportStart = gmailOps.indexOf('async function exportInteractiveToGmail');
  assert.notEqual(exportStart, -1);

  const exportBlockEnd = gmailOps.indexOf('async function exportInteractiveDownloadAndGmail', exportStart);
  const exportBlock = gmailOps.slice(exportStart, exportBlockEnd);

  const tokenPos = exportBlock.indexOf('getGmailComposeAccessToken');
  const pdfBuildPos = exportBlock.indexOf('buildImagePdfAttachmentFromDraft(draft)');
  const draftOpenPos = exportBlock.indexOf('createAndOpenGmailDraft');

  assert.equal(
    gmailOps.includes("winMaybe.open('', '_blank')"),
    false,
    'must not open a blank placeholder tab'
  );
  assert.equal(
    gmailOps.includes('reserveGmailDraftWindow'),
    false,
    'must not reserve a Gmail tab before work'
  );
  assert.equal(
    gmailOps.includes('reservedWindow'),
    false,
    'must not pass a pre-opened tab through Gmail flow'
  );
  assert.ok(tokenPos !== -1, 'OAuth token should still be requested before Gmail API work');
  assert.ok(pdfBuildPos > tokenPos, 'OAuth popup request should stay before slow PDF generation');
  assert.ok(draftOpenPos > pdfBuildPos, 'Gmail window should open only after PDF bytes are ready');
});

test('[gmail-oauth-cloudflare] Gmail draft is opened only from the final draft URL in a bounded popup', () => {
  const gmailOps = read('esm/native/ui/react/pdf/order_pdf_overlay_gmail_ops.ts');
  assert.match(gmailOps, /function resolvePopupFeatures/);
  assert.match(gmailOps, /popup=yes/);
  assert.match(gmailOps, /width=\$\{width\}/);
  assert.match(gmailOps, /height=\$\{height\}/);
  assert.match(gmailOps, /winMaybe\.open\(url, 'wpGmailDraft', resolvePopupFeatures\(winMaybe\)\)/);
});

test('[gmail-oauth-cloudflare] Cloudflare headers allow OAuth popups on the custom domain', () => {
  const headers = read('public/_headers');
  assert.match(headers, /Referrer-Policy:\s*strict-origin-when-cross-origin/i);
  assert.match(headers, /Cross-Origin-Opener-Policy:\s*same-origin-allow-popups/i);
});
