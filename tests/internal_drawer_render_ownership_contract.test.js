import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/builder/render_drawer_ops_internal.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('internal drawer render imports exactly the two focused owners without aliases', () => {
  const source = read(consumerRel);
  const analysis = analyzeModuleDependencies(path.join(root, consumerRel), source);
  const focusedImports = analysis.imports.filter(dependency => dependency.specifier.includes('/dimensions/'));

  assert.deepEqual(
    focusedImports.map(({ specifier, kind, syntax, importedSymbols }) => ({
      specifier,
      kind,
      syntax,
      importedSymbols,
    })),
    [
      {
        specifier: '../../shared/dimensions/chest_mode_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CHEST_MODE_DRAWER_BOX_RENDER_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/internal_drawer_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['INTERNAL_DRAWER_CONTENTS_POLICY'],
      },
    ]
  );
  assert.equal(focusedImports.length, 2);
  assert.equal(
    focusedImports.every(dependency =>
      dependency.bindings.every(binding => binding.importedName === binding.localName)
    ),
    true
  );
  assert.deepEqual(analysis.unresolvedDynamicImports, []);
  assert.deepEqual(analysis.forbiddenModuleSyntax, []);
  assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
  assert.doesNotMatch(
    source,
    /\b(?:CHEST_MODE_DIMENSIONS|DRAWER_DIMENSIONS|CHEST_MODE_DIMENSIONS_OWNER|CHEST_MODE_POLICY|INTERNAL_DRAWER_POLICY|drawerDims|contentsDims|drawerBoxDimensions|chestDims)\b|import\s+\*\s+as|export\s+(?:type\s+)?(?:\*|\{)/u
  );
});

test('internal drawer render preserves the focused contents and front-depth formulas', () => {
  const source = read(consumerRel);

  for (const field of ['contentsBottomInsetM', 'contentsWidthClearanceM', 'contentsHeightClearanceM']) {
    assert.match(source, new RegExp(`INTERNAL_DRAWER_CONTENTS_POLICY\\.${field}`, 'u'));
  }
  assert.match(
    source,
    /const accentFrontLift\s*=\s*CHEST_MODE_DRAWER_BOX_RENDER_POLICY\.accentZOffsetM\s*\+\s*CHEST_MODE_DRAWER_BOX_RENDER_POLICY\.accentStripDepthM\s*\/\s*2/u
  );
  assert.match(source, /return depth\s*\/\s*2\s*\+\s*Math\.max\(0,\s*accentFrontLift\)/u);
});

test('internal drawer runners are pinned to roller hardware independently of external selection', () => {
  const source = read(consumerRel);

  assert.match(source, /runnerType:\s*INTERNAL_DRAWER_RUNNER_TYPE/u);
  assert.doesNotMatch(source, /runnerType:\s*cfg\.drawerRunnerType/u);
});
