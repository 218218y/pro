import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/builder/module_loop_pipeline_module_depth.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('Module Depth imports exactly three focused owners without aliases or aggregate policies', () => {
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
        specifier: '../../shared/dimensions/carcass_interior_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CARCASS_INTERIOR_DIMENSIONS'],
      },
      {
        specifier: '../../shared/dimensions/carcass_shell_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CARCASS_SHELL_DIMENSIONS'],
      },
      {
        specifier: '../../shared/dimensions/units.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CM_PER_METER'],
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
  assert.doesNotMatch(source, /\b(?:CARCASS_DEPTH_POLICY|MODULE_DEPTH_POLICY|CARCASS_GEOMETRY_POLICY)\b/u);
  assert.doesNotMatch(
    source,
    /const\s+[A-Za-z_$][\w$]*\s*=\s*(?:CARCASS_INTERIOR_DIMENSIONS|CARCASS_SHELL_DIMENSIONS)\s*;/u
  );
});

test('Module Depth preserves the exact focused-owner fields and depth formulas', () => {
  const source = read(consumerRel);

  assert.equal((source.match(/CARCASS_SHELL_DIMENSIONS\.sideDepthClearanceM/gu) ?? []).length, 1);
  assert.equal((source.match(/CARCASS_INTERIOR_DIMENSIONS\.internalBackInsetM/gu) ?? []).length, 1);
  assert.equal((source.match(/depthCmActive \/ CM_PER_METER/gu) ?? []).length, 1);
  assert.match(
    source,
    /const safePanelDepth = Math\.max\(woodThick, panelDepth\);[\s\S]*const requestedClearance = Math\.max\(0, CARCASS_SHELL_DIMENSIONS\.sideDepthClearanceM\);[\s\S]*return Math\.min\(requestedClearance, Math\.max\(0, safePanelDepth - woodThick\)\);/u
  );
  assert.match(
    source,
    /const moduleInternalZ =\s*-runtime\.D \/ 2 \+ moduleInternalDepth \/ 2 \+ CARCASS_INTERIOR_DIMENSIONS\.internalBackInsetM;/u
  );
  assert.match(source, /const moduleHitDepth = Math\.max\(moduleTotalDepth, moduleDoorDepth\);/u);
  assert.match(source, /const moduleHitZ = -runtime\.D \/ 2 \+ moduleHitDepth \/ 2;/u);
});
