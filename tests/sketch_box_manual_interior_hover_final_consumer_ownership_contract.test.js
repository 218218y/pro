import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  analyzeModuleDependencies,
  buildLayerContractProposal,
  collectLayerContractGraph,
  collectNamedModuleExports,
  evaluateLayerContract,
} from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/services/canvas_picking_interior_hover_manual_mode.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const companionRel = 'esm/shared/dimensions/sketch_box_preview_policy.ts';
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

function focusedImports() {
  return analyzeModuleDependencies(path.join(root, consumerRel), read(consumerRel))
    .imports.filter(dependency => dependency.specifier.includes('/dimensions/'))
    .map(dependency => ({
      specifier: dependency.specifier,
      kind: dependency.kind,
      syntax: dependency.syntax,
      symbols: [...dependency.importedSymbols],
    }));
}

function migrationEntry({ addedFile, addedSymbols, reason, removalCondition }) {
  return {
    from: 'services',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-22',
    reviewBy: '2026-10-18',
    fromFile: consumerRel,
    companionImport: {
      toFile: companionRel,
      kind: 'value',
      importedSymbols: ['SKETCH_BOX_ROD_PREVIEW_POLICY', 'SKETCH_BOX_SHELF_PREVIEW_POLICY'],
      syntax: 'static-import',
    },
    removedImport: {
      toFile: facadeRel,
      kind: 'value',
      importedSymbols: [
        'DRAWER_DIMENSIONS',
        'INTERIOR_FITTINGS_DIMENSIONS',
        'MATERIAL_DIMENSIONS',
        'SKETCH_BOX_DIMENSIONS',
      ],
      syntax: 'static-import',
    },
    addedImport: {
      toFile: addedFile,
      kind: 'value',
      importedSymbols: addedSymbols,
      syntax: 'static-import',
    },
    reason,
    removalCondition,
  };
}

const expectedEntries = [
  migrationEntry({
    addedFile: 'esm/shared/dimensions/drawer_sketch_policy.ts',
    addedSymbols: ['DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY'],
    reason:
      'The manual interior-hover flow replaces one legacy facade statement with the focused Drawer Sketch Internal Preview owner plus focused Sketch Box Rod and Shelf Preview owners on the existing services to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed manual interior-hover composition seam eliminates the extra Drawer Sketch statement without reintroducing the legacy facade.',
  }),
  migrationEntry({
    addedFile: 'esm/shared/dimensions/interior_fittings_policy.ts',
    addedSymbols: ['INTERIOR_ROD_PLACEMENT_POLICY', 'INTERIOR_SHELF_GEOMETRY_POLICY'],
    reason:
      'The manual interior-hover flow replaces one legacy facade statement with focused Interior Rod Placement and Shelf Geometry owners plus focused Sketch Box Rod and Shelf Preview owners on the existing services to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed manual interior-hover composition seam eliminates the extra Interior Fittings statement without reintroducing the legacy facade.',
  }),
  migrationEntry({
    addedFile: 'esm/shared/dimensions/interior_storage_policy.ts',
    addedSymbols: [
      'INTERIOR_STORAGE_BARRIER_POLICY',
      'INTERIOR_STORAGE_GRID_POLICY',
      'INTERIOR_STORAGE_PREVIEW_POLICY',
    ],
    reason:
      'The manual interior-hover flow replaces one legacy facade statement with focused Interior Storage Barrier, Grid, and Preview owners plus focused Sketch Box Rod and Shelf Preview owners on the existing services to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed manual interior-hover composition seam eliminates the extra Interior Storage statement without reintroducing the legacy facade.',
  }),
  migrationEntry({
    addedFile: 'esm/shared/dimensions/material_thickness_policy.ts',
    addedSymbols: ['MATERIAL_THICKNESS_POLICY'],
    reason:
      'The manual interior-hover flow replaces one legacy facade statement with the focused Material Thickness owner plus focused Sketch Box Rod and Shelf Preview owners on the existing services to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed manual interior-hover composition seam eliminates the extra Material Thickness statement without reintroducing the legacy facade.',
  }),
];

