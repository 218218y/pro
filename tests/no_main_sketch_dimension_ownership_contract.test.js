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
const builderRel = 'esm/native/builder/build_no_main_sketch_host.ts';
const serviceRel = 'esm/native/services/canvas_picking_projection_runtime_box_no_main_workspace.ts';

const ownerSymbol = 'NO_MAIN_SKETCH_POLICY';
const workspacePolicySymbol = 'NO_MAIN_SKETCH_WORKSPACE_POLICY';
const compatibilitySymbol = 'NO_MAIN_SKETCH_DIMENSIONS';

const ownerInitializerSha256 = '1ac8627d6358514b4bd83cff5eb4881430402eb9145aba3417f0e0517b90f903';
const expectedOwnerValues = Object.freeze({
  defaultGridDivisions: 6,
  workspacePaddingM: 0.12,
  defaultWorkspaceWidthM: 1.6,
  minHostHeightM: 0.05,
  minInnerWidthM: 0.02,
  minGridSpanM: 0.02,
});

const sourceExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);

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

test('builder and service consumers stay on canonical no-main policy owners without compatibility aggregates', () => {
  const builderSource = read(builderRel);
  const serviceSource = read(serviceRel);
  const builderImports = analyzeSource(builderRel, builderSource).imports.map(dependencyFacts);
  const serviceImports = analyzeSource(serviceRel, serviceSource).imports.map(dependencyFacts);

  assert.equal(
    builderImports.some(
      dependency =>
        dependency.specifier === '../../shared/dimensions/no_main_sketch_policy.js' &&
        dependency.importedSymbols.includes(ownerSymbol)
    ),
    true
  );
  assert.equal(
    serviceImports.some(
      dependency =>
        dependency.specifier === '../../shared/dimensions/no_main_sketch_workspace_policy.js' &&
        dependency.importedSymbols.includes(workspacePolicySymbol)
    ),
    true
  );
  for (const source of [builderSource, serviceSource]) {
    assert.equal(source.includes(compatibilitySymbol), false);
    assert.equal(source.includes('WARDROBE_DEFAULTS'), false);
  }
});

test('runtime values, fallbacks, conversions, freezes, and serialization remain exact', () => {
  const loader = createTsRuntimeModuleLoader();
  const owner = loader.load(path.join(root, ownerRel))[ownerSymbol];
  const workspace = loader.load(path.join(root, workspacePolicyRel))[workspacePolicySymbol];
  const defaults = loader.load(path.join(root, 'esm/shared/dimensions/wardrobe_defaults.ts'));
  const units = loader.load(path.join(root, 'esm/shared/dimensions/units.ts'));

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
});
