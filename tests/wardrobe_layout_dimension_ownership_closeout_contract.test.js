import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const moduleOwnerRel = 'esm/shared/dimensions/wardrobe_layout_policy.ts';
const comparisonOwnerRel = 'esm/shared/dimensions/wardrobe_layout_comparison_policy.ts';
const defaultResolutionOwnerRel = 'esm/shared/dimensions/wardrobe_default_resolution_policy.ts';
const cellOwnerRel = 'esm/shared/dimensions/cell_dimension_policy.ts';
const previewCompositionRel = 'esm/native/services/canvas_picking_hover_preview_modes_cell_dims.ts';
const clickCompositionRel = 'esm/native/services/canvas_picking_cell_dims_flow.ts';
const helperRel = 'esm/native/services/canvas_picking_local_helpers_cell_dims.ts';
const publicFacadeRels = Object.freeze(['esm/native/features/dimensions/index.ts']);
const leafRels = Object.freeze([
  'esm/native/services/canvas_picking_hover_preview_modes_cell_dims_state.ts',
  'esm/native/services/canvas_picking_hover_preview_modes_cell_dims_inputs.ts',
  'esm/native/services/canvas_picking_hover_preview_modes_cell_dims_target.ts',
  'esm/native/services/canvas_picking_cell_dims_free_box_hover.ts',
  helperRel,
  'esm/native/services/canvas_picking_cell_dims_linear_width.ts',
]);
const ownerModuleRels = Object.freeze([moduleOwnerRel, comparisonOwnerRel, cellOwnerRel]);
const facadeAbsolute = path.join(root, facadeRel);
const publicFacadeAbsolutes = new Set(
  publicFacadeRels.map(rel => path.normalize(path.join(root, rel)).toLowerCase())
);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const esmSourceFiles = listSourceFiles(path.join(root, 'esm'));
const sourceCache = new Map();
const sourceFileCache = new Map();
const analysisCache = new Map();

function listSourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(absolute));
    else if (entry.isFile() && /\.(?:js|mjs|ts|tsx)$/u.test(entry.name)) files.push(absolute);
  }
  return files;
}

