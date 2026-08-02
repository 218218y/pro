import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  collectLintRuleMatrix,
  createFormattedLintRuleMatrixMarkdown,
} from '../tools/wp_lint_rule_matrix.mjs';

function read(rel) {
  return fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readTypeAwareLintReport() {
  const oxlintBin = path.join(ROOT, 'node_modules', 'oxlint', 'bin', 'oxlint');
  const result = spawnSync(
    process.execPath,
    [
      oxlintBin,
      '--type-aware',
      '-c',
      'oxlint.config.mjs',
      '--no-error-on-unmatched-pattern',
      '--format',
      'json',
      'esm',
      'types',
    ],
    {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      env: process.env,
    }
  );

  assert.ifError(result.error);
  assert.ok(result.stdout.trim(), result.stderr || 'Oxlint returned no JSON report.');
  return JSON.parse(result.stdout);
}

const OLD_LINT_LEGACY = 'lint:' + 'legacy';
const OLD_PARSER_REMOVAL = 'parser' + '-removal';

const EXPECTED_RULES = [
  'eqeqeq',
  'no-const-assign',
  'no-dupe-keys',
  'no-redeclare',
  'no-restricted-globals',
  'no-restricted-imports',
  'no-restricted-syntax',
  'no-undef',
  'no-unreachable',
  'no-unused-vars',
];

test('lint rule matrix captures every configured ESLint rule with stage-9 ownership metadata', async () => {
  const rows = await collectLintRuleMatrix();
  assert.deepEqual(
    rows.map(row => row.rule),
    EXPECTED_RULES
  );

  for (const row of rows) {
    assert.ok(['ESLint', 'custom'].includes(row.source), row.rule);
    assert.ok(row.appliesTo.length > 0, row.rule);
    assert.ok(row.futureTarget, row.rule);
    assert.equal(row.typeAware, false, `${row.rule} must not pretend to be parserOptions.project type-aware`);
    assert.ok(row.notes.length > 20, row.rule);
  }

  assert.equal(rows.find(row => row.rule === 'no-unused-vars').futureTarget, 'replace-by-oxlint');
  assert.equal(
    rows.find(row => row.rule === 'no-restricted-syntax').futureTarget,
    'replace-by-custom-contract'
  );
});

test('lint strategy matrix document is generated from the live eslint config', async () => {
  const rows = await collectLintRuleMatrix();
  const expected = await createFormattedLintRuleMatrixMarkdown(rows);
  assert.equal(read('docs/LINT_STRATEGY_MATRIX.md'), expected);
});

test('package promotes modern lint without retired aliases', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.devDependencies.typescript, '7.0.2');
  assert.equal(pkg.devDependencies.eslint, '^10.8.0');
  assert.equal(pkg.devDependencies.oxlint, '^1.75.0');
  assert.equal(pkg.devDependencies['oxlint-tsgolint'], '7.0.2001');
  assert.equal(pkg.devDependencies['oxc-parser'], '>=0.141.0 <0.143.0');
  assert.equal(pkg.scripts.lint, 'npm run lint:modern');
  assert.equal(
    pkg.scripts['lint:modern'],
    'npm run lint:js:strict && npm run lint:ts-modern:syntax && npm run lint:ts-modern:type-aware && npm run lint:contracts'
  );
  assert.equal(pkg.scripts[OLD_LINT_LEGACY], undefined);
  assert.equal(pkg.scripts['lint:js'], 'node tools/wp_lint.js --profile js-only');
  assert.equal(pkg.scripts['lint:js:strict'], 'node tools/wp_lint.js --profile js-only --strict');
  assert.equal(
    pkg.scripts['lint:ts-modern:syntax'],
    'node tools/wp_oxlint_audit.mjs --mode syntax --fail-on-diagnostics'
  );
  assert.equal(
    pkg.scripts['lint:ts-modern:type-aware'],
    'node tools/wp_oxlint_audit.mjs --mode type-aware --fail-on-diagnostics'
  );
  assert.equal(pkg.scripts['lint:architecture-contracts'], 'node tools/wp_lint_architecture_contracts.mjs');
  assert.equal(pkg.scripts['quality:ts'], 'npm run quality:ts-modern');
  assert.match(pkg.scripts['quality:ts-modern'], /lint:js:strict/);
  assert.match(pkg.scripts['quality:ts-modern'], /lint:ts-modern:type-aware/);
  assert.match(pkg.scripts['quality:ts-modern'], /lint:contracts/);
  assert.doesNotMatch(
    pkg.scripts['quality:ts-modern'],
    new RegExp(`${OLD_LINT_LEGACY}|${OLD_PARSER_REMOVAL}`)
  );
});

test('zeroed type-aware rules stay globally zero without baselining the remaining debt', () => {
  const report = readTypeAwareLintReport();
  const diagnostics = Array.isArray(report.diagnostics) ? report.diagnostics : [];
  const zeroedRules = [
    'typescript(no-redundant-type-constituents)',
    'typescript(unbound-method)',
    'typescript(no-base-to-string)',
  ];

  assert.ok(report.number_of_files > 0, 'The global type-aware scan must cover project files.');
  for (const rule of zeroedRules) {
    const ruleDiagnostics = diagnostics.filter(diagnostic => diagnostic?.code === rule);
    assert.equal(ruleDiagnostics.length, 0, `${rule} regressed above its zero contract.`);
  }
});
