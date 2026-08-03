import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ownerRel = 'esm/shared/dimensions/external_drawer_policy.ts';
const consumerImports = Object.freeze({
  'esm/native/builder/core_storage_compute_external_drawers.ts': Object.freeze([
    Object.freeze({
      specifier: '../../shared/dimensions/external_drawer_policy.js',
      symbols: Object.freeze([
        'EXTERNAL_DRAWER_BOX_POLICY',
        'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
        'EXTERNAL_DRAWER_SIZE_POLICY',
        'resolveExternalDrawerGeometry',
      ]),
    }),
    Object.freeze({
      specifier: '../../shared/dimensions/material_thickness_policy.js',
      symbols: Object.freeze(['MATERIAL_THICKNESS_POLICY']),
    }),
  ]),
  'esm/native/builder/render_interior_sketch_boxes_fronts_drawers_plan.ts': Object.freeze([
    Object.freeze({
      specifier: '../../shared/dimensions/drawer_sketch_policy.js',
      symbols: Object.freeze([
        'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
        'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
      ]),
    }),
    Object.freeze({
      specifier: '../../shared/dimensions/external_drawer_policy.js',
      symbols: Object.freeze(['EXTERNAL_DRAWER_SIZE_POLICY', 'resolveExternalDrawerGeometry']),
    }),
  ]),
  'esm/native/builder/render_interior_sketch_drawers_external_plan.ts': Object.freeze([
    Object.freeze({
      specifier: '../../shared/dimensions/drawer_sketch_policy.js',
      symbols: Object.freeze(['DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY']),
    }),
    Object.freeze({
      specifier: '../../shared/dimensions/external_drawer_policy.js',
      symbols: Object.freeze(['resolveExternalDrawerGeometry']),
    }),
  ]),
});
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

function focusedImports(rel) {
  return analyzeModuleDependencies(path.join(root, rel), read(rel))
    .imports.filter(dependency => dependency.specifier.includes('/dimensions/'))
    .map(dependency => ({
      specifier: dependency.specifier,
      kind: dependency.kind,
      syntax: dependency.syntax,
      symbols: [...dependency.importedSymbols],
      bindings: dependency.bindings.map(binding => ({
        importedName: binding.importedName,
        localName: binding.localName,
      })),
    }));
}

test('External Drawer consumers import only their exact focused owners without aliases or aggregates', () => {
  for (const [rel, expected] of Object.entries(consumerImports)) {
    const imports = focusedImports(rel);
    assert.deepEqual(
      imports.map(({ specifier, kind, syntax, symbols }) => ({
        specifier,
        kind,
        syntax,
        symbols,
      })),
      expected.map(entry => ({
        specifier: entry.specifier,
        kind: 'value',
        syntax: 'static-import',
        symbols: [...entry.symbols],
      })),
      rel
    );
    for (const dependency of imports) {
      assert.equal(
        dependency.bindings.every(binding => binding.importedName === binding.localName),
        true,
        `${rel} must not alias focused owner symbols`
      );
    }
    const source = read(rel);
    assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
    assert.doesNotMatch(
      source,
      /\b(?:DRAWER_DIMENSIONS|MATERIAL_DIMENSIONS|EXTERNAL_DRAWER_POLICY|DRAWER_SKETCH_POLICY|drawerDims)\b|import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u
    );
  }

  const ownerSource = read(ownerRel);
  const ownerAnalysis = analyzeModuleDependencies(path.join(root, ownerRel), ownerSource);
  assert.deepEqual(
    ownerAnalysis.imports
      .filter(dependency =>
        ['./door_system_policy.js', './material_thickness_policy.js'].includes(dependency.specifier)
      )
      .map(dependency => ({
        specifier: dependency.specifier,
        symbols: [...dependency.importedSymbols],
      })),
    [
      {
        specifier: './door_system_policy.js',
        symbols: ['HINGED_DOOR_MOUNT_POLICY'],
      },
      {
        specifier: './material_thickness_policy.js',
        symbols: ['MATERIAL_THICKNESS_POLICY'],
      },
    ]
  );
  assert.doesNotMatch(ownerSource, /wardrobe_dimension_tokens_shared/u);
  assert.doesNotMatch(ownerSource, /\b(?:DOOR_SYSTEM_DIMENSIONS|MATERIAL_DIMENSIONS)\b/u);
  const resolverSource = ownerSource.slice(
    ownerSource.indexOf('export function resolveExternalDrawerGeometry')
  );
  assert.doesNotMatch(resolverSource, /\bEXTERNAL_DRAWER_POLICY\b/u);
});
