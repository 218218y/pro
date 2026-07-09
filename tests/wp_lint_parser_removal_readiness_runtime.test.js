import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  collectLintParserRemovalReadiness,
  collectLintParserRemovalReadinessRows,
} from '../tools/wp_lint_parser_removal_readiness.mjs';
import { collectLintRuleMatrix } from '../tools/wp_lint_rule_matrix.mjs';

function read(rel) {
  return fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
}

function packageWithScripts(overrides = {}) {
  const pkg = JSON.parse(read('package.json'));
  return { ...pkg, scripts: { ...pkg.scripts, ...overrides } };
}

test('parser removal readiness has a concrete owner for every lint matrix rule', async () => {
  const matrixRows = await collectLintRuleMatrix();
  const readinessRows = await collectLintParserRemovalReadinessRows();
  const readinessByRule = new Map(readinessRows.map(row => [row.rule, row]));

  assert.deepEqual(
    readinessRows.map(row => row.rule),
    matrixRows.map(row => row.rule)
  );

  for (const row of readinessRows) {
    assert.ok(row.futureOwner.length > 5, row.rule);
    assert.ok(row.blockingCommand.length > 2, row.rule);
    assert.equal(row.ready, true, row.rule);
    assert.doesNotMatch(row.notes, /manual-review|under-review/i, row.rule);
  }

  assert.equal(readinessByRule.get('no-restricted-imports').futureOwner, 'custom lint contracts');
  assert.equal(readinessByRule.get('@typescript-eslint/no-unused-vars').futureOwner, 'Oxlint syntax');
});

test('parser removal readiness blocks undecided manual-review targets', async () => {
  const report = await collectLintParserRemovalReadiness({
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

test('parser removal readiness requires replace-by-oxlint rules to use blocking oxlint syntax', async () => {
  const report = await collectLintParserRemovalReadiness({
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

test('parser removal readiness requires custom-contract rules to be covered by lint:contracts and a zero baseline', async () => {
  const report = await collectLintParserRemovalReadiness({
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

test('parser removal readiness treats no-undef as a JS/tools ESLint rule, not a TS parser blocker', async () => {
  const rows = await collectLintParserRemovalReadinessRows();
  const noUndef = rows.find(row => row.rule === 'no-undef');
  assert.equal(noUndef.ready, true);
  assert.equal(noUndef.futureOwner, 'ESLint JS/tools + TypeScript typecheck');
  assert.match(noUndef.blockingCommand, /lint:js:strict/);
  assert.match(noUndef.notes, /Not a TS\/TSX parser-removal blocker/);
});

test('parser removal readiness is wired into lint contracts and toolchain surfaces', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(
    pkg.scripts['lint:parser-removal-readiness'],
    'node tools/wp_lint_parser_removal_readiness.mjs'
  );
  assert.equal(pkg.scripts['lint:js'], 'node tools/wp_lint.js --profile parser-removal-dry-run');
  assert.equal(
    pkg.scripts['lint:js:strict'],
    'node tools/wp_lint.js --profile parser-removal-dry-run --strict'
  );
  assert.equal(
    pkg.scripts['lint:parser-removal-dry-run'],
    'node tools/wp_lint.js --profile parser-removal-dry-run'
  );
  assert.match(pkg.scripts['lint:contracts'], /lint:parser-removal-readiness/);
  assert.match(pkg.scripts['test:toolchain-surfaces'], /wp_lint_parser_removal_readiness_runtime\.test\.js/);
  assert.match(pkg.scripts['test:toolchain-surfaces'], /wp_lint_parser_removal_dry_run_runtime\.test\.js/);
  assert.match(
    pkg.scripts['test:toolchain-surfaces'],
    /wp_lint_parser_removal_package_independence_runtime\.test\.js/
  );
});
