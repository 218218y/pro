import fs from 'node:fs';
import path from 'node:path';

import { createSourceFile, walkAst } from './wp_ast_adapter.mjs';

const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.ts', '.tsx']);
const IMPORT_KINDS = Object.freeze(['type', 'value', 'dynamic']);
const COMPOSITION_FILES = new Set(['app_container.ts', 'main.ts', 'release_main.ts']);
const RATCHET_MODE = 'decrease-only';
export const LAYER_CONTRACT_VERSION = '3.0';
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

const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

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

function validateStatementSpec(entry, field, expectedToLayer) {
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
    !Array.isArray(contract.compatibilityBudgets) ||
    !Array.isArray(contract.reviewedOwnershipBudgets)
  ) {
    throw new Error(
      'wp_layer_contract: rules, facades, dynamicImportAllowlist, compatibilityBudgets, and reviewedOwnershipBudgets must be arrays'
    );
  }
  for (const retiredField of ['migrationBudgets', 'migrationRetirements', 'migrationConsolidations']) {
    if (Object.hasOwn(contract, retiredField)) {
      throw new Error(
        `wp_layer_contract: ${retiredField} is retired; the baseline stores current ownership only`
      );
    }
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

  const validateOwner = (entry, kind, ids, statementKeys) => {
    const id = String(entry?.id || '').trim();
    const from = String(entry?.from || '');
    const to = String(entry?.to || '');
    const fromFile = toPosix(String(entry?.fromFile || ''));
    const rule = rules.get(edgeKey(from, to));
    if (!id || ids.has(id)) {
      throw new Error(`wp_layer_contract: ${kind} id must be non-empty and unique (${id || '<empty>'})`);
    }
    ids.add(id);
    if (
      !known.has(from) ||
      !known.has(to) ||
      from === to ||
      layerOfRelativeFile(fromFile) !== from ||
      !rule ||
      rule.decision !== 'allow'
    ) {
      throw new Error(`wp_layer_contract: ${kind} ${id} requires one existing allowed edge`);
    }
    for (const field of ['owner', 'reason']) {
      if (typeof entry?.[field] !== 'string' || !entry[field].trim()) {
        throw new Error(`wp_layer_contract: ${kind} ${id} requires ${field}`);
      }
    }
    const statement = validateStatementSpec({ fromFile, statement: entry.statement }, 'statement', to);
    const symbols = normalizeSymbolList(
      entry.statement.importedSymbols,
      `${kind} ${id}.statement.importedSymbols`
    );
    const statementKey = exactStatementSpecKey(from, to, fromFile, {
      ...entry.statement,
      toFile: statement.toFile,
      importedSymbols: symbols,
    });
    if (statementKeys.has(statementKey)) {
      throw new Error(`wp_layer_contract: duplicate current statement ownership for ${statementKey}`);
    }
    statementKeys.add(statementKey);
    return { statement, symbols, statementKey, fromFile };
  };

  const compatibilityIds = new Set();
  const compatibilityStatementKeys = new Set();
  for (const entry of contract.compatibilityBudgets) {
    const { statement, symbols } = validateOwner(
      entry,
      'compatibility budget',
      compatibilityIds,
      compatibilityStatementKeys
    );
    if (typeof entry.publicSurface !== 'string' || !entry.publicSurface.trim()) {
      throw new Error(`wp_layer_contract: compatibility budget ${entry.id} requires publicSurface`);
    }
    const reviewedAt = parseIsoDateOnly(entry.reviewedAt, `compatibility budget ${entry.id}.reviewedAt`);
    const nextReviewBy = parseIsoDateOnly(
      entry.nextReviewBy,
      `compatibility budget ${entry.id}.nextReviewBy`
    );
    if (nextReviewBy < reviewedAt) {
      throw new Error(
        `wp_layer_contract: compatibility budget ${entry.id}.nextReviewBy must not be earlier than reviewedAt`
      );
    }
    if (symbols.includes('*') && entry.allowWildcard !== true) {
      throw new Error(
        `wp_layer_contract: compatibility budget ${entry.id} wildcard requires allowWildcard: true`
      );
    }
    if (statement.syntax === 'dynamic-import') {
      throw new Error(`wp_layer_contract: compatibility budget ${entry.id} cannot own dynamic imports`);
    }
  }

  const ownershipIds = new Set();
  const allStatementKeys = new Set(compatibilityStatementKeys);
  for (const entry of contract.reviewedOwnershipBudgets) {
    const { statement, symbols } = validateOwner(
      entry,
      'reviewed ownership budget',
      ownershipIds,
      allStatementKeys
    );
    if (statement.syntax !== 'static-import' && statement.syntax !== 'type-import') {
      throw new Error(
        `wp_layer_contract: reviewed ownership budget ${entry.id} must own a direct static import, not ${statement.syntax}`
      );
    }
    if (symbols.includes('*')) {
      throw new Error(
        `wp_layer_contract: reviewed ownership budget ${entry.id} does not allow wildcard ownership`
      );
    }
    for (const retiredField of ['reviewedAt', 'nextReviewBy', 'evidenceContracts', 'entryNumber']) {
      if (Object.hasOwn(entry, retiredField)) {
        throw new Error(
          `wp_layer_contract: reviewed ownership budget ${entry.id}.${retiredField} is historical metadata and is not allowed`
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

function matchingExactStatements(graph, fromFile, spec) {
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

function mixedStatementDetails(statement) {
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
  const matches = matchingExactStatements(graph, fromFile, spec);
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
  const mixedDetails = mixedStatementDetails(statement);
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
    if (!reviewEffective)
      failures.push({ kind: 'compatibility-review-not-effective-yet', ...lifecycleDetails });
    if (reviewOverdue) failures.push({ kind: 'stale-compatibility-review', ...lifecycleDetails });

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

function evaluateReviewedOwnershipBudgets(graph, contract) {
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
    const statementValid = statementFailures.length === 0;
    if (statementValid && result.statement) {
      addApprovedStatement(approvedStatements, budget.from, budget.to, result.statement);
    }
    statuses.push({
      id: budget.id,
      from: budget.from,
      to: budget.to,
      fromFile,
      target: budget.statement.toFile,
      statementValid,
      ownershipEffective: statementValid,
      active: statementValid,
    });
  }
  return { failures, approvedStatements, statuses };
}

function evaluateOwnershipBudgets(graph, contract, { currentDate } = {}) {
  const currentDateMs = evaluationDateTimestamp(currentDate);
  const currentDateLabel = isoDateOnlyFromTimestamp(currentDateMs);
  const compatibilityEvaluation = evaluateCompatibilityBudgets(graph, contract, {
    currentDateMs,
    currentDate: currentDateLabel,
  });
  const reviewedOwnershipEvaluation = evaluateReviewedOwnershipBudgets(graph, contract);
  return {
    failures: [...compatibilityEvaluation.failures, ...reviewedOwnershipEvaluation.failures],
    compatibilityApprovedStatements: compatibilityEvaluation.approvedStatements,
    reviewedOwnershipApprovedStatements: reviewedOwnershipEvaluation.approvedStatements,
    compatibilityStatuses: compatibilityEvaluation.statuses,
    reviewedOwnershipStatuses: reviewedOwnershipEvaluation.statuses,
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

function edgeOwnershipReport(edge, rule, ownershipEvaluation) {
  const merged = mergeApprovedStatements(
    ownershipEvaluation.compatibilityApprovedStatements,
    ownershipEvaluation.reviewedOwnershipApprovedStatements
  );
  const mergedForEdge = merged.get(edgeKey(edge.from, edge.to));
  const reviewedGeneralStatements = edge.importCount - (mergedForEdge?.all.size || 0);
  const reviewedGeneralValueStatements = edge.valueImportCount - (mergedForEdge?.value.size || 0);
  const reviewedGeneralTypeStatements = edge.typeImportCount - (mergedForEdge?.type.size || 0);
  return {
    ...edge,
    observedStatements: edge.importCount,
    compatibilityStatements: approvedStatementCount(
      ownershipEvaluation.compatibilityApprovedStatements,
      edge
    ),
    reviewedOwnershipStatements: approvedStatementCount(
      ownershipEvaluation.reviewedOwnershipApprovedStatements,
      edge
    ),
    reviewedGeneralStatements,
    generalBudget: rule?.maxImportCount ?? null,
    observedValueStatements: edge.valueImportCount,
    compatibilityValueStatements: approvedStatementCount(
      ownershipEvaluation.compatibilityApprovedStatements,
      edge,
      'value'
    ),
    reviewedOwnershipValueStatements: approvedStatementCount(
      ownershipEvaluation.reviewedOwnershipApprovedStatements,
      edge,
      'value'
    ),
    reviewedGeneralValueStatements,
    generalValueBudget: rule?.maxValueImportCount ?? null,
    observedTypeStatements: edge.typeImportCount,
    compatibilityTypeStatements: approvedStatementCount(
      ownershipEvaluation.compatibilityApprovedStatements,
      edge,
      'type'
    ),
    reviewedOwnershipTypeStatements: approvedStatementCount(
      ownershipEvaluation.reviewedOwnershipApprovedStatements,
      edge,
      'type'
    ),
    reviewedGeneralTypeStatements,
    generalTypeBudget: rule?.maxTypeImportCount ?? null,
  };
}

const ownershipEvaluationOverride = Symbol('ownershipEvaluationOverride');

export function evaluateLayerContract(graph, contract, options = {}) {
  validateLayerContractSchema(contract);
  const ruleMap = new Map(contract.rules.map(rule => [edgeKey(rule.from, rule.to), rule]));
  const currentMap = new Map(graph.edges.map(edge => [edgeKey(edge.from, edge.to), edge]));
  const failures = [];
  const ownershipEvaluation =
    options[ownershipEvaluationOverride] ?? evaluateOwnershipBudgets(graph, contract, options);
  failures.push(...ownershipEvaluation.failures);

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
    if (occurrences === 0) failures.push({ kind: 'stale-dynamic-import-allowlist', ...entry });
    else if (occurrences > entry.maxOccurrences) {
      failures.push({
        kind: 'dynamic-import-allowlist-growth',
        fromFile: entry.fromFile,
        expression: entry.expression,
        current: occurrences,
        budget: entry.maxOccurrences,
      });
    }
  }

  const approvedStatements = mergeApprovedStatements(
    ownershipEvaluation.compatibilityApprovedStatements,
    ownershipEvaluation.reviewedOwnershipApprovedStatements
  );
  for (const edge of graph.edges) {
    const rule = ruleMap.get(edgeKey(edge.from, edge.to));
    if (!rule || rule.decision === 'deny') {
      failures.push({ kind: 'denied-edge', from: edge.from, to: edge.to });
      continue;
    }
    const reviewedEdge = edgeWithApprovedStatementsExcluded(edge, approvedStatements);
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
        failure.ownedStatementsExcluded = edge[currentField] - reviewedEdge[currentField];
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
      edgeOwnershipReport(edge, ruleMap.get(edgeKey(edge.from, edge.to)), ownershipEvaluation)
    ),
    compatibilityBudgets: ownershipEvaluation.compatibilityStatuses,
    reviewedOwnershipBudgets: ownershipEvaluation.reviewedOwnershipStatuses,
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
  const ownershipEvaluation =
    options[ownershipEvaluationOverride] ?? evaluateOwnershipBudgets(graph, currentContract, options);
  const compatibilityBlockedProposalEdges = new Set(
    ownershipEvaluation.compatibilityStatuses
      .filter(status => !status.active)
      .map(status => edgeKey(status.from, status.to))
  );
  const reviewedOwnershipBlockedProposalEdges = new Set(
    ownershipEvaluation.reviewedOwnershipStatuses
      .filter(status => !status.active)
      .map(status => edgeKey(status.from, status.to))
  );
  const reviewBlockedProposalEdges = new Set([
    ...compatibilityBlockedProposalEdges,
    ...reviewedOwnershipBlockedProposalEdges,
  ]);
  const reviewedEdges = graph.edges.map(edge =>
    edgeWithApprovedStatementsExcluded(
      edge,
      mergeApprovedStatements(
        ownershipEvaluation.compatibilityApprovedStatements,
        ownershipEvaluation.reviewedOwnershipApprovedStatements
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
    if (
      (rule.decision === 'deny' ||
        requiresFacadeDecision ||
        requiresCompatibilityReview ||
        requiresReviewedOwnershipReview) &&
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
    return [{ edge: key, reason: facade.reason, allowedTargets: facade.allowedTargets.slice() }];
  });

  const reviewRequired =
    addedEdges.length > 0 ||
    ratchetViolations.length > 0 ||
    requiresFacadeDecision.length > 0 ||
    ownershipEvaluation.failures.length > 0;
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
    compatibilityBudgets: JSON.parse(JSON.stringify(currentContract.compatibilityBudgets)),
    reviewedOwnershipBudgets: JSON.parse(JSON.stringify(currentContract.reviewedOwnershipBudgets)),
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
      ownershipFailures: ownershipEvaluation.failures,
      compatibilityBudgets: ownershipEvaluation.compatibilityStatuses.length,
      reviewedOwnershipBudgets: ownershipEvaluation.reviewedOwnershipStatuses.length,
    },
  };
}

export function evaluateLayerContractAndProposal(graph, contract, options = {}) {
  const ownershipEvaluation = evaluateOwnershipBudgets(graph, contract, options);
  const sharedOptions = { ...options, [ownershipEvaluationOverride]: ownershipEvaluation };
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
