import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';
import { loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const featureRel = 'esm/native/features/structure_tab_dimension_support.ts';
const adapterRel = 'esm/native/ui/react/tabs/structure_tab_dimension_defaults.ts';
const featureManifestRel = 'tools/wp_features_public_api_manifest.json';
const adapterSpecifier = './structure_tab_dimension_defaults.js';
const featureSpecifier = '../../../features/structure_tab_dimension_support.js';

const servicesApiRel = 'esm/native/services/api.ts';
const hexIndexRel = 'esm/native/features/hex_cell/index.ts';
const autoWidthPolicySpecifier = '../../shared/dimensions/structure_tab_auto_width_policy.js';
const compositionOwnerRel = 'esm/shared/dimensions/structure_tab_dimension_policy.ts';
const compositionOwnerSpecifier = '../../shared/dimensions/structure_tab_dimension_policy.js';
const autoWidthPolicySymbol = 'STRUCTURE_TAB_AUTO_WIDTH_POLICY';
const projectedSymbols = Object.freeze(['resolveAutoWidthForDoors', 'isAutoWidthForDoors']);

const ownerGroups = Object.freeze([
  Object.freeze({
    family: 'Chest Mode',
    specifier: '../../shared/dimensions/chest_mode_policy.js',
    file: 'esm/shared/dimensions/chest_mode_policy.ts',
    symbols: Object.freeze(['CHEST_MODE_DIMENSIONS']),
  }),
  Object.freeze({
    family: 'Stack Split',
    specifier: '../../shared/dimensions/stack_split_policy.js',
    file: 'esm/shared/dimensions/stack_split_policy.ts',
    symbols: Object.freeze([
      'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
      'STACK_SPLIT_LOWER_DEPTH_MAX',
      'STACK_SPLIT_LOWER_DEPTH_MIN',
      'STACK_SPLIT_LOWER_DOORS_MAX',
      'STACK_SPLIT_LOWER_DOORS_MIN',
      'STACK_SPLIT_LOWER_HEIGHT_MIN',
      'STACK_SPLIT_LOWER_WIDTH_MAX',
      'STACK_SPLIT_LOWER_WIDTH_MIN',
      'STACK_SPLIT_MIN_TOP_HEIGHT',
    ]),
  }),
  Object.freeze({
    family: 'Product Limits',
    specifier: '../../shared/dimensions/product_limits.js',
    file: 'esm/shared/dimensions/product_limits.ts',
    symbols: Object.freeze([
      'WARDROBE_CELL_DEPTH_MAX',
      'WARDROBE_CELL_DEPTH_MIN',
      'WARDROBE_CELL_HEIGHT_MAX',
      'WARDROBE_CELL_HEIGHT_MIN',
      'WARDROBE_CELL_WIDTH_MAX',
      'WARDROBE_CELL_WIDTH_MIN',
      'WARDROBE_CHEST_DRAWERS_MAX',
      'WARDROBE_CHEST_DRAWERS_MIN',
      'WARDROBE_CHEST_HEIGHT_MIN',
      'WARDROBE_CHEST_WIDTH_MIN',
      'WARDROBE_DEPTH_MAX',
      'WARDROBE_DEPTH_MIN',
      'WARDROBE_DOORS_MAX',
      'WARDROBE_HEIGHT_MAX',
      'WARDROBE_HEIGHT_MIN',
      'WARDROBE_SLIDING_DOORS_MIN',
      'WARDROBE_WIDTH_MAX',
      'WARDROBE_WIDTH_MIN',
    ]),
  }),
  Object.freeze({
    family: 'Wardrobe Defaults',
    specifier: '../../shared/dimensions/wardrobe_defaults.js',
    file: 'esm/shared/dimensions/wardrobe_defaults.ts',
    symbols: Object.freeze([
      'DEFAULT_CHEST_DRAWERS_COUNT',
      'DEFAULT_CORNER_DOORS',
      'DEFAULT_CORNER_WIDTH',
      'DEFAULT_HEIGHT',
      'DEFAULT_HINGED_DOORS',
      'DEFAULT_WIDTH',
      'HINGED_DEFAULT_DEPTH',
      'HINGED_DEFAULT_PER_DOOR_WIDTH',
    ]),
  }),
  Object.freeze({
    family: 'Default Resolution',
    specifier: '../../shared/dimensions/wardrobe_default_resolution_policy.js',
    file: 'esm/shared/dimensions/wardrobe_default_resolution_policy.ts',
    symbols: Object.freeze(['getDefaultDepthForWardrobeType']),
  }),
]);
const sharedSymbols = Object.freeze(ownerGroups.flatMap(group => group.symbols));
const hexSymbols = Object.freeze(['HEX_CELL_DEFAULT_PROTRUSION_CM', 'resolveDefaultHexDoorWidthCm']);
const surfaceSymbols = Object.freeze([...sharedSymbols, ...projectedSymbols, ...hexSymbols]);
const dimensionSymbolSet = new Set(surfaceSymbols);
const groupAConsumers = Object.freeze({
  'esm/native/ui/react/tabs/structure_tab_dimension_constraints.ts': Object.freeze([
    'CHEST_MODE_DIMENSIONS',
    'STACK_SPLIT_LOWER_DEPTH_MAX',
    'STACK_SPLIT_LOWER_DEPTH_MIN',
    'STACK_SPLIT_LOWER_DOORS_MAX',
    'STACK_SPLIT_LOWER_DOORS_MIN',
    'STACK_SPLIT_LOWER_HEIGHT_MIN',
    'STACK_SPLIT_LOWER_WIDTH_MAX',
    'STACK_SPLIT_LOWER_WIDTH_MIN',
    'STACK_SPLIT_MIN_TOP_HEIGHT',
    'WARDROBE_CELL_DEPTH_MAX',
    'WARDROBE_CELL_DEPTH_MIN',
    'WARDROBE_CELL_HEIGHT_MAX',
    'WARDROBE_CELL_HEIGHT_MIN',
    'WARDROBE_CELL_WIDTH_MAX',
    'WARDROBE_CELL_WIDTH_MIN',
    'WARDROBE_CHEST_DRAWERS_MAX',
    'WARDROBE_CHEST_DRAWERS_MIN',
    'WARDROBE_CHEST_HEIGHT_MIN',
    'WARDROBE_CHEST_WIDTH_MIN',
    'WARDROBE_DEPTH_MAX',
    'WARDROBE_DEPTH_MIN',
    'WARDROBE_DOORS_MAX',
    'WARDROBE_HEIGHT_MAX',
    'WARDROBE_HEIGHT_MIN',
    'WARDROBE_SLIDING_DOORS_MIN',
    'WARDROBE_WIDTH_MAX',
    'WARDROBE_WIDTH_MIN',
  ]),
  'esm/native/ui/react/tabs/structure_tab_dimensions_section_cell_dims.tsx': Object.freeze([
    'DEFAULT_HEIGHT',
    'HEX_CELL_DEFAULT_PROTRUSION_CM',
    'HINGED_DEFAULT_DEPTH',
    'HINGED_DEFAULT_PER_DOOR_WIDTH',
    'resolveDefaultHexDoorWidthCm',
  ]),
  'esm/native/ui/react/tabs/structure_tab_saved_models_patterns.ts': Object.freeze([
    'HINGED_DEFAULT_PER_DOOR_WIDTH',
  ]),
  'esm/native/ui/react/tabs/structure_tab_view_state_runtime.ts': Object.freeze([
    'CHEST_MODE_DIMENSIONS',
    'DEFAULT_CHEST_DRAWERS_COUNT',
    'DEFAULT_CORNER_DOORS',
    'DEFAULT_CORNER_WIDTH',
    'DEFAULT_HEIGHT',
    'DEFAULT_HINGED_DOORS',
    'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
    'DEFAULT_WIDTH',
    'getDefaultDepthForWardrobeType',
  ]),
});
const groupCConsumers = Object.freeze({
  'esm/native/ui/react/tabs/structure_tab_structure_mutations_shared.ts': Object.freeze([
    'WARDROBE_DOORS_MAX',
    'WARDROBE_SLIDING_DOORS_MIN',
  ]),
  'esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts': Object.freeze([
    'isAutoWidthForDoors',
    'resolveAutoWidthForDoors',
  ]),
  'esm/native/ui/react/tabs/structure_tab_workflows_controller_shared.ts': Object.freeze([
    'resolveAutoWidthForDoors',
  ]),
});
const groupDConsumers = Object.freeze({
  'esm/native/ui/react/tabs/structure_tab_structure_stack_split_mutations.ts': Object.freeze([
    'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
    'STACK_SPLIT_LOWER_HEIGHT_MIN',
    'STACK_SPLIT_LOWER_WIDTH_MIN',
    'STACK_SPLIT_MIN_TOP_HEIGHT',
    'WARDROBE_DEPTH_MIN',
  ]),
});
const ownedConsumers = Object.freeze({
  ...groupAConsumers,
  ...groupCConsumers,
  ...groupDConsumers,
});
const expectedViewStateKeyOrder = Object.freeze({
  readStructureTabBaseUiState: Object.freeze([
    'width',
    'height',
    'depth',
    'doors',
    'chestDrawersCount',
    'chestCommodeMirrorHeightCm',
    'chestCommodeMirrorWidthCm',
    'chestCommodeMirrorWidthManual',
    'baseType',
    'baseLegStyle',
    'baseLegColor',
    'baseLegPlatformMode',
    'baseLegPlatformSideMode',
    'baseLegPlatformSideOverhangCm',
    'baseLegPlatformFrontOverhangCm',
    'basePlinthHeightCm',
    'baseLegHeightCm',
    'baseLegWidthCm',
    'slidingTracksColor',
    'structureSelectRaw',
    'singleDoorPosRaw',
    'hingeDirection',
    'cornerMode',
    'cornerSide',
    'cornerWidth',
    'cornerDoors',
    'cornerHeight',
    'cornerDepth',
    'isChestMode',
    'chestCommodeEnabled',
  ]),
  readStructureTabStackSplitUiState: Object.freeze([
    'stackSplitEnabled',
    'stackSplitDecorativeSeparatorEnabled',
    'stackSplitDecorativeSeparatorSideOverhangCm',
    'stackSplitDecorativeSeparatorFrontOverhangCm',
    'stackSplitLowerHeight',
    'stackSplitLowerDepthRaw',
    'stackSplitLowerWidthRaw',
    'stackSplitLowerDoorsRaw',
    'stackSplitLowerDepthManualRaw',
    'stackSplitLowerWidthManualRaw',
    'stackSplitLowerDoorsManualRaw',
  ]),
  deriveStructureTabStackSplitState: Object.freeze([
    'stackSplitLowerDepthManual',
    'stackSplitLowerWidthManual',
    'stackSplitLowerDoorsManual',
    'stackSplitLowerDepth',
    'stackSplitLowerWidth',
    'stackSplitLowerDoors',
  ]),
  readStructureTabCellDimsState: Object.freeze([
    'cellDimsPanelOpen',
    'cellDimsHexPanelOpen',
    'cellDimsWidth',
    'cellDimsHeight',
    'cellDimsDepth',
    'cellDimsHexMode',
    'cellDimsHexProtrusion',
    'cellDimsHexDoorWidth',
  ]),
  deriveStructureTabSelectionState: Object.freeze([
    'patterns',
    'structureSelect',
    'structureIsDefault',
    'structureArr',
    'isSliding',
    'shouldShowStructureButtons',
    'shouldShowSingleDoor',
    'shouldShowHingeBtn',
  ]),
});
const dependencyAnalysisCache = new Map();
let cachedProductionEntries;

const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const sorted = values => [...values].sort((left, right) => left.localeCompare(right));

function listSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(absolute);
    return entry.isFile() && /\.(?:[cm]?[jt]sx?)$/u.test(entry.name) ? [absolute] : [];
  });
}

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

