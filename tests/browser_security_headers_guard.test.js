import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  CONTENT_SECURITY_POLICY_ENFORCED,
  CONTENT_SECURITY_POLICY_ENFORCED_DIRECTIVES,
  CONTENT_SECURITY_POLICY_REPORT_ONLY,
  CONTENT_SECURITY_POLICY_REPORT_ONLY_DIRECTIVES,
  GLOBAL_BROWSER_SECURITY_HEADER_LINES,
} from '../tools/wp_browser_security_headers.mjs';
import { buildReleaseHeaders, rewriteReleaseHtml } from '../tools/wp_release_finalize.js';

// Capability guard: browser-security-headers (not a continuation of the numbered refactor track).

function read(file) {
  return readFileSync(file, 'utf8');
}

test('browser security headers use one enforced baseline and one report-only baseline in source and release output', () => {
  const publicHeaders = read('public/_headers');
  const releaseDir = mkdtempSync(path.join(tmpdir(), 'wp-security-headers-'));
  try {
    const releaseHeaders = buildReleaseHeaders({
      releaseDir,
      bundleRelFinal: null,
      threeVendorMetaFinal: null,
      chunksFinal: [],
    });

    for (const header of GLOBAL_BROWSER_SECURITY_HEADER_LINES) {
      assert.match(publicHeaders, new RegExp(`^  ${escapeRegExp(header)}$`, 'm'));
      assert.match(releaseHeaders, new RegExp(`^  ${escapeRegExp(header)}$`, 'm'));
    }
  } finally {
    rmSync(releaseDir, { recursive: true, force: true });
  }
});

test('CSP baseline covers app-owned resources, reporting, Supabase, Gmail, workers and embedding', () => {
  for (const directive of [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://gmail.googleapis.com",
    "worker-src 'self' blob:",
    "frame-src 'self' blob: https://accounts.google.com https://mail.google.com",
    'report-to csp-endpoint',
    'report-uri /__csp-report',
  ]) {
    assert.ok(CONTENT_SECURITY_POLICY_REPORT_ONLY_DIRECTIVES.includes(directive), directive);
  }

  assert.equal(
    CONTENT_SECURITY_POLICY_REPORT_ONLY,
    CONTENT_SECURITY_POLICY_REPORT_ONLY_DIRECTIVES.join('; ')
  );
  assert.equal(CONTENT_SECURITY_POLICY_ENFORCED, CONTENT_SECURITY_POLICY_ENFORCED_DIRECTIVES.join('; '));
  assert.deepEqual(CONTENT_SECURITY_POLICY_ENFORCED_DIRECTIVES, [
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ]);
  assert.doesNotMatch(CONTENT_SECURITY_POLICY_REPORT_ONLY, /'unsafe-inline'/);
  assert.doesNotMatch(read('index_pro.html'), /<style(?:\s|>)/);
  assert.doesNotMatch(read('index_site2.html'), /<style(?:\s|>)/);
  assert.match(read('index_pro.html'), /css\/document_accessibility\.css/);
  assert.match(read('index_site2.html'), /css\/document_accessibility\.css/);
});

test('release profiles externalize their module loaders and do not ship inline style blocks', () => {
  for (const template of ['tools/index_release_bundle.html', 'tools/index_release_bundle_site2.html']) {
    const releaseDir = mkdtempSync(path.join(tmpdir(), 'wp-csp-release-profile-'));
    try {
      const html = rewriteReleaseHtml({
        htmlTemplate: read(template),
        releaseDir,
        hashAssets: false,
        hashed: { css: {}, js: {}, three: {} },
        bundleRelFinal: 'wardrobepro.bundle.js',
        threeVendorMetaFinal: { file: 'libs/three.vendor.js' },
        buildId: 'build-1',
      });
      assert.doesNotMatch(html, /<style(?:\s|>)/u);
      assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/u);
      assert.match(html, /wp_release_loader\.js/u);
      assert.match(readFileSync(path.join(releaseDir, 'wp_release_loader.js'), 'utf8'), /loadThreeVendor/u);
    } finally {
      rmSync(releaseDir, { recursive: true, force: true });
    }
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
