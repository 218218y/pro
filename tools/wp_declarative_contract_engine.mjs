import fs from 'node:fs';
import path from 'node:path';

import { createSourceFile, walkAst } from './wp_ast_adapter.mjs';
import { analyzeModuleDependencies, collectNamedModuleExports } from './wp_layer_contract_support.mjs';

const SOURCE_EXTENSION_RE = /\.(?:[cm]?[jt]sx?)$/u;
const RUNTIME_EXTENSION_RE = /\.(?:[cm]?js)$/u;

function toPosix(value) {
  return String(value || '').replaceAll('\\', '/');
}

function sorted(values) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
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

function sameSemanticValue(left, right) {
  return stableJson(left) === stableJson(right);
}

function addViolation(violations, contractId, surface, kind, detail) {
  violations.push({
    contractId,
    surface,
    kind,
    ...(detail === undefined ? {} : { detail }),
  });
}

function stripQueryHash(specifier) {
  const value = String(specifier || '');
  const query = value.indexOf('?');
  const hash = value.indexOf('#');
  const cut = query === -1 ? hash : hash === -1 ? query : Math.min(query, hash);
  return cut === -1 ? value : value.slice(0, cut);
}

function sourceStem(value) {
  return toPosix(value).replace(SOURCE_EXTENSION_RE, '');
}

function runtimeStem(value) {
  return toPosix(value).replace(RUNTIME_EXTENSION_RE, '');
}

export function projectModuleStem(fromRel, specifier) {
  const clean = stripQueryHash(specifier);
  if (!clean) return null;
  const from = toPosix(fromRel);
  const resolved = clean.startsWith('@/')
    ? `esm/${clean.slice(2)}`
    : clean.startsWith('.')
      ? path.posix.join(path.posix.dirname(from), clean)
      : null;
  return resolved === null ? null : runtimeStem(path.posix.normalize(resolved));
}

export function runtimeModuleSpecifier(fromRel, toRel) {
  const from = toPosix(fromRel);
  const to = toPosix(toRel);
  let relative = path.posix.relative(path.posix.dirname(from), to).replace(SOURCE_EXTENSION_RE, '.js');
  if (!relative.startsWith('.')) relative = `./${relative}`;
  return relative;
}

function readProjectSource(projectRoot, rel) {
  return fs.readFileSync(path.join(projectRoot, rel), 'utf8');
}

function normalizeSourceFact(source, symbol) {
  return {
    source,
    localName: symbol,
    exportedName: symbol,
    kind: 'value',
  };
}

function normalizeActualExportFact(entry) {
  return {
    source: entry.source,
    localName: entry.localName,
    exportedName: entry.exportedName,
    kind: entry.kind,
  };
}

function compareFacts(left, right) {
  return stableJson(left).localeCompare(stableJson(right));
}

function parseDiagnosticsFor(rel, source) {
  const sourceFile = createSourceFile(rel, source, { label: 'declarative_contract_engine' });
  return {
    sourceFile,
    diagnostics: (sourceFile.parseDiagnostics || []).map(diagnostic => ({
      code: diagnostic.code,
      message: String(diagnostic.messageText || 'Parse error'),
    })),
  };
}

