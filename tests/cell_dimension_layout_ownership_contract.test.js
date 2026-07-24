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
const cellOwnerRel = 'esm/shared/dimensions/cell_dimension_policy.ts';
const comparisonOwnerRel = 'esm/shared/dimensions/wardrobe_layout_comparison_policy.ts';
const moduleOwnerRel = 'esm/shared/dimensions/wardrobe_layout_policy.ts';
const previewConsumerRel = 'esm/native/services/canvas_picking_hover_preview_modes_cell_dims.ts';
const helpersConsumerRel = 'esm/native/services/canvas_picking_local_helpers_cell_dims.ts';
const previewStateRel = 'esm/native/services/canvas_picking_hover_preview_modes_cell_dims_state.ts';
const previewInputsRel = 'esm/native/services/canvas_picking_hover_preview_modes_cell_dims_inputs.ts';
const previewTargetRel = 'esm/native/services/canvas_picking_hover_preview_modes_cell_dims_target.ts';
const freeBoxHoverRel = 'esm/native/services/canvas_picking_cell_dims_free_box_hover.ts';
const clickFlowRel = 'esm/native/services/canvas_picking_cell_dims_flow.ts';
const clickContractsRel = 'esm/native/services/canvas_picking_cell_dims_contracts.ts';
const linearContextRel = 'esm/native/services/canvas_picking_cell_dims_linear_shared.ts';
const linearWidthRel = 'esm/native/services/canvas_picking_cell_dims_linear_width.ts';
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

function exportedNames(rel) {
  const names = [];
  const source = read(rel);
  walkAst(createSourceFile(rel, source), node => {
    if (node?.type !== 'ExportNamedDeclaration') return;
    const declaration = node.declaration;
    if (declaration?.type !== 'VariableDeclaration') return;
    for (const declarator of declaration.declarations ?? []) {
      if (declarator.id?.type === 'Identifier') names.push(declarator.id.name);
    }
  });
  return names.sort();
}

function directImportSummary(rel) {
  return analyzeModuleDependencies(path.join(root, rel), read(rel)).imports.map(
    ({ specifier, kind, syntax, importedSymbols, bindings }) => ({
      specifier,
      kind,
      syntax,
      importedSymbols,
      aliases: bindings.filter(binding => binding.importedName !== binding.localName),
    })
  );
}

function facadeConsumersFor(symbol) {
  const esmRoot = path.join(root, 'esm');
  return listSourceFiles(esmRoot)
    .filter(file => path.relative(root, file).replaceAll('\\', '/') !== facadeRel)
    .flatMap(file => {
      const rel = path.relative(root, file).replaceAll('\\', '/');
      const source = fs.readFileSync(file, 'utf8');
      return analyzeModuleDependencies(file, source)
        .imports.filter(
          dependency =>
            dependency.specifier.endsWith('/wardrobe_dimension_tokens_shared.js') &&
            dependency.importedSymbols.includes(symbol)
        )
        .map(() => rel);
    })
    .sort();
}

function productionIdentifierFiles(symbol) {
  const esmRoot = path.join(root, 'esm');
  return listSourceFiles(esmRoot)
    .filter(file => path.relative(root, file).replaceAll('\\', '/') !== facadeRel)
    .filter(file => {
      let found = false;
      const source = fs.readFileSync(file, 'utf8');
      walkAst(createSourceFile(file, source), node => {
        if (node?.type === 'Identifier' && node.name === symbol) found = true;
      });
      return found;
    })
    .map(file => path.relative(root, file).replaceAll('\\', '/'))
    .sort();
}

const expectedEntry = Object.freeze({
  from: 'services',
  to: 'shared',
  additionalStatements: 1,
  owner: 'dimension-ownership-migration',
  reviewedAt: '2026-07-24',
  reviewBy: '2026-10-18',
  fromFile: helpersConsumerRel,
  companionImport: {
    toFile: cellOwnerRel,
    kind: 'value',
    importedSymbols: ['CELL_DIMENSION_MATCH_POLICY'],
    syntax: 'static-import',
  },
  removedImport: {
    toFile: facadeRel,
    kind: 'value',
    importedSymbols: ['WARDROBE_DEFAULTS', 'WARDROBE_LAYOUT_DIMENSIONS'],
    syntax: 'static-import',
  },
  addedImport: {
    toFile: 'esm/shared/dimensions/wardrobe_defaults.ts',
    kind: 'value',
    importedSymbols: ['WARDROBE_DEFAULTS'],
    syntax: 'static-import',
  },
  reason:
    'The Cell Dimensions local-hover helper replaces one legacy facade statement with the focused Cell Dimension Match owner plus the canonical Wardrobe Defaults owner on the existing services to shared edge.',
  removalCondition:
    'Remove this entry when a reviewed Cell Dimensions hover composition seam eliminates the extra Wardrobe Defaults statement without reintroducing the legacy facade.',
});