test('Manual Interior Hover imports exactly five focused owners and no aggregate path', () => {
  assert.deepEqual(focusedImports(), [
    {
      specifier: '../../shared/dimensions/drawer_sketch_policy.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: ['DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY'],
    },
    {
      specifier: '../../shared/dimensions/interior_fittings_policy.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: ['INTERIOR_ROD_PLACEMENT_POLICY', 'INTERIOR_SHELF_GEOMETRY_POLICY'],
    },
    {
      specifier: '../../shared/dimensions/interior_storage_policy.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: [
        'INTERIOR_STORAGE_BARRIER_POLICY',
        'INTERIOR_STORAGE_GRID_POLICY',
        'INTERIOR_STORAGE_PREVIEW_POLICY',
      ],
    },
    {
      specifier: '../../shared/dimensions/material_thickness_policy.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: ['MATERIAL_THICKNESS_POLICY'],
    },
    {
      specifier: '../../shared/dimensions/sketch_box_preview_policy.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: ['SKETCH_BOX_ROD_PREVIEW_POLICY', 'SKETCH_BOX_SHELF_PREVIEW_POLICY'],
    },
  ]);

  const source = read(consumerRel);
  const analysis = analyzeModuleDependencies(path.join(root, consumerRel), source);
  assert.equal(
    analysis.imports.some(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared')),
    false
  );
  assert.deepEqual(analysis.unresolvedDynamicImports, []);
  assert.doesNotMatch(
    source,
    /\b(?:DRAWER_DIMENSIONS|INTERIOR_FITTINGS_DIMENSIONS|MATERIAL_DIMENSIONS|SKETCH_BOX_DIMENSIONS|DRAWER_SKETCH_POLICY|INTERIOR_FITTINGS_POLICY|INTERIOR_ROD_POLICY|INTERIOR_SHELF_POLICY|INTERIOR_STORAGE_POLICY|SKETCH_BOX_PREVIEW_POLICY|drawerDims|previewDims|storageDims|shelfDims|rodDims|materialDims)\b|import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u
  );
});

test('Manual Interior Hover ledger appends exactly four entries after the unchanged 110-entry prefix', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.equal(baseline.migrationBudgets.length, 114);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 110)),
    '8d1d7cafcce3d1d360a559daf7a9fa00b92f32139a4f90cf80d6b6f061dfdd2d'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(110), expectedEntries);
  assert.equal(
    semanticSha256(baseline.migrationBudgets),
    'ee0f595edfec1a9b956d82c4257e160a4d6adf5302d2dcce40667c89720575d1'
  );
});

test('Manual Interior Hover owns current repository layer and facade totals', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  const graph = collectLayerContractGraph({ root });
  const report = evaluateLayerContract(graph, baseline, { currentDate: '2026-07-22' });
  assert.equal(report.ok, true);
  assert.equal(report.migrationBudgets.filter(entry => entry.active).length, 114);

  const observed = new Map(graph.edges.map(edge => [`${edge.from}>${edge.to}`, edge.importCount]));
  const activeMigrations = new Map();
  for (const entry of baseline.migrationBudgets) {
    const key = `${entry.from}>${entry.to}`;
    activeMigrations.set(key, (activeMigrations.get(key) ?? 0) + entry.additionalStatements);
  }
  assert.deepEqual(
    ['builder>shared', 'features>shared', 'services>shared', 'ui>shared'].map(key => ({
      key,
      observed: observed.get(key),
      migration: activeMigrations.get(key) ?? 0,
      reviewed: observed.get(key) - (activeMigrations.get(key) ?? 0),
      budget: baseline.rules.find(entry => `${entry.from}>${entry.to}` === key)?.maxImportCount,
    })),
    [
      { key: 'builder>shared', observed: 272, migration: 53, reviewed: 219, budget: 219 },
      { key: 'features>shared', observed: 59, migration: 1, reviewed: 58, budget: 58 },
      { key: 'services>shared', observed: 226, migration: 59, reviewed: 167, budget: 167 },
      { key: 'ui>shared', observed: 28, migration: 1, reviewed: 27, budget: 27 },
    ]
  );
  assert.equal(baseline.rules.length, 52);
  const proposal = buildLayerContractProposal(graph, baseline, { currentDate: '2026-07-22' });
  assert.equal(proposal.reviewRequired, false);
  assert.deepEqual(proposal.diff.addedEdges, []);
  assert.deepEqual(proposal.diff.ratchetViolations, []);
  assert.deepEqual(proposal.diff.migrationBudgetFailures, []);

  const esmFiles = listSourceFiles(path.join(root, 'esm'));
  const facadeDependencies = esmFiles.flatMap(file =>
    analyzeModuleDependencies(file, fs.readFileSync(file, 'utf8'))
      .imports.filter(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared'))
      .map(dependency => ({ file, ...dependency }))
  );
  const staticFacadeDependencies = facadeDependencies.filter(
    dependency => dependency.syntax === 'static-import'
  );
  assert.equal(new Set(staticFacadeDependencies.map(dependency => dependency.file)).size, 42);
  assert.equal(staticFacadeDependencies.length, 42);
  assert.equal(new Set(facadeDependencies.map(dependency => dependency.file)).size, 44);
  assert.equal(facadeDependencies.length, 45);

  const facadeExports = collectNamedModuleExports(facadeRel, read(facadeRel));
  assert.equal(
    new Set(facadeExports.filter(entry => entry.kind === 'value').map(entry => entry.exportedName)).size,
    89
  );
  assert.equal(
    new Set(facadeExports.filter(entry => entry.kind === 'type').map(entry => entry.exportedName)).size,
    10
  );
});

