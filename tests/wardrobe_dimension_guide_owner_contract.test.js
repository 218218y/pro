import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';
import { createTsRuntimeModuleLoader } from './_ts_runtime_module_loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ownerRel = 'esm/shared/dimensions/wardrobe_dimension_guide_policy.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const runtimeApiRel = 'esm/native/runtime/api.ts';
const baselineRel = 'tools/wp_layer_baseline.json';
const ownerSpecifier = './dimensions/wardrobe_dimension_guide_policy.js';
const ownerSymbol = 'WARDROBE_DIMENSION_GUIDE_POLICY';
const compatibilitySymbol = 'WARDROBE_DIMENSION_GUIDE_DIMENSIONS';
const initializerSha256 = '5c23d1d4ea81ab8735b9214d73d1b6bfbe7eec9ed5ad6a7165a0381a486a811d';
const prefix163Sha256 = '8c4c04e56a8b991d81537127adc69c5dc42b4e7ed3de4fe81258a67b01ad8341';
const prefix164Sha256 = '55c2e7abbae3cdba828c41a48ed759d457079d0021fe21fc2a1ebf7a08e2e231';
const prefix165Sha256 = '3b685a291fdbfa4ae0fd66b8b4744116598a81e236e8f449facc89714802a807';
const prefix166Sha256 = 'f58543ffaf2860f846f7469e93ab442adf0ee3fc5ae391fd904af3f64167c111';

const renderConsumerRels = Object.freeze([
  'esm/native/builder/render_dimension_ops_corner.ts',
  'esm/native/builder/render_dimension_ops_main.ts',
  'esm/native/builder/render_dimension_ops_shared.ts',
]);

const expectedFlowSemanticHashes = Object.freeze({
  'esm/native/builder/render_dimension_ops_shared.ts':
    '0f92262600a23bdd4f78dde4dccd0704e81da386236b3777257893c2d5f5f5f2',
  'esm/native/builder/render_dimension_ops_main.ts':
    'a907a2edf5466ca546e80207c6462e470c2823766f2c79d912e41c0305dbedef',
  'esm/native/builder/render_dimension_ops_corner.ts':
    '7b29f74676f0b12eb7e7970de616a6520ac23494570466cddca3f082df59d293',
});

const sourceExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const runtimeExtensionCandidates = Object.freeze({
  '.js': Object.freeze(['.ts', '.tsx', '.js', '.jsx']),
  '.mjs': Object.freeze(['.mts', '.mjs']),
  '.cjs': Object.freeze(['.cts', '.cjs']),
  '.jsx': Object.freeze(['.tsx', '.jsx']),
});

const expectedValues = Object.freeze({
  textScale: Object.freeze({
    total: 1,
    cell: 0.78,
    cornerTotal: 0.9,
  }),
  verticalPlacement: Object.freeze({
    totalYOffsetWithCorniceM: 0.28,
    totalYOffsetWithoutCorniceM: 0.23,
    cellYOffsetWithCorniceM: 0.2,
    cellYOffsetWithoutCorniceM: 0.15,
  }),
  main: Object.freeze({
    totalWidthTextYOffsetM: 0.1,
    cellWidthTextYOffsetM: 0.07,
    heightLineOffsetM: 0.3,
    stackSplitHeightLineOffsetM: 0.54,
    heightTextOffsetM: 0.1,
    cellHeightLineDeltaM: 0.12,
    stackSplitCellHeightLineDeltaM: 0.24,
    cellHeightTextOffsetM: 0.08,
    cellHeightLabelYOffsetM: -0.26,
    depthLineOffsetXM: 0.24,
    depthTextOffsetXM: 0.2,
    depthStartYOffsetM: 0.35,
    depthEndYOffsetM: 0.15,
    smallDepthLineOffsetXM: 0.16,
    smallDepthTextOffsetXM: 0.18,
    smallDepthStartYOffsetM: 0.57,
    smallDepthEndYOffsetM: 0.37,
    minDistinctDepthDeltaCm: 1,
  }),
  corner: Object.freeze({
    connectorWallMinLengthM: 0.05,
    expandedWidthEpsilonM: 0.01,
    expandedWidthYOffsetM: 0.12,
    expandedWidthTextYOffsetM: 0.1,
    wingMinLengthM: 0.01,
    wingTotalTextYOffsetM: 0.1,
    wingCellTextYOffsetM: 0.07,
    connectorDepthMidRatio: 0.55,
    connectorDepthInsetM: 0.08,
    connectorDepthMinM: 0.2,
    connectorHeightLineRatio: 0.55,
    depthStartYOffsetM: 0.35,
    depthEndYOffsetM: 0.15,
    depthTextOffsetZM: 0.28,
    heightTextOffsetZM: 0.46,
    wingHeightLineRatio: 0.55,
  }),
});