test('Cell Dimension and Wardrobe Layout Comparison owners are exact, narrow, import-free modules', () => {
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
  assert.equal(
    read(comparisonOwnerRel).replace(/\r\n/gu, '\n').trim(),
    `export const WARDROBE_LAYOUT_COMPARISON_POLICY = Object.freeze({
  autoWidthMatchToleranceCm: 0.51,
  valueEqualityToleranceCm: 0.0001,
});`
  );
  assert.deepEqual(exportedNames(cellOwnerRel), [
    'CELL_DIMENSION_MATCH_POLICY',
    'CELL_DIMENSION_PREVIEW_POLICY',
  ]);
  assert.deepEqual(exportedNames(comparisonOwnerRel), ['WARDROBE_LAYOUT_COMPARISON_POLICY']);
  for (const rel of [cellOwnerRel, comparisonOwnerRel]) {
    const analysis = analyzeModuleDependencies(path.join(root, rel), read(rel));
    assert.deepEqual(analysis.imports, []);
    assert.deepEqual(analysis.unresolvedDynamicImports, []);
    assert.deepEqual(analysis.forbiddenModuleSyntax, []);
    assert.doesNotMatch(read(rel), /\b(?:CELL_DIMENSION_POLICY|WARDROBE_CELL_DIMENSION_POLICY)\b/u);
  }
});

test('Wardrobe Layout facade projects all seven keys directly from focused owners in public order', () => {
  const facade = read(facadeRel);
  const imports = directImportSummary(facadeRel).filter(dependency =>
    [cellOwnerRel, comparisonOwnerRel, moduleOwnerRel].some(rel =>
      dependency.specifier.endsWith(`/${path.posix.basename(rel).replace(/\.ts$/u, '.js')}`)
    )
  );
  assert.deepEqual(imports, [
    {
      specifier: './dimensions/cell_dimension_policy.js',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['CELL_DIMENSION_MATCH_POLICY', 'CELL_DIMENSION_PREVIEW_POLICY'],
      aliases: [],
    },
    {
      specifier: './dimensions/wardrobe_layout_comparison_policy.js',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['WARDROBE_LAYOUT_COMPARISON_POLICY'],
      aliases: [],
    },
    {
      specifier: './dimensions/wardrobe_layout_policy.js',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['WARDROBE_MODULE_LAYOUT_POLICY'],
      aliases: [],
    },
  ]);

  const projection = facade.slice(
    facade.indexOf('export const WARDROBE_LAYOUT_DIMENSIONS'),
    facade.indexOf('export const WARDROBE_DIMENSION_GUIDE_DIMENSIONS')
  );
  assert.deepEqual(
    Array.from(projection.matchAll(/^  ([A-Za-z_$][\w$]*):/gmu), match => match[1]),
    [
      'minSegmentWidthCm',
      'boundaryFullThicknessMultiplier',
      'boundarySharedThicknessMultiplier',
      'autoWidthMatchToleranceCm',
      'valueEqualityToleranceCm',
      'cellDimsMatchToleranceCm',
      'cellDimsPreview',
    ]
  );
  assert.doesNotMatch(projection, /:\s*-?(?:\d|\.\d)/u);
  for (const field of [
    'minSegmentWidthCm',
    'boundaryFullThicknessMultiplier',
    'boundarySharedThicknessMultiplier',
  ]) {
    assert.match(projection, new RegExp(`${field}: WARDROBE_MODULE_LAYOUT_POLICY\\.${field}`, 'u'));
  }
  for (const field of ['autoWidthMatchToleranceCm', 'valueEqualityToleranceCm']) {
    assert.match(projection, new RegExp(`${field}: WARDROBE_LAYOUT_COMPARISON_POLICY\\.${field}`, 'u'));
  }
  assert.match(projection, /cellDimsMatchToleranceCm: CELL_DIMENSION_MATCH_POLICY\.toleranceCm/u);
  assert.match(projection, /cellDimsPreview: CELL_DIMENSION_PREVIEW_POLICY/u);

  const autoWidthFunction = facade.slice(
    facade.indexOf('export function isAutoWidthForDoors'),
    facade.indexOf('export function normalizeWardrobeDimensionType')
  );
  assert.match(
    autoWidthFunction,
    /Math\.abs\(currentWidthCm - expectedWidthCm\) < WARDROBE_LAYOUT_COMPARISON_POLICY\.autoWidthMatchToleranceCm/u
  );
  assert.doesNotMatch(autoWidthFunction, /WARDROBE_LAYOUT_DIMENSIONS/u);
});

