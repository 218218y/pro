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
const ownerRel = 'esm/shared/dimensions/wardrobe_sanitization_policy.ts';
const consumerRel = 'esm/native/builder/state_sanitize_pipeline.ts';
const defaultsRel = 'esm/shared/dimensions/wardrobe_defaults.ts';
const limitsRel = 'esm/shared/dimensions/product_limits.ts';
const resolutionRel = 'esm/shared/dimensions/wardrobe_default_resolution_policy.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const runtimeApiRel = 'esm/native/runtime/api.ts';
const ownerSymbol = 'WARDROBE_SANITIZATION_POLICY';
const ownerSpecifier = '../../shared/dimensions/wardrobe_sanitization_policy.js';
const consumerSemanticSha256 = '332ee90f70f7e5b0a8d4b0e26aba84d51141c13ae0940b5d098ff1ecd7df7788';
const consumerFunctionSha256 = '3664f3086632093cdec9e39439fc16ad595edc31183ddae51d838b3e43d27b9c';
const consumerLiteralSha256 = '4cf824373058e8e2b3a587378cb9d347ada77f435f4c5640d5f93f8604c6cbe6';
const expectedOwnerDependencies = Object.freeze([
  Object.freeze({
    specifier: './wardrobe_default_resolution_policy.js',
    kind: 'value',
    syntax: 'static-import',
    symbols: Object.freeze(['getDefaultDepthForWardrobeType', 'getDefaultDoorsForWardrobeType']),
  }),
  Object.freeze({
    specifier: './wardrobe_defaults.js',
    kind: 'value',
    syntax: 'static-import',
    symbols: Object.freeze(['DEFAULT_CHEST_DRAWERS_COUNT', 'DEFAULT_HEIGHT', 'DEFAULT_WIDTH']),
  }),
  Object.freeze({
    specifier: './product_limits.js',
    kind: 'value',
    syntax: 'static-import',
    symbols: Object.freeze([
      'WARDROBE_CHEST_DRAWERS_MAX',
      'WARDROBE_CHEST_DRAWERS_MIN',
      'WARDROBE_CHEST_HEIGHT_MIN',
      'WARDROBE_CHEST_WIDTH_MIN',
      'WARDROBE_DEPTH_MAX',
      'WARDROBE_DEPTH_MIN',
      'WARDROBE_DOORS_MAX',
      'WARDROBE_DOORS_MIN',
      'WARDROBE_HEIGHT_MAX',
      'WARDROBE_HEIGHT_MIN',
      'WARDROBE_SLIDING_DOORS_MIN',
      'WARDROBE_WIDTH_MAX',
      'WARDROBE_WIDTH_MIN',
    ]),
  }),
]);

const expectedOwnerTree = Object.freeze({
  defaults: Object.freeze({
    widthCm: 'DEFAULT_WIDTH',
    heightCm: 'DEFAULT_HEIGHT',
    chestDrawersCount: 'DEFAULT_CHEST_DRAWERS_COUNT',
  }),
  limits: Object.freeze({
    width: Object.freeze({
      minCm: 'WARDROBE_WIDTH_MIN',
      chestMinCm: 'WARDROBE_CHEST_WIDTH_MIN',
      maxCm: 'WARDROBE_WIDTH_MAX',
    }),
    height: Object.freeze({
      minCm: 'WARDROBE_HEIGHT_MIN',
      chestMinCm: 'WARDROBE_CHEST_HEIGHT_MIN',
      maxCm: 'WARDROBE_HEIGHT_MAX',
    }),
    depth: Object.freeze({
      minCm: 'WARDROBE_DEPTH_MIN',
      maxCm: 'WARDROBE_DEPTH_MAX',
    }),
    doors: Object.freeze({
      min: 'WARDROBE_DOORS_MIN',
      slidingMin: 'WARDROBE_SLIDING_DOORS_MIN',
      max: 'WARDROBE_DOORS_MAX',
    }),
    chestDrawers: Object.freeze({
      min: 'WARDROBE_CHEST_DRAWERS_MIN',
      max: 'WARDROBE_CHEST_DRAWERS_MAX',
    }),
  }),
  resolveDepthCm: 'getDefaultDepthForWardrobeType',
  resolveDoorsCount: 'getDefaultDoorsForWardrobeType',
});

