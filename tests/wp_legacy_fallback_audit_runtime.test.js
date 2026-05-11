import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  classifyLegacyFallbackOccurrence,
  collectLegacyFallbackOccurrences,
  summarizeLegacyFallbackOccurrences,
  createLegacyFallbackAllowlist,
  compareLegacyFallbackAllowlist,
  parseLegacyFallbackAuditArgs,
} from '../tools/wp_legacy_fallback_audit.mjs';

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wp-legacy-fallback-audit-'));
}

function writeFile(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, 'utf8');
}

test('legacy fallback audit args keep check, allowlist, and report flags explicit', () => {
  assert.deepEqual(
    parseLegacyFallbackAuditArgs([
      '--source-root',
      'esm/native',
      '--json-out',
      'tmp/audit.json',
      '--md-out',
      'tmp/audit.md',
      '--allowlist',
      'tmp/allow.json',
      '--write-allowlist',
      '--check',
      '--allow-unknown',
      '--no-print',
    ]),
    {
      sourceRoot: 'esm/native',
      jsonOutPath: 'tmp/audit.json',
      mdOutPath: 'tmp/audit.md',
      allowlistPath: 'tmp/allow.json',
      writeAllowlist: true,
      check: true,
      failOnUnknown: false,
      print: false,
    }
  );
});

test('legacy fallback audit classifies boundary occurrences before runtime risk', () => {
  assert.equal(
    classifyLegacyFallbackOccurrence({
      relPath: 'esm/native/adapters/browser/env_surface.ts',
      lineText: 'return requestAnimationFrame || fallback; // browser fallback',
      term: 'fallback',
    }),
    'browser-adapter'
  );
  assert.equal(
    classifyLegacyFallbackOccurrence({
      relPath: 'esm/native/features/project_config/project_config_persisted_snapshot.ts',
      lineText: 'const legacy = migratePersistedPayload(value);',
      term: 'legacy',
    }),
    'project-migration'
  );
  assert.equal(
    classifyLegacyFallbackOccurrence({
      relPath: 'esm/native/runtime/config_selectors_readers.ts',
      lineText: 'export function readEnum(value: unknown, fallback = "x") { return fallback; }',
      term: 'fallback',
    }),
    'runtime-default'
  );
  assert.equal(
    classifyLegacyFallbackOccurrence({
      relPath: 'esm/native/ui/react/sidebar_app.tsx',
      lineText: 'fallback={null}',
      term: 'fallback',
    }),
    'framework-default'
  );
  assert.equal(
    classifyLegacyFallbackOccurrence({
      relPath: 'esm/native/runtime/cache_access.ts',
      lineText: '// legacy root cache bag must not be restored',
      term: 'legacy',
    }),
    'legacy-runtime-risk'
  );
  assert.equal(
    classifyLegacyFallbackOccurrence({
      relPath: 'esm/native/ui/react/tabs/design_tab_color_action_result_reason.ts',
      lineText: 'return normalizeReason(value, fallbackReason);',
      term: 'fallbackReason',
    }),
    'error-message-default'
  );
  assert.equal(
    classifyLegacyFallbackOccurrence({
      relPath: 'esm/native/builder/core_carcass_cornice.ts',
      lineText: 'return buildCompatCorniceEnvelope({});',
      term: 'buildCompatCorniceEnvelope',
    }),
    'compat-boundary'
  );
  assert.equal(
    classifyLegacyFallbackOccurrence({
      relPath: 'esm/boot/boot_manifest_steps.ts',
      lineText: "id: 'builder.coreBrowserCompat',",
      term: 'coreBrowserCompat',
    }),
    'external-api-compat'
  );
});

test('legacy fallback audit summarizes and lock-checks the categorized inventory', () => {
  const projectRoot = tempProject();
  writeFile(
    path.join(projectRoot, 'esm/native/runtime/a.ts'),
    'export function read(v: unknown, fallback = 1) { return fallback; }\n// legacy runtime path\n'
  );
  writeFile(
    path.join(projectRoot, 'esm/native/adapters/browser/env.ts'),
    'export const message = "browser fallback";\n'
  );
  writeFile(path.join(projectRoot, 'esm/native/ui/react/sidebar_app.tsx'), 'fallback={null}\n');

  const occurrences = collectLegacyFallbackOccurrences({ projectRoot, sourceRoot: 'esm' });
  const summary = summarizeLegacyFallbackOccurrences(occurrences);
  assert.equal(summary.totalOccurrences, 4);
  assert.equal(summary.byCategory['runtime-default'], 1);
  assert.equal(summary.byCategory['framework-default'], 1);
  assert.equal(summary.byCategory['browser-adapter'], 1);
  assert.equal(summary.byCategory.unknown, 0);

  const allowlist = createLegacyFallbackAllowlist(summary);
  assert.equal(compareLegacyFallbackAllowlist(summary, allowlist).ok, true);

  writeFile(path.join(projectRoot, 'esm/native/runtime/b.ts'), '// legacy new path\n');
  const driftSummary = summarizeLegacyFallbackOccurrences(
    collectLegacyFallbackOccurrences({ projectRoot, sourceRoot: 'esm' })
  );
  const comparison = compareLegacyFallbackAllowlist(driftSummary, allowlist);
  assert.equal(comparison.ok, false);
  assert.ok(comparison.failures.some(item => item.kind === 'new-file'));
});
