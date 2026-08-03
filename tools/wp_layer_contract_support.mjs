import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

import { createSourceFile, walkAst } from './wp_ast_adapter.mjs';

const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.ts', '.tsx']);
const IMPORT_KINDS = Object.freeze(['type', 'value', 'dynamic']);
const COMPOSITION_FILES = new Set(['app_container.ts', 'main.ts', 'release_main.ts']);
const RATCHET_MODE = 'decrease-only';
export const LAYER_CONTRACT_VERSION = '2.7';
export const MAX_PENDING_LAYER_RATCHET_REDUCTION_DAYS = 90;
export const KNOWN_LAYERS = Object.freeze([
  'adapters',
  'boot',
  'builder',
  'composition',
  'core',
  'data',
  'engine',
  'entry',
  'features',
  'io',
  'kernel',
  'platform',
  'runtime',
  'services',
  'shared',
  'ui',
]);

function toPosix(value) {
  return value.replace(/\\/g, '/');
}

function walkSourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'vendor' || entry.name === 'node_modules' || entry.name === 'dist') continue;
      out.push(...walkSourceFiles(absolute));
      continue;
    }
    if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) out.push(absolute);
  }
  return out;
}

function stripQueryHash(specifier) {
  const query = specifier.indexOf('?');
  const hash = specifier.indexOf('#');
  const cut = query === -1 ? hash : hash === -1 ? query : Math.min(query, hash);
  return cut === -1 ? specifier : specifier.slice(0, cut);
}

function resolveRelativeImport(fromFile, specifier) {
  if (typeof specifier !== 'string' || !specifier.startsWith('.')) return null;
  const raw = path.resolve(path.dirname(fromFile), stripQueryHash(specifier));
  const extension = path.extname(raw);
  const candidates = [raw];
  if (!extension) {
    for (const ext of SOURCE_EXTENSIONS) candidates.push(`${raw}${ext}`);
  } else if (extension === '.js' || extension === '.mjs') {
    const stem = raw.slice(0, -extension.length);
    candidates.push(`${stem}.ts`, `${stem}.tsx`);
  }
  if (fs.existsSync(raw) && fs.statSync(raw).isDirectory()) {
    for (const ext of SOURCE_EXTENSIONS) candidates.push(path.join(raw, `index${ext}`));
  }
  return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || null;
}

function readStaticModuleSpecifier(node) {
  if (!node || typeof node !== 'object') return null;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (
    node.type === 'TemplateLiteral' &&
    Array.isArray(node.expressions) &&
    node.expressions.length === 0 &&
    Array.isArray(node.quasis) &&
    node.quasis.length === 1
  ) {
    return String(node.quasis[0]?.value?.cooked ?? node.quasis[0]?.value?.raw ?? '');
  }
  return null;
}

function sourceRangeText(sourceText, node) {
  const start = Number(node?.start);
  const end = Number(node?.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) return '<unknown>';
  return sourceText.slice(start, end).replace(/\s+/g, ' ').trim() || '<unknown>';
}

function sourceLocation(sourceFile, node) {
  const start = Number.isFinite(Number(node?.start)) ? Number(node.start) : 0;
  const position = sourceFile.getLineAndCharacterOfPosition(start);
  return { line: position.line + 1, column: position.character + 1, statementStart: start };
}

function staticModuleKinds(node) {
  if (node?.type === 'TSImportType') return ['type'];
  if (node?.type === 'ImportExpression') return ['dynamic'];
  const declarationKind = node?.type === 'ImportDeclaration' ? node.importKind : node?.exportKind;
  if (declarationKind === 'type') return ['type'];
  const specifiers = Array.isArray(node?.specifiers) ? node.specifiers : [];
  if (!specifiers.length) return ['value'];
  const typeField = node?.type === 'ImportDeclaration' ? 'importKind' : 'exportKind';
  const hasType = specifiers.some(specifier => specifier?.[typeField] === 'type');
  const hasValue = specifiers.some(specifier => specifier?.[typeField] !== 'type');
  return [...(hasType ? ['type'] : []), ...(hasValue ? ['value'] : [])];
}

function moduleDependencySyntax(node, kind) {
  if (node?.type === 'ImportDeclaration') return kind === 'type' ? 'type-import' : 'static-import';
  if (node?.type === 'ExportNamedDeclaration' || node?.type === 'ExportAllDeclaration') {
    return kind === 'type' ? 'type-re-export' : 'static-re-export';
  }
  if (node?.type === 'ImportExpression') return 'dynamic-import';
  return 'type-import';
}

function readModuleBindingName(node) {
  if (!node || typeof node !== 'object') return null;
  if (typeof node.name === 'string' && node.name) return node.name;
  if (typeof node.value === 'string' && node.value) return node.value;
  return null;
}

function moduleSpecifierKind(node, specifier) {
  const declarationKind = node?.type === 'ImportDeclaration' ? node.importKind : node?.exportKind;
  if (declarationKind === 'type') return 'type';
  const specifierKind = node?.type === 'ImportDeclaration' ? specifier?.importKind : specifier?.exportKind;
  return specifierKind === 'type' ? 'type' : 'value';
}

function moduleDependencyBindings(node, kind) {
  if (node?.type === 'ImportExpression' || node?.type === 'TSImportType') {
    return {
      importedSymbols: ['*'],
      exportedSymbols: [],
      bindings: [{ importedName: '*', localName: null, exportedName: null }],
    };
  }
  if (node?.type === 'ExportAllDeclaration') {
    const exportedName = readModuleBindingName(node.exported) || '*';
    return {
      importedSymbols: ['*'],
      exportedSymbols: [exportedName],
      bindings: [{ importedName: '*', localName: null, exportedName }],
    };
  }

  const importedSymbols = [];
  const exportedSymbols = [];
  const bindings = [];
  for (const specifier of Array.isArray(node?.specifiers) ? node.specifiers : []) {
    if (moduleSpecifierKind(node, specifier) !== kind) continue;
    if (specifier?.type === 'ImportDefaultSpecifier') {
      importedSymbols.push('default');
      bindings.push({
        importedName: 'default',
        localName: readModuleBindingName(specifier.local),
        exportedName: null,
      });
      continue;
    }
    if (specifier?.type === 'ImportNamespaceSpecifier') {
      importedSymbols.push('*');
      bindings.push({
        importedName: '*',
        localName: readModuleBindingName(specifier.local),
        exportedName: null,
      });
      continue;
    }
    if (specifier?.type === 'ImportSpecifier') {
      const importedName = readModuleBindingName(specifier.imported);
      const localName = readModuleBindingName(specifier.local);
      if (importedName) importedSymbols.push(importedName);
      if (importedName) bindings.push({ importedName, localName, exportedName: null });
      continue;
    }
    if (specifier?.type === 'ExportSpecifier') {
      const importedName = readModuleBindingName(specifier.local);
      const exportedName = readModuleBindingName(specifier.exported);
      if (importedName) importedSymbols.push(importedName);
      if (exportedName) exportedSymbols.push(exportedName);
      if (importedName) bindings.push({ importedName, localName: null, exportedName });
    }
  }
  return { importedSymbols, exportedSymbols, bindings };
}

function collectBindingPatternNames(node, out) {
  const name = readModuleBindingName(node);
  if (name) {
    out.push(name);
    return;
  }
  if (node?.type === 'ObjectPattern') {
    for (const property of node.properties || []) {
      collectBindingPatternNames(property?.value || property?.argument, out);
    }
  } else if (node?.type === 'ArrayPattern') {
    for (const element of node.elements || []) collectBindingPatternNames(element, out);
  } else if (node?.type === 'AssignmentPattern' || node?.type === 'RestElement') {
    collectBindingPatternNames(node.left || node.argument, out);
  }
}

function exportedDeclarationNames(declaration) {
  const names = [];
  if (declaration?.type === 'VariableDeclaration') {
    for (const item of declaration.declarations || []) collectBindingPatternNames(item?.id, names);
  } else {
    collectBindingPatternNames(declaration?.id, names);
  }
  return names;
}

export function analyzeModuleDependencies(file, sourceText) {
  const sourceFile = createSourceFile(file, sourceText, { label: 'wp_layer_contract' });
  const imports = [];
  const unresolvedDynamicImports = [];
  const forbiddenModuleSyntax = [];
  walkAst(sourceFile, node => {
    if (node?.type === 'TSImportEqualsDeclaration') {
      forbiddenModuleSyntax.push({
        syntax: 'import-equals',
        expression: sourceRangeText(sourceText, node),
        ...sourceLocation(sourceFile, node),
      });
      return;
    }
    if (
      node?.type === 'CallExpression' &&
      node.callee?.type === 'Identifier' &&
      node.callee.name === 'require'
    ) {
      forbiddenModuleSyntax.push({
        syntax: 'require-call',
        expression: sourceRangeText(sourceText, node),
        ...sourceLocation(sourceFile, node),
      });
      return;
    }
    const isStaticDeclaration =
      node?.type === 'ImportDeclaration' ||
      node?.type === 'ExportNamedDeclaration' ||
      node?.type === 'ExportAllDeclaration' ||
      node?.type === 'TSImportType';
    if (!isStaticDeclaration && node?.type !== 'ImportExpression') return;
    const sourceNode = node.source || node.moduleSpecifier || node.argument || node.arguments?.[0];
    const specifier = readStaticModuleSpecifier(sourceNode);
    if (!specifier) {
      if (node.type === 'ImportExpression') {
        unresolvedDynamicImports.push({
          expression: sourceRangeText(sourceText, sourceNode),
          ...sourceLocation(sourceFile, node),
        });
      }
      return;
    }
    const statementStart = Number.isFinite(Number(node.start)) ? Number(node.start) : imports.length;
    for (const kind of staticModuleKinds(node)) {
      const syntax = moduleDependencySyntax(node, kind);
      const bindings = moduleDependencyBindings(node, kind);
      imports.push({ specifier, kind, statementStart, syntax, ...bindings });
    }
  });
  return { imports, unresolvedDynamicImports, forbiddenModuleSyntax };
}

export function collectNamedModuleExports(file, sourceText) {
  const sourceFile = createSourceFile(file, sourceText, { label: 'wp_layer_contract_exports' });
  const exports = [];
  walkAst(sourceFile, node => {
    if (node?.type === 'ExportDefaultDeclaration') {
      exports.push({
        localName: readModuleBindingName(node.declaration?.id),
        exportedName: 'default',
        source: null,
        kind: 'value',
        statementStart: Number(node.start) || 0,
      });
      return;
    }
    if (node?.type === 'ExportAllDeclaration') {
      exports.push({
        localName: '*',
        exportedName: readModuleBindingName(node.exported) || '*',
        source: readStaticModuleSpecifier(node.source),
        kind: node.exportKind === 'type' ? 'type' : 'value',
        statementStart: Number(node.start) || 0,
      });
      return;
    }
    if (node?.type !== 'ExportNamedDeclaration') return;

    const source = readStaticModuleSpecifier(node.source);
    for (const specifier of node.specifiers || []) {
      if (specifier?.type !== 'ExportSpecifier') continue;
      const localName = readModuleBindingName(specifier.local);
      const exportedName = readModuleBindingName(specifier.exported);
      if (!exportedName) continue;
      exports.push({
        localName,
        exportedName,
        source,
        kind: moduleSpecifierKind(node, specifier),
        statementStart: Number(node.start) || 0,
      });
    }
    const declarationKind =
      node.exportKind === 'type' || String(node.declaration?.type || '').startsWith('TS') ? 'type' : 'value';
    for (const name of exportedDeclarationNames(node.declaration)) {
      exports.push({
        localName: name,
        exportedName: name,
        source: null,
        kind: declarationKind,
        statementStart: Number(node.start) || 0,
      });
    }
  });
  return exports;
}

export function collectStaticModuleImports(file, sourceText) {
  return analyzeModuleDependencies(file, sourceText).imports;
}

export function collectStaticModuleSpecifiers(file, sourceText) {
  return [...new Set(collectStaticModuleImports(file, sourceText).map(entry => entry.specifier))];
}

export function layerOfRelativeFile(relativeFile) {
  const parts = toPosix(relativeFile).split('/');
  if (parts[0] === 'esm' && parts[1] === 'boot') return 'boot';
  if (parts[0] === 'esm' && parts[1] === 'shared' && parts[2]) return 'shared';
  if (parts[0] === 'esm' && parts[1] === 'native' && KNOWN_LAYERS.includes(parts[2])) {
    return parts[2];
  }
  if (parts[0] === 'esm' && parts.length === 2) {
    if (COMPOSITION_FILES.has(parts[1])) return 'composition';
    if (parts[1].startsWith('entry_') || parts[1].startsWith('test_')) return 'entry';
  }
  return 'other';
}

function edgeKey(from, to) {
  return `${from}>${to}`;
}

function emptyKindSets() {
  return Object.fromEntries(
    IMPORT_KINDS.map(kind => [kind, { importerFiles: new Set(), statements: new Set() }])
  );
}

