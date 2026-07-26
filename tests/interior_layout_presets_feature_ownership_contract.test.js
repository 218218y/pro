import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/features/interior_layout_presets/ops.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const fittingsOwnerRel = 'esm/shared/dimensions/interior_fittings_policy.ts';
const storageOwnerRel = 'esm/shared/dimensions/interior_storage_policy.ts';
const sourceFileExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const runtimeExtensionCandidates = Object.freeze({
  '.js': Object.freeze(['.ts', '.tsx', '.mts']),
  '.mjs': Object.freeze(['.mts', '.ts', '.tsx']),
  '.cjs': Object.freeze(['.cts', '.ts', '.tsx']),
});
const aggregateOwnerSymbols = new Set([
  'INTERIOR_FITTINGS_POLICY',
  'INTERIOR_PRESET_POLICY',
  'INTERIOR_ROD_POLICY',
  'INTERIOR_STORAGE_POLICY',
]);
const focusedOwnerSymbols = new Set([
  'INTERIOR_PRESET_ROD_FACTORS_POLICY',
  'INTERIOR_PRESET_SHELF_ROWS_POLICY',
  'INTERIOR_STORAGE_BARRIER_POLICY',
]);
const allowedOwnerAliases = Object.freeze({
  presetRodFactors: 'INTERIOR_PRESET_ROD_FACTORS_POLICY',
  presetShelfRows: 'INTERIOR_PRESET_SHELF_ROWS_POLICY',
});
const expectedImports = Object.freeze([
  Object.freeze({
    specifier: '../../../shared/dimensions/interior_fittings_policy.js',
    ownerRel: fittingsOwnerRel,
    symbols: Object.freeze(['INTERIOR_PRESET_ROD_FACTORS_POLICY', 'INTERIOR_PRESET_SHELF_ROWS_POLICY']),
  }),
  Object.freeze({
    specifier: '../../../shared/dimensions/interior_storage_policy.js',
    ownerRel: storageOwnerRel,
    symbols: Object.freeze(['INTERIOR_STORAGE_BARRIER_POLICY']),
  }),
]);
const expectedMappings = Object.freeze([
  Object.freeze({
    legacy: 'presets.fullShelfRows',
    focused: 'presetShelfRows.fullShelfRows',
    count: 1,
  }),
  Object.freeze({
    legacy: 'presets.hangingShelfRows',
    focused: 'presetShelfRows.hangingShelfRows',
    count: 2,
  }),
  Object.freeze({
    legacy: 'presets.splitShelfRows',
    focused: 'presetShelfRows.splitShelfRows',
    count: 1,
  }),
  Object.freeze({
    legacy: 'presets.mixedRodYFactor',
    focused: 'presetRodFactors.mixedRodYFactor',
    count: 1,
  }),
  Object.freeze({
    legacy: 'presets.hangingRodYFactor',
    focused: 'presetRodFactors.hangingRodYFactor',
    count: 1,
  }),
  Object.freeze({
    legacy: 'presets.splitUpperRodYFactor',
    focused: 'presetRodFactors.splitUpperRodYFactor',
    count: 1,
  }),
  Object.freeze({
    legacy: 'presets.splitUpperRodLimitFactor',
    focused: 'presetRodFactors.splitUpperRodLimitFactor',
    count: 1,
  }),
  Object.freeze({
    legacy: 'presets.splitLowerRodYFactor',
    focused: 'presetRodFactors.splitLowerRodYFactor',
    count: 1,
  }),
  Object.freeze({
    legacy: 'presets.splitLowerRodLimitFactor',
    focused: 'presetRodFactors.splitLowerRodLimitFactor',
    count: 1,
  }),
  Object.freeze({
    legacy: 'presets.storageRodYFactor',
    focused: 'presetRodFactors.storageRodYFactor',
    count: 1,
  }),
  Object.freeze({
    legacy: 'presets.storageRodLimitFactor',
    focused: 'presetRodFactors.storageRodLimitFactor',
    count: 1,
  }),
  Object.freeze({
    legacy: 'storage.barrierHeightM',
    focused: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM',
    count: 1,
  }),
  Object.freeze({
    legacy: 'storage.barrierFrontZOffsetM',
    focused: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierFrontZOffsetM',
    count: 1,
  }),
]);
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

