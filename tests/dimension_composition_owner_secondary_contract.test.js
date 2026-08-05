import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const groups = Object.freeze([
  {
    id: 'interior-hover-manual-mode-dimension-consolidation',
    consumer: 'esm/native/services/canvas_picking_interior_hover_manual_mode.ts',
    owner: 'esm/shared/dimensions/interior_hover_manual_mode_dimension_policy.ts',
    consumerSpecifier: '../../shared/dimensions/interior_hover_manual_mode_dimension_policy.js',
    symbols: [
      'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
      'INTERIOR_ROD_PLACEMENT_POLICY',
      'INTERIOR_SHELF_GEOMETRY_POLICY',
      'INTERIOR_STORAGE_BARRIER_POLICY',
      'INTERIOR_STORAGE_GRID_POLICY',
      'INTERIOR_STORAGE_PREVIEW_POLICY',
      'MATERIAL_THICKNESS_POLICY',
      'SKETCH_BOX_ROD_PREVIEW_POLICY',
      'SKETCH_BOX_SHELF_PREVIEW_POLICY',
    ],
    sourceStatements: [
      {
        toFile: 'esm/shared/dimensions/drawer_sketch_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY'],
        ownerSpecifier: './drawer_sketch_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/interior_fittings_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['INTERIOR_ROD_PLACEMENT_POLICY', 'INTERIOR_SHELF_GEOMETRY_POLICY'],
        ownerSpecifier: './interior_fittings_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/interior_storage_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: [
          'INTERIOR_STORAGE_BARRIER_POLICY',
          'INTERIOR_STORAGE_GRID_POLICY',
          'INTERIOR_STORAGE_PREVIEW_POLICY',
        ],
        ownerSpecifier: './interior_storage_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/material_thickness_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['MATERIAL_THICKNESS_POLICY'],
        ownerSpecifier: './material_thickness_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['SKETCH_BOX_ROD_PREVIEW_POLICY', 'SKETCH_BOX_SHELF_PREVIEW_POLICY'],
        ownerSpecifier: './sketch_box_preview_policy.js',
      },
    ],
  },
  {
    id: 'core-carcass-dimension-consolidation',
    consumer: 'esm/native/builder/core_carcass_shared.ts',
    owner: 'esm/shared/dimensions/core_carcass_dimension_policy.ts',
    consumerSpecifier: '../../shared/dimensions/core_carcass_dimension_policy.js',
    symbols: [
      'BASE_LEG_LAYOUT_POLICY',
      'BASE_PLATFORM_RENDER_POLICY',
      'BASE_PLINTH_POLICY',
      'CARCASS_SHELL_DIMENSIONS',
      'MATERIAL_THICKNESS_POLICY',
    ],
    sourceStatements: [
      {
        toFile: 'esm/shared/dimensions/base_leg_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['BASE_LEG_LAYOUT_POLICY'],
        ownerSpecifier: './base_leg_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/base_platform_render_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['BASE_PLATFORM_RENDER_POLICY'],
        ownerSpecifier: './base_platform_render_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/base_plinth_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['BASE_PLINTH_POLICY'],
        ownerSpecifier: './base_plinth_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/carcass_shell_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CARCASS_SHELL_DIMENSIONS'],
        ownerSpecifier: './carcass_shell_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/material_thickness_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['MATERIAL_THICKNESS_POLICY'],
        ownerSpecifier: './material_thickness_policy.js',
      },
    ],
  },
]);

function compact(dependency) {
  return {
    specifier: dependency.specifier,
    kind: dependency.kind,
    syntax: dependency.syntax,
    importedSymbols: dependency.importedSymbols,
  };
}

test('Dimension composition secondary consumers use one exact identity owner and preserve their non-import bodies', () => {
  for (const group of groups) {
    const source = read(group.consumer);
    const analysis = analyzeModuleDependencies(path.join(root, group.consumer), source);
    const dimensionImports = analysis.imports
      .filter(dependency => dependency.specifier.includes('/shared/dimensions/'))
      .map(compact);
    assert.deepEqual(
      dimensionImports,
      [
        {
          specifier: group.consumerSpecifier,
          kind: 'value',
          syntax: 'static-import',
          importedSymbols: group.symbols,
        },
      ],
      group.id
    );
    const binding = analysis.imports.find(dependency => dependency.specifier === group.consumerSpecifier);
    assert.equal(
      binding.bindings.every(item => item.importedName === item.localName),
      true,
      group.id
    );
    assert.deepEqual(analysis.unresolvedDynamicImports, [], group.id);
    assert.deepEqual(analysis.forbiddenModuleSyntax, [], group.id);
  }
});

test('Dimension composition secondary owners are direct static re-export surfaces with exact provenance', () => {
  for (const group of groups) {
    const source = read(group.owner);
    const analysis = analyzeModuleDependencies(path.join(root, group.owner), source);
    assert.deepEqual(
      analysis.imports.map(compact),
      group.sourceStatements.map(statement => ({
        specifier: statement.ownerSpecifier,
        kind: 'value',
        syntax: 'static-re-export',
        importedSymbols: statement.importedSymbols,
      })),
      group.id
    );
    assert.doesNotMatch(source, /\b(?:const|let|var|function|class|new|Object\.freeze)\b/u, group.id);
    assert.doesNotMatch(source, /import\s+\*|import\s*\(|export\s+\*/u, group.id);
  }
});
