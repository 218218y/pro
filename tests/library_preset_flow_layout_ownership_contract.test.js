import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productionRel = 'esm/native/features/library_preset/library_preset_flow_shared.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const libraryOwnerRel = 'esm/shared/dimensions/library_preset_policy.ts';
const stackSplitOwnerRel = 'esm/shared/dimensions/stack_split_policy.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const baselineRel = 'tools/wp_layer_baseline.json';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const sourceFileExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const runtimeExtensionCandidates = Object.freeze({
  '.js': Object.freeze(['.ts', '.tsx', '.mts']),
  '.mjs': Object.freeze(['.mts', '.ts', '.tsx']),
  '.cjs': Object.freeze(['.cts', '.ts', '.tsx']),
});
const fieldCounts = Object.freeze({
  minTopHeightCm: 1,
  defaultLowerHeightCm: 2,
  minLowerHeightCm: 1,
  minLowerDepthCm: 2,
  lowerDepthInsetCm: 1,
  minWidthCm: 2,
});
const protectedFields = new Set(Object.keys(fieldCounts));
const aggregateOwnerSymbols = new Set(['LIBRARY_PRESET_POLICY', 'STACK_SPLIT_POLICY']);
const focusedOwnerSymbols = new Set(['LIBRARY_PRESET_LAYOUT_POLICY', 'DEFAULT_STACK_SPLIT_LOWER_HEIGHT']);
const semanticMemberPaths = new Map(
  Object.keys(fieldCounts).flatMap(field => [
    [`LIBRARY_PRESET_DIMENSIONS.${field}`, `libraryPresetLayout.${field}`],
    [`LIBRARY_PRESET_LAYOUT_POLICY.${field}`, `libraryPresetLayout.${field}`],
  ])
);
const expectedNumericLiterals = Object.freeze([1, 1000, 1, 0, 0, 0, 0.01, 0]);
const expectedReturnKeys = Object.freeze([
  'bottomH',
  'bottomD',
  'topW',
  'bottomW',
  'topDoorsCount',
  'bottomDoorsCount',
]);
const expectedFormulaHashes = Object.freeze({
  maxBottom: '0d82e8c133a45aab349139b9394ebc811196fedffac7901b09f812e45e3f14ec',
  libraryDefaultDoors: '5209487cfd4f67da15bda427c4638d5f9e9ada812a33f6859eeb9f9d9b49c180',
  topDoorsCount: '6fe9cea51886d38cfbdf693747cda3d4d7af8cbff37d80abaf8c04ce44487bcc',
  bottomDoorsCount: 'dd74cac0608cdd608e53ca1f951e9670f32eae9ffce46018c8d4706563e080a6',
  preserveExistingLowerHeight: 'f98da31717c0af8e2ea8ace301c0f66a2a35e20ad7f8d178fa2a3ee166e75715',
  defaultBottomH: 'eee3a66845d6d10f42a239323a99d549dc9f5364754a96bf8338feb003e460a6',
  seededBottomH: 'f6200385cce06fb702cf2a85b52447d2fd0e478ca699dbe7e57574f4f05d86d2',
  bottomH: '3e20718ed1ed8108788b719a14219380b82eb0131dc975bc5a887c9247377407',
  defaultBottomD: '561966a392e3e99c32208634f301c05e27b834fac8aa2db1b715ec8065ffef2b',
  seededBottomD: 'f3a332ffd83dc6f3db2435eb8499dd81e991547940ad423964b32d731bd3f066',
  bottomD: '9acc0085ef1e031e6e47edb518f3ef612dfb70ee6217590164de3367d98f9b97',
  topW: '7fb9a98dade77854628a0de23f92be15fdfc104b3d45ef213cce984db6f9368c',
  bottomW: '509dd3031a0749a69ae859fa111a923fd077b2051f8dc1d469f288fb83ab7abc',
});
const expectedOtherFunctionNames = Object.freeze([
  'applyLibraryPresetUiRawState',
  'createLibraryDoorMapsFromConfig',
  'createLibraryDoorMaps',
  'applyTopLibraryDoorPolicy',
  'applyBottomLibraryDoorPolicy',
  'buildLibraryUiOverride',
  'buildLibraryStructureSelectPatch',
  'buildLibraryUiSnapshotOverride',
  'readLibraryPresetDefaultDoorCount',
  'readPositiveNumber',
  'captureLibraryPresetPreState',
  'createInvariantDoorMapMutators',
]);
const expectedPublicExports = Object.freeze([
  ['applyLibraryPresetUiRawState', 'value'],
  ['createLibraryDoorMapsFromConfig', 'value'],
  ['createLibraryDoorMaps', 'value'],
  ['applyTopLibraryDoorPolicy', 'value'],
  ['applyBottomLibraryDoorPolicy', 'value'],
  ['buildLibraryUiOverride', 'value'],
  ['buildLibraryStructureSelectPatch', 'value'],
  ['buildLibraryUiSnapshotOverride', 'value'],
  ['readLibraryPresetDefaultDoorCount', 'value'],
  ['seedBottomDimensions', 'value'],
  ['captureLibraryPresetPreState', 'value'],
  ['LibraryPresetInvariantDoorMutators', 'type'],
  ['createInvariantDoorMapMutators', 'value'],
  ['isRec', 'value'],
]);

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