test('Sketch Box facade and branch production-consumer inventories are empty', () => {
  const esmFiles = listSourceFiles(path.join(root, 'esm'));
  const facadeAbsolute = path.join(root, facadeRel).replaceAll('\\', '/');
  const productionFiles = esmFiles.filter(file => file.replaceAll('\\', '/') !== facadeAbsolute);
  const sketchBoxConsumers = productionFiles.filter(file =>
    /\bSKETCH_BOX_DIMENSIONS\b/u.test(fs.readFileSync(file, 'utf8'))
  );
  assert.deepEqual(sketchBoxConsumers, []);

  for (const pattern of [
    /SKETCH_BOX_DIMENSIONS\.preview/u,
    /SKETCH_BOX_DIMENSIONS\.geometry/u,
    /SKETCH_BOX_DIMENSIONS\.freePlacement/u,
    /\bHANDLE_DIMENSIONS\b/u,
  ]) {
    assert.deepEqual(
      productionFiles.filter(file => pattern.test(fs.readFileSync(file, 'utf8'))),
      []
    );
  }
});

test('Manual Interior Hover keeps the ownership formulas structurally exact', () => {
  const source = read(consumerRel);
  assert.match(
    source,
    /const pad = Math\.min\(\s*DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY\.internalClampPadMaxM,\s*Math\.max\(\s*DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY\.internalClampPadMinM,\s*target\.woodThick \*\s*DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY\.internalClampPadWoodRatio\s*\)\s*\);/u
  );
  assert.match(
    source,
    /readGridDivisions\(\s*ui\.currentGridDivisions,\s*INTERIOR_STORAGE_GRID_POLICY\.gridDivisionsDefault,\s*8\s*\)/u
  );
  assert.match(
    source,
    /target\.bottomY \+ gridIndex \* step \+ INTERIOR_ROD_PLACEMENT_POLICY\.defaultYOffsetM/u
  );
  assert.match(
    source,
    /Math\.max\(\s*target\.woodThick,\s*target\.woodThick \* INTERIOR_SHELF_GEOMETRY_POLICY\.doubleThicknessMultiplier\s*\)/u
  );
  assert.match(source, /MATERIAL_THICKNESS_POLICY\.glassShelf\.thicknessM/u);
  assert.match(source, /INTERIOR_STORAGE_BARRIER_POLICY\.barrierFrontZOffsetM/u);
  assert.match(source, /INTERIOR_STORAGE_PREVIEW_POLICY\.previewThicknessMinM/u);
  assert.match(source, /SKETCH_BOX_ROD_PREVIEW_POLICY\.rodMinLengthM/u);
  assert.match(source, /SKETCH_BOX_SHELF_PREVIEW_POLICY\.shelfBraceClearanceM/u);
  assert.doesNotMatch(source, /shelf(?:Hover)?MinWidthM/u);
});