export function validateIdentityCompositionContractDefinition(contract) {
  const violations = [];
  const id = String(contract?.id || '<missing-id>');
  const requiredPaths = ['consumer', 'owner'];
  for (const key of requiredPaths) {
    if (typeof contract?.[key] !== 'string' || !contract[key]) {
      addViolation(violations, id, 'manifest', 'missing-path', key);
    }
  }
  if (!Array.isArray(contract?.symbols) || contract.symbols.length === 0) {
    addViolation(violations, id, 'manifest', 'missing-symbols');
  }
  if (!Array.isArray(contract?.sources) || contract.sources.length === 0) {
    addViolation(violations, id, 'manifest', 'missing-sources');
  }
  if (violations.length) return violations;

  const symbols = contract.symbols.map(String);
  if (new Set(symbols).size !== symbols.length) {
    addViolation(violations, id, 'manifest', 'duplicate-symbols', symbols);
  }

  const sourceSymbols = [];
  const sourceFiles = [];
  for (const source of contract.sources) {
    if (typeof source?.file !== 'string' || !source.file) {
      addViolation(violations, id, 'manifest', 'missing-source-file', source);
      continue;
    }
    sourceFiles.push(source.file);
    if (!Array.isArray(source.symbols) || source.symbols.length === 0) {
      addViolation(violations, id, 'manifest', 'missing-source-symbols', source.file);
      continue;
    }
    sourceSymbols.push(...source.symbols.map(String));
  }
  if (new Set(sourceFiles).size !== sourceFiles.length) {
    addViolation(violations, id, 'manifest', 'duplicate-source-files', sourceFiles);
  }
  if (new Set(sourceSymbols).size !== sourceSymbols.length) {
    addViolation(violations, id, 'manifest', 'duplicate-source-provenance', sourceSymbols);
  }
  if (!sameSemanticValue(sorted(sourceSymbols), sorted(symbols))) {
    addViolation(violations, id, 'manifest', 'source-symbol-union', {
      expected: sorted(symbols),
      actual: sorted(sourceSymbols),
    });
  }

  const ownerRoot = path.posix.dirname(toPosix(contract.owner));
  for (const source of contract.sources) {
    if (!source?.file) continue;
    if (path.posix.dirname(toPosix(source.file)) !== ownerRoot) {
      addViolation(violations, id, 'manifest', 'source-outside-owner-root', source.file);
    }
  }
  return violations;
}

