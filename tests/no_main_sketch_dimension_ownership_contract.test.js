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
const ownerRel = 'esm/shared/dimensions/no_main_sketch_policy.ts';
const workspacePolicyRel = 'esm/shared/dimensions/no_main_sketch_workspace_policy.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const builderRel = 'esm/native/builder/build_no_main_sketch_host.ts';
const serviceRel = 'esm/native/services/canvas_picking_projection_runtime_box_no_main_workspace.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const runtimeApiRel = 'esm/native/runtime/api.ts';
const baselineRel = 'tools/wp_layer_baseline.json';
const ownerSymbol = 'NO_MAIN_SKETCH_POLICY';
const workspacePolicySymbol = 'NO_MAIN_SKETCH_WORKSPACE_POLICY';
const compatibilitySymbol = 'NO_MAIN_SKETCH_DIMENSIONS';
const ownerSpecifier = './dimensions/no_main_sketch_policy.js';
const ownerInitializerSha256 = '1ac8627d6358514b4bd83cff5eb4881430402eb9145aba3417f0e0517b90f903';
const builderSemanticSha256 = 'c044eb8052b5f5bdec3289bdcffb7e870a9fc44794aa474fbba714f51a017295';
const builderLiteralSha256 = '854e96bc723cbdd1d8e1b83660b9c94189012a8ae456714f0a38055d68a31faf';
const serviceSemanticSha256 = '57fc2750baedda94ec347f885a6162c86352bdbd362414b94c2bacd29144c2cc';
const serviceLiteralSha256 = '494a0d89c74ac19a7bfb4e15102b425a0445d28c512a64e5f1ef16448c9aea0a';
const prefix166Sha256 = 'f58543ffaf2860f846f7469e93ab442adf0ee3fc5ae391fd904af3f64167c111';

const expectedOwnerValues = Object.freeze({
  defaultGridDivisions: 6,
  workspacePaddingM: 0.12,
  defaultWorkspaceWidthM: 1.6,
  minHostHeightM: 0.05,
  minInnerWidthM: 0.02,
  minGridSpanM: 0.02,
});

const expectedBuilderReferences = Object.freeze({
  defaultGridDivisions: 4,
  workspacePaddingM: 1,
  defaultWorkspaceWidthM: 2,
  minHostHeightM: 1,
  minInnerWidthM: 1,
  minGridSpanM: 2,
});

const sourceExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const runtimeExtensionCandidates = Object.freeze({
  '.js': Object.freeze(['.ts', '.tsx', '.js', '.jsx']),
  '.mjs': Object.freeze(['.mts', '.mjs']),
  '.cjs': Object.freeze(['.cts', '.cjs']),
  '.jsx': Object.freeze(['.tsx', '.jsx']),
});

const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const analysisCache = new Map();