export function collectLayerContractGraph({ root }) {
  const esmDir = path.join(root, 'esm');
  if (!fs.existsSync(esmDir)) throw new Error('wp_layer_contract: missing ./esm directory');
  const imports = [];
  const unresolvedDynamicImports = [];
  const forbiddenModuleSyntax = [];
  const unclassifiedSourceFiles = [];
  for (const file of walkSourceFiles(esmDir)) {
    const fromFile = toPosix(path.relative(root, file));
    const fromLayer = layerOfRelativeFile(fromFile);
    if (fromLayer === 'other') {
      unclassifiedSourceFiles.push(fromFile);
      continue;
    }
    const sourceText = fs.readFileSync(file, 'utf8');
    const analysis = analyzeModuleDependencies(file, sourceText);
    unresolvedDynamicImports.push(
      ...analysis.unresolvedDynamicImports.map(issue => ({ fromFile, fromLayer, ...issue }))
    );
    forbiddenModuleSyntax.push(
      ...analysis.forbiddenModuleSyntax.map(issue => ({ fromFile, fromLayer, ...issue }))
    );
    for (const moduleImport of analysis.imports) {
      const resolved = resolveRelativeImport(file, moduleImport.specifier);
      if (!resolved) continue;
      const toFile = toPosix(path.relative(root, resolved));
      if (!toFile.startsWith('esm/')) continue;
      const toLayer = layerOfRelativeFile(toFile);
      if (toLayer === 'other' || toLayer === fromLayer) continue;
      imports.push({
        from: fromLayer,
        to: toLayer,
        fromFile,
        toFile,
        specifier: moduleImport.specifier,
        kind: moduleImport.kind,
        syntax: moduleImport.syntax,
        importedSymbols: [...moduleImport.importedSymbols].sort(),
        exportedSymbols: [...moduleImport.exportedSymbols].sort(),
        bindings: moduleImport.bindings.map(binding => ({ ...binding })),
        statementKey: `${fromFile}:${moduleImport.statementStart}:${moduleImport.specifier}`,
      });
    }
  }

  const edgeMap = new Map();
  for (const entry of imports) {
    const key = edgeKey(entry.from, entry.to);
    const current = edgeMap.get(key) || {
      from: entry.from,
      to: entry.to,
      importerFiles: new Set(),
      statements: new Set(),
      kinds: emptyKindSets(),
    };
    current.importerFiles.add(entry.fromFile);
    current.statements.add(entry.statementKey);
    current.kinds[entry.kind].importerFiles.add(entry.fromFile);
    current.kinds[entry.kind].statements.add(entry.statementKey);
    edgeMap.set(key, current);
  }
  const edges = [...edgeMap.values()]
    .map(edge => ({
      from: edge.from,
      to: edge.to,
      importerCount: edge.importerFiles.size,
      importCount: edge.statements.size,
      importerFiles: [...edge.importerFiles].sort(),
      ...Object.fromEntries(
        IMPORT_KINDS.flatMap(kind => {
          const prefix = kind[0].toUpperCase() + kind.slice(1);
          return [
            [`${kind}ImporterCount`, edge.kinds[kind].importerFiles.size],
            [`${kind}ImportCount`, edge.kinds[kind].statements.size],
            [`${kind}ImporterFiles`, [...edge.kinds[kind].importerFiles].sort()],
          ];
        })
      ),
    }))
    .sort((left, right) => edgeKey(left.from, left.to).localeCompare(edgeKey(right.from, right.to)));
  return {
    imports,
    edges,
    unresolvedDynamicImports,
    forbiddenModuleSyntax,
    unclassifiedSourceFiles: unclassifiedSourceFiles.sort(),
  };
}

function resolveVirtualRelativeImport(fromFile, specifier, sourceFiles) {
  if (typeof specifier !== 'string' || !specifier.startsWith('.')) return null;
  const raw = toPosix(
    path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), stripQueryHash(specifier)))
  );
  const candidates = [raw];
  const extension = path.posix.extname(raw);
  if (!extension) {
    for (const ext of SOURCE_EXTENSIONS) candidates.push(`${raw}${ext}`);
  } else if (extension === '.js' || extension === '.mjs') {
    const stem = raw.slice(0, -extension.length);
    candidates.push(`${stem}.ts`, `${stem}.tsx`);
  }
  const existing = candidates.find(candidate => Object.hasOwn(sourceFiles, candidate));
  if (existing) return existing;
  if (extension === '.js' || extension === '.mjs') return `${raw.slice(0, -extension.length)}.ts`;
  return raw;
}

function collectResolvedFileModuleGraph(relativeFile, sourceFiles = null) {
  const fromFile = toPosix(String(relativeFile));
  const absoluteFile = path.resolve(process.cwd(), fromFile);
  const virtualSource = sourceFiles && Object.hasOwn(sourceFiles, fromFile) ? sourceFiles[fromFile] : null;
  if (virtualSource === null && (!fs.existsSync(absoluteFile) || !fs.statSync(absoluteFile).isFile())) {
    return { exists: false, imports: [], sourceText: '', sourceFile: null };
  }
  const sourceText = virtualSource === null ? fs.readFileSync(absoluteFile, 'utf8') : String(virtualSource);
  const analysis = analyzeModuleDependencies(absoluteFile, sourceText);
  const from = layerOfRelativeFile(fromFile);
  const imports = [];
  for (const moduleImport of analysis.imports) {
    const resolved =
      virtualSource === null
        ? resolveRelativeImport(absoluteFile, moduleImport.specifier)
        : resolveVirtualRelativeImport(fromFile, moduleImport.specifier, sourceFiles);
    if (!resolved) continue;
    const toFile =
      virtualSource === null ? toPosix(path.relative(process.cwd(), resolved)) : toPosix(resolved);
    if (!toFile.startsWith('esm/')) continue;
    imports.push({
      from,
      to: layerOfRelativeFile(toFile),
      fromFile,
      toFile,
      specifier: moduleImport.specifier,
      kind: moduleImport.kind,
      syntax: moduleImport.syntax,
      importedSymbols: [...moduleImport.importedSymbols].sort(),
      exportedSymbols: [...moduleImport.exportedSymbols].sort(),
      bindings: moduleImport.bindings.map(binding => ({ ...binding })),
      statementKey: `${fromFile}:${moduleImport.statementStart}:${moduleImport.specifier}`,
    });
  }
  return {
    exists: true,
    imports,
    sourceText,
    sourceFile: createSourceFile(absoluteFile, sourceText, { label: 'wp_layer_contract_provenance' }),
  };
}

function assertNonNegativeBudget(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`wp_layer_contract: ${label} must be a non-negative integer`);
  }
}

function normalizeSymbolList(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`wp_layer_contract: ${label} must be a non-empty array`);
  }
  const normalized = value.map(symbol => String(symbol || '').trim());
  if (normalized.some(symbol => !symbol) || new Set(normalized).size !== normalized.length) {
    throw new Error(`wp_layer_contract: ${label} contains empty or duplicate symbols`);
  }
  return normalized.sort();
}

function sameStringList(left, right) {
  const normalizedLeft = [...(left || [])].map(String).sort();
  const normalizedRight = [...(right || [])].map(String).sort();
  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index])
  );
}

function sha256File(absoluteFile) {
  return createHash('sha256').update(fs.readFileSync(absoluteFile)).digest('hex');
}

function statementCoverageKey(spec) {
  return `${toPosix(String(spec?.toFile || ''))}::${String(spec?.kind || '')}::${[
    ...(spec?.importedSymbols || []),
  ]
    .map(String)
    .sort()
    .join(',')}`;
}

function unionStatementSymbols(statements) {
  return [...new Set(statements.flatMap(statement => statement.importedSymbols || []).map(String))].sort();
}

const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_MIGRATION_REVIEW_DAYS = 90;

function parseIsoDateOnly(value, label) {
  if (typeof value !== 'string' || !ISO_DATE_ONLY_PATTERN.test(value)) {
    throw new Error(`wp_layer_contract: ${label} must be YYYY-MM-DD`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new Error(`wp_layer_contract: ${label} must be a valid calendar date`);
  }
  return timestamp;
}

function evaluationDateTimestamp(currentDate) {
  if (typeof currentDate === 'undefined') {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  }
  if (currentDate instanceof Date) {
    if (!Number.isFinite(currentDate.getTime())) {
      throw new Error('wp_layer_contract: currentDate must be a valid Date or YYYY-MM-DD');
    }
    return Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate());
  }
  return parseIsoDateOnly(String(currentDate), 'currentDate');
}