export function inspectIdentityCompositionContract(contract, options = {}) {
  const manifestViolations = validateIdentityCompositionContractDefinition(contract);
  if (manifestViolations.length) return manifestViolations;

  const projectRoot = options.projectRoot || process.cwd();
  const readSource = options.readSource || (rel => readProjectSource(projectRoot, rel));
  const violations = [];
  const id = contract.id;
  const ownerRootStem = sourceStem(path.posix.dirname(toPosix(contract.owner)));
  const ownerStem = sourceStem(contract.owner);

  let consumerSource;
  let ownerSource;
  try {
    consumerSource = readSource(contract.consumer);
  } catch (error) {
    addViolation(violations, id, 'consumer', 'read-failed', error?.message || String(error));
    return violations;
  }
  try {
    ownerSource = readSource(contract.owner);
  } catch (error) {
    addViolation(violations, id, 'owner', 'read-failed', error?.message || String(error));
    return violations;
  }

  const consumerParse = parseDiagnosticsFor(contract.consumer, consumerSource);
  if (consumerParse.diagnostics.length) {
    addViolation(violations, id, 'consumer', 'parse-errors', consumerParse.diagnostics);
  }
  const ownerParse = parseDiagnosticsFor(contract.owner, ownerSource);
  if (ownerParse.diagnostics.length) {
    addViolation(violations, id, 'owner', 'parse-errors', ownerParse.diagnostics);
  }

  const consumerAnalysis = analyzeModuleDependencies(contract.consumer, consumerSource);
  const focusedDependencies = consumerAnalysis.imports.filter(dependency => {
    const stem = projectModuleStem(contract.consumer, dependency.specifier);
    return stem === ownerRootStem || stem?.startsWith(`${ownerRootStem}/`);
  });
  const wrongOwners = focusedDependencies.filter(
    dependency => projectModuleStem(contract.consumer, dependency.specifier) !== ownerStem
  );
  if (wrongOwners.length) {
    addViolation(
      violations,
      id,
      'consumer',
      'bypasses-composition-owner',
      wrongOwners.map(dependency => dependency.specifier)
    );
  }

  const ownerDependencies = focusedDependencies.filter(
    dependency => projectModuleStem(contract.consumer, dependency.specifier) === ownerStem
  );
  if (ownerDependencies.length === 0) {
    addViolation(violations, id, 'consumer', 'missing-composition-owner-import');
  }
  if (
    ownerDependencies.some(dependency => dependency.kind !== 'value' || dependency.syntax !== 'static-import')
  ) {
    addViolation(
      violations,
      id,
      'consumer',
      'non-static-owner-import',
      ownerDependencies.map(dependency => ({ kind: dependency.kind, syntax: dependency.syntax }))
    );
  }

  const actualConsumerSymbols = ownerDependencies.flatMap(dependency => dependency.importedSymbols);
  if (!sameSemanticValue(sorted(actualConsumerSymbols), sorted(contract.symbols))) {
    addViolation(violations, id, 'consumer', 'symbol-surface', {
      expected: sorted(contract.symbols),
      actual: sorted(actualConsumerSymbols),
    });
  }
  const aliasedBindings = ownerDependencies
    .flatMap(dependency => dependency.bindings)
    .filter(binding => binding.importedName !== binding.localName);
  if (aliasedBindings.length) {
    addViolation(violations, id, 'consumer', 'aliased-owner-binding', aliasedBindings);
  }
  if (consumerAnalysis.unresolvedDynamicImports.length) {
    addViolation(
      violations,
      id,
      'consumer',
      'unresolved-dynamic-import',
      consumerAnalysis.unresolvedDynamicImports
    );
  }
  if (consumerAnalysis.forbiddenModuleSyntax.length) {
    addViolation(
      violations,
      id,
      'consumer',
      'forbidden-module-syntax',
      consumerAnalysis.forbiddenModuleSyntax
    );
  }

  const expectedOwnerFacts = contract.sources
    .flatMap(source => {
      const sourceSpecifier = runtimeModuleSpecifier(contract.owner, source.file);
      return source.symbols.map(symbol => normalizeSourceFact(sourceSpecifier, symbol));
    })
    .sort(compareFacts);
  const actualOwnerFacts = collectNamedModuleExports(contract.owner, ownerSource)
    .map(normalizeActualExportFact)
    .sort(compareFacts);
  if (!sameSemanticValue(actualOwnerFacts, expectedOwnerFacts)) {
    addViolation(violations, id, 'owner', 'export-provenance', {
      expected: expectedOwnerFacts,
      actual: actualOwnerFacts,
    });
  }

  const invalidOwnerStatements = ownerParse.sourceFile.body
    .map((statement, index) => ({ statement, index }))
    .filter(({ statement }) => {
      return !(
        statement?.type === 'ExportNamedDeclaration' &&
        statement.source != null &&
        statement.declaration == null &&
        statement.exportKind !== 'type' &&
        Array.isArray(statement.specifiers) &&
        statement.specifiers.length > 0
      );
    })
    .map(({ statement, index }) => ({ index, type: statement?.type || '<unknown>' }));
  if (invalidOwnerStatements.length) {
    addViolation(violations, id, 'owner', 'non-identity-top-level-statement', invalidOwnerStatements);
  }

  const ownerAnalysis = analyzeModuleDependencies(contract.owner, ownerSource);
  if (ownerAnalysis.unresolvedDynamicImports.length) {
    addViolation(
      violations,
      id,
      'owner',
      'unresolved-dynamic-import',
      ownerAnalysis.unresolvedDynamicImports
    );
  }
  if (ownerAnalysis.forbiddenModuleSyntax.length) {
    addViolation(violations, id, 'owner', 'forbidden-module-syntax', ownerAnalysis.forbiddenModuleSyntax);
  }

  return violations;
}

export function inspectIdentityCompositionContracts(contracts, options = {}) {
  return contracts.flatMap(contract => inspectIdentityCompositionContract(contract, options));
}