function rel(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function sourceFor(file) {
  if (!sourceCache.has(file)) sourceCache.set(file, fs.readFileSync(file, 'utf8'));
  return sourceCache.get(file);
}

function sourceFileFor(file) {
  if (!sourceFileCache.has(file)) sourceFileCache.set(file, createSourceFile(file, sourceFor(file)));
  return sourceFileCache.get(file);
}

function analysisFor(file) {
  if (!analysisCache.has(file)) analysisCache.set(file, analyzeModuleDependencies(file, sourceFor(file)));
  return analysisCache.get(file);
}

function identifierName(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function memberPath(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type !== 'MemberExpression') return null;
  const objectPath = memberPath(node.object);
  const propertyName = identifierName(node.property);
  return objectPath && propertyName ? `${objectPath}.${propertyName}` : null;
}

function resolveModuleTarget(fromFile, specifier) {
  if (typeof specifier !== 'string') return null;
  let absolute;
  if (specifier.startsWith('@/')) absolute = path.join(root, 'esm', specifier.slice(2));
  else if (specifier.startsWith('.')) absolute = path.resolve(path.dirname(fromFile), specifier);
  else return null;
  return path
    .normalize(absolute)
    .replace(/\.(?:js|mjs|cjs)$/u, '.ts')
    .toLowerCase();
}

function isFacadeTarget(fromFile, specifier) {
  return resolveModuleTarget(fromFile, specifier) === path.normalize(facadeAbsolute).toLowerCase();
}

function isPublicFacadeTarget(fromFile, specifier) {
  return publicFacadeAbsolutes.has(resolveModuleTarget(fromFile, specifier));
}

function findVariableDeclarator(sourceFile, name) {
  let result = null;
  walkAst(sourceFile, node => {
    if (node?.type === 'VariableDeclarator' && identifierName(node.id) === name) result = node;
  });
  return result;
}

function findFunctionDeclaration(sourceFile, name) {
  let result = null;
  walkAst(sourceFile, node => {
    if (node?.type === 'FunctionDeclaration' && identifierName(node.id) === name) result = node;
  });
  return result;
}

function frozenObjectProperties(node) {
  assert.equal(node?.type, 'CallExpression');
  assert.equal(memberPath(node.callee), 'Object.freeze');
  assert.equal(node.arguments?.length, 1);
  const objectExpression = node.arguments[0];
  assert.equal(objectExpression?.type, 'ObjectExpression');
  return objectExpression.properties ?? [];
}

function focusedOwnerConsumers(symbol) {
  return esmSourceFiles
    .flatMap(file =>
      analysisFor(file)
        .imports.filter(dependency => dependency.importedSymbols.includes(symbol))
        .map(dependency => ({
          file: rel(file),
          kind: dependency.kind,
          syntax: dependency.syntax,
          aliases: dependency.bindings
            .filter(binding => binding.importedName === symbol)
            .map(binding => binding.localName)
            .filter(localName => localName !== symbol),
        }))
    )
    .sort((left, right) => left.file.localeCompare(right.file));
}

test('WARDROBE_LAYOUT_DIMENSIONS has no AST-visible production consumer or facade/barrel bypass', () => {
  const violations = [];
  const facadeReexportFiles = new Set();
  const productionFiles = esmSourceFiles.filter(
    file => path.normalize(file).toLowerCase() !== path.normalize(facadeAbsolute).toLowerCase()
  );

  for (const file of productionFiles) {
    const sourceFile = sourceFileFor(file);
    walkAst(sourceFile, node => {
      if (identifierName(node) === 'WARDROBE_LAYOUT_DIMENSIONS') {
        violations.push({ file: rel(file), kind: node.type, symbol: 'WARDROBE_LAYOUT_DIMENSIONS' });
      }
      const pathValue = memberPath(node);
      if (pathValue?.includes('WARDROBE_LAYOUT_DIMENSIONS.')) {
        violations.push({ file: rel(file), kind: 'member-chain', symbol: pathValue });
      }
    });

    const analysis = analysisFor(file);
    for (const dependency of analysis.imports) {
      const targetsFacade = isFacadeTarget(file, dependency.specifier);
      const targetsPublicFacade = isPublicFacadeTarget(file, dependency.specifier);
      const isReexport = ['static-re-export', 'type-re-export'].includes(dependency.syntax);
      if (targetsFacade && isReexport) facadeReexportFiles.add(rel(file));

      const approvedPublicReexport =
        publicFacadeAbsolutes.has(path.normalize(file).toLowerCase()) && targetsFacade && isReexport;
      if (approvedPublicReexport) continue;
      if (dependency.kind === 'type') continue;

      const exposesLayout =
        dependency.syntax === 'dynamic-import' ||
        dependency.importedSymbols.includes('*') ||
        dependency.importedSymbols.includes('WARDROBE_LAYOUT_DIMENSIONS');
      if ((targetsFacade || targetsPublicFacade) && exposesLayout) {
        violations.push({
          file: rel(file),
          kind: dependency.syntax,
          symbols: dependency.importedSymbols,
        });
      }
    }
  }

  assert.deepEqual(violations, []);
  assert.deepEqual([...facadeReexportFiles].sort(), [...publicFacadeRels].sort());
});

test('Wardrobe Layout focused owners are exact, narrow, import-free modules', () => {
  assert.equal(
    read(moduleOwnerRel).replace(/\r\n/gu, '\n').trim(),
    `export const WARDROBE_MODULE_LAYOUT_POLICY = Object.freeze({
  minSegmentWidthCm: 1,
  boundaryFullThicknessMultiplier: 1,
  boundarySharedThicknessMultiplier: 0.5,
});`
  );
  assert.equal(
    read(comparisonOwnerRel).replace(/\r\n/gu, '\n').trim(),
    `export const WARDROBE_LAYOUT_COMPARISON_POLICY = Object.freeze({
  autoWidthMatchToleranceCm: 0.51,
  valueEqualityToleranceCm: 0.0001,
});`
  );
  assert.equal(
    read(cellOwnerRel).replace(/\r\n/gu, '\n').trim(),
    `export const CELL_DIMENSION_MATCH_POLICY = Object.freeze({
  toleranceCm: 0.11,
});

export const CELL_DIMENSION_PREVIEW_POLICY = Object.freeze({
  minWidthM: 0.03,
  minHeightM: 0.03,
  widthClearanceM: 0.006,
  heightClearanceM: 0.006,
  minDepthM: 0.024,
  woodThicknessMinM: 0.004,
  woodThicknessMaxM: 0.01,
  woodThicknessScale: 0.5,
});`
  );

  for (const ownerRel of ownerModuleRels) {
    const source = read(ownerRel);
    const analysis = analysisFor(path.join(root, ownerRel));
    assert.deepEqual(analysis.imports, []);
    assert.deepEqual(analysis.unresolvedDynamicImports, []);
    assert.deepEqual(analysis.forbiddenModuleSyntax, []);
    assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared|WARDROBE_LAYOUT_DIMENSIONS/u);
  }

  const aggregateIdentifiers = [];
  for (const file of esmSourceFiles) {
    walkAst(sourceFileFor(file), node => {
      const name = identifierName(node);
      if (
        ['WARDROBE_LAYOUT_POLICY', 'CELL_DIMENSION_POLICY', 'WARDROBE_CELL_DIMENSION_POLICY'].includes(name)
      ) {
        aggregateIdentifiers.push({ file: rel(file), name });
      }
    });
  }
  assert.deepEqual(aggregateIdentifiers, []);
});

