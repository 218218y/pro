import test from 'node:test';
import assert from 'node:assert/strict';

const groups = Object.freeze([
  {
    id: 'interior-hover-manual-mode-dimension-consolidation',
    entries: [111, 112, 113, 114],
    consumer: 'esm/native/services/canvas_picking_interior_hover_manual_mode.ts',
    owner: 'esm/shared/dimensions/interior_hover_manual_mode_dimension_policy.ts',
    bodySha256: 'b01b5027790e558b081004548407fea024363aa52b77cd7d5e98aac94e3f3f54',
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
    entries: [126, 127, 128, 129],
    consumer: 'esm/native/builder/core_carcass_shared.ts',
    owner: 'esm/shared/dimensions/core_carcass_dimension_policy.ts',
    bodySha256: '734e29a457448bb224997d11a74b9c835ed162fffa76a88ae3e1773ffc068a9e',
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

test('Wave C2 identity owners preserve every canonical binding identity', async () => {
  for (const group of groups) {
    const owner = await import(`../${group.owner}`);
    for (const statement of group.sourceStatements) {
      const source = await import(`../${statement.toFile}`);
      for (const symbol of statement.importedSymbols) {
        assert.equal(owner[symbol], source[symbol], `${group.id}:${symbol}`);
      }
    }
  }
});