const expectedEntry166 = Object.freeze({
  from: 'builder',
  to: 'shared',
  additionalStatements: 1,
  owner: 'dimension-ownership-migration',
  reviewedAt: '2026-07-28',
  reviewBy: '2026-10-18',
  fromFile: 'esm/native/builder/render_dimension_ops_shared.ts',
  companionImport: {
    toFile: 'esm/shared/dimensions/wardrobe_dimension_guide_policy.ts',
    kind: 'value',
    importedSymbols: [ownerSymbol],
    syntax: 'static-import',
  },
  removedImport: {
    toFile: facadeRel,
    kind: 'value',
    importedSymbols: ['WARDROBE_DEFAULTS', compatibilitySymbol],
    syntax: 'static-import',
  },
  addedImport: {
    toFile: 'esm/shared/dimensions/wardrobe_defaults.ts',
    kind: 'value',
    importedSymbols: ['DEFAULT_CORNER_DOORS'],
    syntax: 'static-import',
  },
  reason:
    'The Wardrobe Dimension Guide shared render context replaces one combined legacy facade statement with the focused Wardrobe Dimension Guide policy plus the canonical Corner doors default scalar on the existing builder to shared edge.',
  removalCondition:
    'Remove this entry when a reviewed Wardrobe Dimension Guide render composition seam eliminates the extra Wardrobe Defaults statement without reintroducing the legacy facade or the aggregate WARDROBE_DEFAULTS object.',
});

const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');

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

function listSourceFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) listSourceFiles(absolute, files);
    else if (entry.isFile() && sourceExtensions.includes(path.extname(entry.name).toLowerCase())) {
      files.push(absolute);
    }
  }
  return files.sort();
}