test('focused-owner production inventory is exact and policy objects are not aliased', () => {
  const expected = new Map([
    ['WARDROBE_MODULE_LAYOUT_POLICY', ['esm/native/builder/core_layout_compute.ts', facadeRel]],
    ['WARDROBE_LAYOUT_COMPARISON_POLICY', [clickCompositionRel, defaultResolutionOwnerRel, facadeRel]],
    ['CELL_DIMENSION_MATCH_POLICY', [previewCompositionRel, facadeRel]],
    ['CELL_DIMENSION_PREVIEW_POLICY', [previewCompositionRel, facadeRel]],
  ]);

  for (const [symbol, files] of expected) {
    const consumers = focusedOwnerConsumers(symbol);
    assert.deepEqual(
      consumers.map(consumer => consumer.file),
      [...files].sort()
    );
    assert.equal(
      consumers.every(consumer => consumer.kind === 'value'),
      true
    );
    assert.equal(
      consumers.every(consumer => consumer.syntax === 'static-import'),
      true
    );
    assert.equal(
      consumers.every(consumer => consumer.aliases.length === 0),
      true
    );
  }
});

test('public Wardrobe Layout projection is an exact frozen seven-key owner view', () => {
  const source = read(facadeRel);
  const sourceFile = createSourceFile(facadeRel, source);
  const projection = findVariableDeclarator(sourceFile, 'WARDROBE_LAYOUT_DIMENSIONS');
  assert.ok(projection);
  assert.equal(projection.parent?.kind, 'const');
  assert.equal(projection.parent?.parent?.type, 'ExportNamedDeclaration');

  const properties = frozenObjectProperties(projection.init);
  assert.deepEqual(
    properties.map(property => [identifierName(property.key), memberPath(property.value)]),
    [
      ['minSegmentWidthCm', 'WARDROBE_MODULE_LAYOUT_POLICY.minSegmentWidthCm'],
      ['boundaryFullThicknessMultiplier', 'WARDROBE_MODULE_LAYOUT_POLICY.boundaryFullThicknessMultiplier'],
      [
        'boundarySharedThicknessMultiplier',
        'WARDROBE_MODULE_LAYOUT_POLICY.boundarySharedThicknessMultiplier',
      ],
      ['autoWidthMatchToleranceCm', 'WARDROBE_LAYOUT_COMPARISON_POLICY.autoWidthMatchToleranceCm'],
      ['valueEqualityToleranceCm', 'WARDROBE_LAYOUT_COMPARISON_POLICY.valueEqualityToleranceCm'],
      ['cellDimsMatchToleranceCm', 'CELL_DIMENSION_MATCH_POLICY.toleranceCm'],
      ['cellDimsPreview', 'CELL_DIMENSION_PREVIEW_POLICY'],
    ]
  );

  const forbiddenProjectionNodes = [];
  walkAst(projection.init, node => {
    if (
      node?.type === 'SpreadElement' ||
      (node?.type === 'Literal' && typeof node.value === 'number') ||
      (node?.type === 'CallExpression' && node !== projection.init)
    ) {
      forbiddenProjectionNodes.push(node.type);
    }
  });
  assert.deepEqual(forbiddenProjectionNodes, []);

  const valueExports = new Set(
    collectNamedModuleExports(facadeRel, source)
      .filter(entry => entry.kind === 'value')
      .map(entry => entry.exportedName)
  );
  assert.equal(valueExports.has('WARDROBE_LAYOUT_DIMENSIONS'), true);

  const defaultResolutionSource = read(defaultResolutionOwnerRel);
  const defaultResolutionSourceFile = createSourceFile(defaultResolutionOwnerRel, defaultResolutionSource);
  const autoWidthFunction = findFunctionDeclaration(defaultResolutionSourceFile, 'isAutoWidthForDoors');
  assert.ok(autoWidthFunction);

  const comparisonOperators = [];
  const comparisonMembers = [];
  const forbiddenIdentifiers = [];
  walkAst(autoWidthFunction, node => {
    if (node?.type === 'BinaryExpression') comparisonOperators.push(node.operator);
    const value = memberPath(node);
    if (value) comparisonMembers.push(value);
    if (identifierName(node) === 'WARDROBE_LAYOUT_DIMENSIONS') {
      forbiddenIdentifiers.push('WARDROBE_LAYOUT_DIMENSIONS');
    }
  });
  assert.equal(comparisonOperators.includes('<'), true);
  assert.equal(comparisonOperators.includes('<='), false);
  assert.equal(
    comparisonMembers.includes('WARDROBE_LAYOUT_COMPARISON_POLICY.autoWidthMatchToleranceCm'),
    true
  );
  assert.deepEqual(forbiddenIdentifiers, []);

  const facadeReexport = analyzeModuleDependencies(path.join(root, facadeRel), source).imports.filter(
    dependency => dependency.importedSymbols.includes('isAutoWidthForDoors')
  );
  assert.deepEqual(
    facadeReexport.map(dependency => ({
      specifier: dependency.specifier,
      kind: dependency.kind,
      syntax: dependency.syntax,
      importedSymbols: dependency.importedSymbols,
      exportedSymbols: dependency.exportedSymbols,
    })),
    [
      {
        specifier: './dimensions/wardrobe_default_resolution_policy.js',
        kind: 'value',
        syntax: 'static-re-export',
        importedSymbols: [
          'normalizeWardrobeDimensionDefaultType',
          'resolveWardrobeTypeDefaults',
          'getDefaultDepthForWardrobeType',
          'getDefaultDoorsForWardrobeType',
          'getDefaultPerDoorWidthForWardrobeType',
          'resolveAutoWidthForDoors',
          'isAutoWidthForDoors',
          'getDefaultWidthForWardrobeType',
          'getDefaultHeightForWardrobeType',
          'getDefaultChestDrawersCount',
          'resolveDefaultWardrobeDimensions',
        ],
        exportedSymbols: [
          'normalizeWardrobeDimensionDefaultType',
          'resolveWardrobeTypeDefaults',
          'getDefaultDepthForWardrobeType',
          'getDefaultDoorsForWardrobeType',
          'getDefaultPerDoorWidthForWardrobeType',
          'resolveAutoWidthForDoors',
          'isAutoWidthForDoors',
          'getDefaultWidthForWardrobeType',
          'getDefaultHeightForWardrobeType',
          'getDefaultChestDrawersCount',
          'resolveDefaultWardrobeDimensions',
        ],
      },
    ]
  );
});

