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
    bodySha256: 'be5d0358ba7049038f89c505c743c89f84c99b7576288e882177e3d7076684ee',
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

function stripImports(rel, source) {
  const sourceFile = createSourceFile(path.join(root, rel), source, { label: 'wave-C2-parity' });
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

test('Wave C2 consumers use one exact identity owner and preserve their non-import bodies', () => {
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

test('Wave C2 owners are direct static re-export surfaces with exact provenance', () => {
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

test('Wave C2 ledger retires every group atomically through exact consolidation provenance', () => {
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
