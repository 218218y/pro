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
const ownerSymbol = 'PROJECT_CAPTURE_DIMENSION_POLICY';
const ownerSpecifier = '../../shared/dimensions/project_capture_dimension_policy.js';
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

function findFunction(sourceFile, name) {
  let result = null;
  walkAst(sourceFile, node => {
    if (!result && node?.type === 'FunctionDeclaration' && identifierName(node.id) === name) {
      result = node;
    }
  });
  return result;
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

  return violations;
}

function assertRejected(inspect, source, expectedKind, label) {
  const violations = inspect(source);
  assert.equal(
    violations.some(violation => violation.kind === expectedKind),
    true,
    `${label}: ${JSON.stringify(violations)}`
  );
}

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

test('Project Capture payload consumer stays on the canonical owner surface and declaration contract', () => {
  assert.deepEqual(inspectConsumer(read(consumerRel)), []);
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

test('payload topology mutation probes reject owner routing, aliases, exports, and declaration drift', () => {
  const consumer = read(consumerRel);
  const mutations = [
    [
      'owner route',
      consumer.replace(ownerSpecifier, '../../shared/wardrobe_dimension_tokens_shared.js'),
      'consumer-owner-import',
    ],
    [
      'owner alias',
      consumer.replace(
        `import { ${ownerSymbol} } from '${ownerSpecifier}';`,
        `import { ${ownerSymbol} as capturePolicy } from '${ownerSpecifier}';`
      ),
      'consumer-owner-alias',
    ],
    [
      'computed owner access',
      consumer.replace(`${ownerSymbol}.defaultHingedDoorsCount`, `${ownerSymbol}['defaultHingedDoorsCount']`),
      'consumer-computed-owner-access',
    ],
    [
      'export declaration',
      consumer.replace(
        'export function buildKernelProjectCaptureData',
        'function buildKernelProjectCaptureData'
      ),
      'consumer-export-inventory',
    ],
    [
      'return declaration',
      consumer.replace(
        'export function buildKernelProjectCaptureData(args: BuildKernelProjectCaptureDataArgs): UnknownRecord {',
        'export function buildKernelProjectCaptureData(args: BuildKernelProjectCaptureDataArgs): Record<string, unknown> {'
      ),
      'consumer-build-declaration',
    ],
  ];
  for (const [label, mutated, expectedKind] of mutations) {
    assert.notEqual(mutated, consumer, `${label} fixture must mutate source`);
    assertRejected(inspectConsumer, mutated, expectedKind, label);
  }
});
