import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  collectLintRuleMatrix,
  createFormattedLintRuleMatrixMarkdown,
} from '../tools/wp_lint_rule_matrix.mjs';

function read(rel) {
  return fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
}

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

test('lint rule matrix captures every configured ESLint rule with stage-5 ownership metadata', async () => {
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

test('package promotes modern lint while keeping retired legacy alias', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.devDependencies.typescript, '6.0.3');
  assert.equal(pkg.devDependencies.oxlint, '1.73.0');
  assert.equal(pkg.devDependencies['oxlint-tsgolint'], '0.24.0');
  assert.equal(pkg.scripts.lint, 'npm run lint:modern');
  assert.equal(
    pkg.scripts['lint:modern'],
    'npm run lint:js:strict && npm run lint:ts-modern:syntax && npm run lint:contracts'
  );
  assert.equal(pkg.scripts['lint:legacy'], 'node tools/wp_lint_legacy_retired.mjs');
  assert.equal(pkg.scripts['lint:js'], 'node tools/wp_lint.js --profile parser-removal-dry-run');
  assert.equal(
    pkg.scripts['lint:js:strict'],
    'node tools/wp_lint.js --profile parser-removal-dry-run --strict'
  );
  assert.equal(
    pkg.scripts['lint:parser-removal-dry-run'],
    'node tools/wp_lint.js --profile parser-removal-dry-run'
  );
  assert.equal(
    pkg.scripts['lint:ts-modern:syntax'],
    'node tools/wp_oxlint_audit.mjs --mode syntax --fail-on-diagnostics'
  );
  assert.equal(pkg.scripts['lint:ts-modern:type-aware'], 'node tools/wp_oxlint_audit.mjs --mode type-aware');
  assert.equal(pkg.scripts['lint:architecture-contracts'], 'node tools/wp_lint_architecture_contracts.mjs');
  assert.equal(pkg.scripts['quality:ts'], 'npm run quality:ts-modern');
  assert.match(pkg.scripts['quality:ts-modern'], /lint:js:strict/);
  assert.match(pkg.scripts['quality:ts-modern'], /lint:contracts/);
  assert.doesNotMatch(pkg.scripts['quality:ts-modern'], /lint:legacy/);
});