function analyzeSource(file, source) {
  const key = `${file}\0${sha256(source)}`;
  if (!analysisCache.has(key)) {
    analysisCache.set(key, analyzeModuleDependencies(file, source));
  }
  return analysisCache.get(key);
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

function assertStatementNeutralLedgerHistory(migrationBudgets) {
  assert.ok(migrationBudgets.length >= 166);
  const approvedHistory = migrationBudgets.slice(0, 166);
  assert.equal(sha256(stableJson(approvedHistory)), prefix166Sha256);
  assert.deepEqual(
    approvedHistory.filter(entry => [builderRel, serviceRel].includes(entry.fromFile)),
    []
  );
}

function appendSyntheticFutureEntry167(migrationBudgets) {
  const futureEntry = structuredClone(migrationBudgets[165]);
  futureEntry.owner = 'synthetic-append-safe-proof';
  futureEntry.fromFile = builderRel;
  futureEntry.reason = 'Synthetic Entry 167 proves the historical No-Main contract is append-safe.';
  futureEntry.removalCondition = 'Remove the synthetic Entry 167 after the append-safe proof.';
  return [...structuredClone(migrationBudgets.slice(0, 166)), futureEntry];
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

const canonicalTargetCache = new Map();

function canonicalTarget(file) {
  const key = path.normalize(file).toLowerCase();
  if (canonicalTargetCache.has(key)) return canonicalTargetCache.get(key);
  const target =
    fs.existsSync(file) && fs.statSync(file).isFile()
      ? path.normalize(fs.realpathSync.native(file)).toLowerCase()
      : null;
  canonicalTargetCache.set(key, target);
  return target;
}

const moduleTargetCache = new Map();

function resolveModuleTarget(fromFile, specifier) {
  if (typeof specifier !== 'string') return null;
  const cacheKey = `${path.normalize(fromFile).toLowerCase()}\0${specifier}`;
  if (moduleTargetCache.has(cacheKey)) return moduleTargetCache.get(cacheKey);

  const clean = stripQueryHash(specifier);
  let raw;
  if (clean.startsWith('@/')) raw = path.join(root, 'esm', clean.slice(2));
  else if (clean.startsWith('.')) raw = path.resolve(path.dirname(fromFile), clean);
  else {
    moduleTargetCache.set(cacheKey, null);
    return null;
  }

  const extension = path.extname(raw).toLowerCase();
  const candidates = [raw];
  if (!extension) {
    for (const candidateExtension of sourceExtensions) {
      candidates.push(`${raw}${candidateExtension}`);
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
    if (target) {
      moduleTargetCache.set(cacheKey, target);
      return target;
    }
  }
  moduleTargetCache.set(cacheKey, null);
  return null;
}

const ownerTarget = canonicalTarget(path.join(root, ownerRel));
const workspacePolicyTarget = canonicalTarget(path.join(root, workspacePolicyRel));
const facadeTarget = canonicalTarget(path.join(root, facadeRel));
const publicDimensionsTarget = canonicalTarget(path.join(root, publicDimensionsRel));
const sharedRootPrefix = `${path.normalize(path.join(root, 'esm/shared')).toLowerCase()}${path.sep}`;

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

function addViolation(violations, kind, detail = '') {
  violations.push({ kind, detail });
}

function propertyFacts(objectExpression, violations, prefix) {
  const keys = [];
  const values = {};
  for (const property of objectExpression?.properties ?? []) {
    const propertyKey = identifierName(property?.key);
    const allowedWorkspaceShorthand =
      prefix === 'workspace' &&
      property?.shorthand === true &&
      (propertyKey === 'cmToM' || propertyKey === 'mToCm');
    if (
      property?.type !== 'Property' ||
      property.kind !== 'init' ||
      property.computed ||
      property.method ||
      (property.shorthand && !allowedWorkspaceShorthand) ||
      property.type === 'SpreadElement'
    ) {
      addViolation(violations, `${prefix}-property-shape`);
      continue;
    }
    const key = identifierName(property.key);
    if (!key) {
      addViolation(violations, `${prefix}-property-key`);
      continue;
    }
    keys.push(key);
    values[key] = property.value;
  }
  return { keys, values };
}

function inspectOwner(source) {
  const violations = [];
  const normalizedSource = source.replaceAll('\r\n', '\n');
  const sourceFile = createSourceFile(ownerRel, normalizedSource);
  const analysis = analyzeSource(ownerRel, normalizedSource);
  const declaration = exportedConstDeclarator(sourceFile, ownerSymbol);
  const body = sourceFile.body ?? [];

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

  const exports = collectNamedModuleExports(ownerRel, normalizedSource).map(entry => ({
    exportedName: entry.exportedName,
    kind: entry.kind,
    localName: entry.localName,
    source: entry.source,
  }));
  if (
    stableJson(exports) !==
    stableJson([
      {
        exportedName: ownerSymbol,
        kind: 'value',
        localName: ownerSymbol,
        source: null,
      },
    ])
  ) {
    addViolation(violations, 'owner-export-inventory', stableJson(exports));
  }

  const initializer = declaration?.declarator.init;
  if (
    !initializer ||
    sha256(normalizedSource.slice(initializer.start, initializer.end)) !== ownerInitializerSha256
  ) {
    addViolation(violations, 'owner-initializer-fingerprint');
  }
  const objectExpression = frozenObject(initializer);
  if (!objectExpression) addViolation(violations, 'owner-freeze-shape');
  const facts = propertyFacts(objectExpression, violations, 'owner');
  const actualValues = {};
  for (const key of facts.keys) actualValues[key] = numericValue(facts.values[key]);
  if (stableJson(facts.keys) !== stableJson(Object.keys(expectedOwnerValues))) {
    addViolation(violations, 'owner-key-order', stableJson(facts.keys));
  }
  if (stableJson(actualValues) !== stableJson(expectedOwnerValues)) {
    addViolation(violations, 'owner-literal-inventory', stableJson(actualValues));
  }

  let freezeCalls = 0;
  let objectExpressions = 0;
  let unsupported = false;
  walkAst(sourceFile, node => {
    if (node?.type === 'CallExpression') {
      if (memberPath(node.callee) === 'Object.freeze') freezeCalls += 1;
      else unsupported = true;
    }
    if (node?.type === 'ObjectExpression') objectExpressions += 1;
    if (
      node?.type === 'SpreadElement' ||
      node?.type === 'ExportDefaultDeclaration' ||
      node?.type === 'TSAsExpression' ||
      node?.type === 'TSSatisfiesExpression' ||
      node?.type === 'TSTypeAssertion'
    ) {
      unsupported = true;
    }
  });
  if (freezeCalls !== 1 || objectExpressions !== 1) {
    addViolation(violations, 'owner-freeze-count', `${freezeCalls}/${objectExpressions}`);
  }
  if (unsupported) addViolation(violations, 'owner-wrapper-or-spread');
  return violations;
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

function exactNamedImport(specifier, symbols) {
  return {
    specifier,
    kind: 'value',
    syntax: 'static-import',
    importedSymbols: [...symbols],
    bindings: symbols.map(symbol => ({
      importedName: symbol,
      localName: symbol,
      exportedName: null,
    })),
  };
}

function inspectWorkspacePolicy(source) {
  const violations = [];
  const sourceFile = createSourceFile(workspacePolicyRel, source);
  const analysis = analyzeSource(workspacePolicyRel, source);
  const declaration = exportedConstDeclarator(sourceFile, workspacePolicySymbol);
  const expectedImports = [
    exactNamedImport('./no_main_sketch_policy.js', [ownerSymbol]),
    exactNamedImport('./units.js', ['cmToM', 'mToCm']),
    exactNamedImport('./wardrobe_defaults.js', ['DEFAULT_HEIGHT', 'DEFAULT_WIDTH', 'HINGED_DEFAULT_DEPTH']),
  ];

  if (
    stableJson(analysis.imports.map(dependencyFacts)) !== stableJson(expectedImports) ||
    analysis.unresolvedDynamicImports.length !== 0 ||
    analysis.forbiddenModuleSyntax.length !== 0
  ) {
    addViolation(
      violations,
      'workspace-dependency-inventory',
      stableJson(analysis.imports.map(dependencyFacts))
    );
  }
  if ((sourceFile.body ?? []).length !== 4 || sourceFile.body?.[3] !== declaration?.statement) {
    addViolation(violations, 'workspace-top-level-topology');
  }
  if (
    declaration?.statement.declaration.declarations?.length !== 1 ||
    declaration.declarator.id?.type !== 'Identifier' ||
    declaration.declarator.id.name !== workspacePolicySymbol ||
    declaration.declarator.id.typeAnnotation
  ) {
    addViolation(violations, 'workspace-export-declaration');
  }
  const exports = collectNamedModuleExports(workspacePolicyRel, source).map(entry => ({
    exportedName: entry.exportedName,
    kind: entry.kind,
    localName: entry.localName,
    source: entry.source,
  }));
  if (
    stableJson(exports) !==
    stableJson([
      {
        exportedName: workspacePolicySymbol,
        kind: 'value',
        localName: workspacePolicySymbol,
        source: null,
      },
    ])
  ) {
    addViolation(violations, 'workspace-export-inventory', stableJson(exports));
  }

  const rootObject = frozenObject(declaration?.declarator.init);
  if (!rootObject) addViolation(violations, 'workspace-freeze-shape');
  const rootFacts = propertyFacts(rootObject, violations, 'workspace');
  if (stableJson(rootFacts.keys) !== stableJson(['noMainSketch', 'fallbackDimensionsCm', 'cmToM', 'mToCm'])) {
    addViolation(violations, 'workspace-key-order', stableJson(rootFacts.keys));
  }
  if (
    rootFacts.values.noMainSketch?.type !== 'Identifier' ||
    rootFacts.values.noMainSketch.name !== ownerSymbol ||
    rootFacts.values.cmToM?.type !== 'Identifier' ||
    rootFacts.values.cmToM.name !== 'cmToM' ||
    rootFacts.values.mToCm?.type !== 'Identifier' ||
    rootFacts.values.mToCm.name !== 'mToCm'
  ) {
    addViolation(violations, 'workspace-identity-projection');
  }
  const fallbackObject = frozenObject(rootFacts.values.fallbackDimensionsCm);
  if (!fallbackObject) addViolation(violations, 'workspace-fallback-freeze');
  const fallbackFacts = propertyFacts(fallbackObject, violations, 'workspace-fallback');
  if (
    stableJson(fallbackFacts.keys) !== stableJson(['widthCm', 'heightCm', 'depthCm']) ||
    identifierName(fallbackFacts.values.widthCm) !== 'DEFAULT_WIDTH' ||
    identifierName(fallbackFacts.values.heightCm) !== 'DEFAULT_HEIGHT' ||
    identifierName(fallbackFacts.values.depthCm) !== 'HINGED_DEFAULT_DEPTH'
  ) {
    addViolation(violations, 'workspace-fallback-projection', stableJson(fallbackFacts.keys));
  }

  let freezeCalls = 0;
  let objectExpressions = 0;
  let unsupported = false;
  walkAst(sourceFile, node => {
    if (node?.type === 'CallExpression') {
      if (memberPath(node.callee) === 'Object.freeze') freezeCalls += 1;
      else unsupported = true;
    }
    if (node?.type === 'ObjectExpression') objectExpressions += 1;
    if (
      node?.type === 'SpreadElement' ||
      node?.type === 'ExportDefaultDeclaration' ||
      node?.type === 'TSAsExpression' ||
      node?.type === 'TSSatisfiesExpression' ||
      node?.type === 'TSTypeAssertion'
    ) {
      unsupported = true;
    }
  });
  if (freezeCalls !== 2 || objectExpressions !== 2) {
    addViolation(violations, 'workspace-freeze-count', `${freezeCalls}/${objectExpressions}`);
  }
  if (unsupported) addViolation(violations, 'workspace-wrapper-or-spread');
  if (/WARDROBE_DEFAULTS\b|import\s+\*\s+as/u.test(source)) {
    addViolation(violations, 'workspace-aggregate-or-namespace');
  }
  return violations;
}

function inspectFacade(source) {
  const violations = [];
  const facadeFile = path.join(root, facadeRel);
  const sourceFile = createSourceFile(facadeRel, source);
  const ownerDependencies = analyzeSource(facadeRel, source).imports.filter(
    dependency => resolveModuleTarget(facadeFile, dependency.specifier) === ownerTarget
  );
  if (
    ownerDependencies.length !== 1 ||
    ownerDependencies[0].specifier !== ownerSpecifier ||
    stableJson(dependencyFacts(ownerDependencies[0])) !==
      stableJson(exactNamedImport(ownerSpecifier, [ownerSymbol]))
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

  const exports = collectNamedModuleExports(facadeRel, source);
  if (
    exports.filter(entry => entry.kind === 'value' && entry.exportedName === compatibilitySymbol).length !== 1
  ) {
    addViolation(violations, 'facade-compatibility-export');
  }
  if (
    exports.some(
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

function canonicalSemanticPath(value) {
  if (!value) return null;
  if (value.startsWith(`${compatibilitySymbol}.`)) {
    return value.replace(compatibilitySymbol, ownerSymbol);
  }
  if (value.startsWith(`${ownerSymbol}.`)) return value;
  if (
    value === 'WARDROBE_DEFAULTS.widthCm' ||
    value === `${workspacePolicySymbol}.fallbackDimensionsCm.widthCm`
  ) {
    return `${workspacePolicySymbol}.fallbackDimensionsCm.widthCm`;
  }
  if (
    value === 'WARDROBE_DEFAULTS.heightCm' ||
    value === `${workspacePolicySymbol}.fallbackDimensionsCm.heightCm`
  ) {
    return `${workspacePolicySymbol}.fallbackDimensionsCm.heightCm`;
  }
  if (
    value === 'WARDROBE_DEFAULTS.byType.hinged.depthCm' ||
    value === `${workspacePolicySymbol}.fallbackDimensionsCm.depthCm`
  ) {
    return `${workspacePolicySymbol}.fallbackDimensionsCm.depthCm`;
  }
  if (value === `${workspacePolicySymbol}.noMainSketch.workspacePaddingM`) {
    return `${ownerSymbol}.workspacePaddingM`;
  }
  if (value === 'cmToM' || value === `${workspacePolicySymbol}.cmToM`) {
    return `${workspacePolicySymbol}.cmToM`;
  }
  if (value === 'mToCm' || value === `${workspacePolicySymbol}.mToCm`) {
    return `${workspacePolicySymbol}.mToCm`;
  }
  return null;
}

function semanticAstNode(node) {
  const pathValue = canonicalSemanticPath(memberPath(node));
  if (pathValue) return { type: 'SemanticReference', path: pathValue };
  if (node?.type === 'Identifier' && [compatibilitySymbol, ownerSymbol].includes(node.name)) {
    return { type: 'Identifier', name: ownerSymbol };
  }
  if (node?.type === 'Identifier' && (node.name === 'cmToM' || node.name === 'mToCm')) {
    return {
      type: 'SemanticReference',
      path: `${workspacePolicySymbol}.${node.name}`,
    };
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

function semanticFlowHash(rel, source) {
  const sourceFile = createSourceFile(rel, source);
  const body = (sourceFile.body ?? []).filter(statement => statement.type !== 'ImportDeclaration');
  return sha256(stableJson(canonicalSemanticAst(body)));
}

function literalFlowHash(rel, source) {
  const literals = [];
  const sourceFile = createSourceFile(rel, source);
  for (const statement of (sourceFile.body ?? []).filter(entry => entry.type !== 'ImportDeclaration')) {
    walkAst(statement, node => {
      if (node?.type === 'Literal') {
        literals.push({ type: typeof node.value, value: node.value });
      }
    });
  }
  return sha256(stableJson(literals));
}

function sharedDependenciesFor(rel, source) {
  const absolute = path.join(root, rel);
  return analyzeSource(rel, source).imports.filter(dependency => {
    const target = resolveModuleTarget(absolute, dependency.specifier);
    return typeof target === 'string' && target.startsWith(sharedRootPrefix);
  });
}

function inspectBuilder(source) {
  const violations = [];
  const analysis = analyzeSource(builderRel, source);
  if (
    stableJson(sharedDependenciesFor(builderRel, source).map(dependencyFacts)) !==
    stableJson([exactNamedImport('../../shared/dimensions/no_main_sketch_policy.js', [ownerSymbol])])
  ) {
    addViolation(violations, 'builder-shared-import-inventory');
  }
  if (
    analysis.unresolvedDynamicImports.length !== 0 ||
    analysis.forbiddenModuleSyntax.length !== 0 ||
    source.includes(compatibilitySymbol) ||
    source.includes('wardrobe_dimension_tokens_shared')
  ) {
    addViolation(violations, 'builder-compatibility-or-dynamic-route');
  }

  const counts = Object.fromEntries(Object.keys(expectedBuilderReferences).map(key => [key, 0]));
  let ownerIdentifiers = 0;
  const sourceFile = createSourceFile(builderRel, source);
  for (const statement of sourceFile.body ?? []) {
    if (statement.type === 'ImportDeclaration') continue;
    walkAst(statement, node => {
      if (node?.type === 'Identifier' && node.name === ownerSymbol) {
        ownerIdentifiers += 1;
      }
      if (node?.type === 'MemberExpression' && node.computed && memberRootIdentifier(node) === ownerSymbol) {
        addViolation(violations, 'builder-computed-owner-access');
      }
      const value = memberPath(node);
      if (!value?.startsWith(`${ownerSymbol}.`)) return;
      const key = value.slice(ownerSymbol.length + 1);
      if (!Object.hasOwn(counts, key)) {
        addViolation(violations, 'builder-owner-field', key);
        return;
      }
      counts[key] += 1;
    });
  }
  if (stableJson(counts) !== stableJson(expectedBuilderReferences) || ownerIdentifiers !== 11) {
    addViolation(violations, 'builder-owner-reference-inventory', stableJson({ counts, ownerIdentifiers }));
  }
  if (semanticFlowHash(builderRel, source) !== builderSemanticSha256) {
    addViolation(violations, 'builder-semantic-fingerprint');
  }
  if (literalFlowHash(builderRel, source) !== builderLiteralSha256) {
    addViolation(violations, 'builder-literal-fingerprint');
  }
  return violations;
}

function inspectService(source) {
  const violations = [];
  const analysis = analyzeSource(serviceRel, source);
  if (
    stableJson(sharedDependenciesFor(serviceRel, source).map(dependencyFacts)) !==
    stableJson([
      exactNamedImport('../../shared/dimensions/no_main_sketch_workspace_policy.js', [workspacePolicySymbol]),
    ])
  ) {
    addViolation(violations, 'service-shared-import-inventory');
  }
  if (
    analysis.unresolvedDynamicImports.length !== 0 ||
    analysis.forbiddenModuleSyntax.length !== 0 ||
    source.includes(compatibilitySymbol) ||
    source.includes('WARDROBE_DEFAULTS') ||
    source.includes('wardrobe_dimension_tokens_shared')
  ) {
    addViolation(violations, 'service-compatibility-or-aggregate-route');
  }

  const expectedReferences = {
    [`${workspacePolicySymbol}.noMainSketch.workspacePaddingM`]: 1,
    [`${workspacePolicySymbol}.fallbackDimensionsCm.widthCm`]: 1,
    [`${workspacePolicySymbol}.fallbackDimensionsCm.heightCm`]: 1,
    [`${workspacePolicySymbol}.fallbackDimensionsCm.depthCm`]: 1,
    [`${workspacePolicySymbol}.cmToM`]: 5,
    [`${workspacePolicySymbol}.mToCm`]: 1,
  };
  const counts = Object.fromEntries(Object.keys(expectedReferences).map(key => [key, 0]));
  const allowedIntermediatePaths = new Set([
    `${workspacePolicySymbol}.noMainSketch`,
    `${workspacePolicySymbol}.fallbackDimensionsCm`,
  ]);
  let policyIdentifiers = 0;
  const sourceFile = createSourceFile(serviceRel, source);
  for (const statement of sourceFile.body ?? []) {
    if (statement.type === 'ImportDeclaration') continue;
    walkAst(statement, node => {
      if (node?.type === 'Identifier' && node.name === workspacePolicySymbol) {
        policyIdentifiers += 1;
      }
      if (
        node?.type === 'MemberExpression' &&
        node.computed &&
        memberRootIdentifier(node) === workspacePolicySymbol
      ) {
        addViolation(violations, 'service-computed-policy-access');
      }
      const value = memberPath(node);
      if (!value?.startsWith(`${workspacePolicySymbol}.`)) return;
      if (Object.hasOwn(counts, value)) counts[value] += 1;
      else if (!allowedIntermediatePaths.has(value)) {
        addViolation(violations, 'service-policy-field', value);
      }
    });
  }
  if (stableJson(counts) !== stableJson(expectedReferences) || policyIdentifiers !== 10) {
    addViolation(violations, 'service-policy-reference-inventory', stableJson({ counts, policyIdentifiers }));
  }
  if (semanticFlowHash(serviceRel, source) !== serviceSemanticSha256) {
    addViolation(violations, 'service-semantic-fingerprint');
  }
  if (literalFlowHash(serviceRel, source) !== serviceLiteralSha256) {
    addViolation(violations, 'service-literal-fingerprint');
  }
  return violations;
}

function dependenciesForTarget(file, source, target) {
  return analyzeSource(file, source).imports.filter(
    dependency => resolveModuleTarget(file, dependency.specifier) === target
  );
}

function collectTargetInventory(files, target) {
  return files.flatMap(file =>
    dependenciesForTarget(file, fs.readFileSync(file, 'utf8'), target).map(dependency => ({
      file: relativePath(file),
      ...dependencyFacts(dependency),
    }))
  );
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
  const analysis = analyzeSource(file, source);

  for (const dependency of analysis.imports) {
    const target = resolveModuleTarget(file, dependency.specifier);
    const compatibilityRoute = target === facadeTarget || target === publicDimensionsTarget;
    const exposesCompatibility =
      dependency.importedSymbols.includes(compatibilitySymbol) ||
      (compatibilityRoute && dependency.importedSymbols.includes('*'));
    if (exposesCompatibility && !isExactPublicDimensionsRoute(file, dependency)) {
      addViolation(
        violations,
        'compatibility-consumer',
        `${rel}:${dependency.syntax}:${dependency.specifier}`
      );
    }
    if (dependency.syntax === 'dynamic-import' && compatibilityRoute) {
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

function publicSymbolReferences(source, symbols) {
  const references = [];
  const sourceFile = createSourceFile('public-symbol-probe.ts', source);
  walkAst(sourceFile, node => {
    const name = identifierName(node);
    if (symbols.includes(name)) references.push(name);
  });
  return references;
}

function assertRejected(inspect, source, expectedKind, label) {
  const violations = inspect(source);
  assert.equal(
    violations.some(violation => violation.kind === expectedKind),
    true,
    `${label}: ${JSON.stringify(violations)}`
  );
}

const esmFiles = listSourceFiles(path.join(root, 'esm'));
const nativeFiles = esmFiles.filter(file => relativePath(file).startsWith('esm/native/'));

test('No-Main Sketch owner preserves the exact inline literals, key order, freeze, and dependency-free topology', () => {
  const ownerFiles = listSourceFiles(path.join(root, 'esm/shared/dimensions'))
    .map(relativePath)
    .filter(file => path.basename(file) === 'no_main_sketch_policy.ts');
  assert.deepEqual(ownerFiles, [ownerRel]);
  assert.deepEqual(inspectOwner(read(ownerRel)), []);
});

test('No-Main Sketch workspace composition has one focused export and exact identity projections', () => {
  const workspaceFiles = listSourceFiles(path.join(root, 'esm/shared/dimensions'))
    .map(relativePath)
    .filter(file => path.basename(file) === 'no_main_sketch_workspace_policy.ts');
  assert.deepEqual(workspaceFiles, [workspacePolicyRel]);
  assert.deepEqual(inspectWorkspacePolicy(read(workspacePolicyRel)), []);
});

test('No-Main Sketch facade remains an inferred direct identity alias without a public owner leak', () => {
  assert.deepEqual(inspectFacade(read(facadeRel)), []);
  assert.deepEqual(
    publicSymbolReferences(read(publicDimensionsRel), [ownerSymbol, workspacePolicySymbol]),
    []
  );
  assert.deepEqual(publicSymbolReferences(read(runtimeApiRel), [ownerSymbol, workspacePolicySymbol]), []);
});

test('closeout has zero native compatibility consumers and exact owner/workspace consumer inventories', () => {
  assert.deepEqual(collectTargetInventory(esmFiles, ownerTarget), [
    {
      file: builderRel,
      ...exactNamedImport('../../shared/dimensions/no_main_sketch_policy.js', [ownerSymbol]),
    },
    {
      file: workspacePolicyRel,
      ...exactNamedImport('./no_main_sketch_policy.js', [ownerSymbol]),
    },
    {
      file: facadeRel,
      ...exactNamedImport(ownerSpecifier, [ownerSymbol]),
    },
  ]);
  assert.deepEqual(collectTargetInventory(esmFiles, workspacePolicyTarget), [
    {
      file: serviceRel,
      ...exactNamedImport('../../shared/dimensions/no_main_sketch_workspace_policy.js', [
        workspacePolicySymbol,
      ]),
    },
  ]);
  assert.deepEqual(
    esmFiles.flatMap(file => inspectCompatibilitySource(file, fs.readFileSync(file, 'utf8'))),
    []
  );
  assert.deepEqual(
    nativeFiles.flatMap(file =>
      dependenciesForTarget(file, fs.readFileSync(file, 'utf8'), facadeTarget).filter(dependency =>
        dependency.importedSymbols.includes(compatibilitySymbol)
      )
    ),
    []
  );
  assert.deepEqual(inspectBuilder(read(builderRel)), []);
  assert.deepEqual(inspectService(read(serviceRel)), []);
});

test('builder and service semantic/literal fingerprints preserve formulas, branches, and operation order', () => {
  assert.equal(semanticFlowHash(builderRel, read(builderRel)), builderSemanticSha256);
  assert.equal(literalFlowHash(builderRel, read(builderRel)), builderLiteralSha256);
  assert.equal(semanticFlowHash(serviceRel, read(serviceRel)), serviceSemanticSha256);
  assert.equal(literalFlowHash(serviceRel, read(serviceRel)), serviceLiteralSha256);
});

test('runtime identity, values, fallbacks, conversions, freezes, and serialization remain exact', () => {
  const loader = createTsRuntimeModuleLoader();
  const owner = loader.load(path.join(root, ownerRel))[ownerSymbol];
  const facade = loader.load(path.join(root, facadeRel))[compatibilitySymbol];
  const workspace = loader.load(path.join(root, workspacePolicyRel))[workspacePolicySymbol];
  const defaults = loader.load(path.join(root, 'esm/shared/dimensions/wardrobe_defaults.ts'));
  const units = loader.load(path.join(root, 'esm/shared/dimensions/units.ts'));

  assert.equal(facade, owner);
  assert.equal(workspace.noMainSketch, owner);
  assert.equal(workspace.fallbackDimensionsCm.widthCm, defaults.DEFAULT_WIDTH);
  assert.equal(workspace.fallbackDimensionsCm.heightCm, defaults.DEFAULT_HEIGHT);
  assert.equal(workspace.fallbackDimensionsCm.depthCm, defaults.HINGED_DEFAULT_DEPTH);
  assert.equal(workspace.cmToM, units.cmToM);
  assert.equal(workspace.mToCm, units.mToCm);
  assert.deepEqual(JSON.parse(JSON.stringify(owner)), expectedOwnerValues);
  assert.deepEqual(Object.keys(owner), Object.keys(expectedOwnerValues));
  assert.equal(Object.isFrozen(owner), true);
  assert.equal(Object.isFrozen(workspace), true);
  assert.equal(Object.isFrozen(workspace.fallbackDimensionsCm), true);
  assert.deepEqual(JSON.parse(JSON.stringify(facade)), expectedOwnerValues);
});

test('statement-neutral migration preserves Prefix 166 without owning the current Ledger tail', () => {
  const baseline = JSON.parse(read(baselineRel));
  assertStatementNeutralLedgerHistory(baseline.migrationBudgets);

  const withFutureEntry167 = appendSyntheticFutureEntry167(baseline.migrationBudgets);
  assert.equal(withFutureEntry167.length, 167);
  assert.doesNotThrow(() => assertStatementNeutralLedgerHistory(withFutureEntry167));
});

test('owner, workspace, and facade mutation probes reject literals, wrappers, aggregates, aliases, and leaks', () => {
  const owner = read(ownerRel);
  assertRejected(
    inspectOwner,
    owner.replace('  defaultGridDivisions: 6,', '  defaultGridDivisions: 7,'),
    'owner-initializer-fingerprint',
    'owner literal'
  );
  assertRejected(
    inspectOwner,
    owner.replace(
      '  defaultGridDivisions: 6,\n  workspacePaddingM: 0.12,',
      '  workspacePaddingM: 0.12,\n  defaultGridDivisions: 6,'
    ),
    'owner-key-order',
    'owner key order'
  );
  assertRejected(
    inspectOwner,
    owner.replace('Object.freeze({', '({'),
    'owner-freeze-shape',
    'owner freeze removal'
  );
  assertRejected(
    inspectOwner,
    `import { meters } from './units.js';\n${owner}`,
    'owner-dependency-free',
    'owner dependency'
  );
  assertRejected(
    inspectOwner,
    `${owner}\nexport default ${ownerSymbol};\n`,
    'owner-top-level-topology',
    'owner default export'
  );
  assertRejected(
    inspectOwner,
    owner.replace('  defaultGridDivisions:', '  ...{},\n  defaultGridDivisions:'),
    'owner-wrapper-or-spread',
    'owner spread'
  );

  const workspace = read(workspacePolicyRel);
  assertRejected(
    inspectWorkspacePolicy,
    workspace.replace(
      "import { DEFAULT_HEIGHT, DEFAULT_WIDTH, HINGED_DEFAULT_DEPTH } from './wardrobe_defaults.js';",
      "import { WARDROBE_DEFAULTS } from './wardrobe_defaults.js';"
    ),
    'workspace-dependency-inventory',
    'workspace aggregate defaults'
  );
  assertRejected(
    inspectWorkspacePolicy,
    workspace.replace("import { cmToM, mToCm } from './units.js';", "import * as units from './units.js';"),
    'workspace-dependency-inventory',
    'workspace units namespace'
  );
  assertRejected(
    inspectWorkspacePolicy,
    workspace.replace('    widthCm: DEFAULT_WIDTH,', '    widthCm: 160,'),
    'workspace-fallback-projection',
    'workspace fallback literal'
  );
  assertRejected(
    inspectWorkspacePolicy,
    workspace.replace('  cmToM,', '  cmToM: value => cmToM(value),'),
    'workspace-identity-projection',
    'workspace conversion wrapper'
  );
  assertRejected(
    inspectWorkspacePolicy,
    `${workspace}\nexport default ${workspacePolicySymbol};\n`,
    'workspace-top-level-topology',
    'workspace default export'
  );

  const facade = read(facadeRel);
  const alias = `export const ${compatibilitySymbol} = ${ownerSymbol};`;
  assertRejected(
    inspectFacade,
    facade.replace(alias, `export const ${compatibilitySymbol} = { ...${ownerSymbol} };`),
    'facade-identity-alias',
    'facade copy'
  );
  assertRejected(
    inspectFacade,
    facade.replace(alias, `export const ${compatibilitySymbol}: typeof ${ownerSymbol} = ${ownerSymbol};`),
    'facade-export-const',
    'facade annotation'
  );
  assertRejected(
    inspectFacade,
    facade.replace(
      `import { ${ownerSymbol} } from '${ownerSpecifier}';`,
      `import { ${ownerSymbol} as noMainPolicy } from '${ownerSpecifier}';`
    ),
    'facade-owner-import',
    'facade import alias'
  );
  assertRejected(
    inspectFacade,
    `${facade}\nexport { ${ownerSymbol} as ALTERNATE_NO_MAIN_POLICY };\n`,
    'facade-owner-public-leak',
    'facade owner leak'
  );
});

test('consumer mutation probes reject compatibility routes, bridges, direct service owners, computed access, literals, and flow drift', () => {
  const probeFile = path.join(root, 'esm/native/services/no_main_probe.ts');
  for (const [label, source] of [
    [
      'direct compatibility import',
      `import { ${compatibilitySymbol} } from '../../shared/wardrobe_dimension_tokens_shared.js';\nexport const value = ${compatibilitySymbol}.workspacePaddingM;`,
    ],
    [
      'extensionless compatibility import',
      `import { ${compatibilitySymbol} } from '../../shared/wardrobe_dimension_tokens_shared';\nexport const value = ${compatibilitySymbol}.workspacePaddingM;`,
    ],
    [
      'directory-index compatibility import',
      `import { ${compatibilitySymbol} } from '../features/dimensions';\nexport const value = ${compatibilitySymbol}.workspacePaddingM;`,
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
      `const route = '../../shared/' + 'wardrobe_dimension_tokens_shared.js';\nconst symbol = 'NO_MAIN_' + 'SKETCH_DIMENSIONS';\nexport const value = import(route).then(module => module[symbol]);`,
    ],
    [
      'compatibility bridge',
      `export { ${compatibilitySymbol} } from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
    [
      'compatibility object copy',
      `import { ${compatibilitySymbol} } from '../../shared/wardrobe_dimension_tokens_shared.js';\nexport const value = { ...${compatibilitySymbol} };`,
    ],
  ]) {
    assert.notDeepEqual(inspectCompatibilitySource(probeFile, source), [], label);
  }

  const builder = read(builderRel);
  assertRejected(
    inspectBuilder,
    builder.replace(`import { ${ownerSymbol} }`, `import { ${ownerSymbol} as noMainPolicy }`),
    'builder-shared-import-inventory',
    'builder alias'
  );
  assertRejected(
    inspectBuilder,
    builder.replace(`${ownerSymbol}.minGridSpanM`, `${ownerSymbol}['minGridSpanM']`),
    'builder-computed-owner-access',
    'builder computed access'
  );
  assertRejected(
    inspectBuilder,
    builder.replace(`${ownerSymbol}.defaultGridDivisions`, '6'),
    'builder-owner-reference-inventory',
    'builder wrapper literal'
  );
  assertRejected(
    inspectBuilder,
    builder.replace(
      'estimateNoMainWorkspaceWidthM(moduleCfg) || 0',
      'estimateNoMainWorkspaceWidthM(moduleCfg) ?? 0'
    ),
    'builder-semantic-fingerprint',
    'builder fallback formula'
  );
  assertRejected(
    inspectBuilder,
    builder.replace('return applyInteriorLayout({', 'return makeRodCreator({'),
    'builder-semantic-fingerprint',
    'builder operation order'
  );

  const service = read(serviceRel);
  assertRejected(
    inspectService,
    `${service}\nimport { DEFAULT_WIDTH } from '../../shared/dimensions/wardrobe_defaults.js';\n`,
    'service-shared-import-inventory',
    'service direct defaults owner'
  );
  assertRejected(
    inspectService,
    service.replace(
      `import { ${workspacePolicySymbol} }`,
      `import { ${workspacePolicySymbol} as workspacePolicy }`
    ),
    'service-shared-import-inventory',
    'service composition alias'
  );
  assertRejected(
    inspectService,
    service.replace(`${workspacePolicySymbol}.fallbackDimensionsCm.widthCm`, '160'),
    'service-policy-reference-inventory',
    'service fallback literal'
  );
  assertRejected(
    inspectService,
    service.replace(`${workspacePolicySymbol}.cmToM(heightCm)`, 'heightCm / 100'),
    'service-policy-reference-inventory',
    'service conversion literal'
  );
  assertRejected(
    inspectService,
    service.replace(
      'const doors = Math.round(__asNum(doorsRaw, NaN));',
      'const doors = __asNum(doorsRaw, NaN);'
    ),
    'service-semantic-fingerprint',
    'service door gate'
  );
  assertRejected(
    inspectService,
    service.replace('if (cachedNoMainMetrics) {', 'if (!cachedNoMainMetrics) {'),
    'service-semantic-fingerprint',
    'service cache precedence'
  );

  const ownerProbe = `import { ${ownerSymbol} } from '../../shared/dimensions/no_main_sketch_policy.js';`;
  assert.equal(dependenciesForTarget(probeFile, ownerProbe, ownerTarget).length, 1);
  const workspaceProbe = `import { ${workspacePolicySymbol} } from '../../shared/dimensions/no_main_sketch_workspace_policy.js';`;
  assert.equal(dependenciesForTarget(probeFile, workspaceProbe, workspacePolicyTarget).length, 1);
});