const normalizedConsumerReferences = Object.freeze({
  'defaults.widthCm': 'DEFAULT_WIDTH',
  'defaults.heightCm': 'DEFAULT_HEIGHT',
  'defaults.chestDrawersCount': 'DEFAULT_CHEST_DRAWERS_COUNT',
  'limits.width.minCm': 'WARDROBE_WIDTH_MIN',
  'limits.width.chestMinCm': 'WARDROBE_CHEST_WIDTH_MIN',
  'limits.width.maxCm': 'WARDROBE_WIDTH_MAX',
  'limits.height.minCm': 'WARDROBE_HEIGHT_MIN',
  'limits.height.chestMinCm': 'WARDROBE_CHEST_HEIGHT_MIN',
  'limits.height.maxCm': 'WARDROBE_HEIGHT_MAX',
  'limits.depth.minCm': 'WARDROBE_DEPTH_MIN',
  'limits.depth.maxCm': 'WARDROBE_DEPTH_MAX',
  'limits.doors.min': '0',
  'limits.doors.slidingMin': 'WARDROBE_SLIDING_DOORS_MIN',
  'limits.doors.max': 'WARDROBE_DOORS_MAX',
  'limits.chestDrawers.min': 'WARDROBE_CHEST_DRAWERS_MIN',
  'limits.chestDrawers.max': 'WARDROBE_CHEST_DRAWERS_MAX',
  resolveDepthCm: 'getDefaultDepthForWardrobeType',
  resolveDoorsCount: 'getDefaultDoorsForWardrobeType',
});

const expectedConsumerReferenceCounts = Object.freeze({
  'defaults.widthCm': 1,
  'defaults.heightCm': 1,
  'defaults.chestDrawersCount': 2,
  'limits.width.minCm': 1,
  'limits.width.chestMinCm': 1,
  'limits.width.maxCm': 2,
  'limits.height.minCm': 1,
  'limits.height.chestMinCm': 1,
  'limits.height.maxCm': 2,
  'limits.depth.minCm': 2,
  'limits.depth.maxCm': 2,
  'limits.doors.min': 1,
  'limits.doors.slidingMin': 1,
  'limits.doors.max': 2,
  'limits.chestDrawers.min': 1,
  'limits.chestDrawers.max': 1,
  resolveDepthCm: 1,
  resolveDoorsCount: 1,
});

const approvedUnresolvedDynamicImports = Object.freeze({
  'esm/entry_pro_main_boot_support.ts': Object.freeze([
    'THREE_PATH',
    'ORBIT_PATH',
    'ROUNDED_BOX_PATH',
    'url',
  ]),
});

const sourceExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const runtimeExtensionCandidates = Object.freeze({
  '.js': Object.freeze(['.ts', '.tsx', '.js', '.jsx']),
  '.mjs': Object.freeze(['.mts', '.mjs']),
  '.cjs': Object.freeze(['.cts', '.cjs']),
  '.jsx': Object.freeze(['.tsx', '.jsx']),
});
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

const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const analysisCache = new Map();

