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
    id: 'split-hover-preview-line-dimension-consolidation',
    consumer: 'esm/native/services/canvas_picking_split_hover_preview_line.ts',
    owner: 'esm/shared/dimensions/split_hover_preview_line_dimension_policy.ts',
    consumerSpecifier: '../../shared/dimensions/split_hover_preview_line_dimension_policy.js',
    symbols: [
      'BASE_PLINTH_POLICY',
      'CARCASS_INTERIOR_GRID_POLICY',
      'CARCASS_SHELL_DIMENSIONS',
      'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
      'EXTERNAL_DRAWER_SIZE_POLICY',
      'HINGED_DOOR_SPLIT_GEOMETRY_POLICY',
      'INTERIOR_STORAGE_BARRIER_POLICY',
      'MATERIAL_THICKNESS_POLICY',
    ],
    sourceStatements: [
      {
        toFile: 'esm/shared/dimensions/base_plinth_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['BASE_PLINTH_POLICY'],
        ownerSpecifier: './base_plinth_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/carcass_interior_grid_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CARCASS_INTERIOR_GRID_POLICY'],
        ownerSpecifier: './carcass_interior_grid_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/carcass_shell_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CARCASS_SHELL_DIMENSIONS'],
        ownerSpecifier: './carcass_shell_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/door_system_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['HINGED_DOOR_SPLIT_GEOMETRY_POLICY'],
        ownerSpecifier: './door_system_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/external_drawer_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['EXTERNAL_DRAWER_FRONT_RENDER_POLICY', 'EXTERNAL_DRAWER_SIZE_POLICY'],
        ownerSpecifier: './external_drawer_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/interior_storage_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['INTERIOR_STORAGE_BARRIER_POLICY'],
        ownerSpecifier: './interior_storage_policy.js',
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
  {
    id: 'interior-rod-clearance-dimension-consolidation',
    consumer: 'esm/native/builder/render_interior_rod_clearance.ts',
    owner: 'esm/shared/dimensions/interior_rod_clearance_dimension_policy.ts',
    consumerSpecifier: '../../shared/dimensions/interior_rod_clearance_dimension_policy.js',
    symbols: [
      'CARCASS_INTERIOR_GRID_POLICY',
      'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
      'FOLDED_CLOTHES_VISUAL_POLICY',
      'HANGER_VISUAL_POLICY',
      'INTERIOR_PRESET_ROD_FACTORS_POLICY',
      'INTERIOR_PRESET_SHELF_ROWS_POLICY',
      'INTERIOR_ROD_PLACEMENT_POLICY',
      'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
      'INTERIOR_STORAGE_BARRIER_POLICY',
      'MATERIAL_THICKNESS_POLICY',
      'SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY',
    ],
    sourceStatements: [
      {
        toFile: 'esm/shared/dimensions/carcass_interior_grid_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CARCASS_INTERIOR_GRID_POLICY'],
        ownerSpecifier: './carcass_interior_grid_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/content_visual_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['FOLDED_CLOTHES_VISUAL_POLICY', 'HANGER_VISUAL_POLICY'],
        ownerSpecifier: './content_visual_policy.js',
      },
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
        importedSymbols: [
          'INTERIOR_PRESET_ROD_FACTORS_POLICY',
          'INTERIOR_PRESET_SHELF_ROWS_POLICY',
          'INTERIOR_ROD_PLACEMENT_POLICY',
          'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
        ],
        ownerSpecifier: './interior_fittings_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/interior_storage_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['INTERIOR_STORAGE_BARRIER_POLICY'],
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
        toFile: 'esm/shared/dimensions/sketch_box_geometry_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY'],
        ownerSpecifier: './sketch_box_geometry_policy.js',
      },
    ],
  },
  {
    id: 'chest-mode-build-dimension-consolidation',
    consumer: 'esm/native/builder/visuals_chest_mode_build.ts',
    owner: 'esm/shared/dimensions/chest_mode_build_dimension_policy.ts',
    consumerSpecifier: '../../shared/dimensions/chest_mode_build_dimension_policy.js',
    symbols: [
      'BASE_LEG_LAYOUT_POLICY',
      'BASE_PLATFORM_RENDER_POLICY',
      'BASE_PLINTH_POLICY',
      'CHEST_CASTER_RENDER_POLICY',
      'CHEST_CONNECTOR_POLICY',
      'CHEST_DRAWER_GEOMETRY_POLICY',
      'CHEST_MODE_COMMODE_CONSTRAINTS_POLICY',
      'CHEST_MODE_COMMODE_RENDER_POLICY',
      'CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY',
      'CHEST_MOTION_POLICY',
      'CHEST_SHELL_POLICY',
      'HINGED_DOOR_MOUNT_POLICY',
      'resolveDoorMountThicknessesFromConfig',
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
        toFile: 'esm/shared/dimensions/chest_mode_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: [
          'CHEST_MODE_COMMODE_CONSTRAINTS_POLICY',
          'CHEST_MODE_COMMODE_RENDER_POLICY',
          'CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY',
        ],
        ownerSpecifier: './chest_mode_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/chest_structural_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: [
          'CHEST_CASTER_RENDER_POLICY',
          'CHEST_CONNECTOR_POLICY',
          'CHEST_DRAWER_GEOMETRY_POLICY',
          'CHEST_MOTION_POLICY',
          'CHEST_SHELL_POLICY',
        ],
        ownerSpecifier: './chest_structural_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/door_mount_thickness_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['resolveDoorMountThicknessesFromConfig'],
        ownerSpecifier: './door_mount_thickness_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/door_system_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['HINGED_DOOR_MOUNT_POLICY'],
        ownerSpecifier: './door_system_policy.js',
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

test('Dimension composition primary consumers use one exact identity owner and preserve their non-import bodies', () => {
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

test('Dimension composition primary owners are direct static re-export surfaces with exact provenance', () => {
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
