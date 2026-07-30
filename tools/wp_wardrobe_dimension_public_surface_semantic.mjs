import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { createSourceFile } from './wp_ast_adapter.mjs';
import { analyzeModuleDependencies } from './wp_layer_contract_support.mjs';
import {
  createLocalTypeScriptVersionMismatchMessage,
  resolveInstalledTypeScriptVersion,
  resolvePinnedTypeScriptVersion,
} from './wp_typescript_resolver.js';

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(toolDir, '..');
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

const surfaceFiles = Object.freeze({
  facade: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
  featureBarrel: 'esm/native/features/dimensions/index.ts',
  runtime: 'esm/native/runtime/api.ts',
  servicesBase: 'esm/native/services/api_runtime_base_surface.ts',
  servicesEntry: 'esm/native/services/api.ts',
});

const sha256 = value => createHash('sha256').update(value).digest('hex');

function upgradeManifestSchema(root) {
  const manifestFile = path.join(root, 'tools/wp_wardrobe_dimension_public_surface_manifest.json');
  const inventoryFile = path.join(root, 'tools/wp_wardrobe_dimension_facade_transition_inventory.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const capturedProductionHead = manifest.capturedProductionHead ?? manifest.capturedAtHead;
  manifest.version = 2;
  delete manifest.capturedAtHead;
  manifest.capturedProductionHead = capturedProductionHead;
  manifest.policy =
    'Inventory every current facade export without treating route presence or repository silence as external-consumer evidence. Undetermined symbols block removal. capturedProductionHead names the latest committed production snapshot represented by this metadata; same-commit metadata changes are intentionally non-self-referential.';
  manifest.surfaceTopology = {
    facade: {
      file: surfaceFiles.facade,
      values: 89,
      types: 10,
      form: 'explicit-export-inventory',
      wildcardStatements: 0,
    },
    featureBarrel: {
      file: surfaceFiles.featureBarrel,
      sourceFile: surfaceFiles.facade,
      values: 89,
      types: 10,
      form: 'wildcard-re-export',
      wildcardStatements: 1,
    },
    runtime: {
      file: surfaceFiles.runtime,
      values: 52,
      types: 1,
      form: 'explicit-re-export-inventory',
    },
    servicesBase: {
      file: surfaceFiles.servicesBase,
      sourceFile: surfaceFiles.runtime,
      values: 52,
      types: 1,
      form: 'explicit-re-export-inventory',
    },
    servicesEntry: {
      file: surfaceFiles.servicesEntry,
      sourceFile: surfaceFiles.servicesBase,
      values: 52,
      types: 1,
      form: 'wildcard-plus-representative-re-exports',
      wildcardStatements: 1,
      representativeValueExports: 40,
    },
  };
  const runtimeSource = fs.readFileSync(path.join(root, surfaceFiles.runtime), 'utf8');
  const runtimeRoutes = analyzeModuleDependencies(surfaceFiles.runtime, runtimeSource).imports.filter(
    dependency => dependency.syntax === 'static-re-export' || dependency.syntax === 'type-re-export'
  );
  const routeByExportedName = new Map();
  for (const dependency of runtimeRoutes) {
    const sourceFile = path.posix
      .normalize(path.posix.join(path.posix.dirname(surfaceFiles.runtime), dependency.specifier))
      .replace(/\.js$/u, '.ts');
    for (const binding of dependency.bindings) {
      if (!binding.exportedName || binding.exportedName === '*') continue;
      routeByExportedName.set(binding.exportedName, {
        sourceFile,
        sourceSymbol: binding.importedName,
        kind: dependency.kind,
        syntax: dependency.syntax,
      });
    }
  }
  let exactDirectOwnerParity = 0;
  let identityOnlyDeclarationReview = 0;
  let explicitCompatibilityOwner = 0;
  for (const entry of manifest.symbols) {
    if (!entry.runtimeApiRoute) {
      entry.runtimeReconstruction = null;
      continue;
    }
    const [owner] = entry.canonicalOwner.exports;
    const [ownerSymbol] = owner.symbols;
    const route = routeByExportedName.get(entry.name);
    if (!route) throw new Error(`Missing Runtime route for ${entry.name}`);
    const isChest = entry.name === 'CHEST_MODE_DIMENSIONS';
    const isFacadeRoute = route.sourceFile === surfaceFiles.facade;
    const isCompatibilityRoute = route.sourceFile.includes('/dimensions/compatibility/');
    const declarationMode = isFacadeRoute
      ? 'legacy-facade'
      : isCompatibilityRoute
        ? 'explicit-compatibility-owner'
        : 'canonical-focused-owner';
    if (isChest && isCompatibilityRoute) {
      entry.facadeDeclaration.form = 'identity-local-export';
    }
    entry.runtimeApiRoute = {
      routeFile: surfaceFiles.runtime,
      sourceFile: route.sourceFile,
      sourceSymbol: route.sourceSymbol,
      kind: route.kind,
      form: entry.kind === 'type' ? 'type-re-export' : 'named-re-export',
      identity: entry.facadeDeclaration.identity,
      declarationMode,
    };
    if (isChest && isCompatibilityRoute) explicitCompatibilityOwner += 1;
    else if (isChest) identityOnlyDeclarationReview += 1;
    else exactDirectOwnerParity += 1;
    entry.runtimeReconstruction = {
      status:
        isChest && isCompatibilityRoute
          ? 'explicit-compatibility-owner'
          : isChest
            ? 'identity-parity-declaration-review'
            : 'exact-direct-owner-parity',
      target: { file: owner.file, symbol: ownerSymbol, kind: entry.kind },
      runtimeIdentity: 'strict',
      declarationParity:
        isChest && isCompatibilityRoute
          ? 'exact-legacy-number-view'
          : isChest
            ? 'branded-owner/plain-number-compatibility'
            : 'exact',
    };
  }
  manifest.runtimeReconstructionInventory = {
    exactDirectOwnerParity,
    identityOnlyDeclarationReview,
    explicitCompatibilityOwner,
    specialSymbols: ['CHEST_MODE_DIMENSIONS'],
  };
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);

  const inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'));
  inventory.version = 2;
  inventory.capturedProductionHead = inventory.capturedProductionHead ?? inventory.capturedAtHead;
  delete inventory.capturedAtHead;
  inventory.policy =
    'Canonical consumer-row inventory for production dimension symbols that currently traverse the facade through runtime and services. capturedProductionHead names the latest committed production snapshot and is deliberately not a self-reference to metadata-only commits. The public-surface manifest owns the complete routed and routed-but-unconsumed symbol inventory.';
  fs.writeFileSync(inventoryFile, `${JSON.stringify(inventory, null, 2)}\n`);
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

function canonicalAst(value) {
  if (Array.isArray(value)) return value.map(canonicalAst);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const key of Object.keys(value).sort()) {
    if (omittedAstKeys.has(key) || typeof value[key] === 'function' || value[key] === undefined) continue;
    out[key] = canonicalAst(value[key]);
  }
  return out;
}

