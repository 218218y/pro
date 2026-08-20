import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/builder/post_build_sketch_door_cuts_apply.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('Sketch drawer door cuts import exactly the two focused owners without aliases', () => {
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
        specifier: '../../shared/dimensions/door_system_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['HINGED_DOOR_SPLIT_GEOMETRY_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/drawer_sketch_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['DRAWER_SKETCH_DOOR_CUT_POLICY'],
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
    /\b(?:DOOR_SYSTEM_DIMENSIONS|DRAWER_DIMENSIONS|HINGED_DOOR_SPLIT_POLICY|HINGED_DOOR_SYSTEM_POLICY|DRAWER_SKETCH_POLICY|splitDims|drawerDims|doorDims|cutDims)\b|import\s+\*\s+as|export\s+(?:type\s+)?(?:\*|\{)/u
  );
});