function relativePath(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function stripQueryHash(specifier) {
  const queryIndex = specifier.indexOf('?');
  const hashIndex = specifier.indexOf('#');
  const cutIndex =
    queryIndex === -1 ? hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
  return cutIndex === -1 ? specifier : specifier.slice(0, cutIndex);
}

function canonicalTarget(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  return path.normalize(fs.realpathSync.native(file)).toLowerCase();
}

function resolveModuleTarget(fromFile, specifier) {
  if (typeof specifier !== 'string') return null;
  const clean = stripQueryHash(specifier);
  let raw;
  if (clean.startsWith('@/')) raw = path.join(root, 'esm', clean.slice(2));
  else if (clean.startsWith('.')) raw = path.resolve(path.dirname(fromFile), clean);
  else return null;

  const extension = path.extname(raw).toLowerCase();
  const candidates = [raw];
  if (!extension) {
    for (const candidateExtension of sourceExtensions) candidates.push(`${raw}${candidateExtension}`);
    for (const candidateExtension of sourceExtensions) {
      candidates.push(path.join(raw, `index${candidateExtension}`));
    }
  } else {
    const stem = raw.slice(0, -extension.length);
    for (const candidateExtension of runtimeExtensionCandidates[extension] ?? []) {
      candidates.push(`${stem}${candidateExtension}`);
    }
  }

  for (const candidate of candidates) {
    const target = canonicalTarget(candidate);
    if (target) return target;
  }
  return null;
}

const ownerTarget = canonicalTarget(path.join(root, ownerRel));
const facadeTarget = canonicalTarget(path.join(root, facadeRel));
const publicDimensionsTarget = canonicalTarget(path.join(root, publicDimensionsRel));

function identifierName(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function memberPath(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type !== 'MemberExpression') return null;
  const object = memberPath(node.object);
  const property = node.computed
    ? node.property?.type === 'Literal'
      ? node.property.value
      : null
    : identifierName(node.property);
  return object && typeof property === 'string' ? `${object}.${property}` : null;
}

function memberRootIdentifier(node) {
  let current = node;
  while (current?.type === 'MemberExpression') current = current.object;
  return current?.type === 'Identifier' ? current.name : null;
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

function semanticAstNode(node) {
  const pathValue = memberPath(node);
  if (pathValue?.startsWith(`${compatibilitySymbol}.`)) {
    return {
      type: 'SemanticMember',
      path: pathValue.replace(compatibilitySymbol, ownerSymbol),
    };
  }
  if (pathValue?.startsWith(`${ownerSymbol}.`)) {
    return { type: 'SemanticMember', path: pathValue };
  }
  if (pathValue === 'WARDROBE_DEFAULTS.corner.doorsCount') {
    return { type: 'SemanticMember', path: 'DEFAULT_CORNER_DOORS' };
  }
  if (node?.type === 'Identifier' && [compatibilitySymbol, ownerSymbol].includes(node.name)) {
    return { type: 'Identifier', name: ownerSymbol };
  }
  if (node?.type === 'Identifier' && node.name === 'DEFAULT_CORNER_DOORS') {
    return { type: 'SemanticMember', path: 'DEFAULT_CORNER_DOORS' };
  }
  return null;
}

function canonicalSemanticAst(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return value;
  const semantic = semanticAstNode(value);
  if (semantic) return semantic;
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

function renderFlowSemanticHash(rel, source) {
  const sourceFile = createSourceFile(rel, source);
  const nonImportBody = (sourceFile.body ?? []).filter(statement => statement.type !== 'ImportDeclaration');
  return sha256(stableJson(canonicalSemanticAst(nonImportBody)));
}

function exportedConstDeclarator(sourceFile, symbol) {
  for (const statement of sourceFile.body ?? []) {
    if (
      statement.type !== 'ExportNamedDeclaration' ||
      statement.declaration?.type !== 'VariableDeclaration' ||
      statement.declaration.kind !== 'const'
    ) {
      continue;
    }
    for (const declarator of statement.declaration.declarations ?? []) {
      if (identifierName(declarator.id) === symbol) return { statement, declarator };
    }
  }
  return null;
}

function frozenObject(node) {
  if (
    node?.type !== 'CallExpression' ||
    memberPath(node.callee) !== 'Object.freeze' ||
    node.arguments?.length !== 1 ||
    node.arguments[0]?.type !== 'ObjectExpression'
  ) {
    return null;
  }
  return node.arguments[0];
}

function numericValue(node) {
  if (node?.type === 'Literal' && typeof node.value === 'number') return node.value;
  if (
    node?.type === 'UnaryExpression' &&
    node.operator === '-' &&
    node.argument?.type === 'Literal' &&
    typeof node.argument.value === 'number'
  ) {
    return -node.argument.value;
  }
  return null;
}

function frozenObjectFacts(node, violations, pathPrefix = ownerSymbol) {
  const objectExpression = frozenObject(node);
  if (!objectExpression) {
    violations.push({ kind: 'owner-freeze-shape', path: pathPrefix });
    return { keys: [], value: null };
  }

  const keys = [];
  const value = {};
  for (const property of objectExpression.properties ?? []) {
    if (
      property?.type !== 'Property' ||
      property.kind !== 'init' ||
      property.computed ||
      property.method ||
      property.shorthand ||
      property.type === 'SpreadElement'
    ) {
      violations.push({ kind: 'owner-property-shape', path: pathPrefix });
      continue;
    }
    const key = identifierName(property.key);
    if (!key) {
      violations.push({ kind: 'owner-property-key', path: pathPrefix });
      continue;
    }
    keys.push(key);
    const number = numericValue(property.value);
    if (number !== null) {
      value[key] = number;
      continue;
    }
    const nested = frozenObjectFacts(property.value, violations, `${pathPrefix}.${key}`);
    value[key] = nested.value;
  }
  return { keys, value };
}

function addViolation(violations, kind, detail = '') {
  violations.push({ kind, detail });
}

function inspectOwner(source) {
  const violations = [];
  const normalizedSource = source.replaceAll('\r\n', '\n');
  const sourceFile = createSourceFile(ownerRel, normalizedSource);
  const body = sourceFile.body ?? [];
  const analysis = analyzeModuleDependencies(ownerRel, normalizedSource);
  const declaration = exportedConstDeclarator(sourceFile, ownerSymbol);

  if (body.length !== 1 || body[0] !== declaration?.statement) {
    addViolation(violations, 'owner-top-level-topology');
  }
  if (
    analysis.imports.length !== 0 ||
    analysis.unresolvedDynamicImports.length !== 0 ||
    analysis.forbiddenModuleSyntax.length !== 0
  ) {
    addViolation(violations, 'owner-dependency-free');
  }
  if (
    declaration?.statement.declaration.declarations?.length !== 1 ||
    declaration.declarator.id?.type !== 'Identifier' ||
    declaration.declarator.id.name !== ownerSymbol ||
    declaration.declarator.id.typeAnnotation ||
    declaration.declarator.id.optional ||
    declaration.declarator.id.definite
  ) {
    addViolation(violations, 'owner-export-declaration');
  }

  const exportInventory = collectNamedModuleExports(ownerRel, normalizedSource).map(entry => ({
    exportedName: entry.exportedName,
    kind: entry.kind,
    localName: entry.localName,
    source: entry.source,
  }));
  if (
    stableJson(exportInventory) !==
    stableJson([
      {
        exportedName: ownerSymbol,
        kind: 'value',
        localName: ownerSymbol,
        source: null,
      },
    ])
  ) {
    addViolation(violations, 'owner-export-inventory', stableJson(exportInventory));
  }

  const initializer = declaration?.declarator.init;
  if (
    !initializer ||
    sha256(normalizedSource.slice(initializer.start, initializer.end)) !== initializerSha256
  ) {
    addViolation(violations, 'owner-initializer-fingerprint');
  }
  const facts = frozenObjectFacts(initializer, violations);
  if (stableJson(facts.value) !== stableJson(expectedValues)) {
    addViolation(violations, 'owner-literal-inventory', stableJson(facts.value));
  }
  if (
    stableJson(facts.keys) !== stableJson(Object.keys(expectedValues)) ||
    Object.keys(expectedValues).some(
      key =>
        stableJson(
          frozenObjectFacts(
            frozenObject(initializer)?.properties?.find(property => identifierName(property.key) === key)
              ?.value,
            [],
            `${ownerSymbol}.${key}`
          ).keys
        ) !== stableJson(Object.keys(expectedValues[key]))
    )
  ) {
    addViolation(violations, 'owner-key-order');
  }

  let freezeCalls = 0;
  let objectExpressions = 0;
  let unsupportedWrapper = false;
  walkAst(sourceFile, node => {
    if (node?.type === 'CallExpression') {
      if (memberPath(node.callee) === 'Object.freeze') freezeCalls += 1;
      else unsupportedWrapper = true;
    }
    if (node?.type === 'ObjectExpression') objectExpressions += 1;
    if (
      node?.type === 'SpreadElement' ||
      node?.type === 'ExportDefaultDeclaration' ||
      node?.type === 'TSAsExpression' ||
      node?.type === 'TSSatisfiesExpression' ||
      node?.type === 'TSTypeAssertion'
    ) {
      unsupportedWrapper = true;
    }
  });
  if (freezeCalls !== 5 || objectExpressions !== 5) {
    addViolation(violations, 'owner-freeze-count', `${freezeCalls}/${objectExpressions}`);
  }
  if (unsupportedWrapper) addViolation(violations, 'owner-wrapper-or-spread');

  const negativeLabelProperty = frozenObject(initializer)
    ?.properties?.find(property => identifierName(property.key) === 'main')
    ?.value?.arguments?.[0]?.properties?.find(
      property => identifierName(property.key) === 'cellHeightLabelYOffsetM'
    );
  if (
    negativeLabelProperty?.value?.type !== 'UnaryExpression' ||
    negativeLabelProperty.value.operator !== '-' ||
    negativeLabelProperty.value.argument?.type !== 'Literal' ||
    negativeLabelProperty.value.argument.value !== 0.26
  ) {
    addViolation(violations, 'owner-negative-literal-shape');
  }

  return violations;
}

function inspectFacade(source) {
  const violations = [];
  const facadeFile = path.join(root, facadeRel);
  const sourceFile = createSourceFile(facadeRel, source);
  const ownerDependencies = analyzeModuleDependencies(facadeRel, source).imports.filter(
    dependency => resolveModuleTarget(facadeFile, dependency.specifier) === ownerTarget
  );
  if (
    ownerDependencies.length !== 1 ||
    ownerDependencies[0].specifier !== ownerSpecifier ||
    ownerDependencies[0].kind !== 'value' ||
    ownerDependencies[0].syntax !== 'static-import' ||
    stableJson(ownerDependencies[0].importedSymbols) !== stableJson([ownerSymbol]) ||
    stableJson(ownerDependencies[0].bindings) !==
      stableJson([
        {
          importedName: ownerSymbol,
          localName: ownerSymbol,
          exportedName: null,
        },
      ])
  ) {
    addViolation(violations, 'facade-owner-import');
  }

  const declaration = exportedConstDeclarator(sourceFile, compatibilitySymbol);
  if (
    declaration?.statement.declaration.declarations?.length !== 1 ||
    declaration.declarator.id?.type !== 'Identifier' ||
    declaration.declarator.id.name !== compatibilitySymbol ||
    declaration.declarator.id.typeAnnotation ||
    declaration.declarator.id.optional ||
    declaration.declarator.id.definite
  ) {
    addViolation(violations, 'facade-export-const');
  }
  if (
    declaration?.declarator.init?.type !== 'Identifier' ||
    declaration.declarator.init.name !== ownerSymbol
  ) {
    addViolation(violations, 'facade-identity-alias');
  }

  walkAst(sourceFile, node => {
    if (
      (node?.type === 'AssignmentExpression' || node?.type === 'UpdateExpression') &&
      identifierName(node.left ?? node.argument) === compatibilitySymbol
    ) {
      addViolation(violations, 'facade-reassignment');
    }
  });

  const publicExports = collectNamedModuleExports(facadeRel, source);
  if (
    publicExports.filter(entry => entry.kind === 'value' && entry.exportedName === compatibilitySymbol)
      .length !== 1
  ) {
    addViolation(violations, 'facade-compatibility-export');
  }
  if (
    publicExports.some(
      entry =>
        entry.exportedName === ownerSymbol ||
        entry.localName === ownerSymbol ||
        entry.source === ownerSpecifier
    )
  ) {
    addViolation(violations, 'facade-owner-public-leak');
  }
  for (const statement of sourceFile.body ?? []) {
    if (statement.type !== 'ExportNamedDeclaration') continue;
    for (const specifier of statement.specifiers ?? []) {
      if (identifierName(specifier.local) === ownerSymbol) {
        addViolation(violations, 'facade-owner-public-leak');
      }
    }
    if (statement.declaration?.type !== 'VariableDeclaration') continue;
    for (const declarator of statement.declaration.declarations ?? []) {
      if (
        identifierName(declarator.id) !== compatibilitySymbol &&
        declarator.init?.type === 'Identifier' &&
        declarator.init.name === ownerSymbol
      ) {
        addViolation(violations, 'facade-owner-public-leak');
      }
    }
  }

  return violations;
}

function ownerDependenciesFor(file, source) {
  return analyzeModuleDependencies(file, source).imports.filter(
    dependency => resolveModuleTarget(file, dependency.specifier) === ownerTarget
  );
}

function compatibilityDependenciesFor(file, source) {
  return analyzeModuleDependencies(file, source).imports.filter(dependency => {
    const target = resolveModuleTarget(file, dependency.specifier);
    return (
      (target === facadeTarget || target === publicDimensionsTarget) &&
      (dependency.importedSymbols.includes(compatibilitySymbol) || dependency.importedSymbols.includes('*'))
    );
  });
}

function dependencyFacts(dependency) {
  return {
    specifier: dependency.specifier,
    kind: dependency.kind,
    syntax: dependency.syntax,
    importedSymbols: [...dependency.importedSymbols],
    bindings: dependency.bindings.map(binding => ({
      importedName: binding.importedName,
      localName: binding.localName,
      exportedName: binding.exportedName,
    })),
  };
}

function exactNamedImport(specifier, symbol, kind = 'value', syntax = 'static-import') {
  return {
    specifier,
    kind,
    syntax,
    importedSymbols: [symbol],
    bindings: [
      {
        importedName: symbol,
        localName: symbol,
        exportedName: null,
      },
    ],
  };
}

function isExactPublicDimensionsRoute(file, dependency) {
  return (
    relativePath(file) === publicDimensionsRel &&
    resolveModuleTarget(file, dependency.specifier) === facadeTarget &&
    dependency.kind === 'value' &&
    dependency.syntax === 'static-re-export' &&
    stableJson(dependency.importedSymbols) === stableJson(['*']) &&
    stableJson(dependency.exportedSymbols) === stableJson(['*'])
  );
}

function inspectCompatibilitySource(file, source) {
  const violations = [];
  const rel = relativePath(file);
  const sourceFile = createSourceFile(file, source);
  const analysis = analyzeModuleDependencies(file, source);

  for (const dependency of analysis.imports) {
    const target = resolveModuleTarget(file, dependency.specifier);
    const targetsCompatibilityRoute = target === facadeTarget || target === publicDimensionsTarget;
    const exposesCompatibility =
      dependency.importedSymbols.includes(compatibilitySymbol) ||
      (targetsCompatibilityRoute && dependency.importedSymbols.includes('*'));

    if (exposesCompatibility && !isExactPublicDimensionsRoute(file, dependency)) {
      addViolation(
        violations,
        'compatibility-consumer',
        `${rel}:${dependency.syntax}:${dependency.specifier}`
      );
    }
    if (dependency.syntax === 'dynamic-import' && targetsCompatibilityRoute) {
      addViolation(violations, 'compatibility-dynamic-route', `${rel}:${dependency.specifier}`);
    }
  }
  if (rel.startsWith('esm/native/') && analysis.unresolvedDynamicImports.length !== 0) {
    addViolation(
      violations,
      'compatibility-unresolved-dynamic-route',
      stableJson(analysis.unresolvedDynamicImports)
    );
  }

  if (rel !== facadeRel) {
    walkAst(sourceFile, node => {
      if (node?.type === 'Identifier' && node.name === compatibilitySymbol) {
        addViolation(violations, 'compatibility-symbol-reference', rel);
      }
      if (node?.type === 'Literal' && typeof node.value === 'string' && node.value === compatibilitySymbol) {
        addViolation(violations, 'compatibility-computed-reference', rel);
      }
    });
  }

  return violations;
}

function inspectRenderConsumer(rel, source) {
  const violations = [];
  const analysis = analyzeModuleDependencies(rel, source);
  const facts = analysis.imports.map(dependencyFacts);
  const guideImport = exactNamedImport(
    '../../shared/dimensions/wardrobe_dimension_guide_policy.js',
    ownerSymbol
  );
  const contextTypeImport = exactNamedImport(
    './render_dimension_ops_shared.js',
    'RenderDimensionContext',
    'type',
    'type-import'
  );
  const expected =
    rel === 'esm/native/builder/render_dimension_ops_shared.ts'
      ? [
          guideImport,
          exactNamedImport('../../shared/dimensions/wardrobe_defaults.js', 'DEFAULT_CORNER_DOORS'),
          {
            specifier: '../../../types',
            kind: 'type',
            syntax: 'type-import',
            importedSymbols: ['AppContainer', 'BuilderDimensionLineScaleSpec'],
            bindings: [
              {
                importedName: 'AppContainer',
                localName: 'AppContainer',
                exportedName: null,
              },
              {
                importedName: 'BuilderDimensionLineScaleSpec',
                localName: 'BuilderDimensionLineScaleSpec',
                exportedName: null,
              },
            ],
          },
        ]
      : [guideImport, contextTypeImport];

  if (stableJson(facts) !== stableJson(expected)) {
    addViolation(violations, 'render-import-inventory', stableJson(facts));
  }
  if (analysis.unresolvedDynamicImports.length !== 0 || analysis.forbiddenModuleSyntax.length !== 0) {
    addViolation(violations, 'render-dynamic-or-forbidden-import');
  }
  if (source.includes(compatibilitySymbol) || source.includes('wardrobe_dimension_tokens_shared')) {
    addViolation(violations, 'render-compatibility-route');
  }

  const sourceFile = createSourceFile(rel, source);
  walkAst(sourceFile, node => {
    if (node?.type === 'MemberExpression' && node.computed && memberRootIdentifier(node) === ownerSymbol) {
      addViolation(violations, 'render-computed-owner-access', memberPath(node));
    }
  });

  if (rel === 'esm/native/builder/render_dimension_ops_shared.ts') {
    let scalarReferences = 0;
    for (const statement of sourceFile.body ?? []) {
      if (statement.type === 'ImportDeclaration') continue;
      walkAst(statement, node => {
        if (node?.type === 'Identifier' && node.name === 'DEFAULT_CORNER_DOORS') {
          scalarReferences += 1;
        }
      });
    }
    if (scalarReferences !== 2 || source.includes('WARDROBE_DEFAULTS')) {
      addViolation(violations, 'shared-corner-default-scalar', String(scalarReferences));
    }
  }

  return violations;
}

function collectOwnerInventory(files) {
  return files.flatMap(file =>
    ownerDependenciesFor(file, fs.readFileSync(file, 'utf8')).map(dependency => ({
      file: relativePath(file),
      specifier: dependency.specifier,
      kind: dependency.kind,
      syntax: dependency.syntax,
      importedSymbols: [...dependency.importedSymbols],
      bindings: dependency.bindings.map(binding => ({
        importedName: binding.importedName,
        localName: binding.localName,
        exportedName: binding.exportedName,
      })),
    }))
  );
}

function collectCompatibilityInventory(files) {
  return files
    .flatMap(file =>
      compatibilityDependenciesFor(file, fs.readFileSync(file, 'utf8')).flatMap(dependency => {
        if (!dependency.importedSymbols.includes(compatibilitySymbol)) return [];
        return [
          {
            file: relativePath(file),
            importedSymbols: [...dependency.importedSymbols],
            kind: dependency.kind,
            syntax: dependency.syntax,
            aliasFree: dependency.bindings
              .filter(binding => binding.importedName === compatibilitySymbol)
              .every(binding => binding.localName === compatibilitySymbol && binding.exportedName === null),
          },
        ];
      })
    )
    .sort((left, right) => left.file.localeCompare(right.file));
}

function publicOwnerReferences(source) {
  const references = [];
  const sourceFile = createSourceFile('public-owner-probe.ts', source);
  walkAst(sourceFile, node => {
    if ((node?.type === 'Identifier' || node?.type === 'Literal') && identifierName(node) === ownerSymbol) {
      references.push(node.type);
    }
  });
  return references;
}

function assertRejected(inspect, source, kind, label) {
  const violations = inspect(source);
  assert.equal(
    violations.some(violation => violation.kind === kind),
    true,
    `${label}: ${JSON.stringify(violations)}`
  );
}

const esmFiles = listSourceFiles(path.join(root, 'esm'));
const nativeFiles = esmFiles.filter(file => relativePath(file).startsWith('esm/native/'));

test('Wardrobe Dimension Guide owner preserves the exact inline initializer, key order, literals, and freezes', () => {
  const ownerFiles = listSourceFiles(path.join(root, 'esm/shared/dimensions'))
    .map(relativePath)
    .filter(file => path.basename(file) === 'wardrobe_dimension_guide_policy.ts');
  assert.deepEqual(ownerFiles, [ownerRel]);
  assert.deepEqual(inspectOwner(read(ownerRel)), []);
});

test('Wardrobe Dimension Guide facade is an inferred direct identity alias with no public owner leak', () => {
  assert.deepEqual(inspectFacade(read(facadeRel)), []);
  assert.deepEqual(publicOwnerReferences(read(publicDimensionsRel)), []);
  assert.deepEqual(publicOwnerReferences(read(runtimeApiRel)), []);

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

test('closeout keeps exactly the focused render trio plus facade owner import and zero production compatibility consumers', () => {
  const exactNativeOwnerImport = file => ({
    file,
    specifier: '../../shared/dimensions/wardrobe_dimension_guide_policy.js',
    kind: 'value',
    syntax: 'static-import',
    importedSymbols: [ownerSymbol],
    bindings: [
      {
        importedName: ownerSymbol,
        localName: ownerSymbol,
        exportedName: null,
      },
    ],
  });

  assert.deepEqual(collectOwnerInventory(esmFiles), [
    ...renderConsumerRels.map(exactNativeOwnerImport),
    {
      file: facadeRel,
      specifier: ownerSpecifier,
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: [ownerSymbol],
      bindings: [
        {
          importedName: ownerSymbol,
          localName: ownerSymbol,
          exportedName: null,
        },
      ],
    },
  ]);
  assert.deepEqual(collectCompatibilityInventory(nativeFiles), []);
  assert.deepEqual(
    esmFiles.flatMap(file => inspectCompatibilitySource(file, fs.readFileSync(file, 'utf8'))),
    []
  );
  for (const rel of renderConsumerRels) {
    assert.deepEqual(inspectRenderConsumer(rel, read(rel)), [], rel);
  }

  const facadeDependencies = esmFiles.flatMap(file =>
    analyzeModuleDependencies(file, fs.readFileSync(file, 'utf8'))
      .imports.filter(dependency => resolveModuleTarget(file, dependency.specifier) === facadeTarget)
      .map(dependency => ({ file, dependency }))
  );
  const staticImports = facadeDependencies.filter(entry => entry.dependency.syntax === 'static-import');
  assert.equal(new Set(staticImports.map(entry => entry.file)).size, 4);
  assert.equal(staticImports.length, 4);
  assert.equal(new Set(facadeDependencies.map(entry => entry.file)).size, 6);
  assert.equal(facadeDependencies.length, 7);
});

test('render flow semantic AST fingerprints preserve formulas, offsets, branches, types, and call order', () => {
  for (const rel of renderConsumerRels) {
    assert.equal(renderFlowSemanticHash(rel, read(rel)), expectedFlowSemanticHashes[rel], rel);
  }
});

test('Ledger Entry 166 and Prefixes 163-166 exactly own the single focused statement increase', () => {
  const baseline = JSON.parse(read(baselineRel));
  const migrationBudgets = baseline.migrationBudgets;
  assert.equal(migrationBudgets.length, 166);
  assert.equal(new Set(migrationBudgets.map(entry => entry.fromFile)).size, 105);
  assert.deepEqual(migrationBudgets.slice(165, 166), [expectedEntry166]);
  assert.equal(sha256(stableJson(migrationBudgets.slice(0, 163))), prefix163Sha256);
  assert.equal(sha256(stableJson(migrationBudgets.slice(0, 164))), prefix164Sha256);
  assert.equal(sha256(stableJson(migrationBudgets.slice(0, 165))), prefix165Sha256);
  assert.equal(sha256(stableJson(migrationBudgets.slice(0, 166))), prefix166Sha256);
});

test('runtime and declaration parity preserve identity, values, readonly topology, and serialization', () => {
  const loader = createTsRuntimeModuleLoader();
  const facade = loader.load(path.join(root, facadeRel));
  const owner = loader.load(path.join(root, ownerRel));
  const facadeValue = facade[compatibilitySymbol];
  const ownerValue = owner[ownerSymbol];

  assert.equal(facadeValue, ownerValue);
  assert.deepEqual(JSON.parse(JSON.stringify(ownerValue)), expectedValues);
  assert.deepEqual(Object.keys(ownerValue), Object.keys(expectedValues));
  for (const key of Object.keys(expectedValues)) {
    assert.deepEqual(Object.keys(ownerValue[key]), Object.keys(expectedValues[key]));
    assert.equal(Object.isFrozen(ownerValue[key]), true, key);
  }
  assert.equal(Object.isFrozen(ownerValue), true);

  const facadeSourceFile = createSourceFile(facadeRel, read(facadeRel));
  const declaration = exportedConstDeclarator(facadeSourceFile, compatibilitySymbol);
  assert.equal(declaration?.declarator.id.typeAnnotation ?? null, null);
  assert.equal(declaration?.declarator.init?.type, 'Identifier');
  assert.equal(declaration?.declarator.init?.name, ownerSymbol);
});

test('owner mutation probes reject literal, order, freeze, dependency, export, spread, and side-effect drift', () => {
  const source = read(ownerRel);
  assertRejected(
    inspectOwner,
    source.replace('    cell: 0.78,', '    cell: 0.79,'),
    'owner-initializer-fingerprint',
    'literal drift'
  );
  assertRejected(
    inspectOwner,
    source.replace('    total: 1,\n    cell: 0.78,', '    cell: 0.78,\n    total: 1,'),
    'owner-key-order',
    'nested key reorder'
  );
  assertRejected(
    inspectOwner,
    source.replace('textScale: Object.freeze({', 'textScale: ({'),
    'owner-freeze-shape',
    'nested freeze removal'
  );
  assertRejected(
    inspectOwner,
    source.replace(`export const ${ownerSymbol} = Object.freeze({`, `export const ${ownerSymbol} = ({`),
    'owner-freeze-shape',
    'root freeze removal'
  );
  assertRejected(
    inspectOwner,
    `import { cmToM } from './units.js';\n${source}`,
    'owner-dependency-free',
    'owner dependency'
  );
  assertRejected(
    inspectOwner,
    `${source}\nexport default ${ownerSymbol};\n`,
    'owner-top-level-topology',
    'default export'
  );
  assertRejected(
    inspectOwner,
    source.replace('  textScale: Object.freeze({', '  ...{},\n  textScale: Object.freeze({'),
    'owner-wrapper-or-spread',
    'owner spread'
  );
  assertRejected(
    inspectOwner,
    `${source}\nregisterDimensionGuide(${ownerSymbol});\n`,
    'owner-top-level-topology',
    'owner side effect'
  );
});

test('facade and closeout mutation probes reject wrappers, annotations, compatibility routes, extra consumers, and public leaks', () => {
  const facadeSource = read(facadeRel);
  const canonicalAlias = `export const ${compatibilitySymbol} = ${ownerSymbol};`;
  assertRejected(
    inspectFacade,
    facadeSource.replace(canonicalAlias, `export const ${compatibilitySymbol} = { ...${ownerSymbol} };`),
    'facade-identity-alias',
    'facade object copy'
  );
  assertRejected(
    inspectFacade,
    facadeSource.replace(
      canonicalAlias,
      `export const ${compatibilitySymbol} = legacyDimensionNumberView(${ownerSymbol});`
    ),
    'facade-identity-alias',
    'facade wrapper'
  );
  assertRejected(
    inspectFacade,
    facadeSource.replace(
      canonicalAlias,
      `export const ${compatibilitySymbol}: typeof ${ownerSymbol} = ${ownerSymbol};`
    ),
    'facade-export-const',
    'facade annotation'
  );
  assertRejected(
    inspectFacade,
    facadeSource.replace(
      `import { ${ownerSymbol} } from '${ownerSpecifier}';`,
      `import { ${ownerSymbol} as dimensionGuidePolicy } from '${ownerSpecifier}';`
    ),
    'facade-owner-import',
    'facade import alias'
  );
  assertRejected(
    inspectFacade,
    facadeSource.replace(
      canonicalAlias,
      `const ${compatibilitySymbol} = ${ownerSymbol};\nexport { ${compatibilitySymbol} };`
    ),
    'facade-export-const',
    'facade exported later'
  );
  assertRejected(
    inspectFacade,
    `${facadeSource}\nexport { ${ownerSymbol} as ALTERNATE_DIMENSION_GUIDE_POLICY };\n`,
    'facade-owner-public-leak',
    'facade alternate owner export'
  );

  const nativeProbeFile = path.join(root, 'esm/native/builder/dimension_guide_probe.ts');
  const focusedProbe = `import { ${ownerSymbol} } from '../../shared/dimensions/wardrobe_dimension_guide_policy.js';\nexport const value = ${ownerSymbol}.textScale.total;`;
  const canonicalOwnerInventory = collectOwnerInventory(esmFiles);
  const focusedProbeInventory = ownerDependenciesFor(nativeProbeFile, focusedProbe);
  assert.equal(canonicalOwnerInventory.length, 4);
  assert.equal(focusedProbeInventory.length, 1);
  assert.notDeepEqual([...canonicalOwnerInventory, ...focusedProbeInventory], canonicalOwnerInventory);

  for (const [label, source] of [
    [
      'direct aggregate import',
      `import { ${compatibilitySymbol} } from '../../shared/wardrobe_dimension_tokens_shared.js';\nexport const value = ${compatibilitySymbol}.main.heightLineOffsetM;`,
    ],
    [
      'extensionless compatibility import',
      `import { ${compatibilitySymbol} } from '../../shared/wardrobe_dimension_tokens_shared';\nexport const value = ${compatibilitySymbol}.main.heightLineOffsetM;`,
    ],
    [
      'directory-index compatibility import',
      `import { ${compatibilitySymbol} } from '../features/dimensions';\nexport const value = ${compatibilitySymbol}.main.heightLineOffsetM;`,
    ],
    [
      'namespace computed compatibility import',
      `import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';\nexport const value = dimensions['${compatibilitySymbol}'];`,
    ],
    [
      'dynamic compatibility import',
      `export const value = import('../../shared/wardrobe_dimension_tokens_shared.js');`,
    ],
    [
      'unresolved dynamic compatibility import',
      `const modulePath = '../../shared/' + 'wardrobe_dimension_tokens_shared.js';\nconst symbol = 'WARDROBE_' + 'DIMENSION_GUIDE_DIMENSIONS';\nexport const value = import(modulePath).then(module => module[symbol]);`,
    ],
    [
      'compatibility re-export bridge',
      `export { ${compatibilitySymbol} } from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
    [
      'compatibility object copy',
      `import { ${compatibilitySymbol} } from '../../shared/wardrobe_dimension_tokens_shared.js';\nexport const value = { ...${compatibilitySymbol} };`,
    ],
  ]) {
    assert.notDeepEqual(inspectCompatibilitySource(nativeProbeFile, source), [], label);
  }

  const mainRel = 'esm/native/builder/render_dimension_ops_main.ts';
  assertRejected(
    inspectRenderConsumer.bind(null, mainRel),
    read(mainRel).replace(`import { ${ownerSymbol} }`, `import { ${ownerSymbol} as dimensionGuidePolicy }`),
    'render-import-inventory',
    'focused import alias'
  );
  assertRejected(
    inspectRenderConsumer.bind(null, mainRel),
    `${read(mainRel)}\nimport { DEFAULT_CORNER_DOORS } from '../../shared/dimensions/wardrobe_defaults.js';\n`,
    'render-import-inventory',
    'third focused import'
  );
  assertRejected(
    inspectRenderConsumer.bind(null, mainRel),
    read(mainRel).replace(`${ownerSymbol}.main`, `${ownerSymbol}['main']`),
    'render-computed-owner-access',
    'computed owner access'
  );

  const featureProbeFile = path.join(root, 'esm/native/features/dimensions/guide_bridge.ts');
  const ownerBridge = `export { ${ownerSymbol} } from '../../../shared/dimensions/wardrobe_dimension_guide_policy.js';`;
  const ownerBridgeInventory = ownerDependenciesFor(featureProbeFile, ownerBridge);
  assert.equal(ownerBridgeInventory.length, 1);
  assert.notDeepEqual([...canonicalOwnerInventory, ...ownerBridgeInventory], canonicalOwnerInventory);

  const publicLeak = `${read(runtimeApiRel)}\nexport { ${ownerSymbol} } from '../../shared/dimensions/wardrobe_dimension_guide_policy.js';\n`;
  assert.notDeepEqual(publicOwnerReferences(publicLeak), []);
});

test('render flow mutation probes reject formula, branch, literal, aggregate, and wrapper drift', () => {
  const sharedRel = 'esm/native/builder/render_dimension_ops_shared.ts';
  const mainRel = 'esm/native/builder/render_dimension_ops_main.ts';
  const cornerRel = 'esm/native/builder/render_dimension_ops_corner.ts';
  const shared = read(sharedRel);
  const main = read(mainRel);
  const corner = read(cornerRel);

  assert.notEqual(
    renderFlowSemanticHash(sharedRel, shared.replace('Math.max(0, Math.round(', 'Math.min(0, Math.round(')),
    expectedFlowSemanticHashes[sharedRel]
  );
  assert.notEqual(
    renderFlowSemanticHash(
      mainRel,
      main.replace(
        '!noMainWardrobe || hasActiveCornerConnector',
        '!noMainWardrobe && hasActiveCornerConnector'
      )
    ),
    expectedFlowSemanticHashes[mainRel]
  );
  assert.notEqual(
    renderFlowSemanticHash(
      cornerRel,
      corner.replace(
        'cornerWingVisible && !!wingGeometry && wingGeometry.wingW',
        'cornerWingVisible || !!wingGeometry || wingGeometry.wingW'
      )
    ),
    expectedFlowSemanticHashes[cornerRel]
  );
  assert.notEqual(
    renderFlowSemanticHash(cornerRel, corner.replace('fullWm * 100', 'fullWm * 101')),
    expectedFlowSemanticHashes[cornerRel]
  );

  assertRejected(
    inspectRenderConsumer.bind(null, sharedRel),
    shared.replace('    : DEFAULT_CORNER_DOORS;', '    : 3;'),
    'shared-corner-default-scalar',
    'corner default literal'
  );
  assert.notEqual(
    renderFlowSemanticHash(
      sharedRel,
      shared.replace(
        'const cornerWingDoorCountRaw = isCornerMode',
        `const guideWrapper = { ...${ownerSymbol} };\n  const cornerWingDoorCountRaw = isCornerMode`
      )
    ),
    expectedFlowSemanticHashes[sharedRel]
  );
  assertRejected(
    inspectRenderConsumer.bind(null, sharedRel),
    shared.replace(
      "import { DEFAULT_CORNER_DOORS } from '../../shared/dimensions/wardrobe_defaults.js';",
      "import { WARDROBE_DEFAULTS } from '../../shared/dimensions/wardrobe_defaults.js';"
    ),
    'render-import-inventory',
    'aggregate defaults import'
  );
});