function isoDateOnlyFromTimestamp(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function exactStatementSpecKey(from, to, fromFile, spec) {
  return `${edgeKey(from, to)}::${toPosix(String(fromFile))}::${toPosix(String(spec?.toFile || ''))}::${String(
    spec?.kind || ''
  )}::${String(spec?.syntax || '')}::${[...(spec?.importedSymbols || [])].map(String).sort().join(',')}`;
}

function migrationImportKey(fromFile, importSpec) {
  return `${toPosix(String(fromFile))}::${toPosix(String(importSpec?.toFile || ''))}::${String(
    importSpec?.kind || ''
  )}`;
}

function validateMigrationImportSpec(entry, field, expectedToLayer) {
  const spec = entry?.[field];
  const label = `${entry?.fromFile || '<unknown>'}.${field}`;
  const toFile = toPosix(String(spec?.toFile || ''));
  if (!toFile.startsWith('esm/') || layerOfRelativeFile(toFile) !== expectedToLayer) {
    throw new Error(`wp_layer_contract: ${label}.toFile must belong to ${expectedToLayer}`);
  }
  if (spec?.kind !== 'type' && spec?.kind !== 'value') {
    throw new Error(`wp_layer_contract: ${label}.kind must be type or value`);
  }
  const allowedSyntaxes =
    spec.kind === 'type' ? ['type-import', 'type-re-export'] : ['static-import', 'static-re-export'];
  if (!allowedSyntaxes.includes(spec?.syntax)) {
    throw new Error(`wp_layer_contract: ${label}.syntax must be one of ${allowedSyntaxes.join(', ')}`);
  }
  normalizeSymbolList(spec.importedSymbols, `${label}.importedSymbols`);
  return { toFile, kind: spec.kind, syntax: spec.syntax };
}

export function validateLayerContractSchema(contract) {
  if (!contract || contract.version !== LAYER_CONTRACT_VERSION || contract.root !== 'esm') {
    throw new Error(`wp_layer_contract: baseline must use version ${LAYER_CONTRACT_VERSION} and root esm`);
  }
  if (
    !Array.isArray(contract.rules) ||
    !Array.isArray(contract.facades) ||
    !Array.isArray(contract.dynamicImportAllowlist) ||
    !Array.isArray(contract.migrationBudgets) ||
    !Array.isArray(contract.migrationRetirements) ||
    !Array.isArray(contract.compatibilityBudgets) ||
    !Array.isArray(contract.reviewedOwnershipBudgets) ||
    !Array.isArray(contract.migrationConsolidations)
  ) {
    throw new Error(
      'wp_layer_contract: rules, facades, dynamicImportAllowlist, migrationBudgets, migrationRetirements, compatibilityBudgets, reviewedOwnershipBudgets, and migrationConsolidations must be arrays'
    );
  }
  if (
    contract.ratchet?.mode !== RATCHET_MODE ||
    typeof contract.ratchet?.owner !== 'string' ||
    !contract.ratchet.owner.trim() ||
    typeof contract.ratchet?.reason !== 'string' ||
    !contract.ratchet.reason.trim() ||
    typeof contract.ratchet?.reviewedAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(contract.ratchet.reviewedAt) ||
    !Number.isInteger(contract.ratchet?.pendingReductionGraceDays) ||
    contract.ratchet.pendingReductionGraceDays < 1 ||
    contract.ratchet.pendingReductionGraceDays > MAX_PENDING_LAYER_RATCHET_REDUCTION_DAYS
  ) {
    throw new Error(
      `wp_layer_contract: ratchet requires decrease-only mode, owner, reason, reviewedAt (YYYY-MM-DD), and pendingReductionGraceDays (1-${MAX_PENDING_LAYER_RATCHET_REDUCTION_DAYS})`
    );
  }
  const known = new Set(KNOWN_LAYERS);
  const rules = new Map();
  for (const rule of contract.rules) {
    if (!known.has(rule?.from) || !known.has(rule?.to) || rule.from === rule.to) {
      throw new Error(`wp_layer_contract: unknown or invalid layer pair ${rule?.from}>${rule?.to}`);
    }
    const key = edgeKey(rule.from, rule.to);
    if (rules.has(key)) {
      const previous = rules.get(key);
      const kind = previous.decision !== rule.decision ? 'conflicting decision' : 'duplicate rule';
      throw new Error(`wp_layer_contract: ${kind} for ${key}`);
    }
    if (rule.decision !== 'allow' && rule.decision !== 'deny') {
      throw new Error(`wp_layer_contract: rule ${key} must declare decision allow or deny`);
    }
    if (typeof rule.reason !== 'string' || !rule.reason.trim()) {
      throw new Error(`wp_layer_contract: rule ${key} requires a reason`);
    }
    if (rule.decision === 'allow') {
      for (const field of [
        'maxImporterCount',
        'maxImportCount',
        'maxTypeImporterCount',
        'maxTypeImportCount',
        'maxValueImporterCount',
        'maxValueImportCount',
        'maxDynamicImporterCount',
        'maxDynamicImportCount',
      ]) {
        assertNonNegativeBudget(rule[field], `${key}.${field}`);
      }
    }
    if (typeof rule.approvedImporters !== 'undefined') {
      if (!Array.isArray(rule.approvedImporters)) {
        throw new Error(`wp_layer_contract: ${key}.approvedImporters must be an array`);
      }
      const normalized = rule.approvedImporters.map(value => toPosix(String(value || '')));
      if (normalized.some(value => !value) || new Set(normalized).size !== normalized.length) {
        throw new Error(`wp_layer_contract: ${key}.approvedImporters contains empty or duplicate entries`);
      }
    }
    rules.set(key, rule);
  }

  const facades = new Set();
  for (const facade of contract.facades) {
    const key = edgeKey(facade?.from, facade?.to);
    if (facades.has(key)) throw new Error(`wp_layer_contract: duplicate facade for ${key}`);
    if (!rules.has(key) || rules.get(key).decision !== 'allow') {
      throw new Error(`wp_layer_contract: facade ${key} requires one allowed rule`);
    }
    if (typeof facade.reason !== 'string' || !facade.reason.trim()) {
      throw new Error(`wp_layer_contract: facade ${key} requires a reason`);
    }
    if (!Array.isArray(facade.allowedTargets) || !facade.allowedTargets.length) {
      throw new Error(`wp_layer_contract: facade ${key} requires allowedTargets`);
    }
    const targets = facade.allowedTargets.map(value => toPosix(String(value || '')));
    if (targets.some(value => !value) || new Set(targets).size !== targets.length) {
      throw new Error(`wp_layer_contract: facade ${key} contains empty or duplicate targets`);
    }
    facades.add(key);
  }

  const dynamicAllowlist = new Set();
  for (const entry of contract.dynamicImportAllowlist) {
    const fromFile = toPosix(String(entry?.fromFile || ''));
    const expression = String(entry?.expression || '').trim();
    const reason = String(entry?.reason || '').trim();
    if (
      !fromFile.startsWith('esm/') ||
      layerOfRelativeFile(fromFile) === 'other' ||
      !expression ||
      !reason ||
      !Number.isInteger(entry?.maxOccurrences) ||
      entry.maxOccurrences < 1
    ) {
      throw new Error(
        'wp_layer_contract: dynamicImportAllowlist entries require a classified esm fromFile, expression, reason, and positive maxOccurrences'
      );
    }
    const key = `${fromFile}::${expression}`;
    if (dynamicAllowlist.has(key)) {
      throw new Error(`wp_layer_contract: duplicate dynamic import allowlist entry for ${key}`);
    }
    dynamicAllowlist.add(key);
  }

  const migrationBudgetKeys = new Set();
  const migrationBudgetReviewedAt = [];
  for (const entry of contract.migrationBudgets) {
    const fromFile = toPosix(String(entry?.fromFile || ''));
    const from = String(entry?.from || '');
    const to = String(entry?.to || '');
    const rule = rules.get(edgeKey(from, to));
    if (
      !known.has(from) ||
      !known.has(to) ||
      from === to ||
      layerOfRelativeFile(fromFile) !== from ||
      !rule ||
      rule.decision !== 'allow'
    ) {
      throw new Error(
        `wp_layer_contract: migration budget ${fromFile || '<unknown>'} requires one existing allowed edge`
      );
    }
    if (entry.additionalStatements !== 1) {
      throw new Error(
        `wp_layer_contract: migration budget ${fromFile} must authorize exactly one additional statement`
      );
    }
    for (const field of ['owner', 'reason', 'removalCondition']) {
      if (typeof entry?.[field] !== 'string' || !entry[field].trim()) {
        throw new Error(`wp_layer_contract: migration budget ${fromFile} requires ${field}`);
      }
    }
    const reviewedAt = parseIsoDateOnly(entry.reviewedAt, `migration budget ${fromFile}.reviewedAt`);
    migrationBudgetReviewedAt.push(reviewedAt);
    const reviewBy = parseIsoDateOnly(entry.reviewBy, `migration budget ${fromFile}.reviewBy`);
    if (reviewBy < reviewedAt) {
      throw new Error(
        `wp_layer_contract: migration budget ${fromFile}.reviewBy must not be earlier than reviewedAt`
      );
    }
    if (reviewBy - reviewedAt > MAX_MIGRATION_REVIEW_DAYS * DAY_MS) {
      throw new Error(
        `wp_layer_contract: migration budget ${fromFile}.reviewBy must be within ${MAX_MIGRATION_REVIEW_DAYS} days of reviewedAt`
      );
    }
    const added = validateMigrationImportSpec(entry, 'addedImport', to);
    const companion = validateMigrationImportSpec(entry, 'companionImport', to);
    const removed = validateMigrationImportSpec(entry, 'removedImport', to);
    if (
      added.toFile === companion.toFile ||
      added.toFile === removed.toFile ||
      companion.toFile === removed.toFile
    ) {
      throw new Error(
        `wp_layer_contract: migration budget ${fromFile} requires distinct added, companion, and removed targets`
      );
    }
    const key = migrationImportKey(fromFile, added);
    if (migrationBudgetKeys.has(key)) {
      throw new Error(`wp_layer_contract: duplicate migration budget for ${key}`);
    }
    migrationBudgetKeys.add(key);
  }

  const compatibilityIds = new Set();
  const compatibilityById = new Map();
  const compatibilityStatementKeys = new Set();
  for (const entry of contract.compatibilityBudgets) {
    const id = String(entry?.id || '').trim();
    const from = String(entry?.from || '');
    const to = String(entry?.to || '');
    const fromFile = toPosix(String(entry?.fromFile || ''));
    const rule = rules.get(edgeKey(from, to));
    if (!id || compatibilityIds.has(id)) {
      throw new Error(
        `wp_layer_contract: compatibility budget id must be non-empty and unique (${id || '<empty>'})`
      );
    }
    compatibilityIds.add(id);
    if (
      !known.has(from) ||
      !known.has(to) ||
      from === to ||
      layerOfRelativeFile(fromFile) !== from ||
      !rule ||
      rule.decision !== 'allow'
    ) {
      throw new Error(`wp_layer_contract: compatibility budget ${id} requires one existing allowed edge`);
    }
    for (const field of ['owner', 'reason', 'publicSurface']) {
      if (typeof entry?.[field] !== 'string' || !entry[field].trim()) {
        throw new Error(`wp_layer_contract: compatibility budget ${id} requires ${field}`);
      }
    }
    const reviewedAt = parseIsoDateOnly(entry.reviewedAt, `compatibility budget ${id}.reviewedAt`);
    const nextReviewBy = parseIsoDateOnly(entry.nextReviewBy, `compatibility budget ${id}.nextReviewBy`);
    if (nextReviewBy < reviewedAt) {
      throw new Error(
        `wp_layer_contract: compatibility budget ${id}.nextReviewBy must not be earlier than reviewedAt`
      );
    }
    const statement = validateMigrationImportSpec({ fromFile, statement: entry.statement }, 'statement', to);
    const symbols = normalizeSymbolList(
      entry.statement.importedSymbols,
      `compatibility budget ${id}.statement.importedSymbols`
    );
    if (symbols.includes('*') && entry.allowWildcard !== true) {
      throw new Error(`wp_layer_contract: compatibility budget ${id} wildcard requires allowWildcard: true`);
    }
    const statementKey = exactStatementSpecKey(from, to, fromFile, {
      ...entry.statement,
      toFile: statement.toFile,
      importedSymbols: symbols,
    });
    if (compatibilityStatementKeys.has(statementKey)) {
      throw new Error(`wp_layer_contract: duplicate compatibility statement ownership for ${statementKey}`);
    }
    compatibilityStatementKeys.add(statementKey);
    compatibilityById.set(id, { entry, reviewedAt, statementKey });
  }

  const reviewedOwnershipIds = new Set();
  const reviewedOwnershipById = new Map();
  const reviewedOwnershipStatementKeys = new Set();
  for (const entry of contract.reviewedOwnershipBudgets) {
    const id = String(entry?.id || '').trim();
    const from = String(entry?.from || '');
    const to = String(entry?.to || '');
    const fromFile = toPosix(String(entry?.fromFile || ''));
    const rule = rules.get(edgeKey(from, to));
    if (!id || reviewedOwnershipIds.has(id)) {
      throw new Error(
        `wp_layer_contract: reviewed ownership budget id must be non-empty and unique (${id || '<empty>'})`
      );
    }
    reviewedOwnershipIds.add(id);
    if (
      !known.has(from) ||
      !known.has(to) ||
      from === to ||
      layerOfRelativeFile(fromFile) !== from ||
      !rule ||
      rule.decision !== 'allow'
    ) {
      throw new Error(
        `wp_layer_contract: reviewed ownership budget ${id} requires one existing allowed edge`
      );
    }
    for (const field of ['owner', 'reason']) {
      if (typeof entry?.[field] !== 'string' || !entry[field].trim()) {
        throw new Error(`wp_layer_contract: reviewed ownership budget ${id} requires ${field}`);
      }
    }
    const reviewedAt = parseIsoDateOnly(entry.reviewedAt, `reviewed ownership budget ${id}.reviewedAt`);
    const nextReviewBy = parseIsoDateOnly(entry.nextReviewBy, `reviewed ownership budget ${id}.nextReviewBy`);
    if (nextReviewBy < reviewedAt) {
      throw new Error(
        `wp_layer_contract: reviewed ownership budget ${id}.nextReviewBy must not be earlier than reviewedAt`
      );
    }
    const statement = validateMigrationImportSpec({ fromFile, statement: entry.statement }, 'statement', to);
    if (statement.syntax !== 'static-import' && statement.syntax !== 'type-import') {
      throw new Error(
        `wp_layer_contract: reviewed ownership budget ${id} must own a direct static import, not ${statement.syntax}`
      );
    }
    const symbols = normalizeSymbolList(
      entry.statement.importedSymbols,
      `reviewed ownership budget ${id}.statement.importedSymbols`
    );
    if (symbols.includes('*')) {
      throw new Error(`wp_layer_contract: reviewed ownership budget ${id} does not allow wildcard ownership`);
    }
    const statementKey = exactStatementSpecKey(from, to, fromFile, {
      ...entry.statement,
      toFile: statement.toFile,
      importedSymbols: symbols,
    });
    if (reviewedOwnershipStatementKeys.has(statementKey)) {
      throw new Error(
        `wp_layer_contract: duplicate reviewed ownership statement ownership for ${statementKey}`
      );
    }
    if (compatibilityStatementKeys.has(statementKey)) {
      throw new Error(
        `wp_layer_contract: reviewed ownership budget ${id} conflicts with compatibility ownership for ${statementKey}`
      );
    }
    reviewedOwnershipStatementKeys.add(statementKey);

    if (!Array.isArray(entry.evidenceContracts) || entry.evidenceContracts.length === 0) {
      throw new Error(
        `wp_layer_contract: reviewed ownership budget ${id}.evidenceContracts must be a non-empty array`
      );
    }
    const evidenceContracts = entry.evidenceContracts.map((value, index) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(
          `wp_layer_contract: reviewed ownership budget ${id}.evidenceContracts[${index}] must contain path and sha256`
        );
      }
      return {
        path: toPosix(String(value.path || '')),
        sha256: String(value.sha256 || '').toLowerCase(),
      };
    });
    if (
      evidenceContracts.some(
        value => !value.path || !value.path.startsWith('tests/') || !/^[a-f0-9]{64}$/u.test(value.sha256)
      ) ||
      new Set(evidenceContracts.map(value => value.path)).size !== evidenceContracts.length
    ) {
      throw new Error(
        `wp_layer_contract: reviewed ownership budget ${id}.evidenceContracts must contain unique tests/ paths and exact SHA-256 values`
      );
    }
    for (const evidenceContract of evidenceContracts) {
      if (!fs.existsSync(path.resolve(process.cwd(), evidenceContract.path))) {
        throw new Error(
          `wp_layer_contract: reviewed ownership budget ${id} evidence contract does not exist: ${evidenceContract.path}`
        );
      }
    }
    reviewedOwnershipById.set(id, {
      entry,
      reviewedAt,
      nextReviewBy,
      statementKey,
      statement: {
        ...entry.statement,
        toFile: statement.toFile,
        kind: statement.kind,
        syntax: statement.syntax,
        importedSymbols: symbols,
      },
      evidenceContracts,
    });
  }

  const consolidationIds = new Set();
  const consolidationById = new Map();
  const consolidationEntryOwners = new Map();
  const consolidationReplacementKeys = new Set();
  for (const consolidation of contract.migrationConsolidations) {
    const id = String(consolidation?.id || '').trim();
    if (!id || consolidationIds.has(id)) {
      throw new Error(
        `wp_layer_contract: migration consolidation id must be non-empty and unique (${id || '<empty>'})`
      );
    }
    consolidationIds.add(id);

    const entryNumbers = consolidation?.entryNumbers;
    if (
      !Array.isArray(entryNumbers) ||
      entryNumbers.length === 0 ||
      entryNumbers.some(entryNumber => !Number.isInteger(entryNumber)) ||
      new Set(entryNumbers).size !== entryNumbers.length
    ) {
      throw new Error(
        `wp_layer_contract: migration consolidation ${id}.entryNumbers must be a non-empty unique integer list`
      );
    }
    const from = String(consolidation?.from || '');
    const to = String(consolidation?.to || '');
    const fromFile = toPosix(String(consolidation?.fromFile || ''));
    const rule = rules.get(edgeKey(from, to));
    if (
      !known.has(from) ||
      !known.has(to) ||
      from === to ||
      layerOfRelativeFile(fromFile) !== from ||
      !rule ||
      rule.decision !== 'allow'
    ) {
      throw new Error(`wp_layer_contract: migration consolidation ${id} requires one existing allowed edge`);
    }
    for (const field of ['owner', 'reason']) {
      if (typeof consolidation?.[field] !== 'string' || !consolidation[field].trim()) {
        throw new Error(`wp_layer_contract: migration consolidation ${id} requires ${field}`);
      }
    }
    const retiredAt = parseIsoDateOnly(consolidation.retiredAt, `migration consolidation ${id}.retiredAt`);

    const budgets = entryNumbers.map(entryNumber => {
      if (entryNumber < 1 || entryNumber > contract.migrationBudgets.length) {
        throw new Error(
          `wp_layer_contract: migration consolidation ${id} entryNumber ${entryNumber} does not exist`
        );
      }
      const previousOwner = consolidationEntryOwners.get(entryNumber);
      if (previousOwner) {
        throw new Error(
          `wp_layer_contract: migration Entry ${entryNumber} belongs to multiple consolidations (${previousOwner}, ${id})`
        );
      }
      consolidationEntryOwners.set(entryNumber, id);
      return contract.migrationBudgets[entryNumber - 1];
    });
    for (const [index, budget] of budgets.entries()) {
      const entryNumber = entryNumbers[index];
      if (budget.from !== from || budget.to !== to) {
        throw new Error(
          `wp_layer_contract: migration consolidation ${id} Entry ${entryNumber} must use edge ${edgeKey(from, to)}`
        );
      }
      if (toPosix(String(budget.fromFile)) !== fromFile) {
        throw new Error(
          `wp_layer_contract: migration consolidation ${id} Entry ${entryNumber} must use fromFile ${fromFile}`
        );
      }
      if (retiredAt < migrationBudgetReviewedAt[entryNumber - 1]) {
        throw new Error(
          `wp_layer_contract: migration consolidation ${id}.retiredAt must not be earlier than Entry ${entryNumber} reviewedAt`
        );
      }
    }

    const replacementStatement = consolidation?.replacementStatement;
    if (
      !replacementStatement ||
      typeof replacementStatement !== 'object' ||
      Array.isArray(replacementStatement)
    ) {
      throw new Error(`wp_layer_contract: migration consolidation ${id} requires replacementStatement`);
    }
    const replacementSpec = validateMigrationImportSpec(
      { fromFile, replacementStatement },
      'replacementStatement',
      to
    );
    const replacementSymbols = normalizeSymbolList(
      replacementStatement.importedSymbols,
      `migration consolidation ${id}.replacementStatement.importedSymbols`
    );
    if (replacementSymbols.includes('*') && replacementStatement.allowWildcard !== true) {
      throw new Error(
        `wp_layer_contract: migration consolidation ${id} replacement wildcard requires allowWildcard: true`
      );
    }
    const replacementKey = exactStatementSpecKey(from, to, fromFile, {
      ...replacementStatement,
      toFile: replacementSpec.toFile,
      importedSymbols: replacementSymbols,
    });
    if (consolidationReplacementKeys.has(replacementKey)) {
      throw new Error(
        `wp_layer_contract: duplicate migration consolidation replacement ownership for ${replacementKey}`
      );
    }
    consolidationReplacementKeys.add(replacementKey);

    if (!Array.isArray(consolidation.absorbedStatements) || consolidation.absorbedStatements.length === 0) {
      throw new Error(
        `wp_layer_contract: migration consolidation ${id}.absorbedStatements must be a non-empty array`
      );
    }
    const historicalStatements = new Map();
    for (const budget of budgets) {
      for (const field of ['addedImport', 'companionImport']) {
        const spec = budget[field];
        historicalStatements.set(exactStatementSpecKey(from, to, fromFile, spec), spec);
      }
    }
    const absorbedKeys = new Set();
    const normalizedAbsorbedStatements = [];
    for (const [index, absorbedStatement] of consolidation.absorbedStatements.entries()) {
      const absorbedFromFile = toPosix(String(absorbedStatement?.fromFile || ''));
      if (absorbedFromFile !== fromFile) {
        throw new Error(
          `wp_layer_contract: migration consolidation ${id}.absorbedStatements[${index}].fromFile must equal ${fromFile}`
        );
      }
      const absorbedSpec = validateMigrationImportSpec(
        { fromFile: absorbedFromFile, absorbedStatement },
        'absorbedStatement',
        to
      );
      const absorbedSymbols = normalizeSymbolList(
        absorbedStatement.importedSymbols,
        `migration consolidation ${id}.absorbedStatements[${index}].importedSymbols`
      );
      if (absorbedSymbols.includes('*') && absorbedStatement.allowWildcard !== true) {
        throw new Error(
          `wp_layer_contract: migration consolidation ${id} absorbed wildcard requires allowWildcard: true`
        );
      }
      const absorbedKey = exactStatementSpecKey(from, to, absorbedFromFile, {
        ...absorbedStatement,
        toFile: absorbedSpec.toFile,
        importedSymbols: absorbedSymbols,
      });
      if (absorbedKeys.has(absorbedKey)) {
        throw new Error(
          `wp_layer_contract: migration consolidation ${id} contains duplicate absorbed statement ${absorbedKey}`
        );
      }
      if (!historicalStatements.has(absorbedKey)) {
        throw new Error(
          `wp_layer_contract: migration consolidation ${id} absorbed statement is not historical group provenance (${absorbedKey})`
        );
      }
      absorbedKeys.add(absorbedKey);
      normalizedAbsorbedStatements.push({
        ...absorbedStatement,
        fromFile: absorbedFromFile,
        toFile: absorbedSpec.toFile,
        importedSymbols: absorbedSymbols,
      });
    }
    for (const historicalKey of historicalStatements.keys()) {
      if (!absorbedKeys.has(historicalKey)) {
        throw new Error(
          `wp_layer_contract: migration consolidation ${id} must absorb every unique added and companion statement (${historicalKey})`
        );
      }
    }

    const replacementProvenance = consolidation?.replacementProvenance;
    if (
      !replacementProvenance ||
      typeof replacementProvenance !== 'object' ||
      Array.isArray(replacementProvenance)
    ) {
      throw new Error(`wp_layer_contract: migration consolidation ${id} requires replacementProvenance`);
    }
    const provenanceMode = String(replacementProvenance.mode || '');
    if (provenanceMode !== 'identity-reexport' && provenanceMode !== 'reviewed-composition') {
      throw new Error(
        `wp_layer_contract: migration consolidation ${id}.replacementProvenance.mode must be identity-reexport or reviewed-composition`
      );
    }
    const provenanceOwnerFile = toPosix(String(replacementProvenance.ownerFile || ''));
    if (provenanceOwnerFile !== replacementSpec.toFile) {
      throw new Error(
        `wp_layer_contract: migration consolidation ${id}.replacementProvenance.ownerFile must equal replacementStatement.toFile`
      );
    }
    if (
      !Array.isArray(replacementProvenance.sourceStatements) ||
      replacementProvenance.sourceStatements.length === 0
    ) {
      throw new Error(
        `wp_layer_contract: migration consolidation ${id}.replacementProvenance.sourceStatements must be a non-empty array`
      );
    }
    const provenanceStatementKeys = new Set();
    const normalizedSourceStatements = [];
    for (const [index, sourceStatement] of replacementProvenance.sourceStatements.entries()) {
      const sourceSpec = validateMigrationImportSpec(
        { fromFile: provenanceOwnerFile, sourceStatement },
        'sourceStatement',
        to
      );
      const sourceSymbols = normalizeSymbolList(
        sourceStatement.importedSymbols,
        `migration consolidation ${id}.replacementProvenance.sourceStatements[${index}].importedSymbols`
      );
      if (sourceSymbols.includes('*') && sourceStatement.allowWildcard !== true) {
        throw new Error(
          `wp_layer_contract: migration consolidation ${id} provenance wildcard requires allowWildcard: true`
        );
      }
      const sourceKey = exactStatementSpecKey(to, to, provenanceOwnerFile, {
        ...sourceStatement,
        toFile: sourceSpec.toFile,
        importedSymbols: sourceSymbols,
      });
      if (provenanceStatementKeys.has(sourceKey)) {
        throw new Error(
          `wp_layer_contract: migration consolidation ${id} contains duplicate provenance source statement ${sourceKey}`
        );
      }
      provenanceStatementKeys.add(sourceKey);
      normalizedSourceStatements.push({
        ...sourceStatement,
        toFile: sourceSpec.toFile,
        kind: sourceSpec.kind,
        syntax: sourceSpec.syntax,
        importedSymbols: sourceSymbols,
      });
    }

    if (!Array.isArray(consolidation.evidenceContracts) || consolidation.evidenceContracts.length === 0) {
      throw new Error(
        `wp_layer_contract: migration consolidation ${id}.evidenceContracts must be a non-empty array`
      );
    }
    const evidenceContracts = consolidation.evidenceContracts.map((value, index) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(
          `wp_layer_contract: migration consolidation ${id}.evidenceContracts[${index}] must contain path and sha256`
        );
      }
      return {
        path: toPosix(String(value.path || '')),
        sha256: String(value.sha256 || '').toLowerCase(),
      };
    });
    if (
      evidenceContracts.some(
        value => !value.path || !value.path.startsWith('tests/') || !/^[a-f0-9]{64}$/u.test(value.sha256)
      ) ||
      new Set(evidenceContracts.map(value => value.path)).size !== evidenceContracts.length
    ) {
      throw new Error(
        `wp_layer_contract: migration consolidation ${id}.evidenceContracts must contain unique tests/ paths and exact SHA-256 values`
      );
    }
    for (const evidenceContract of evidenceContracts) {
      if (!fs.existsSync(path.resolve(process.cwd(), evidenceContract.path))) {
        throw new Error(
          `wp_layer_contract: migration consolidation ${id} evidence contract does not exist: ${evidenceContract.path}`
        );
      }
    }

    consolidationById.set(id, {
      consolidation,
      entryNumbers: [...entryNumbers],
      from,
      to,
      fromFile,
      retiredAt,
      replacementKey,
      replacementStatement: {
        ...replacementStatement,
        toFile: replacementSpec.toFile,
        importedSymbols: replacementSymbols,
      },
      absorbedStatements: normalizedAbsorbedStatements,
      replacementProvenance: {
        mode: provenanceMode,
        ownerFile: provenanceOwnerFile,
        sourceStatements: normalizedSourceStatements,
      },
      evidenceContracts,
    });
  }

  for (const [id, ownership] of reviewedOwnershipById) {
    if (consolidationReplacementKeys.has(ownership.statementKey)) {
      throw new Error(
        `wp_layer_contract: reviewed ownership budget ${id} conflicts with migration consolidation ownership for ${ownership.statementKey}`
      );
    }
  }

  const retirementEntries = new Set();
  const retirementByEntry = new Map();
  const retirementModes = new Set([
    'statement-removed',
    'statement-consolidated',
    'ownership-transferred',
    'ownership-reviewed',
  ]);
  for (const retirement of contract.migrationRetirements) {
    const entryNumber = retirement?.entryNumber;
    if (!Number.isInteger(entryNumber) || entryNumber < 1 || entryNumber > contract.migrationBudgets.length) {
      throw new Error(`wp_layer_contract: migration retirement entryNumber ${entryNumber} does not exist`);
    }
    if (retirementEntries.has(entryNumber)) {
      throw new Error(`wp_layer_contract: duplicate migration retirement for Entry ${entryNumber}`);
    }
    retirementEntries.add(entryNumber);
    retirementByEntry.set(entryNumber, retirement);
    const retiredAt = parseIsoDateOnly(
      retirement.retiredAt,
      `migration retirement Entry ${entryNumber}.retiredAt`
    );
    const migrationBudget = contract.migrationBudgets[entryNumber - 1];
    if (retiredAt < migrationBudgetReviewedAt[entryNumber - 1]) {
      throw new Error(
        `wp_layer_contract: migration retirement Entry ${entryNumber}.retiredAt must not be earlier than migration reviewedAt`
      );
    }
    if (!retirementModes.has(retirement.mode)) {
      throw new Error(`wp_layer_contract: migration retirement Entry ${entryNumber} has unsupported mode`);
    }
    if (typeof retirement.reason !== 'string' || !retirement.reason.trim()) {
      throw new Error(`wp_layer_contract: migration retirement Entry ${entryNumber} requires reason`);
    }

    const hasCompatibilityId = Object.hasOwn(retirement, 'replacementCompatibilityBudgetId');
    const hasConsolidationId = Object.hasOwn(retirement, 'replacementConsolidationId');
    const hasReviewedOwnershipId = Object.hasOwn(retirement, 'replacementReviewedOwnershipBudgetId');
    const hasInlineReplacement = Object.hasOwn(retirement, 'replacementStatement');
    if (retirement.mode === 'ownership-transferred') {
      const compatibilityId = retirement.replacementCompatibilityBudgetId;
      if (
        typeof compatibilityId !== 'string' ||
        !compatibilityId.trim() ||
        !compatibilityIds.has(compatibilityId)
      ) {
        throw new Error(
          `wp_layer_contract: migration retirement Entry ${entryNumber} ownership-transferred requires an existing replacementCompatibilityBudgetId`
        );
      }
      if (hasConsolidationId || hasReviewedOwnershipId || hasInlineReplacement) {
        throw new Error(
          `wp_layer_contract: migration retirement Entry ${entryNumber} ownership-transferred does not allow replacementConsolidationId, replacementReviewedOwnershipBudgetId, or replacementStatement`
        );
      }
      const compatibility = compatibilityById.get(compatibilityId);
      if (compatibility.reviewedAt > retiredAt) {
        throw new Error(
          `wp_layer_contract: migration retirement Entry ${entryNumber} ownership-transferred requires compatibility reviewedAt on or before retiredAt`
        );
      }
      continue;
    }

    if (retirement.mode === 'ownership-reviewed') {
      const reviewedOwnershipId = String(retirement.replacementReviewedOwnershipBudgetId || '').trim();
      if (
        !hasReviewedOwnershipId ||
        !reviewedOwnershipId ||
        !reviewedOwnershipById.has(reviewedOwnershipId)
      ) {
        throw new Error(
          `wp_layer_contract: migration retirement Entry ${entryNumber} ownership-reviewed requires an existing replacementReviewedOwnershipBudgetId`
        );
      }
      if (hasCompatibilityId || hasConsolidationId || hasInlineReplacement) {
        throw new Error(
          `wp_layer_contract: migration retirement Entry ${entryNumber} ownership-reviewed does not allow compatibility, consolidation, or inline replacement ownership`
        );
      }
      const reviewedOwnership = reviewedOwnershipById.get(reviewedOwnershipId);
      if (reviewedOwnership.reviewedAt > retiredAt) {
        throw new Error(
          `wp_layer_contract: migration retirement Entry ${entryNumber} ownership-reviewed requires ownership reviewedAt on or before retiredAt`
        );
      }
      const migrationStatementKey = exactStatementSpecKey(
        migrationBudget.from,
        migrationBudget.to,
        migrationBudget.fromFile,
        migrationBudget.addedImport
      );
      if (reviewedOwnership.statementKey !== migrationStatementKey) {
        throw new Error(
          `wp_layer_contract: migration retirement Entry ${entryNumber} ownership-reviewed statement must exactly match historical addedImport`
        );
      }
      continue;
    }

    if (retirement.mode === 'statement-removed') {
      if (hasCompatibilityId || hasConsolidationId || hasReviewedOwnershipId || hasInlineReplacement) {
        throw new Error(
          `wp_layer_contract: migration retirement Entry ${entryNumber} statement-removed does not allow replacement ownership fields`
        );
      }
      continue;
    }

    if (hasCompatibilityId || hasReviewedOwnershipId || hasInlineReplacement) {
      throw new Error(
        `wp_layer_contract: migration retirement Entry ${entryNumber} statement-consolidated does not allow compatibility, reviewed ownership, or inline replacement fields; use replacementConsolidationId`
      );
    }
    const consolidationId = String(retirement.replacementConsolidationId || '').trim();
    if (!hasConsolidationId || !consolidationId || !consolidationById.has(consolidationId)) {
      throw new Error(
        `wp_layer_contract: migration retirement Entry ${entryNumber} statement-consolidated requires an existing replacementConsolidationId`
      );
    }
    const consolidation = consolidationById.get(consolidationId);
    if (!consolidation.entryNumbers.includes(entryNumber)) {
      throw new Error(
        `wp_layer_contract: migration retirement Entry ${entryNumber} points to consolidation ${consolidationId} that does not include it`
      );
    }
  }

  for (const [id, consolidation] of consolidationById) {
    for (const entryNumber of consolidation.entryNumbers) {
      const retirement = retirementByEntry.get(entryNumber);
      if (!retirement) {
        throw new Error(
          `wp_layer_contract: migration consolidation ${id} Entry ${entryNumber} is missing a matching retirement`
        );
      }
      if (
        retirement.mode !== 'statement-consolidated' ||
        retirement.replacementConsolidationId !== id ||
        retirement.retiredAt !== consolidation.consolidation.retiredAt
      ) {
        throw new Error(
          `wp_layer_contract: migration consolidation ${id} Entry ${entryNumber} requires a matching statement-consolidated retirement with the same retiredAt`
        );
      }
    }
  }
  return contract;
}