function addViolation(violations, kind, detail) {
  violations.push(detail === undefined ? { kind } : { kind, detail });
}

function analyzeDependencies(rel, source) {
  let bySource = dependencyAnalysisCache.get(rel);
  if (!bySource) {
    bySource = new Map();
    dependencyAnalysisCache.set(rel, bySource);
  }
  if (!bySource.has(source)) bySource.set(source, analyzeModuleDependencies(rel, source));
  return bySource.get(source);
}

function canonicalModuleStem(rel, specifier) {
  const cleanSpecifier = specifier.split(/[?#]/u, 1)[0];
  const resolved = cleanSpecifier.startsWith('@/')
    ? `esm/${cleanSpecifier.slice(2)}`
    : cleanSpecifier.startsWith('.')
      ? path.posix.join(path.posix.dirname(rel), cleanSpecifier)
      : null;
  return resolved === null ? null : path.posix.normalize(resolved).replace(/\.(?:[cm]?[jt]sx?)$/u, '');
}

function targetsModule(rel, specifier, targetRel) {
  const stem = canonicalModuleStem(rel, specifier);
  const targetStem = targetRel.replace(/\.(?:[cm]?[jt]sx?)$/u, '');
  return stem === targetStem || `${stem}/index` === targetStem;
}

function inspectFeature(source) {
  const violations = [];
  let analysis;
  let exports;
  let sourceFile;
  try {
    analysis = analyzeModuleDependencies(featureRel, source);
    exports = collectNamedModuleExports(featureRel, source);
    sourceFile = createSourceFile(featureRel, source);
  } catch (error) {
    return [{ kind: 'feature-parse', detail: error.message }];
  }
  const shared = analysis.imports.filter(dependency => dependency.specifier.includes('/shared/'));
  const [compositionDependency] = shared;
  if (
    shared.length !== 1 ||
    compositionDependency?.specifier !== compositionOwnerSpecifier ||
    compositionDependency?.kind !== 'value' ||
    compositionDependency?.syntax !== 'static-import'
  ) {
    addViolation(violations, 'owner-statement-count', shared.length);
  }
  if (compositionDependency?.bindings.some(binding => binding.importedName !== binding.localName)) {
    addViolation(violations, 'owner-alias');
  }
  if (compositionDependency?.importedSymbols.includes('*')) addViolation(violations, 'owner-namespace');
  if (
    stableJson(sorted(compositionDependency?.importedSymbols ?? [])) !==
    stableJson(sorted([...sharedSymbols, autoWidthPolicySymbol]))
  ) {
    addViolation(violations, 'owner-symbols');
  }
  if (shared.some(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared'))) {
    addViolation(violations, 'feature-facade-import');
  }
  if (analysis.imports.some(dependency => dependency.syntax === 'dynamic-import')) {
    addViolation(violations, 'feature-dynamic-import');
  }
  if (analysis.unresolvedDynamicImports.length || analysis.forbiddenModuleSyntax.length) {
    addViolation(violations, 'feature-forbidden-module-syntax');
  }
  const localExports = exports.filter(entry => entry.source === null);
  const hexExports = exports.filter(entry => entry.source === './hex_cell/index.js');
  if (
    localExports.length !== 39 ||
    localExports.some(entry => entry.kind !== 'value' || entry.localName !== entry.exportedName) ||
    stableJson(sorted(localExports.map(entry => entry.exportedName))) !==
      stableJson(sorted([...sharedSymbols, ...projectedSymbols]))
  ) {
    addViolation(violations, 'feature-local-export-surface');
  }
  if (
    hexExports.length !== 2 ||
    hexExports.some(entry => entry.kind !== 'value' || entry.localName !== entry.exportedName) ||
    stableJson(sorted(hexExports.map(entry => entry.exportedName))) !== stableJson(sorted(hexSymbols))
  ) {
    addViolation(violations, 'feature-hex-surface');
  }
  const projectionStatements = sourceFile.body.filter(
    statement =>
      statement.type === 'ExportNamedDeclaration' && statement.declaration?.type === 'VariableDeclaration'
  );
  if (projectionStatements.length !== 2) {
    addViolation(violations, 'auto-width-projection-count');
  }
  for (const symbol of projectedSymbols) {
    const matches = projectionStatements.filter(statement => {
      const declaration = statement.declaration;
      const [declarator] = declaration?.declarations ?? [];
      return declarator?.id?.type === 'Identifier' && declarator.id.name === symbol;
    });
    const declaration = matches[0]?.declaration;
    const [declarator] = declaration?.declarations ?? [];
    const init = declarator?.init;
    if (
      matches.length !== 1 ||
      declaration?.kind !== 'const' ||
      declaration?.declarations.length !== 1 ||
      init?.type !== 'MemberExpression' ||
      init.computed ||
      init.optional ||
      init.object?.type !== 'Identifier' ||
      init.object.name !== autoWidthPolicySymbol ||
      init.property?.type !== 'Identifier' ||
      init.property.name !== symbol
    ) {
      addViolation(violations, 'auto-width-direct-projection', symbol);
    }
  }
  const allowedBody = sourceFile.body.filter(
    statement => statement.type === 'ImportDeclaration' || statement.type === 'ExportNamedDeclaration'
  );
  if (sourceFile.body.length !== 5 || allowedBody.length !== sourceFile.body.length) {
    addViolation(violations, 'feature-copy-wrapper-or-logic');
  }
  return violations;
}

function inspectCompositionOwner(source) {
  const violations = [];
  let analysis;
  let sourceFile;
  try {
    analysis = analyzeModuleDependencies(compositionOwnerRel, source);
    sourceFile = createSourceFile(compositionOwnerRel, source);
  } catch (error) {
    return [{ kind: 'composition-owner-parse', detail: error.message }];
  }
  const expected = [
    ...ownerGroups.map(group => ({
      specifier: group.specifier.replace('../../shared/dimensions/', './'),
      symbols: group.symbols,
    })),
    {
      specifier: autoWidthPolicySpecifier.replace('../../shared/dimensions/', './'),
      symbols: [autoWidthPolicySymbol],
    },
  ];
  if (analysis.imports.length !== expected.length) addViolation(violations, 'composition-source-count');
  for (const group of expected) {
    const matches = analysis.imports.filter(dependency => dependency.specifier === group.specifier);
    const dependency = matches[0];
    if (
      matches.length !== 1 ||
      dependency?.kind !== 'value' ||
      dependency?.syntax !== 'static-re-export' ||
      dependency?.bindings.some(binding => binding.importedName !== binding.exportedName) ||
      stableJson(sorted(dependency?.importedSymbols ?? [])) !== stableJson(sorted(group.symbols))
    ) {
      addViolation(violations, 'composition-source-statement', group.specifier);
    }
  }
  if (
    sourceFile.body.length !== expected.length ||
    sourceFile.body.some(
      statement => statement.type !== 'ExportNamedDeclaration' || statement.declaration !== null
    )
  ) {
    addViolation(violations, 'composition-owner-logic');
  }
  return violations;
}

function inspectAdapter(source) {
  const violations = [];
  let analysis;
  let exports;
  let sourceFile;
  try {
    analysis = analyzeModuleDependencies(adapterRel, source);
    exports = collectNamedModuleExports(adapterRel, source);
    sourceFile = createSourceFile(adapterRel, source);
  } catch (error) {
    return [{ kind: 'adapter-parse', detail: error.message }];
  }
  const dependencies = analysis.imports;
  const [dependency] = dependencies;
  if (
    dependencies.length !== 1 ||
    dependency?.specifier !== featureSpecifier ||
    dependency?.kind !== 'value' ||
    dependency?.syntax !== 'static-re-export'
  ) {
    addViolation(violations, 'adapter-route');
  }
  if (
    dependency?.bindings.some(binding => binding.importedName !== binding.exportedName) ||
    stableJson(sorted(dependency?.importedSymbols ?? [])) !== stableJson(sorted(surfaceSymbols))
  ) {
    addViolation(violations, 'adapter-alias-or-surface');
  }
  if (
    exports.length !== 41 ||
    exports.some(entry => entry.source !== featureSpecifier || entry.localName !== entry.exportedName)
  ) {
    addViolation(violations, 'adapter-export-surface');
  }
  if (sourceFile.body.length !== 1 || sourceFile.body[0]?.type !== 'ExportNamedDeclaration') {
    addViolation(violations, 'adapter-logic-literal-or-copy');
  }
  if (source.includes('/shared/') || source.includes('/services/')) {
    addViolation(violations, 'adapter-forbidden-owner-route');
  }
  return violations;
}

function productionEntries(overrides = {}) {
  if (!cachedProductionEntries) {
    cachedProductionEntries = listSourceFiles(path.join(root, 'esm')).map(file => {
      const rel = path.relative(root, file).replaceAll('\\', '/');
      return [rel, fs.readFileSync(file, 'utf8')];
    });
  }
  if (Object.keys(overrides).length === 0) return cachedProductionEntries;
  return cachedProductionEntries.map(([rel, source]) => [
    rel,
    Object.hasOwn(overrides, rel) ? overrides[rel] : source,
  ]);
}

function inspectConsumerTopology(entries) {
  const violations = [];
  const featureConsumers = [];
  for (const [rel, source] of entries) {
    const dependencies = analyzeDependencies(rel, source).imports;
    const featureDependencies = dependencies.filter(dependency =>
      targetsModule(rel, dependency.specifier, featureRel)
    );
    if (featureDependencies.length) featureConsumers.push(rel);
    if (rel.startsWith('esm/native/ui/') && rel !== adapterRel && featureDependencies.length) {
      addViolation(violations, 'direct-ui-feature-boundary-import', rel);
    }
    if (
      rel.startsWith('esm/native/ui/') &&
      dependencies.some(dep => canonicalModuleStem(rel, dep.specifier)?.startsWith('esm/shared/'))
    ) {
      if (rel === adapterRel || Object.hasOwn(ownedConsumers, rel)) {
        addViolation(violations, 'direct-owned-ui-shared-import', rel);
      }
    }
    if (!Object.hasOwn(ownedConsumers, rel)) continue;
    const adapterDependencies = dependencies.filter(dep => dep.specifier === adapterSpecifier);
    const expected = ownedConsumers[rel];
    if (
      adapterDependencies.length !== 1 ||
      adapterDependencies[0].kind !== 'value' ||
      adapterDependencies[0].syntax !== 'static-import' ||
      stableJson(sorted(adapterDependencies[0].importedSymbols)) !== stableJson(sorted(expected))
    ) {
      addViolation(violations, 'owned-adapter-import', rel);
    }
    if (
      dependencies.some(
        dep =>
          targetsModule(rel, dep.specifier, servicesApiRel) &&
          dep.importedSymbols.some(symbol => dimensionSymbolSet.has(symbol))
      )
    ) {
      addViolation(violations, 'owned-services-dimension-import', rel);
    }
    if (
      rel.endsWith('structure_tab_dimensions_section_cell_dims.tsx') &&
      dependencies.some(dep => targetsModule(rel, dep.specifier, hexIndexRel))
    ) {
      addViolation(violations, 'cell-dims-direct-hex-cell-import', rel);
    }
  }
  if (stableJson(sorted(featureConsumers)) !== stableJson([adapterRel])) {
    addViolation(violations, 'feature-boundary-consumer-inventory', sorted(featureConsumers));
  }
  return violations;
}

function viewStateKeyOrder(source) {
  const expectedFunctions = new Set(Object.keys(expectedViewStateKeyOrder));
  const facts = {};
  const sourceFile = createSourceFile('esm/native/ui/react/tabs/structure_tab_view_state_runtime.ts', source);
  walkAst(sourceFile, node => {
    if (node.type !== 'ReturnStatement' || node.argument?.type !== 'ObjectExpression') return;
    let functionName = null;
    for (let current = node.parent; current && !functionName; current = current.parent) {
      if (current.type === 'FunctionDeclaration') functionName = current.id?.name;
      if (
        (current.type === 'ArrowFunctionExpression' || current.type === 'FunctionExpression') &&
        current.parent?.type === 'VariableDeclarator'
      ) {
        functionName = current.parent.id?.name;
      }
    }
    if (!expectedFunctions.has(functionName) || facts[functionName]) return;
    facts[functionName] = node.argument.properties.map(property => property.key?.name ?? property.key?.value);
  });
  return facts;
}

function assertMutationRejected(violations, kind, label) {
  assert.equal(
    violations.some(violation => violation.kind === kind),
    true,
    `${label}: ${JSON.stringify(violations)}`
  );
}

test('feature boundary has one exact composition import and 41 identity-preserving exports', () => {
  const featureFiles = listSourceFiles(path.join(root, 'esm/native/features'))
    .map(file => path.relative(root, file).replaceAll('\\', '/'))
    .filter(rel => path.basename(rel) === 'structure_tab_dimension_support.ts');
  assert.deepEqual(featureFiles, [featureRel]);
  assert.equal(sharedSymbols.length, 37);
  assert.equal([...sharedSymbols, autoWidthPolicySymbol].length, 38);
  assert.equal(surfaceSymbols.length, 41);
  assert.deepEqual(inspectFeature(read(featureRel)), []);
  assert.deepEqual(inspectCompositionOwner(read(compositionOwnerRel)), []);
  assert.deepEqual(inspectAdapter(read(adapterRel)), []);
});

test('UI adapter is the sole feature-boundary consumer and all owned Group A-D consumers use it', () => {
  assert.deepEqual(inspectConsumerTopology(productionEntries()), []);
  const featureManifest = JSON.parse(read(featureManifestRel));
  assert.equal(
    featureManifest.publicEntries.filter(entry => entry === 'structure_tab_dimension_support.js').length,
    1
  );
  assert.deepEqual(featureManifest.families.structure_tab_dimension_support, [
    'structure_tab_dimension_support.js',
  ]);
});

test('Group A-D contracts preserve explicit Structure patterns and view-state output shape', () => {
  const patterns = loadTsRuntimeModule(
    path.join(root, 'esm/native/ui/react/tabs/structure_tab_saved_models_patterns.ts'),
    {
      mock: specifier => (specifier === adapterSpecifier ? { HINGED_DEFAULT_PER_DOOR_WIDTH: 40 } : undefined),
    }
  ).STRUCTURE_PATTERNS;
  assert.deepEqual(JSON.parse(JSON.stringify(patterns)), {
    2: [
      { label: 'תא אחד רחב (80)', structure: [2] },
      { label: '2 תאים צרים (40-40)', structure: [1, 1] },
    ],
    3: [
      { label: 'ברירת מחדל (80-40 או 40-80)', structure: 'default' },
      { label: '3 תאים צרים (40-40-40)', structure: [1, 1, 1] },
    ],
    4: [
      { label: 'סטנדרט (80-80)', structure: [2, 2] },
      { label: 'סימטרי: צר-רחב-צר (40-80-40)', structure: [1, 2, 1] },
      { label: '4 תאים צרים (40-40-40-40)', structure: [1, 1, 1, 1] },
    ],
    5: [
      { label: 'ברירת מחדל (80-80 ותא 40 לבחירה)', structure: 'default' },
      { label: 'כולו תאים צרים', structure: [1, 1, 1, 1, 1] },
    ],
    6: [
      { label: 'סטנדרט (80-80-80)', structure: [2, 2, 2] },
      { label: 'מרכז רחב: (40-80-80-40)', structure: [1, 2, 2, 1] },
      { label: 'מרכז צר: (80-40-40-80)', structure: [2, 1, 1, 2] },
      { label: '6 תאים צרים', structure: [1, 1, 1, 1, 1, 1] },
    ],
    7: [
      { label: 'ברירת מחדל (80-80-80 ותא 40 לבחירה)', structure: 'default' },
      { label: 'כולו תאים צרים', structure: [1, 1, 1, 1, 1, 1, 1] },
    ],
  });
  assert.deepEqual(
    viewStateKeyOrder(read('esm/native/ui/react/tabs/structure_tab_view_state_runtime.ts')),
    expectedViewStateKeyOrder
  );
});

test('route mutation probes reject owned Structure Tab dependency regressions', () => {
  const constraintsRel = 'esm/native/ui/react/tabs/structure_tab_dimension_constraints.ts';
  const cellRel = 'esm/native/ui/react/tabs/structure_tab_dimensions_section_cell_dims.tsx';
  const stackSplitRel = 'esm/native/ui/react/tabs/structure_tab_structure_stack_split_mutations.ts';
  assertMutationRejected(
    inspectConsumerTopology(
      productionEntries({
        [constraintsRel]: `${read(constraintsRel)}\nimport { DEFAULT_WIDTH as DIRECT_WIDTH } from '../../../features/structure_tab_dimension_support';\n`,
      })
    ),
    'direct-ui-feature-boundary-import',
    'direct feature import'
  );
  assertMutationRejected(
    inspectConsumerTopology(
      productionEntries({
        [constraintsRel]: `${read(constraintsRel)}\nimport { DEFAULT_WIDTH as SHARED_WIDTH } from '@/shared/dimensions/wardrobe_defaults.js';\n`,
      })
    ),
    'direct-owned-ui-shared-import',
    'direct shared import'
  );
  assertMutationRejected(
    inspectConsumerTopology(
      productionEntries({
        [constraintsRel]: `${read(constraintsRel)}\nimport { DEFAULT_WIDTH as SERVICE_WIDTH } from '@/native/services/api.js';\n`,
      })
    ),
    'owned-services-dimension-import',
    'services import'
  );
  assertMutationRejected(
    inspectConsumerTopology(
      productionEntries({
        [cellRel]: `${read(cellRel)}\nimport { HEX_CELL_DEFAULT_PROTRUSION_CM as RAW_HEX_PROTRUSION } from '../../../features/hex_cell';\n`,
      })
    ),
    'cell-dims-direct-hex-cell-import',
    'direct Hex Cell import'
  );
  assertMutationRejected(
    inspectConsumerTopology(
      productionEntries({
        [stackSplitRel]: `${read(stackSplitRel)}\nimport { WARDROBE_DEPTH_MIN as SERVICE_DEPTH_MIN } from '../../../services/api.js';\n`,
      })
    ),
    'owned-services-dimension-import',
    'Stack Split Services dimension import'
  );
});
