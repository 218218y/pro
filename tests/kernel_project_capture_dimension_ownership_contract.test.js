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
const ownerRel = 'esm/shared/dimensions/project_capture_dimension_policy.ts';
const consumerRel = 'esm/native/kernel/kernel_project_capture_payload.ts';
const defaultsRel = 'esm/shared/dimensions/wardrobe_defaults.ts';
const thicknessRel = 'esm/shared/dimensions/door_mount_thickness_policy.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const runtimeApiRel = 'esm/native/runtime/api.ts';
const baselineRel = 'tools/wp_layer_baseline.json';
const ownerSymbol = 'PROJECT_CAPTURE_DIMENSION_POLICY';
const ownerSpecifier = '../../shared/dimensions/project_capture_dimension_policy.js';
const consumerBodySha256 = 'b4b5f860ba20101e8e36d6f46602229f7f7f055378b3428bf77adaca5f85a89c';
const persistedDoorsSha256 = 'd0b63e533964a4559b69d2224217dfc4f9b9c098714256503bdf9502d88f2fa3';
const buildPayloadSha256 = '369aca88642d39779075ac6866986f488b911d84bf09773989eb27dbad7d0ff1';
const returnObjectSha256 = '7b38c82b28a1de4b29c7b189a2d1898a4c50e1183547ffee5e349edbdcea28d7';
const consumerLiteralSha256 = '517c74b64ba1bc22310d01455d22f9225df5f2e4dae5078fed001c30d605ee31';
const prefix166Sha256 = 'f58543ffaf2860f846f7469e93ab442adf0ee3fc5ae391fd904af3f64167c111';

const expectedOwnerDependencies = Object.freeze([
  Object.freeze({
    specifier: './door_mount_thickness_policy.js',
    kind: 'value',
    syntax: 'static-import',
    symbols: Object.freeze(['normalizeDoorMountThicknessCm']),
  }),
  Object.freeze({
    specifier: './wardrobe_defaults.js',
    kind: 'value',
    syntax: 'static-import',
    symbols: Object.freeze(['DEFAULT_HINGED_DOORS']),
  }),
]);
const expectedOwnerProperties = Object.freeze([
  Object.freeze({
    key: 'defaultHingedDoorsCount',
    value: 'DEFAULT_HINGED_DOORS',
    shorthand: false,
  }),
  Object.freeze({
    key: 'normalizeDoorMountThicknessCm',
    value: 'normalizeDoorMountThicknessCm',
    shorthand: true,
  }),
]);
const expectedConsumerReferenceCounts = Object.freeze({
  defaultHingedDoorsCount: 1,
  normalizeDoorMountThicknessCm: 4,
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
    approvedHistory.filter(entry => entry.fromFile === consumerRel),
    []
  );
}

function appendSyntheticFutureEntry167(migrationBudgets) {
  const futureEntry = structuredClone(migrationBudgets[165]);
  futureEntry.owner = 'synthetic-append-safe-proof';
  futureEntry.fromFile = consumerRel;
  futureEntry.reason = 'Synthetic Entry 167 proves the historical Project Capture contract is append-safe.';
  futureEntry.removalCondition = 'Remove the synthetic Entry 167 after the append-safe proof.';
  return [...structuredClone(migrationBudgets.slice(0, 166)), futureEntry];
}

