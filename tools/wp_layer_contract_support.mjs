import fs from 'node:fs';
import path from 'node:path';

import { createSourceFile, walkAst } from './wp_ast_adapter.mjs';

const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.ts', '.tsx']);
const IMPORT_KINDS = Object.freeze(['type', 'value', 'dynamic']);
const COMPOSITION_FILES = new Set(['app_container.ts', 'main.ts', 'release_main.ts']);
const RATCHET_MODE = 'decrease-only';
export const LAYER_CONTRACT_VERSION = '2.3';
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
  const expectedSyntax = spec.kind === 'type' ? 'type-import' : 'static-import';
  if (spec?.syntax !== expectedSyntax) {
    throw new Error(`wp_layer_contract: ${label}.syntax must be ${expectedSyntax}`);
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
    !Array.isArray(contract.migrationBudgets)
  ) {
    throw new Error(
      'wp_layer_contract: rules, facades, dynamicImportAllowlist, and migrationBudgets must be arrays'
    );
  }
  if (
    contract.ratchet?.mode !== RATCHET_MODE ||
    typeof contract.ratchet?.owner !== 'string' ||
    !contract.ratchet.owner.trim() ||
    typeof contract.ratchet?.reason !== 'string' ||
    !contract.ratchet.reason.trim() ||
    typeof contract.ratchet?.reviewedAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(contract.ratchet.reviewedAt)
  ) {
    throw new Error(
      'wp_layer_contract: ratchet requires decrease-only mode, owner, reason, and reviewedAt (YYYY-MM-DD)'
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
  for (const entry of graph.imports || []) {
    if (entry.fromFile !== fromFile || entry.toFile !== spec.toFile) continue;
    const statementKey = String(entry.statementKey || `${entry.fromFile}:${entry.toFile}:${statements.size}`);
    const statement = statements.get(statementKey) || { statementKey, entries: [] };
    statement.entries.push(entry);
    statements.set(statementKey, statement);
  }
  return [...statements.values()];
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

function evaluateMigrationBudgets(graph, contract, { currentDate } = {}) {
  const failures = [];
  const approvedStatements = new Map();
  const statuses = [];
  const currentDateMs = evaluationDateTimestamp(currentDate);

  for (const budget of contract.migrationBudgets) {
    const fromFile = toPosix(String(budget.fromFile));
    const edge = edgeKey(budget.from, budget.to);
    const entryFailures = [];
    if (currentDateMs > parseIsoDateOnly(budget.reviewBy, `${fromFile}.reviewBy`)) {
      entryFailures.push({
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
    const removedMatches = (graph.imports || []).filter(
      entry => entry.fromFile === fromFile && entry.toFile === budget.removedImport.toFile
    );

    for (const [field, matches, expected] of [
      ['addedImport', addedMatches, budget.addedImport],
      ['companionImport', companionMatches, budget.companionImport],
    ]) {
      if (matches.length !== 1) {
        entryFailures.push({
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
        entryFailures.push({
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
        entryFailures.push({
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
        entryFailures.push({
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
        entryFailures.push({
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
      }
    }

    if (removedMatches.length > 0) {
      entryFailures.push({
        kind: migrationImportFailureKind('removedImport', removedMatches.length),
        from: budget.from,
        to: budget.to,
        fromFile,
        field: 'removedImport',
        toFile: budget.removedImport.toFile,
        current: removedMatches.length,
        expected: 0,
      });
    }

    failures.push(...entryFailures);
    if (entryFailures.length === 0) {
      const [added] = addedMatches[0].entries;
      const current = approvedStatements.get(edge) || {
        all: new Set(),
        type: new Set(),
        value: new Set(),
        dynamic: new Set(),
      };
      current.all.add(added.statementKey);
      current[added.kind].add(added.statementKey);
      approvedStatements.set(edge, current);
    }
    statuses.push({
      from: budget.from,
      to: budget.to,
      fromFile,
      addedTarget: budget.addedImport.toFile,
      reviewBy: budget.reviewBy,
      active: entryFailures.length === 0,
    });
  }

  return { failures, approvedStatements, statuses };
}

function edgeWithMigrationStatementsExcluded(edge, approvedStatements) {
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

export function evaluateLayerContract(graph, contract, options = {}) {
  validateLayerContractSchema(contract);
  const ruleMap = new Map(contract.rules.map(rule => [edgeKey(rule.from, rule.to), rule]));
  const currentMap = new Map(graph.edges.map(edge => [edgeKey(edge.from, edge.to), edge]));
  const failures = [];
  const migrationEvaluation = evaluateMigrationBudgets(graph, contract, options);
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
    const reviewedEdge = edgeWithMigrationStatementsExcluded(edge, migrationEvaluation.approvedStatements);
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
    edges: graph.edges,
    migrationBudgets: migrationEvaluation.statuses,
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
  const migrationEvaluation = evaluateMigrationBudgets(graph, currentContract, options);
  const reviewedEdges = graph.edges.map(edge =>
    edgeWithMigrationStatementsExcluded(edge, migrationEvaluation.approvedStatements)
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
  const nextRules = reviewedEdges.map(edge =>
    ruleForEdge(edge, previousRules.get(edgeKey(edge.from, edge.to)))
  );
  for (const rule of currentContract.rules) {
    const key = edgeKey(rule.from, rule.to);
    const requiresFacadeDecision =
      rule.decision === 'allow' && facadeByEdge.has(key) && !observedEdgeKeys.has(key);
    if (
      (rule.decision === 'deny' || requiresFacadeDecision) &&
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

  const proposedContract = {
    version: LAYER_CONTRACT_VERSION,
    root: 'esm',
    ratchet: JSON.parse(JSON.stringify(currentContract.ratchet)),
    rules: nextRules,
    facades: JSON.parse(JSON.stringify(currentContract.facades)),
    dynamicImportAllowlist: JSON.parse(JSON.stringify(currentContract.dynamicImportAllowlist)),
    migrationBudgets: JSON.parse(JSON.stringify(currentContract.migrationBudgets)),
  };
  validateLayerContractSchema(proposedContract);

  const reviewRequired =
    addedEdges.length > 0 ||
    ratchetViolations.length > 0 ||
    requiresFacadeDecision.length > 0 ||
    migrationEvaluation.failures.length > 0;

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
    },
  };
}