function identifierName(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'AssignmentPattern') return identifierName(node.left);
  return null;
}

function memberPath(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type !== 'MemberExpression') return null;
  const objectPath = memberPath(node.object);
  const propertyName = identifierName(node.property);
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
  const cleanSpecifier = stripQueryHash(specifier);
  let raw;
  if (cleanSpecifier.startsWith('@/')) raw = path.join(root, 'esm', cleanSpecifier.slice(2));
  else if (cleanSpecifier.startsWith('.')) raw = path.resolve(path.dirname(fromFile), cleanSpecifier);
  else return null;

  const candidates = [raw];
  const extension = path.extname(raw).toLowerCase();
  if (!extension) {
    candidates.push(...sourceFileExtensions.map(sourceExtension => `${raw}${sourceExtension}`));
  } else {
    const replacementExtensions = runtimeExtensionCandidates[extension] ?? [];
    const stem = raw.slice(0, -extension.length);
    candidates.push(...replacementExtensions.map(sourceExtension => `${stem}${sourceExtension}`));
  }
  if (fs.existsSync(raw) && fs.statSync(raw).isDirectory()) {
    candidates.push(
      ...sourceFileExtensions.map(sourceExtension => path.join(raw, `index${sourceExtension}`))
    );
  }
  const resolved = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  return resolved ? canonicalModuleTarget(resolved) : null;
}

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

function canonicalAst(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return undefined;
  seen.add(value);
  if (Array.isArray(value)) return value.map(item => canonicalAst(item, seen));
  const result = {};
  for (const key of Object.keys(value).sort()) {
    if (omittedAstKeys.has(key)) continue;
    const next = canonicalAst(value[key], seen);
    if (next !== undefined) result[key] = next;
  }
  return result;
}

function directOwnerReference(node) {
  return focusedOwnerSymbols.has(identifierName(node));
}

function inspectOwnershipViolations(file, source) {
  const violations = [];
  const analysis = analyzeModuleDependencies(file, source);
  const facadeTarget = canonicalModuleTarget(path.join(root, facadeRel));
  const publicDimensionsTarget = canonicalModuleTarget(path.join(root, publicDimensionsRel));
  const expectedByTarget = new Map(
    expectedImports.map(entry => [canonicalModuleTarget(path.join(root, entry.ownerRel)), entry])
  );

  for (const dependency of analysis.imports) {
    const target = resolveModuleTarget(file, dependency.specifier);
    if (target === facadeTarget) {
      violations.push({ kind: 'legacy-facade', syntax: dependency.syntax });
    }
    if (target === publicDimensionsTarget) {
      violations.push({ kind: 'public-dimensions-barrel', syntax: dependency.syntax });
    }
    if (dependency.syntax === 'dynamic-import') {
      violations.push({ kind: 'dynamic-import', specifier: dependency.specifier });
    }
    if (dependency.bindings.some(binding => binding.importedName === '*')) {
      violations.push({ kind: 'namespace-import', specifier: dependency.specifier });
    }
    for (const symbol of dependency.importedSymbols) {
      if (aggregateOwnerSymbols.has(symbol)) violations.push({ kind: 'aggregate-owner', symbol });
      if (
        focusedOwnerSymbols.has(symbol) &&
        !expectedByTarget.has(target) &&
        dependency.syntax === 'static-re-export'
      ) {
        violations.push({ kind: 'owner-bridge-reexport', symbol });
      } else if (focusedOwnerSymbols.has(symbol) && !expectedByTarget.has(target)) {
        violations.push({ kind: 'owner-bridge-import', symbol });
      }
    }

    const expected = expectedByTarget.get(target);
    if (!expected) continue;
    const validBindings =
      dependency.bindings.length === expected.symbols.length &&
      dependency.bindings.every(
        (binding, index) =>
          binding.importedName === expected.symbols[index] &&
          binding.localName === expected.symbols[index] &&
          binding.exportedName === null
      );
    if (
      dependency.specifier !== expected.specifier ||
      dependency.kind !== 'value' ||
      dependency.syntax !== 'static-import' ||
      stableJson(dependency.importedSymbols) !== stableJson(expected.symbols) ||
      !validBindings
    ) {
      violations.push({ kind: 'focused-import-shape', owner: expected.ownerRel });
    }
  }

  const sourceFile = createSourceFile(file, source);
  walkAst(sourceFile, node => {
    const name = identifierName(node);
    if (name === 'INTERIOR_FITTINGS_DIMENSIONS') violations.push({ kind: 'legacy-symbol-use' });
    if (aggregateOwnerSymbols.has(name)) violations.push({ kind: 'aggregate-owner-use', symbol: name });

    if (node?.type === 'VariableDeclarator') {
      const localName = identifierName(node.id);
      const ownerName = identifierName(node.init);
      if (focusedOwnerSymbols.has(ownerName) && allowedOwnerAliases[localName] !== ownerName) {
        violations.push({ kind: 'owner-object-alias', localName, ownerName });
      }
      if (
        node.init?.type === 'ObjectExpression' &&
        (node.init.properties ?? []).some(
          property =>
            property?.type === 'Property' &&
            (directOwnerReference(property.value) ||
              (property.value?.type === 'ObjectExpression' &&
                (property.value.properties ?? []).some(nested => directOwnerReference(nested.value))))
        )
      ) {
        violations.push({ kind: 'local-aggregate', localName });
      }
    }

    if (node?.type === 'SpreadElement' && directOwnerReference(node.argument)) {
      violations.push({ kind: 'owner-spread' });
    }
    if (node?.type === 'CallExpression') {
      const callee = memberPath(node.callee) ?? identifierName(node.callee);
      if (
        ['Object.assign', 'Object.freeze', 'structuredClone'].includes(callee) &&
        (node.arguments ?? []).some(directOwnerReference)
      ) {
        violations.push({ kind: 'owner-wrapper', callee });
      }
    }
  });

  return { analysis, sourceFile, violations };
}

