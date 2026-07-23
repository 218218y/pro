import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
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

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

const semanticSha256 = value => createHash('sha256').update(stableJson(value)).digest('hex');

function listSourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(absolute));
    else if (entry.isFile() && /\.(?:js|mjs|ts|tsx)$/u.test(entry.name)) files.push(absolute);
  }
  return files;
}

function definedExternalDrawerSymbols(file, source) {
  const definitions = [];
  const sourceFile = createSourceFile(file, source);
  walkAst(sourceFile, node => {
    if (node?.type === 'FunctionDeclaration' && node.id?.name === 'resolveExternalDrawerGeometry') {
      definitions.push('resolveExternalDrawerGeometry');
    }
    if (node?.type === 'TSTypeAliasDeclaration' && node.id?.name === 'ExternalDrawerGeometry') {
      definitions.push('ExternalDrawerGeometry');
    }
  });
  return definitions.sort();
}

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

const expectedEntries = Object.freeze([
  {
    from: 'builder',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-23',
    reviewBy: '2026-10-18',
    fromFile: 'esm/native/builder/core_storage_compute_external_drawers.ts',
    companionImport: {
      toFile: ownerRel,
      kind: 'value',
      importedSymbols: [
        'EXTERNAL_DRAWER_BOX_POLICY',
        'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
        'EXTERNAL_DRAWER_SIZE_POLICY',
        'resolveExternalDrawerGeometry',
      ],
      syntax: 'static-import',
    },
    removedImport: {
      toFile: facadeRel,
      kind: 'value',
      importedSymbols: ['DRAWER_DIMENSIONS', 'MATERIAL_DIMENSIONS', 'resolveExternalDrawerGeometry'],
      syntax: 'static-import',
    },
    addedImport: {
      toFile: 'esm/shared/dimensions/material_thickness_policy.ts',
      kind: 'value',
      importedSymbols: ['MATERIAL_THICKNESS_POLICY'],
      syntax: 'static-import',
    },
    reason:
      'The external-drawer core compute flow replaces one legacy facade statement with the focused External Drawer geometry and rendering owners plus the canonical Material Thickness owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed external-drawer compute composition seam eliminates the extra Material Thickness statement without reintroducing the legacy facade.',
  },
  {
    from: 'builder',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-23',
    reviewBy: '2026-10-18',
    fromFile: 'esm/native/builder/render_interior_sketch_boxes_fronts_drawers_plan.ts',
    companionImport: {
      toFile: ownerRel,
      kind: 'value',
      importedSymbols: ['EXTERNAL_DRAWER_SIZE_POLICY', 'resolveExternalDrawerGeometry'],
      syntax: 'static-import',
    },
    removedImport: {
      toFile: facadeRel,
      kind: 'value',
      importedSymbols: ['DRAWER_DIMENSIONS', 'resolveExternalDrawerGeometry'],
      syntax: 'static-import',
    },
    addedImport: {
      toFile: 'esm/shared/dimensions/drawer_sketch_policy.ts',
      kind: 'value',
      importedSymbols: ['DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY', 'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY'],
      syntax: 'static-import',
    },
    reason:
      'The Sketch Box external-drawer planning flow replaces one legacy facade statement with the focused External Drawer geometry owner plus focused Drawer Sketch collision-alignment and external-preview owners on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Sketch Box external-drawer planning composition seam eliminates the extra Drawer Sketch statement without reintroducing the legacy facade.',
  },
  {
    from: 'builder',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-23',
    reviewBy: '2026-10-18',
    fromFile: 'esm/native/builder/render_interior_sketch_drawers_external_plan.ts',
    companionImport: {
      toFile: ownerRel,
      kind: 'value',
      importedSymbols: ['resolveExternalDrawerGeometry'],
      syntax: 'static-import',
    },
    removedImport: {
      toFile: facadeRel,
      kind: 'value',
      importedSymbols: ['DRAWER_DIMENSIONS', 'resolveExternalDrawerGeometry'],
      syntax: 'static-import',
    },
    addedImport: {
      toFile: 'esm/shared/dimensions/drawer_sketch_policy.ts',
      kind: 'value',
      importedSymbols: ['DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY'],
      syntax: 'static-import',
    },
    reason:
      'The Sketch external-drawer planning flow replaces one legacy facade statement with the focused External Drawer geometry owner plus the focused Drawer Sketch external-preview owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Sketch external-drawer planning composition seam eliminates the extra Drawer Sketch statement without reintroducing the legacy facade.',
  },
]);

test('External Drawer geometry type and resolver have one focused definition and facade-only compatibility exports', () => {
  const definitions = listSourceFiles(path.join(root, 'esm'))
    .flatMap(file =>
      definedExternalDrawerSymbols(file, fs.readFileSync(file, 'utf8')).map(symbol => ({
        file: path.relative(root, file).replaceAll('\\', '/'),
        symbol,
      }))
    )
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
  assert.deepEqual(definitions, [
    { file: ownerRel, symbol: 'ExternalDrawerGeometry' },
    { file: ownerRel, symbol: 'resolveExternalDrawerGeometry' },
  ]);

  const facadeSource = read(facadeRel);
  const facadeAnalysis = analyzeModuleDependencies(path.join(root, facadeRel), facadeSource);
  const facadeOwnerImports = facadeAnalysis.imports
    .filter(dependency => dependency.specifier === './dimensions/external_drawer_policy.js')
    .map(dependency => ({
      kind: dependency.kind,
      syntax: dependency.syntax,
      symbols: [...dependency.importedSymbols],
    }));
  assert.deepEqual(facadeOwnerImports, [
    {
      kind: 'type',
      syntax: 'type-import',
      symbols: ['ExternalDrawerGeometry'],
    },
    {
      kind: 'value',
      syntax: 'static-import',
      symbols: ['EXTERNAL_DRAWER_POLICY', 'resolveExternalDrawerGeometry'],
    },
  ]);
  assert.match(facadeSource, /export \{ resolveExternalDrawerGeometry \};/u);
  assert.match(facadeSource, /export type \{ ExternalDrawerGeometry \};/u);
  assert.doesNotMatch(
    facadeSource,
    /(?:function\s+resolveExternalDrawerGeometry|type\s+ExternalDrawerGeometry\s*=)/u
  );
});

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

test('External Drawer migration appends exactly entries 115-117 after the unchanged 114-entry prefix', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.ok(baseline.migrationBudgets.length >= 117);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 114)),
    'ee0f595edfec1a9b956d82c4257e160a4d6adf5302d2dcce40667c89720575d1'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(114, 117), expectedEntries);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 117)),
    '7f6b6f681f71b979353ba75aaffe776ac13f8b339f90d6bb56bcb77452fb24d8'
  );
});
