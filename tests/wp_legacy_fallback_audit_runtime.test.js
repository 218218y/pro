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
  runLegacyFallbackAudit,
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

test('legacy fallback audit classifies capability, compatibility, migration, rejection, and defaults semantically', () => {
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
      relPath: 'esm/native/io/project_config_load.ts',
      lineText: 'const previous = migratePersistedPayload(value);',
      term: 'migratePersistedPayload',
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
    'legacy-rejection'
  );
  assert.equal(
    classifyLegacyFallbackOccurrence({
      relPath: 'esm/native/builder/core_carcass_cornice.ts',
      lineText: '// compatibility-boundary: retained cornice envelope seam',
      term: 'compatibility',
    }),
    'compat-boundary'
  );
  assert.equal(
    classifyLegacyFallbackOccurrence({
      relPath: 'esm/native/builder/material.ts',
      lineText: '// optional material shape on alternate THREE-compatible surfaces',
      term: 'compatible',
    }),
    'external-api-compat'
  );
  assert.equal(
    classifyLegacyFallbackOccurrence({
      relPath: 'esm/native/runtime/config_validation.ts',
      lineText: '// Preserve unknown keys for forward-compatible feature configuration.',
      term: 'compatible',
    }),
    'forward-compatibility'
  );
  assert.equal(
    classifyLegacyFallbackOccurrence({
      relPath: 'esm/native/builder/materials.ts',
      lineText: '// builder-material-fallback: use the canonical default material',
      term: 'fallback',
    }),
    'domain-default',
    'the word canonical alone must not turn an ordinary default into project migration'
  );
  assert.equal(
    classifyLegacyFallbackOccurrence({
      relPath: 'esm/native/runtime/cache_access.ts',
      lineText: '// legacy root cache bag may still be present',
      term: 'legacy',
    }),
    'legacy-runtime-risk'
  );
});

test('legacy fallback scanner catches prefix and compatibility vocabulary that the old regex missed', () => {
  const projectRoot = tempProject();
  writeFile(
    path.join(projectRoot, 'esm/native/runtime/a.ts'),
    [
      'const legacyResult = read();',
      'const fallbackReason = "none";',
      '// Preserve unknown keys for forward-compatible configuration.',
      '// compatibility-boundary: retained alias seam',
      '',
    ].join('\n')
  );

  const occurrences = collectLegacyFallbackOccurrences({ projectRoot, sourceRoot: 'esm' });
  const terms = occurrences.map(entry => entry.term);
  assert.ok(terms.includes('legacyResult'));
  assert.ok(terms.includes('fallbackReason'));
  assert.ok(terms.includes('compatible'));
  assert.ok(terms.includes('compatibility'));
});