function objectKeys(node) {
  return (node?.properties ?? []).map(property => identifierName(property.key));
}

function sourceFacts() {
  const source = read(consumerRel);
  const sourceFile = createSourceFile(consumerRel, source);
  const declarations = new Map();
  const memberCounts = new Map();
  const numericLiterals = [];
  const arrowFunctions = new Map();
  let exportedFunction = null;
  let opsInitializer = null;
  let storageBarrierShape = null;
  let finalReturn = null;
  const switchCases = [];

  walkAst(sourceFile, node => {
    if (node?.type === 'MemberExpression') {
      const value = memberPath(node);
      if (value) memberCounts.set(value, (memberCounts.get(value) ?? 0) + 1);
    }
    if (node?.type === 'Literal' && typeof node.value === 'number') numericLiterals.push(node.value);
    if (node?.type === 'VariableDeclarator') {
      const name = identifierName(node.id);
      if (name) declarations.set(name, memberPath(node.init));
      if (name === 'ops' && node.init?.type === 'ObjectExpression') opsInitializer = node.init;
      if (node.init?.type === 'ArrowFunctionExpression') {
        arrowFunctions.set(name, {
          params: node.init.params.map(identifierName),
          returnType: source
            .slice(node.init.returnType.start, node.init.returnType.end)
            .replaceAll(/\s/gu, ''),
        });
      }
    }
    if (
      node?.type === 'AssignmentExpression' &&
      memberPath(node.left) === 'ops.storageBarrier' &&
      node.right?.type === 'ObjectExpression'
    ) {
      storageBarrierShape = node.right;
    }
    if (
      node?.type === 'ExportNamedDeclaration' &&
      node.declaration?.type === 'FunctionDeclaration' &&
      identifierName(node.declaration.id) === 'computeInteriorPresetOps'
    ) {
      exportedFunction = node.declaration;
      finalReturn = node.declaration.body.body.at(-1);
    }
    if (node?.type === 'SwitchCase') {
      switchCases.push(node.test === null ? 'default' : node.test.value);
    }
  });
  numericLiterals.sort((left, right) => left - right);
  return {
    source,
    sourceFile,
    declarations,
    memberCounts,
    numericLiterals,
    arrowFunctions,
    exportedFunction,
    opsInitializer,
    storageBarrierShape,
    finalReturn,
    switchCases,
  };
}

