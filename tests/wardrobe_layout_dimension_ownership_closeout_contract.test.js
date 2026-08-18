import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const comparisonOwnerRel = 'esm/shared/dimensions/wardrobe_layout_comparison_policy.ts';
const defaultResolutionOwnerRel = 'esm/shared/dimensions/wardrobe_default_resolution_policy.ts';
const cellOwnerRel = 'esm/shared/dimensions/cell_dimension_policy.ts';
const previewCompositionRel = 'esm/native/services/canvas_picking_hover_preview_modes_cell_dims.ts';
const clickCompositionRel = 'esm/native/services/canvas_picking_cell_dims_flow.ts';
const helperRel = 'esm/native/services/canvas_picking_local_helpers_cell_dims.ts';

const leafRels = Object.freeze([
  'esm/native/services/canvas_picking_hover_preview_modes_cell_dims_state.ts',
  'esm/native/services/canvas_picking_hover_preview_modes_cell_dims_inputs.ts',
  'esm/native/services/canvas_picking_hover_preview_modes_cell_dims_target.ts',
  'esm/native/services/canvas_picking_cell_dims_free_box_hover.ts',
  helperRel,
  'esm/native/services/canvas_picking_cell_dims_linear_width.ts',
]);
const ownerModuleRels = Object.freeze([comparisonOwnerRel, cellOwnerRel]);

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

test('Wardrobe Layout comparison and cell owners stay exact, narrow, import-free modules', () => {
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
    ['WARDROBE_LAYOUT_COMPARISON_POLICY', [clickCompositionRel, defaultResolutionOwnerRel]],
    ['CELL_DIMENSION_MATCH_POLICY', [previewCompositionRel]],
    ['CELL_DIMENSION_PREVIEW_POLICY', [previewCompositionRel]],
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