test('Cell Dimensions composition imports the exact focused owners while leaf modules receive scalars', () => {
  const preview = read(previewConsumerRel);
  const helpers = read(helpersConsumerRel);
  const clickFlow = read(clickFlowRel);
  assert.deepEqual(
    directImportSummary(previewConsumerRel).filter(item => item.specifier.includes('/shared/')),
    [
      {
        specifier: '../../shared/dimensions/cell_dimension_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CELL_DIMENSION_MATCH_POLICY', 'CELL_DIMENSION_PREVIEW_POLICY'],
        aliases: [],
      },
      {
        specifier: '../../shared/dimensions/wardrobe_defaults.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['WARDROBE_DEFAULTS'],
        aliases: [],
      },
    ]
  );
  assert.deepEqual(
    directImportSummary(helpersConsumerRel).filter(item => item.specifier.includes('/shared/')),
    []
  );
  assert.deepEqual(
    directImportSummary(clickFlowRel).filter(item => item.specifier.includes('/shared/')),
    [
      {
        specifier: '../../shared/dimensions/wardrobe_layout_comparison_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['WARDROBE_LAYOUT_COMPARISON_POLICY'],
        aliases: [],
      },
    ]
  );
  for (const field of [
    'minWidthM',
    'minHeightM',
    'widthClearanceM',
    'heightClearanceM',
    'minDepthM',
    'woodThicknessMinM',
    'woodThicknessMaxM',
    'woodThicknessScale',
  ]) {
    assert.match(preview, new RegExp(`CELL_DIMENSION_PREVIEW_POLICY\\.${field}`, 'u'));
  }
  assert.match(preview, /matchToleranceCm: CELL_DIMENSION_MATCH_POLICY\.toleranceCm/u);
  assert.match(preview, /defaultHingedDepthCm: WARDROBE_DEFAULTS\.byType\.hinged\.depthCm/u);
  assert.match(helpers, /const EPS_CM = policy\.matchToleranceCm/u);
  assert.match(helpers, /readRawNumber\(raw, 'depth', policy\.defaultHingedDepthCm\)/u);
  assert.match(
    clickFlow,
    /autoWidthMatchToleranceCm: WARDROBE_LAYOUT_COMPARISON_POLICY\.autoWidthMatchToleranceCm/u
  );
  for (const source of [preview, helpers]) {
    assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared|WARDROBE_LAYOUT_DIMENSIONS/u);
    assert.doesNotMatch(source, /\b(?:CELL_DIMENSION_POLICY|WARDROBE_MODULE_LAYOUT_POLICY)\b/u);
    assert.doesNotMatch(source, /import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u);
  }
  assert.doesNotMatch(clickFlow, /wardrobe_dimension_tokens_shared|WARDROBE_LAYOUT_DIMENSIONS/u);
  assert.doesNotMatch(clickFlow, /import\s+\*\s+as|import\s*\(/u);
  assert.doesNotMatch(preview, /const\s+[A-Za-z_$][\w$]*\s*=\s*CELL_DIMENSION_PREVIEW_POLICY\s*;/u);
  assert.doesNotMatch(
    helpers,
    /CELL_DIMENSION_MATCH_POLICY|CELL_DIMENSION_PREVIEW_POLICY|WARDROBE_DEFAULTS/u
  );
});