const expectedEntry159 = Object.freeze({
  from: 'features',
  to: 'shared',
  additionalStatements: 1,
  owner: 'dimension-ownership-migration',
  reviewedAt: '2026-07-26',
  reviewBy: '2026-10-18',
  fromFile: consumerRel,
  companionImport: {
    toFile: fittingsOwnerRel,
    kind: 'value',
    importedSymbols: ['INTERIOR_PRESET_ROD_FACTORS_POLICY', 'INTERIOR_PRESET_SHELF_ROWS_POLICY'],
    syntax: 'static-import',
  },
  removedImport: {
    toFile: facadeRel,
    kind: 'value',
    importedSymbols: ['INTERIOR_FITTINGS_DIMENSIONS'],
    syntax: 'static-import',
  },
  addedImport: {
    toFile: storageOwnerRel,
    kind: 'value',
    importedSymbols: ['INTERIOR_STORAGE_BARRIER_POLICY'],
    syntax: 'static-import',
  },
  reason:
    'The Interior Layout Presets feature consumer replaces one aggregate compatibility statement with the focused Interior Preset Shelf Rows/Rod Factors policies plus the focused Interior Storage Barrier policy on the existing features to shared edge.',
  removalCondition:
    'Remove this entry when a reviewed Interior Layout Presets composition seam eliminates the extra Interior Storage statement without reintroducing the legacy facade.',
});

test('Interior Layout Presets is exactly one production consumer with two exact focused-owner imports', () => {
  assert.deepEqual([consumerRel], ['esm/native/features/interior_layout_presets/ops.ts']);
  const absolute = path.join(root, consumerRel);
  const inspection = inspectOwnershipViolations(absolute, read(consumerRel));
  assert.deepEqual(inspection.violations, []);
  assert.deepEqual(inspection.analysis.unresolvedDynamicImports, []);
  assert.deepEqual(inspection.analysis.forbiddenModuleSyntax, []);

  const focusedImports = inspection.analysis.imports.filter(dependency =>
    expectedImports.some(
      expected =>
        resolveModuleTarget(absolute, dependency.specifier) ===
        canonicalModuleTarget(path.join(root, expected.ownerRel))
    )
  );
  assert.deepEqual(
    focusedImports.map(({ specifier, kind, syntax, importedSymbols, bindings }) => ({
      specifier,
      kind,
      syntax,
      importedSymbols,
      bindings,
    })),
    expectedImports.map(expected => ({
      specifier: expected.specifier,
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: [...expected.symbols],
      bindings: expected.symbols.map(symbol => ({
        importedName: symbol,
        localName: symbol,
        exportedName: null,
      })),
    }))
  );
  assert.equal(focusedImports.length, 2);
  assert.doesNotMatch(read(consumerRel), /wardrobe_dimension_tokens_shared/u);
  assert.doesNotMatch(read(consumerRel), /\bINTERIOR_FITTINGS_DIMENSIONS\b/u);
});

test('Interior Layout Presets maps every legacy field to its focused policy without local recomposition', () => {
  const facts = sourceFacts();
  for (const mapping of expectedMappings) {
    assert.equal(
      facts.memberCounts.get(mapping.focused),
      mapping.count,
      `${mapping.legacy} -> ${mapping.focused}`
    );
  }
  assert.equal(facts.declarations.get('presetShelfRows'), 'INTERIOR_PRESET_SHELF_ROWS_POLICY');
  assert.equal(facts.declarations.get('presetRodFactors'), 'INTERIOR_PRESET_ROD_FACTORS_POLICY');
  assert.deepEqual(
    [...facts.declarations.entries()].filter(([, owner]) => focusedOwnerSymbols.has(owner)),
    [
      ['presetShelfRows', 'INTERIOR_PRESET_SHELF_ROWS_POLICY'],
      ['presetRodFactors', 'INTERIOR_PRESET_ROD_FACTORS_POLICY'],
    ]
  );
  assert.doesNotMatch(facts.source, /\bconst\s+(?:preset|presetDims|presets)\s*=/u);
});

