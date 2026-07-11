import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  CONTENT_SECURITY_POLICY_REPORT_ONLY,
  CONTENT_SECURITY_POLICY_REPORT_ONLY_DIRECTIVES,
  GLOBAL_BROWSER_SECURITY_HEADER_LINES,
} from '../tools/wp_browser_security_headers.mjs';
import { buildReleaseHeaders } from '../tools/wp_release_finalize.js';

function read(file) {
  return readFileSync(file, 'utf8');
}

test('stage 82 browser security headers use one report-only CSP baseline in source and release output', () => {
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

test('stage 82 CSP baseline covers app-owned resources, Supabase, Gmail, workers and embedding', () => {
  for (const directive of [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://gmail.googleapis.com",
    "worker-src 'self' blob:",
    "frame-src 'self' blob: https://accounts.google.com https://mail.google.com",
  ]) {
    assert.ok(CONTENT_SECURITY_POLICY_REPORT_ONLY_DIRECTIVES.includes(directive), directive);
  }

  assert.equal(
    CONTENT_SECURITY_POLICY_REPORT_ONLY,
    CONTENT_SECURITY_POLICY_REPORT_ONLY_DIRECTIVES.join('; ')
  );
  assert.doesNotMatch(read('public/_headers'), /^  Content-Security-Policy:/m);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