test('legacy fallback allowlist ratchets reviewed seams without locking ordinary fallback churn', () => {
  const projectRoot = tempProject();
  writeFile(
    path.join(projectRoot, 'esm/native/runtime/a.ts'),
    [
      'export function read(v: unknown, fallback = 1) { return fallback; }',
      '// compatibility-boundary: retired alias seam',
      '',
    ].join('\n')
  );
  writeFile(
    path.join(projectRoot, 'esm/native/adapters/browser/env.ts'),
    'export const message = "browser fallback";\n'
  );
  writeFile(path.join(projectRoot, 'esm/native/ui/react/sidebar_app.tsx'), 'fallback={null}\n');

  const occurrences = collectLegacyFallbackOccurrences({ projectRoot, sourceRoot: 'esm' });
  const summary = summarizeLegacyFallbackOccurrences(occurrences);
  assert.equal(summary.byCategory['runtime-default'], 1);
  assert.equal(summary.byCategory['compat-boundary'], 1);
  assert.equal(summary.byCategory['framework-default'], 1);
  assert.equal(summary.byCategory['browser-adapter'], 1);
  assert.equal(summary.byCategory.unknown, 0);

  const allowlist = createLegacyFallbackAllowlist(summary, { sourceRoot: 'esm' });
  assert.equal(allowlist.version, 2);
  assert.deepEqual(Object.keys(allowlist.entries), ['esm/native/runtime/a.ts']);
  assert.equal(compareLegacyFallbackAllowlist(summary, allowlist, { sourceRoot: 'esm' }).ok, true);

  writeFile(path.join(projectRoot, 'esm/native/runtime/default_only.ts'), 'const fallbackValue = 2;\n');
  const ordinaryGrowthSummary = summarizeLegacyFallbackOccurrences(
    collectLegacyFallbackOccurrences({ projectRoot, sourceRoot: 'esm' })
  );
  assert.equal(
    compareLegacyFallbackAllowlist(ordinaryGrowthSummary, allowlist, { sourceRoot: 'esm' }).ok,
    true,
    'ordinary defaults stay report-visible without creating allowlist churn'
  );

  writeFile(
    path.join(projectRoot, 'esm/native/runtime/new_compat.ts'),
    '// compatibility-boundary: retained old surface seam\n'
  );
  const guardedGrowthSummary = summarizeLegacyFallbackOccurrences(
    collectLegacyFallbackOccurrences({ projectRoot, sourceRoot: 'esm' })
  );
  const growthComparison = compareLegacyFallbackAllowlist(guardedGrowthSummary, allowlist, {
    sourceRoot: 'esm',
  });
  assert.equal(growthComparison.ok, false);
  assert.ok(growthComparison.failures.some(item => item.kind === 'new-guarded-file'));

  writeFile(path.join(projectRoot, 'esm/native/runtime/a.ts'), 'const fallbackValue = 1;\n');
  fs.rmSync(path.join(projectRoot, 'esm/native/runtime/new_compat.ts'));
  const reducedSummary = summarizeLegacyFallbackOccurrences(
    collectLegacyFallbackOccurrences({ projectRoot, sourceRoot: 'esm' })
  );
  assert.equal(
    compareLegacyFallbackAllowlist(reducedSummary, allowlist, { sourceRoot: 'esm' }).ok,
    true,
    'removing a reviewed compatibility seam is a safe ratchet reduction'
  );
});

test('legacy fallback allowlist rejects stale schema and source-root metadata', () => {
  const summary = summarizeLegacyFallbackOccurrences([]);
  assert.deepEqual(compareLegacyFallbackAllowlist(summary, { version: 1 }).failures, [
    { kind: 'allowlist-version', expected: 2, actual: 1 },
  ]);

  const allowlist = createLegacyFallbackAllowlist(summary, { sourceRoot: 'esm/native' });
  const comparison = compareLegacyFallbackAllowlist(summary, allowlist, { sourceRoot: 'esm' });
  assert.equal(comparison.ok, false);
  assert.ok(comparison.failures.some(item => item.kind === 'source-root'));
});

test('checked legacy fallback audit fails closed on unreviewed live legacy runtime paths', () => {
  const projectRoot = tempProject();
  writeFile(path.join(projectRoot, 'esm/native/runtime/a.ts'), 'const legacyResult = read();\n');
  const summary = summarizeLegacyFallbackOccurrences(
    collectLegacyFallbackOccurrences({ projectRoot, sourceRoot: 'esm' })
  );
  writeFile(
    path.join(projectRoot, 'allow.json'),
    `${JSON.stringify(createLegacyFallbackAllowlist(summary, { sourceRoot: 'esm' }), null, 2)}\n`
  );

  assert.throws(
    () =>
      runLegacyFallbackAudit({
        projectRoot,
        args: {
          sourceRoot: 'esm',
          jsonOutPath: null,
          mdOutPath: null,
          allowlistPath: 'allow.json',
          writeAllowlist: false,
          check: true,
          failOnUnknown: true,
          print: false,
        },
      }),
    /unreviewed legacy runtime risk/
  );
});