test('Interior Layout Presets preserves numeric literals, signature, ops shape, cases, formulas, and return', () => {
  const facts = sourceFacts();
  assert.deepEqual(facts.numericLiterals, [0, 0]);
  assert.equal(
    createHash('sha256').update(JSON.stringify(facts.numericLiterals)).digest('hex'),
    '3d5812abc84c11768aa73a732c85d75dbed439188f5bb3239e9b762ea31d9862'
  );
  assert.ok(facts.exportedFunction);
  assert.deepEqual(facts.exportedFunction.params.map(identifierName), ['layoutType']);
  assert.equal(
    facts.source
      .slice(facts.exportedFunction.returnType.start, facts.exportedFunction.returnType.end)
      .replaceAll(/\s/gu, ''),
    ':InteriorPresetOpsLike'
  );
  assert.deepEqual(objectKeys(facts.opsInitializer), ['shelves', 'rods']);
  assert.deepEqual(facts.arrowFunctions.get('addFullShelfRows'), {
    params: [],
    returnType: ':void',
  });
  assert.deepEqual(facts.arrowFunctions.get('pushRod'), {
    params: ['yFactor', 'enableHangingClothes', 'enableSingleHanger', 'limitFactor', 'limitAdd'],
    returnType: ':void',
  });
  assert.deepEqual(facts.switchCases, [
    'shelves',
    'mixed',
    'hanging',
    'hanging_top2',
    'hanging_split',
    'storage',
    'storage_shelf',
    'default',
  ]);
  assert.deepEqual(objectKeys(facts.storageBarrierShape), ['barrierH', 'zFrontOffset']);
  assert.equal(facts.finalReturn?.type, 'ReturnStatement');
  assert.equal(identifierName(facts.finalReturn?.argument), 'ops');
  assert.equal(
    semanticSha256(canonicalAst(facts.exportedFunction)),
    '551326becceef245dd31da754e4c6fc61f0833d95ac6439c560d49984c86e29f'
  );

  assert.match(facts.source, /typeof layoutType === 'string' \? layoutType : 'shelves'/u);
  assert.match(facts.source, /ops\.shelves = Array\.from\(presetShelfRows\.fullShelfRows\);/u);
  assert.match(facts.source, /yFactor: Number\(yFactor\)/u);
  assert.match(facts.source, /enableHangingClothes: !!enableHangingClothes/u);
  assert.match(facts.source, /enableSingleHanger: !!enableSingleHanger/u);
  assert.match(
    facts.source,
    /if \(Number\.isFinite\(Number\(limitFactor\)\)\) rod\.limitFactor = Number\(limitFactor\);/u
  );
  assert.match(
    facts.source,
    /if \(Number\.isFinite\(Number\(limitAdd\)\)\) rod\.limitAdd = Number\(limitAdd\);/u
  );
  assert.match(
    facts.source,
    /presetRodFactors\.splitUpperRodLimitFactor,\s*0\s*\);[\s\S]*presetRodFactors\.splitLowerRodLimitFactor,\s*0\s*\);/u
  );
  assert.match(facts.source, /presetRodFactors\.storageRodLimitFactor,\s*-barrierH\s*\);/u);
});

