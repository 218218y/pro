import test from 'node:test';
import assert from 'node:assert/strict';

const groups = Object.freeze([
  {
    id: 'stack-split-lower-setup-dimension-consolidation',
    entries: [48, 49, 50],
    consumer: 'esm/native/builder/build_stack_split_lower_setup.ts',
    owner: 'esm/shared/dimensions/stack_split_lower_setup_dimension_policy.ts',
    bodySha256: 'da05cdb74cf53df0c6619f6735ecfe8b4ccc08c619fe6a188e13fc09a271d207',
    consumerSpecifier: '../../shared/dimensions/stack_split_lower_setup_dimension_policy.js',
    symbols: [
      'CARCASS_INTERIOR_DIMENSIONS',
      'CARCASS_INTERIOR_GRID_POLICY',
      'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
      'EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY',
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
        toFile: 'esm/shared/dimensions/carcass_interior_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CARCASS_INTERIOR_DIMENSIONS'],
        ownerSpecifier: './carcass_interior_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/handle_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY'],
        ownerSpecifier: './handle_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/stack_split_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['DEFAULT_STACK_SPLIT_LOWER_HEIGHT'],
        ownerSpecifier: './stack_split_policy.js',
      },
    ],
  },
  {
    id: 'manual-layout-free-box-plans-dimension-consolidation',
    entries: [98, 99, 100],
    consumer: 'esm/native/services/canvas_picking_manual_layout_free_box_plans.ts',
    owner: 'esm/shared/dimensions/manual_layout_free_box_plans_dimension_policy.ts',
    bodySha256: 'b6674c338d2ace1c9cea31cbc5e7899345e51330698abb98ee514b55390e80f4',
    consumerSpecifier: '../../shared/dimensions/manual_layout_free_box_plans_dimension_policy.js',
    symbols: [
      'INTERIOR_ROD_RENDER_POLICY',
      'INTERIOR_SHELF_GEOMETRY_POLICY',
      'INTERIOR_STORAGE_BARRIER_POLICY',
      'INTERIOR_STORAGE_GRID_POLICY',
      'MATERIAL_THICKNESS_POLICY',
      'SKETCH_BOX_PREVIEW_CORE_POLICY',
    ],
    sourceStatements: [
      {
        toFile: 'esm/shared/dimensions/interior_fittings_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['INTERIOR_ROD_RENDER_POLICY', 'INTERIOR_SHELF_GEOMETRY_POLICY'],
        ownerSpecifier: './interior_fittings_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/interior_storage_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_GRID_POLICY'],
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
        importedSymbols: ['SKETCH_BOX_PREVIEW_CORE_POLICY'],
        ownerSpecifier: './sketch_box_preview_policy.js',
      },
    ],
  },
  {
    id: 'sketch-box-vertical-content-occupancy-dimension-consolidation',
    entries: [101, 102, 103],
    consumer: 'esm/native/services/canvas_picking_sketch_box_vertical_content_occupancy.ts',
    owner: 'esm/shared/dimensions/sketch_box_vertical_content_occupancy_dimension_policy.ts',
    bodySha256: 'd173a6d39b749e7c58d5492059ad3bc610cfc6e2a80da8809cff958a1da8c3e2',
    consumerSpecifier: '../../shared/dimensions/sketch_box_vertical_content_occupancy_dimension_policy.js',
    symbols: [
      'INTERIOR_SHELF_GEOMETRY_POLICY',
      'INTERIOR_STORAGE_BARRIER_POLICY',
      'INTERIOR_STORAGE_PREVIEW_POLICY',
      'MATERIAL_THICKNESS_POLICY',
      'SKETCH_BOX_PREVIEW_CORE_POLICY',
      'SKETCH_BOX_ROD_PREVIEW_POLICY',
      'SKETCH_BOX_SHELF_PREVIEW_POLICY',
      'SKETCH_BOX_STORAGE_PREVIEW_POLICY',
    ],
    sourceStatements: [
      {
        toFile: 'esm/shared/dimensions/interior_fittings_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['INTERIOR_SHELF_GEOMETRY_POLICY'],
        ownerSpecifier: './interior_fittings_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/interior_storage_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_PREVIEW_POLICY'],
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
        importedSymbols: [
          'SKETCH_BOX_PREVIEW_CORE_POLICY',
          'SKETCH_BOX_ROD_PREVIEW_POLICY',
          'SKETCH_BOX_SHELF_PREVIEW_POLICY',
          'SKETCH_BOX_STORAGE_PREVIEW_POLICY',
        ],
        ownerSpecifier: './sketch_box_preview_policy.js',
      },
    ],
  },
  {
    id: 'preview-interior-hover-apply-dimension-consolidation',
    entries: [108, 109, 110],
    consumer: 'esm/native/builder/render_preview_interior_hover_apply.ts',
    owner: 'esm/shared/dimensions/preview_interior_hover_apply_dimension_policy.ts',
    bodySha256: 'bea4815d9aa832160128dae21eec1eb84b5642ed4ef4784ab6ff7d7479a91b66',
    consumerSpecifier: '../../shared/dimensions/preview_interior_hover_apply_dimension_policy.js',
    symbols: [
      'INTERIOR_SHELF_GEOMETRY_POLICY',
      'INTERIOR_STORAGE_BARRIER_POLICY',
      'INTERIOR_STORAGE_PREVIEW_POLICY',
      'MATERIAL_THICKNESS_POLICY',
      'SKETCH_BOX_PREVIEW_CORE_POLICY',
      'SKETCH_BOX_ROD_PREVIEW_POLICY',
      'SKETCH_BOX_SHELF_PREVIEW_POLICY',
    ],
    sourceStatements: [
      {
        toFile: 'esm/shared/dimensions/interior_fittings_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['INTERIOR_SHELF_GEOMETRY_POLICY'],
        ownerSpecifier: './interior_fittings_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/interior_storage_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_PREVIEW_POLICY'],
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
        importedSymbols: [
          'SKETCH_BOX_PREVIEW_CORE_POLICY',
          'SKETCH_BOX_ROD_PREVIEW_POLICY',
          'SKETCH_BOX_SHELF_PREVIEW_POLICY',
        ],
        ownerSpecifier: './sketch_box_preview_policy.js',
      },
    ],
  },
  {
    id: 'chest-mode-inputs-dimension-consolidation',
    entries: [143, 144, 145],
    consumer: 'esm/native/builder/visuals_chest_mode_inputs.ts',
    owner: 'esm/shared/dimensions/chest_mode_inputs_dimension_policy.ts',
    bodySha256: '67033eab3147e3fd934fa60452e9f8789569dc0c2b041c7a28126285b9156b6b',
    consumerSpecifier: '../../shared/dimensions/chest_mode_inputs_dimension_policy.js',
    symbols: [
      'BASE_PLATFORM_RENDER_POLICY',
      'CHEST_CASTER_RENDER_POLICY',
      'CHEST_MODE_COMMODE_CONSTRAINTS_POLICY',
      'clampDimension',
      'cmToM',
    ],
    sourceStatements: [
      {
        toFile: 'esm/shared/dimensions/base_platform_render_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['BASE_PLATFORM_RENDER_POLICY'],
        ownerSpecifier: './base_platform_render_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/chest_mode_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CHEST_MODE_COMMODE_CONSTRAINTS_POLICY'],
        ownerSpecifier: './chest_mode_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/chest_structural_policy.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CHEST_CASTER_RENDER_POLICY'],
        ownerSpecifier: './chest_structural_policy.js',
      },
      {
        toFile: 'esm/shared/dimensions/units.ts',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['clampDimension', 'cmToM'],
        ownerSpecifier: './units.js',
      },
    ],
  },
]);

test('Wave C3 identity owners preserve every canonical binding identity', async () => {
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
