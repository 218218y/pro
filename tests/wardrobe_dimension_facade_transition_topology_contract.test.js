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
const expectedConsumerGroups = Object.freeze({});

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
    const transparentExpressionTypes = new Set([
      'ChainExpression',
      'ParenthesizedExpression',
      'TSAsExpression',
      'TSInstantiationExpression',
      'TSNonNullExpression',
      'TSSatisfiesExpression',
      'TSTypeAssertion',
    ]);
    const unwrapExpression = node => {
      let current = node;
      while (current?.expression && transparentExpressionTypes.has(current.type)) {
        current = current.expression;
      }
      return current;
    };
    const collectBindingIdentifiers = node => {
      const current = unwrapExpression(node);
      if (!current) return [];
      if (current.type === 'Identifier') return [current];
      if (current.type === 'AssignmentPattern') return collectBindingIdentifiers(current.left);
      if (current.type === 'RestElement') return collectBindingIdentifiers(current.argument);
      if (current.type === 'ArrayPattern') {
        return current.elements.flatMap(element => collectBindingIdentifiers(element));
      }
      if (current.type === 'ObjectPattern') {
        return current.properties.flatMap(property =>
          property.type === 'RestElement'
            ? collectBindingIdentifiers(property.argument)
            : collectBindingIdentifiers(property.value)
        );
      }
      return [];
    };
    const collectBindingNames = node => collectBindingIdentifiers(node).map(identifier => identifier.name);
    const memberRootIdentifier = node => {
      let current = unwrapExpression(node);
      while (current?.type === 'MemberExpression') current = unwrapExpression(current.object);
      return bindingKeyForIdentifier(current);
    };
    const walkModuleExecution = ({
      onVariableDeclaration = () => {},
      onExpression = () => {},
      onAssignment = () => {},
      snapshotBranchState = () => null,
      restoreBranchState = () => {},
      joinBranchStates = () => {},
    } = {}) => {
      const walkPattern = (node, conditional = false) => {
        const current = unwrapExpression(node);
        if (!current) return;
        if (current.type === 'AssignmentPattern') {
          walkPattern(current.left, conditional);
          walkExpression(current.right, true, true);
          return;
        }
        if (current.type === 'RestElement') {
          walkPattern(current.argument, conditional);
          return;
        }
        if (current.type === 'ArrayPattern') {
          for (const element of current.elements) walkPattern(element, conditional);
          return;
        }
        if (current.type === 'ObjectPattern') {
          for (const property of current.properties) {
            if (property.type === 'RestElement') {
              walkPattern(property.argument, conditional);
              continue;
            }
            if (property.computed) walkExpression(property.key, true, conditional);
            walkPattern(property.value, conditional);
          }
          return;
        }
        if (current.type === 'MemberExpression') walkExpression(current, false, conditional);
      };
      const walkClass = (node, conditional = false) => {
        if (node.superClass) walkExpression(node.superClass, true, conditional);
        for (const element of node.body?.body ?? []) {
          if (element.type === 'StaticBlock') {
            for (const statement of element.body) walkStatement(statement, conditional);
            continue;
          }
          if (element.computed) walkExpression(element.key, true, conditional);
          if (
            element.static &&
            ['AccessorProperty', 'PropertyDefinition', 'FieldDefinition'].includes(element.type) &&
            element.value
          ) {
            walkExpression(element.value, true, conditional);
          }
        }
      };
      const walkExpression = (node, executedRoot = false, conditional = false) => {
        const current = unwrapExpression(node);
        if (!current) return;
        if (executedRoot) onExpression(current, { conditional });
        if (['ArrowFunctionExpression', 'FunctionDeclaration', 'FunctionExpression'].includes(current.type)) {
          return;
        }
        const walkChild = (child, childConditional = conditional) =>
          walkExpression(child, false, childConditional);
        const walkArguments = args => {
          for (const argument of args ?? []) {
            walkChild(argument?.type === 'SpreadElement' ? argument.argument : argument);
          }
        };
        switch (current.type) {
          case 'AssignmentExpression':
            if (current.operator === '=') onAssignment(current);
            walkPattern(current.left, conditional);
            walkChild(current.right);
            return;
          case 'ArrayExpression':
            for (const element of current.elements) {
              walkChild(element?.type === 'SpreadElement' ? element.argument : element);
            }
            return;
          case 'ObjectExpression':
            for (const property of current.properties) {
              if (property.type === 'SpreadElement') {
                walkChild(property.argument);
                continue;
              }
              if (property.computed) walkChild(property.key);
              walkChild(property.value);
            }
            return;
          case 'SequenceExpression':
            for (const expression of current.expressions) walkChild(expression);
            return;
          case 'LogicalExpression':
            walkChild(current.left);
            walkChild(current.right, true);
            return;
          case 'BinaryExpression':
            walkChild(current.left);
            walkChild(current.right);
            return;
          case 'ConditionalExpression':
            walkChild(current.test);
            walkChild(current.consequent, true);
            walkChild(current.alternate, true);
            return;
          case 'UnaryExpression':
          case 'UpdateExpression':
          case 'AwaitExpression':
          case 'YieldExpression':
            walkChild(current.argument);
            return;
          case 'CallExpression':
          case 'NewExpression':
            walkChild(current.callee);
            walkArguments(current.arguments);
            return;
          case 'TemplateLiteral':
            for (const expression of current.expressions) walkChild(expression);
            return;
          case 'TaggedTemplateExpression':
            walkChild(current.tag);
            walkChild(current.quasi);
            return;
          case 'MemberExpression':
            walkChild(current.object);
            if (current.computed) walkChild(current.property);
            return;
          case 'ImportExpression':
            walkChild(current.source);
            walkChild(current.options);
            return;
          case 'ClassDeclaration':
          case 'ClassExpression':
            walkClass(current, conditional);
            return;
          default:
            return;
        }
      };
      const walkVariableDeclaration = (declaration, conditional = false) => {
        onVariableDeclaration(declaration, { conditional });
        for (const declarator of declaration.declarations) {
          if (declarator.init) walkExpression(declarator.init, false, conditional);
          walkPattern(declarator.id, conditional);
        }
      };
      const walkStatement = (statement, conditional = false) => {
        if (!statement) return;
        switch (statement.type) {
          case 'ExpressionStatement':
            walkExpression(statement.expression, true, conditional);
            return;
          case 'VariableDeclaration':
            walkVariableDeclaration(statement, conditional);
            return;
          case 'ExportNamedDeclaration':
            if (statement.declaration) walkStatement(statement.declaration, conditional);
            return;
          case 'ExportDefaultDeclaration':
            if (statement.declaration?.type === 'FunctionDeclaration') return;
            if (statement.declaration?.type === 'ClassDeclaration') {
              walkClass(statement.declaration, conditional);
              return;
            }
            walkExpression(statement.declaration, true, conditional);
            return;
          case 'BlockStatement':
          case 'StaticBlock':
            for (const child of statement.body) walkStatement(child, conditional);
            return;
          case 'IfStatement':
            walkExpression(statement.test, true, conditional);
            const baseState = snapshotBranchState();
            walkStatement(statement.consequent, conditional);
            const consequentState = snapshotBranchState();
            restoreBranchState(baseState);
            if (statement.alternate) walkStatement(statement.alternate, conditional);
            const alternateState = statement.alternate ? snapshotBranchState() : baseState;
            joinBranchStates([consequentState, alternateState]);
            return;
          case 'SwitchStatement':
            walkExpression(statement.discriminant, true, conditional);
            const switchBaseState = snapshotBranchState();
            const switchExitStates = [];
            let hasDefaultCase = false;
            for (const switchCase of statement.cases) {
              restoreBranchState(switchBaseState);
              if (switchCase.test) walkExpression(switchCase.test, true, conditional);
              else hasDefaultCase = true;
              for (const child of switchCase.consequent) walkStatement(child, conditional);
              switchExitStates.push(snapshotBranchState());
            }
            if (!hasDefaultCase) switchExitStates.push(switchBaseState);
            joinBranchStates(switchExitStates);
            return;
          case 'TryStatement':
            const tryBaseState = snapshotBranchState();
            walkStatement(statement.block, conditional);
            const tryExitState = snapshotBranchState();
            restoreBranchState(tryBaseState);
            if (statement.handler) walkStatement(statement.handler, conditional);
            const catchExitState = statement.handler ? snapshotBranchState() : tryBaseState;
            joinBranchStates([tryExitState, catchExitState]);
            walkStatement(statement.finalizer, conditional);
            return;
          case 'CatchClause':
            walkPattern(statement.param, conditional);
            walkStatement(statement.body, conditional);
            return;
          case 'ForStatement':
            if (statement.init?.type === 'VariableDeclaration') {
              walkVariableDeclaration(statement.init, conditional);
            } else {
              walkExpression(statement.init, true, conditional);
            }
            walkExpression(statement.test, true, conditional);
            walkExpression(statement.update, true, true);
            walkStatement(statement.body, true);
            return;
          case 'ForInStatement':
          case 'ForOfStatement':
            if (statement.left?.type === 'VariableDeclaration') {
              walkVariableDeclaration(statement.left, true);
            } else {
              walkPattern(statement.left, true);
            }
            walkExpression(statement.right, true, conditional);
            walkStatement(statement.body, true);
            return;
          case 'WhileStatement':
            walkExpression(statement.test, true, conditional);
            walkStatement(statement.body, true);
            return;
          case 'DoWhileStatement':
            walkStatement(statement.body, conditional);
            walkExpression(statement.test, true, conditional);
            return;
          case 'LabeledStatement':
            walkStatement(statement.body, conditional);
            return;
          case 'WithStatement':
            walkExpression(statement.object, true, conditional);
            walkStatement(statement.body, conditional);
            return;
          case 'ClassDeclaration':
            walkClass(statement, conditional);
            return;
          case 'ThrowStatement':
            walkExpression(statement.argument, true, conditional);
            return;
          default:
            return;
        }
      };
      for (const statement of sourceFile.body) walkStatement(statement);
    };
    const variableDeclarators = [];
    const moduleExecutionAssignments = [];
    const seenAssignments = new Set();
    walkModuleExecution({
      onVariableDeclaration(declaration) {
        variableDeclarators.push(...declaration.declarations);
      },
      onAssignment(assignment) {
        if (seenAssignments.has(assignment)) return;
        seenAssignments.add(assignment);
        moduleExecutionAssignments.push(assignment);
      },
    });
    const lexicalScopeTypes = new Set([
      'BlockStatement',
      'CatchClause',
      'ForInStatement',
      'ForOfStatement',
      'ForStatement',
      'StaticBlock',
      'SwitchStatement',
    ]);
    const declarationScope = declarator => {
      const declaration = declarator.parent;
      if (declaration?.kind === 'var') return sourceFile;
      for (let current = declaration?.parent; current; current = current.parent) {
        if (current === sourceFile || lexicalScopeTypes.has(current.type)) return current;
      }
      return sourceFile;
    };
    const nestedBindingsByScope = new Map();
    const addScopeBindings = (scope, pattern) => {
      const names = collectBindingNames(pattern);
      if (scope === sourceFile) return;
      const bindings = nestedBindingsByScope.get(scope) ?? new Set();
      for (const name of names) bindings.add(name);
      nestedBindingsByScope.set(scope, bindings);
    };
    for (const declarator of variableDeclarators) {
      addScopeBindings(declarationScope(declarator), declarator.id);
    }
    const hasOpaqueExecutionAncestor = node => {
      for (let current = node.parent; current && current !== sourceFile; current = current.parent) {
        if (['ArrowFunctionExpression', 'FunctionDeclaration', 'FunctionExpression'].includes(current.type)) {
          return true;
        }
      }
      return false;
    };
    walkAst(sourceFile, node => {
      if (node.type !== 'CatchClause' || !node.param || hasOpaqueExecutionAncestor(node)) return;
      addScopeBindings(node, node.param);
    });
    const scopeIds = new WeakMap();
    let nextScopeId = 1;
    const scopeId = scope => {
      if (!scopeIds.has(scope)) scopeIds.set(scope, nextScopeId++);
      return scopeIds.get(scope);
    };
    const bindingKeyForIdentifier = node => {
      const current = unwrapExpression(node);
      if (current?.type !== 'Identifier') return null;
      for (let parent = current.parent; parent && parent !== sourceFile; parent = parent.parent) {
        if (nestedBindingsByScope.get(parent)?.has(current.name)) {
          return `scope-${scopeId(parent)}:${current.name}`;
        }
      }
      return current.name;
    };

    const directRoots = node => {
      const current = unwrapExpression(node);
      if (!current) return new Set();
      if (current.type === 'Identifier') {
        return new Set(routedRootsByLocalName.get(bindingKeyForIdentifier(current)) ?? []);
      }
      if (current.type === 'MemberExpression') {
        return new Set(routedRootsByLocalName.get(memberRootIdentifier(current)) ?? []);
      }
      if (current.type === 'SequenceExpression') {
        return directRoots(current.expressions.at(-1));
      }
      if (current.type === 'LogicalExpression') {
        return new Set([...directRoots(current.left), ...directRoots(current.right)]);
      }
      if (current.type === 'ConditionalExpression') {
        return new Set([...directRoots(current.consequent), ...directRoots(current.alternate)]);
      }
      if (current.type === 'AssignmentExpression' && current.operator === '=') {
        return directRoots(current.right);
      }
      if (current.type === 'ObjectExpression') {
        const roots = new Set();
        for (const property of current.properties) {
          if (property.computed) {
            for (const rootName of directRoots(property.key)) roots.add(rootName);
          }
          const value = property.type === 'SpreadElement' ? property.argument : property.value;
          for (const rootName of directRoots(value)) roots.add(rootName);
        }
        return roots;
      }
      if (current.type === 'ArrayExpression') {
        const roots = new Set();
        for (const element of current.elements) {
          const value = element?.type === 'SpreadElement' ? element.argument : element;
          for (const rootName of directRoots(value)) roots.add(rootName);
        }
        return roots;
      }
      return new Set();
    };

    const mergeRoots = (localName, roots) => {
      if (!localName || roots.size === 0) return false;
      const knownRoots = routedRootsByLocalName.get(localName) ?? new Set();
      let added = false;
      for (const rootName of roots) {
        if (knownRoots.has(rootName)) continue;
        knownRoots.add(rootName);
        added = true;
      }
      routedRootsByLocalName.set(localName, knownRoots);
      return added;
    };
    const initializerByLocalName = new Map();
    for (const declarator of variableDeclarators) {
      const identifier = unwrapExpression(declarator.id);
      const localName = bindingKeyForIdentifier(identifier);
      if (localName && declarator.init) initializerByLocalName.set(localName, declarator.init);
    }
    const resolveStaticContainer = (node, seen = new Set()) => {
      const current = unwrapExpression(node);
      if (current?.type === 'ObjectExpression' || current?.type === 'ArrayExpression') return current;
      const bindingKey = bindingKeyForIdentifier(current);
      if (!bindingKey || seen.has(bindingKey)) return null;
      const initializer = initializerByLocalName.get(bindingKey);
      if (!initializer) return null;
      return resolveStaticContainer(initializer, new Set(seen).add(bindingKey));
    };
    const propertyName = property => {
      const key = unwrapExpression(property?.key);
      if (key?.type === 'Identifier' && !property.computed) return key.name;
      if (key?.type === 'Literal' && ['number', 'string'].includes(typeof key.value)) {
        return String(key.value);
      }
      return null;
    };
    const missingPatternValue = Symbol('missing-pattern-value');
    const isDefinitelyDefined = node => {
      if (node === missingPatternValue) return false;
      const current = unwrapExpression(node);
      if (!current) return false;
      if (current.type === 'Identifier' && current.name === 'undefined') return false;
      if (current.type === 'UnaryExpression' && current.operator === 'void') return false;
      return [
        'ArrayExpression',
        'ArrowFunctionExpression',
        'ClassExpression',
        'FunctionExpression',
        'Literal',
        'ObjectExpression',
        'TemplateLiteral',
      ].includes(current.type);
    };
    const collectObjectFacts = (node, seen = new Set()) => {
      const sourceObject = resolveStaticContainer(node);
      if (sourceObject?.type !== 'ObjectExpression' || seen.has(sourceObject)) return null;
      const values = new Map();
      const unknownRoots = new Set();
      const nextSeen = new Set(seen).add(sourceObject);
      for (const property of sourceObject.properties) {
        if (property.type === 'SpreadElement') {
          const spreadFacts = collectObjectFacts(property.argument, nextSeen);
          if (spreadFacts) {
            for (const [name, value] of spreadFacts.values) values.set(name, value);
            for (const rootName of spreadFacts.unknownRoots) unknownRoots.add(rootName);
          } else {
            for (const rootName of directRoots(property.argument)) unknownRoots.add(rootName);
          }
          continue;
        }
        const name = propertyName(property);
        if (name === null) {
          for (const rootName of directRoots(property.key)) unknownRoots.add(rootName);
          for (const rootName of directRoots(property.value)) unknownRoots.add(rootName);
          continue;
        }
        values.set(name, property.value);
      }
      return { values, unknownRoots };
    };
    const collectArrayFacts = (node, seen = new Set()) => {
      const sourceArray = resolveStaticContainer(node);
      if (sourceArray?.type !== 'ArrayExpression' || seen.has(sourceArray)) return null;
      const values = [];
      const unknownRoots = new Set();
      const nextSeen = new Set(seen).add(sourceArray);
      for (const element of sourceArray.elements) {
        if (element?.type === 'SpreadElement') {
          const spreadFacts = collectArrayFacts(element.argument, nextSeen);
          if (spreadFacts) {
            values.push(...spreadFacts.values);
            for (const rootName of spreadFacts.unknownRoots) unknownRoots.add(rootName);
          } else {
            for (const rootName of directRoots(element.argument)) unknownRoots.add(rootName);
          }
        } else {
          values.push(element ?? missingPatternValue);
        }
      }
      return { values, unknownRoots };
    };
    const mergeAllBindingRoots = (pattern, roots) => {
      let added = false;
      for (const identifier of collectBindingIdentifiers(pattern)) {
        if (mergeRoots(bindingKeyForIdentifier(identifier), roots)) added = true;
      }
      return added;
    };
    const mergePatternRoots = (pattern, value, { definitelyDefined = false } = {}) => {
      const current = unwrapExpression(pattern);
      if (!current) return false;
      if (current.type === 'Identifier') {
        return value === missingPatternValue
          ? false
          : mergeRoots(bindingKeyForIdentifier(current), directRoots(value));
      }
      if (current.type === 'AssignmentPattern') {
        const valueAdded = mergePatternRoots(current.left, value, { definitelyDefined });
        const defaultAdded = definitelyDefined
          ? false
          : mergeAllBindingRoots(current.left, directRoots(current.right));
        return valueAdded || defaultAdded;
      }
      if (current.type === 'RestElement') {
        return mergePatternRoots(current.argument, value, { definitelyDefined });
      }
      if (current.type === 'ObjectPattern') {
        const sourceFacts = collectObjectFacts(value);
        if (!sourceFacts) {
          let added = false;
          for (const patternProperty of current.properties) {
            const target =
              patternProperty.type === 'RestElement' ? patternProperty.argument : patternProperty.value;
            if (mergePatternRoots(target, value, { definitelyDefined: false })) added = true;
          }
          return added;
        }
        let added = false;
        const selectedNames = new Set();
        for (const patternProperty of current.properties) {
          if (patternProperty.type === 'RestElement') {
            const restRoots = new Set(sourceFacts.unknownRoots);
            for (const [name, sourceValue] of sourceFacts.values) {
              if (selectedNames.has(name)) continue;
              for (const rootName of directRoots(sourceValue)) restRoots.add(rootName);
            }
            if (mergeAllBindingRoots(patternProperty.argument, restRoots)) added = true;
            continue;
          }
          const name = propertyName(patternProperty);
          if (name !== null) selectedNames.add(name);
          const hasSourceValue = name !== null && sourceFacts.values.has(name);
          const sourceValue = hasSourceValue ? sourceFacts.values.get(name) : missingPatternValue;
          if (
            mergePatternRoots(patternProperty.value, sourceValue, {
              definitelyDefined: hasSourceValue && isDefinitelyDefined(sourceValue),
            })
          ) {
            added = true;
          }
          if (mergeAllBindingRoots(patternProperty.value, sourceFacts.unknownRoots)) added = true;
        }
        return added;
      }
      if (current.type === 'ArrayPattern') {
        const sourceFacts = collectArrayFacts(value);
        if (!sourceFacts) {
          let added = false;
          for (const element of current.elements) {
            if (mergePatternRoots(element, value, { definitelyDefined: false })) added = true;
          }
          return added;
        }
        let added = false;
        for (let index = 0; index < current.elements.length; index += 1) {
          const element = current.elements[index];
          if (unwrapExpression(element)?.type === 'RestElement') {
            const restRoots = new Set(sourceFacts.unknownRoots);
            for (const sourceValue of sourceFacts.values.slice(index)) {
              if (sourceValue === missingPatternValue) continue;
              for (const rootName of directRoots(sourceValue)) restRoots.add(rootName);
            }
            if (mergeAllBindingRoots(element, restRoots)) added = true;
            continue;
          }
          const sourceValue = sourceFacts.values[index] ?? missingPatternValue;
          const definitelyDefined = isDefinitelyDefined(sourceValue);
          if (mergePatternRoots(element, sourceValue, { definitelyDefined })) added = true;
          if (mergeAllBindingRoots(element, sourceFacts.unknownRoots)) added = true;
        }
        return added;
      }
      return false;
    };

    let nextObjectIdentity = 1;
    const objectIdentityByLocalName = new Map();
    const possibleObjectIdentitiesByLocalName = new Map();
    const childIdentityByObjectIdentity = new Map();
    const parentObjectIdentitiesByChild = new Map();
    const memberWrites = [];
    const newObjectIdentity = () => nextObjectIdentity++;
    const identityForLocalName = localName => {
      if (!localName) return null;
      if (!objectIdentityByLocalName.has(localName)) {
        const identity = newObjectIdentity();
        objectIdentityByLocalName.set(localName, identity);
        possibleObjectIdentitiesByLocalName.set(localName, new Set([identity]));
      }
      return objectIdentityByLocalName.get(localName);
    };
    const possibleIdentitiesForLocalName = localName => {
      const possible = possibleObjectIdentitiesByLocalName.get(localName);
      if (possible) return new Set(possible);
      const current = objectIdentityByLocalName.get(localName);
      return current ? new Set([current]) : new Set();
    };
    const snapshotObjectBindingState = () => ({
      current: new Map(objectIdentityByLocalName),
      possible: new Map(
        [...possibleObjectIdentitiesByLocalName].map(([localName, identities]) => [
          localName,
          new Set(identities),
        ])
      ),
      children: new Map(
        [...childIdentityByObjectIdentity].map(([parentIdentity, properties]) => [
          parentIdentity,
          new Map([...properties].map(([property, childIdentities]) => [property, new Set(childIdentities)])),
        ])
      ),
    });
    const restoreObjectBindingState = state => {
      objectIdentityByLocalName.clear();
      possibleObjectIdentitiesByLocalName.clear();
      childIdentityByObjectIdentity.clear();
      parentObjectIdentitiesByChild.clear();
      if (!state) return;
      for (const [localName, identity] of state.current) {
        objectIdentityByLocalName.set(localName, identity);
      }
      for (const [localName, identities] of state.possible) {
        possibleObjectIdentitiesByLocalName.set(localName, new Set(identities));
      }
      for (const [parentIdentity, properties] of state.children) {
        const restoredProperties = new Map();
        for (const [property, childIdentities] of properties) {
          const restoredChildren = new Set(childIdentities);
          restoredProperties.set(property, restoredChildren);
          for (const childIdentity of restoredChildren) {
            const parents = parentObjectIdentitiesByChild.get(childIdentity) ?? new Set();
            parents.add(parentIdentity);
            parentObjectIdentitiesByChild.set(childIdentity, parents);
          }
        }
        childIdentityByObjectIdentity.set(parentIdentity, restoredProperties);
      }
    };
    const joinObjectBindingStates = states => {
      const joinedPossible = new Map();
      const joinedChildren = new Map();
      for (const state of states.filter(Boolean)) {
        for (const [localName, identities] of state.possible) {
          const joined = joinedPossible.get(localName) ?? new Set();
          for (const identity of identities) joined.add(identity);
          joinedPossible.set(localName, joined);
        }
        for (const [parentIdentity, properties] of state.children) {
          const joinedProperties = joinedChildren.get(parentIdentity) ?? new Map();
          for (const [property, childIdentities] of properties) {
            const joinedIdentities = joinedProperties.get(property) ?? new Set();
            for (const childIdentity of childIdentities) joinedIdentities.add(childIdentity);
            joinedProperties.set(property, joinedIdentities);
          }
          joinedChildren.set(parentIdentity, joinedProperties);
        }
      }
      const finalState = states.findLast(Boolean);
      restoreObjectBindingState({
        current: new Map(finalState?.current ?? []),
        possible: joinedPossible,
        children: joinedChildren,
      });
    };
    const memberPropertyName = member => {
      const property = unwrapExpression(member?.property);
      if (property?.type === 'Identifier' && !member.computed) return property.name;
      if (property?.type === 'Literal' && ['number', 'string'].includes(typeof property.value)) {
        return String(property.value);
      }
      return null;
    };
    const setChildIdentity = (parentIdentity, property, childIdentity) => {
      if (!parentIdentity || property === null || !childIdentity) return;
      const children = childIdentityByObjectIdentity.get(parentIdentity) ?? new Map();
      const previousChildren = children.get(property) ?? new Set();
      for (const previousChild of previousChildren) {
        if (previousChild === childIdentity) continue;
        parentObjectIdentitiesByChild.get(previousChild)?.delete(parentIdentity);
      }
      children.set(property, new Set([childIdentity]));
      childIdentityByObjectIdentity.set(parentIdentity, children);
      const parents = parentObjectIdentitiesByChild.get(childIdentity) ?? new Set();
      parents.add(parentIdentity);
      parentObjectIdentitiesByChild.set(childIdentity, parents);
    };
    const assignPatternIdentity = (pattern, identity, { conditional = false } = {}) => {
      const current = unwrapExpression(pattern);
      if (!current) return;
      if (current.type === 'Identifier') {
        const bindingKey = bindingKeyForIdentifier(current);
        objectIdentityByLocalName.set(bindingKey, identity);
        if (conditional) {
          const possible = possibleIdentitiesForLocalName(bindingKey);
          if (identity) possible.add(identity);
          possibleObjectIdentitiesByLocalName.set(bindingKey, possible);
        } else {
          possibleObjectIdentitiesByLocalName.set(bindingKey, identity ? new Set([identity]) : new Set());
        }
        return;
      }
      for (const identifier of collectBindingIdentifiers(current)) {
        const bindingKey = bindingKeyForIdentifier(identifier);
        objectIdentityByLocalName.set(bindingKey, null);
        if (!conditional) possibleObjectIdentitiesByLocalName.set(bindingKey, new Set());
      }
    };
    const evaluateObjectIdentity = (node, conditional = false) => {
      const current = unwrapExpression(node);
      if (!current) return null;
      if (current.type === 'Identifier') {
        return identityForLocalName(bindingKeyForIdentifier(current));
      }
      if (current.type === 'MemberExpression') {
        const parentIdentity = evaluateObjectIdentity(current.object, conditional);
        if (current.computed) evaluateObjectIdentity(current.property, conditional);
        const property = memberPropertyName(current);
        if (!parentIdentity || property === null) return newObjectIdentity();
        const children = childIdentityByObjectIdentity.get(parentIdentity) ?? new Map();
        if (!children.has(property)) {
          setChildIdentity(parentIdentity, property, newObjectIdentity());
        }
        return [...(childIdentityByObjectIdentity.get(parentIdentity)?.get(property) ?? [])].at(-1) ?? null;
      }
      if (current.type === 'SequenceExpression') {
        let identity = null;
        for (const expression of current.expressions) {
          identity = evaluateObjectIdentity(expression, conditional);
        }
        return identity;
      }
      if (current.type === 'AssignmentExpression' && current.operator === '=') {
        const left = unwrapExpression(current.left);
        const memberIdentity =
          left?.type === 'MemberExpression' ? evaluateObjectIdentity(left.object, conditional) : null;
        if (left?.type === 'MemberExpression' && left.computed) {
          evaluateObjectIdentity(left.property, conditional);
        }
        const identity = evaluateObjectIdentity(current.right, conditional);
        if (left?.type === 'MemberExpression') {
          const object = unwrapExpression(left.object);
          const memberIdentities =
            object?.type === 'Identifier'
              ? possibleIdentitiesForLocalName(bindingKeyForIdentifier(object))
              : new Set(memberIdentity ? [memberIdentity] : []);
          for (const possibleIdentity of memberIdentities) {
            setChildIdentity(possibleIdentity, memberPropertyName(left), identity);
            memberWrites.push({ identity: possibleIdentity, right: current.right });
          }
        } else {
          assignPatternIdentity(left, identity, { conditional });
        }
        return identity;
      }
      if (current.type === 'ObjectExpression') {
        const identity = newObjectIdentity();
        for (const property of current.properties) {
          if (property.type === 'SpreadElement') {
            evaluateObjectIdentity(property.argument, conditional);
            continue;
          }
          if (property.computed) evaluateObjectIdentity(property.key, conditional);
          const childIdentity = evaluateObjectIdentity(property.value, conditional);
          setChildIdentity(identity, propertyName(property), childIdentity);
        }
        return identity;
      }
      if (current.type === 'ArrayExpression') {
        const identity = newObjectIdentity();
        for (let index = 0; index < current.elements.length; index += 1) {
          const element = current.elements[index];
          if (element?.type === 'SpreadElement') {
            evaluateObjectIdentity(element.argument, conditional);
            continue;
          }
          const childIdentity = evaluateObjectIdentity(element, conditional);
          setChildIdentity(identity, String(index), childIdentity);
        }
        return identity;
      }
      if (current.type === 'LogicalExpression') {
        evaluateObjectIdentity(current.left, conditional);
        const logicalBaseState = snapshotObjectBindingState();
        evaluateObjectIdentity(current.right, conditional);
        const logicalRightState = snapshotObjectBindingState();
        joinObjectBindingStates([logicalBaseState, logicalRightState]);
        return newObjectIdentity();
      }
      if (current.type === 'BinaryExpression') {
        evaluateObjectIdentity(current.left, conditional);
        evaluateObjectIdentity(current.right, conditional);
        return newObjectIdentity();
      }
      if (current.type === 'ConditionalExpression') {
        evaluateObjectIdentity(current.test, conditional);
        const conditionalBaseState = snapshotObjectBindingState();
        const consequentIdentity = evaluateObjectIdentity(current.consequent, conditional);
        const consequentState = snapshotObjectBindingState();
        restoreObjectBindingState(conditionalBaseState);
        const alternateIdentity = evaluateObjectIdentity(current.alternate, conditional);
        const alternateState = snapshotObjectBindingState();
        joinObjectBindingStates([
          consequentState,
          alternateState,
          ...(conditional ? [conditionalBaseState] : []),
        ]);
        return alternateIdentity ?? consequentIdentity ?? newObjectIdentity();
      }
      if (
        ['AwaitExpression', 'UnaryExpression', 'UpdateExpression', 'YieldExpression'].includes(current.type)
      ) {
        evaluateObjectIdentity(current.argument, conditional);
        return newObjectIdentity();
      }
      if (current.type === 'CallExpression' || current.type === 'NewExpression') {
        evaluateObjectIdentity(current.callee, conditional);
        for (const argument of current.arguments ?? []) {
          evaluateObjectIdentity(
            argument?.type === 'SpreadElement' ? argument.argument : argument,
            conditional
          );
        }
        return newObjectIdentity();
      }
      if (current.type === 'TemplateLiteral') {
        for (const expression of current.expressions) {
          evaluateObjectIdentity(expression, conditional);
        }
        return newObjectIdentity();
      }
      if (current.type === 'TaggedTemplateExpression') {
        evaluateObjectIdentity(current.tag, conditional);
        evaluateObjectIdentity(current.quasi, conditional);
        return newObjectIdentity();
      }
      if (current.type === 'ImportExpression') {
        evaluateObjectIdentity(current.source, conditional);
        evaluateObjectIdentity(current.options, conditional);
        return newObjectIdentity();
      }
      return newObjectIdentity();
    };
    const executeVariableDeclaration = (declaration, { conditional = false } = {}) => {
      for (const declarator of declaration.declarations) {
        const identity = declarator.init ? evaluateObjectIdentity(declarator.init, conditional) : null;
        assignPatternIdentity(declarator.id, identity, { conditional });
      }
    };
    walkModuleExecution({
      onVariableDeclaration: executeVariableDeclaration,
      onExpression(expression, { conditional }) {
        evaluateObjectIdentity(expression, conditional);
      },
      snapshotBranchState: snapshotObjectBindingState,
      restoreBranchState: restoreObjectBindingState,
      joinBranchStates: joinObjectBindingStates,
    });
    const rootsByObjectIdentity = new Map();

    let changed = true;
    while (changed) {
      changed = false;
      for (const declarator of variableDeclarators) {
        if (mergePatternRoots(declarator.id, declarator.init)) changed = true;
      }
      for (const assignment of moduleExecutionAssignments) {
        const left = unwrapExpression(assignment.left);
        if (left?.type !== 'MemberExpression' && mergePatternRoots(left, assignment.right)) {
          changed = true;
        }
      }
      for (const memberWrite of memberWrites) {
        if (!memberWrite.identity) continue;
        const roots = rootsByObjectIdentity.get(memberWrite.identity) ?? new Set();
        for (const rootName of directRoots(memberWrite.right)) {
          if (roots.has(rootName)) continue;
          roots.add(rootName);
          changed = true;
        }
        rootsByObjectIdentity.set(memberWrite.identity, roots);
      }
      for (const [childIdentity, parents] of parentObjectIdentitiesByChild) {
        const childRoots = rootsByObjectIdentity.get(childIdentity) ?? new Set();
        for (const parentIdentity of parents) {
          const parentRoots = rootsByObjectIdentity.get(parentIdentity) ?? new Set();
          for (const rootName of childRoots) {
            if (parentRoots.has(rootName)) continue;
            parentRoots.add(rootName);
            changed = true;
          }
          rootsByObjectIdentity.set(parentIdentity, parentRoots);
        }
      }
      for (const [localName, identities] of possibleObjectIdentitiesByLocalName) {
        for (const identity of identities) {
          if (mergeRoots(localName, new Set(rootsByObjectIdentity.get(identity) ?? []))) {
            changed = true;
          }
        }
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
            for (const localName of collectBindingNames(declarator.id)) {
              addViolation(
                statement,
                localName,
                localName,
                new Set(routedRootsByLocalName.get(localName) ?? [])
              );
            }
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

test('internal dimension transition closeout leaves only the two public compatibility routes', () => {
  const dimensionNames = new Set(manifest.symbols.map(entry => entry.name));
  const consumers = collectInternalDimensionConsumers(dimensionNames);
  const topology = collectProductionTopology();
  const directRuntimeConsumers = productionFiles.flatMap(file => {
    if (rel(file) === servicesBaseRel) return [];
    return collectDimensionRouteFromDependency(file, runtimeApiAbsolute, dimensionNames).map(entry => ({
      file: rel(file),
      ...entry,
    }));
  });

  assert.deepEqual(inventory.consumers, []);
  assert.deepEqual(consumers.rows, []);
  assert.deepEqual(consumers.broadRoutes, []);
  assert.deepEqual(collectUnapprovedTransitiveBridges(dimensionNames), []);
  assert.deepEqual(collectRoutedBindingBridgeViolations(dimensionNames), []);
  assert.deepEqual(directRuntimeConsumers, []);
  assert.deepEqual(topology.publicBarrelRoutes, []);
  assert.deepEqual(topology.forbiddenModuleSyntax, []);
  assert.deepEqual(topology.unresolvedDynamicImports, expectedDynamicImports());
  assert.deepEqual(topology.facadeRoutes, expectedFacadeRoutes());
  assert.equal(topology.facadeRoutes.length, 3);
  assert.equal(topology.facadeRoutes.filter(route => route.syntax === 'static-import').length, 0);

  assert.equal(manifest.symbols.length, 99);
  assert.equal(manifest.symbols.filter(entry => entry.runtimeApiRoute).length, 53);
  assert.equal(manifest.symbols.filter(entry => entry.servicesApiRoute).length, 53);
  assert.equal(
    manifest.symbols.every(
      entry =>
        entry.classification === 'undetermined — blocks removal' &&
        entry.internalConsumers.length === 0 &&
        entry.plannedAction === 'retain-until-external-evidence-or-explicit-public-surface-decision'
    ),
    true
  );
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
    'let WIDTH; WIDTH = (DEFAULT_WIDTH as number)!; export { WIDTH };',
    ['let forwarded;', 'if (condition) {', '  forwarded = DEFAULT_WIDTH;', '}', 'export { forwarded };'].join(
      '\n'
    ),
    [
      'let forwarded;',
      'if (condition) {',
      '  forwarded = 1;',
      '} else {',
      '  forwarded = DEFAULT_WIDTH;',
      '}',
      'export { forwarded };',
    ].join('\n'),
    ['let forwarded;', 'condition && (forwarded = DEFAULT_WIDTH);', 'export { forwarded };'].join('\n'),
    ['let forwarded;', 'condition ? (forwarded = DEFAULT_WIDTH) : undefined;', 'export { forwarded };'].join(
      '\n'
    ),
    [
      'let forwarded;',
      'switch (mode) {',
      "  case 'width':",
      '    forwarded = DEFAULT_WIDTH;',
      '    break;',
      '}',
      'export { forwarded };',
    ].join('\n'),
    [
      'let forwarded;',
      'try {',
      '  doWork();',
      '} finally {',
      '  forwarded = DEFAULT_WIDTH;',
      '}',
      'export { forwarded };',
    ].join('\n'),
    [
      'let forwarded;',
      'for (const item of items) {',
      '  forwarded = DEFAULT_WIDTH;',
      '}',
      'export { forwarded };',
    ].join('\n'),
    ['export const defaults = {};', 'if (condition) {', '  defaults.width = DEFAULT_WIDTH;', '}'].join('\n'),
    [
      'let first;',
      'let second;',
      'if (condition) {',
      '  first = DEFAULT_WIDTH;',
      '  second = first;',
      '}',
      'export { second };',
    ].join('\n'),
    [
      'const root = {};',
      'let alias;',
      'if (condition) { alias = root; } else { alias = {}; }',
      'alias.width = DEFAULT_WIDTH;',
      'export { root };',
    ].join('\n'),
    [
      'const root = {};',
      'let alias = root;',
      'if (condition) { alias = {}; }',
      'alias.width = DEFAULT_WIDTH;',
      'export { root };',
    ].join('\n'),
    [
      'const root = { nested: {} };',
      'if (condition) {',
      '  root.nested.width = DEFAULT_WIDTH;',
      '} else {',
      '  root.nested = {};',
      '}',
      'export { root };',
    ].join('\n'),
    [
      'const root = {};',
      'let alias = root;',
      'while (condition) { alias = {}; }',
      'alias.width = DEFAULT_WIDTH;',
      'export { root };',
    ].join('\n'),
    'export const WIDTH = condition ? DEFAULT_WIDTH : 1;',
    'export const WIDTH = condition && DEFAULT_WIDTH;',
    [
      'const root = {};',
      'let alias = root;',
      'const { safe = (alias = {}) } = source;',
      'alias.width = DEFAULT_WIDTH;',
      'export { root };',
    ].join('\n'),
    [
      'const root = {};',
      'let alias = root;',
      'try { mayThrow(); alias = {}; } catch {}',
      'alias.width = DEFAULT_WIDTH;',
      'export { root };',
    ].join('\n'),
    ['let forwarded;', '{ forwarded = DEFAULT_WIDTH; }', 'export { forwarded };'].join('\n'),
    [
      'let forwarded;',
      'try {',
      '  throw new Error();',
      '} catch (error) {',
      '  forwarded = DEFAULT_WIDTH;',
      '}',
      'export { forwarded };',
    ].join('\n'),
    ['let forwarded;', 'while (condition) { forwarded = DEFAULT_WIDTH; }', 'export { forwarded };'].join(
      '\n'
    ),
    ['let forwarded;', 'do { forwarded = DEFAULT_WIDTH; } while (condition);', 'export { forwarded };'].join(
      '\n'
    ),
    [
      'let forwarded;',
      'for (let index = 0; index < count; index += 1) { forwarded = DEFAULT_WIDTH; }',
      'export { forwarded };',
    ].join('\n'),
    [
      'let forwarded;',
      'for (const key in values) { forwarded = DEFAULT_WIDTH; }',
      'export { forwarded };',
    ].join('\n'),
    ['let forwarded;', 'bridge: { forwarded = DEFAULT_WIDTH; }', 'export { forwarded };'].join('\n'),
    ['let forwarded;', 'with (context) { forwarded = DEFAULT_WIDTH; }', 'export { forwarded };'].join('\n'),
    [
      'let forwarded;',
      'class Bridge { static { forwarded = DEFAULT_WIDTH; } }',
      'export { forwarded };',
    ].join('\n'),
    [
      'let forwarded;',
      'class Bridge { static accessor width = (forwarded = DEFAULT_WIDTH); }',
      'export { forwarded };',
    ].join('\n'),
    ['let forwarded;', 'class Bridge { [(forwarded = DEFAULT_WIDTH)]() {} }', 'export { forwarded };'].join(
      '\n'
    ),
    ['let forwarded;', 'const { safe = (forwarded = DEFAULT_WIDTH) } = {};', 'export { forwarded };'].join(
      '\n'
    ),
    [
      'let forwarded;',
      'try {',
      '  throw {};',
      '} catch ({ safe = (forwarded = DEFAULT_WIDTH) }) {}',
      'export { forwarded };',
    ].join('\n'),
    ['let forwarded;', 'void (forwarded = DEFAULT_WIDTH);', 'export { forwarded };'].join('\n'),
    ['let forwarded;', 'await (forwarded = DEFAULT_WIDTH);', 'export { forwarded };'].join('\n'),
    ['let forwarded;', 'consume(forwarded = DEFAULT_WIDTH);', 'export { forwarded };'].join('\n'),
    ['let forwarded;', 'new Box(forwarded = DEFAULT_WIDTH);', 'export { forwarded };'].join('\n'),
    ['let forwarded;', '`${(forwarded = DEFAULT_WIDTH)}`;', 'export { forwarded };'].join('\n'),
    ['let forwarded;', '[forwarded = DEFAULT_WIDTH];', 'export { forwarded };'].join('\n'),
    ['let forwarded;', '({ value: (forwarded = DEFAULT_WIDTH) });', 'export { forwarded };'].join('\n'),
    ['let forwarded;', 'target[forwarded = DEFAULT_WIDTH];', 'export { forwarded };'].join('\n'),
    ['let forwarded;', 'tag`${(forwarded = DEFAULT_WIDTH)}`;', 'export { forwarded };'].join('\n'),
    'let first; let second; first = second = DEFAULT_WIDTH; export { second };',
    'let first; let second; (first = DEFAULT_WIDTH, second = first); export { second };',
    'let inner; const outer = (inner = DEFAULT_WIDTH, inner); export { outer };',
    [
      'let first;',
      'let second;',
      'second = first as number;',
      '((first = DEFAULT_WIDTH) satisfies number);',
      'export default second;',
    ].join('\n'),
    ['export const defaults = {};', 'defaults.nested = { widths: [DEFAULT_WIDTH] };'].join('\n'),
    ['export const defaults = [];', 'defaults[0] = DEFAULT_WIDTH;'].join('\n'),
    ['let WIDTH;', '({ width: WIDTH } = { width: DEFAULT_WIDTH });', 'export { WIDTH };'].join('\n'),
    [
      'const routed = { width: DEFAULT_WIDTH, safe: 1 };',
      'const { width: WIDTH } = routed;',
      'export { WIDTH };',
    ].join('\n'),
    [
      'const base = { width: DEFAULT_WIDTH };',
      'const routed = { ...base };',
      'const { width: WIDTH } = routed;',
      'export { WIDTH };',
    ].join('\n'),
    ['const [safe, ...rest] = [1, 2, DEFAULT_WIDTH];', 'export { rest };'].join('\n'),
    [
      'const routed = { safe: undefined };',
      'const { safe = DEFAULT_WIDTH } = routed;',
      'export { safe };',
    ].join('\n'),
    ['const [safe = DEFAULT_WIDTH] = [undefined];', 'export { safe };'].join('\n'),
    [
      'const defaults = {};',
      'const forwarded = defaults;',
      'forwarded.nested = [DEFAULT_WIDTH];',
      'export { defaults };',
    ].join('\n'),
    [
      'const root = {};',
      'let first = root;',
      'const second = first;',
      'first = {};',
      'second.width = DEFAULT_WIDTH;',
      'export { root };',
    ].join('\n'),
    [
      'let root;',
      'let alias;',
      'alias = root = {};',
      'alias.width = DEFAULT_WIDTH;',
      'export { root };',
    ].join('\n'),
    [
      'const root = { nested: {} };',
      'const nested = root.nested;',
      'nested.width = DEFAULT_WIDTH;',
      'export { root };',
    ].join('\n'),
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
    '  let assignedMin;',
    '  assignedMin = WARDROBE_WIDTH_MIN;',
    '  return { min: assignedMin };',
    '}',
    'export const readDefaults = () => ({ min: WARDROBE_WIDTH_MIN });',
    'const internalDefaults = {};',
    'internalDefaults.width = WARDROBE_WIDTH_MIN;',
    'export function readInternalDefaults() { return { ...internalDefaults }; }',
    'export function readWidth() {',
    '  if (condition) {',
    '    return WARDROBE_WIDTH_MIN;',
    '  }',
    '  return 0;',
    '}',
    'export const readWidthFromArrow = () => {',
    '  let width;',
    '  if (condition) {',
    '    width = WARDROBE_WIDTH_MIN;',
    '  }',
    '  return width;',
    '};',
    'const deferredDefaults = {};',
    'function internalWork() {',
    '  deferredDefaults.width = WARDROBE_WIDTH_MIN;',
    '}',
    'export { internalWork };',
    'export const objectReader = {',
    '  readWidth() {',
    '    let width;',
    '    if (condition) width = WARDROBE_WIDTH_MIN;',
    '    return width;',
    '  },',
    '};',
    'export class ClassReader {',
    '  static readWidth() {',
    '    let width;',
    '    if (condition) width = WARDROBE_WIDTH_MIN;',
    '    return width;',
    '  }',
    '}',
  ].join('\n');
  assert.deepEqual(
    collectRoutedBindingBridgeViolations(dimensionNames, [{ file: consumerA, source: businessFunctions }]),
    []
  );

  const nonBridgeCases = [
    ['let forwarded = 0;', '{ let forwarded; forwarded = DEFAULT_WIDTH; }', 'export { forwarded };'].join(
      '\n'
    ),
    [
      'let forwarded = 0;',
      'try { throw 1; } catch (forwarded) { forwarded = DEFAULT_WIDTH; }',
      'export { forwarded };',
    ].join('\n'),
    [
      'let forwarded = 0;',
      '{ const DEFAULT_WIDTH = 1; forwarded = DEFAULT_WIDTH; }',
      'export { forwarded };',
    ].join('\n'),
    [
      'const root = {};',
      'let alias = root;',
      'if (condition) { alias = {}; } else { alias = {}; }',
      'alias.width = DEFAULT_WIDTH;',
      'export { root };',
    ].join('\n'),
    [
      'const root = {};',
      'if (condition) {',
      '  const alias = root;',
      '} else {',
      '  const alias = {};',
      '  alias.width = DEFAULT_WIDTH;',
      '}',
      'export { root };',
    ].join('\n'),
    [
      'const root = {};',
      'let alias = root;',
      'condition ? (alias = {}) : (alias = {});',
      'alias.width = DEFAULT_WIDTH;',
      'export { root };',
    ].join('\n'),
    [
      'const root = {};',
      'let alias = root;',
      'switch (mode) {',
      '  case 1:',
      '    alias = {};',
      '    break;',
      '  default:',
      '    alias = {};',
      '}',
      'alias.width = DEFAULT_WIDTH;',
      'export { root };',
    ].join('\n'),
    ['const root = {};', 'let alias = root;', 'alias = DEFAULT_WIDTH;', 'export { root };'].join('\n'),
    [
      'const root = {};',
      'let alias = root;',
      'alias = {};',
      'alias.width = DEFAULT_WIDTH;',
      'export { root };',
    ].join('\n'),
    [
      'let root = {};',
      'const alias = root;',
      'root = {};',
      'alias.width = DEFAULT_WIDTH;',
      'export { root };',
    ].join('\n'),
    [
      'const root = { nested: {} };',
      'const nested = root.nested;',
      'root.nested = {};',
      'nested.width = DEFAULT_WIDTH;',
      'export { root };',
    ].join('\n'),
    [
      'const routed = { width: DEFAULT_WIDTH, safe: 1 };',
      'const { safe } = routed;',
      'export { safe };',
    ].join('\n'),
    ['const routed = { safe: 1 };', 'const { safe = DEFAULT_WIDTH } = routed;', 'export { safe };'].join(
      '\n'
    ),
    [
      'const routed = { width: DEFAULT_WIDTH, safe: 1 };',
      'const { width, ...rest } = routed;',
      'export { rest };',
    ].join('\n'),
    ['const { routed = DEFAULT_WIDTH, safe = 0 } = {};', 'export { safe };'].join('\n'),
  ];
  for (const nonBridge of nonBridgeCases) {
    const source = ["import { DEFAULT_WIDTH } from '../services/api.js';", nonBridge].join('\n');
    assert.deepEqual(
      collectRoutedBindingBridgeViolations(dimensionNames, [{ file: consumerA, source }]),
      [],
      nonBridge
    );
  }
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
  const syntheticInternalEntry = unsafeInternalAction.symbols.find(entry => entry.kind === 'value');
  const syntheticConsumer = 'esm/native/ui/__future_dimension_consumer.ts';
  syntheticInternalEntry.internalConsumers = [
    { file: syntheticConsumer, usage: 'value', route: 'facade-runtime-services-api' },
  ];
  syntheticInternalEntry.classification = 'internal transition only';
  syntheticInternalEntry.plannedAction = 'remove-after-internal-migration';
  assert.throws(() =>
    inspectManifest(unsafeInternalAction, [
      { consumer: syntheticConsumer, symbol: syntheticInternalEntry.name, usage: 'value' },
    ])
  );

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
    symbols: [
      {
        importedSymbol: 'DEFAULT_WIDTH',
        originalFacadeSymbol: 'DEFAULT_WIDTH',
        canonicalFocusedOwner: {
          file: 'esm/shared/dimensions/wardrobe_defaults.ts',
          symbols: ['DEFAULT_WIDTH'],
        },
        runtimeServicesRoute: 'facade-runtime-services-api',
        usage: 'value',
        publicExternalEvidence: [],
        migrationDecision: 'synthetic closeout regression probe',
      },
    ],
  });
  assert.throws(() => inspectInventory(futureConsumer, actualConsumers));

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