export function formatContractViolations(violations) {
  return violations
    .map(violation => {
      const detail = violation.detail === undefined ? '' : ` ${stableJson(violation.detail)}`;
      return `${violation.contractId} [${violation.surface}] ${violation.kind}${detail}`;
    })
    .join('\n');
}

function identifierName(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function staticMemberName(node) {
  if (node?.type !== 'MemberExpression') return null;
  if (!node.computed) return identifierName(node.property);
  if (node.property?.type === 'Literal' && typeof node.property.value === 'string') {
    return node.property.value;
  }
  return null;
}

function memberPath(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type !== 'MemberExpression') return null;
  const objectPath = memberPath(node.object);
  const propertyName = staticMemberName(node);
  return objectPath && propertyName ? `${objectPath}.${propertyName}` : null;
}

function findVariableDeclarator(sourceFile, name) {
  for (const statement of sourceFile.body ?? []) {
    const declaration =
      statement?.type === 'ExportNamedDeclaration' && statement.declaration
        ? statement.declaration
        : statement;
    if (declaration?.type !== 'VariableDeclaration') continue;
    for (const declarator of declaration.declarations ?? []) {
      if (identifierName(declarator.id) === name) return declarator;
    }
  }
  return null;
}

function unwrapFrozenObject(node) {
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

function propertyMap(objectExpression) {
  const result = new Map();
  const invalid = [];
  for (const property of objectExpression?.properties ?? []) {
    if (property?.type !== 'Property' || property.kind !== 'init' || property.computed || property.method) {
      invalid.push(property?.type || '<unknown>');
      continue;
    }
    const key = identifierName(property.key);
    if (!key || result.has(key)) {
      invalid.push(key ? `duplicate:${key}` : 'non-static-key');
      continue;
    }
    result.set(key, property.value);
  }
  return { result, invalid };
}

function validateStaticPolicyShapeDefinition(node, pathLabel, violations, contractId) {
  if (!node || typeof node !== 'object') {
    addViolation(violations, contractId, 'manifest', 'invalid-policy-shape', pathLabel);
    return;
  }
  if (typeof node.ref === 'string' && node.ref) return;
  if (Object.hasOwn(node, 'literal')) return;
  if (!node.properties || typeof node.properties !== 'object' || Array.isArray(node.properties)) {
    addViolation(violations, contractId, 'manifest', 'invalid-policy-object-shape', pathLabel);
    return;
  }
  for (const [key, child] of Object.entries(node.properties)) {
    validateStaticPolicyShapeDefinition(child, `${pathLabel}.${key}`, violations, contractId);
  }
}

function collectShapeReferenceRoots(node, roots = new Set()) {
  if (!node || typeof node !== 'object') return roots;
  if (typeof node.ref === 'string' && node.ref) {
    roots.add(node.ref.split('.')[0]);
    return roots;
  }
  for (const child of Object.values(node.properties || {})) collectShapeReferenceRoots(child, roots);
  return roots;
}

export function validateStaticPolicyContractDefinition(contract) {
  const violations = [];
  const id = String(contract?.id || '<missing-id>');
  if (typeof contract?.owner !== 'string' || !contract.owner) {
    addViolation(violations, id, 'manifest', 'missing-path', 'owner');
  }
  if (typeof contract?.exportName !== 'string' || !contract.exportName) {
    addViolation(violations, id, 'manifest', 'missing-export-name');
  }
  if (!Array.isArray(contract?.sources) || contract.sources.length === 0) {
    addViolation(violations, id, 'manifest', 'missing-sources');
  }
  validateStaticPolicyShapeDefinition(contract?.shape, 'shape', violations, id);
  if (violations.length) return violations;

  const sourceFiles = new Set();
  const sourceSymbols = new Set();
  for (const source of contract.sources) {
    if (typeof source?.file !== 'string' || !source.file) {
      addViolation(violations, id, 'manifest', 'missing-source-file', source);
      continue;
    }
    if (sourceFiles.has(source.file))
      addViolation(violations, id, 'manifest', 'duplicate-source-file', source.file);
    sourceFiles.add(source.file);
    if (!Array.isArray(source.symbols) || source.symbols.length === 0) {
      addViolation(violations, id, 'manifest', 'missing-source-symbols', source.file);
      continue;
    }
    for (const symbol of source.symbols) {
      if (sourceSymbols.has(symbol)) {
        addViolation(violations, id, 'manifest', 'duplicate-source-symbol', symbol);
      }
      sourceSymbols.add(symbol);
    }
  }
  const referenceRoots = collectShapeReferenceRoots(contract.shape);
  const missingRoots = [...referenceRoots].filter(root => !sourceSymbols.has(root));
  if (missingRoots.length)
    addViolation(violations, id, 'manifest', 'unbound-shape-reference', sorted(missingRoots));

  const consumers = Array.isArray(contract.consumers) ? contract.consumers : [];
  const consumerFiles = new Set();
  for (const consumer of consumers) {
    if (typeof consumer?.file !== 'string' || !consumer.file) {
      addViolation(violations, id, 'manifest', 'missing-consumer-file', consumer);
      continue;
    }
    if (consumerFiles.has(consumer.file)) {
      addViolation(violations, id, 'manifest', 'duplicate-consumer-file', consumer.file);
    }
    consumerFiles.add(consumer.file);
    if (!Array.isArray(consumer.symbols) || consumer.symbols.length === 0) {
      addViolation(violations, id, 'manifest', 'missing-consumer-symbols', consumer.file);
    }
  }
  return violations;
}

function inspectStaticPolicyShape({ contract, node, expected, pathLabel, violations }) {
  if (typeof expected?.ref === 'string') {
    const actual = memberPath(node);
    if (actual !== expected.ref) {
      addViolation(violations, contract.id, 'owner', 'policy-reference', {
        path: pathLabel,
        expected: expected.ref,
        actual,
      });
    }
    return;
  }
  if (Object.hasOwn(expected || {}, 'literal')) {
    const actual = node?.type === 'Literal' ? node.value : undefined;
    if (!sameSemanticValue(actual, expected.literal)) {
      addViolation(violations, contract.id, 'owner', 'policy-literal', {
        path: pathLabel,
        expected: expected.literal,
        actual,
      });
    }
    return;
  }

  const object = unwrapFrozenObject(node);
  if (!object) {
    addViolation(violations, contract.id, 'owner', 'policy-object-not-frozen', pathLabel);
    return;
  }
  const { result: properties, invalid } = propertyMap(object);
  if (invalid.length) {
    addViolation(violations, contract.id, 'owner', 'policy-invalid-properties', {
      path: pathLabel,
      invalid,
    });
  }
  const expectedKeys = Object.keys(expected.properties || {});
  const actualKeys = [...properties.keys()];
  if (!sameSemanticValue(sorted(actualKeys), sorted(expectedKeys))) {
    addViolation(violations, contract.id, 'owner', 'policy-property-surface', {
      path: pathLabel,
      expected: sorted(expectedKeys),
      actual: sorted(actualKeys),
    });
  }
  for (const key of expectedKeys) {
    if (!properties.has(key)) continue;
    inspectStaticPolicyShape({
      contract,
      node: properties.get(key),
      expected: expected.properties[key],
      pathLabel: `${pathLabel}.${key}`,
      violations,
    });
  }
}

function listProjectSourceFiles(projectRoot, relativeRoot = 'esm') {
  const base = path.join(projectRoot, relativeRoot);
  const files = [];
  const visit = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && SOURCE_EXTENSION_RE.test(entry.name)) {
        files.push(toPosix(path.relative(projectRoot, absolute)));
      }
    }
  };
  visit(base);
  return files.sort();
}