function readName(node) {
  if (typeof node?.name === 'string') return node.name;
  if (typeof node?.value === 'string') return node.value;
  return null;
}

function toPosix(value) {
  return value.replaceAll('\\', '/');
}

function emittedRelForSource(sourceRel) {
  return sourceRel.replace(/\.(?:[cm]?[jt]sx?)$/u, '.d.ts');
}

function sourceRelForEmitted(root, emittedRel) {
  const stem = emittedRel.replace(/\.d\.ts$/u, '');
  for (const extension of ['.ts', '.tsx', '.mts', '.cts']) {
    const candidate = `${stem}${extension}`;
    if (fs.existsSync(path.join(root, candidate))) return candidate;
  }
  return `${stem}.ts`;
}

function resolveEmittedSpecifier(fromRel, specifier) {
  if (typeof specifier !== 'string' || !specifier.startsWith('.')) return null;
  const clean = specifier.split(/[?#]/u, 1)[0];
  const raw = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), clean));
  const extension = path.posix.extname(raw);
  if (extension === '.js' || extension === '.mjs' || extension === '.cjs') {
    return `${raw.slice(0, -extension.length)}.d.ts`;
  }
  if (extension === '.ts') return raw.endsWith('.d.ts') ? raw : raw.replace(/\.ts$/u, '.d.ts');
  return `${raw}.d.ts`;
}

