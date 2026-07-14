import fs from 'node:fs';
import path from 'node:path';

import { createSourceFile, walkAst } from './wp_ast_adapter.mjs';

const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.ts', '.tsx']);
const IMPORT_KINDS = Object.freeze(['type', 'value', 'dynamic']);
export const LAYER_CONTRACT_VERSION = '2.1';
export const KNOWN_LAYERS = Object.freeze([
  'adapters',
  'boot',
  'builder',
  'core',
  'data',
  'engine',
  'features',
  'io',
  'kernel',
  'platform',
  'runtime',
  'services',
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

function readStringLiteral(node) {
  if (!node || typeof node !== 'object') return null;
  if (typeof node.value === 'string') return node.value;
  if (typeof node.text === 'string') return node.text;
  return null;
}

function staticModuleKinds(node) {
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

export function collectStaticModuleImports(file, sourceText) {
  const sourceFile = createSourceFile(file, sourceText, { label: 'wp_layer_contract' });
  const imports = [];
  walkAst(sourceFile, node => {
    const isStaticDeclaration =
      node?.type === 'ImportDeclaration' ||
      node?.type === 'ExportNamedDeclaration' ||
      node?.type === 'ExportAllDeclaration';
    if (!isStaticDeclaration && node?.type !== 'ImportExpression') return;
    const specifier = readStringLiteral(node.source || node.moduleSpecifier || node.arguments?.[0]);
    if (!specifier) return;
    const statementStart = Number.isFinite(Number(node.start)) ? Number(node.start) : imports.length;
    for (const kind of staticModuleKinds(node)) imports.push({ specifier, kind, statementStart });
  });
  return imports;
}

export function collectStaticModuleSpecifiers(file, sourceText) {
  return [...new Set(collectStaticModuleImports(file, sourceText).map(entry => entry.specifier))];
}

export function layerOfRelativeFile(relativeFile) {
  const parts = toPosix(relativeFile).split('/');
  if (parts[0] === 'esm' && parts[1] === 'boot') return 'boot';
  if (parts[0] === 'esm' && parts[1] === 'native' && parts[2]) return parts[2];
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
  for (const file of walkSourceFiles(esmDir)) {
    const fromFile = toPosix(path.relative(root, file));
    const fromLayer = layerOfRelativeFile(fromFile);
    if (fromLayer === 'other') continue;
    const sourceText = fs.readFileSync(file, 'utf8');
    for (const moduleImport of collectStaticModuleImports(file, sourceText)) {
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
  return { imports, edges };
}

function assertNonNegativeBudget(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`wp_layer_contract: ${label} must be a non-negative integer`);
  }
}

export function validateLayerContractSchema(contract) {
  if (!contract || contract.version !== LAYER_CONTRACT_VERSION || contract.root !== 'esm') {
    throw new Error(`wp_layer_contract: baseline must use version ${LAYER_CONTRACT_VERSION} and root esm`);
  }
  if (!Array.isArray(contract.rules) || !Array.isArray(contract.facades)) {
    throw new Error('wp_layer_contract: rules and facades must be arrays');
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
  return contract;
}

function matchesAllowedTarget(target, allowedTargets) {
  return allowedTargets.some(allowed => {
    const normalized = toPosix(String(allowed));
    return normalized.endsWith('/**') ? target.startsWith(normalized.slice(0, -3)) : target === normalized;
  });
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

export function evaluateLayerContract(graph, contract) {
  validateLayerContractSchema(contract);
  const ruleMap = new Map(contract.rules.map(rule => [edgeKey(rule.from, rule.to), rule]));
  const currentMap = new Map(graph.edges.map(edge => [edgeKey(edge.from, edge.to), edge]));
  const failures = [];

  for (const edge of graph.edges) {
    const rule = ruleMap.get(edgeKey(edge.from, edge.to));
    if (!rule || rule.decision === 'deny') {
      failures.push({ kind: 'denied-edge', from: edge.from, to: edge.to });
      continue;
    }
    for (const [currentField, budgetField, failureKind, importerField] of BUDGET_DIMENSIONS) {
      if (edge[currentField] <= rule[budgetField]) continue;
      const importerFiles = Array.isArray(edge[importerField]) ? edge[importerField] : [];
      const approved = new Set((rule.approvedImporters || []).map(value => toPosix(String(value))));
      failures.push({
        kind: failureKind,
        from: edge.from,
        to: edge.to,
        current: edge[currentField],
        budget: rule[budgetField],
        importers: importerFiles,
        newImporters: importerFiles.filter(file => !approved.has(file)),
      });
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

  return { ok: failures.length === 0, failures, edges: graph.edges };
}

function ruleForEdge(edge, previousRule) {
  return {
    from: edge.from,
    to: edge.to,
    decision: 'allow',
    maxImporterCount: edge.importerCount,
    maxImportCount: edge.importCount,
    maxTypeImporterCount: edge.typeImporterCount,
    maxTypeImportCount: edge.typeImportCount,
    maxValueImporterCount: edge.valueImporterCount,
    maxValueImportCount: edge.valueImportCount,
    maxDynamicImporterCount: edge.dynamicImporterCount,
    maxDynamicImportCount: edge.dynamicImportCount,
    reason: previousRule?.reason || 'REVIEW REQUIRED',
    ...(Array.isArray(previousRule?.approvedImporters)
      ? { approvedImporters: previousRule.approvedImporters.slice() }
      : {}),
  };
}

export function buildLayerContractProposal(graph, currentContract) {
  validateLayerContractSchema(currentContract);
  const previousRules = new Map(currentContract.rules.map(rule => [edgeKey(rule.from, rule.to), rule]));
  const previousEdges = new Map(
    currentContract.rules
      .filter(rule => rule.decision === 'allow')
      .map(rule => [edgeKey(rule.from, rule.to), rule])
  );
  const nextRules = graph.edges.map(edge =>
    ruleForEdge(edge, previousRules.get(edgeKey(edge.from, edge.to)))
  );
  const nextKeys = new Set(nextRules.map(rule => edgeKey(rule.from, rule.to)));
  const addedEdges = nextRules
    .filter(rule => !previousEdges.has(edgeKey(rule.from, rule.to)))
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

  return {
    contract: {
      version: LAYER_CONTRACT_VERSION,
      root: 'esm',
      rules: nextRules,
      facades: JSON.parse(JSON.stringify(currentContract.facades)),
    },
    diff: { addedEdges, removedEdges, budgetChanges },
  };
}
