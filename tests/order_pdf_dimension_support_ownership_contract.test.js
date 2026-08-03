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
const featureRel = 'esm/native/features/order_pdf_dimension_support.ts';
const consumerRel = 'esm/native/ui/export/export_order_pdf_text_details.ts';
const featureManifestRel = 'tools/wp_features_public_api_manifest.json';
const defaultsSpecifier = '../../shared/dimensions/wardrobe_defaults.js';
const resolutionSpecifier = '../../shared/dimensions/wardrobe_default_resolution_policy.js';
const compositionOwnerRel = 'esm/shared/dimensions/order_pdf_dimension_policy.ts';
const compositionSpecifier = '../../shared/dimensions/order_pdf_dimension_policy.js';
const symbols = Object.freeze([
  'DEFAULT_HEIGHT',
  'DEFAULT_WIDTH',
  'getDefaultDepthForWardrobeType',
  'getDefaultDoorsForWardrobeType',
]);
const ownerGroups = Object.freeze([
  Object.freeze({
    family: 'Wardrobe Defaults',
    file: 'esm/shared/dimensions/wardrobe_defaults.ts',
    specifier: defaultsSpecifier,
    symbols: Object.freeze(['DEFAULT_HEIGHT', 'DEFAULT_WIDTH']),
  }),
  Object.freeze({
    family: 'Wardrobe Default Resolution',
    file: 'esm/shared/dimensions/wardrobe_default_resolution_policy.ts',
    specifier: resolutionSpecifier,
    symbols: Object.freeze(['getDefaultDepthForWardrobeType', 'getDefaultDoorsForWardrobeType']),
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

const sha256 = text => createHash('sha256').update(text).digest('hex');
const sorted = values => [...values].sort((left, right) => left.localeCompare(right));
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

function consumerFingerprint(source = read(consumerRel)) {
  const sourceFile = createSourceFile(consumerRel, source);
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
  const [dependency] = analysis.imports;
  if (
    analysis.imports.length !== 1 ||
    dependency?.specifier !== compositionSpecifier ||
    dependency?.kind !== 'value' ||
    dependency?.syntax !== 'static-import' ||
    stableJson(sorted(dependency?.importedSymbols ?? [])) !== stableJson(sorted(symbols))
  ) {
    addViolation(violations, 'owner-statement-count');
  }
  if (dependency?.bindings.some(binding => binding.importedName !== binding.localName)) {
    addViolation(violations, 'owner-alias');
  }
  if (dependency?.specifier?.includes('wardrobe_dimension_tokens_shared'))
    addViolation(violations, 'facade-route');
  if (
    analysis.unresolvedDynamicImports.length ||
    analysis.forbiddenModuleSyntax.length ||
    analysis.imports.some(dependency =>
      ['dynamic-import', 'static-namespace-import'].includes(dependency.syntax)
    )
  ) {
    addViolation(violations, 'forbidden-module-syntax');
  }
  if (
    exports.length !== 4 ||
    exports.some(
      entry => entry.source !== null || entry.kind !== 'value' || entry.localName !== entry.exportedName
    ) ||
    stableJson(sorted(exports.map(entry => entry.exportedName))) !== stableJson(sorted(symbols))
  ) {
    addViolation(violations, 'feature-export-surface');
  }
  if (
    sourceFile.body.length !== 2 ||
    sourceFile.body.filter(statement => statement.type === 'ImportDeclaration').length !== 1 ||
    sourceFile.body.filter(
      statement =>
        statement.type === 'ExportNamedDeclaration' &&
        statement.source == null &&
        statement.declaration == null
    ).length !== 1
  ) {
    addViolation(violations, 'feature-wrapper-copy-or-logic');
  }
  return violations;
}

function inspectCompositionOwner(source) {
  const violations = [];
  const analysis = analyzeModuleDependencies(compositionOwnerRel, source);
  const expected = ownerGroups.map(group => ({
    specifier: group.specifier.replace('../../shared/dimensions/', './'),
    symbols: group.symbols,
  }));
  if (analysis.imports.length !== 2) addViolation(violations, 'composition-source-count');
  for (const group of expected) {
    const matches = analysis.imports.filter(dependency => dependency.specifier === group.specifier);
    const dependency = matches[0];
    if (
      matches.length !== 1 ||
      dependency?.kind !== 'value' ||
      dependency?.syntax !== 'static-re-export' ||
      dependency?.bindings.some(binding => binding.importedName !== binding.exportedName) ||
      stableJson(sorted(dependency?.importedSymbols ?? [])) !== stableJson(sorted(group.symbols))
    )
      addViolation(violations, 'composition-source', group.specifier);
  }
  const sourceFile = createSourceFile(compositionOwnerRel, source);
  if (
    sourceFile.body.length !== 2 ||
    sourceFile.body.some(statement => statement.type !== 'ExportNamedDeclaration' || statement.declaration)
  ) {
    addViolation(violations, 'composition-owner-logic');
  }
  return violations;
}

function listSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(absolute);
    return entry.isFile() && /\.(?:[cm]?[jt]sx?)$/u.test(entry.name) ? [absolute] : [];
  });
}

function canonicalModuleStem(rel, specifier) {
  const clean = specifier.split(/[?#]/u, 1)[0];
  const resolved = clean.startsWith('@/')
    ? `esm/${clean.slice(2)}`
    : clean.startsWith('.')
      ? path.posix.join(path.posix.dirname(rel), clean)
      : null;
  return resolved === null ? null : path.posix.normalize(resolved).replace(/\.(?:[cm]?[jt]sx?)$/u, '');
}

const dependencyCache = new Map();

function dependenciesFor(rel, source) {
  const cached = dependencyCache.get(rel);
  if (cached?.source === source) return cached.dependencies;
  const dependencies = analyzeModuleDependencies(rel, source).imports;
  dependencyCache.set(rel, { source, dependencies });
  return dependencies;
}

function inspectTopology(entries) {
  const violations = [];
  const target = featureRel.replace(/\.(?:[cm]?[jt]sx?)$/u, '');
  const consumers = [];
  for (const [rel, source] of entries) {
    const dependencies = dependenciesFor(rel, source);
    const matches = dependencies.filter(
      dependency => canonicalModuleStem(rel, dependency.specifier) === target
    );
    if (matches.length) {
      consumers.push({
        file: rel,
        count: matches.length,
        kind: matches[0].kind,
        syntax: matches[0].syntax,
        symbols: matches[0].importedSymbols,
        aliases: matches[0].bindings
          .filter(binding => binding.importedName !== binding.localName)
          .map(binding => [binding.importedName, binding.localName]),
      });
    }
  }
  const expected = [
    {
      file: consumerRel,
      count: 1,
      kind: 'value',
      syntax: 'static-import',
      symbols: [...symbols],
      aliases: [],
    },
  ];
  if (stableJson(consumers) !== stableJson(expected)) {
    addViolation(violations, 'feature-consumer-inventory', consumers);
  }
  const consumerSource = entries.find(([rel]) => rel === consumerRel)?.[1] ?? '';
  const consumerDependencies = dependenciesFor(consumerRel, consumerSource);
  const servicesDimensions = consumerDependencies.filter(
    dependency =>
      dependency.specifier.includes('/services/api') &&
      dependency.importedSymbols.some(symbol => symbols.includes(symbol))
  );
  if (servicesDimensions.length) addViolation(violations, 'consumer-services-dimension-route');
  return violations;
}

let cachedProductionEntries = null;

function productionEntries(overrides = {}) {
  cachedProductionEntries ??= listSourceFiles(path.join(root, 'esm')).map(file => [
    path.relative(root, file).replaceAll('\\', '/'),
    fs.readFileSync(file, 'utf8'),
  ]);
  return cachedProductionEntries.map(([rel, source]) => [
    rel,
    Object.hasOwn(overrides, rel) ? overrides[rel] : source,
  ]);
}

test('Order PDF dimension feature has one exact composition owner, four direct exports, and one consumer', () => {
  assert.deepEqual(inspectFeature(read(featureRel)), []);
  assert.deepEqual(inspectCompositionOwner(read(compositionOwnerRel)), []);
  assert.deepEqual(inspectTopology(productionEntries()), []);

  const featureManifest = JSON.parse(read(featureManifestRel));
  assert.equal(
    featureManifest.publicEntries.filter(entry => entry === 'order_pdf_dimension_support.js').length,
    1
  );
  assert.deepEqual(featureManifest.families.order_pdf_dimension_support, ['order_pdf_dimension_support.js']);
});

test('Order PDF support preserves owner identities and the consumer AST/literal fingerprint', () => {
  const depth = () => 60;
  const doors = () => 2;
  const runtime = loadTsRuntimeModule(path.join(root, featureRel), {
    mock: specifier =>
      specifier === compositionSpecifier
        ? {
            DEFAULT_HEIGHT: 240,
            DEFAULT_WIDTH: 120,
            getDefaultDepthForWardrobeType: depth,
            getDefaultDoorsForWardrobeType: doors,
          }
        : undefined,
  });
  assert.equal(runtime.DEFAULT_HEIGHT, 240);
  assert.equal(runtime.DEFAULT_WIDTH, 120);
  assert.strictEqual(runtime.getDefaultDepthForWardrobeType, depth);
  assert.strictEqual(runtime.getDefaultDoorsForWardrobeType, doors);
  assert.deepEqual(consumerFingerprint(), {
    semantic: 'd661c85384b184fa8da665bbf7feb3d41451fad222b8bff1c4409c0cb17b690e',
    literals: '53e58df65b76a96afdd67b9fb83941a5bd9af1ea8e96e2be1ea7c1d1077d5ad9',
    literalCount: 144,
  });
});

test('Order PDF mutation probes keep the focused route, topology, and behavior enforceable', () => {
  const featureSource = read(featureRel);
  assert.equal(
    inspectFeature(
      featureSource.replace(compositionSpecifier, '../../shared/wardrobe_dimension_tokens_shared.js')
    ).some(violation => violation.kind === 'facade-route'),
    true
  );
  assert.equal(
    inspectFeature(
      featureSource.replace('  DEFAULT_HEIGHT,', '  DEFAULT_HEIGHT as ORDER_DEFAULT_HEIGHT,')
    ).some(violation => violation.kind === 'owner-alias'),
    true
  );
  assert.equal(
    inspectFeature(
      featureSource.replace(
        'export { DEFAULT_HEIGHT, DEFAULT_WIDTH, getDefaultDepthForWardrobeType, getDefaultDoorsForWardrobeType };',
        'export const ORDER_DEFAULT_HEIGHT = DEFAULT_HEIGHT;'
      )
    ).some(violation => violation.kind === 'feature-wrapper-copy-or-logic'),
    true
  );

  const extraConsumerEntries = productionEntries();
  extraConsumerEntries.push([
    'esm/native/services/order_pdf_dimension_probe.ts',
    `import { DEFAULT_WIDTH } from '../features/order_pdf_dimension_support.js';`,
  ]);
  assert.equal(
    inspectTopology(extraConsumerEntries).some(violation => violation.kind === 'feature-consumer-inventory'),
    true
  );

  const servicesBypass = read(consumerRel).replace(
    '../../features/order_pdf_dimension_support.js',
    '../../services/api.js'
  );
  assert.equal(
    inspectTopology(productionEntries({ [consumerRel]: servicesBypass })).some(
      violation => violation.kind === 'consumer-services-dimension-route'
    ),
    true
  );

  const behaviorDrift = read(consumerRel).replace(
    `return typeof v === 'string' ? v : defaultValue;`,
    'return defaultValue;'
  );
  assert.notDeepEqual(consumerFingerprint(behaviorDrift), consumerFingerprint());
});
