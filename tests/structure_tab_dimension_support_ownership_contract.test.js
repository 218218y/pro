import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';
import { loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const featureRel = 'esm/native/features/structure_tab_dimension_support.ts';
const adapterRel = 'esm/native/ui/react/tabs/structure_tab_dimension_defaults.ts';
const baselineRel = 'tools/wp_layer_baseline.json';
const featureManifestRel = 'tools/wp_features_public_api_manifest.json';
const transitionInventoryRel = 'tools/wp_wardrobe_dimension_facade_transition_inventory.json';
const adapterSpecifier = './structure_tab_dimension_defaults.js';
const featureSpecifier = '../../../features/structure_tab_dimension_support.js';
const facadeSpecifier = '../../shared/wardrobe_dimension_tokens_shared.js';
const servicesApiRel = 'esm/native/services/api.ts';
const hexIndexRel = 'esm/native/features/hex_cell/index.ts';
const autoWidthPolicySpecifier = '../../shared/dimensions/structure_tab_auto_width_policy.js';
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
const semanticFingerprints = Object.freeze({
  'esm/native/ui/react/tabs/structure_tab_dimension_constraints.ts': Object.freeze({
    semantic: '536c6ef682c65bb336956c148615c754a7e322c609d84253748b3ec7b6f79392',
    literals: 'cf9b4e1a3ec4e82ede084c9791bb360f332d540cbe9c8360e23a8fbc96512302',
    literalCount: 59,
  }),
  'esm/native/ui/react/tabs/structure_tab_dimensions_section_cell_dims.tsx': Object.freeze({
    semantic: '5848bfa87c8c3968194c88d9cec8a9e58168dfd4eb30af0d72fc414de7167c79',
    literals: '70947284744043c3d77d2d5ae16df97092d2d3284df1cd47e949936a5960db95',
    literalCount: 119,
  }),
  'esm/native/ui/react/tabs/structure_tab_saved_models_patterns.ts': Object.freeze({
    semantic: '98e22e08d3016cb0383667c42d26d6c36fe825b449fe02e27ef8c768f08f2959',
    literals: 'd1aa2c55b032775a5439662eadd32d639700b4866694f4139ebdd13c200049a1',
    literalCount: 122,
  }),
  'esm/native/ui/react/tabs/structure_tab_view_state_runtime.ts': Object.freeze({
    semantic: 'aa7523369746ed0a4dfb781b64e98c5d7c04689543b4aa9101b8570d5990a5e5',
    literals: '3cc00119df8db0588f8ca29b0d3659dafa6a9692ce43f8351b7413c826bc62ce',
    literalCount: 83,
  }),
  'esm/native/ui/react/tabs/structure_tab_structure_mutations_shared.ts': Object.freeze({
    semantic: '177218aaac4af2405fb407ef5f80c3848b8fd37a44bb02114bb923a90b816d61',
    literals: '8ba3ffe10ccf1d28a4ea723a4fc31760b26bd7c29f8b721abc7b27361c8a0417',
    literalCount: 33,
  }),
  'esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts': Object.freeze({
    semantic: 'd3b0326bb9c974bd062d4a49d8bc43ef904970fd8153fb57ca6467fc2257ccaa',
    literals: 'f95c51642f033da29139a307b894a76ce45d3c483b25edef1be68aa73c70f67d',
    literalCount: 94,
  }),
  'esm/native/ui/react/tabs/structure_tab_workflows_controller_shared.ts': Object.freeze({
    semantic: '48f9fd3ac19527697b6203fe5f5c87ce692d5a3506387e776f46cc4e7c12aa56',
    literals: '7e4ee4fd84bd3711cd000f2d857ae823e78693a480ce8c2afd9796189b41bdec',
    literalCount: 15,
  }),
  'esm/native/ui/react/tabs/structure_tab_structure_stack_split_mutations.ts': Object.freeze({
    semantic: 'ff212c9832e30db785cfc23ec304810c39be56a7452305216834b61da1d0c1de',
    literals: 'f05d15222da356ad0e5c3ad36c4bd738fa58a2502e03e147340d3c423dc4a8fe',
    literalCount: 67,
  }),
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
const prefixHashes = Object.freeze([
  'f58543ffaf2860f846f7469e93ab442adf0ee3fc5ae391fd904af3f64167c111',
  'a0db5a8fefe35b6bf5c8973ab27929439eed2ebb3776df8370f8ad048f64c279',
  '712628686f0d4c3a1a6e9c1226f47acc9739cf6ef90bf6b5143a446ab22014d6',
  'e9e354c89e3797cd5f11a67c35420e7bef99abad543315ff36b8a110c66fedff',
  '4b2b446933a4e711b80e3aff428b22d7341062d2a2ae45cdaf8d72dd5be6dd65',
  '2fadcd1f9b416aefc7f79d4d074b52eac9e64dea5bc1dd35e486a843264a0088',
]);
const omittedAstKeys = new Set([
  'comments',
  'end',
  'innerComments',
  'leadingComments',
  'loc',
  'parent',
  'range',
  'raw',
  'start',
  'trailingComments',
]);
const dependencyAnalysisCache = new Map();
let cachedProductionEntries;

const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const sorted = values => [...values].sort((left, right) => left.localeCompare(right));
const sha256 = text => createHash('sha256').update(text).digest('hex');

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

function canonicalSemanticAst(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return undefined;
  seen.add(value);
  if (Array.isArray(value)) return value.map(item => canonicalSemanticAst(item, seen));
  const result = {};
  for (const key of Object.keys(value).sort()) {
    if (omittedAstKeys.has(key)) continue;
    const next = canonicalSemanticAst(value[key], seen);
    if (next !== undefined) result[key] = next;
  }
  return result;
}

function consumerFingerprints(rel, source = read(rel)) {
  const sourceFile = createSourceFile(rel, source);
  const body = sourceFile.body.filter(statement => statement.type !== 'ImportDeclaration');
  const literals = [];
  walkAst(sourceFile, node => {
    for (let current = node.parent; current; current = current.parent) {
      if (current.type === 'ImportDeclaration') return;
    }
    if (node.type === 'Literal') {
      literals.push([node.start, 'Literal', node.raw ?? JSON.stringify(node.value)]);
    }
    if (node.type === 'TemplateElement') {
      literals.push([node.start, 'TemplateElement', node.value?.raw ?? '']);
    }
  });
  literals.sort((left, right) => left[0] - right[0]);
  const literalFacts = literals.map(([, type, value]) => [type, value]);
  return {
    semantic: sha256(stableJson(canonicalSemanticAst(body))),
    literals: sha256(JSON.stringify(literalFacts)),
    literalCount: literalFacts.length,
  };
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
  if (shared.length !== 6) addViolation(violations, 'owner-statement-count', shared.length);
  for (const group of ownerGroups) {
    const matches = shared.filter(dependency => dependency.specifier === group.specifier);
    if (matches.length !== 1) {
      addViolation(violations, 'owner-statement', group.family);
      continue;
    }
    const [dependency] = matches;
    if (dependency.kind !== 'value' || dependency.syntax !== 'static-import') {
      addViolation(violations, 'owner-import-kind', group.family);
    }
    if (dependency.bindings.some(binding => binding.importedName !== binding.localName)) {
      addViolation(violations, 'owner-alias', group.family);
    }
    if (dependency.importedSymbols.includes('*')) addViolation(violations, 'owner-namespace', group.family);
    if (stableJson(sorted(dependency.importedSymbols)) !== stableJson(sorted(group.symbols))) {
      addViolation(violations, 'owner-symbols', group.family);
    }
  }
  const autoWidthPolicyDependencies = shared.filter(
    dependency => dependency.specifier === autoWidthPolicySpecifier
  );
  const [autoWidthPolicyDependency] = autoWidthPolicyDependencies;
  if (
    autoWidthPolicyDependencies.length !== 1 ||
    autoWidthPolicyDependency?.kind !== 'value' ||
    autoWidthPolicyDependency?.syntax !== 'static-import' ||
    stableJson(autoWidthPolicyDependency?.importedSymbols ?? []) !== stableJson([autoWidthPolicySymbol])
  ) {
    addViolation(violations, 'auto-width-policy-import');
  }
  if (autoWidthPolicyDependency?.bindings.some(binding => binding.importedName !== binding.localName)) {
    addViolation(violations, 'auto-width-policy-alias');
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
  if (sourceFile.body.length !== 10 || allowedBody.length !== sourceFile.body.length) {
    addViolation(violations, 'feature-copy-wrapper-or-logic');
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

function inspectHistoricalFeatureRatchet(baseline, entries) {
  const violations = [];
  const approval = Object.freeze({
    beforeImporterCount: 41,
    beforeValueImporterCount: 41,
    approvedImporterCount: 42,
    approvedValueImporterCount: 42,
    entryNumbers: Object.freeze([167, 168, 169, 170, 171]),
  });
  const featureRule = baseline.rules.find(rule => rule.from === 'features' && rule.to === 'shared');
  if (approval.approvedImporterCount - approval.beforeImporterCount !== 1) {
    addViolation(violations, 'historical-importer-ratchet');
  }
  if (approval.approvedValueImporterCount - approval.beforeValueImporterCount !== 1) {
    addViolation(violations, 'historical-value-importer-ratchet');
  }
  if (!(featureRule?.maxImporterCount >= approval.approvedImporterCount)) {
    addViolation(violations, 'historical-importer-ceiling-support');
  }
  if (!(featureRule?.maxValueImporterCount >= approval.approvedValueImporterCount)) {
    addViolation(violations, 'historical-value-importer-ceiling-support');
  }
  const expected = expectedLedgerEntries();
  for (let index = 0; index < approval.entryNumbers.length; index += 1) {
    const entryNumber = approval.entryNumbers[index];
    const entry = entries[entryNumber - 1];
    if (stableJson(entry) !== stableJson(expected[index])) {
      addViolation(violations, `historical-ratchet-entry-${entryNumber}`);
    }
    if (typeof entry?.removalCondition !== 'string' || entry.removalCondition.length === 0) {
      addViolation(violations, `historical-ratchet-removal-condition-${entryNumber}`);
    }
  }
  return violations;
}

function inspectGroupATransitionHistory(candidateInventory) {
  const violations = [];
  const ownedConsumers = new Set(Object.keys(groupAConsumers));
  for (const consumer of candidateInventory.consumers ?? []) {
    if (ownedConsumers.has(consumer.consumer)) {
      addViolation(violations, 'group-a-transition-consumer', consumer.consumer);
    }
    if (consumer.checkpointGroup === 'A') {
      addViolation(violations, 'group-a-transition-group', consumer.consumer);
    }
  }
  return violations;
}

function expectedLedgerEntries() {
  return ownerGroups.map((group, index) => {
    const companion = ownerGroups[(index + 1) % ownerGroups.length];
    return {
      from: 'features',
      to: 'shared',
      additionalStatements: 1,
      owner: 'dimension-ownership-migration',
      reviewedAt: '2026-07-28',
      reviewBy: '2026-10-18',
      fromFile: featureRel,
      companionImport: {
        toFile: companion.file,
        kind: 'value',
        importedSymbols: [...companion.symbols],
        syntax: 'static-import',
      },
      removedImport: {
        toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
        kind: 'value',
        importedSymbols: [...group.symbols],
        syntax: 'static-import',
      },
      addedImport: {
        toFile: group.file,
        kind: 'value',
        importedSymbols: [...group.symbols],
        syntax: 'static-import',
      },
      reason: `The Structure Tab Dimension Support feature boundary replaces the ${group.family} symbol group from the legacy shared facade route with its canonical focused owner alongside the other reviewed Structure Tab dimension owner statements, without exposing shared ownership to UI.`,
      removalCondition: `Remove this entry when a reviewed Structure Tab Dimension Support composition seam eliminates the extra ${group.family} owner statement without reintroducing the legacy facade, a direct shared owner import in UI, copied values, or a general dimension barrel.`,
    };
  });
}

function inspectLedger(entries) {
  const violations = [];
  if (entries.length < 171) addViolation(violations, 'ledger-history-length');
  for (let count = 166; count <= 171 && entries.length >= count; count += 1) {
    const actual = sha256(stableJson(entries.slice(0, count)));
    if (actual !== prefixHashes[count - 166]) addViolation(violations, `prefix-${count}`, actual);
  }
  const expected = expectedLedgerEntries();
  for (let index = 0; index < expected.length; index += 1) {
    if (stableJson(entries[166 + index]) !== stableJson(expected[index])) {
      addViolation(violations, `entry-${167 + index}`);
    }
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

test('feature boundary has six exact shared imports and 41 identity-preserving exports', () => {
  const featureFiles = listSourceFiles(path.join(root, 'esm/native/features'))
    .map(file => path.relative(root, file).replaceAll('\\', '/'))
    .filter(rel => path.basename(rel) === 'structure_tab_dimension_support.ts');
  assert.deepEqual(featureFiles, [featureRel]);
  assert.equal(sharedSymbols.length, 37);
  assert.equal([...sharedSymbols, autoWidthPolicySymbol].length, 38);
  assert.equal(surfaceSymbols.length, 41);
  assert.deepEqual(inspectFeature(read(featureRel)), []);
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

test('normalized Group A-D AST and literal inventories remain unchanged', () => {
  for (const [rel, expected] of Object.entries(semanticFingerprints)) {
    assert.deepEqual(consumerFingerprints(rel), expected, rel);
  }
  const patterns = loadTsRuntimeModule(
    path.join(root, 'esm/native/ui/react/tabs/structure_tab_saved_models_patterns.ts'),
    {
      mock: specifier => (specifier === adapterSpecifier ? { HINGED_DEFAULT_PER_DOOR_WIDTH: 40 } : undefined),
    }
  ).STRUCTURE_PATTERNS;
  assert.equal(
    sha256(JSON.stringify(patterns)),
    '4d43f086afac1d96ffd14237c49300865368c05969ffe13cdf1cd2973bfaa2df'
  );
  assert.deepEqual(
    viewStateKeyOrder(read('esm/native/ui/react/tabs/structure_tab_view_state_runtime.ts')),
    expectedViewStateKeyOrder
  );
});

test('Entries 167-171 are exact, preserve Prefix 166, and accept later appended entries', () => {
  const entries = JSON.parse(read(baselineRel)).migrationBudgets;
  assert.equal(entries.length >= 171, true);
  assert.deepEqual(inspectLedger(entries), []);
  const futureEntryAfterHistory = {
    ...entries[170],
    fromFile: 'esm/native/features/future_append_safe_dimension_consumer.ts',
  };
  assert.deepEqual(inspectLedger([...entries, futureEntryAfterHistory]), []);
});

test('Group A historical ratchet remains backed by active Entries 167-171', () => {
  const baseline = JSON.parse(read(baselineRel));
  const entries = baseline.migrationBudgets;
  assert.deepEqual(inspectHistoricalFeatureRatchet(baseline, entries), []);

  const futureHigherCeiling = structuredClone(baseline);
  const futureFeatureRule = futureHigherCeiling.rules.find(
    rule => rule.from === 'features' && rule.to === 'shared'
  );
  futureFeatureRule.maxImporterCount += 1;
  futureFeatureRule.maxValueImporterCount += 1;
  assert.deepEqual(inspectHistoricalFeatureRatchet(futureHigherCeiling, entries), []);
});

test('the four Group A consumers remain absent from the append-safe transition inventory', () => {
  const inventory = JSON.parse(read(transitionInventoryRel));
  assert.deepEqual(inspectGroupATransitionHistory(inventory), []);

  const futureInventory = structuredClone(inventory);
  futureInventory.consumers.push({
    consumer: 'esm/native/ui/future_dimension_transition_consumer.ts',
    checkpointGroup: 'FUTURE',
    symbols: [],
  });
  assert.deepEqual(inspectGroupATransitionHistory(futureInventory), []);
});

test('feature and adapter mutation probes reject facades, aliases, wrappers, and topology growth', () => {
  const feature = read(featureRel);
  assertMutationRejected(
    inspectFeature(feature.replace(ownerGroups[0].specifier, facadeSpecifier)),
    'feature-facade-import',
    'facade import'
  );
  assertMutationRejected(
    inspectFeature(
      feature.replace(
        'import { CHEST_MODE_DIMENSIONS }',
        'import { CHEST_MODE_DIMENSIONS as CHEST_MODE_DIMENSIONS_ALIAS }'
      )
    ),
    'owner-alias',
    'owner alias'
  );
  assertMutationRejected(
    inspectFeature(
      feature.replace(
        /import \{ CHEST_MODE_DIMENSIONS \} from '[^']+';/u,
        `import * as chestModeOwner from '${ownerGroups[0].specifier}';`
      )
    ),
    'owner-namespace',
    'namespace import'
  );
  assertMutationRejected(
    inspectFeature(`${feature}\nvoid import('${ownerGroups[0].specifier}');\n`),
    'feature-dynamic-import',
    'dynamic import'
  );
  assertMutationRejected(
    inspectFeature(feature.replace(/import \{ CHEST_MODE_DIMENSIONS \} from '[^']+';\r?\n/u, '')),
    'owner-statement-count',
    'missing owner statement'
  );
  assertMutationRejected(
    inspectFeature(`${feature}\nimport { mToCm } from '../../shared/dimensions/units.js';\n`),
    'owner-statement-count',
    'extra owner statement'
  );
  assertMutationRejected(
    inspectFeature(feature.replace(autoWidthPolicySymbol, `${autoWidthPolicySymbol} as AUTO_WIDTH_ALIAS`)),
    'auto-width-policy-alias',
    'auto-width policy alias'
  );
  assertMutationRejected(
    inspectFeature(
      feature.replace(
        `${autoWidthPolicySymbol}.resolveAutoWidthForDoors`,
        `(...args) => ${autoWidthPolicySymbol}.resolveAutoWidthForDoors(...args)`
      )
    ),
    'auto-width-direct-projection',
    'auto-width wrapper'
  );
  assertMutationRejected(
    inspectFeature(`${feature}\nexport const COPIED_WIDTH = DEFAULT_WIDTH;\n`),
    'feature-copy-wrapper-or-logic',
    'copied constant'
  );
  assertMutationRejected(
    inspectFeature(`${feature}\nexport const dimensionDefaults = { width: DEFAULT_WIDTH };\n`),
    'feature-copy-wrapper-or-logic',
    'object wrapper'
  );
  assertMutationRejected(
    inspectAdapter(`${read(adapterRel)}\nexport const ADAPTER_LITERAL = 1;\n`),
    'adapter-logic-literal-or-copy',
    'adapter logic or literal'
  );
  const extraConsumer = [
    'esm/native/ui/react/tabs/structure_tab_extra_consumer.ts',
    "import { DEFAULT_WIDTH } from '../../../features/structure_tab_dimension_support';\nexport function readWidth() { return DEFAULT_WIDTH; }\n",
  ];
  assertMutationRejected(
    inspectConsumerTopology([...productionEntries(), extraConsumer]),
    'direct-ui-feature-boundary-import',
    'additional feature consumer'
  );
  const aliasConsumer = [
    'esm/native/ui/react/tabs/structure_tab_alias_consumer.ts',
    "import { DEFAULT_WIDTH } from '@/native/features/structure_tab_dimension_support.js';\nexport function readWidth() { return DEFAULT_WIDTH; }\n",
  ];
  assertMutationRejected(
    inspectConsumerTopology([...productionEntries(), aliasConsumer]),
    'direct-ui-feature-boundary-import',
    'alias feature consumer'
  );
});

test('route and behavior mutation probes reject owned Structure Tab regressions', () => {
  const constraintsRel = 'esm/native/ui/react/tabs/structure_tab_dimension_constraints.ts';
  const cellRel = 'esm/native/ui/react/tabs/structure_tab_dimensions_section_cell_dims.tsx';
  const patternsRel = 'esm/native/ui/react/tabs/structure_tab_saved_models_patterns.ts';
  const viewRel = 'esm/native/ui/react/tabs/structure_tab_view_state_runtime.ts';
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
  assert.notDeepEqual(
    consumerFingerprints(
      patternsRel,
      read(patternsRel).replace("label: 'כולו תאים צרים'", "label: 'mutated'")
    ),
    semanticFingerprints[patternsRel],
    'pattern label mutation must change its fingerprints'
  );
  assert.notDeepEqual(
    consumerFingerprints(viewRel, read(viewRel).replace("'width', DEFAULT_WIDTH", "'width', 999")),
    semanticFingerprints[viewRel],
    'view-state default mutation must change its fingerprints'
  );
  assert.notDeepEqual(
    consumerFingerprints(
      constraintsRel,
      read(constraintsRel).replace('max: WARDROBE_WIDTH_MAX', 'max: WARDROBE_WIDTH_MIN')
    ),
    semanticFingerprints[constraintsRel],
    'bounds formula mutation must change its fingerprints'
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
  assert.notDeepEqual(
    consumerFingerprints(
      stackSplitRel,
      read(stackSplitRel).replace(
        'Math.min(DEFAULT_STACK_SPLIT_LOWER_HEIGHT, maxBottom || DEFAULT_STACK_SPLIT_LOWER_HEIGHT)',
        'Math.min(STACK_SPLIT_LOWER_HEIGHT_MIN, maxBottom || STACK_SPLIT_LOWER_HEIGHT_MIN)'
      )
    ),
    semanticFingerprints[stackSplitRel],
    'Stack Split lower-height default mutation must change its fingerprints'
  );
});

test('Ledger and historical ratchet mutation probes reject owned-entry drift', () => {
  const baseline = JSON.parse(read(baselineRel));
  const entries = baseline.migrationBudgets;
  for (let index = 166; index < 171; index += 1) {
    const mutated = structuredClone(entries);
    mutated[index].addedImport.importedSymbols[0] += '_MUTATED';
    assertMutationRejected(inspectLedger(mutated), `entry-${index + 1}`, `Entry ${index + 1}`);
  }
  const withoutRemovalConditions = structuredClone(entries);
  for (let index = 166; index < 171; index += 1) {
    delete withoutRemovalConditions[index].removalCondition;
  }
  assertMutationRejected(
    inspectLedger(withoutRemovalConditions),
    'entry-167',
    'owned Entries without migration removal conditions'
  );

  const unsupportedCeiling = structuredClone(baseline);
  const featureRule = unsupportedCeiling.rules.find(rule => rule.from === 'features' && rule.to === 'shared');
  featureRule.maxImporterCount = 41;
  featureRule.maxValueImporterCount = 41;
  assertMutationRejected(
    inspectHistoricalFeatureRatchet(unsupportedCeiling, entries),
    'historical-importer-ceiling-support',
    'active Group A Entries without importer ceiling support'
  );

  const returnedConsumer = structuredClone(JSON.parse(read(transitionInventoryRel)));
  returnedConsumer.consumers.push({
    consumer: Object.keys(groupAConsumers)[0],
    checkpointGroup: 'A',
    symbols: [],
  });
  assertMutationRejected(
    inspectGroupATransitionHistory(returnedConsumer),
    'group-a-transition-consumer',
    'Group A transition consumer returned'
  );
  assertMutationRejected(
    inspectGroupATransitionHistory(returnedConsumer),
    'group-a-transition-group',
    'Group A transition group returned'
  );
  const unrelatedCurrentTotals = structuredClone(baseline);
  const unrelatedRule = unrelatedCurrentTotals.rules.find(
    rule => rule.from === 'ui' && rule.to === 'features'
  );
  if (unrelatedRule) {
    unrelatedRule.maxImporterCount += 10;
    unrelatedRule.maxImportCount += 10;
  }
  assert.deepEqual(inspectHistoricalFeatureRatchet(unrelatedCurrentTotals, entries), []);
});
