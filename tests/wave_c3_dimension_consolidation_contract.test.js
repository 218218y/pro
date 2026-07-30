import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');
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

function stripImports(rel, source) {
  const sourceFile = createSourceFile(path.join(root, rel), source, { label: 'wave-C3-parity' });
  const ranges = (sourceFile.body || [])
    .filter(node => node.type === 'ImportDeclaration')
    .map(node => [node.start, node.end])
    .sort((left, right) => left[0] - right[0]);
  let output = '';
  let cursor = 0;
  for (const [start, end] of ranges) {
    output += source.slice(cursor, start);
    cursor = end;
  }
  return (output + source.slice(cursor)).trimStart();
}

function compact(dependency) {
  return {
    specifier: dependency.specifier,
    kind: dependency.kind,
    syntax: dependency.syntax,
    importedSymbols: dependency.importedSymbols,
  };
}

test('Wave C3 consumers use one exact identity owner and preserve their non-import bodies', () => {
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
    assert.equal(sha256(stripImports(group.consumer, source)), group.bodySha256, group.id);
    assert.deepEqual(analysis.unresolvedDynamicImports, [], group.id);
    assert.deepEqual(analysis.forbiddenModuleSyntax, [], group.id);
  }
});

test('Wave C3 owners are direct static re-export surfaces with exact provenance', () => {
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

test('Wave C3 ledger retires every group atomically through exact consolidation provenance', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  for (const group of groups) {
    const consolidation = baseline.migrationConsolidations.find(item => item.id === group.id);
    assert.ok(consolidation, group.id);
    assert.deepEqual(consolidation.entryNumbers, group.entries, group.id);
    assert.equal(consolidation.fromFile, group.consumer, group.id);
    assert.deepEqual(
      consolidation.replacementStatement,
      {
        toFile: group.owner,
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: group.symbols,
      },
      group.id
    );
    assert.deepEqual(
      consolidation.replacementProvenance,
      {
        mode: 'identity-reexport',
        ownerFile: group.owner,
        sourceStatements: group.sourceStatements.map(statement => ({
          toFile: statement.toFile,
          kind: statement.kind,
          syntax: 'static-re-export',
          importedSymbols: statement.importedSymbols,
        })),
      },
      group.id
    );
    const retirements = baseline.migrationRetirements.filter(item =>
      group.entries.includes(item.entryNumber)
    );
    assert.equal(retirements.length, group.entries.length, group.id);
    assert.equal(
      retirements.every(
        item => item.mode === 'statement-consolidated' && item.replacementConsolidationId === group.id
      ),
      true,
      group.id
    );
  }
});