function buildStaticPolicyProjectInventory(projectRoot, readSource) {
  return listProjectSourceFiles(projectRoot).map(rel => {
    let source = '';
    try {
      source = readSource(rel);
    } catch {
      return { rel, source, analysis: null };
    }
    return { rel, source, analysis: analyzeModuleDependencies(rel, source) };
  });
}

function inspectStaticPolicyConsumerUsage(contract, rel, source, dependency, violations) {
  const expectedConsumer = (contract.consumers || []).find(consumer => consumer.file === rel);
  if (expectedConsumer?.access !== 'member-only' || dependency.syntax !== 'static-import') return;
  const localNames = new Set(
    dependency.bindings
      .map(binding => binding.localName)
      .filter(localName => typeof localName === 'string' && localName)
  );
  const sourceFile = createSourceFile(rel, source, { label: 'declarative_static_policy_consumer' });
  walkAst(sourceFile, node => {
    if (node?.type !== 'Identifier' || !localNames.has(node.name)) return;
    const parent = node.parent;
    if (
      parent?.type === 'ImportSpecifier' ||
      parent?.type === 'ImportDefaultSpecifier' ||
      parent?.type === 'ImportNamespaceSpecifier'
    ) {
      return;
    }
    if (parent?.type === 'MemberExpression' && parent.object === node) return;
    addViolation(violations, contract.id, 'consumer', 'policy-reference-escape', {
      file: rel,
      symbol: node.name,
      parentType: parent?.type || '<unknown>',
    });
  });
}

