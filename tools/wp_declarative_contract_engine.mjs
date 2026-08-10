import fs from 'node:fs';
import path from 'node:path';

import { createSourceFile } from './wp_ast_adapter.mjs';
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
