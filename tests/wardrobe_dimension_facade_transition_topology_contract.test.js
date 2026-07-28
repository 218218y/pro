import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const runtimeApiRel = 'esm/native/runtime/api.ts';
const servicesBaseRel = 'esm/native/services/api_runtime_base_surface.ts';
const servicesApiRel = 'esm/native/services/api.ts';
const inventoryRel = 'tools/wp_wardrobe_dimension_facade_transition_inventory.json';
const manifestRel = 'tools/wp_wardrobe_dimension_public_surface_manifest.json';
const facadeAbsolute = path.join(root, facadeRel);
const publicDimensionsAbsolute = path.join(root, publicDimensionsRel);
const runtimeApiAbsolute = path.join(root, runtimeApiRel);
const servicesBaseAbsolute = path.join(root, servicesBaseRel);
const servicesApiAbsolute = path.join(root, servicesApiRel);
const sourceFileExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const runtimeExtensionCandidates = Object.freeze({
  '.js': Object.freeze(['.ts', '.tsx', '.mts']),
  '.mjs': Object.freeze(['.mts', '.ts', '.tsx']),
  '.cjs': Object.freeze(['.cts', '.ts', '.tsx']),
});
const classificationValues = new Set([
  'external compatibility',
  'internal transition only',
  'intentional focused public API',
  'unused/stale compatibility',
  'undetermined — blocks removal',
]);
const facadeDeclarationForms = new Set([
  'focused-owner-local-alias',
  'identity-local-export',
  'imported-type-local-export',
  'legacy-number-view-local-export',
  'local-composition',
  'named-re-export',
  'type-re-export',
]);
const expectedConsumerGroups = Object.freeze({
  'esm/native/ui/export/export_order_pdf_text_details.ts': 'E',
  'esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller_chest.ts': 'B',
  'esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller_corner.ts': 'B',
  'esm/native/ui/react/tabs/structure_tab_structure_mutations_shared.ts': 'C',
  'esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts': 'C',
  'esm/native/ui/react/tabs/structure_tab_structure_stack_split_mutations.ts': 'D',
  'esm/native/ui/react/tabs/structure_tab_workflows_controller_shared.ts': 'C',
});

const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const manifest = JSON.parse(read(manifestRel));
const inventory = JSON.parse(read(inventoryRel));
const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
const productionFiles = listSourceFiles(path.join(root, 'esm'));
const sourceCache = new Map();
const analysisCache = new Map();
const ownerExportCache = new Map();
const typeImportQualifierCache = new Map();
const facadeExportCache = new Map();
const facadeProvenanceCache = new Map();

function listSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(absolute);
    return entry.isFile() && /\.(?:[cm]?[jt]sx?)$/u.test(entry.name) ? [absolute] : [];
  });
}

function rel(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function sourceFor(file) {
  if (!sourceCache.has(file)) sourceCache.set(file, fs.readFileSync(file, 'utf8'));
  return sourceCache.get(file);
}

function analysisFor(file) {
  if (!analysisCache.has(file)) {
    analysisCache.set(file, analyzeModuleDependencies(file, sourceFor(file)));
  }
  return analysisCache.get(file);
}

function stripQueryHash(specifier) {
  const query = specifier.indexOf('?');
  const hash = specifier.indexOf('#');
  const cut = query === -1 ? hash : hash === -1 ? query : Math.min(query, hash);
  return cut === -1 ? specifier : specifier.slice(0, cut);
}

function canonicalModuleTarget(file) {
  return path.normalize(path.resolve(file)).toLowerCase();
}

function resolveModuleTarget(fromFile, specifier) {
  if (typeof specifier !== 'string') return null;
  const cleanSpecifier = stripQueryHash(specifier);
  let raw;
  if (cleanSpecifier.startsWith('/esm/')) raw = path.join(root, cleanSpecifier.slice(1));
  else if (cleanSpecifier.startsWith('@/')) raw = path.join(root, 'esm', cleanSpecifier.slice(2));
  else if (cleanSpecifier.startsWith('.')) raw = path.resolve(path.dirname(fromFile), cleanSpecifier);
  else return null;

  const candidates = [raw];
  const extension = path.extname(raw).toLowerCase();
  if (!extension) {
    candidates.push(...sourceFileExtensions.map(sourceExtension => `${raw}${sourceExtension}`));
  } else {
    const replacementExtensions = runtimeExtensionCandidates[extension] ?? [];
    const stem = raw.slice(0, -extension.length);
    candidates.push(...replacementExtensions.map(sourceExtension => `${stem}${sourceExtension}`));
  }
  if (fs.existsSync(raw) && fs.statSync(raw).isDirectory()) {
    candidates.push(
      ...sourceFileExtensions.map(sourceExtension => path.join(raw, `index${sourceExtension}`))
    );
  }
  const resolved = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  return resolved ? canonicalModuleTarget(resolved) : null;
}

function isTarget(fromFile, specifier, target) {
  return resolveModuleTarget(fromFile, specifier) === canonicalModuleTarget(target);
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function normalizeBindings(bindings) {
  return [...bindings]
    .map(binding => [binding.importedName, binding.localName, binding.exportedName])
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function normalizeRoute(file, dependency) {
  return {
    fromFile: rel(file),
    specifier: dependency.specifier,
    kind: dependency.kind,
    syntax: dependency.syntax,
    importedSymbols: sorted(dependency.importedSymbols),
    exportedSymbols: sorted(dependency.exportedSymbols),
    bindings: normalizeBindings(dependency.bindings),
  };
}

function sortRoutes(routes) {
  return [...routes].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function expectedFacadeRoutes(candidateManifest = manifest) {
  const runtimeValues = candidateManifest.symbols
    .filter(entry => entry.runtimeApiRoute?.kind === 'value')
    .map(entry => entry.name);
  const runtimeTypes = candidateManifest.symbols
    .filter(entry => entry.runtimeApiRoute?.kind === 'type')
    .map(entry => entry.name);
  return sortRoutes([
    {
      fromFile: publicDimensionsRel,
      specifier: '../../../shared/wardrobe_dimension_tokens_shared.js',
      kind: 'value',
      syntax: 'static-re-export',
      importedSymbols: ['*'],
      exportedSymbols: ['*'],
      bindings: [['*', null, '*']],
    },
    {
      fromFile: runtimeApiRel,
      specifier: '../../shared/wardrobe_dimension_tokens_shared.js',
      kind: 'value',
      syntax: 'static-re-export',
      importedSymbols: sorted(runtimeValues),
      exportedSymbols: sorted(runtimeValues),
      bindings: sorted(runtimeValues).map(name => [name, null, name]),
    },
    {
      fromFile: runtimeApiRel,
      specifier: '../../shared/wardrobe_dimension_tokens_shared.js',
      kind: 'type',
      syntax: 'type-re-export',
      importedSymbols: sorted(runtimeTypes),
      exportedSymbols: sorted(runtimeTypes),
      bindings: sorted(runtimeTypes).map(name => [name, null, name]),
    },
  ]);
}

function collectProductionTopology() {
  const facadeRoutes = [];
  const publicBarrelRoutes = [];
  const unresolvedDynamicImports = [];
  const forbiddenModuleSyntax = [];
  for (const file of productionFiles) {
    const analysis = analysisFor(file);
    for (const dependency of analysis.imports) {
      if (isTarget(file, dependency.specifier, facadeAbsolute)) {
        facadeRoutes.push(normalizeRoute(file, dependency));
      }
      if (isTarget(file, dependency.specifier, publicDimensionsAbsolute)) {
        publicBarrelRoutes.push(normalizeRoute(file, dependency));
      }
    }
    unresolvedDynamicImports.push(
      ...analysis.unresolvedDynamicImports.map(issue => ({
        fromFile: rel(file),
        expression: issue.expression,
      }))
    );
    forbiddenModuleSyntax.push(
      ...analysis.forbiddenModuleSyntax.map(issue => ({
        fromFile: rel(file),
        syntax: issue.syntax,
        expression: issue.expression,
      }))
    );
  }
  return {
    facadeRoutes: sortRoutes(facadeRoutes),
    publicBarrelRoutes: sortRoutes(publicBarrelRoutes),
    unresolvedDynamicImports: unresolvedDynamicImports.sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right))
    ),
    forbiddenModuleSyntax: forbiddenModuleSyntax.sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right))
    ),
  };
}

