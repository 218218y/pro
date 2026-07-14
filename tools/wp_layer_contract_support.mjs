import fs from 'node:fs';
import path from 'node:path';

import { createSourceFile, walkAst } from './wp_ast_adapter.mjs';

const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.ts', '.tsx']);

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

export function collectStaticModuleSpecifiers(file, sourceText) {
  const sourceFile = createSourceFile(file, sourceText, { label: 'wp_layer_contract' });
  const specifiers = new Set();
  walkAst(sourceFile, node => {
    if (
      node?.type === 'ImportDeclaration' ||
      node?.type === 'ExportNamedDeclaration' ||
      node?.type === 'ExportAllDeclaration'
    ) {
      const specifier = readStringLiteral(node.source || node.moduleSpecifier);
      if (specifier) specifiers.add(specifier);
      return;
    }
    if (node?.type === 'ImportExpression') {
      const specifier = readStringLiteral(node.source || node.arguments?.[0]);
      if (specifier) specifiers.add(specifier);
    }
  });
  return [...specifiers];
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

export function collectLayerContractGraph({ root }) {
  const esmDir = path.join(root, 'esm');
  if (!fs.existsSync(esmDir)) throw new Error('wp_layer_contract: missing ./esm directory');
  const imports = [];
  for (const file of walkSourceFiles(esmDir)) {
    const fromFile = toPosix(path.relative(root, file));
    const fromLayer = layerOfRelativeFile(fromFile);
    if (fromLayer === 'other') continue;
    const sourceText = fs.readFileSync(file, 'utf8');
    for (const specifier of collectStaticModuleSpecifiers(file, sourceText)) {
      const resolved = resolveRelativeImport(file, specifier);
      if (!resolved) continue;
      const toFile = toPosix(path.relative(root, resolved));
      if (!toFile.startsWith('esm/')) continue;
      const toLayer = layerOfRelativeFile(toFile);
      if (toLayer === 'other' || toLayer === fromLayer) continue;
      imports.push({ from: fromLayer, to: toLayer, fromFile, toFile, specifier });
    }
  }

  const edgeMap = new Map();
  for (const entry of imports) {
    const key = edgeKey(entry.from, entry.to);
    const current = edgeMap.get(key) || {
      from: entry.from,
      to: entry.to,
      importerFiles: new Set(),
      importCount: 0,
    };
    current.importerFiles.add(entry.fromFile);
    current.importCount += 1;
    edgeMap.set(key, current);
  }
  const edges = [...edgeMap.values()]
    .map(edge => ({
      from: edge.from,
      to: edge.to,
      importerCount: edge.importerFiles.size,
      importCount: edge.importCount,
    }))
    .sort((left, right) => edgeKey(left.from, left.to).localeCompare(edgeKey(right.from, right.to)));
  return { imports, edges };
}

function matchesAllowedTarget(target, allowedTargets) {
  return allowedTargets.some(allowed => {
    const normalized = toPosix(String(allowed));
    return normalized.endsWith('/**') ? target.startsWith(normalized.slice(0, -3)) : target === normalized;
  });
}

export function evaluateLayerContract(graph, contract) {
  if (contract?.version !== 2 || !Array.isArray(contract.rules)) {
    throw new Error('wp_layer_contract: baseline must use version 2 rules');
  }
  const ruleMap = new Map(contract.rules.map(rule => [edgeKey(rule.from, rule.to), rule]));
  const currentMap = new Map(graph.edges.map(edge => [edgeKey(edge.from, edge.to), edge]));
  const failures = [];

  for (const edge of graph.edges) {
    const rule = ruleMap.get(edgeKey(edge.from, edge.to));
    if (!rule) {
      failures.push({ kind: 'denied-edge', from: edge.from, to: edge.to });
      continue;
    }
    if (typeof rule.reason !== 'string' || !rule.reason.trim()) {
      failures.push({ kind: 'missing-reason', from: edge.from, to: edge.to });
    }
    const budget = Number(rule.maxImporters);
    if (!Number.isFinite(budget) || budget < 0) {
      failures.push({ kind: 'invalid-budget', from: edge.from, to: edge.to });
    } else if (edge.importerCount > budget) {
      failures.push({
        kind: 'consumer-growth',
        from: edge.from,
        to: edge.to,
        current: edge.importerCount,
        budget,
      });
    }
  }

  for (const rule of contract.rules) {
    if (!currentMap.has(edgeKey(rule.from, rule.to))) {
      failures.push({ kind: 'stale-edge', from: rule.from, to: rule.to });
    }
  }

  for (const facade of Array.isArray(contract.facades) ? contract.facades : []) {
    const matching = graph.imports.filter(entry => entry.from === facade.from && entry.to === facade.to);
    for (const entry of matching) {
      if (!matchesAllowedTarget(entry.toFile, facade.allowedTargets || [])) {
        failures.push({
          kind: 'facade-bypass',
          from: facade.from,
          to: facade.to,
          fromFile: entry.fromFile,
          toFile: entry.toFile,
        });
      }
    }
  }

  return { ok: failures.length === 0, failures, edges: graph.edges };
}

export function buildLayerContractProposal(graph) {
  return {
    version: 2,
    root: 'esm',
    rules: graph.edges.map(edge => ({
      from: edge.from,
      to: edge.to,
      maxImporters: edge.importerCount,
      reason: 'REVIEW REQUIRED',
    })),
    facades: [],
  };
}
