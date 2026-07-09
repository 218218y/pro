import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { collectLintParityRows, createLintParityMarkdown } from '../tools/wp_lint_parity_report.mjs';

function read(rel) {
  return fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
}

test('lint parity report classifies every rule before parser removal', async () => {
  const rows = await collectLintParityRows();
  const byRule = new Map(rows.map(row => [row.rule, row]));

  assert.equal(byRule.get('no-dupe-keys').classification, 'covered by modern gate');
  assert.equal(byRule.get('no-unused-vars').classification, 'covered by modern gate');
  assert.equal(byRule.get('no-restricted-imports').classification, 'covered by modern gate');
  assert.equal(byRule.get('no-restricted-syntax').classification, 'covered by modern gate');
  assert.equal(byRule.get('no-undef').classification, 'blocked by tool support');

  for (const row of rows) {
    assert.equal(row.legacy, 'covered', row.rule);
    assert.ok(row.classification, row.rule);
    assert.ok(row.rationale.length > 20, row.rule);
  }
});

test('lint parity document is generated from the matrix source of truth', async () => {
  assert.equal(read('docs/LINT_PARITY_REPORT.md'), await createLintParityMarkdown());
});

test('stage 6 keeps legacy eslint compatibility while AST adapter uses Oxc', () => {
  const eslintConfig = read('eslint.config.js');
  const astAdapter = read('tools/wp_ast_adapter.mjs');
  const oxlintConfig = read('oxlint.config.mjs');

  assert.match(eslintConfig, /import\('@typescript-eslint\/parser'\)/);
  assert.match(eslintConfig, /PARSER_REMOVAL_DRY_RUN \? null : await loadTypeScriptEslint\(\)/);
  assert.match(eslintConfig, /parser:\s*typeScriptEslint\.parser/);
  assert.match(astAdapter, /from 'oxc-parser'/);
  const forbiddenTsImportPattern = new RegExp(
    ["require\\('typescript'\\)", ['from ', "'typescript'"].join(''), "import\\('typescript'\\)"].join('|')
  );
  assert.doesNotMatch(astAdapter, forbiddenTsImportPattern);
  assert.match(oxlintConfig, /plugins:\s*\[/);
  assert.match(oxlintConfig, /typescript/);
});