test('Cell Dimensions leaf modules receive owner values only through explicit composition scalars', () => {
  const previewComposition = read(previewCompositionRel);
  const clickComposition = read(clickCompositionRel);
  const helper = read(helperRel);

  assert.match(previewComposition, /matchToleranceCm: CELL_DIMENSION_MATCH_POLICY\.toleranceCm/u);
  for (const field of ['minWidthM', 'minHeightM', 'minDepthM']) {
    assert.match(previewComposition, new RegExp(`CELL_DIMENSION_PREVIEW_POLICY\\.${field}`, 'u'));
  }
  assert.match(
    clickComposition,
    /autoWidthMatchToleranceCm: WARDROBE_LAYOUT_COMPARISON_POLICY\.autoWidthMatchToleranceCm/u
  );
  assert.match(helper, /const EPS_CM = policy\.matchToleranceCm/u);
  assert.deepEqual(
    analysisFor(path.join(root, helperRel)).imports.filter(dependency =>
      dependency.specifier.includes('/shared/')
    ),
    []
  );

  for (const leafRel of leafRels) {
    const source = read(leafRel);
    const relevantOwnerImports = analysisFor(path.join(root, leafRel)).imports.filter(dependency =>
      /(?:cell_dimension_policy|wardrobe_layout_comparison_policy|wardrobe_layout_policy)\.js$/u.test(
        dependency.specifier
      )
    );
    assert.deepEqual(relevantOwnerImports, [], `${leafRel} must receive Wardrobe Layout policy scalars`);
    assert.doesNotMatch(
      source,
      /\b(?:WARDROBE_LAYOUT_POLICY|CELL_DIMENSION_POLICY|WARDROBE_CELL_DIMENSION_POLICY)\b|export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from/u
    );
  }
});
