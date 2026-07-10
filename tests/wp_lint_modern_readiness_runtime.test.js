import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  collectLintModernReadiness,
  collectLintModernReadinessRows,
} from '../tools/wp_lint_modern_readiness.mjs';
import { collectLintRuleMatrix } from '../tools/wp_lint_rule_matrix.mjs';

function read(rel) {
  return fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
}

const OLD_LINT_LEGACY = 'lint:' + 'legacy';
const OLD_PARSER_REMOVAL = 'parser' + '-removal';
const OLD_DRY_RUN_SCRIPT = 'lint:' + OLD_PARSER_REMOVAL + '-dry-run';
const OLD_READINESS_SCRIPT = 'lint:' + OLD_PARSER_REMOVAL + '-readiness';

function packageWithScripts(overrides = {}) {
  const pkg = JSON.parse(read('package.json'));
  return { ...pkg, scripts: { ...pkg.scripts, ...overrides } };
}

test('modern readiness has a concrete owner for every lint matrix rule', async () => {
  const matrixRows = await collectLintRuleMatrix();
  const readinessRows = await collectLintModernReadinessRows();
  const readinessByRule = new Map(readinessRows.map(row => [row.rule, row]));

  assert.deepEqual(
    readinessRows.map(row => row.rule),
    matrixRows.map(row => row.rule)
  );

  for (const row of readinessRows) {
    assert.ok(row.futureOwner.length > 5, row.rule);
    assert.ok(row.blockingCommand.length > 2, row.rule);
    assert.equal(row.ready, true, row.rule);
    assert.doesNotMatch(
      row.notes,
      new RegExp(`manual-review|under-review|${OLD_PARSER_REMOVAL}`, 'i'),
      row.rule
    );
  }

  assert.equal(readinessByRule.get('no-restricted-imports').futureOwner, 'custom lint contracts');
  assert.equal(readinessByRule.get('no-unused-vars').futureOwner, 'Oxlint syntax');
});

test('modern readiness blocks undecided manual-review targets', async () => {
  const report = await collectLintModernReadiness({
    rows: [
      {
        rule: 'manual-fixture',
        appliesTo: ['TS'],
        futureTarget: 'manual-review',
      },
    ],
  });

  assert.equal(report.ready, false);
  assert.match(report.failures[0].notes, /not decided/);
});

test('modern readiness requires replace-by-oxlint rules to use blocking oxlint syntax', async () => {
  const report = await collectLintModernReadiness({
    packageJson: packageWithScripts({
      'lint:ts-modern:syntax': 'node tools/wp_oxlint_audit.mjs --mode syntax',
    }),
    rows: [
      {
        rule: 'no-unused-vars',
        appliesTo: ['TS'],
        futureTarget: 'replace-by-oxlint',
      },
    ],
  });

  assert.equal(report.ready, false);
  assert.match(report.failures[0].notes, /--fail-on-diagnostics/);
});

test('modern readiness requires custom-contract rules to be covered by lint:contracts and a zero baseline', async () => {
  const report = await collectLintModernReadiness({
    architectureBaselineCount: 1,
    rows: [
      {
        rule: 'no-restricted-imports',
        appliesTo: ['TS'],
        futureTarget: 'replace-by-custom-contract',
      },
    ],
  });

  assert.equal(report.ready, false);
  assert.match(report.failures[0].notes, /architecture baseline is 1/);
});

test('modern readiness treats no-undef as a JS/tools ESLint rule, not a TS blocker', async () => {
  const rows = await collectLintModernReadinessRows();
  const noUndef = rows.find(row => row.rule === 'no-undef');
  assert.equal(noUndef.ready, true);
  assert.equal(noUndef.futureOwner, 'ESLint JS/tools + TypeScript typecheck');
  assert.match(noUndef.blockingCommand, /lint:js:strict/);
  assert.match(noUndef.notes, /ESLint keeps JS\/tools globals/);
});

test('modern readiness is wired into lint contracts and toolchain surfaces', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.scripts['lint:modern-readiness'], 'node tools/wp_lint_modern_readiness.mjs');
  assert.equal(pkg.scripts.lint, 'npm run lint:modern');
  assert.equal(
    pkg.scripts['lint:modern'],
    'npm run lint:js:strict && npm run lint:ts-modern:syntax && npm run lint:contracts'
  );
  assert.equal(pkg.scripts['lint:js'], 'node tools/wp_lint.js --profile js-only');
  assert.equal(pkg.scripts['lint:js:strict'], 'node tools/wp_lint.js --profile js-only --strict');
  assert.equal(pkg.scripts[OLD_READINESS_SCRIPT], undefined);
  assert.equal(pkg.scripts[OLD_DRY_RUN_SCRIPT], undefined);
  assert.equal(pkg.scripts[OLD_LINT_LEGACY], undefined);
  assert.match(pkg.scripts['lint:contracts'], /lint:modern-readiness/);
  assert.match(pkg.scripts['test:toolchain-surfaces'], /wp_lint_modern_readiness_runtime\.test\.js/);
  assert.match(pkg.scripts['test:toolchain-surfaces'], /wp_lint_js_only_runtime\.test\.js/);
  assert.match(pkg.scripts['test:toolchain-surfaces'], /wp_lint_typescript_eslint_absence_runtime\.test\.js/);
});