function expectedDynamicImports() {
  return baseline.dynamicImportAllowlist
    .flatMap(entry =>
      Array.from({ length: entry.maxOccurrences }, () => ({
        fromFile: entry.fromFile,
        expression: entry.expression,
      }))
    )
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function facadeExportsForSource(source) {
  if (!facadeExportCache.has(source)) {
    facadeExportCache.set(source, collectNamedModuleExports(facadeRel, source));
  }
  return facadeExportCache.get(source);
}

function facadeExportInventory(source = read(facadeRel)) {
  return facadeExportsForSource(source)
    .filter(entry => entry.exportedName !== '*')
    .map(entry => [entry.kind, entry.exportedName])
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function manifestExportInventory(candidateManifest) {
  return candidateManifest.symbols
    .map(entry => [entry.kind, entry.name])
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function exportsForOwner(ownerFile) {
  if (!ownerExportCache.has(ownerFile)) {
    const exportsByName = new Map();
    for (const entry of collectNamedModuleExports(ownerFile, read(ownerFile))) {
      if (entry.exportedName === '*') continue;
      const kinds = exportsByName.get(entry.exportedName) ?? new Set();
      kinds.add(entry.kind);
      exportsByName.set(entry.exportedName, kinds);
    }
    ownerExportCache.set(ownerFile, exportsByName);
  }
  return ownerExportCache.get(ownerFile);
}

function identifierName(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function memberPath(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type !== 'MemberExpression') return null;
  const objectPath = memberPath(node.object);
  const propertyName = identifierName(node.property);
  return objectPath && propertyName ? `${objectPath}.${propertyName}` : null;
}

function typeImportQualifier(file, statementStart) {
  if (!typeImportQualifierCache.has(file)) {
    const qualifiers = new Map();
    walkAst(createSourceFile(file, sourceFor(file)), node => {
      if (node?.type === 'TSImportType') {
        qualifiers.set(Number(node.start), memberPath(node.qualifier));
      }
    });
    typeImportQualifierCache.set(file, qualifiers);
  }
  return typeImportQualifierCache.get(file).get(statementStart) ?? null;
}

function normalizeOwnerExports(ownerExports) {
  const symbolsByFile = new Map();
  for (const owner of ownerExports) {
    const symbols = symbolsByFile.get(owner.file) ?? new Set();
    for (const symbol of owner.symbols) symbols.add(symbol);
    symbolsByFile.set(owner.file, symbols);
  }
  return [...symbolsByFile]
    .map(([file, symbols]) => ({ file, symbols: sorted(symbols) }))
    .sort((left, right) => left.file.localeCompare(right.file));
}

function traceOwnerReference(fromFile, specifier, exportedName, kind, seen = new Set()) {
  const target = resolveModuleTarget(fromFile, specifier);
  assert.ok(target, `${rel(fromFile)} cannot resolve ${specifier}`);
  const targetFile = productionFiles.find(file => canonicalModuleTarget(file) === target);
  assert.ok(targetFile, `${specifier} must resolve inside the production graph`);
  const targetRel = rel(targetFile);
  const key = `${targetRel}:${kind}:${exportedName}`;
  assert.equal(seen.has(key), false, `owner re-export cycle at ${key}`);
  const nextSeen = new Set(seen).add(key);
  const exported = collectNamedModuleExports(targetRel, sourceFor(targetFile)).find(
    entry => entry.exportedName === exportedName && entry.kind === kind
  );
  assert.ok(exported, `${targetRel} must export ${kind}:${exportedName}`);
  if (exported.source) {
    return traceOwnerReference(
      targetFile,
      exported.source,
      exported.localName ?? exportedName,
      exported.kind,
      nextSeen
    );
  }
  return [{ file: targetRel, symbols: [exported.localName ?? exportedName] }];
}

function deriveFacadeProvenance(source) {
  if (facadeProvenanceCache.has(source)) return facadeProvenanceCache.get(source);
  const sourceFile = createSourceFile(facadeRel, source);
  const analysis = analyzeModuleDependencies(facadeRel, source);
  const importsByLocalName = new Map();
  for (const dependency of analysis.imports) {
    for (const binding of dependency.bindings) {
      if (!binding.localName || binding.importedName === '*') continue;
      importsByLocalName.set(binding.localName, {
        specifier: dependency.specifier,
        importedName: binding.importedName,
        kind: dependency.kind,
      });
    }
  }

  const variableInitializers = new Map();
  walkAst(sourceFile, node => {
    if (node?.type !== 'VariableDeclarator') return;
    const name = identifierName(node.id);
    if (name && node.init) variableInitializers.set(name, node.init);
  });

  const collectLocalReferences = (name, seen = new Set()) => {
    if (!name || seen.has(name)) return [];
    const nextSeen = new Set(seen).add(name);
    const imported = importsByLocalName.get(name);
    if (imported) {
      return traceOwnerReference(facadeAbsolute, imported.specifier, imported.importedName, imported.kind);
    }
    const initializer = variableInitializers.get(name);
    if (!initializer) return [];
    const references = [];
    walkAst(initializer, node => {
      if (node?.type !== 'Identifier') return;
      references.push(...collectLocalReferences(node.name, nextSeen));
    });
    return references;
  };

  const result = new Map();
  for (const exported of facadeExportsForSource(source)) {
    if (exported.exportedName === '*') continue;
    const initializer = variableInitializers.get(exported.localName);
    let form;
    if (exported.source) form = exported.kind === 'type' ? 'type-re-export' : 'named-re-export';
    else if (initializer?.type === 'CallExpression') {
      if (identifierName(initializer.callee) === 'legacyDimensionNumberView') {
        form = 'legacy-number-view-local-export';
      } else if (memberPath(initializer.callee) === 'Object.freeze') {
        form = 'local-composition';
      }
    } else if (initializer?.type === 'Identifier') form = 'focused-owner-local-alias';
    else if (importsByLocalName.has(exported.localName)) {
      form = exported.kind === 'type' ? 'imported-type-local-export' : 'identity-local-export';
    }
    assert.ok(form, `unsupported facade declaration form for ${exported.exportedName}`);

    const ownerExports = exported.source
      ? traceOwnerReference(
          facadeAbsolute,
          exported.source,
          exported.localName ?? exported.exportedName,
          exported.kind
        )
      : collectLocalReferences(exported.localName);
    const identity =
      form === 'local-composition'
        ? 'new-aggregate'
        : form === 'type-re-export' || form === 'imported-type-local-export'
          ? 'declaration-identity'
          : form === 'named-re-export'
            ? 'direct-owner-identity'
            : 'direct-runtime-reference';
    result.set(exported.exportedName, {
      form,
      identity,
      ownerExports: normalizeOwnerExports(ownerExports),
    });
  }
  facadeProvenanceCache.set(source, result);
  return result;
}

function collectDimensionRouteFromDependency(file, target, dimensionNames) {
  return analysisFor(file).imports.flatMap(dependency => {
    if (!isTarget(file, dependency.specifier, target)) return [];
    return dependency.importedSymbols
      .filter(name => dimensionNames.has(name))
      .map(name => ({ name, kind: dependency.kind }));
  });
}

function actualRuntimeRouteInventory(dimensionNames) {
  return collectDimensionRouteFromDependency(runtimeApiAbsolute, facadeAbsolute, dimensionNames)
    .map(entry => [entry.kind, entry.name])
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function normalizeDimensionProjection(file, dependency, dimensionNames) {
  const bindings = dependency.bindings.filter(binding => dimensionNames.has(binding.importedName));
  return {
    fromFile: rel(file),
    specifier: dependency.specifier,
    kind: dependency.kind,
    syntax: dependency.syntax,
    importedSymbols: sorted(bindings.map(binding => binding.importedName)),
    exportedSymbols: sorted(
      bindings.map(binding => binding.exportedName).filter(name => typeof name === 'string')
    ),
    bindings: normalizeBindings(bindings),
  };
}

function collectDimensionProjectionRoutes(file, target, dimensionNames, source = null) {
  const analysis = source === null ? analysisFor(file) : analyzeModuleDependencies(file, source);
  return sortRoutes(
    analysis.imports
      .filter(dependency => isTarget(file, dependency.specifier, target))
      .filter(dependency => dependency.bindings.some(binding => dimensionNames.has(binding.importedName)))
      .map(dependency => normalizeDimensionProjection(file, dependency, dimensionNames))
  );
}

function expectedServicesBaseProjectionRoutes(candidateManifest) {
  const values = candidateManifest.symbols
    .filter(entry => entry.servicesApiRoute?.kind === 'value')
    .map(entry => entry.name);
  const types = candidateManifest.symbols
    .filter(entry => entry.servicesApiRoute?.kind === 'type')
    .map(entry => entry.name);
  return sortRoutes([
    {
      fromFile: servicesBaseRel,
      specifier: '../runtime/api.js',
      kind: 'value',
      syntax: 'static-re-export',
      importedSymbols: sorted(values),
      exportedSymbols: sorted(values),
      bindings: sorted(values).map(name => [name, null, name]),
    },
    {
      fromFile: servicesBaseRel,
      specifier: '../runtime/api.js',
      kind: 'type',
      syntax: 'type-re-export',
      importedSymbols: sorted(types),
      exportedSymbols: sorted(types),
      bindings: sorted(types).map(name => [name, null, name]),
    },
  ]);
}

function expectedRuntimeRouteInventory(candidateManifest) {
  return candidateManifest.symbols
    .filter(entry => entry.runtimeApiRoute)
    .map(entry => [entry.runtimeApiRoute.kind, entry.name])
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function collectServicesEntryRoute(dimensionNames, source = null) {
  const analysis =
    source === null ? analysisFor(servicesApiAbsolute) : analyzeModuleDependencies(servicesApiRel, source);
  const wildcardRoutes = [];
  const representativeRoutes = [];
  for (const dependency of analysis.imports) {
    if (!isTarget(servicesApiAbsolute, dependency.specifier, servicesBaseAbsolute)) continue;
    if (dependency.importedSymbols.includes('*')) {
      wildcardRoutes.push(normalizeRoute(servicesApiAbsolute, dependency));
    }
    if (dependency.bindings.some(binding => dimensionNames.has(binding.importedName))) {
      representativeRoutes.push(
        normalizeDimensionProjection(servicesApiAbsolute, dependency, dimensionNames)
      );
    }
  }
  return {
    wildcardRoutes: sortRoutes(wildcardRoutes),
    representativeRoutes: sortRoutes(representativeRoutes),
  };
}

function expectedServicesEntryRoute(candidateManifest) {
  const representativeNames = candidateManifest.symbols
    .filter(entry => entry.servicesApiRoute?.entryForms.includes('representative-named-re-export'))
    .map(entry => entry.name);
  return {
    wildcardRoutes: [
      {
        fromFile: servicesApiRel,
        specifier: './api_runtime_base_surface.js',
        kind: 'value',
        syntax: 'static-re-export',
        importedSymbols: ['*'],
        exportedSymbols: ['*'],
        bindings: [['*', null, '*']],
      },
    ],
    representativeRoutes: [
      {
        fromFile: servicesApiRel,
        specifier: './api_runtime_base_surface.js',
        kind: 'value',
        syntax: 'static-re-export',
        importedSymbols: sorted(representativeNames),
        exportedSymbols: sorted(representativeNames),
        bindings: sorted(representativeNames).map(name => [name, null, name]),
      },
    ],
  };
}

function collectInternalDimensionConsumers(dimensionNames) {
  const rows = [];
  const broadRoutes = [];
  for (const file of productionFiles) {
    for (const dependency of analysisFor(file).imports) {
      if (!isTarget(file, dependency.specifier, servicesApiAbsolute)) continue;
      const touchesDimensionSurface = dependency.importedSymbols.some(name => dimensionNames.has(name));
      const aliasesDimensionSurface = dependency.bindings.some(
        binding =>
          dimensionNames.has(binding.importedName) &&
          (binding.localName !== binding.importedName || binding.exportedName !== null)
      );
      if (
        dependency.importedSymbols.includes('*') ||
        dependency.syntax === 'dynamic-import' ||
        (dependency.syntax.endsWith('re-export') && touchesDimensionSurface) ||
        aliasesDimensionSurface
      ) {
        broadRoutes.push(normalizeRoute(file, dependency));
      }
      rows.push(
        ...dependency.importedSymbols
          .filter(name => dimensionNames.has(name))
          .map(name => ({ consumer: rel(file), symbol: name, usage: dependency.kind }))
      );
    }
  }
  rows.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return { rows, broadRoutes: sortRoutes(broadRoutes) };
}

function collectRoutedBindingBridgeViolations(dimensionNames, candidates = productionFiles) {
  const violations = [];
  for (const candidate of candidates) {
    const file = typeof candidate === 'string' ? candidate : candidate.file;
    const source = typeof candidate === 'string' ? sourceFor(file) : candidate.source;
    const analysis =
      typeof candidate === 'string' ? analysisFor(file) : analyzeModuleDependencies(file, source);
    const routedRootsByLocalName = new Map();
    for (const dependency of analysis.imports) {
      if (!isTarget(file, dependency.specifier, servicesApiAbsolute)) continue;
      for (const binding of dependency.bindings) {
        if (!binding.localName || !dimensionNames.has(binding.importedName)) continue;
        const roots = routedRootsByLocalName.get(binding.localName) ?? new Set();
        roots.add(binding.importedName);
        routedRootsByLocalName.set(binding.localName, roots);
      }
    }
    if (routedRootsByLocalName.size === 0) continue;

    const sourceFile = createSourceFile(file, source);
    const variableDeclarators = sourceFile.body.flatMap(statement => {
      if (statement.type === 'VariableDeclaration') return statement.declarations;
      if (
        statement.type === 'ExportNamedDeclaration' &&
        statement.declaration?.type === 'VariableDeclaration'
      ) {
        return statement.declaration.declarations;
      }
      return [];
    });

    const directRoots = node => {
      if (!node) return new Set();
      if (node.type === 'Identifier') {
        return new Set(routedRootsByLocalName.get(node.name) ?? []);
      }
      if (
        node.type === 'ParenthesizedExpression' ||
        node.type === 'TSAsExpression' ||
        node.type === 'TSSatisfiesExpression' ||
        node.type === 'TSNonNullExpression' ||
        node.type === 'TSTypeAssertion'
      ) {
        return directRoots(node.expression);
      }
      if (node.type === 'ObjectExpression') {
        const roots = new Set();
        for (const property of node.properties) {
          const value = property.type === 'SpreadElement' ? property.argument : property.value;
          for (const rootName of directRoots(value)) roots.add(rootName);
        }
        return roots;
      }
      if (node.type === 'ArrayExpression') {
        const roots = new Set();
        for (const element of node.elements) {
          const value = element?.type === 'SpreadElement' ? element.argument : element;
          for (const rootName of directRoots(value)) roots.add(rootName);
        }
        return roots;
      }
      return new Set();
    };

    let changed = true;
    while (changed) {
      changed = false;
      for (const declarator of variableDeclarators) {
        const localName = identifierName(declarator.id);
        if (!localName) continue;
        const roots = directRoots(declarator.init);
        if (roots.size === 0) continue;
        const knownRoots = routedRootsByLocalName.get(localName) ?? new Set();
        for (const rootName of roots) {
          if (knownRoots.has(rootName)) continue;
          knownRoots.add(rootName);
          changed = true;
        }
        routedRootsByLocalName.set(localName, knownRoots);
      }
    }

    const addViolation = (statement, exportedName, localName, roots) => {
      if (roots.size === 0) return;
      violations.push({
        type: 'transitive-dimension-local-bridge',
        consumer: rel(file),
        exportedName,
        localName,
        routedSymbols: sorted(roots),
        statementStart: Number(statement.start),
      });
    };

    for (const statement of sourceFile.body) {
      if (statement.type === 'ExportNamedDeclaration' && !statement.source) {
        for (const specifier of statement.specifiers) {
          const localName = identifierName(specifier.local);
          const exportedName = identifierName(specifier.exported);
          addViolation(
            statement,
            exportedName,
            localName,
            new Set(routedRootsByLocalName.get(localName) ?? [])
          );
        }
        if (statement.declaration?.type === 'VariableDeclaration') {
          for (const declarator of statement.declaration.declarations) {
            const localName = identifierName(declarator.id);
            addViolation(
              statement,
              localName,
              localName,
              new Set(routedRootsByLocalName.get(localName) ?? [])
            );
          }
        }
      }
      if (statement.type === 'ExportDefaultDeclaration') {
        const localName = identifierName(statement.declaration);
        addViolation(
          statement,
          'default',
          localName,
          localName
            ? new Set(routedRootsByLocalName.get(localName) ?? [])
            : directRoots(statement.declaration)
        );
      }
    }
  }
  return violations.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function collectUnapprovedTransitiveBridges(dimensionNames) {
  const violations = [];
  for (const file of productionFiles) {
    for (const dependency of analysisFor(file).imports) {
      const targetsRuntime = isTarget(file, dependency.specifier, runtimeApiAbsolute);
      const targetsServicesBase = isTarget(file, dependency.specifier, servicesBaseAbsolute);
      if (!targetsRuntime && !targetsServicesBase) continue;
      if (targetsRuntime && rel(file) === servicesBaseRel) continue;
      if (targetsServicesBase && rel(file) === servicesApiRel) continue;
      const touchesDimensionSurface = dependency.importedSymbols.some(name => dimensionNames.has(name));
      const qualifier =
        dependency.syntax === 'type-import' ? typeImportQualifier(file, dependency.statementStart) : null;
      const starCanReachDimensionSurface =
        dependency.importedSymbols.includes('*') &&
        !(dependency.syntax === 'type-import' && qualifier && !dimensionNames.has(qualifier));
      const isBroad = starCanReachDimensionSurface || dependency.syntax === 'dynamic-import';
      if (touchesDimensionSurface || isBroad) violations.push(normalizeRoute(file, dependency));
    }
  }
  return sortRoutes(violations);
}

function inventoryRows(candidateInventory) {
  return candidateInventory.consumers
    .flatMap(consumer =>
      consumer.symbols.map(symbol => ({
        consumer: consumer.consumer,
        symbol: symbol.importedSymbol,
        usage: symbol.usage,
      }))
    )
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function expectedManifestConsumers(actualRows) {
  const bySymbol = new Map();
  for (const row of actualRows) {
    const entries = bySymbol.get(row.symbol) ?? [];
    entries.push({ file: row.consumer, usage: row.usage, route: 'facade-runtime-services-api' });
    bySymbol.set(row.symbol, entries);
  }
  return bySymbol;
}

function inspectManifest(candidateManifest, actualRows = null, options = {}) {
  const facadeSource = options.facadeSource ?? read(facadeRel);
  const servicesBaseSource = options.servicesBaseSource ?? null;
  const servicesEntrySource = options.servicesEntrySource ?? null;
  assert.equal(candidateManifest.version, 1);
  assert.equal(candidateManifest.facade.file, facadeRel);
  assert.equal(candidateManifest.facade.featureCompatibilityRoute, publicDimensionsRel);
  assert.ok(Array.isArray(candidateManifest.symbols));
  const keys = candidateManifest.symbols.map(entry => `${entry.kind}:${entry.name}`);
  assert.equal(new Set(keys).size, keys.length, 'public manifest symbols must be unique');
  const facadeExports = facadeExportsForSource(facadeSource);
  assert.deepEqual(
    facadeExports.filter(entry => entry.exportedName === '*'),
    [],
    'the legacy facade must not gain wildcard exports'
  );
  assert.deepEqual(manifestExportInventory(candidateManifest), facadeExportInventory(facadeSource));
  const facadeProvenance = deriveFacadeProvenance(facadeSource);
  const evidenceIds = new Set(Object.keys(candidateManifest.evidenceCatalog));
  for (const [evidenceId, evidence] of Object.entries(candidateManifest.evidenceCatalog)) {
    assert.ok(evidenceId);
    assert.ok(evidence.polarity === 'affirmative' || evidence.polarity === 'negative');
    assert.ok(Array.isArray(evidence.sources) && evidence.sources.length > 0);
    assert.ok(typeof evidence.result === 'string' && evidence.result.length > 0);
  }

  for (const entry of candidateManifest.symbols) {
    assert.ok(entry.name);
    assert.ok(entry.kind === 'value' || entry.kind === 'type');
    assert.ok(classificationValues.has(entry.classification), entry.name);
    assert.ok(facadeDeclarationForms.has(entry.facadeDeclaration?.form), entry.name);
    assert.equal(entry.facadeDeclaration?.file, facadeRel, entry.name);
    assert.ok(entry.canonicalOwner?.kind === 'focused' || entry.canonicalOwner?.kind === 'composition');
    assert.ok(Array.isArray(entry.canonicalOwner.exports) && entry.canonicalOwner.exports.length > 0);
    assert.ok(Array.isArray(entry.internalConsumers));
    assert.ok(Array.isArray(entry.externalEvidence));
    const provenance = facadeProvenance.get(entry.name);
    assert.ok(provenance, entry.name);
    assert.equal(
      entry.canonicalOwner.kind,
      provenance.form === 'local-composition' ? 'composition' : 'focused',
      entry.name
    );
    assert.equal(entry.facadeDeclaration.form, provenance.form, entry.name);
    assert.equal(entry.facadeDeclaration.identity, provenance.identity, entry.name);
    assert.deepEqual(
      normalizeOwnerExports(entry.canonicalOwner.exports),
      provenance.ownerExports,
      entry.name
    );
    for (const evidenceId of entry.externalEvidence) {
      assert.ok(evidenceIds.has(evidenceId), `${entry.name}: unknown evidence ${evidenceId}`);
    }
    assert.ok(typeof entry.plannedAction === 'string' && entry.plannedAction.length > 0, entry.name);
    if (entry.classification === 'undetermined — blocks removal') {
      assert.doesNotMatch(entry.plannedAction, /remove|retire|delete/u, entry.name);
    }
    if (entry.classification === 'internal transition only') {
      assert.ok(entry.internalConsumers.length > 0, entry.name);
      assert.equal(entry.externalEvidence.length, 0, entry.name);
      assert.equal(entry.plannedAction, 'migrate-internal-consumers-then-audit-public-route', entry.name);
    }
    if (
      entry.classification === 'external compatibility' ||
      entry.classification === 'intentional focused public API'
    ) {
      assert.ok(entry.externalEvidence.length > 0, entry.name);
      assert.equal(
        entry.externalEvidence.every(
          evidenceId => candidateManifest.evidenceCatalog[evidenceId].polarity === 'affirmative'
        ),
        true,
        entry.name
      );
    }
    if (entry.classification === 'unused/stale compatibility') {
      assert.equal(entry.internalConsumers.length, 0, entry.name);
      assert.ok(entry.externalEvidence.length > 0, entry.name);
      assert.equal(
        entry.externalEvidence.every(
          evidenceId => candidateManifest.evidenceCatalog[evidenceId].polarity === 'affirmative'
        ),
        true,
        entry.name
      );
    }
    for (const owner of entry.canonicalOwner.exports) {
      assert.ok(fs.existsSync(path.join(root, owner.file)), `${entry.name}: ${owner.file}`);
      assert.ok(Array.isArray(owner.symbols) && owner.symbols.length > 0, entry.name);
      const exportedNames = exportsForOwner(owner.file);
      for (const ownerSymbol of owner.symbols) {
        const expectedOwnerKind = entry.canonicalOwner.kind === 'composition' ? 'value' : entry.kind;
        assert.ok(
          exportedNames.get(ownerSymbol)?.has(expectedOwnerKind),
          `${entry.name}: ${owner.file}#${expectedOwnerKind}:${ownerSymbol}`
        );
      }
    }

    if (entry.runtimeApiRoute) {
      assert.deepEqual(entry.runtimeApiRoute, {
        file: runtimeApiRel,
        kind: entry.kind,
        form: entry.kind === 'type' ? 'type-re-export' : 'named-re-export',
      });
      assert.ok(entry.servicesApiRoute, entry.name);
      assert.equal(entry.servicesApiRoute.baseFile, servicesBaseRel, entry.name);
      assert.equal(entry.servicesApiRoute.entryFile, servicesApiRel, entry.name);
      assert.equal(entry.servicesApiRoute.kind, entry.kind, entry.name);
      assert.equal(
        entry.servicesApiRoute.baseForm,
        entry.kind === 'type' ? 'type-re-export' : 'named-re-export',
        entry.name
      );
      assert.ok(Array.isArray(entry.servicesApiRoute.entryForms), entry.name);
      assert.equal(new Set(entry.servicesApiRoute.entryForms).size, entry.servicesApiRoute.entryForms.length);
      assert.equal(entry.servicesApiRoute.entryForms.includes('wildcard-re-export'), true, entry.name);
      assert.equal(
        entry.servicesApiRoute.entryForms.every(form =>
          ['wildcard-re-export', 'representative-named-re-export'].includes(form)
        ),
        true,
        entry.name
      );
    } else {
      assert.equal(entry.servicesApiRoute, null, entry.name);
    }
  }

  const dimensionNames = new Set(candidateManifest.symbols.map(entry => entry.name));
  const expectedRoutes = expectedRuntimeRouteInventory(candidateManifest);
  assert.deepEqual(actualRuntimeRouteInventory(dimensionNames), expectedRoutes);
  assert.deepEqual(
    collectDimensionProjectionRoutes(
      servicesBaseAbsolute,
      runtimeApiAbsolute,
      dimensionNames,
      servicesBaseSource
    ),
    expectedServicesBaseProjectionRoutes(candidateManifest)
  );
  const servicesBaseAnalysis =
    servicesBaseSource === null
      ? analysisFor(servicesBaseAbsolute)
      : analyzeModuleDependencies(servicesBaseRel, servicesBaseSource);
  const broadServicesBaseRoutes = servicesBaseAnalysis.imports
    .filter(dependency => isTarget(servicesBaseAbsolute, dependency.specifier, runtimeApiAbsolute))
    .filter(dependency => dependency.importedSymbols.includes('*') || dependency.syntax === 'dynamic-import');
  assert.deepEqual(broadServicesBaseRoutes, []);

  const servicesEntry = collectServicesEntryRoute(dimensionNames, servicesEntrySource);
  assert.deepEqual(servicesEntry, expectedServicesEntryRoute(candidateManifest));
  const actualRepresentativeNames = new Set(
    servicesEntry.representativeRoutes.flatMap(route => route.importedSymbols)
  );
  for (const entry of candidateManifest.symbols) {
    if (!entry.runtimeApiRoute) continue;
    assert.deepEqual(entry.servicesApiRoute, {
      baseFile: servicesBaseRel,
      entryFile: servicesApiRel,
      kind: entry.kind,
      baseForm: entry.kind === 'type' ? 'type-re-export' : 'named-re-export',
      entryForms:
        entry.kind === 'value' && actualRepresentativeNames.has(entry.name)
          ? ['wildcard-re-export', 'representative-named-re-export']
          : ['wildcard-re-export'],
    });
  }

  if (actualRows) {
    const bySymbol = expectedManifestConsumers(actualRows);
    for (const entry of candidateManifest.symbols) {
      const expected = (bySymbol.get(entry.name) ?? []).sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right))
      );
      const actual = [...entry.internalConsumers].sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right))
      );
      assert.deepEqual(actual, expected, entry.name);
    }
  }
}

function inspectInventory(candidateInventory, actualRows) {
  assert.equal(candidateInventory.version, 1);
  assert.equal(candidateInventory.capturedAtHead, manifest.capturedAtHead);
  assert.equal(candidateInventory.completeRouteInventory, manifestRel);
  assert.deepEqual(inventoryRows(candidateInventory), actualRows);
  assert.deepEqual(candidateInventory.routeCatalog, {
    'facade-runtime-services-api': {
      facade: facadeRel,
      runtime: runtimeApiRel,
      servicesBase: servicesBaseRel,
      servicesEntry: servicesApiRel,
    },
  });
  assert.deepEqual(candidateInventory.publicExternalEvidence.affirmative, []);
  assert.deepEqual(
    sorted(candidateInventory.publicExternalEvidence.negativeEvidenceIds),
    sorted(
      Object.entries(manifest.evidenceCatalog)
        .filter(([, evidence]) => evidence.polarity === 'negative')
        .map(([evidenceId]) => evidenceId)
    )
  );
  const manifestByName = new Map(manifest.symbols.map(entry => [entry.name, entry]));
  const consumers = candidateInventory.consumers.map(entry => entry.consumer);
  assert.equal(new Set(consumers).size, consumers.length);
  assert.deepEqual(
    Object.fromEntries(
      candidateInventory.consumers
        .map(entry => [entry.consumer, entry.checkpointGroup])
        .sort(([left], [right]) => left.localeCompare(right))
    ),
    expectedConsumerGroups
  );
  for (const consumer of candidateInventory.consumers) {
    assert.ok(consumer.symbols.length > 0);
    for (const symbol of consumer.symbols) {
      const publicEntry = manifestByName.get(symbol.importedSymbol);
      assert.equal(symbol.originalFacadeSymbol, symbol.importedSymbol);
      assert.equal(symbol.runtimeServicesRoute, 'facade-runtime-services-api');
      assert.equal(symbol.usage, 'value');
      assert.deepEqual(symbol.publicExternalEvidence, publicEntry?.externalEvidence ?? []);
      assert.ok(symbol.migrationDecision.includes(`Checkpoint 2${consumer.checkpointGroup}`));
      assert.ok(publicEntry?.runtimeApiRoute, symbol.importedSymbol);
      assert.equal(publicEntry.canonicalOwner.kind, 'focused', symbol.importedSymbol);
      assert.deepEqual(symbol.canonicalFocusedOwner, publicEntry.canonicalOwner.exports[0]);
    }
  }
}

function syntheticCompatibilityViolations(file, source) {
  const analysis = analyzeModuleDependencies(file, source);
  const targeted = analysis.imports.filter(
    dependency =>
      isTarget(file, dependency.specifier, facadeAbsolute) ||
      isTarget(file, dependency.specifier, publicDimensionsAbsolute) ||
      isTarget(file, dependency.specifier, runtimeApiAbsolute) ||
      isTarget(file, dependency.specifier, servicesBaseAbsolute)
  );
  return [
    ...targeted.map(dependency => ({ syntax: dependency.syntax, specifier: dependency.specifier })),
    ...analysis.unresolvedDynamicImports.map(issue => ({
      syntax: 'unresolved-dynamic-import',
      specifier: issue.expression,
    })),
    ...analysis.forbiddenModuleSyntax.map(issue => ({
      syntax: issue.syntax,
      specifier: issue.expression,
    })),
  ];
}

test('production facade topology is exactly the two approved compatibility routes', () => {
  const topology = collectProductionTopology();
  assert.deepEqual(topology.facadeRoutes, expectedFacadeRoutes());
  assert.deepEqual(
    topology.facadeRoutes.filter(route => route.syntax === 'static-import'),
    [],
    'production must have no static import consumer of the facade'
  );
  assert.deepEqual(topology.publicBarrelRoutes, []);
  assert.deepEqual(topology.unresolvedDynamicImports, expectedDynamicImports());
  assert.deepEqual(topology.forbiddenModuleSyntax, []);
});

test('public surface manifest is a typed bijection with canonical owner and route evidence', () => {
  const dimensionNames = new Set(manifest.symbols.map(entry => entry.name));
  const consumers = collectInternalDimensionConsumers(dimensionNames);
  assert.deepEqual(consumers.broadRoutes, []);
  assert.deepEqual(collectUnapprovedTransitiveBridges(dimensionNames), []);
  assert.deepEqual(collectRoutedBindingBridgeViolations(dimensionNames), []);
  assert.deepEqual(
    sorted(new Set(consumers.rows.map(row => row.consumer))),
    sorted(Object.keys(expectedConsumerGroups))
  );
  inspectManifest(manifest, consumers.rows);

  const directRuntimeConsumers = productionFiles.flatMap(file => {
    if (rel(file) === servicesBaseRel) return [];
    return collectDimensionRouteFromDependency(file, runtimeApiAbsolute, dimensionNames).map(entry => ({
      file: rel(file),
      ...entry,
    }));
  });
  assert.deepEqual(directRuntimeConsumers, []);
});

test('transitive compatibility inventory is exact, value/type explicit, and migration-group owned', () => {
  const dimensionNames = new Set(manifest.symbols.map(entry => entry.name));
  const consumers = collectInternalDimensionConsumers(dimensionNames);
  assert.deepEqual(consumers.broadRoutes, []);
  inspectInventory(inventory, consumers.rows);
});

test('negative repository evidence never turns an undetermined symbol into a removal decision', () => {
  const packageJson = JSON.parse(read('package.json'));
  const featureManifest = JSON.parse(read('tools/wp_features_public_api_manifest.json'));
  assert.equal(packageJson.private, true);
  assert.equal(Object.prototype.hasOwnProperty.call(packageJson, 'exports'), false);
  assert.equal(featureManifest.publicEntries.includes('dimensions/index.js'), false);
  assert.ok(manifest.symbols.some(entry => entry.classification === 'undetermined — blocks removal'));
  for (const entry of manifest.symbols) {
    assert.deepEqual(entry.externalEvidence, []);
    assert.equal(
      entry.classification,
      entry.internalConsumers.length ? 'internal transition only' : 'undetermined — blocks removal',
      entry.name
    );
    if (entry.classification === 'undetermined — blocks removal') {
      assert.equal(entry.plannedAction, 'retain-until-external-evidence-or-explicit-public-surface-decision');
    }
  }
});

test('compatibility target resolver covers explicit, extensionless, index, normalized, alias, and query paths', () => {
  const probeFile = path.join(root, 'esm/native/services/__wardrobe_dimension_topology_probe.ts');
  const facadeSpecifiers = [
    '../../shared/wardrobe_dimension_tokens_shared.js',
    '../../shared/wardrobe_dimension_tokens_shared.ts',
    '../../shared/wardrobe_dimension_tokens_shared',
    '../../shared/wardrobe_dimension_tokens_shared.mjs',
    '../../shared/wardrobe_dimension_tokens_shared.cjs',
    '../../shared/./wardrobe_dimension_tokens_shared.js?raw#v',
    '@/shared/wardrobe_dimension_tokens_shared',
    '/esm/shared/wardrobe_dimension_tokens_shared.js',
  ];
  const publicSpecifiers = [
    '../features/dimensions/index.js',
    '../features/dimensions/index.ts',
    '../features/dimensions/index',
    '../features/dimensions',
    '../features/dimensions/index.mjs',
    '../features/dimensions/index.cjs',
    '../features/./dimensions/../dimensions/index?raw#v',
    '@/native/features/dimensions',
    '/esm/native/features/dimensions',
  ];
  for (const specifier of facadeSpecifiers) {
    assert.equal(resolveModuleTarget(probeFile, specifier), canonicalModuleTarget(facadeAbsolute));
  }
  for (const specifier of publicSpecifiers) {
    assert.equal(resolveModuleTarget(probeFile, specifier), canonicalModuleTarget(publicDimensionsAbsolute));
  }
});

test('topology mutation probes reject direct, broad, re-exported, dynamic, alias, and bridge attempts', () => {
  const probeFile = path.join(root, 'esm/native/services/__wardrobe_dimension_topology_probe.ts');
  const cases = [
    "import { DEFAULT_WIDTH } from '../../shared/wardrobe_dimension_tokens_shared.js';",
    "import { DEFAULT_WIDTH as WIDTH } from '../../shared/wardrobe_dimension_tokens_shared';",
    "import * as dimensions from '@/shared/wardrobe_dimension_tokens_shared';",
    "import { DEFAULT_WIDTH } from '/esm/shared/wardrobe_dimension_tokens_shared.js';",
    "import '../../shared/wardrobe_dimension_tokens_shared.js';",
    "import type { WardrobeDimensionDefaultType } from '../../shared/wardrobe_dimension_tokens_shared.js';",
    "export { DEFAULT_WIDTH } from '../../shared/wardrobe_dimension_tokens_shared.js';",
    "export type { WardrobeDimensionDefaultType } from '../../shared/wardrobe_dimension_tokens_shared.js';",
    "export * from '../../shared/wardrobe_dimension_tokens_shared.js';",
    "import { DEFAULT_WIDTH } from '../features/dimensions/index';",
    "import * as dimensions from '../features/dimensions';",
    "export * from '@/native/features/dimensions';",
    "void import('/esm/native/features/dimensions/index.js');",
    "import { DEFAULT_WIDTH } from '../runtime/api.js';",
    "import * as runtime from '../runtime/api.js';",
    "export * from '../runtime/api.js';",
    "void import('../runtime/api.js');",
    "import { DEFAULT_WIDTH } from './api_runtime_base_surface.js';",
    "import * as runtimeBase from './api_runtime_base_surface.js';",
    "export * from './api_runtime_base_surface.js';",
    "void import('./api_runtime_base_surface.js');",
    "void import('../../shared/wardrobe_dimension_tokens_shared.js');",
    'void import(`../../shared/wardrobe_dimension_tokens_shared.js`);',
    "const target = '../../shared/wardrobe_dimension_tokens_shared.js'; void import(target);",
    "void import('../../shared/' + 'wardrobe_dimension_tokens_shared.js');",
    "const suffix = 'shared'; void import(`../../${suffix}/wardrobe_dimension_tokens_shared.js`);",
    "type Facade = typeof import('../../shared/wardrobe_dimension_tokens_shared.js');",
    "const facade = require('../../shared/wardrobe_dimension_tokens_shared.js');",
    "import facade = require('../../shared/wardrobe_dimension_tokens_shared.js');",
  ];
  for (const source of cases) {
    assert.ok(syntheticCompatibilityViolations(probeFile, source).length > 0, source);
  }
  const negativeControl = [
    "// import('../../shared/wardrobe_dimension_tokens_shared.js')",
    'const fixture = "export * from \'../../shared/wardrobe_dimension_tokens_shared.js\'";',
    "import { WARDROBE_DEFAULTS } from '../../shared/dimensions/wardrobe_defaults.js';",
  ].join('\n');
  assert.deepEqual(syntheticCompatibilityViolations(probeFile, negativeControl), []);
});

test('routed dimension bindings cannot become local compatibility bridges', () => {
  const dimensionNames = new Set(manifest.symbols.map(entry => entry.name));
  const consumerA = path.join(root, 'esm/native/ui/__dimension_bridge_consumer_a.ts');
  const consumerB = path.join(root, 'esm/native/ui/__dimension_bridge_consumer_b.ts');
  const consumerASource = [
    "import { DEFAULT_WIDTH } from '../services/api.js';",
    'export { DEFAULT_WIDTH };',
  ].join('\n');
  const pairViolations = collectRoutedBindingBridgeViolations(dimensionNames, [
    {
      file: consumerA,
      source: consumerASource,
    },
    {
      file: consumerB,
      source: [
        "import { DEFAULT_WIDTH } from './__dimension_bridge_consumer_a.js';",
        'export function readWidth() { return DEFAULT_WIDTH; }',
      ].join('\n'),
    },
  ]);
  assert.deepEqual(pairViolations, [
    {
      type: 'transitive-dimension-local-bridge',
      consumer: 'esm/native/ui/__dimension_bridge_consumer_a.ts',
      exportedName: 'DEFAULT_WIDTH',
      localName: 'DEFAULT_WIDTH',
      routedSymbols: ['DEFAULT_WIDTH'],
      statementStart: consumerASource.indexOf('export { DEFAULT_WIDTH };'),
    },
  ]);

  const bridgeCases = [
    'export { DEFAULT_WIDTH };',
    'export { DEFAULT_WIDTH as WIDTH };',
    'export default DEFAULT_WIDTH;',
    'const WIDTH = DEFAULT_WIDTH; export { WIDTH };',
    'export const WIDTH = DEFAULT_WIDTH;',
    'export const defaults = { width: DEFAULT_WIDTH };',
    'export const defaults = [DEFAULT_WIDTH];',
    [
      'const chain = [defaults];',
      'const defaults = { width: WIDTH };',
      'const WIDTH = DEFAULT_WIDTH;',
      'export { chain };',
    ].join('\n'),
  ];
  for (const bridge of bridgeCases) {
    const source = ["import { DEFAULT_WIDTH } from '../services/api.js';", bridge].join('\n');
    const violations = collectRoutedBindingBridgeViolations(dimensionNames, [{ file: consumerA, source }]);
    assert.equal(violations.length, 1, bridge);
    assert.equal(violations[0].type, 'transitive-dimension-local-bridge', bridge);
  }

  const businessFunctions = [
    "import { WARDROBE_WIDTH_MIN } from '../services/api.js';",
    'export function readBounds() {',
    '  return { min: WARDROBE_WIDTH_MIN };',
    '}',
    'export const readDefaults = () => ({ min: WARDROBE_WIDTH_MIN });',
  ].join('\n');
  assert.deepEqual(
    collectRoutedBindingBridgeViolations(dimensionNames, [{ file: consumerA, source: businessFunctions }]),
    []
  );
});

test('manifest and inventory mutation probes fail owner, kind, route, consumer, and removal drift', () => {
  const dimensionNames = new Set(manifest.symbols.map(entry => entry.name));
  const actualConsumers = collectInternalDimensionConsumers(dimensionNames).rows;

  const missingRoute = structuredClone(manifest);
  missingRoute.symbols.find(entry => entry.runtimeApiRoute).runtimeApiRoute = null;
  assert.throws(() => inspectManifest(missingRoute, actualConsumers));

  const changedOwner = structuredClone(manifest);
  changedOwner.symbols[0].canonicalOwner.exports[0].symbols = ['__MISSING_OWNER_EXPORT__'];
  assert.throws(() => inspectManifest(changedOwner, actualConsumers));

  const validButWrongOwner = structuredClone(manifest);
  validButWrongOwner.symbols.find(entry => entry.name === 'DEFAULT_WIDTH').canonicalOwner.exports[0].symbols =
    ['DEFAULT_HEIGHT'];
  assert.throws(() => inspectManifest(validButWrongOwner, actualConsumers));

  const wrongOwnerKind = structuredClone(manifest);
  wrongOwnerKind.symbols.find(entry => entry.name === 'DEFAULT_WIDTH').canonicalOwner.kind = 'composition';
  assert.throws(() => inspectManifest(wrongOwnerKind, actualConsumers));

  const validButWrongForm = structuredClone(manifest);
  validButWrongForm.symbols.find(entry => entry.name === 'DEFAULT_WIDTH').facadeDeclaration.form =
    'named-re-export';
  assert.throws(() => inspectManifest(validButWrongForm, actualConsumers));

  const wrongIdentity = structuredClone(manifest);
  wrongIdentity.symbols.find(entry => entry.name === 'DEFAULT_WIDTH').facadeDeclaration.identity =
    'new-aggregate';
  assert.throws(() => inspectManifest(wrongIdentity, actualConsumers));

  const changedKind = structuredClone(manifest);
  changedKind.symbols[0].kind = changedKind.symbols[0].kind === 'value' ? 'type' : 'value';
  assert.throws(() => inspectManifest(changedKind, actualConsumers));

  const changedServicesRoute = structuredClone(manifest);
  changedServicesRoute.symbols.find(entry => entry.servicesApiRoute).servicesApiRoute.baseFile =
    servicesApiRel;
  assert.throws(() => inspectManifest(changedServicesRoute, actualConsumers));

  const servicesBaseAlias = read(servicesBaseRel).replace(
    '  DEFAULT_SLIDING_DOORS,',
    '  DEFAULT_SLIDING_DOORS as CP1_ALIAS,'
  );
  assert.notEqual(servicesBaseAlias, read(servicesBaseRel));
  assert.throws(() => inspectManifest(manifest, actualConsumers, { servicesBaseSource: servicesBaseAlias }));

  const servicesEntryAlias = read(servicesApiRel).replace(
    '  WARDROBE_DOORS_MIN,',
    '  WARDROBE_DOORS_MIN as CP1_ALIAS,'
  );
  assert.notEqual(servicesEntryAlias, read(servicesApiRel));
  assert.throws(() =>
    inspectManifest(manifest, actualConsumers, { servicesEntrySource: servicesEntryAlias })
  );

  const facadeWildcard = `${read(facadeRel)}\nexport * from './dimensions/units.js';\n`;
  assert.throws(() => inspectManifest(manifest, actualConsumers, { facadeSource: facadeWildcard }));

  const removalDecision = structuredClone(manifest);
  const blocker = removalDecision.symbols.find(
    entry => entry.classification === 'undetermined — blocks removal'
  );
  blocker.plannedAction = 'remove-without-evidence';
  assert.throws(() => inspectManifest(removalDecision, actualConsumers));

  const unknownEvidence = structuredClone(manifest);
  unknownEvidence.symbols.find(
    entry => entry.classification === 'undetermined — blocks removal'
  ).externalEvidence = ['missing-evidence-id'];
  assert.throws(() => inspectManifest(unknownEvidence, actualConsumers));

  const unsupportedExternalDecision = structuredClone(manifest);
  unsupportedExternalDecision.symbols.find(
    entry => entry.classification === 'undetermined — blocks removal'
  ).classification = 'external compatibility';
  assert.throws(() => inspectManifest(unsupportedExternalDecision, actualConsumers));

  const emptyAction = structuredClone(manifest);
  emptyAction.symbols[0].plannedAction = '';
  assert.throws(() => inspectManifest(emptyAction, actualConsumers));

  const unsafeInternalAction = structuredClone(manifest);
  unsafeInternalAction.symbols.find(
    entry => entry.classification === 'internal transition only'
  ).plannedAction = 'remove-after-internal-migration';
  assert.throws(() => inspectManifest(unsafeInternalAction, actualConsumers));

  const staleFromNegativeEvidence = structuredClone(manifest);
  const staleCandidate = staleFromNegativeEvidence.symbols.find(
    entry => entry.classification === 'undetermined — blocks removal'
  );
  staleCandidate.classification = 'unused/stale compatibility';
  staleCandidate.externalEvidence = ['package-private-no-exports'];
  assert.throws(() => inspectManifest(staleFromNegativeEvidence, actualConsumers));

  const futureConsumer = structuredClone(inventory);
  futureConsumer.consumers.push({
    consumer: 'esm/native/ui/__future_dimension_consumer.ts',
    checkpointGroup: 'A',
    symbols: [structuredClone(futureConsumer.consumers[0].symbols[0])],
  });
  assert.throws(() => inspectInventory(futureConsumer, actualConsumers));

  const changedUsage = structuredClone(inventory);
  changedUsage.consumers[0].symbols[0].usage = 'type';
  assert.throws(() => inspectInventory(changedUsage, actualConsumers));

  const changedGroup = structuredClone(inventory);
  changedGroup.consumers[0].checkpointGroup = 'A';
  assert.throws(() => inspectInventory(changedGroup, actualConsumers));

  const changedHop = structuredClone(inventory);
  changedHop.routeCatalog['facade-runtime-services-api'].servicesBase = servicesApiRel;
  assert.throws(() => inspectInventory(changedHop, actualConsumers));

  const changedCaptureHead = structuredClone(inventory);
  changedCaptureHead.capturedAtHead = '0000000000000000000000000000000000000000';
  assert.throws(() => inspectInventory(changedCaptureHead, actualConsumers));

  const changedNegativeEvidence = structuredClone(inventory);
  changedNegativeEvidence.publicExternalEvidence.negativeEvidenceIds.pop();
  assert.throws(() => inspectInventory(changedNegativeEvidence, actualConsumers));
});