function inspectStaticPolicyConsumers(contract, context, violations) {
  const { projectRoot, readSource } = context;
  const expectedConsumers = (contract.consumers || [])
    .map(consumer => ({
      file: consumer.file,
      kind: consumer.kind || 'value',
      syntax: consumer.syntax || 'static-import',
      symbols: sorted(consumer.symbols.map(String)),
    }))
    .sort((left, right) => left.file.localeCompare(right.file));
  const ownerStem = sourceStem(contract.owner);
  const actualConsumers = [];
  const inventory = context.projectInventory || buildStaticPolicyProjectInventory(projectRoot, readSource);

  for (const entry of inventory) {
    const { rel, source, analysis } = entry;
    if (!analysis || rel === contract.owner) continue;
    for (const dependency of analysis.imports) {
      if (projectModuleStem(rel, dependency.specifier) !== ownerStem) continue;
      actualConsumers.push({
        file: rel,
        kind: dependency.kind,
        syntax: dependency.syntax,
        symbols: sorted(dependency.importedSymbols),
      });
      const aliases = dependency.bindings.filter(
        binding => binding.localName !== null && binding.importedName !== binding.localName
      );
      if (aliases.length) {
        addViolation(violations, contract.id, 'consumer', 'aliased-policy-binding', {
          file: rel,
          aliases,
        });
      }
      inspectStaticPolicyConsumerUsage(contract, rel, source, dependency, violations);
    }
  }
  actualConsumers.sort((left, right) => left.file.localeCompare(right.file));
  if (!sameSemanticValue(actualConsumers, expectedConsumers)) {
    addViolation(violations, contract.id, 'consumer', 'policy-consumer-inventory', {
      expected: expectedConsumers,
      actual: actualConsumers,
    });
  }
}