function declarationRecords(node) {
  if (!node || typeof node !== 'object') return [];
  if (node.type === 'VariableDeclaration') {
    return (node.declarations ?? [])
      .map(declaration => [readName(declaration.id), declaration])
      .filter(([name]) => name);
  }
  if (
    [
      'ClassDeclaration',
      'FunctionDeclaration',
      'TSDeclareFunction',
      'TSEnumDeclaration',
      'TSInterfaceDeclaration',
      'TSTypeAliasDeclaration',
    ].includes(node.type)
  ) {
    const name = readName(node.id);
    return name ? [[name, node]] : [];
  }
  return [];
}

function collectIdentifierNames(value, out = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectIdentifierNames(item, out);
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  if (value.type === 'Identifier' && typeof value.name === 'string') out.add(value.name);
  for (const [key, child] of Object.entries(value)) {
    if (omittedAstKeys.has(key) || key === 'id') continue;
    if (child && typeof child === 'object') collectIdentifierNames(child, out);
  }
  return out;
}

class DeclarationGraph {
  constructor(root, emittedRoot) {
    this.root = root;
    this.emittedRoot = emittedRoot;
    this.indexCache = new Map();
    this.fingerprintCache = new Map();
  }

  index(fileRel) {
    if (this.indexCache.has(fileRel)) return this.indexCache.get(fileRel);
    const source = fs.readFileSync(path.join(this.emittedRoot, fileRel), 'utf8');
    const parsed = createSourceFile(fileRel, source);
    if (parsed.parseDiagnostics.length) {
      throw new Error(`${fileRel}: declaration parse failed: ${JSON.stringify(parsed.parseDiagnostics)}`);
    }
    const dependencies = analyzeModuleDependencies(fileRel, source).imports;
    const imports = new Map();
    const reexports = new Map();
    const wildcards = [];
    for (const dependency of dependencies) {
      const target = resolveEmittedSpecifier(fileRel, dependency.specifier);
      if (!target) continue;
      if (dependency.syntax === 'static-import' || dependency.syntax === 'type-import') {
        for (const binding of dependency.bindings) {
          if (binding.localName) {
            imports.set(binding.localName, {
              fileRel: target,
              symbol: binding.importedName,
              kind: dependency.kind,
            });
          }
        }
      } else if (dependency.importedSymbols.includes('*')) {
        wildcards.push(target);
      } else {
        for (const binding of dependency.bindings) {
          if (binding.exportedName) {
            reexports.set(`${dependency.kind}:${binding.exportedName}`, {
              fileRel: target,
              symbol: binding.importedName,
              kind: dependency.kind,
            });
          }
        }
      }
    }

    const locals = new Map();
    const exportedLocals = new Map();
    for (const statement of parsed.body ?? parsed.statements ?? []) {
      const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
      for (const [name, node] of declarationRecords(declaration)) locals.set(name, node);
      if (statement.type !== 'ExportNamedDeclaration' || statement.source || statement.declaration) continue;
      for (const specifier of statement.specifiers ?? []) {
        const localName = readName(specifier.local);
        const exportedName = readName(specifier.exported);
        if (localName && exportedName) exportedLocals.set(exportedName, localName);
      }
    }
    const index = { source, imports, reexports, wildcards, locals, exportedLocals };
    this.indexCache.set(fileRel, index);
    return index;
  }