function matchesAllowedTarget(target, allowedTargets) {
  return allowedTargets.some(allowed => {
    const normalized = toPosix(String(allowed));
    if (!normalized.endsWith('/**')) return target === normalized;
    const directory = normalized.slice(0, -3).replace(/\/$/, '');
    return target === directory || target.startsWith(`${directory}/`);
  });
}

function unresolvedDynamicKey(entry) {
  return `${toPosix(String(entry.fromFile))}::${String(entry.expression).trim()}`;
}

const BUDGET_DIMENSIONS = Object.freeze([
  ['importerCount', 'maxImporterCount', 'importer-growth', 'importerFiles'],
  ['importCount', 'maxImportCount', 'import-growth', 'importerFiles'],
  ['typeImporterCount', 'maxTypeImporterCount', 'type-importer-growth', 'typeImporterFiles'],
  ['typeImportCount', 'maxTypeImportCount', 'type-import-growth', 'typeImporterFiles'],
  ['valueImporterCount', 'maxValueImporterCount', 'value-importer-growth', 'valueImporterFiles'],
  ['valueImportCount', 'maxValueImportCount', 'value-import-growth', 'valueImporterFiles'],
  ['dynamicImporterCount', 'maxDynamicImporterCount', 'dynamic-importer-growth', 'dynamicImporterFiles'],
  ['dynamicImportCount', 'maxDynamicImportCount', 'dynamic-import-growth', 'dynamicImporterFiles'],
]);