function identifierName(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function staticMemberName(node) {
  if (node?.type !== 'MemberExpression') return null;
  if (!node.computed) return identifierName(node.property);
  return node.property?.type === 'Literal' && typeof node.property.value === 'string'
    ? node.property.value
    : null;
}

function memberPath(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type !== 'MemberExpression') return null;
  const objectPath = memberPath(node.object);
  const propertyName = staticMemberName(node);
  return objectPath && propertyName ? `${objectPath}.${propertyName}` : null;
}

function stripQueryHash(specifier) {
  const query = specifier.indexOf('?');
  const hash = specifier.indexOf('#');
  const cut = query === -1 ? hash : hash === -1 ? query : Math.min(query, hash);
  return cut === -1 ? specifier : specifier.slice(0, cut);
}

function canonicalModuleTarget(file) {
  return path.normalize(path.resolve(file)).toLowerCase();
}

function resolveModuleTarget(fromFile, specifier) {
  if (typeof specifier !== 'string') return null;
  const clean = stripQueryHash(specifier);
  if (!clean.startsWith('.')) return null;
  const raw = path.resolve(path.dirname(fromFile), clean);
  const extension = path.extname(raw).toLowerCase();
  const candidates = [raw];
  if (!extension) {
    for (const candidateExtension of sourceFileExtensions) {
      candidates.push(`${raw}${candidateExtension}`, path.join(raw, `index${candidateExtension}`));
    }
  } else {
    const stem = raw.slice(0, -extension.length);
    for (const candidateExtension of runtimeExtensionCandidates[extension] ?? []) {
      candidates.push(`${stem}${candidateExtension}`);
    }
  }
  const resolved = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  return resolved ? canonicalModuleTarget(resolved) : canonicalModuleTarget(raw);
}

const facadeTarget = canonicalModuleTarget(path.join(root, facadeRel));
const libraryOwnerTarget = canonicalModuleTarget(path.join(root, libraryOwnerRel));
const stackSplitOwnerTarget = canonicalModuleTarget(path.join(root, stackSplitOwnerRel));
const publicDimensionsTarget = canonicalModuleTarget(path.join(root, publicDimensionsRel));

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