test('Interior Layout Presets rejects facade, aliases, aggregates, recomposition, barrels, dynamic imports, and bridges', () => {
  const cases = [
    {
      name: 'facade import',
      expectedKind: 'legacy-facade',
      source:
        "import { INTERIOR_FITTINGS_DIMENSIONS } from '../../../shared/wardrobe_dimension_tokens_shared.js';\nexport const value = INTERIOR_FITTINGS_DIMENSIONS.presets.fullShelfRows;",
    },
    {
      name: 'focused owner alias',
      expectedKind: 'focused-import-shape',
      source:
        "import { INTERIOR_STORAGE_BARRIER_POLICY as storageBarrier } from '../../../shared/dimensions/interior_storage_policy.js';\nexport const value = storageBarrier.barrierHeightM;",
    },
    {
      name: 'Interior Preset aggregate',
      expectedKind: 'aggregate-owner',
      source:
        "import { INTERIOR_PRESET_POLICY } from '../../../shared/dimensions/interior_fittings_policy.js';\nexport const value = INTERIOR_PRESET_POLICY.fullShelfRows;",
    },
    {
      name: 'Interior Storage aggregate',
      expectedKind: 'aggregate-owner',
      source:
        "import { INTERIOR_STORAGE_POLICY } from '../../../shared/dimensions/interior_storage_policy.js';\nexport const value = INTERIOR_STORAGE_POLICY.barrierHeightM;",
    },
    {
      name: 'Interior Fittings aggregate',
      expectedKind: 'aggregate-owner',
      source:
        "import { INTERIOR_FITTINGS_POLICY } from '../../../shared/dimensions/interior_fittings_policy.js';\nexport const value = INTERIOR_FITTINGS_POLICY.presets;",
    },
    {
      name: 'local preset aggregate',
      expectedKind: 'local-aggregate',
      source:
        "import { INTERIOR_PRESET_ROD_FACTORS_POLICY, INTERIOR_PRESET_SHELF_ROWS_POLICY } from '../../../shared/dimensions/interior_fittings_policy.js';\nconst preset = { rows: INTERIOR_PRESET_SHELF_ROWS_POLICY, factors: INTERIOR_PRESET_ROD_FACTORS_POLICY };\nexport const value = preset;",
    },
    {
      name: 'public dimensions namespace',
      expectedKind: 'public-dimensions-barrel',
      source:
        "import * as dimensions from '../dimensions/index.js';\nexport const value = dimensions.INTERIOR_FITTINGS_DIMENSIONS;",
    },
    {
      name: 'extensionless compatibility import',
      expectedKind: 'legacy-facade',
      source:
        "import { INTERIOR_FITTINGS_DIMENSIONS } from '../../../shared/wardrobe_dimension_tokens_shared';\nexport const value = INTERIOR_FITTINGS_DIMENSIONS.storage.barrierHeightM;",
    },
    {
      name: 'dynamic import',
      expectedKind: 'dynamic-import',
      source: "export const value = import('../../../shared/dimensions/interior_fittings_policy.js');",
    },
    {
      name: 'indirect bridge re-export',
      expectedKind: 'owner-bridge-reexport',
      source:
        "export { INTERIOR_PRESET_ROD_FACTORS_POLICY } from './interior_layout_presets_policy_bridge.js';",
    },
  ];

  for (const probe of cases) {
    const inspection = inspectOwnershipViolations(path.join(root, consumerRel), probe.source);
    assert.equal(
      inspection.violations.some(violation => violation.kind === probe.expectedKind),
      true,
      probe.name
    );
  }
});

test('Interior Layout Presets locks exact Entry 159 and the historical 159-entry prefix', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.ok(baseline.migrationBudgets.length >= 159);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 158)),
    '7cb5d770d8d0297e4037ecf59eaf417a164495416cf956615c37af75163d0516'
  );
  assert.deepEqual(baseline.migrationBudgets[158], expectedEntry159);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 159)),
    '7bb983429d5ea9cf6c8f4e6f44f8637a0d2841866d09bf9ddc8515dd230e16a8'
  );

  const futureLedger = [...baseline.migrationBudgets, { id: 'future-entry-after-159' }];
  assert.equal(
    semanticSha256(futureLedger.slice(0, 159)),
    '7bb983429d5ea9cf6c8f4e6f44f8637a0d2841866d09bf9ddc8515dd230e16a8'
  );

  const mutatedHistoricalLedger = structuredClone(baseline.migrationBudgets);
  mutatedHistoricalLedger[158] = {
    ...mutatedHistoricalLedger[158],
    reason: 'mutated historical Entry 159',
  };
  assert.notDeepEqual(mutatedHistoricalLedger[158], expectedEntry159);
  assert.notEqual(
    semanticSha256(mutatedHistoricalLedger.slice(0, 159)),
    '7bb983429d5ea9cf6c8f4e6f44f8637a0d2841866d09bf9ddc8515dd230e16a8'
  );
});