  localFingerprint(fileRel, localName, node, stack) {
    const key = `${fileRel}::local::${localName}`;
    if (this.fingerprintCache.has(key)) return this.fingerprintCache.get(key);
    if (stack.has(key)) return sha256(stableJson({ cycle: key }));
    const nextStack = new Set(stack).add(key);
    const index = this.index(fileRel);
    const dependencies = [];
    for (const name of [...collectIdentifierNames(node)].sort()) {
      if (name === localName) continue;
      if (index.locals.has(name)) {
        dependencies.push([
          'local',
          name,
          this.localFingerprint(fileRel, name, index.locals.get(name), nextStack),
        ]);
      } else if (index.imports.has(name)) {
        const imported = index.imports.get(name);
        dependencies.push([
          'import',
          name,
          this.resolve(imported.fileRel, imported.symbol, imported.kind, nextStack).fingerprint,
        ]);
      }
    }
    const sourceText = index.source.slice(Number(node.start) || 0, Number(node.end) || 0);
    for (const match of sourceText.matchAll(/import\(["']([^"']+)["']\)\.([A-Za-z_$][\w$]*)/gu)) {
      const target = resolveEmittedSpecifier(fileRel, match[1]);
      if (!target) continue;
      dependencies.push([
        'import-type',
        match[2],
        this.resolve(target, match[2], 'type', nextStack).fingerprint,
      ]);
    }
    const fingerprint = sha256(
      stableJson({ declaration: canonicalAst(node), dependencies: dependencies.sort() })
    );
    this.fingerprintCache.set(key, fingerprint);
    return fingerprint;
  }

  resolve(fileRel, symbol, kind, stack = new Set()) {
    const key = `${fileRel}::${kind}:${symbol}`;
    if (stack.has(key)) throw new Error(`declaration cycle without local owner: ${key}`);
    const nextStack = new Set(stack).add(key);
    const index = this.index(fileRel);
    const direct = index.reexports.get(`${kind}:${symbol}`);
    if (direct) {
      const resolved = this.resolve(direct.fileRel, direct.symbol, direct.kind, nextStack);
      return {
        ...resolved,
        immediateSourceFile: sourceRelForEmitted(this.root, direct.fileRel),
        immediateSourceSymbol: direct.symbol,
      };
    }

    const localName = index.exportedLocals.get(symbol) ?? symbol;
    if (index.locals.has(localName)) {
      return {
        fingerprint: this.localFingerprint(fileRel, localName, index.locals.get(localName), nextStack),
        declarationFile: sourceRelForEmitted(this.root, fileRel),
        declarationSymbol: localName,
        immediateSourceFile: sourceRelForEmitted(this.root, fileRel),
        immediateSourceSymbol: localName,
      };
    }
    if (index.imports.has(localName)) {
      const imported = index.imports.get(localName);
      const resolved = this.resolve(imported.fileRel, imported.symbol, imported.kind, nextStack);
      return {
        ...resolved,
        immediateSourceFile: sourceRelForEmitted(this.root, imported.fileRel),
        immediateSourceSymbol: imported.symbol,
      };
    }
    const wildcardMatches = [];
    for (const wildcard of index.wildcards) {
      try {
        wildcardMatches.push(this.resolve(wildcard, symbol, kind, nextStack));
      } catch {
        // The wildcard target does not own this symbol.
      }
    }
    if (wildcardMatches.length === 1) {
      return {
        ...wildcardMatches[0],
        immediateSourceFile: sourceRelForEmitted(this.root, index.wildcards[0]),
        immediateSourceSymbol: symbol,
      };
    }
    throw new Error(`${fileRel}: cannot resolve ${kind} export ${symbol}`);
  }
}

function emitDeclarations(root, outDir) {
  const expectedVersion = resolvePinnedTypeScriptVersion(root);
  const installedVersion = resolveInstalledTypeScriptVersion(root);
  if (!expectedVersion || !installedVersion) {
    throw new Error(
      'Local TypeScript is missing or not pinned. Run `python tools/bootstrap_offline_typescript.py` or `npm ci`.'
    );
  }
  if (expectedVersion !== installedVersion) {
    throw new Error(createLocalTypeScriptVersionMismatchMessage(expectedVersion, installedVersion));
  }

  const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  const result = spawnSync(
    process.execPath,
    [
      tsc,
      '-p',
      path.join(root, 'tsconfig.dist.json'),
      '--pretty',
      'false',
      '--noEmit',
      'false',
      '--declaration',
      'true',
      '--emitDeclarationOnly',
      'true',
      '--declarationMap',
      'false',
      '--sourceMap',
      'false',
      '--inlineSources',
      'false',
      '--incremental',
      'false',
      '--outDir',
      outDir,
    ],
    { cwd: root, encoding: 'utf8' }
  );
  if (result.status !== 0) {
    throw new Error(`declaration emit failed\n${result.stdout}\n${result.stderr}`);
  }
}

