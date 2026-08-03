import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/builder/corner_connector_emit_shell_base.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('Corner Connector shell-base imports exactly the three focused Base owners', () => {
  const source = read(consumerRel);
  const analysis = analyzeModuleDependencies(path.join(root, consumerRel), source);
  const focusedImports = analysis.imports.filter(dependency =>
    dependency.specifier.startsWith('../../shared/dimensions/')
  );

  assert.deepEqual(
    focusedImports.map(({ specifier, kind, syntax, importedSymbols }) => ({
      specifier,
      kind,
      syntax,
      importedSymbols,
    })),
    [
      {
        specifier: '../../shared/dimensions/base_leg_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['BASE_LEG_LAYOUT_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/base_platform_render_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['BASE_PLATFORM_RENDER_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/base_plinth_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['BASE_PLINTH_POLICY'],
      },
    ]
  );
  assert.equal(focusedImports.length, 3);
  assert.equal(
    focusedImports.every(dependency =>
      dependency.bindings.every(binding => binding.importedName === binding.localName)
    ),
    true
  );
  assert.deepEqual(analysis.unresolvedDynamicImports, []);
  assert.deepEqual(analysis.forbiddenModuleSyntax, []);
  assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
  assert.doesNotMatch(source, /import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u);
  assert.doesNotMatch(
    source,
    /\b(?:CARCASS_BASE_DIMENSIONS|PLINTH_DIMENSIONS|BASE_LEG_LAYOUT_DIMENSIONS|LEG_PLATFORM_DIMENSIONS)\b/u
  );
  assert.doesNotMatch(
    source,
    /const\s+[A-Za-z_$][\w$]*\s*=\s*(?:BASE_PLINTH_POLICY|BASE_LEG_LAYOUT_POLICY|BASE_PLATFORM_RENDER_POLICY)\s*;/u
  );
});

test('Corner Connector shell-base reads every migrated field directly from its semantic owner', () => {
  const source = read(consumerRel);
  const exactUses = new Map([
    ['BASE_PLINTH_POLICY.connectorMaxToeRatio', 1],
    ['BASE_PLINTH_POLICY.connectorToeEndTrimMaxM', 1],
    ['BASE_PLINTH_POLICY.connectorWallInsetM', 2],
    ['BASE_PLINTH_POLICY.connectorTinyEpsilonM', 1],
    ['BASE_PLINTH_POLICY.segmentWidthEpsilonM', 1],
    ['BASE_PLINTH_POLICY.connectorShapeInsetM', 1],
    ['BASE_LEG_LAYOUT_POLICY.connectorInsetM', 1],
    ['BASE_LEG_LAYOUT_POLICY.connectorBackInsetM', 2],
    ['BASE_PLATFORM_RENDER_POLICY.heightM', 1],
  ]);

  for (const [expression, expectedCount] of exactUses) {
    assert.equal(source.split(expression).length - 1, expectedCount, expression);
  }
  assert.equal((source.match(/\b1e-6\b/gu) ?? []).length, 4);
  assert.match(
    source,
    /Math\.max\(0, Math\.min\(toeInset, diagLen \* BASE_PLINTH_POLICY\.connectorMaxToeRatio\)\)/u
  );
  assert.match(source, /Math\.max\(-L \+ inset, -inset - BASE_LEG_LAYOUT_POLICY\.connectorBackInsetM\)/u);
  assert.match(
    source,
    /readPositiveNumber\(\s*baseLegHeightM,\s*Math\.max\(0, baseH - BASE_PLATFORM_RENDER_POLICY\.heightM\)\s*\)/u
  );
});