function analyzeSource(file, source) {
  const key = `${path.normalize(file).toLowerCase()}\0${sha256(source)}`;
  if (!analysisCache.has(key)) {
    analysisCache.set(key, analyzeModuleDependencies(file, source));
  }
  return analysisCache.get(key);
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
const thicknessTarget = canonicalTarget(path.join(root, thicknessRel));
const facadeTarget = canonicalTarget(path.join(root, facadeRel));
const publicDimensionsTarget = canonicalTarget(path.join(root, publicDimensionsRel));
const runtimeApiTarget = canonicalTarget(path.join(root, runtimeApiRel));
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

function inspectOwner(source) {
  const violations = [];
  const file = path.join(root, ownerRel);
  const analysis = analyzeSource(file, source);
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

  const sourceFile = createSourceFile(ownerRel, source);
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

  const objectExpression = frozenObject(declaration?.declarator.init);
  if (!objectExpression) addViolation(violations, 'owner-freeze');
  const properties = objectExpression?.properties ?? [];
  const facts = properties.map(property => ({
    type: property?.type ?? null,
    computed: property?.computed ?? false,
    method: property?.method ?? false,
    shorthand: property?.shorthand ?? false,
    key: identifierName(property?.key),
    value: identifierName(property?.value),
  }));
  const expectedFacts = expectedOwnerProperties.map(property => ({
    type: 'Property',
    computed: false,
    method: false,
    shorthand: false,
    ...property,
  }));
  if (stableJson(facts) !== stableJson(expectedFacts)) {
    addViolation(violations, 'owner-property-shape', facts);
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
  if (freezeCalls !== 1 || objectExpressions !== 1) {
    addViolation(violations, 'owner-freeze-count', { freezeCalls, objectExpressions });
  }
  if (unsupported) addViolation(violations, 'owner-wrapper-spread-or-side-effect');
  if (/\bWARDROBE_DEFAULTS\b/u.test(source)) addViolation(violations, 'owner-defaults-aggregate');
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
  return source
    .replaceAll(`${ownerSymbol}.defaultHingedDoorsCount`, 'DEFAULT_HINGED_DOORS')
    .replaceAll(`${ownerSymbol}.normalizeDoorMountThicknessCm`, 'normalizeDoorMountThicknessCm');
}

function findFunction(sourceFile, name) {
  let result = null;
  walkAst(sourceFile, node => {
    if (!result && node?.type === 'FunctionDeclaration' && identifierName(node.id) === name) {
      result = node;
    }
  });
  return result;
}

function consumerSemanticFacts(source) {
  const sourceFile = createSourceFile(consumerRel, normalizedConsumerSource(source));
  const body = (sourceFile.body ?? []).filter(statement => statement.type !== 'ImportDeclaration');
  const persistedDoors = findFunction(sourceFile, 'resolvePersistedProjectDoors');
  const buildPayload = findFunction(sourceFile, 'buildKernelProjectCaptureData');
  let returnObject = null;
  if (buildPayload) {
    walkAst(buildPayload, node => {
      if (!returnObject && node?.type === 'ReturnStatement' && node.argument?.type === 'ObjectExpression') {
        returnObject = node.argument;
      }
    });
  }
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
    persistedDoorsHash: persistedDoors ? semanticHash(persistedDoors) : null,
    buildPayloadHash: buildPayload ? semanticHash(buildPayload) : null,
    returnObjectHash: returnObject ? semanticHash(returnObject) : null,
    literalHash: sha256(stableJson(literals)),
  };
}

function dependenciesForTarget(file, source, target) {
  return analyzeSource(file, source).imports.filter(
    dependency => resolveModuleTarget(file, dependency.specifier) === target
  );
}

function normalizeTypeAnnotation(source, node) {
  if (!node) return null;
  return source.slice(node.start, node.end).replace(/^:\s*/u, '').replace(/\s+/gu, ' ').trim();
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
    thicknessTarget,
    facadeTarget,
    publicDimensionsTarget,
    runtimeApiTarget,
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

  const exports = collectNamedModuleExports(consumerRel, source).map(entry => ({
    exportedName: entry.exportedName,
    kind: entry.kind,
    localName: entry.localName,
    source: entry.source,
  }));
  if (
    stableJson(exports) !==
    stableJson([
      {
        exportedName: 'BuildKernelProjectCaptureDataArgs',
        kind: 'type',
        localName: 'BuildKernelProjectCaptureDataArgs',
        source: null,
      },
      {
        exportedName: 'buildKernelProjectCaptureData',
        kind: 'value',
        localName: 'buildKernelProjectCaptureData',
        source: null,
      },
    ])
  ) {
    addViolation(violations, 'consumer-export-inventory', exports);
  }
  const argsInterface = (sourceFile.body ?? [])
    .map(statement => (statement?.type === 'ExportNamedDeclaration' ? statement.declaration : statement))
    .find(
      declaration =>
        declaration?.type === 'TSInterfaceDeclaration' &&
        identifierName(declaration.id) === 'BuildKernelProjectCaptureDataArgs'
    );
  const interfaceFacts = (argsInterface?.body?.body ?? []).map(property => ({
    key: identifierName(property.key),
    optional: Boolean(property.optional),
    type: normalizeTypeAnnotation(source, property.typeAnnotation),
  }));
  if (
    stableJson(interfaceFacts) !==
    stableJson([
      { key: 'uiRec', optional: false, type: 'UnknownRecord' },
      { key: 'rawAny', optional: false, type: 'UnknownRecord' },
      { key: 'cfgRec', optional: false, type: 'UnknownRecord' },
      { key: 'savedNotes', optional: false, type: 'unknown' },
    ])
  ) {
    addViolation(violations, 'consumer-args-declaration', interfaceFacts);
  }
  const buildFunction = findFunction(sourceFile, 'buildKernelProjectCaptureData');
  if (
    buildFunction?.parent?.type !== 'ExportNamedDeclaration' ||
    buildFunction.params?.length !== 1 ||
    identifierName(buildFunction.params[0]) !== 'args' ||
    normalizeTypeAnnotation(source, buildFunction.params[0]?.typeAnnotation) !==
      'BuildKernelProjectCaptureDataArgs' ||
    normalizeTypeAnnotation(source, buildFunction.returnType) !== 'UnknownRecord'
  ) {
    addViolation(violations, 'consumer-build-declaration');
  }

  const semanticFacts = consumerSemanticFacts(source);
  const expectedSemanticFacts = {
    bodyHash: consumerBodySha256,
    persistedDoorsHash: persistedDoorsSha256,
    buildPayloadHash: buildPayloadSha256,
    returnObjectHash: returnObjectSha256,
    literalHash: consumerLiteralSha256,
  };
  if (stableJson(semanticFacts) !== stableJson(expectedSemanticFacts)) {
    addViolation(violations, 'consumer-normalized-semantic-fingerprint', semanticFacts);
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
  const violations = [];
  const consumers = collectOwnerConsumers(entries);
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
    if (source.includes('project_capture_dimension_policy')) {
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
        (node.value === ownerSymbol || node.value.includes('project_capture_dimension_policy')))
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

test('Project Capture dimension policy has the exact pure composition owner shape', () => {
  const ownerFiles = listSourceFiles(path.join(root, 'esm/shared/dimensions'))
    .map(relativePath)
    .filter(file => path.basename(file) === 'project_capture_dimension_policy.ts');
  assert.deepEqual(ownerFiles, [ownerRel]);
  assert.deepEqual(inspectOwner(read(ownerRel)), []);
});

test('Project Capture dimension policy preserves scalar value, function identity, key order, and freeze', () => {
  const loader = createTsRuntimeModuleLoader();
  const policy = loader.load(path.join(root, ownerRel))[ownerSymbol];
  const defaults = loader.load(path.join(root, defaultsRel));
  const thickness = loader.load(path.join(root, thicknessRel));

  assert.deepEqual(Object.keys(policy), ['defaultHingedDoorsCount', 'normalizeDoorMountThicknessCm']);
  assert.equal(policy.defaultHingedDoorsCount, defaults.DEFAULT_HINGED_DOORS);
  assert.equal(policy.defaultHingedDoorsCount, 4);
  assert.equal(policy.normalizeDoorMountThicknessCm, thickness.normalizeDoorMountThicknessCm);
  assert.equal(Object.isFrozen(policy), true);
  assert.equal(policy.normalizeDoorMountThicknessCm(null), null);
  assert.equal(policy.normalizeDoorMountThicknessCm(''), null);
  assert.equal(policy.normalizeDoorMountThicknessCm('bad'), null);
  assert.equal(policy.normalizeDoorMountThicknessCm(0.39), 0.4);
  assert.equal(policy.normalizeDoorMountThicknessCm(1.85), 1.9);
  assert.equal(policy.normalizeDoorMountThicknessCm(8.1), 8);
});

test('Kernel capture is the sole policy consumer and has no facade, direct-owner, or public route', () => {
  assert.deepEqual(inspectOwnerConsumerUniverse(esmEntries), []);
  assert.deepEqual(inspectConsumer(read(consumerRel)), []);
  for (const publicRel of [facadeRel, publicDimensionsRel, runtimeApiRel]) {
    const source = read(publicRel);
    assert.deepEqual(publicOwnerLeaks(source, publicRel), [], publicRel);
    assert.equal(source.includes('project_capture_dimension_policy'), false, publicRel);
  }
});

test('normalized capture AST fingerprints preserve fallback, payload shape, normalization order, and literals', () => {
  assert.deepEqual(consumerSemanticFacts(read(consumerRel)), {
    bodyHash: consumerBodySha256,
    persistedDoorsHash: persistedDoorsSha256,
    buildPayloadHash: buildPayloadSha256,
    returnObjectHash: returnObjectSha256,
    literalHash: consumerLiteralSha256,
  });
});

test('statement-neutral migration preserves Prefix 166 without owning the current Ledger tail', () => {
  const baseline = JSON.parse(read(baselineRel));
  assertStatementNeutralLedgerHistory(baseline.migrationBudgets);

  const withFutureEntry167 = appendSyntheticFutureEntry167(baseline.migrationBudgets);
  assert.equal(withFutureEntry167.length, 167);
  assert.doesNotThrow(() => assertStatementNeutralLedgerHistory(withFutureEntry167));
});

test('owner mutation probes reject dependencies, aliases, aggregates, literals, wrappers, order, freeze, and exports', () => {
  const owner = read(ownerRel);
  assertRejected(
    inspectOwner,
    `${owner}\nimport './units.js';\n`,
    'owner-dependency-inventory',
    'side-effect dependency'
  );
  assertRejected(
    inspectOwner,
    owner.replace('normalizeDoorMountThicknessCm }', 'normalizeDoorMountThicknessCm as normalizeThickness }'),
    'owner-import-alias',
    'normalizer alias'
  );
  assertRejected(
    inspectOwner,
    owner.replace(
      `import { normalizeDoorMountThicknessCm } from './door_mount_thickness_policy.js';`,
      `import * as doorMount from './door_mount_thickness_policy.js';`
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
    owner.replace("'./wardrobe_defaults.js'", "'../wardrobe_dimension_tokens_shared.js'"),
    'owner-dependency-inventory',
    'facade back-edge'
  );
  assertRejected(
    inspectOwner,
    owner.replace('import { DEFAULT_HINGED_DOORS }', 'import { WARDROBE_DEFAULTS }'),
    'owner-dependency-inventory',
    'defaults aggregate'
  );
  assertRejected(
    inspectOwner,
    owner.replace('defaultHingedDoorsCount: DEFAULT_HINGED_DOORS', 'defaultHingedDoorsCount: 4'),
    'owner-property-shape',
    'copied default literal'
  );
  assertRejected(
    inspectOwner,
    owner.replace(
      'normalizeDoorMountThicknessCm,',
      'normalizeDoorMountThicknessCm: value => normalizeDoorMountThicknessCm(value),'
    ),
    'owner-property-shape',
    'normalizer wrapper'
  );
  assertRejected(
    inspectOwner,
    owner.replace(
      `  defaultHingedDoorsCount: DEFAULT_HINGED_DOORS,
  normalizeDoorMountThicknessCm,`,
      `  normalizeDoorMountThicknessCm,
  defaultHingedDoorsCount: DEFAULT_HINGED_DOORS,`
    ),
    'owner-property-shape',
    'property order'
  );
  assertRejected(inspectOwner, owner.replace('Object.freeze({', '({'), 'owner-freeze', 'freeze removal');
  assertRejected(
    inspectOwner,
    `${owner}\nexport default ${ownerSymbol};\n`,
    'owner-top-level-topology',
    'default export'
  );
  assertRejected(
    inspectOwner,
    `${owner}\nexport type ProjectCaptureDimensionPolicy = typeof ${ownerSymbol};\n`,
    'owner-top-level-topology',
    'type export'
  );
});

test('consumer mutation probes reject compatibility routes, direct owners, aliases, dynamic imports, and bridges', () => {
  const consumer = read(consumerRel);
  const policyImport = `import { ${ownerSymbol} } from '${ownerSpecifier}';`;
  assert.match(consumer, new RegExp(policyImport.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));

  for (const [label, specifier] of [
    ['facade', '../../shared/wardrobe_dimension_tokens_shared.js'],
    ['extensionless facade', '../../shared/wardrobe_dimension_tokens_shared'],
    ['query/hash facade', '../../shared/wardrobe_dimension_tokens_shared.js?capture=1#compat'],
    ['public directory index', '../features/dimensions'],
    ['runtime API', '../runtime/api.js'],
  ]) {
    assertRejected(
      inspectConsumer,
      consumer.replace(ownerSpecifier, specifier),
      'consumer-owner-import',
      label
    );
  }
  assertRejected(
    inspectConsumer,
    consumer.replace(
      policyImport,
      `import { ${ownerSymbol} as CAPTURE_DIMENSIONS } from '${ownerSpecifier}';`
    ),
    'consumer-owner-alias',
    'policy alias'
  );
  assertRejected(
    inspectConsumer,
    consumer.replace(policyImport, `import * as captureDimensions from '${ownerSpecifier}';`),
    'consumer-owner-import',
    'namespace import'
  );
  assertRejected(
    inspectConsumer,
    consumer.replace(policyImport, `const captureDimensions = import('${ownerSpecifier}');`),
    'consumer-owner-import',
    'dynamic import'
  );
  assertRejected(
    inspectConsumer,
    consumer.replace(policyImport, `import '${ownerSpecifier}';`),
    'consumer-owner-import',
    'side-effect import'
  );
  assertRejected(
    inspectConsumer,
    `${consumer}\nimport { DEFAULT_HINGED_DOORS } from '../../shared/dimensions/wardrobe_defaults.js';\n`,
    'consumer-shared-import-inventory',
    'direct defaults owner'
  );
  assertRejected(
    inspectConsumer,
    `${consumer}\nimport { normalizeDoorMountThicknessCm } from '../../shared/dimensions/door_mount_thickness_policy.js';\n`,
    'consumer-forbidden-dimension-dependency',
    'direct thickness owner'
  );
  assertRejected(
    inspectConsumer,
    consumer.replace(`${ownerSymbol}.defaultHingedDoorsCount`, `${ownerSymbol}['defaultHingedDoorsCount']`),
    'consumer-computed-owner-access',
    'computed access'
  );
  assertRejected(
    inspectConsumer,
    `${consumer}\nexport const CAPTURE_DIMENSION_COPY = { ...${ownerSymbol} };\n`,
    'consumer-owner-reference-escape',
    'object copy'
  );
  assertRejected(
    inspectConsumer,
    `${consumer}\nexport const { defaultHingedDoorsCount } = ${ownerSymbol};\n`,
    'consumer-owner-reference-escape',
    'destructuring bridge'
  );

  const bridgeEntries = [
    ...esmEntries,
    [
      path.join(root, 'esm/native/features/project_capture_dimension_bridge.ts'),
      `export { ${ownerSymbol} } from '../../shared/dimensions/project_capture_dimension_policy';`,
    ],
  ];
  assertRejected(
    inspectOwnerConsumerUniverse,
    bridgeEntries,
    'owner-consumer-inventory',
    'feature re-export bridge'
  );

  const splitDynamicEntries = [
    ...esmEntries,
    [
      path.join(root, 'esm/native/features/project_capture_dimension_dynamic_bridge.ts'),
      `const route =
  '../../shared/dimensions/' + 'project_capture_' + 'dimension_policy.js';
const symbol = 'PROJECT_CAPTURE_' + 'DIMENSION_POLICY';
export const policy = import(route).then(module => module[symbol]);`,
    ],
  ];
  assertRejected(
    inspectOwnerConsumerUniverse,
    splitDynamicEntries,
    'universe-unresolved-dynamic-import',
    'split-string dynamic bridge'
  );

  const splitRequireEntries = [
    ...esmEntries,
    [
      path.join(root, 'esm/native/features/project_capture_dimension_require_bridge.ts'),
      `const route =
  '../../shared/dimensions/' + 'project_capture_' + 'dimension_policy.js';
export const policy = require(route);`,
    ],
  ];
  assertRejected(
    inspectOwnerConsumerUniverse,
    splitRequireEntries,
    'universe-forbidden-module-syntax',
    'split-string require bridge'
  );
});

test('payload mutation probes reject fallback, normalization, placement, serialization, declaration, and order drift', () => {
  const consumer = read(consumerRel);
  const mutations = [
    [
      'non-chest passthrough',
      consumer.replace(
        'if (uiRec.isChestMode !== true) return overallDoors;',
        'if (uiRec.isChestMode === true) return overallDoors;'
      ),
    ],
    ['positive minimum', consumer.replace('value < 1', 'value <= 1')],
    ['integer floor', consumer.replace('return Math.floor(value);', 'return Math.round(value);')],
    [
      'door precedence',
      consumer.replace(
        `  const preChestDoors = readPositiveInteger(preChest?.doors);
  if (preChestDoors != null) return preChestDoors;

  const directDoors = readPositiveInteger(overallDoors);`,
        `  const directDoors = readPositiveInteger(overallDoors);
  if (directDoors != null) return directDoors;

  const preChestDoors = readPositiveInteger(preChest?.doors);`
      ),
    ],
    ['copied fallback literal', consumer.replace(`${ownerSymbol}.defaultHingedDoorsCount`, '4')],
    [
      'type-dependent fallback',
      consumer.replace(
        `${ownerSymbol}.defaultHingedDoorsCount`,
        `cfgRec.wardrobeType === 'sliding' ? 2 : ${ownerSymbol}.defaultHingedDoorsCount`
      ),
    ],
    [
      'normalizer wrapper',
      consumer.replace(
        `${ownerSymbol}.normalizeDoorMountThicknessCm(
      canonicalCfg.overlayFrameThicknessCm
    )`,
        `Number(${ownerSymbol}.normalizeDoorMountThicknessCm(
      canonicalCfg.overlayFrameThicknessCm
    ))`
      ),
    ],
    [
      'raw config normalization',
      consumer.replace('canonicalCfg.overlayFrameThicknessCm', 'cfgRec.overlayFrameThicknessCm'),
    ],
    [
      'thickness order',
      consumer.replace(
        `    overlayFrameThicknessCm: ${ownerSymbol}.normalizeDoorMountThicknessCm(
      canonicalCfg.overlayFrameThicknessCm
    ),
    overlayShelfThicknessCm: ${ownerSymbol}.normalizeDoorMountThicknessCm(
      canonicalCfg.overlayShelfThicknessCm
    ),`,
        `    overlayShelfThicknessCm: ${ownerSymbol}.normalizeDoorMountThicknessCm(
      canonicalCfg.overlayShelfThicknessCm
    ),
    overlayFrameThicknessCm: ${ownerSymbol}.normalizeDoorMountThicknessCm(
      canonicalCfg.overlayFrameThicknessCm
    ),`
      ),
    ],
    [
      'return key order',
      consumer.replace(
        `    settings: buildProjectCaptureSettings(`,
        `    projectName: asString(uiRec.projectName, ''),\n    settings: buildProjectCaptureSettings(`
      ),
    ],
    [
      'settings nesting',
      consumer.replace(
        `    overlayFrameThicknessCm: ${ownerSymbol}.normalizeDoorMountThicknessCm(`,
        `    settingsOverlayFrameThicknessCm: ${ownerSymbol}.normalizeDoorMountThicknessCm(`
      ),
    ],
    [
      'clone source',
      consumer.replace('cloneProjectCaptureValue(savedNotes, [])', 'cloneProjectCaptureValue([], [])'),
    ],
    [
      'export declaration',
      consumer.replace(
        'export function buildKernelProjectCaptureData',
        'function buildKernelProjectCaptureData'
      ),
    ],
    ['return declaration', consumer.replace('): UnknownRecord {', '): Record<string, unknown> {')],
  ];
  for (const [label, mutated] of mutations) {
    assert.notEqual(mutated, consumer, `${label} fixture must mutate source`);
    assertRejected(inspectConsumer, mutated, 'consumer-normalized-semantic-fingerprint', label);
  }
});