test('Cell Dimension Match, Preview, and Auto Width literals are fully propagated from composition', () => {
  const previewState = read(previewStateRel);
  const previewInputs = read(previewInputsRel);
  const previewTarget = read(previewTargetRel);
  const freeBoxHover = read(freeBoxHoverRel);
  const linearWidth = read(linearWidthRel);

  assert.doesNotMatch(previewState, /0\.11/u);
  assert.match(previewState, /Math\.abs\(activeCm - baseCm\) > matchToleranceCm/u);
  assert.match(previewState, /const EPS_CM = matchToleranceCm/u);

  assert.doesNotMatch(previewInputs, /0\.03/u);
  assert.match(previewInputs, /Math\.max\(minWidthM,/u);
  assert.match(previewInputs, /Math\.max\(minHeightM,/u);
  assert.doesNotMatch(previewTarget, /0\.024/u);
  assert.match(previewTarget, /const targetDm = Math\.max\(minDepthM,/u);
  assert.match(previewTarget, /matchToleranceCm,/u);
  assert.match(previewTarget, /previewState\.targetWcm, minWidthM/u);
  assert.match(previewTarget, /previewState\.targetHcm,\s*minHeightM/u);

  const freeBoxPreview = freeBoxHover.slice(
    freeBoxHover.indexOf('export function resolveCellDimsFreeBoxPreviewTargetBox'),
    freeBoxHover.indexOf('function hasFreeBoxDimChange')
  );
  assert.doesNotMatch(freeBoxPreview, /\b(?:0\.03|0\.024)\b/u);
  assert.match(freeBoxPreview, /Math\.max\(\s*minWidthM,/u);
  assert.match(freeBoxPreview, /Math\.max\(\s*minHeightM,/u);
  assert.match(freeBoxPreview, /Math\.max\(\s*minDepthM,/u);
  assert.match(freeBoxHover, /const EPS_CM = 1e-6;/u);
  assert.match(freeBoxHover, /const EPS_M = 1e-6;/u);

  assert.doesNotMatch(linearWidth, /0\.51/u);
  assert.equal((linearWidth.match(/ctx\.autoWidthMatchToleranceCm/gu) ?? []).length, 2);
  assert.match(read(clickContractsRel), /autoWidthMatchToleranceCm: number;/u);
  assert.match(read(linearContextRel), /autoWidthMatchToleranceCm: number;/u);

  for (const rel of [
    previewStateRel,
    previewInputsRel,
    previewTargetRel,
    freeBoxHoverRel,
    helpersConsumerRel,
    linearWidthRel,
  ]) {
    const ownerImports = directImportSummary(rel).filter(dependency =>
      /(?:cell_dimension_policy|wardrobe_layout_comparison_policy|wardrobe_defaults)\.js$/u.test(
        dependency.specifier
      )
    );
    assert.deepEqual(ownerImports, [], `${rel} must receive policy scalars from composition`);
    assert.doesNotMatch(
      read(rel),
      /export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from|wardrobe_dimension_tokens_shared/u
    );
  }
});

test('Cell Dimensions migration appends exactly Entry 132 after the unchanged 131-entry prefix', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 131)),
    'f8b2ec4b773b4d1c01f4a4a0dd519c43bcf01fb2b96d34e075d21bb2b55b6687'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(131, 132), [expectedEntry]);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 132)),
    '49cc60fef1a0b5e3a59c9a4c439530cfebb6b38dcff7f8355300139215757d3e'
  );
});

test('current focused inventory has no Wardrobe Layout consumers and four Wardrobe Defaults facade statements', () => {
  assert.deepEqual(productionIdentifierFiles('WARDROBE_LAYOUT_DIMENSIONS'), []);
  assert.deepEqual(facadeConsumersFor('WARDROBE_LAYOUT_DIMENSIONS'), []);
  assert.deepEqual(facadeConsumersFor('WARDROBE_DEFAULTS'), [
    'esm/native/builder/render_dimension_ops_shared.ts',
    'esm/native/data/preset_models_data.ts',
    'esm/native/platform/render_loop_motion_doors.ts',
    'esm/native/services/canvas_picking_projection_runtime_box_no_main_workspace.ts',
  ]);
});