export function inspectStaticPolicyContract(contract, options = {}) {
  const manifestViolations = validateStaticPolicyContractDefinition(contract);
  if (manifestViolations.length) return manifestViolations;

  const projectRoot = options.projectRoot || process.cwd();
  const readSource = options.readSource || (rel => readProjectSource(projectRoot, rel));
  const violations = [];
  let source;
  try {
    source = readSource(contract.owner);
  } catch (error) {
    addViolation(violations, contract.id, 'owner', 'read-failed', error?.message || String(error));
    return violations;
  }

  const parsed = parseDiagnosticsFor(contract.owner, source);
  if (parsed.diagnostics.length) {
    addViolation(violations, contract.id, 'owner', 'parse-errors', parsed.diagnostics);
    return violations;
  }

  const analysis = analyzeModuleDependencies(contract.owner, source);
  const expectedDependencies = contract.sources
    .map(sourceContract => ({
      specifier: runtimeModuleSpecifier(contract.owner, sourceContract.file),
      kind: sourceContract.kind || 'value',
      syntax: sourceContract.syntax || 'static-import',
      symbols: sorted(sourceContract.symbols.map(String)),
    }))
    .sort((left, right) => left.specifier.localeCompare(right.specifier));
  const actualDependencies = analysis.imports
    .map(dependency => ({
      specifier: dependency.specifier,
      kind: dependency.kind,
      syntax: dependency.syntax,
      symbols: sorted(dependency.importedSymbols),
    }))
    .sort((left, right) => left.specifier.localeCompare(right.specifier));
  if (!sameSemanticValue(actualDependencies, expectedDependencies)) {
    addViolation(violations, contract.id, 'owner', 'policy-dependency-inventory', {
      expected: expectedDependencies,
      actual: actualDependencies,
    });
  }
  const aliases = analysis.imports
    .flatMap(dependency => dependency.bindings)
    .filter(binding => binding.localName !== null && binding.importedName !== binding.localName);
  if (aliases.length) addViolation(violations, contract.id, 'owner', 'policy-import-alias', aliases);
  if (analysis.unresolvedDynamicImports.length) {
    addViolation(
      violations,
      contract.id,
      'owner',
      'unresolved-dynamic-import',
      analysis.unresolvedDynamicImports
    );
  }
  if (analysis.forbiddenModuleSyntax.length) {
    addViolation(violations, contract.id, 'owner', 'forbidden-module-syntax', analysis.forbiddenModuleSyntax);
  }

  const exports = collectNamedModuleExports(contract.owner, source).map(entry => ({
    exportedName: entry.exportedName,
    kind: entry.kind,
  }));
  if (!sameSemanticValue(exports, [{ exportedName: contract.exportName, kind: 'value' }])) {
    addViolation(violations, contract.id, 'owner', 'policy-export-surface', exports);
  }

  const invalidStatements = (parsed.sourceFile.body || []).filter(statement => {
    if (statement?.type === 'ImportDeclaration') return false;
    return !(
      statement?.type === 'ExportNamedDeclaration' &&
      statement.declaration?.type === 'VariableDeclaration' &&
      statement.declaration.kind === 'const' &&
      (statement.declaration.declarations || []).length === 1 &&
      identifierName(statement.declaration.declarations[0]?.id) === contract.exportName
    );
  });
  if (invalidStatements.length) {
    addViolation(
      violations,
      contract.id,
      'owner',
      'non-policy-top-level-statement',
      invalidStatements.map(statement => statement?.type || '<unknown>')
    );
  }

  const declarator = findVariableDeclarator(parsed.sourceFile, contract.exportName);
  if (!declarator) {
    addViolation(violations, contract.id, 'owner', 'missing-policy-declaration', contract.exportName);
  } else {
    inspectStaticPolicyShape({
      contract,
      node: declarator.init,
      expected: contract.shape,
      pathLabel: contract.exportName,
      violations,
    });
  }

  if (!options.skipConsumerAudit) {
    inspectStaticPolicyConsumers(
      contract,
      { projectRoot, readSource, projectInventory: options.projectInventory },
      violations
    );
  }
  return violations;
}

export function inspectStaticPolicyContracts(contracts, options = {}) {
  const projectRoot = options.projectRoot || process.cwd();
  const readSource = options.readSource || (rel => readProjectSource(projectRoot, rel));
  const projectInventory =
    options.projectInventory || buildStaticPolicyProjectInventory(projectRoot, readSource);
  return contracts.flatMap(contract =>
    inspectStaticPolicyContract(contract, { ...options, projectRoot, readSource, projectInventory })
  );
}
