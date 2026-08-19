import test from 'node:test';
import assert from 'node:assert/strict';
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
const compositionOwnerRel = 'esm/shared/dimensions/library_preset_flow_dimension_policy.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
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
const expectedNumericLiterals = Object.freeze([1, 1000, 1, 0, 0, 0, 0.01, 0]);
const expectedReturnKeys = Object.freeze([
  'bottomH',
  'bottomD',
  'topW',
  'bottomW',
  'topDoorsCount',
  'bottomDoorsCount',
]);
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
const compositionOwnerTarget = canonicalModuleTarget(path.join(root, compositionOwnerRel));
const publicDimensionsTarget = canonicalModuleTarget(path.join(root, publicDimensionsRel));

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
      compositionOwnerTarget,
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
      target !== compositionOwnerTarget
    ) {
      addViolation('wrong-focused-owner-path', { start: dependency.statementStart }, dependency.specifier);
    }
    if (
      dependency.importedSymbols.includes('DEFAULT_STACK_SPLIT_LOWER_HEIGHT') &&
      target !== compositionOwnerTarget
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

  const returnShapes = [];
  walkAst(seedFunction.body, node => {
    if (node?.type === 'ReturnStatement' && node.argument?.type === 'ObjectExpression') {
      returnShapes.push(objectKeys(node.argument));
    }
  });

  return {
    numericLiterals,
    otherFunctionNames: functions
      .filter(node => identifierName(node.id) !== 'seedBottomDimensions')
      .map(node => identifierName(node.id)),
    returnShapes,
    seedFunction,
  };
}

test('Library Preset Flow is one exact consumer with one composition-owner import', () => {
  assert.equal(productionRel, 'esm/native/features/library_preset/library_preset_flow_shared.ts');
  const file = path.join(root, productionRel);
  const source = read(productionRel);
  const inspection = inspectOwnership(file, source);
  assert.deepEqual(inspection.violations, []);

  const ownershipImports = inspection.analysis.imports.filter(dependency => {
    const target = resolveModuleTarget(file, dependency.specifier);
    return target === compositionOwnerTarget;
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
        specifier: '../../../shared/dimensions/library_preset_flow_dimension_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['DEFAULT_STACK_SPLIT_LOWER_HEIGHT', 'LIBRARY_PRESET_LAYOUT_POLICY'],
        exportedSymbols: [],
        bindings: [
          ['DEFAULT_STACK_SPLIT_LOWER_HEIGHT', 'DEFAULT_STACK_SPLIT_LOWER_HEIGHT', null],
          ['LIBRARY_PRESET_LAYOUT_POLICY', 'LIBRARY_PRESET_LAYOUT_POLICY', null],
        ],
      },
    ]
  );

  for (const [field, count] of Object.entries(fieldCounts)) {
    assert.equal(inspection.memberCounts.get(`LIBRARY_PRESET_LAYOUT_POLICY.${field}`) ?? 0, count, field);
  }
});

test('Library Preset Flow preserves explicit literals, signatures, return shape, exports, and function inventory', () => {
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
  assert.deepEqual(facts.otherFunctionNames, expectedOtherFunctionNames);
  assert.deepEqual(
    collectNamedModuleExports(productionRel, source).map(entry => [entry.exportedName, entry.kind]),
    expectedPublicExports
  );
});