function matchingMigrationStatements(graph, fromFile, spec) {
  const statements = new Map();
  const expectedSymbols = new Set(spec.importedSymbols || []);
  for (const entry of graph.imports || []) {
    if (entry.fromFile !== fromFile || entry.toFile !== spec.toFile) continue;
    const statementKey = String(entry.statementKey || `${entry.fromFile}:${entry.toFile}:${statements.size}`);
    const statement = statements.get(statementKey) || { statementKey, entries: [] };
    statement.entries.push(entry);
    statements.set(statementKey, statement);
  }
  return [...statements.values()].filter(statement =>
    statement.entries.some(
      entry =>
        entry.importedSymbols.includes('*') ||
        entry.importedSymbols.some(symbol => expectedSymbols.has(symbol))
    )
  );
}

function matchingRemovedMigrationStatements(graph, fromFile, spec) {
  const expectedSymbols = new Set(spec.importedSymbols || []);
  return matchingMigrationStatements(graph, fromFile, spec).filter(statement =>
    statement.entries.some(
      entry =>
        entry.kind === spec.kind &&
        entry.syntax === spec.syntax &&
        (entry.importedSymbols.includes('*') ||
          entry.importedSymbols.some(symbol => expectedSymbols.has(symbol)))
    )
  );
}

function mixedMigrationStatementDetails(statement) {
  const kinds = [...new Set(statement.entries.map(entry => entry.kind))].sort();
  if (kinds.length <= 1) return null;
  return {
    statementKey: statement.statementKey,
    currentKinds: kinds,
    currentSyntaxes: [...new Set(statement.entries.map(entry => entry.syntax))].sort(),
    entries: statement.entries
      .map(entry => ({
        kind: entry.kind,
        syntax: entry.syntax,
        importedSymbols: [...(entry.importedSymbols || [])].sort(),
      }))
      .sort((left, right) => left.kind.localeCompare(right.kind)),
  };
}

function migrationImportFailureKind(field, count) {
  if (field === 'removedImport') return 'migration-legacy-import-restored';
  return count === 0 ? 'stale-migration-budget' : 'migration-budget-growth';
}

function statementHasAliases(statement) {
  return statement.entries.some(entry =>
    (entry.bindings || []).some(
      binding =>
        (binding.localName && binding.importedName && binding.localName !== binding.importedName) ||
        (binding.exportedName && binding.importedName && binding.exportedName !== binding.importedName)
    )
  );
}

function evaluateExactStatement({ graph, from, to, fromFile, spec, label, allowWildcard = false }) {
  const failures = [];
  const matches = matchingMigrationStatements(graph, fromFile, spec);
  if (matches.length !== 1) {
    failures.push({
      kind: matches.length === 0 ? `${label}-statement-missing` : `${label}-statement-growth`,
      from,
      to,
      fromFile,
      toFile: spec.toFile,
      current: matches.length,
      expected: 1,
    });
    return { failures, statement: null };
  }
  const statement = matches[0];
  const mixedDetails = mixedMigrationStatementDetails(statement);
  if (mixedDetails) {
    failures.push({
      kind: `${label}-mixed-kind-drift`,
      from,
      to,
      fromFile,
      toFile: spec.toFile,
      ...mixedDetails,
    });
    return { failures, statement: null };
  }
  const [match] = statement.entries;
  if (match.kind !== spec.kind) {
    failures.push({
      kind: `${label}-kind-drift`,
      from,
      to,
      fromFile,
      toFile: spec.toFile,
      currentKind: match.kind,
      expectedKind: spec.kind,
    });
  }
  if (match.syntax !== spec.syntax) {
    failures.push({
      kind: `${label}-syntax-drift`,
      from,
      to,
      fromFile,
      toFile: spec.toFile,
      currentSyntax: match.syntax,
      expectedSyntax: spec.syntax,
    });
  }
  if (!sameStringList(match.importedSymbols, spec.importedSymbols)) {
    failures.push({
      kind: `${label}-symbol-drift`,
      from,
      to,
      fromFile,
      toFile: spec.toFile,
      currentSymbols: [...(match.importedSymbols || [])].sort(),
      expectedSymbols: [...(spec.importedSymbols || [])].sort(),
    });
  }
  if (!allowWildcard && (match.importedSymbols || []).includes('*')) {
    failures.push({ kind: `${label}-wildcard-not-approved`, from, to, fromFile, toFile: spec.toFile });
  }
  if (statementHasAliases(statement)) {
    failures.push({ kind: `${label}-alias-drift`, from, to, fromFile, toFile: spec.toFile });
  }
  return { failures, statement: failures.length === 0 ? statement : null };
}

function addApprovedStatement(approvedStatements, from, to, statement) {
  const [entry] = statement.entries;
  const edge = edgeKey(from, to);
  const current = approvedStatements.get(edge) || {
    all: new Set(),
    type: new Set(),
    value: new Set(),
    dynamic: new Set(),
  };
  current.all.add(entry.statementKey);
  current[entry.kind].add(entry.statementKey);
  approvedStatements.set(edge, current);
}

function evaluateCompatibilityBudgets(graph, contract, { currentDateMs, currentDate }) {
  const failures = [];
  const approvedStatements = new Map();
  const statuses = [];
  for (const budget of contract.compatibilityBudgets) {
    const fromFile = toPosix(String(budget.fromFile));
    const result = evaluateExactStatement({
      graph,
      from: budget.from,
      to: budget.to,
      fromFile,
      spec: budget.statement,
      label: 'compatibility-budget',
      allowWildcard: budget.allowWildcard === true,
    });
    const statementFailures = result.failures.map(failure => ({
      ...failure,
      compatibilityBudgetId: budget.id,
    }));
    failures.push(...statementFailures);

    const reviewedAtMs = parseIsoDateOnly(budget.reviewedAt, `compatibility budget ${budget.id}.reviewedAt`);
    const nextReviewByMs = parseIsoDateOnly(
      budget.nextReviewBy,
      `compatibility budget ${budget.id}.nextReviewBy`
    );
    const reviewEffective = currentDateMs >= reviewedAtMs;
    const reviewOverdue = currentDateMs > nextReviewByMs;
    const lifecycleDetails = {
      compatibilityBudgetId: budget.id,
      reviewedAt: budget.reviewedAt,
      nextReviewBy: budget.nextReviewBy,
      currentDate,
      fromFile,
      toFile: budget.statement.toFile,
    };
    if (!reviewEffective) {
      failures.push({ kind: 'compatibility-review-not-effective-yet', ...lifecycleDetails });
    }
    if (reviewOverdue) {
      failures.push({ kind: 'stale-compatibility-review', ...lifecycleDetails });
    }

    const statementValid = statementFailures.length === 0;
    const ownershipEffective = statementValid && reviewEffective;
    const active = ownershipEffective && !reviewOverdue;
    if (ownershipEffective && result.statement) {
      addApprovedStatement(approvedStatements, budget.from, budget.to, result.statement);
    }
    statuses.push({
      id: budget.id,
      from: budget.from,
      to: budget.to,
      fromFile,
      target: budget.statement.toFile,
      reviewedAt: budget.reviewedAt,
      nextReviewBy: budget.nextReviewBy,
      currentDate,
      statementValid,
      reviewEffective,
      reviewOverdue,
      ownershipEffective,
      active,
    });
  }
  return { failures, approvedStatements, statuses };
}

function evaluateReviewedOwnershipBudgets(graph, contract, { currentDateMs, currentDate }) {
  const failures = [];
  const approvedStatements = new Map();
  const statuses = [];
  for (const budget of contract.reviewedOwnershipBudgets) {
    const fromFile = toPosix(String(budget.fromFile));
    const result = evaluateExactStatement({
      graph,
      from: budget.from,
      to: budget.to,
      fromFile,
      spec: budget.statement,
      label: 'reviewed-ownership-budget',
      allowWildcard: false,
    });
    const statementFailures = result.failures.map(failure => ({
      ...failure,
      reviewedOwnershipBudgetId: budget.id,
    }));
    failures.push(...statementFailures);

    const reviewedAtMs = parseIsoDateOnly(
      budget.reviewedAt,
      `reviewed ownership budget ${budget.id}.reviewedAt`
    );
    const nextReviewByMs = parseIsoDateOnly(
      budget.nextReviewBy,
      `reviewed ownership budget ${budget.id}.nextReviewBy`
    );
    const reviewEffective = currentDateMs >= reviewedAtMs;
    const reviewOverdue = currentDateMs > nextReviewByMs;
    const lifecycleDetails = {
      reviewedOwnershipBudgetId: budget.id,
      reviewedAt: budget.reviewedAt,
      nextReviewBy: budget.nextReviewBy,
      currentDate,
      fromFile,
      toFile: budget.statement.toFile,
    };
    if (!reviewEffective) {
      failures.push({ kind: 'reviewed-ownership-review-not-effective-yet', ...lifecycleDetails });
    }
    if (reviewOverdue) {
      failures.push({ kind: 'stale-reviewed-ownership-review', ...lifecycleDetails });
    }

    const missingEvidenceContracts = budget.evidenceContracts
      .filter(evidenceContract => !fs.existsSync(path.resolve(process.cwd(), evidenceContract.path)))
      .map(evidenceContract => evidenceContract.path);
    const evidenceHashMismatches = budget.evidenceContracts.flatMap(evidenceContract => {
      const absoluteFile = path.resolve(process.cwd(), evidenceContract.path);
      if (!fs.existsSync(absoluteFile)) return [];
      const actualSha256 = sha256File(absoluteFile);
      return actualSha256 === evidenceContract.sha256
        ? []
        : [
            {
              path: evidenceContract.path,
              expectedSha256: evidenceContract.sha256,
              actualSha256,
            },
          ];
    });
    const evidenceContractsValid =
      missingEvidenceContracts.length === 0 && evidenceHashMismatches.length === 0;
    if (missingEvidenceContracts.length > 0) {
      failures.push({
        kind: 'reviewed-ownership-evidence-contract-missing',
        reviewedOwnershipBudgetId: budget.id,
        missingEvidenceContracts,
      });
    }
    if (evidenceHashMismatches.length > 0) {
      failures.push({
        kind: 'reviewed-ownership-evidence-contract-hash-mismatch',
        reviewedOwnershipBudgetId: budget.id,
        evidenceHashMismatches,
      });
    }

    const statementValid = statementFailures.length === 0;
    const ownershipEffective = statementValid && evidenceContractsValid && reviewEffective;
    const active = ownershipEffective && !reviewOverdue;
    if (ownershipEffective && result.statement) {
      addApprovedStatement(approvedStatements, budget.from, budget.to, result.statement);
    }
    statuses.push({
      id: budget.id,
      from: budget.from,
      to: budget.to,
      fromFile,
      target: budget.statement.toFile,
      reviewedAt: budget.reviewedAt,
      nextReviewBy: budget.nextReviewBy,
      currentDate,
      statementValid,
      evidenceContractsValid,
      reviewEffective,
      reviewOverdue,
      ownershipEffective,
      active,
    });
  }
  return { failures, approvedStatements, statuses };
}