function surfaceRecord(graph, sourceRel, entry) {
  const resolved = graph.resolve(emittedRelForSource(sourceRel), entry.name, entry.kind);
  return {
    routeFile: sourceRel,
    sourceFile: resolved.immediateSourceFile,
    sourceSymbol: resolved.immediateSourceSymbol,
    publicExportedName: entry.name,
    declarationTypeFingerprint: resolved.fingerprint,
  };
}

export function buildWardrobeDimensionPublicSurfaceSemanticSnapshot(root = defaultRoot) {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'tools/wp_wardrobe_dimension_public_surface_manifest.json'), 'utf8')
  );
  const emittedRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-dimension-dts-'));
  try {
    emitDeclarations(root, emittedRoot);
    const graph = new DeclarationGraph(root, emittedRoot);
    const symbols = manifest.symbols.map(entry => {
      const facade = surfaceRecord(graph, surfaceFiles.facade, entry);
      const featureBarrel = surfaceRecord(graph, surfaceFiles.featureBarrel, entry);
      const runtime = entry.runtimeApiRoute ? surfaceRecord(graph, surfaceFiles.runtime, entry) : null;
      const servicesBase = entry.servicesApiRoute
        ? surfaceRecord(graph, surfaceFiles.servicesBase, entry)
        : null;
      const servicesEntry = entry.servicesApiRoute
        ? surfaceRecord(graph, surfaceFiles.servicesEntry, entry)
        : null;
      const canonicalOwner = entry.canonicalOwner.exports.flatMap(owner =>
        owner.symbols.map(symbol => {
          const resolved = graph.resolve(emittedRelForSource(owner.file), symbol, entry.kind);
          return {
            file: owner.file,
            symbol,
            declarationTypeFingerprint: resolved.fingerprint,
          };
        })
      );
      return {
        name: entry.name,
        kind: entry.kind,
        canonicalOwner,
        facadeDeclarationForm: entry.facadeDeclaration.form,
        runtimeIdentityMode: entry.facadeDeclaration.identity,
        surfaces: { facade, featureBarrel, runtime, servicesBase, servicesEntry },
      };
    });
    const typescriptPackage = JSON.parse(
      fs.readFileSync(path.join(root, 'node_modules/typescript/package.json'), 'utf8')
    );
    return {
      version: 1,
      typescriptVersion: typescriptPackage.version,
      capturedProductionHead: manifest.capturedProductionHead,
      surfaceTopology: manifest.surfaceTopology,
      symbolCount: symbols.length,
      symbols,
    };
  } finally {
    fs.rmSync(emittedRoot, { recursive: true, force: true });
  }
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.includes('--upgrade-manifest')) {
    upgradeManifestSchema(defaultRoot);
    return;
  }
  const writeIndex = args.indexOf('--write');
  const checkIndex = args.indexOf('--check');
  const snapshot = buildWardrobeDimensionPublicSurfaceSemanticSnapshot(defaultRoot);
  const output = `${JSON.stringify(snapshot, null, 2)}\n`;
  const targetIndex = writeIndex >= 0 ? writeIndex : checkIndex;
  if (targetIndex >= 0) {
    const targetArg = args[targetIndex + 1];
    if (!targetArg) throw new Error(`${args[targetIndex]} requires a target file`);
    const target = path.resolve(defaultRoot, targetArg);
    if (writeIndex >= 0) fs.writeFileSync(target, output);
    else if (fs.readFileSync(target, 'utf8') !== output) {
      throw new Error(`${toPosix(path.relative(defaultRoot, target))} is stale`);
    }
    return;
  }
  process.stdout.write(output);
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) runCli();

export { stableJson };