function canonicalSemanticAst(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return value;
  const semanticPath = value.type === 'MemberExpression' ? semanticMemberPaths.get(memberPath(value)) : null;
  if (semanticPath) return { type: 'SemanticMember', path: semanticPath };
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

function objectKeys(node) {
  return (node?.properties ?? []).map(property =>
    property?.type === 'SpreadElement' ? `...${memberPath(property.argument)}` : identifierName(property.key)
  );
}

function subtreeOwnerSymbols(node) {
  const symbols = new Set();
  walkAst(node, child => {
    const name = identifierName(child);
    if (focusedOwnerSymbols.has(name) || aggregateOwnerSymbols.has(name)) symbols.add(name);
  });
  return symbols;
}

function isImportIdentifier(node) {
  return [
    'ImportSpecifier',
    'ImportDefaultSpecifier',
    'ImportNamespaceSpecifier',
    'ExportSpecifier',
  ].includes(node?.parent?.type);
}

function inspectOwnership(file, source) {
  const sourceFile = createSourceFile(productionRel, source);
  const analysis = analyzeModuleDependencies(file, source);
  const violations = [];
  const seen = new Set();
  const memberCounts = new Map();
  const addViolation = (kind, node, detail = '') => {
    const key = `${kind}:${node?.start ?? -1}:${detail}`;
    if (seen.has(key)) return;
    seen.add(key);
    violations.push({ kind, detail, start: node?.start ?? -1 });
  };

  for (const dependency of analysis.imports) {
    const target = resolveModuleTarget(file, dependency.specifier);
    const isRelevantTarget = [
      facadeTarget,
      libraryOwnerTarget,
      stackSplitOwnerTarget,
      publicDimensionsTarget,
    ].includes(target);
    const relatedSymbols = dependency.importedSymbols.filter(symbol =>
      [...focusedOwnerSymbols, ...aggregateOwnerSymbols, 'LIBRARY_PRESET_DIMENSIONS'].includes(symbol)
    );

    if (target === facadeTarget) addViolation('legacy-facade-import', { start: dependency.statementStart });
    if (target === publicDimensionsTarget) {
      addViolation('public-dimensions-barrel', { start: dependency.statementStart });
    }
    if (dependency.kind === 'dynamic' && (isRelevantTarget || relatedSymbols.length > 0)) {
      addViolation('dynamic-owner-import', { start: dependency.statementStart });
    }
    if (dependency.bindings.some(binding => binding.importedName === '*') && isRelevantTarget) {
      addViolation('namespace-owner-import', { start: dependency.statementStart });
    }
    if (dependency.exportedSymbols.length > 0 && isRelevantTarget) {
      addViolation('focused-owner-bridge', { start: dependency.statementStart });
    }
    if (relatedSymbols.includes('LIBRARY_PRESET_DIMENSIONS')) {
      addViolation('legacy-library-preset-symbol', { start: dependency.statementStart });
    }
    for (const symbol of relatedSymbols.filter(symbol => aggregateOwnerSymbols.has(symbol))) {
      addViolation('aggregate-owner-import', { start: dependency.statementStart }, symbol);
    }
    for (const binding of dependency.bindings) {
      if (focusedOwnerSymbols.has(binding.importedName) && binding.localName !== binding.importedName) {
        addViolation(
          'focused-owner-alias',
          { start: dependency.statementStart },
          `${binding.importedName} as ${binding.localName}`
        );
      }
    }
    if (
      dependency.importedSymbols.includes('LIBRARY_PRESET_LAYOUT_POLICY') &&
      target !== libraryOwnerTarget
    ) {
      addViolation('wrong-focused-owner-path', { start: dependency.statementStart }, dependency.specifier);
    }
    if (
      dependency.importedSymbols.includes('DEFAULT_STACK_SPLIT_LOWER_HEIGHT') &&
      target !== stackSplitOwnerTarget
    ) {
      addViolation('wrong-focused-owner-path', { start: dependency.statementStart }, dependency.specifier);
    }
  }

  walkAst(sourceFile, node => {
    if (node?.type === 'MemberExpression') {
      const value = memberPath(node);
      if (value) memberCounts.set(value, (memberCounts.get(value) ?? 0) + 1);
      const field = staticMemberName(node);
      if (field && protectedFields.has(field) && value !== `LIBRARY_PRESET_LAYOUT_POLICY.${field}`) {
        addViolation('wrong-field-owner', node, value ?? field);
      }
    }

    if (node?.type === 'Identifier' && node.name === 'LIBRARY_PRESET_DIMENSIONS') {
      addViolation('legacy-library-preset-symbol', node);
    }
    if (node?.type === 'Identifier' && aggregateOwnerSymbols.has(node.name) && !isImportIdentifier(node)) {
      addViolation('aggregate-owner-use', node, node.name);
    }
    if (
      node?.type === 'Identifier' &&
      node.name === 'LIBRARY_PRESET_LAYOUT_POLICY' &&
      !isImportIdentifier(node)
    ) {
      const parent = node.parent;
      const field =
        parent?.type === 'MemberExpression' && parent.object === node ? staticMemberName(parent) : null;
      if (!field || !protectedFields.has(field) || parent.computed) {
        addViolation('focused-owner-wrapper', node, parent?.type ?? 'unknown');
      }
    }

    if (node?.type !== 'VariableDeclarator' || !node.init) return;
    const roots = subtreeOwnerSymbols(node.init);
    if (node.init.type === 'ObjectExpression' && roots.size > 0) {
      addViolation('local-owner-aggregate', node, [...roots].sort().join(','));
    }
    if (
      node.init.type === 'Identifier' &&
      (focusedOwnerSymbols.has(node.init.name) || aggregateOwnerSymbols.has(node.init.name))
    ) {
      addViolation('local-owner-copy', node, node.init.name);
    }
  });

  return { analysis, memberCounts, sourceFile, violations };
}

function sourceFacts(source) {
  const sourceFile = createSourceFile(productionRel, source);
  const numericLiterals = [];
  const functions = [];
  let seedFunction = null;
  walkAst(sourceFile, node => {
    if (node?.type === 'Literal' && typeof node.value === 'number') numericLiterals.push(node.value);
    if (node?.type !== 'FunctionDeclaration') return;
    functions.push(node);
    if (identifierName(node.id) === 'seedBottomDimensions') seedFunction = node;
  });
  assert.ok(seedFunction);

  const formulaHashes = {};
  walkAst(seedFunction.body, node => {
    const name = node?.type === 'VariableDeclarator' ? identifierName(node.id) : null;
    if (name && Object.hasOwn(expectedFormulaHashes, name)) {
      formulaHashes[name] = semanticSha256(canonicalSemanticAst(node.init));
    }
  });

  const returnShapes = [];
  walkAst(seedFunction.body, node => {
    if (node?.type === 'ReturnStatement' && node.argument?.type === 'ObjectExpression') {
      returnShapes.push(objectKeys(node.argument));
    }
  });

  const otherFunctions = functions
    .filter(node => identifierName(node.id) !== 'seedBottomDimensions')
    .map(node => [identifierName(node.id), canonicalSemanticAst(node)]);
  return {
    formulaHashes,
    numericLiterals,
    otherFunctionNames: otherFunctions.map(([name]) => name),
    otherFunctionsHash: semanticSha256(otherFunctions),
    returnShapes,
    seedFunction,
    seedHash: semanticSha256(canonicalSemanticAst(seedFunction)),
  };
}

const expectedEntry162 = Object.freeze({
  from: 'features',
  to: 'shared',
  additionalStatements: 1,
  owner: 'dimension-ownership-migration',
  reviewedAt: '2026-07-27',
  reviewBy: '2026-10-18',
  fromFile: productionRel,
  companionImport: {
    toFile: libraryOwnerRel,
    kind: 'value',
    importedSymbols: ['LIBRARY_PRESET_LAYOUT_POLICY'],
    syntax: 'static-import',
  },
  removedImport: {
    toFile: facadeRel,
    kind: 'value',
    importedSymbols: ['DEFAULT_STACK_SPLIT_LOWER_HEIGHT', 'LIBRARY_PRESET_DIMENSIONS'],
    syntax: 'static-import',
  },
  addedImport: {
    toFile: stackSplitOwnerRel,
    kind: 'value',
    importedSymbols: ['DEFAULT_STACK_SPLIT_LOWER_HEIGHT'],
    syntax: 'static-import',
  },
  reason:
    'The Library Preset Flow feature consumer replaces one combined legacy facade statement with the focused Library Preset Layout policy plus the focused Stack Split lower-height scalar on the existing features to shared edge.',
  removalCondition:
    'Remove this entry when a reviewed Library Preset Flow composition seam eliminates the extra Stack Split statement without reintroducing the legacy facade.',
});

const HISTORICAL_LEDGER_PREFIX_161_HASH = 'acf971df9f7a96ec701270ed81b312863814a092835ce91a9c118779aca5f471';
const HISTORICAL_LEDGER_PREFIX_162_HASH = '6f4d890ffaf9346798e02f198f1a61c658b1f496b2640cfe5b1df8e1f8c970bc';

function assertHistoricalLedger(migrationBudgets) {
  assert.ok(migrationBudgets.length >= 162);
  assert.equal(semanticSha256(migrationBudgets.slice(0, 161)), HISTORICAL_LEDGER_PREFIX_161_HASH);
  assert.deepEqual(migrationBudgets[161], expectedEntry162);
  assert.equal(semanticSha256(migrationBudgets.slice(0, 162)), HISTORICAL_LEDGER_PREFIX_162_HASH);
}

test('Library Preset Flow is one exact consumer with two direct focused-owner imports', () => {
  assert.equal(productionRel, 'esm/native/features/library_preset/library_preset_flow_shared.ts');
  const file = path.join(root, productionRel);
  const source = read(productionRel);
  const inspection = inspectOwnership(file, source);
  assert.deepEqual(inspection.violations, []);

  const ownershipImports = inspection.analysis.imports.filter(dependency => {
    const target = resolveModuleTarget(file, dependency.specifier);
    return target === libraryOwnerTarget || target === stackSplitOwnerTarget;
  });
  assert.deepEqual(
    ownershipImports.map(dependency => ({
      specifier: dependency.specifier,
      kind: dependency.kind,
      syntax: dependency.syntax,
      importedSymbols: dependency.importedSymbols,
      exportedSymbols: dependency.exportedSymbols,
      bindings: dependency.bindings.map(binding => [
        binding.importedName,
        binding.localName,
        binding.exportedName,
      ]),
    })),
    [
      {
        specifier: '../../../shared/dimensions/library_preset_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['LIBRARY_PRESET_LAYOUT_POLICY'],
        exportedSymbols: [],
        bindings: [['LIBRARY_PRESET_LAYOUT_POLICY', 'LIBRARY_PRESET_LAYOUT_POLICY', null]],
      },
      {
        specifier: '../../../shared/dimensions/stack_split_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['DEFAULT_STACK_SPLIT_LOWER_HEIGHT'],
        exportedSymbols: [],
        bindings: [['DEFAULT_STACK_SPLIT_LOWER_HEIGHT', 'DEFAULT_STACK_SPLIT_LOWER_HEIGHT', null]],
      },
    ]
  );

  for (const [field, count] of Object.entries(fieldCounts)) {
    assert.equal(inspection.memberCounts.get(`LIBRARY_PRESET_LAYOUT_POLICY.${field}`) ?? 0, count, field);
  }
});

test('Library Preset Flow preserves literals, signatures, return shape, formulas, and every other function', () => {
  const source = read(productionRel);
  const facts = sourceFacts(source);
  assert.deepEqual(facts.numericLiterals, expectedNumericLiterals);
  assert.deepEqual(
    facts.seedFunction.params.map(parameter => ({
      name: identifierName(parameter),
      optional: !!parameter.optional,
      type: source.slice(parameter.typeAnnotation.start, parameter.typeAnnotation.end).replaceAll(/\s/gu, ''),
    })),
    [
      { name: 'args', optional: false, type: ':LibraryPresetToggleArgs' },
      {
        name: 'resumeRaw',
        optional: true,
        type: ':Partial<LibraryPresetUiRawState>|null',
      },
    ]
  );
  assert.equal(
    source
      .slice(facts.seedFunction.returnType.start, facts.seedFunction.returnType.end)
      .replaceAll(/\s/gu, ''),
    ':{bottomH:number;bottomD:number;topW:number;bottomW:number;bottomDoorsCount:number;topDoorsCount:number;}'
  );
  assert.deepEqual(facts.returnShapes, [expectedReturnKeys]);
  assert.deepEqual(facts.formulaHashes, expectedFormulaHashes);
  assert.equal(facts.seedHash, '945278ee47a2acc7bc772bfd9642d4327e811143fe4d0286c562a551b9974821');
  assert.deepEqual(facts.otherFunctionNames, expectedOtherFunctionNames);
  assert.equal(facts.otherFunctionsHash, 'dbff296b7a11dac8278608ade562b8d6dfa16132f0d9e4d68d848b91273f4943');
  assert.deepEqual(
    collectNamedModuleExports(productionRel, source).map(entry => [entry.exportedName, entry.kind]),
    expectedPublicExports
  );
});

test('Library Preset Flow rejects facade, aliases, aggregates, barrels, bridges, wrappers, and wrong owners', () => {
  const fixtureFile = path.join(root, productionRel);
  const cases = [
    {
      name: 'combined facade import',
      kind: 'legacy-facade-import',
      source:
        "import { DEFAULT_STACK_SPLIT_LOWER_HEIGHT, LIBRARY_PRESET_DIMENSIONS } from '../../../shared/wardrobe_dimension_tokens_shared.js';",
    },
    {
      name: 'focused owner alias',
      kind: 'focused-owner-alias',
      source:
        "import { LIBRARY_PRESET_LAYOUT_POLICY as layout } from '../../../shared/dimensions/library_preset_policy.js';\nexport const value = layout.minWidthCm;",
    },
    {
      name: 'Library Preset aggregate owner',
      kind: 'aggregate-owner-import',
      source:
        "import { LIBRARY_PRESET_POLICY } from '../../../shared/dimensions/library_preset_policy.js';\nexport const value = LIBRARY_PRESET_POLICY.minWidthCm;",
    },
    {
      name: 'Stack Split aggregate owner',
      kind: 'aggregate-owner-import',
      source:
        "import { STACK_SPLIT_POLICY } from '../../../shared/dimensions/stack_split_policy.js';\nexport const value = STACK_SPLIT_POLICY.defaults.lowerHeightCm;",
    },
    {
      name: 'namespace through public dimensions barrel',
      kind: 'public-dimensions-barrel',
      source:
        "import * as dimensions from '../dimensions/index.js';\nexport const value = dimensions.LIBRARY_PRESET_DIMENSIONS.minWidthCm;",
    },
    {
      name: 'dynamic focused owner import',
      kind: 'dynamic-owner-import',
      source:
        "const { LIBRARY_PRESET_LAYOUT_POLICY } = await import('../../../shared/dimensions/library_preset_policy.js');\nexport const value = LIBRARY_PRESET_LAYOUT_POLICY.minWidthCm;",
    },
    {
      name: 'extensionless compatibility import',
      kind: 'legacy-facade-import',
      source:
        "import { LIBRARY_PRESET_DIMENSIONS } from '../../../shared/wardrobe_dimension_tokens_shared';\nexport const value = LIBRARY_PRESET_DIMENSIONS.minWidthCm;",
    },
    {
      name: 'indirect focused owner bridge',
      kind: 'focused-owner-bridge',
      source:
        "export { LIBRARY_PRESET_LAYOUT_POLICY } from '../../../shared/dimensions/library_preset_policy.js';",
    },
    {
      name: 'local focused owner aggregate',
      kind: 'local-owner-aggregate',
      source:
        "import { LIBRARY_PRESET_LAYOUT_POLICY } from '../../../shared/dimensions/library_preset_policy.js';\nimport { DEFAULT_STACK_SPLIT_LOWER_HEIGHT } from '../../../shared/dimensions/stack_split_policy.js';\nexport const defaults = { layout: LIBRARY_PRESET_LAYOUT_POLICY, lowerHeight: DEFAULT_STACK_SPLIT_LOWER_HEIGHT };",
    },
    {
      name: 'focused owner wrapper',
      kind: 'focused-owner-wrapper',
      source:
        "import { LIBRARY_PRESET_LAYOUT_POLICY } from '../../../shared/dimensions/library_preset_policy.js';\nexport const readLayout = () => LIBRARY_PRESET_LAYOUT_POLICY;",
    },
    {
      name: 'field mapped to the wrong owner',
      kind: 'wrong-field-owner',
      source:
        "import { LIBRARY_PRESET_MODULE_DEFAULTS_POLICY } from '../../../shared/dimensions/library_preset_policy.js';\nexport const value = LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.minTopHeightCm;",
    },
  ];

  for (const fixture of cases) {
    const inspection = inspectOwnership(fixtureFile, fixture.source);
    assert.equal(
      inspection.violations.some(violation => violation.kind === fixture.kind),
      true,
      fixture.name
    );
  }
});

test('Library Preset Flow locks Prefix 161, exact Entry 162, and Prefix 162 append-safely', () => {
  const baseline = JSON.parse(read(baselineRel));
  assertHistoricalLedger(baseline.migrationBudgets);

  const historicalPrefix162 = structuredClone(baseline.migrationBudgets.slice(0, 162));
  const entry163 = {
    ...structuredClone(historicalPrefix162[161]),
    fromFile: 'esm/native/features/future_library_preset/entry_163.ts',
    reason: 'Synthetic Entry 163 after the Library Preset Flow historical prefix.',
    removalCondition: 'Synthetic Entry 163 removal condition.',
  };
  const extendedLedger = [...historicalPrefix162, entry163];
  assert.equal(extendedLedger.length, 163);
  assert.equal(semanticSha256(extendedLedger.slice(0, 161)), HISTORICAL_LEDGER_PREFIX_161_HASH);
  assert.deepEqual(extendedLedger[161], expectedEntry162);
  assert.equal(semanticSha256(extendedLedger.slice(0, 162)), HISTORICAL_LEDGER_PREFIX_162_HASH);
  assert.doesNotThrow(() => assertHistoricalLedger(extendedLedger));
});