function analyzeSource(file, source) {
  const key = `${path.normalize(file).toLowerCase()}\0${sha256(source)}`;
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
const defaultsTarget = canonicalTarget(path.join(root, defaultsRel));
const limitsTarget = canonicalTarget(path.join(root, limitsRel));
const resolutionTarget = canonicalTarget(path.join(root, resolutionRel));
const facadeTarget = canonicalTarget(path.join(root, facadeRel));
const publicDimensionsTarget = canonicalTarget(path.join(root, publicDimensionsRel));
const sharedRootPrefix = `${path.normalize(path.join(root, 'esm/shared')).toLowerCase()}${path.sep}`;

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

function dependencyFacts(dependency) {
  return {
    specifier: dependency.specifier,
    kind: dependency.kind,
    syntax: dependency.syntax,
    symbols: [...dependency.importedSymbols],
  };
}

function addViolation(violations, kind, detail = null) {
  violations.push({ kind, detail });
}

function objectPropertyMap(objectExpression, violations, prefix) {
  const keys = [];
  const values = {};
  for (const property of objectExpression?.properties ?? []) {
    if (
      property?.type !== 'Property' ||
      property.kind !== 'init' ||
      property.computed ||
      property.method ||
      property.shorthand
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

function inspectFrozenTree(node, expected, violations, prefix) {
  const objectExpression = frozenObject(node);
  if (!objectExpression) {
    addViolation(violations, `${prefix}-freeze`);
    return;
  }
  const facts = objectPropertyMap(objectExpression, violations, prefix);
  const expectedKeys = Object.keys(expected);
  if (stableJson(facts.keys) !== stableJson(expectedKeys)) {
    addViolation(violations, `${prefix}-key-order`, facts.keys);
  }
  for (const key of expectedKeys) {
    const expectedValue = expected[key];
    const actualValue = facts.values[key];
    if (expectedValue && typeof expectedValue === 'object') {
      inspectFrozenTree(actualValue, expectedValue, violations, `${prefix}.${key}`);
    } else if (actualValue?.type !== 'Identifier' || actualValue.name !== expectedValue) {
      addViolation(violations, `${prefix}-identity-projection`, {
        key,
        actual: memberPath(actualValue) ?? identifierName(actualValue) ?? actualValue?.type ?? null,
        expected: expectedValue,
      });
    }
  }
}

function inspectOwner(source) {
  const violations = [];
  const sourceFile = createSourceFile(ownerRel, source);
  const analysis = analyzeSource(path.join(root, ownerRel), source);
  const dependencies = analysis.imports.map(dependencyFacts);
  if (stableJson(dependencies) !== stableJson(expectedOwnerDependencies)) {
    addViolation(violations, 'owner-dependency-inventory', dependencies);
  }
  for (const dependency of analysis.imports) {
    for (const binding of dependency.bindings) {
      if (binding.localName !== binding.importedName || binding.exportedName !== null) {
        addViolation(violations, 'owner-import-alias', binding);
      }
    }
  }
  if (analysis.unresolvedDynamicImports.length !== 0 || analysis.forbiddenModuleSyntax.length !== 0) {
    addViolation(violations, 'owner-dynamic-or-forbidden-module-syntax');
  }

  const declaration = exportedConstDeclarator(sourceFile, ownerSymbol);
  const nonImports = (sourceFile.body ?? []).filter(statement => statement.type !== 'ImportDeclaration');
  if (nonImports.length !== 1 || nonImports[0] !== declaration?.statement) {
    addViolation(violations, 'owner-top-level-topology');
  }
  if (
    declaration?.statement.declaration.declarations?.length !== 1 ||
    declaration.declarator.id?.type !== 'Identifier' ||
    declaration.declarator.id.name !== ownerSymbol ||
    declaration.declarator.id.typeAnnotation ||
    declaration.declarator.id.optional ||
    declaration.declarator.id.definite
  ) {
    addViolation(violations, 'owner-export-const');
  }
  const exports = collectNamedModuleExports(ownerRel, source).map(entry => ({
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
    addViolation(violations, 'owner-export-inventory', exports);
  }

  inspectFrozenTree(declaration?.declarator.init, expectedOwnerTree, violations, 'owner');
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
      node?.type === 'Literal' &&
      typeof node.value === 'number' &&
      node.parent?.type !== 'ImportDeclaration'
    ) {
      addViolation(violations, 'owner-numeric-literal', node.value);
    }
    if (
      node?.type === 'SpreadElement' ||
      node?.type === 'ExportDefaultDeclaration' ||
      node?.type === 'TSAsExpression' ||
      node?.type === 'TSSatisfiesExpression' ||
      node?.type === 'TSTypeAssertion' ||
      node?.type === 'ArrowFunctionExpression' ||
      node?.type === 'FunctionExpression'
    ) {
      unsupported = true;
    }
  });
  if (freezeCalls !== 8 || objectExpressions !== 8) {
    addViolation(violations, 'owner-freeze-count', { freezeCalls, objectExpressions });
  }
  if (unsupported) addViolation(violations, 'owner-wrapper-spread-or-side-effect');
  if (/\bWARDROBE_(?:DEFAULTS|LIMITS)\b/u.test(source)) {
    addViolation(violations, 'owner-aggregate-dependency');
  }
  return violations;
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

function semanticHash(value) {
  return sha256(stableJson(canonicalSemanticAst(value)));
}

function normalizedConsumerSource(source) {
  let normalized = source;
  for (const [member, replacement] of Object.entries(normalizedConsumerReferences).sort(
    (left, right) => right[0].length - left[0].length
  )) {
    normalized = normalized.replaceAll(`${ownerSymbol}.${member}`, replacement);
  }
  return normalized;
}

function consumerSemanticFacts(source) {
  const normalized = normalizedConsumerSource(source);
  const sourceFile = createSourceFile(consumerRel, normalized);
  const body = (sourceFile.body ?? []).filter(statement => statement.type !== 'ImportDeclaration');
  const sanitizer = body.find(
    statement =>
      statement?.type === 'ExportNamedDeclaration' &&
      statement.declaration?.type === 'FunctionDeclaration' &&
      identifierName(statement.declaration.id) === 'sanitizeBuildDimsAndSyncRuntime'
  )?.declaration;
  const literals = [];
  for (const statement of body) {
    walkAst(statement, node => {
      if (node?.type === 'Literal') {
        literals.push({ type: typeof node.value, value: node.value });
      }
    });
  }
  return {
    bodyHash: semanticHash(body),
    functionHash: sanitizer ? semanticHash(sanitizer) : null,
    literalHash: sha256(stableJson(literals)),
  };
}

function dependenciesForTarget(file, source, target) {
  return analyzeSource(file, source).imports.filter(
    dependency => resolveModuleTarget(file, dependency.specifier) === target
  );
}

function inspectConsumer(source) {
  const violations = [];
  const file = path.join(root, consumerRel);
  const analysis = analyzeSource(file, source);
  const ownerDependencies = dependenciesForTarget(file, source, ownerTarget);
  if (
    ownerDependencies.length !== 1 ||
    stableJson(dependencyFacts(ownerDependencies[0])) !==
      stableJson({
        specifier: ownerSpecifier,
        kind: 'value',
        syntax: 'static-import',
        symbols: [ownerSymbol],
      })
  ) {
    addViolation(violations, 'consumer-owner-import', ownerDependencies.map(dependencyFacts));
  }
  for (const dependency of ownerDependencies) {
    for (const binding of dependency.bindings) {
      if (binding.localName !== ownerSymbol || binding.exportedName !== null) {
        addViolation(violations, 'consumer-owner-alias', binding);
      }
    }
  }

  const sharedDependencies = analysis.imports.filter(dependency => {
    const target = resolveModuleTarget(file, dependency.specifier);
    return typeof target === 'string' && target.startsWith(sharedRootPrefix);
  });
  if (
    stableJson(sharedDependencies.map(dependencyFacts)) !==
    stableJson([
      {
        specifier: '../../shared/identity_value_shared.js',
        kind: 'value',
        syntax: 'static-import',
        symbols: ['formatIdentityValue', 'readIdentityValue'],
      },
      {
        specifier: ownerSpecifier,
        kind: 'value',
        syntax: 'static-import',
        symbols: [ownerSymbol],
      },
    ])
  ) {
    addViolation(violations, 'consumer-shared-import-inventory', sharedDependencies.map(dependencyFacts));
  }
  const forbiddenTargets = new Set([
    defaultsTarget,
    limitsTarget,
    resolutionTarget,
    facadeTarget,
    publicDimensionsTarget,
  ]);
  const forbiddenDependencies = analysis.imports.filter(dependency =>
    forbiddenTargets.has(resolveModuleTarget(file, dependency.specifier))
  );
  if (forbiddenDependencies.length !== 0) {
    addViolation(
      violations,
      'consumer-forbidden-dimension-dependency',
      forbiddenDependencies.map(dependencyFacts)
    );
  }
  if (analysis.unresolvedDynamicImports.length !== 0 || analysis.forbiddenModuleSyntax.length !== 0) {
    addViolation(violations, 'consumer-dynamic-or-forbidden-module-syntax');
  }

  const sourceFile = createSourceFile(consumerRel, source);
  const referenceCounts = Object.fromEntries(
    Object.keys(expectedConsumerReferenceCounts).map(member => [member, 0])
  );
  walkAst(sourceFile, node => {
    if (node?.type === 'MemberExpression' && memberRootIdentifier(node) === ownerSymbol && node.computed) {
      addViolation(violations, 'consumer-computed-owner-access', memberPath(node));
    }
    if (node?.type !== 'Identifier' || node.name !== ownerSymbol) return;
    if (
      node.parent?.type === 'ImportSpecifier' ||
      node.parent?.type === 'ImportDefaultSpecifier' ||
      node.parent?.type === 'ImportNamespaceSpecifier'
    ) {
      return;
    }
    let highest = node;
    while (highest.parent?.type === 'MemberExpression' && highest.parent.object === highest) {
      highest = highest.parent;
    }
    const fullPath = memberPath(highest);
    const prefix = `${ownerSymbol}.`;
    if (!fullPath?.startsWith(prefix)) {
      addViolation(violations, 'consumer-owner-reference-escape', highest.parent?.type ?? null);
      return;
    }
    const member = fullPath.slice(prefix.length);
    if (!Object.prototype.hasOwnProperty.call(referenceCounts, member)) {
      addViolation(violations, 'consumer-unknown-owner-member', member);
      return;
    }
    referenceCounts[member] += 1;
  });
  if (stableJson(referenceCounts) !== stableJson(expectedConsumerReferenceCounts)) {
    addViolation(violations, 'consumer-owner-reference-inventory', referenceCounts);
  }

  const semanticFacts = consumerSemanticFacts(source);
  if (semanticFacts.bodyHash !== consumerSemanticSha256) {
    addViolation(violations, 'consumer-normalized-semantic-hash', semanticFacts.bodyHash);
  }
  if (semanticFacts.functionHash !== consumerFunctionSha256) {
    addViolation(violations, 'consumer-normalized-function-hash', semanticFacts.functionHash);
  }
  if (semanticFacts.literalHash !== consumerLiteralSha256) {
    addViolation(violations, 'consumer-normalized-literal-hash', semanticFacts.literalHash);
  }
  return violations;
}

function collectOwnerConsumers(entries) {
  return entries.flatMap(([file, source]) =>
    dependenciesForTarget(file, source, ownerTarget).map(dependency => ({
      file: relativePath(file),
      ...dependencyFacts(dependency),
      bindings: dependency.bindings.map(binding => ({
        importedName: binding.importedName,
        localName: binding.localName,
        exportedName: binding.exportedName,
      })),
    }))
  );
}

function inspectOwnerConsumerUniverse(entries) {
  const consumers = collectOwnerConsumers(entries);
  const violations = [];
  const expected = [
    {
      file: consumerRel,
      specifier: ownerSpecifier,
      kind: 'value',
      syntax: 'static-import',
      symbols: [ownerSymbol],
      bindings: [
        {
          importedName: ownerSymbol,
          localName: ownerSymbol,
          exportedName: null,
        },
      ],
    },
  ];
  if (stableJson(consumers) !== stableJson(expected)) {
    addViolation(violations, 'owner-consumer-inventory', consumers);
  }
  for (const [file, source] of entries) {
    const rel = relativePath(file);
    const analysis = analyzeSource(file, source);
    const expectedUnresolved = approvedUnresolvedDynamicImports[rel] ?? [];
    const actualUnresolved = analysis.unresolvedDynamicImports.map(entry => entry.expression);
    if (stableJson(actualUnresolved) !== stableJson(expectedUnresolved)) {
      addViolation(violations, 'universe-unresolved-dynamic-import', {
        file: rel,
        expressions: actualUnresolved,
      });
    }
    if (analysis.forbiddenModuleSyntax.length !== 0) {
      addViolation(violations, 'universe-forbidden-module-syntax', {
        file: rel,
        syntax: analysis.forbiddenModuleSyntax,
      });
    }
    if (rel === ownerRel || rel === consumerRel) continue;
    const sourceFile = createSourceFile(rel, source);
    walkAst(sourceFile, node => {
      if (
        (node?.type === 'Identifier' && node.name === ownerSymbol) ||
        (node?.type === 'Literal' && node.value === ownerSymbol)
      ) {
        addViolation(violations, 'owner-symbol-outside-inventory', rel);
      }
    });
    if (source.includes('wardrobe_sanitization_policy')) {
      addViolation(violations, 'owner-route-outside-inventory', rel);
    }
  }
  return violations;
}

function publicOwnerLeaks(source, rel) {
  const leaks = [];
  const sourceFile = createSourceFile(rel, source);
  walkAst(sourceFile, node => {
    if (
      (node?.type === 'Identifier' && node.name === ownerSymbol) ||
      (node?.type === 'Literal' &&
        typeof node.value === 'string' &&
        (node.value === ownerSymbol || node.value.includes('wardrobe_sanitization_policy')))
    ) {
      leaks.push({ type: node.type, value: node.name ?? node.value });
    }
  });
  return leaks;
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
const esmEntries = esmFiles.map(file => [file, fs.readFileSync(file, 'utf8')]);

test('Wardrobe Sanitization policy has the exact pure composition owner shape', () => {
  const ownerFiles = listSourceFiles(path.join(root, 'esm/shared/dimensions'))
    .map(relativePath)
    .filter(file => path.basename(file) === 'wardrobe_sanitization_policy.ts');
  assert.deepEqual(ownerFiles, [ownerRel]);
  assert.deepEqual(inspectOwner(read(ownerRel)), []);
});

test('Wardrobe Sanitization policy preserves runtime identities, values, key order, and nested freezes', () => {
  const loader = createTsRuntimeModuleLoader();
  const policy = loader.load(path.join(root, ownerRel))[ownerSymbol];
  const defaults = loader.load(path.join(root, defaultsRel));
  const limits = loader.load(path.join(root, limitsRel));
  const resolution = loader.load(path.join(root, resolutionRel));

  assert.deepEqual(Object.keys(policy), ['defaults', 'limits', 'resolveDepthCm', 'resolveDoorsCount']);
  assert.deepEqual(Object.keys(policy.defaults), ['widthCm', 'heightCm', 'chestDrawersCount']);
  assert.deepEqual(Object.keys(policy.limits), ['width', 'height', 'depth', 'doors', 'chestDrawers']);
  assert.deepEqual(Object.keys(policy.limits.width), ['minCm', 'chestMinCm', 'maxCm']);
  assert.deepEqual(Object.keys(policy.limits.height), ['minCm', 'chestMinCm', 'maxCm']);
  assert.deepEqual(Object.keys(policy.limits.depth), ['minCm', 'maxCm']);
  assert.deepEqual(Object.keys(policy.limits.doors), ['min', 'slidingMin', 'max']);
  assert.deepEqual(Object.keys(policy.limits.chestDrawers), ['min', 'max']);

  assert.deepEqual(JSON.parse(JSON.stringify(policy.defaults)), {
    widthCm: defaults.DEFAULT_WIDTH,
    heightCm: defaults.DEFAULT_HEIGHT,
    chestDrawersCount: defaults.DEFAULT_CHEST_DRAWERS_COUNT,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(policy.limits)), {
    width: {
      minCm: limits.WARDROBE_WIDTH_MIN,
      chestMinCm: limits.WARDROBE_CHEST_WIDTH_MIN,
      maxCm: limits.WARDROBE_WIDTH_MAX,
    },
    height: {
      minCm: limits.WARDROBE_HEIGHT_MIN,
      chestMinCm: limits.WARDROBE_CHEST_HEIGHT_MIN,
      maxCm: limits.WARDROBE_HEIGHT_MAX,
    },
    depth: {
      minCm: limits.WARDROBE_DEPTH_MIN,
      maxCm: limits.WARDROBE_DEPTH_MAX,
    },
    doors: {
      min: limits.WARDROBE_DOORS_MIN,
      slidingMin: limits.WARDROBE_SLIDING_DOORS_MIN,
      max: limits.WARDROBE_DOORS_MAX,
    },
    chestDrawers: {
      min: limits.WARDROBE_CHEST_DRAWERS_MIN,
      max: limits.WARDROBE_CHEST_DRAWERS_MAX,
    },
  });
  assert.equal(policy.resolveDepthCm, resolution.getDefaultDepthForWardrobeType);
  assert.equal(policy.resolveDoorsCount, resolution.getDefaultDoorsForWardrobeType);
  for (const value of [
    policy,
    policy.defaults,
    policy.limits,
    policy.limits.width,
    policy.limits.height,
    policy.limits.depth,
    policy.limits.doors,
    policy.limits.chestDrawers,
  ]) {
    assert.equal(Object.isFrozen(value), true);
  }
});

test('state sanitizer is the sole owner consumer and has no direct aggregate or focused-owner bypass', () => {
  assert.deepEqual(inspectOwnerConsumerUniverse(esmEntries), []);
  assert.deepEqual(inspectConsumer(read(consumerRel)), []);
  for (const publicRel of [runtimeApiRel]) {
    const source = read(publicRel);
    assert.deepEqual(publicOwnerLeaks(source, publicRel), [], publicRel);
    assert.equal(source.includes('wardrobe_sanitization_policy'), false, publicRel);
  }
});

test('normalized sanitizer AST and literal fingerprints preserve branches, precedence, formulas, writes, and order', () => {
  assert.deepEqual(consumerSemanticFacts(read(consumerRel)), {
    bodyHash: consumerSemanticSha256,
    functionHash: consumerFunctionSha256,
    literalHash: consumerLiteralSha256,
  });
});

test('owner mutation probes reject dependency drift, literals, wrappers, aggregates, export drift, and freeze drift', () => {
  const owner = read(ownerRel);
  assertRejected(
    inspectOwner,
    `${owner}\nimport './units.js';\n`,
    'owner-dependency-inventory',
    'side-effect dependency'
  );
  assertRejected(
    inspectOwner,
    owner.replace('getDefaultDepthForWardrobeType,', 'getDefaultDepthForWardrobeType as resolveDepth,'),
    'owner-import-alias',
    'import alias'
  );
  assertRejected(
    inspectOwner,
    owner.replace(
      `import {
  getDefaultDepthForWardrobeType,
  getDefaultDoorsForWardrobeType,
} from './wardrobe_default_resolution_policy.js';`,
      `import * as resolution from './wardrobe_default_resolution_policy.js';`
    ),
    'owner-dependency-inventory',
    'namespace import'
  );
  assertRejected(
    inspectOwner,
    `${owner}\nvoid import('./units.js');\n`,
    'owner-dependency-inventory',
    'dynamic import'
  );
  assertRejected(
    inspectOwner,
    owner.replace('widthCm: DEFAULT_WIDTH', 'widthCm: 160'),
    'owner.defaults-identity-projection',
    'conversion literal'
  );
  assertRejected(
    inspectOwner,
    owner.replace(
      'resolveDepthCm: getDefaultDepthForWardrobeType',
      'resolveDepthCm: value => getDefaultDepthForWardrobeType(value)'
    ),
    'owner-identity-projection',
    'resolver wrapper'
  );
  assertRejected(
    inspectOwner,
    owner.replace(
      `      min: WARDROBE_DOORS_MIN,
      slidingMin: WARDROBE_SLIDING_DOORS_MIN,`,
      `      slidingMin: WARDROBE_SLIDING_DOORS_MIN,
      min: WARDROBE_DOORS_MIN,`
    ),
    'owner.limits.doors-key-order',
    'door key order'
  );
  assertRejected(
    inspectOwner,
    owner.replace('  defaults: Object.freeze({', '  defaults: ({'),
    'owner.defaults-freeze',
    'nested freeze'
  );
  assertRejected(
    inspectOwner,
    `${owner}\nexport default ${ownerSymbol};\n`,
    'owner-top-level-topology',
    'default export'
  );
  assertRejected(
    inspectOwner,
    `${owner}\nexport type WardrobeSanitizationPolicy = typeof ${ownerSymbol};\n`,
    'owner-top-level-topology',
    'type export'
  );
  assertRejected(
    inspectOwner,
    owner.replace(
      `import { DEFAULT_CHEST_DRAWERS_COUNT, DEFAULT_HEIGHT, DEFAULT_WIDTH } from './wardrobe_defaults.js';`,
      `import { WARDROBE_DEFAULTS } from './wardrobe_defaults.js';`
    ),
    'owner-dependency-inventory',
    'defaults aggregate'
  );
  assertRejected(
    inspectOwner,
    owner.replace(
      `import {
  WARDROBE_CHEST_DRAWERS_MAX,`,
      `import {
  WARDROBE_LIMITS,
  WARDROBE_CHEST_DRAWERS_MAX,`
    ),
    'owner-dependency-inventory',
    'limits aggregate'
  );
});

test('behavior mutation probes reject fallback, clamp, skip, conversion, wrapper, sync, and operation-order drift', () => {
  const consumer = read(consumerRel);
  const semanticMutations = [
    [
      'resolver wrapper',
      consumer.replace(
        `${ownerSymbol}.resolveDepthCm(cfg.wardrobeType)`,
        `Number(${ownerSymbol}.resolveDepthCm(cfg.wardrobeType))`
      ),
    ],
    ['copied conversion literal', consumer.replace(`${ownerSymbol}.defaults.widthCm`, '160')],
    [
      'UI wrapper constant',
      consumer
        .replace(
          `type SanitizedDims = {`,
          `const SANITIZER_DEFAULT_WIDTH = ${ownerSymbol}.defaults.widthCm;\n\ntype SanitizedDims = {`
        )
        .replace(`${ownerSymbol}.defaults.widthCm`, 'SANITIZER_DEFAULT_WIDTH'),
    ],
    ['raw/UI door precedence', consumer.replace("raw['doors'] != null", "raw['doors'] || false")],
    ['chest drawer zero fallback', consumer.replace('rawChestDrawers ||', 'rawChestDrawers ??')],
    ['force-build bypass', consumer.replace('if (!forceBuild) {', 'if (forceBuild) {')],
    [
      'no-main branch',
      consumer.replace('!isChestMode && !isSliding && rawDoors === 0', '!isChestMode && rawDoors === 0'),
    ],
    ['width lower clamp', consumer.replace('Math.max(minWLimit,', 'Math.max(0,')],
    [
      'sliding doors minimum',
      consumer.replace(`${ownerSymbol}.limits.doors.slidingMin`, `${ownerSymbol}.limits.doors.min`),
    ],
    ['meter conversion', consumer.replaceAll('/ 100', '/ 10')],
    [
      'buildUi write order',
      consumer.replace(
        `    B.buildUi.width = widthCm;
    B.buildUi.height = heightCm;`,
        `    B.buildUi.height = heightCm;
    B.buildUi.width = widthCm;`
      ),
    ],
    [
      'runtime sync removed',
      consumer.replace(
        "    syncDimensionRuntimePatch(App, patch, meta, { activeId: forceBuild ? '' : activeId });",
        '    void patch;\n    void meta;'
      ),
    ],
  ];
  for (const [label, mutated] of semanticMutations) {
    assertRejected(inspectConsumer, mutated, 'consumer-normalized-semantic-hash', label);
  }
});