function evaluateConsolidationProvenance(graph, consolidation) {
  const provenance = consolidation.replacementProvenance;
  const ownerGraph = collectResolvedFileModuleGraph(provenance.ownerFile, graph.sourceFiles || null);
  const failures = [];
  if (!ownerGraph.exists) {
    failures.push({
      kind: 'migration-consolidation-provenance-owner-missing',
      consolidationId: consolidation.id,
      ownerFile: provenance.ownerFile,
    });
    return { valid: false, failures, ownerGraph, sourceStatementStatuses: [] };
  }

  const sourceStatementStatuses = [];
  const ownedStatementKeys = new Set();
  for (const sourceStatement of provenance.sourceStatements) {
    const result = evaluateExactStatement({
      graph: ownerGraph,
      from: consolidation.to,
      to: consolidation.to,
      fromFile: provenance.ownerFile,
      spec: sourceStatement,
      label: 'migration-consolidation-provenance-source',
      allowWildcard: sourceStatement.allowWildcard === true,
    });
    const sourceFailures = result.failures.map(failure => ({
      ...failure,
      consolidationId: consolidation.id,
      ownerFile: provenance.ownerFile,
    }));
    failures.push(...sourceFailures);
    if (result.statement) ownedStatementKeys.add(result.statement.statementKey);
    if (provenance.mode === 'identity-reexport' && sourceStatement.syntax !== 'static-re-export') {
      failures.push({
        kind: 'migration-consolidation-provenance-identity-syntax-drift',
        consolidationId: consolidation.id,
        ownerFile: provenance.ownerFile,
        toFile: sourceStatement.toFile,
        currentSyntax: sourceStatement.syntax,
        expectedSyntax: 'static-re-export',
      });
    }
    sourceStatementStatuses.push({
      toFile: sourceStatement.toFile,
      kind: sourceStatement.kind,
      syntax: sourceStatement.syntax,
      importedSymbols: [...sourceStatement.importedSymbols],
      valid: sourceFailures.length === 0,
    });
  }

  const observedStatementKeys = new Set(ownerGraph.imports.map(entry => entry.statementKey));
  const extraStatementKeys = [...observedStatementKeys].filter(key => !ownedStatementKeys.has(key));
  if (extraStatementKeys.length > 0) {
    failures.push({
      kind: 'migration-consolidation-provenance-extra-source-dependency',
      consolidationId: consolidation.id,
      ownerFile: provenance.ownerFile,
      statementKeys: extraStatementKeys.sort(),
    });
  }

  const ownerExports = collectNamedModuleExports(provenance.ownerFile, ownerGraph.sourceText)
    .filter(entry => entry.kind === consolidation.replacementStatement.kind)
    .map(entry => entry.exportedName)
    .filter(Boolean)
    .sort();
  if (!sameStringList(ownerExports, consolidation.replacementStatement.importedSymbols)) {
    failures.push({
      kind: 'migration-consolidation-provenance-export-drift',
      consolidationId: consolidation.id,
      ownerFile: provenance.ownerFile,
      currentSymbols: ownerExports,
      expectedSymbols: [...consolidation.replacementStatement.importedSymbols].sort(),
    });
  }

  const absorbedCoverage = new Map();
  for (const statement of consolidation.absorbedStatements) {
    const key = statementCoverageKey(statement);
    absorbedCoverage.set(key, (absorbedCoverage.get(key) || 0) + 1);
  }
  const sourceCoverage = new Map();
  for (const statement of provenance.sourceStatements) {
    const key = statementCoverageKey(statement);
    sourceCoverage.set(key, (sourceCoverage.get(key) || 0) + 1);
  }
  const coverageMismatch =
    [...absorbedCoverage].some(([key, count]) => count !== 1 || sourceCoverage.get(key) !== 1) ||
    [...sourceCoverage].some(([key, count]) => count !== 1 || absorbedCoverage.get(key) !== 1);
  const absorbedSymbols = unionStatementSymbols(consolidation.absorbedStatements);
  const sourceSymbols = unionStatementSymbols(provenance.sourceStatements);
  const identitySymbolMismatch =
    provenance.mode === 'identity-reexport' &&
    (!sameStringList(absorbedSymbols, sourceSymbols) ||
      !sameStringList(sourceSymbols, consolidation.replacementStatement.importedSymbols));
  if (coverageMismatch || identitySymbolMismatch) {
    failures.push({
      kind: 'migration-consolidation-provenance-mismatch',
      consolidationId: consolidation.id,
      ownerFile: provenance.ownerFile,
      absorbedSymbols,
      sourceSymbols,
      replacementSymbols: [...consolidation.replacementStatement.importedSymbols].sort(),
    });
  }

  if (provenance.mode === 'identity-reexport') {
    const invalidTopLevel = (ownerGraph.sourceFile?.body || []).filter(
      node =>
        !((node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') && node.source)
    );
    if (invalidTopLevel.length > 0) {
      failures.push({
        kind: 'migration-consolidation-provenance-identity-owner-body-drift',
        consolidationId: consolidation.id,
        ownerFile: provenance.ownerFile,
        statementTypes: invalidTopLevel.map(node => node.type),
      });
    }
  }

  return {
    valid: failures.length === 0,
    failures,
    ownerGraph,
    sourceStatementStatuses,
  };
}

function evaluateMigrationConsolidations(
  graph,
  contract,
  { currentDateMs, currentDate, compatibilityStatementKeys }
) {
  const statuses = [];
  const byId = new Map();
  for (const consolidation of contract.migrationConsolidations) {
    const fromFile = toPosix(String(consolidation.fromFile));
    const retirementEffective =
      currentDateMs >=
      parseIsoDateOnly(consolidation.retiredAt, `migration consolidation ${consolidation.id}.retiredAt`);
    const groupFailures = [];
    if (!retirementEffective) {
      groupFailures.push({
        kind: 'migration-consolidation-not-effective-yet',
        consolidationId: consolidation.id,
        entryNumbers: [...consolidation.entryNumbers],
        retiredAt: consolidation.retiredAt,
        currentDate,
        fromFile,
      });
    }

    let absorbedStatementsValid = true;
    for (const absorbedStatement of consolidation.absorbedStatements) {
      const matches = matchingMigrationStatements(graph, fromFile, absorbedStatement);
      if (matches.length === 0) continue;
      absorbedStatementsValid = false;
      groupFailures.push({
        kind: 'migration-consolidation-absorbed-statement-still-present',
        consolidationId: consolidation.id,
        entryNumbers: [...consolidation.entryNumbers],
        from: consolidation.from,
        to: consolidation.to,
        fromFile,
        toFile: absorbedStatement.toFile,
        importKind: absorbedStatement.kind,
        syntax: absorbedStatement.syntax,
        importedSymbols: [...absorbedStatement.importedSymbols],
        current: matches.length,
        expected: 0,
      });
    }

    const replacementResult = evaluateExactStatement({
      graph,
      from: consolidation.from,
      to: consolidation.to,
      fromFile,
      spec: consolidation.replacementStatement,
      label: 'migration-consolidation-replacement',
      allowWildcard: consolidation.replacementStatement.allowWildcard === true,
    });
    const replacementFailures = replacementResult.failures.map(failure => ({
      ...failure,
      consolidationId: consolidation.id,
      entryNumbers: [...consolidation.entryNumbers],
    }));
    groupFailures.push(...replacementFailures);
    const replacementStatementValid = replacementFailures.length === 0;

    const provenanceResult = evaluateConsolidationProvenance(graph, consolidation);
    groupFailures.push(...provenanceResult.failures);
    const replacementProvenanceValid = provenanceResult.valid;

    const missingEvidenceContracts = consolidation.evidenceContracts
      .filter(evidenceContract => !fs.existsSync(path.resolve(process.cwd(), evidenceContract.path)))
      .map(evidenceContract => evidenceContract.path);
    const evidenceHashMismatches = consolidation.evidenceContracts.flatMap(evidenceContract => {
      const absoluteFile = path.resolve(process.cwd(), evidenceContract.path);
      if (!fs.existsSync(absoluteFile)) return [];
      const actualSha256 = sha256File(absoluteFile);
      return actualSha256 === evidenceContract.sha256
        ? []
        : [
            {
              path: evidenceContract.path,
              expectedSha256: evidenceContract.sha256,
              actualSha256,
            },
          ];
    });
    const evidenceContractsValid =
      missingEvidenceContracts.length === 0 && evidenceHashMismatches.length === 0;
    if (missingEvidenceContracts.length > 0) {
      groupFailures.push({
        kind: 'migration-consolidation-evidence-contract-missing',
        consolidationId: consolidation.id,
        missingEvidenceContracts,
      });
    }
    if (evidenceHashMismatches.length > 0) {
      groupFailures.push({
        kind: 'migration-consolidation-evidence-contract-hash-mismatch',
        consolidationId: consolidation.id,
        evidenceHashMismatches,
      });
    }

    const replacementKey = exactStatementSpecKey(
      consolidation.from,
      consolidation.to,
      fromFile,
      consolidation.replacementStatement
    );
    const ownershipConflicts = [];
    if (compatibilityStatementKeys.has(replacementKey)) {
      const conflict = {
        kind: 'migration-consolidation-compatibility-ownership-conflict',
        consolidationId: consolidation.id,
        fromFile,
        toFile: consolidation.replacementStatement.toFile,
      };
      ownershipConflicts.push(conflict);
      groupFailures.push(conflict);
    }

    const status = {
      consolidationId: consolidation.id,
      entryNumbers: [...consolidation.entryNumbers],
      from: consolidation.from,
      to: consolidation.to,
      fromFile,
      retiredAt: consolidation.retiredAt,
      currentDate,
      retirementEffective,
      absorbedStatementsValid,
      replacementStatementValid,
      replacementProvenanceValid,
      evidenceContractsValid,
      ownershipConflicts,
      active: false,
      valid: false,
      replacementStatement: {
        fromFile,
        toFile: consolidation.replacementStatement.toFile,
        kind: consolidation.replacementStatement.kind,
        syntax: consolidation.replacementStatement.syntax,
        importedSymbols: [...consolidation.replacementStatement.importedSymbols],
      },
      absorbedStatements: consolidation.absorbedStatements.map(statement => ({
        fromFile: toPosix(String(statement.fromFile)),
        toFile: statement.toFile,
        kind: statement.kind,
        syntax: statement.syntax,
        importedSymbols: [...statement.importedSymbols],
      })),
      replacementProvenance: {
        mode: consolidation.replacementProvenance.mode,
        ownerFile: consolidation.replacementProvenance.ownerFile,
        sourceStatements: consolidation.replacementProvenance.sourceStatements.map(statement => ({
          toFile: statement.toFile,
          kind: statement.kind,
          syntax: statement.syntax,
          importedSymbols: [...statement.importedSymbols],
        })),
        sourceStatementStatuses: provenanceResult.sourceStatementStatuses,
      },
      evidenceContracts: consolidation.evidenceContracts.map(evidenceContract => ({ ...evidenceContract })),
      failures: groupFailures,
      replacementKey,
      replacementMatch: replacementResult.statement,
    };
    status.valid = groupFailures.length === 0;
    status.active = status.valid;
    statuses.push(status);
    byId.set(consolidation.id, status);
  }
  return { statuses, byId };
}

function evaluateMigrationBudgets(graph, contract, { currentDate } = {}) {
  const failures = [];
  const approvedStatements = new Map();
  const consolidationApprovedStatements = new Map();
  const statuses = [];
  const currentDateMs = evaluationDateTimestamp(currentDate);
  const currentDateLabel = isoDateOnlyFromTimestamp(currentDateMs);
  const retirements = new Map(contract.migrationRetirements.map(entry => [entry.entryNumber, entry]));
  const compatibilityById = new Map(contract.compatibilityBudgets.map(entry => [entry.id, entry]));
  const reviewedOwnershipById = new Map(contract.reviewedOwnershipBudgets.map(entry => [entry.id, entry]));
  const compatibilityEvaluation = evaluateCompatibilityBudgets(graph, contract, {
    currentDateMs,
    currentDate: currentDateLabel,
  });
  const reviewedOwnershipEvaluation = evaluateReviewedOwnershipBudgets(graph, contract, {
    currentDateMs,
    currentDate: currentDateLabel,
  });
  const compatibilityStatementKeys = new Set(
    contract.compatibilityBudgets.map(budget =>
      exactStatementSpecKey(budget.from, budget.to, budget.fromFile, budget.statement)
    )
  );
  const consolidationEvaluation = evaluateMigrationConsolidations(graph, contract, {
    currentDateMs,
    currentDate: currentDateLabel,
    compatibilityStatementKeys,
  });
  const reviewedOwnershipStatusById = new Map(
    reviewedOwnershipEvaluation.statuses.map(status => [status.id, status])
  );
  const records = [];

  for (const [index, budget] of contract.migrationBudgets.entries()) {
    const entryNumber = index + 1;
    const retirement = retirements.get(entryNumber) || null;
    const fromFile = toPosix(String(budget.fromFile));
    const baseFailures = [];
    const retirementFailures = [];
    const removedMatches = matchingRemovedMigrationStatements(graph, fromFile, budget.removedImport);
    if (removedMatches.length > 0) {
      baseFailures.push({
        kind: 'migration-legacy-import-restored',
        entryNumber,
        from: budget.from,
        to: budget.to,
        fromFile,
        field: 'removedImport',
        toFile: budget.removedImport.toFile,
        current: removedMatches.length,
        expected: 0,
      });
    }

    let retirementEffective = false;
    let retirementValid = false;
    let consolidationStatus = null;
    if (retirement) {
      const retiredAtMs = parseIsoDateOnly(
        retirement.retiredAt,
        `migration retirement Entry ${entryNumber}.retiredAt`
      );
      retirementEffective = currentDateMs >= retiredAtMs;
      if (retirement.mode === 'statement-consolidated') {
        consolidationStatus = consolidationEvaluation.byId.get(retirement.replacementConsolidationId) || null;
        retirementEffective = consolidationStatus?.retirementEffective === true;
      } else if (!retirementEffective) {
        retirementFailures.push({
          kind: 'migration-retirement-not-effective-yet',
          entryNumber,
          retiredAt: retirement.retiredAt,
          currentDate: currentDateLabel,
          fromFile,
          toFile: budget.addedImport.toFile,
        });
      } else if (retirement.mode === 'ownership-transferred') {
        const compatibility = compatibilityById.get(retirement.replacementCompatibilityBudgetId);
        const matchesReplacement =
          compatibility &&
          exactStatementSpecKey(
            compatibility.from,
            compatibility.to,
            compatibility.fromFile,
            compatibility.statement
          ) === exactStatementSpecKey(budget.from, budget.to, fromFile, budget.addedImport);
        if (!matchesReplacement) {
          retirementFailures.push({
            kind: 'migration-retirement-compatibility-mismatch',
            entryNumber,
            compatibilityBudgetId: retirement.replacementCompatibilityBudgetId,
          });
        }
      } else if (retirement.mode === 'ownership-reviewed') {
        const reviewedOwnership = reviewedOwnershipById.get(retirement.replacementReviewedOwnershipBudgetId);
        const reviewedStatus = reviewedOwnershipStatusById.get(
          retirement.replacementReviewedOwnershipBudgetId
        );
        const matchesReplacement =
          reviewedOwnership &&
          exactStatementSpecKey(
            reviewedOwnership.from,
            reviewedOwnership.to,
            reviewedOwnership.fromFile,
            reviewedOwnership.statement
          ) === exactStatementSpecKey(budget.from, budget.to, fromFile, budget.addedImport);
        if (!matchesReplacement) {
          retirementFailures.push({
            kind: 'migration-retirement-reviewed-ownership-mismatch',
            entryNumber,
            reviewedOwnershipBudgetId: retirement.replacementReviewedOwnershipBudgetId,
          });
        }
        if (!reviewedStatus?.ownershipEffective) {
          retirementFailures.push({
            kind: 'migration-retirement-reviewed-ownership-not-effective',
            entryNumber,
            reviewedOwnershipBudgetId: retirement.replacementReviewedOwnershipBudgetId,
          });
        }
      } else if (retirement.mode === 'statement-removed') {
        const addedMatches = matchingMigrationStatements(graph, fromFile, budget.addedImport);
        if (addedMatches.length !== 0) {
          retirementFailures.push({
            kind: 'migration-retirement-statement-still-present',
            entryNumber,
            fromFile,
            toFile: budget.addedImport.toFile,
            current: addedMatches.length,
            expected: 0,
          });
        }
      }
      retirementValid =
        retirement.mode === 'statement-consolidated'
          ? consolidationStatus?.valid === true && baseFailures.length === 0
          : retirementEffective && retirementFailures.length === 0 && baseFailures.length === 0;
    }

    records.push({
      entryNumber,
      budget,
      retirement,
      fromFile,
      baseFailures,
      retirementFailures,
      retirementEffective,
      retirementValid,
      consolidationStatus,
    });
  }

  for (const groupStatus of consolidationEvaluation.statuses) {
    if (!groupStatus.valid) continue;
    const groupRecords = groupStatus.entryNumbers.map(entryNumber => records[entryNumber - 1]);
    if (groupRecords.some(record => record.baseFailures.length > 0)) {
      groupStatus.valid = false;
      groupStatus.active = false;
      for (const record of groupRecords) record.retirementValid = false;
    }
  }

  // Resolve consolidation ownership against the final active-debt set. Invalidating one group can make
  // its historical Entries active owners for another group, so converge without partial retirement.
  let ownershipChanged = true;
  while (ownershipChanged) {
    ownershipChanged = false;
    const activeMigrationOwners = new Map();
    for (const record of records) {
      if (record.retirementValid) continue;
      const key = exactStatementSpecKey(
        record.budget.from,
        record.budget.to,
        record.fromFile,
        record.budget.addedImport
      );
      const owners = activeMigrationOwners.get(key) || [];
      owners.push(record.entryNumber);
      activeMigrationOwners.set(key, owners);
    }
    for (const groupStatus of consolidationEvaluation.statuses) {
      if (!groupStatus.valid) continue;
      const activeOwners = (activeMigrationOwners.get(groupStatus.replacementKey) || []).filter(
        entryNumber => !groupStatus.entryNumbers.includes(entryNumber)
      );
      if (activeOwners.length === 0) continue;
      const conflict = {
        kind: 'migration-consolidation-active-migration-ownership-conflict',
        consolidationId: groupStatus.consolidationId,
        activeMigrationEntryNumbers: activeOwners,
        fromFile: groupStatus.fromFile,
        toFile: groupStatus.replacementStatement.toFile,
      };
      groupStatus.ownershipConflicts.push(conflict);
      groupStatus.failures.push(conflict);
      groupStatus.valid = false;
      groupStatus.active = false;
      for (const entryNumber of groupStatus.entryNumbers) {
        records[entryNumber - 1].retirementValid = false;
      }
      ownershipChanged = true;
    }
  }

  for (const groupStatus of consolidationEvaluation.statuses) {
    if (!groupStatus.valid || !groupStatus.replacementMatch) continue;
    addApprovedStatement(
      consolidationApprovedStatements,
      groupStatus.from,
      groupStatus.to,
      groupStatus.replacementMatch
    );
  }

  const activeStatementOwners = new Map();
  for (const record of records) {
    const { entryNumber, budget, retirement, fromFile, baseFailures, retirementFailures } = record;
    const edge = edgeKey(budget.from, budget.to);
    if (record.retirementValid) {
      const entryFailures = [...baseFailures, ...retirementFailures];
      failures.push(...entryFailures);
      statuses.push({
        entryNumber,
        from: budget.from,
        to: budget.to,
        fromFile,
        addedTarget: budget.addedImport.toFile,
        reviewBy: budget.reviewBy,
        active: false,
        retired: true,
        retirementEffective: true,
        retirementMode: retirement.mode,
        replacementCompatibilityBudgetId: retirement.replacementCompatibilityBudgetId ?? null,
        replacementConsolidationId: retirement.replacementConsolidationId ?? null,
        replacementReviewedOwnershipBudgetId: retirement.replacementReviewedOwnershipBudgetId ?? null,
        statementValid: true,
        valid: entryFailures.length === 0,
      });
      continue;
    }

    const activeBudgetFailures = [...baseFailures];
    if (currentDateMs > parseIsoDateOnly(budget.reviewBy, `${fromFile}.reviewBy`)) {
      activeBudgetFailures.push({
        kind: 'stale-migration-review',
        from: budget.from,
        to: budget.to,
        fromFile,
        reviewedAt: budget.reviewedAt,
        reviewBy: budget.reviewBy,
      });
    }
    const addedMatches = matchingMigrationStatements(graph, fromFile, budget.addedImport);
    const companionMatches = matchingMigrationStatements(graph, fromFile, budget.companionImport);

    for (const [field, matches, expected] of [
      ['addedImport', addedMatches, budget.addedImport],
      ['companionImport', companionMatches, budget.companionImport],
    ]) {
      if (matches.length !== 1) {
        activeBudgetFailures.push({
          kind: migrationImportFailureKind(field, matches.length),
          from: budget.from,
          to: budget.to,
          fromFile,
          field,
          toFile: expected.toFile,
          importKind: expected.kind,
          current: matches.length,
          expected: 1,
        });
        continue;
      }
      const statement = matches[0];
      const mixedDetails = mixedMigrationStatementDetails(statement);
      if (mixedDetails) {
        activeBudgetFailures.push({
          kind: 'migration-import-mixed-kind-drift',
          from: budget.from,
          to: budget.to,
          fromFile,
          field,
          toFile: expected.toFile,
          expectedKind: expected.kind,
          expectedSyntax: expected.syntax,
          ...mixedDetails,
        });
        continue;
      }
      const [match] = statement.entries;
      if (match.syntax !== expected.syntax) {
        activeBudgetFailures.push({
          kind: 'migration-import-syntax-drift',
          from: budget.from,
          to: budget.to,
          fromFile,
          field,
          toFile: expected.toFile,
          currentSyntax: match.syntax,
          expectedSyntax: expected.syntax,
        });
        continue;
      }
      if (match.kind !== expected.kind) {
        activeBudgetFailures.push({
          kind: 'migration-import-kind-drift',
          from: budget.from,
          to: budget.to,
          fromFile,
          field,
          toFile: expected.toFile,
          currentKind: match.kind,
          expectedKind: expected.kind,
        });
        continue;
      }
      if (!sameStringList(match.importedSymbols, expected.importedSymbols)) {
        activeBudgetFailures.push({
          kind: 'migration-import-symbol-drift',
          from: budget.from,
          to: budget.to,
          fromFile,
          field,
          toFile: expected.toFile,
          importKind: expected.kind,
          currentSymbols: [...(match.importedSymbols || [])].sort(),
          expectedSymbols: [...expected.importedSymbols].sort(),
        });
        continue;
      }
      if (field === 'addedImport') {
        activeStatementOwners.set(`${edge}::${match.statementKey}`, entryNumber);
      }
    }

    const statementBudgetValid = activeBudgetFailures.length === 0;
    if (statementBudgetValid) {
      addApprovedStatement(approvedStatements, budget.from, budget.to, addedMatches[0]);
    }
    const groupFailures = record.consolidationStatus?.failures || [];
    const entryFailures = [...retirementFailures, ...activeBudgetFailures];
    failures.push(...entryFailures);
    statuses.push({
      entryNumber,
      from: budget.from,
      to: budget.to,
      fromFile,
      addedTarget: budget.addedImport.toFile,
      reviewBy: budget.reviewBy,
      active: true,
      retired: false,
      retirementEffective: retirement ? record.retirementEffective : null,
      retirementMode: retirement?.mode || null,
      replacementCompatibilityBudgetId: retirement?.replacementCompatibilityBudgetId ?? null,
      replacementConsolidationId: retirement?.replacementConsolidationId ?? null,
      replacementReviewedOwnershipBudgetId: retirement?.replacementReviewedOwnershipBudgetId ?? null,
      statementValid: statementBudgetValid,
      consolidationValid: record.consolidationStatus ? record.consolidationStatus.valid : null,
      valid: entryFailures.length === 0 && groupFailures.length === 0,
    });
  }

  for (const groupStatus of consolidationEvaluation.statuses) {
    failures.push(...groupStatus.failures);
  }
  failures.push(...compatibilityEvaluation.failures);
  failures.push(...reviewedOwnershipEvaluation.failures);
  for (const [index, budget] of contract.compatibilityBudgets.entries()) {
    if (!compatibilityEvaluation.statuses[index]?.ownershipEffective) continue;
    const matches = matchingMigrationStatements(graph, toPosix(String(budget.fromFile)), budget.statement);
    if (matches.length !== 1) continue;
    const ownerKey = `${edgeKey(budget.from, budget.to)}::${matches[0].statementKey}`;
    const migrationEntryNumber = activeStatementOwners.get(ownerKey);
    if (migrationEntryNumber) {
      failures.push({
        kind: 'compatibility-active-migration-ownership-conflict',
        compatibilityBudgetId: budget.id,
        migrationEntryNumber,
        fromFile: budget.fromFile,
        toFile: budget.statement.toFile,
      });
    }
  }

  for (const [index, budget] of contract.reviewedOwnershipBudgets.entries()) {
    const status = reviewedOwnershipEvaluation.statuses[index];
    if (!status?.ownershipEffective) continue;
    const matches = matchingMigrationStatements(graph, toPosix(String(budget.fromFile)), budget.statement);
    if (matches.length !== 1) continue;
    const ownerKey = `${edgeKey(budget.from, budget.to)}::${matches[0].statementKey}`;
    const migrationEntryNumber = activeStatementOwners.get(ownerKey);
    if (migrationEntryNumber) {
      failures.push({
        kind: 'reviewed-ownership-active-migration-conflict',
        reviewedOwnershipBudgetId: budget.id,
        migrationEntryNumber,
        fromFile: budget.fromFile,
        toFile: budget.statement.toFile,
      });
    }
  }

  return {
    failures,
    approvedStatements,
    compatibilityApprovedStatements: compatibilityEvaluation.approvedStatements,
    reviewedOwnershipApprovedStatements: reviewedOwnershipEvaluation.approvedStatements,
    consolidationApprovedStatements,
    statuses,
    compatibilityStatuses: compatibilityEvaluation.statuses,
    reviewedOwnershipStatuses: reviewedOwnershipEvaluation.statuses,
    consolidationStatuses: consolidationEvaluation.statuses.map(
      ({ replacementKey, replacementMatch, failures: _, ...status }) => status
    ),
  };
}

function edgeWithApprovedStatementsExcluded(edge, approvedStatements) {
  const approved = approvedStatements.get(edgeKey(edge.from, edge.to));
  if (!approved) return edge;
  return {
    ...edge,
    importCount: edge.importCount - approved.all.size,
    typeImportCount: edge.typeImportCount - approved.type.size,
    valueImportCount: edge.valueImportCount - approved.value.size,
    dynamicImportCount: edge.dynamicImportCount - approved.dynamic.size,
  };
}

function mergeApprovedStatements(...collections) {
  const merged = new Map();
  for (const collection of collections) {
    for (const [edge, approved] of collection || []) {
      const current = merged.get(edge) || {
        all: new Set(),
        type: new Set(),
        value: new Set(),
        dynamic: new Set(),
      };
      for (const kind of ['all', 'type', 'value', 'dynamic']) {
        for (const statement of approved[kind] || []) current[kind].add(statement);
      }
      merged.set(edge, current);
    }
  }
  return merged;
}

function approvedStatementCount(collection, edge, kind = 'all') {
  return collection.get(edgeKey(edge.from, edge.to))?.[kind]?.size || 0;
}

function edgeOwnershipReport(edge, rule, migrationEvaluation) {
  const merged = mergeApprovedStatements(
    migrationEvaluation.approvedStatements,
    migrationEvaluation.compatibilityApprovedStatements,
    migrationEvaluation.reviewedOwnershipApprovedStatements,
    migrationEvaluation.consolidationApprovedStatements
  );
  const mergedForEdge = merged.get(edgeKey(edge.from, edge.to));
  const reviewedGeneralStatements = edge.importCount - (mergedForEdge?.all.size || 0);
  const reviewedGeneralValueStatements = edge.valueImportCount - (mergedForEdge?.value.size || 0);
  const reviewedGeneralTypeStatements = edge.typeImportCount - (mergedForEdge?.type.size || 0);
  return {
    ...edge,
    observedStatements: edge.importCount,
    activeMigrationStatements: approvedStatementCount(migrationEvaluation.approvedStatements, edge),
    compatibilityStatements: approvedStatementCount(
      migrationEvaluation.compatibilityApprovedStatements,
      edge
    ),
    consolidationStatements: approvedStatementCount(
      migrationEvaluation.consolidationApprovedStatements,
      edge
    ),
    reviewedOwnershipStatements: approvedStatementCount(
      migrationEvaluation.reviewedOwnershipApprovedStatements,
      edge
    ),
    reviewedGeneralStatements,
    generalBudget: rule?.maxImportCount ?? null,
    observedValueStatements: edge.valueImportCount,
    activeMigrationValueStatements: approvedStatementCount(
      migrationEvaluation.approvedStatements,
      edge,
      'value'
    ),
    compatibilityValueStatements: approvedStatementCount(
      migrationEvaluation.compatibilityApprovedStatements,
      edge,
      'value'
    ),
    consolidationValueStatements: approvedStatementCount(
      migrationEvaluation.consolidationApprovedStatements,
      edge,
      'value'
    ),
    reviewedOwnershipValueStatements: approvedStatementCount(
      migrationEvaluation.reviewedOwnershipApprovedStatements,
      edge,
      'value'
    ),
    reviewedGeneralValueStatements,
    generalValueBudget: rule?.maxValueImportCount ?? null,
    observedTypeStatements: edge.typeImportCount,
    activeMigrationTypeStatements: approvedStatementCount(
      migrationEvaluation.approvedStatements,
      edge,
      'type'
    ),
    compatibilityTypeStatements: approvedStatementCount(
      migrationEvaluation.compatibilityApprovedStatements,
      edge,
      'type'
    ),
    consolidationTypeStatements: approvedStatementCount(
      migrationEvaluation.consolidationApprovedStatements,
      edge,
      'type'
    ),
    reviewedOwnershipTypeStatements: approvedStatementCount(
      migrationEvaluation.reviewedOwnershipApprovedStatements,
      edge,
      'type'
    ),
    reviewedGeneralTypeStatements,
    generalTypeBudget: rule?.maxTypeImportCount ?? null,
  };
}

const migrationEvaluationOverride = Symbol('migrationEvaluationOverride');

export function evaluateLayerContract(graph, contract, options = {}) {
  validateLayerContractSchema(contract);
  const ruleMap = new Map(contract.rules.map(rule => [edgeKey(rule.from, rule.to), rule]));
  const currentMap = new Map(graph.edges.map(edge => [edgeKey(edge.from, edge.to), edge]));
  const failures = [];
  const migrationEvaluation =
    options[migrationEvaluationOverride] ?? evaluateMigrationBudgets(graph, contract, options);
  failures.push(...migrationEvaluation.failures);

  for (const fromFile of graph.unclassifiedSourceFiles || []) {
    failures.push({ kind: 'unclassified-source-file', fromFile });
  }

  for (const issue of graph.forbiddenModuleSyntax || []) {
    failures.push({ kind: 'forbidden-module-syntax', ...issue });
  }

  const unresolved = graph.unresolvedDynamicImports || [];
  const unresolvedCounts = new Map();
  for (const issue of unresolved) {
    const key = unresolvedDynamicKey(issue);
    unresolvedCounts.set(key, (unresolvedCounts.get(key) || 0) + 1);
  }
  const dynamicAllowlist = new Map(
    contract.dynamicImportAllowlist.map(entry => [unresolvedDynamicKey(entry), entry])
  );
  for (const issue of unresolved) {
    if (!dynamicAllowlist.has(unresolvedDynamicKey(issue))) {
      failures.push({ kind: 'unresolved-dynamic-import', ...issue });
    }
  }
  for (const entry of contract.dynamicImportAllowlist) {
    const occurrences = unresolvedCounts.get(unresolvedDynamicKey(entry)) || 0;
    if (occurrences === 0) {
      failures.push({ kind: 'stale-dynamic-import-allowlist', ...entry });
    } else if (occurrences > entry.maxOccurrences) {
      failures.push({
        kind: 'dynamic-import-allowlist-growth',
        fromFile: entry.fromFile,
        expression: entry.expression,
        current: occurrences,
        budget: entry.maxOccurrences,
      });
    }
  }

  for (const edge of graph.edges) {
    const rule = ruleMap.get(edgeKey(edge.from, edge.to));
    if (!rule || rule.decision === 'deny') {
      failures.push({ kind: 'denied-edge', from: edge.from, to: edge.to });
      continue;
    }
    const reviewedEdge = edgeWithApprovedStatementsExcluded(
      edge,
      mergeApprovedStatements(
        migrationEvaluation.approvedStatements,
        migrationEvaluation.compatibilityApprovedStatements,
        migrationEvaluation.reviewedOwnershipApprovedStatements,
        migrationEvaluation.consolidationApprovedStatements
      )
    );
    for (const [currentField, budgetField, failureKind, importerField] of BUDGET_DIMENSIONS) {
      if (reviewedEdge[currentField] <= rule[budgetField]) continue;
      const importerFiles = Array.isArray(edge[importerField]) ? edge[importerField] : [];
      const approved = new Set((rule.approvedImporters || []).map(value => toPosix(String(value))));
      const failure = {
        kind: failureKind,
        from: edge.from,
        to: edge.to,
        current: reviewedEdge[currentField],
        budget: rule[budgetField],
        importers: importerFiles,
        newImporters: importerFiles.filter(file => !approved.has(file)),
      };
      if (reviewedEdge[currentField] !== edge[currentField]) {
        failure.observed = edge[currentField];
        failure.migrationStatementsExcluded = edge[currentField] - reviewedEdge[currentField];
      }
      failures.push(failure);
    }
  }

  for (const rule of contract.rules) {
    if (rule.decision === 'allow' && !currentMap.has(edgeKey(rule.from, rule.to))) {
      failures.push({ kind: 'stale-edge', from: rule.from, to: rule.to });
    }
  }

  for (const facade of contract.facades) {
    const matching = graph.imports.filter(entry => entry.from === facade.from && entry.to === facade.to);
    for (const entry of matching) {
      if (!matchesAllowedTarget(entry.toFile, facade.allowedTargets)) {
        failures.push({
          kind: 'facade-bypass',
          from: facade.from,
          to: facade.to,
          fromFile: entry.fromFile,
          toFile: entry.toFile,
          importKind: entry.kind,
        });
      }
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    edges: graph.edges.map(edge =>
      edgeOwnershipReport(edge, ruleMap.get(edgeKey(edge.from, edge.to)), migrationEvaluation)
    ),
    migrationBudgets: migrationEvaluation.statuses,
    historicalMigrationEntries: migrationEvaluation.statuses,
    activeMigrationEntries: migrationEvaluation.statuses.filter(entry => entry.active),
    retiredMigrationEntries: migrationEvaluation.statuses.filter(entry => entry.retired),
    compatibilityBudgets: migrationEvaluation.compatibilityStatuses,
    reviewedOwnershipBudgets: migrationEvaluation.reviewedOwnershipStatuses,
    migrationConsolidations: migrationEvaluation.consolidationStatuses,
    consolidationApprovedStatements: migrationEvaluation.consolidationApprovedStatements,
  };
}

function ruleForEdge(edge, previousRule) {
  if (previousRule?.decision === 'deny') return JSON.parse(JSON.stringify(previousRule));
  const ratchetedBudget = (field, current) =>
    previousRule?.decision === 'allow' ? Math.min(previousRule[field], current) : current;
  return {
    from: edge.from,
    to: edge.to,
    decision: 'allow',
    maxImporterCount: ratchetedBudget('maxImporterCount', edge.importerCount),
    maxImportCount: ratchetedBudget('maxImportCount', edge.importCount),
    maxTypeImporterCount: ratchetedBudget('maxTypeImporterCount', edge.typeImporterCount),
    maxTypeImportCount: ratchetedBudget('maxTypeImportCount', edge.typeImportCount),
    maxValueImporterCount: ratchetedBudget('maxValueImporterCount', edge.valueImporterCount),
    maxValueImportCount: ratchetedBudget('maxValueImportCount', edge.valueImportCount),
    maxDynamicImporterCount: ratchetedBudget('maxDynamicImporterCount', edge.dynamicImporterCount),
    maxDynamicImportCount: ratchetedBudget('maxDynamicImportCount', edge.dynamicImportCount),
    reason: previousRule?.reason || 'REVIEW REQUIRED',
    ...(Array.isArray(previousRule?.approvedImporters)
      ? { approvedImporters: previousRule.approvedImporters.slice() }
      : {}),
  };
}

export function buildLayerContractProposal(graph, currentContract, options = {}) {
  validateLayerContractSchema(currentContract);
  const previousRules = new Map(currentContract.rules.map(rule => [edgeKey(rule.from, rule.to), rule]));
  const migrationEvaluation =
    options[migrationEvaluationOverride] ?? evaluateMigrationBudgets(graph, currentContract, options);
  const compatibilityBlockedProposalEdges = new Set(
    migrationEvaluation.compatibilityStatuses
      .filter(status => !status.active)
      .map(status => edgeKey(status.from, status.to))
  );
  const reviewedOwnershipBlockedProposalEdges = new Set(
    migrationEvaluation.reviewedOwnershipStatuses
      .filter(status => !status.active)
      .map(status => edgeKey(status.from, status.to))
  );
  const consolidationBlockedProposalEdges = new Set(
    migrationEvaluation.consolidationStatuses
      .filter(status => !status.valid)
      .map(status => edgeKey(status.from, status.to))
  );
  const reviewBlockedProposalEdges = new Set([
    ...compatibilityBlockedProposalEdges,
    ...reviewedOwnershipBlockedProposalEdges,
    ...consolidationBlockedProposalEdges,
  ]);
  const reviewedEdges = graph.edges.map(edge =>
    edgeWithApprovedStatementsExcluded(
      edge,
      mergeApprovedStatements(
        migrationEvaluation.approvedStatements,
        migrationEvaluation.compatibilityApprovedStatements,
        migrationEvaluation.reviewedOwnershipApprovedStatements,
        migrationEvaluation.consolidationApprovedStatements
      )
    )
  );
  const observedEdgeKeys = new Set(graph.edges.map(edge => edgeKey(edge.from, edge.to)));
  const facadeByEdge = new Map(
    currentContract.facades.map(facade => [edgeKey(facade.from, facade.to), facade])
  );
  const previousEdges = new Map(
    currentContract.rules
      .filter(rule => rule.decision === 'allow')
      .map(rule => [edgeKey(rule.from, rule.to), rule])
  );
  const nextRules = reviewedEdges.map(edge => {
    const key = edgeKey(edge.from, edge.to);
    const previousRule = previousRules.get(key);
    if (previousRule && reviewBlockedProposalEdges.has(key)) {
      return JSON.parse(JSON.stringify(previousRule));
    }
    return ruleForEdge(edge, previousRule);
  });
  for (const rule of currentContract.rules) {
    const key = edgeKey(rule.from, rule.to);
    const requiresFacadeDecision =
      rule.decision === 'allow' && facadeByEdge.has(key) && !observedEdgeKeys.has(key);
    const requiresCompatibilityReview =
      rule.decision === 'allow' && compatibilityBlockedProposalEdges.has(key);
    const requiresReviewedOwnershipReview =
      rule.decision === 'allow' && reviewedOwnershipBlockedProposalEdges.has(key);
    const requiresConsolidationReview =
      rule.decision === 'allow' && consolidationBlockedProposalEdges.has(key);
    if (
      (rule.decision === 'deny' ||
        requiresFacadeDecision ||
        requiresCompatibilityReview ||
        requiresReviewedOwnershipReview ||
        requiresConsolidationReview) &&
      !nextRules.some(next => edgeKey(next.from, next.to) === key)
    ) {
      nextRules.push(JSON.parse(JSON.stringify(rule)));
    }
  }
  nextRules.sort((left, right) => edgeKey(left.from, left.to).localeCompare(edgeKey(right.from, right.to)));
  const nextKeys = new Set(nextRules.map(rule => edgeKey(rule.from, rule.to)));
  const addedEdges = nextRules
    .filter(rule => rule.decision === 'allow' && !previousEdges.has(edgeKey(rule.from, rule.to)))
    .map(rule => edgeKey(rule.from, rule.to));
  const removedEdges = [...previousEdges.keys()].filter(key => !nextKeys.has(key));
  const budgetChanges = nextRules.flatMap(rule => {
    const previous = previousEdges.get(edgeKey(rule.from, rule.to));
    if (!previous) return [];
    const changes = BUDGET_DIMENSIONS.flatMap(([, budgetField]) =>
      previous[budgetField] === rule[budgetField]
        ? []
        : [{ field: budgetField, previous: previous[budgetField], current: rule[budgetField] }]
    );
    return changes.length ? [{ edge: edgeKey(rule.from, rule.to), changes }] : [];
  });
  const currentEdges = new Map(reviewedEdges.map(edge => [edgeKey(edge.from, edge.to), edge]));
  const ratchetViolations = currentContract.rules.flatMap(rule => {
    if (rule.decision !== 'allow') return [];
    const edge = currentEdges.get(edgeKey(rule.from, rule.to));
    if (!edge) return [];
    const growth = BUDGET_DIMENSIONS.flatMap(([currentField, budgetField]) =>
      edge[currentField] > rule[budgetField]
        ? [{ field: budgetField, budget: rule[budgetField], observed: edge[currentField] }]
        : []
    );
    return growth.length ? [{ edge: edgeKey(rule.from, rule.to), growth }] : [];
  });
  const requiresFacadeDecision = currentContract.facades.flatMap(facade => {
    const key = edgeKey(facade.from, facade.to);
    if (observedEdgeKeys.has(key)) return [];
    return [
      {
        edge: key,
        reason: facade.reason,
        allowedTargets: facade.allowedTargets.slice(),
      },
    ];
  });

  const reviewRequired =
    addedEdges.length > 0 ||
    ratchetViolations.length > 0 ||
    requiresFacadeDecision.length > 0 ||
    migrationEvaluation.failures.length > 0;
  const proposedRatchet = JSON.parse(JSON.stringify(currentContract.ratchet));
  if (!reviewRequired && (removedEdges.length > 0 || budgetChanges.length > 0)) {
    proposedRatchet.reviewedAt = isoDateOnlyFromTimestamp(evaluationDateTimestamp(options.currentDate));
  }
  const proposedContract = {
    version: LAYER_CONTRACT_VERSION,
    root: 'esm',
    ratchet: proposedRatchet,
    rules: nextRules,
    facades: JSON.parse(JSON.stringify(currentContract.facades)),
    dynamicImportAllowlist: JSON.parse(JSON.stringify(currentContract.dynamicImportAllowlist)),
    migrationBudgets: JSON.parse(JSON.stringify(currentContract.migrationBudgets)),
    migrationRetirements: JSON.parse(JSON.stringify(currentContract.migrationRetirements)),
    compatibilityBudgets: JSON.parse(JSON.stringify(currentContract.compatibilityBudgets)),
    reviewedOwnershipBudgets: JSON.parse(JSON.stringify(currentContract.reviewedOwnershipBudgets)),
    migrationConsolidations: JSON.parse(JSON.stringify(currentContract.migrationConsolidations)),
  };
  validateLayerContractSchema(proposedContract);

  return {
    reviewRequired,
    contract: proposedContract,
    diff: {
      addedEdges,
      removedEdges,
      budgetChanges,
      ratchetViolations,
      requiresFacadeDecision,
      migrationBudgetFailures: migrationEvaluation.failures,
      historicalMigrationEntries: migrationEvaluation.statuses.length,
      activeMigrationEntries: migrationEvaluation.statuses.filter(entry => entry.active).length,
      retiredMigrationEntries: migrationEvaluation.statuses.filter(entry => entry.retired).length,
      compatibilityBudgets: migrationEvaluation.compatibilityStatuses.length,
      reviewedOwnershipBudgets: migrationEvaluation.reviewedOwnershipStatuses.length,
      migrationConsolidations: migrationEvaluation.consolidationStatuses.length,
    },
  };
}

export function evaluateLayerContractAndProposal(graph, contract, options = {}) {
  const migrationEvaluation = evaluateMigrationBudgets(graph, contract, options);
  const sharedOptions = { ...options, [migrationEvaluationOverride]: migrationEvaluation };
  return {
    report: evaluateLayerContract(graph, contract, sharedOptions),
    proposal: buildLayerContractProposal(graph, contract, sharedOptions),
  };
}

export function evaluatePendingLayerRatchetReductions(graph, currentContract, options = {}) {
  validateLayerContractSchema(currentContract);
  const proposal = buildLayerContractProposal(graph, currentContract, options);
  const currentDateMs = evaluationDateTimestamp(options.currentDate);
  const currentDate = isoDateOnlyFromTimestamp(currentDateMs);
  const reviewedAtMs = parseIsoDateOnly(currentContract.ratchet.reviewedAt, 'ratchet.reviewedAt');
  const reviewAgeDays = Math.floor((currentDateMs - reviewedAtMs) / DAY_MS);
  const pendingBudgetChanges = proposal.diff.budgetChanges.flatMap(entry =>
    entry.changes.map(change => ({ edge: entry.edge, ...change }))
  );
  const pendingRemovedEdges = proposal.diff.removedEdges.slice();
  const cleanProposal = !proposal.reviewRequired;
  const hasPendingReductions =
    cleanProposal && (pendingBudgetChanges.length > 0 || pendingRemovedEdges.length > 0);
  const futureReview = reviewAgeDays < 0;
  const overdue =
    hasPendingReductions &&
    !futureReview &&
    reviewAgeDays > currentContract.ratchet.pendingReductionGraceDays;

  return {
    ok: !futureReview && !overdue,
    cleanProposal,
    currentDate,
    reviewedAt: currentContract.ratchet.reviewedAt,
    reviewAgeDays,
    graceDays: currentContract.ratchet.pendingReductionGraceDays,
    hasPendingReductions,
    overdue,
    futureReview,
    pendingBudgetChanges,
    pendingRemovedEdges,
  };
}
