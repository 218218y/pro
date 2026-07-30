import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const ownerRel = 'esm/shared/dimensions/library_preset_policy.ts';
const presetOwnerRel = 'esm/shared/dimensions/preset_models_dimension_defaults_policy.ts';
const presetDataRel = 'esm/native/data/preset_models_data.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const runtimeApiRel = 'esm/native/runtime/api.ts';
const publicApiRels = Object.freeze([
  runtimeApiRel,
  'esm/native/services/api.ts',
  'esm/native/services/api_runtime_base_surface.ts',
]);
const runtimeIdentityContractRel = 'tests/wardrobe_dimension_tokens_runtime.test.ts';
const sourceExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const runtimeExtensionCandidates = Object.freeze({
  '.js': Object.freeze(['.ts', '.tsx', '.mts']),
  '.mjs': Object.freeze(['.mts', '.ts', '.tsx']),
  '.cjs': Object.freeze(['.cts', '.ts', '.tsx']),
});
const focusedSymbols = new Set([
  'LIBRARY_PRESET_LAYOUT_POLICY',
  'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY',
  'LIBRARY_PRESET_POLICY',
]);
const compatibilitySymbol = 'LIBRARY_PRESET_DIMENSIONS';
const aggregateKeys = Object.freeze([
  'defaultDoorsCount',
  'defaultModuleDoorsCount',
  'topGridDivisions',
  'lowerGridDivisions',
  'minWidthCm',
  'minLowerDepthCm',
  'minLowerHeightCm',
  'minTopHeightCm',
  'defaultLowerHeightCm',
  'lowerDepthInsetCm',
]);
const aggregateMappings = Object.freeze([
  ['defaultDoorsCount', 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultDoorsCount'],
  ['defaultModuleDoorsCount', 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultModuleDoorsCount'],
  ['topGridDivisions', 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.topGridDivisions'],
  ['lowerGridDivisions', 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.lowerGridDivisions'],
  ['minWidthCm', 'LIBRARY_PRESET_LAYOUT_POLICY.minWidthCm'],
  ['minLowerDepthCm', 'LIBRARY_PRESET_LAYOUT_POLICY.minLowerDepthCm'],
  ['minLowerHeightCm', 'LIBRARY_PRESET_LAYOUT_POLICY.minLowerHeightCm'],
  ['minTopHeightCm', 'LIBRARY_PRESET_LAYOUT_POLICY.minTopHeightCm'],
  ['defaultLowerHeightCm', 'LIBRARY_PRESET_LAYOUT_POLICY.defaultLowerHeightCm'],
  ['lowerDepthInsetCm', 'LIBRARY_PRESET_LAYOUT_POLICY.lowerDepthInsetCm'],
]);
const expectedFocusedInventory = Object.freeze([
  Object.freeze({
    file: 'esm/shared/dimensions/library_preset_flow_dimension_policy.ts',
    symbol: 'LIBRARY_PRESET_LAYOUT_POLICY',
    specifier: './library_preset_policy.js',
    syntax: 'static-re-export',
  }),
  Object.freeze({
    file: 'esm/shared/dimensions/library_preset_module_defaults_dimension_policy.ts',
    symbol: 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY',
    specifier: './library_preset_policy.js',
    syntax: 'static-re-export',
  }),
  Object.freeze({
    file: 'esm/shared/dimensions/modules_configuration_defaults_dimension_policy.ts',
    symbol: 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY',
    specifier: './library_preset_policy.js',
    syntax: 'static-re-export',
  }),
  Object.freeze({
    file: 'esm/shared/dimensions/preset_models_dimension_defaults_policy.ts',
    symbol: 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY',
    specifier: './library_preset_policy.js',
    syntax: 'static-import',
  }),
  Object.freeze({
    file: 'esm/shared/dimensions/stack_split_module_config_dimension_policy.ts',
    symbol: 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY',
    specifier: './library_preset_policy.js',
    syntax: 'static-re-export',
  }),
  Object.freeze({
    file: facadeRel,
    symbol: 'LIBRARY_PRESET_POLICY',
    specifier: './dimensions/library_preset_policy.js',
    syntax: 'static-import',
  }),
]);

const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

function listSourceFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) listSourceFiles(absolute, files);
    else if (entry.isFile() && sourceExtensions.includes(path.extname(entry.name).toLowerCase())) {
      files.push(absolute);
    }
  }
  return files;
}

function relativePath(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function stripQueryHash(specifier) {
  const query = specifier.indexOf('?');
  const hash = specifier.indexOf('#');
  const cut = query === -1 ? hash : hash === -1 ? query : Math.min(query, hash);
  return cut === -1 ? specifier : specifier.slice(0, cut);
}

function canonicalFileTarget(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  return path.normalize(fs.realpathSync.native(file)).toLowerCase();
}

function resolveModuleTarget(fromFile, specifier) {
  if (typeof specifier !== 'string') return null;
  const clean = stripQueryHash(specifier);
  let raw;
  if (clean.startsWith('@/')) raw = path.join(root, 'esm', clean.slice(2));
  else if (clean.startsWith('.')) raw = path.resolve(path.dirname(fromFile), clean);
  else return null;

  const extension = path.extname(raw).toLowerCase();
  const candidates = [raw];
  if (!extension) {
    for (const candidateExtension of sourceExtensions) candidates.push(`${raw}${candidateExtension}`);
    for (const candidateExtension of sourceExtensions) {
      candidates.push(path.join(raw, `index${candidateExtension}`));
    }
  } else {
    const stem = raw.slice(0, -extension.length);
    for (const candidateExtension of runtimeExtensionCandidates[extension] ?? []) {
      candidates.push(`${stem}${candidateExtension}`);
    }
    if (fs.existsSync(raw) && fs.statSync(raw).isDirectory()) {
      for (const candidateExtension of sourceExtensions) {
        candidates.push(path.join(raw, `index${candidateExtension}`));
      }
    }
  }

  for (const candidate of candidates) {
    const target = canonicalFileTarget(candidate);
    if (target) return target;
  }
  return null;
}

const facadeTarget = canonicalFileTarget(path.join(root, facadeRel));
const ownerTarget = canonicalFileTarget(path.join(root, ownerRel));
const presetOwnerTarget = canonicalFileTarget(path.join(root, presetOwnerRel));
const publicDimensionsTarget = canonicalFileTarget(path.join(root, publicDimensionsRel));

function identifierName(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function staticMemberName(node) {
  if (node?.type !== 'MemberExpression') return null;
  if (!node.computed) return identifierName(node.property);
  return node.property?.type === 'Literal' && typeof node.property.value === 'string'
    ? node.property.value
    : null;
}

function memberPath(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type !== 'MemberExpression') return null;
  const objectPath = memberPath(node.object);
  const propertyName = staticMemberName(node);
  return objectPath && propertyName ? `${objectPath}.${propertyName}` : null;
}

function findVariableDeclarator(sourceFile, name) {
  let result = null;
  walkAst(sourceFile, node => {
    if (node?.type === 'VariableDeclarator' && identifierName(node.id) === name) result = node;
  });
  return result;
}

function collectBindingNames(node, names = []) {
  if (!node) return names;
  if (node.type === 'Identifier') {
    names.push(node.name);
    return names;
  }
  if (node.type === 'RestElement') return collectBindingNames(node.argument, names);
  if (node.type === 'AssignmentPattern') return collectBindingNames(node.left, names);
  if (node.type === 'ArrayPattern') {
    for (const element of node.elements ?? []) collectBindingNames(element, names);
    return names;
  }
  if (node.type === 'ObjectPattern') {
    for (const property of node.properties ?? []) {
      if (property.type === 'RestElement') collectBindingNames(property.argument, names);
      else collectBindingNames(property.value, names);
    }
  }
  return names;
}

function topLevelDeclaredNames(statement) {
  const declaration = statement?.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
  if (declaration?.type === 'VariableDeclaration') {
    return declaration.declarations.flatMap(entry => collectBindingNames(entry.id));
  }
  if (declaration?.type === 'FunctionDeclaration' || declaration?.type === 'ClassDeclaration') {
    return identifierName(declaration.id) ? [identifierName(declaration.id)] : [];
  }
  if (statement?.type === 'ImportDeclaration') {
    return (statement.specifiers ?? []).map(specifier => identifierName(specifier.local)).filter(Boolean);
  }
  return [];
}

function inspectPublicDimensionsBarrel(file, source) {
  const violations = [];
  const sourceFile = createSourceFile(file, source);
  const body = sourceFile.body ?? [];
  const dependencies = analyze(file, source).imports;
  const expectedSpecifier = '../../../shared/wardrobe_dimension_tokens_shared.js';
  const exactRoutes = dependencies.filter(
    dependency =>
      dependency.specifier === expectedSpecifier &&
      dependencyTargets(dependency, facadeTarget, file) &&
      dependency.kind === 'value' &&
      dependency.syntax === 'static-re-export' &&
      dependency.importedSymbols.length === 1 &&
      dependency.importedSymbols[0] === '*' &&
      dependency.exportedSymbols.length === 1 &&
      dependency.exportedSymbols[0] === '*'
  );

  if (exactRoutes.length !== 1) violations.push({ kind: 'public-barrel-facade-wildcard-missing' });
  if (dependencies.length !== 1) violations.push({ kind: 'public-barrel-extra-route' });

  for (const statement of body) {
    const declaredNames = topLevelDeclaredNames(statement);
    if (declaredNames.includes(compatibilitySymbol)) {
      violations.push({ kind: 'public-barrel-local-shadow', symbol: compatibilitySymbol });
    } else if (declaredNames.length > 0) {
      violations.push({ kind: 'public-barrel-local-declaration', symbols: declaredNames });
    }

    if (statement.type === 'ExportDefaultDeclaration') {
      violations.push({ kind: 'public-barrel-default-export' });
    }
    if (statement.type === 'ExportNamedDeclaration') {
      const exportedNames = (statement.specifiers ?? [])
        .map(specifier => identifierName(specifier.exported))
        .filter(Boolean);
      if (statement.source && exportedNames.includes(compatibilitySymbol)) {
        violations.push({ kind: 'public-barrel-alternate-re-export' });
      } else if (!statement.source && exportedNames.includes(compatibilitySymbol)) {
        violations.push({ kind: 'public-barrel-local-shadow', symbol: compatibilitySymbol });
      }
    }
  }

  const routeStatement = body[0];
  if (
    body.length !== 1 ||
    routeStatement?.type !== 'ExportAllDeclaration' ||
    routeStatement.exportKind === 'type' ||
    identifierName(routeStatement.source) !== expectedSpecifier ||
    routeStatement.exported != null
  ) {
    violations.push({ kind: 'public-barrel-topology' });
  }

  return violations;
}

function frozenObjectProperties(node) {
  assert.equal(node?.type, 'CallExpression');
  assert.equal(memberPath(node.callee), 'Object.freeze');
  assert.equal(node.arguments?.length, 1);
  assert.equal(node.arguments?.[0]?.type, 'ObjectExpression');
  return node.arguments[0].properties ?? [];
}

function dependencyTargets(dependency, target, fromFile) {
  return resolveModuleTarget(fromFile, dependency.specifier) === target;
}

function exposesSymbol(dependency, symbol) {
  return dependency.importedSymbols.includes(symbol) || dependency.importedSymbols.includes('*');
}

function exactBinding(dependency, symbol) {
  if (dependency.bindings.length !== 1 || dependency.bindings[0]?.importedName !== symbol) return false;
  const binding = dependency.bindings[0];
  if (dependency.syntax === 'static-re-export') {
    return binding.exportedName === symbol && (binding.localName === symbol || binding.localName === null);
  }
  return binding.localName === symbol && binding.exportedName === null;
}

function analyze(file, source) {
  return analyzeModuleDependencies(file, source);
}

function collectFocusedInventory(files) {
  const inventory = [];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const dependency of analyze(file, source).imports) {
      if (!dependencyTargets(dependency, ownerTarget, file)) continue;
      const symbols = dependency.importedSymbols.filter(symbol => focusedSymbols.has(symbol));
      if (dependency.importedSymbols.includes('*')) symbols.push('*');
      for (const symbol of symbols) {
        inventory.push({
          file: relativePath(file),
          symbol,
          specifier: dependency.specifier,
          kind: dependency.kind,
          syntax: dependency.syntax,
          importedSymbols: dependency.importedSymbols,
          exactBinding: symbol !== '*' && exactBinding(dependency, symbol),
        });
      }
    }
  }
  return inventory.sort((left, right) =>
    `${left.file}:${left.symbol}`.localeCompare(`${right.file}:${right.symbol}`)
  );
}

function inspectCompatibilityModule(file, source) {
  const violations = [];
  const sourceFile = createSourceFile(file, source);
  const dependencies = analyze(file, source).imports;
  const isSharedBridge = relativePath(file).startsWith('esm/shared/') && relativePath(file) !== facadeRel;

  for (const dependency of dependencies) {
    const targetsFacade = dependencyTargets(dependency, facadeTarget, file);
    const targetsPublicBarrel = dependencyTargets(dependency, publicDimensionsTarget, file);
    const targetsOwner = dependencyTargets(dependency, ownerTarget, file);

    if ((targetsFacade || targetsPublicBarrel) && exposesSymbol(dependency, compatibilitySymbol)) {
      if (isSharedBridge) violations.push({ kind: 'private-compatibility-bridge' });
      else if (targetsPublicBarrel) violations.push({ kind: 'public-barrel-compatibility-import' });
      else if (dependency.syntax === 'dynamic-import') {
        violations.push({ kind: 'compatibility-dynamic-import' });
      } else if (dependency.syntax.includes('re-export')) {
        violations.push({ kind: 'compatibility-re-export' });
      } else if (dependency.importedSymbols.includes('*')) {
        violations.push({ kind: 'compatibility-namespace-import' });
      } else if (!exactBinding(dependency, compatibilitySymbol)) {
        violations.push({ kind: 'compatibility-alias-import' });
      } else {
        violations.push({ kind: 'compatibility-import' });
      }
    }

    if (targetsOwner && exposesSymbol(dependency, 'LIBRARY_PRESET_POLICY')) {
      if (dependency.syntax === 'dynamic-import') {
        violations.push({ kind: 'aggregate-owner-dynamic-import' });
      } else if (dependency.importedSymbols.includes('*')) {
        violations.push({ kind: 'aggregate-owner-namespace-import' });
      } else {
        violations.push({ kind: 'aggregate-production-consumer' });
      }
    }
  }

  walkAst(sourceFile, node => {
    if (
      node?.type === 'VariableDeclarator' &&
      identifierName(node.init) === 'LIBRARY_PRESET_POLICY' &&
      identifierName(node.id) !== 'LIBRARY_PRESET_POLICY'
    ) {
      violations.push({ kind: 'aggregate-owner-alias' });
    }
  });

  return violations;
}

function inspectFocusedModule(file, source) {
  const violations = [];
  for (const dependency of analyze(file, source).imports) {
    const targetsOwner = dependencyTargets(dependency, ownerTarget, file);
    const targetsPublicBarrel = dependencyTargets(dependency, publicDimensionsTarget, file);
    const exposedFocusedSymbols = dependency.importedSymbols.filter(symbol => focusedSymbols.has(symbol));
    if (dependency.importedSymbols.includes('*') && targetsOwner) exposedFocusedSymbols.push('*');
    if (targetsPublicBarrel && dependency.importedSymbols.some(symbol => focusedSymbols.has(symbol))) {
      violations.push({ kind: 'focused-owner-public-barrel' });
      continue;
    }
    if (!targetsOwner || exposedFocusedSymbols.length === 0) continue;
    if (dependency.syntax === 'dynamic-import') {
      violations.push({ kind: 'focused-owner-dynamic-import' });
      continue;
    }
    if (dependency.importedSymbols.includes('*')) {
      violations.push({ kind: 'focused-owner-namespace-import' });
      continue;
    }
    const symbol = exposedFocusedSymbols[0];
    const expected = expectedFocusedInventory.find(
      entry => entry.file === relativePath(file) && entry.symbol === symbol
    );
    if (!expected) {
      violations.push({ kind: 'unapproved-focused-consumer' });
      continue;
    }
    if (!exactBinding(dependency, symbol)) {
      violations.push({ kind: 'focused-owner-alias' });
      continue;
    }
    if (
      dependency.kind !== 'value' ||
      dependency.syntax !== expected.syntax ||
      dependency.importedSymbols.length !== 1 ||
      dependency.specifier !== expected.specifier
    ) {
      violations.push({ kind: 'invalid-focused-owner-route' });
    }
  }
  return violations;
}

function inspectPresetComposition(source) {
  const violations = [];
  const file = path.join(root, presetOwnerRel);
  const analysis = analyze(file, source);
  const focusedDependency = analysis.imports.find(dependency =>
    dependencyTargets(dependency, ownerTarget, file)
  );
  if (
    !focusedDependency ||
    focusedDependency.kind !== 'value' ||
    focusedDependency.syntax !== 'static-import' ||
    focusedDependency.specifier !== './library_preset_policy.js' ||
    focusedDependency.importedSymbols.length !== 1 ||
    !exactBinding(focusedDependency, 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY')
  ) {
    violations.push({ kind: 'preset-models-composition-route' });
  }
  for (const forbidden of [
    'LIBRARY_PRESET_POLICY',
    'LIBRARY_PRESET_LAYOUT_POLICY',
    'LIBRARY_PRESET_DIMENSIONS',
    'wardrobe_dimension_tokens_shared',
  ]) {
    if (source.includes(forbidden)) {
      violations.push({ kind: 'preset-models-composition-forbidden', symbol: forbidden });
    }
  }
  return violations;
}

function inspectPresetData(source) {
  const file = path.join(root, presetDataRel);
  const violations = [];
  const analysis = analyze(file, source);
  const privateDependencies = analysis.imports.filter(dependency =>
    dependencyTargets(dependency, presetOwnerTarget, file)
  );
  if (
    privateDependencies.length !== 1 ||
    privateDependencies[0].kind !== 'value' ||
    privateDependencies[0].syntax !== 'static-import' ||
    privateDependencies[0].specifier !==
      '../../shared/dimensions/preset_models_dimension_defaults_policy.js' ||
    privateDependencies[0].importedSymbols.length !== 1 ||
    !exactBinding(privateDependencies[0], 'PRESET_MODELS_DIMENSION_DEFAULTS_POLICY')
  ) {
    violations.push({ kind: 'preset-models-private-owner-route' });
  }
  if (
    analysis.imports.some(
      dependency =>
        dependencyTargets(dependency, ownerTarget, file) ||
        dependencyTargets(dependency, facadeTarget, file) ||
        dependencyTargets(dependency, publicDimensionsTarget, file)
    )
  ) {
    violations.push({ kind: 'preset-models-direct-library-owner' });
  }
  return violations;
}

function inspectFacade(source) {
  const file = path.join(root, facadeRel);
  const violations = [];
  const analysis = analyze(file, source);
  const ownerDependencies = analysis.imports.filter(dependency =>
    dependencyTargets(dependency, ownerTarget, file)
  );
  if (
    ownerDependencies.length !== 1 ||
    ownerDependencies[0].kind !== 'value' ||
    ownerDependencies[0].syntax !== 'static-import' ||
    ownerDependencies[0].specifier !== './dimensions/library_preset_policy.js' ||
    ownerDependencies[0].importedSymbols.length !== 1 ||
    !exactBinding(ownerDependencies[0], 'LIBRARY_PRESET_POLICY')
  ) {
    violations.push({ kind: 'facade-aggregate-route' });
  }

  const sourceFile = createSourceFile(file, source);
  const inlineDeclarations = (sourceFile.body ?? []).filter(
    statement =>
      statement.type === 'ExportNamedDeclaration' &&
      statement.declaration?.type === 'VariableDeclaration' &&
      statement.declaration.declarations.some(
        declarator => identifierName(declarator.id) === compatibilitySymbol
      )
  );
  const publicExports = collectNamedModuleExports(file, source).filter(
    entry => entry.exportedName === compatibilitySymbol && entry.kind === 'value'
  );

  if (inlineDeclarations.length === 0) {
    violations.push({
      kind:
        publicExports.length > 0 ? 'facade-compatibility-not-inline' : 'facade-compatibility-export-missing',
    });
  } else if (inlineDeclarations.length !== 1) {
    violations.push({ kind: 'facade-compatibility-export-duplicate' });
  } else {
    const exportStatement = inlineDeclarations[0];
    const variableDeclaration = exportStatement.declaration;
    const declarators = variableDeclaration.declarations;
    const declaration = declarators.find(declarator => identifierName(declarator.id) === compatibilitySymbol);
    if (variableDeclaration.kind !== 'const') {
      violations.push({ kind: 'facade-compatibility-not-const' });
    }
    if (
      declaration?.id?.type === 'Identifier' &&
      (declaration.id.typeAnnotation != null ||
        declaration.id.optional === true ||
        declaration.id.definite === true)
    ) {
      violations.push({ kind: 'facade-compatibility-type-annotation' });
    }
    if (
      declarators.length !== 1 ||
      declaration?.id?.type !== 'Identifier' ||
      identifierName(declaration.init) !== 'LIBRARY_PRESET_POLICY'
    ) {
      violations.push({ kind: 'facade-identity-alias' });
    }
    if (
      publicExports.length !== 1 ||
      publicExports[0].source !== null ||
      publicExports[0].statementStart !== Number(exportStatement.start)
    ) {
      violations.push({ kind: 'facade-public-export-shape' });
    }
  }

  if (publicExports.length === 0) violations.push({ kind: 'facade-public-export-missing' });
  else if (publicExports.length !== 1) violations.push({ kind: 'facade-public-export-duplicate' });

  walkAst(sourceFile, node => {
    if (node?.type === 'AssignmentExpression' && identifierName(node.left) === compatibilitySymbol) {
      violations.push({ kind: 'facade-compatibility-reassignment' });
    }
    if (node?.type === 'UpdateExpression' && identifierName(node.argument) === compatibilitySymbol) {
      violations.push({ kind: 'facade-compatibility-reassignment' });
    }
  });

  return violations;
}

const esmSourceFiles = listSourceFiles(path.join(root, 'esm'));

function assertProbeRejected({ name, file, source, inspect, expectedKind }) {
  const violations = inspect(file, source);
  assert.ok(
    violations.some(violation => violation.kind === expectedKind),
    `${name}: expected ${expectedKind}, got ${JSON.stringify(violations)}`
  );
}

test('Library Preset compatibility symbol has zero native production consumers and one public barrel route', () => {
  const violations = [];
  const approvedPublicRoutes = [];
  for (const file of esmSourceFiles) {
    const rel = relativePath(file);
    const source = fs.readFileSync(file, 'utf8');
    const analysis = analyze(file, source);
    for (const dependency of analysis.imports) {
      const targetsFacade = dependencyTargets(dependency, facadeTarget, file);
      const targetsPublicBarrel = dependencyTargets(dependency, publicDimensionsTarget, file);
      if (rel === publicDimensionsRel && targetsFacade && dependency.syntax === 'static-re-export') {
        approvedPublicRoutes.push({
          file: rel,
          specifier: dependency.specifier,
          importedSymbols: dependency.importedSymbols,
          syntax: dependency.syntax,
        });
        continue;
      }
      if (!rel.startsWith('esm/native/')) continue;
      if ((targetsFacade || targetsPublicBarrel) && exposesSymbol(dependency, compatibilitySymbol)) {
        violations.push({ file: rel, syntax: dependency.syntax, symbols: dependency.importedSymbols });
      }
      if (
        dependencyTargets(dependency, ownerTarget, file) &&
        exposesSymbol(dependency, 'LIBRARY_PRESET_POLICY')
      ) {
        violations.push({ file: rel, syntax: dependency.syntax, symbols: dependency.importedSymbols });
      }
    }
    if (
      rel.startsWith('esm/native/') &&
      rel !== publicDimensionsRel &&
      source.includes(compatibilitySymbol)
    ) {
      violations.push({ file: rel, syntax: 'identifier', symbols: [compatibilitySymbol] });
    }
    if (rel !== facadeRel && rel !== publicDimensionsRel) {
      for (const violation of inspectCompatibilityModule(file, source)) {
        violations.push({ file: rel, ...violation });
      }
    }
  }

  assert.deepEqual(violations, []);
  assert.deepEqual(approvedPublicRoutes, [
    {
      file: publicDimensionsRel,
      specifier: '../../../shared/wardrobe_dimension_tokens_shared.js',
      importedSymbols: ['*'],
      syntax: 'static-re-export',
    },
  ]);
});

test('Library Preset focused consumer inventory is exact, direct, static, value-only, and alias-free', () => {
  const inventory = collectFocusedInventory(esmSourceFiles);
  assert.deepEqual(
    inventory,
    [...expectedFocusedInventory]
      .sort((left, right) => `${left.file}:${left.symbol}`.localeCompare(`${right.file}:${right.symbol}`))
      .map(entry => ({
        ...entry,
        kind: 'value',
        syntax: entry.syntax,
        importedSymbols: [entry.symbol],
        exactBinding: true,
      }))
  );

  for (const file of esmSourceFiles) {
    assert.deepEqual(inspectFocusedModule(file, fs.readFileSync(file, 'utf8')), [], relativePath(file));
  }
});

test('Preset Models crosses the Library Preset boundary only through its private composition owner', () => {
  const presetOwnerSource = read(presetOwnerRel);
  const presetOwnerFile = createSourceFile(path.join(root, presetOwnerRel), presetOwnerSource);
  assert.deepEqual(inspectPresetComposition(presetOwnerSource), []);

  const declaration = findVariableDeclarator(presetOwnerFile, 'PRESET_MODELS_DIMENSION_DEFAULTS_POLICY');
  const properties = frozenObjectProperties(declaration.init);
  const projections = new Map(
    properties.map(property => [identifierName(property.key), memberPath(property.value)])
  );
  assert.equal(
    projections.get('libraryPresetDoorsCount'),
    'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultDoorsCount'
  );
  assert.equal(
    projections.get('libraryPresetModuleDoorsCount'),
    'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultModuleDoorsCount'
  );

  assert.deepEqual(inspectPresetData(read(presetDataRel)), []);
});

test('Library Preset owner aggregate and facade compatibility alias remain exact identity projections', () => {
  const ownerSource = read(ownerRel);
  const ownerFile = createSourceFile(path.join(root, ownerRel), ownerSource);
  assert.deepEqual(
    collectNamedModuleExports(path.join(root, ownerRel), ownerSource)
      .filter(entry => entry.kind === 'value')
      .map(entry => entry.exportedName),
    ['LIBRARY_PRESET_MODULE_DEFAULTS_POLICY', 'LIBRARY_PRESET_LAYOUT_POLICY', 'LIBRARY_PRESET_POLICY']
  );

  const aggregate = findVariableDeclarator(ownerFile, 'LIBRARY_PRESET_POLICY');
  const properties = frozenObjectProperties(aggregate.init);
  assert.deepEqual(
    properties.map(property => [identifierName(property.key), memberPath(property.value)]),
    aggregateMappings
  );
  assert.deepEqual(
    properties.map(property => identifierName(property.key)),
    aggregateKeys
  );
  for (const property of properties) {
    assert.equal(property.type, 'Property');
    assert.equal(property.computed, false);
    assert.equal(property.value?.type, 'MemberExpression');
    assert.equal(property.value?.computed, false);
  }
  const forbiddenNodes = [];
  walkAst(aggregate.init, node => {
    if (
      node?.type === 'SpreadElement' ||
      (node?.type === 'Literal' && typeof node.value === 'number') ||
      (node?.type === 'CallExpression' && node !== aggregate.init) ||
      (node?.type === 'ObjectExpression' && node !== aggregate.init.arguments[0])
    ) {
      forbiddenNodes.push(node.type);
    }
  });
  assert.deepEqual(forbiddenNodes, []);
  assert.deepEqual(inspectFacade(read(facadeRel)), []);
});

test('public compatibility routes and runtime identity coverage remain intact without owner API exports', () => {
  for (const rel of publicApiRels) {
    const file = path.join(root, rel);
    const source = read(rel);
    const analysis = analyze(file, source);
    assert.equal(
      analysis.imports.some(dependency => dependencyTargets(dependency, ownerTarget, file)),
      false,
      rel
    );
    for (const symbol of focusedSymbols) assert.doesNotMatch(source, new RegExp(`\\b${symbol}\\b`, 'u'), rel);
  }

  const runtimeSource = read(runtimeIdentityContractRel);
  assert.match(runtimeSource, /FACADE_LIBRARY_PRESET_DIMENSIONS\s*,/u);
  assert.match(runtimeSource, /LIBRARY_PRESET_POLICY\s*,/u);
  assert.match(runtimeSource, /assert\.equal\(FACADE_LIBRARY_PRESET_DIMENSIONS, LIBRARY_PRESET_POLICY\);/u);
  assert.match(runtimeSource, /Object\.isFrozen\(LIBRARY_PRESET_MODULE_DEFAULTS_POLICY\)/u);
  assert.match(runtimeSource, /Object\.isFrozen\(LIBRARY_PRESET_LAYOUT_POLICY\)/u);
  assert.match(runtimeSource, /Object\.isFrozen\(LIBRARY_PRESET_POLICY\)/u);
  assert.match(runtimeSource, /JSON\.stringify\(FACADE_LIBRARY_PRESET_DIMENSIONS\)/u);
  assert.match(runtimeSource, /assert\.deepEqual\(roundTrip, LIBRARY_PRESET_POLICY\);/u);
});

test('Library Preset closeout rejects compatibility, bridge, aggregate, and focused-owner route drift', () => {
  const nativeProbe = path.join(root, 'esm/native/features/library_preset/__closeout_probe.ts');
  const sharedProbe = path.join(root, 'esm/shared/dimensions/__library_preset_bridge.ts');
  const compatibilityCases = [
    {
      name: 'native direct compatibility import',
      source:
        "import { LIBRARY_PRESET_DIMENSIONS } from '../../../shared/wardrobe_dimension_tokens_shared.js';\nexport const value = LIBRARY_PRESET_DIMENSIONS.defaultDoorsCount;",
      expectedKind: 'compatibility-import',
    },
    {
      name: 'native alias compatibility import',
      source:
        "import { LIBRARY_PRESET_DIMENSIONS as defaults } from '../../../shared/wardrobe_dimension_tokens_shared.js';\nexport const value = defaults.defaultDoorsCount;",
      expectedKind: 'compatibility-alias-import',
    },
    {
      name: 'namespace facade access',
      source:
        "import * as dimensions from '../../../shared/wardrobe_dimension_tokens_shared.js';\nexport const value = dimensions.LIBRARY_PRESET_DIMENSIONS.defaultDoorsCount;",
      expectedKind: 'compatibility-namespace-import',
    },
    {
      name: 'dynamic facade access',
      source:
        "const dimensions = await import('../../../shared/wardrobe_dimension_tokens_shared.js');\nexport const value = dimensions.LIBRARY_PRESET_DIMENSIONS.defaultDoorsCount;",
      expectedKind: 'compatibility-dynamic-import',
    },
    {
      name: 'named compatibility re-export',
      source:
        "export { LIBRARY_PRESET_DIMENSIONS } from '../../../shared/wardrobe_dimension_tokens_shared.js';",
      expectedKind: 'compatibility-re-export',
    },
    {
      name: 'wildcard facade re-export',
      source: "export * from '../../../shared/wardrobe_dimension_tokens_shared.js';",
      expectedKind: 'compatibility-re-export',
    },
    {
      name: 'local import then export',
      source:
        "import { LIBRARY_PRESET_DIMENSIONS } from '../../../shared/wardrobe_dimension_tokens_shared.js';\nexport { LIBRARY_PRESET_DIMENSIONS };",
      expectedKind: 'compatibility-import',
    },
    {
      name: 'public barrel compatibility import',
      source:
        "import { LIBRARY_PRESET_DIMENSIONS } from '../dimensions/index.js';\nexport const value = LIBRARY_PRESET_DIMENSIONS.defaultDoorsCount;",
      expectedKind: 'public-barrel-compatibility-import',
    },
    {
      name: 'direct aggregate production import',
      source:
        "import { LIBRARY_PRESET_POLICY } from '../../../shared/dimensions/library_preset_policy.js';\nexport const value = LIBRARY_PRESET_POLICY.defaultDoorsCount;",
      expectedKind: 'aggregate-production-consumer',
    },
    {
      name: 'aggregate owner alias',
      source:
        "import { LIBRARY_PRESET_POLICY } from '../../../shared/dimensions/library_preset_policy.js';\nconst defaults = LIBRARY_PRESET_POLICY;\nexport { defaults };",
      expectedKind: 'aggregate-owner-alias',
    },
    {
      name: 'compatibility destructuring',
      source:
        "import { LIBRARY_PRESET_DIMENSIONS } from '../../../shared/wardrobe_dimension_tokens_shared.js';\nconst { defaultDoorsCount } = LIBRARY_PRESET_DIMENSIONS;\nexport { defaultDoorsCount };",
      expectedKind: 'compatibility-import',
    },
    {
      name: 'compatibility computed access',
      source:
        "import { LIBRARY_PRESET_DIMENSIONS } from '../../../shared/wardrobe_dimension_tokens_shared.js';\nexport const value = LIBRARY_PRESET_DIMENSIONS['defaultDoorsCount'];",
      expectedKind: 'compatibility-import',
    },
    {
      name: 'compatibility wrapper object',
      source:
        "import { LIBRARY_PRESET_DIMENSIONS } from '../../../shared/wardrobe_dimension_tokens_shared.js';\nexport const value = { defaults: LIBRARY_PRESET_DIMENSIONS };",
      expectedKind: 'compatibility-import',
    },
  ];
  for (const probe of compatibilityCases) {
    assertProbeRejected({
      ...probe,
      file: nativeProbe,
      inspect: inspectCompatibilityModule,
    });
  }

  assertProbeRejected({
    name: 'arbitrary shared bridge',
    file: sharedProbe,
    source: "export { LIBRARY_PRESET_DIMENSIONS } from '../wardrobe_dimension_tokens_shared.js';",
    inspect: inspectCompatibilityModule,
    expectedKind: 'private-compatibility-bridge',
  });

  const focusedCases = [
    {
      name: 'focused owner through public barrel',
      source:
        "import { LIBRARY_PRESET_MODULE_DEFAULTS_POLICY } from '../dimensions/index.js';\nexport const value = LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultDoorsCount;",
      expectedKind: 'focused-owner-public-barrel',
    },
    {
      name: 'focused owner namespace import',
      source:
        "import * as libraryPreset from '../../../shared/dimensions/library_preset_policy.js';\nexport const value = libraryPreset.LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultDoorsCount;",
      expectedKind: 'focused-owner-namespace-import',
    },
    {
      name: 'focused owner dynamic import',
      source:
        "const libraryPreset = await import('../../../shared/dimensions/library_preset_policy.js');\nexport const value = libraryPreset.LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultDoorsCount;",
      expectedKind: 'focused-owner-dynamic-import',
    },
    {
      name: 'unapproved focused consumer',
      source:
        "import { LIBRARY_PRESET_MODULE_DEFAULTS_POLICY } from '../../../shared/dimensions/library_preset_policy.js';\nexport const value = LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultDoorsCount;",
      expectedKind: 'unapproved-focused-consumer',
    },
  ];
  for (const probe of focusedCases) {
    assertProbeRejected({ ...probe, file: nativeProbe, inspect: inspectFocusedModule });
  }

  const presetDataMutation = `${"import { LIBRARY_PRESET_MODULE_DEFAULTS_POLICY } from '../../shared/dimensions/library_preset_policy.js';\n"}${read(presetDataRel)}`;
  assert.ok(
    inspectPresetData(presetDataMutation).some(
      violation => violation.kind === 'preset-models-direct-library-owner'
    )
  );

  const presetOwnerMutation = read(presetOwnerRel).replace(
    "import { LIBRARY_PRESET_MODULE_DEFAULTS_POLICY } from './library_preset_policy.js';",
    "import { LIBRARY_PRESET_POLICY } from './library_preset_policy.js';"
  );
  assert.ok(
    inspectPresetComposition(presetOwnerMutation).some(
      violation => violation.kind === 'preset-models-composition-forbidden'
    )
  );

  const facadeSource = read(facadeRel);
  const facadeCopy = facadeSource.replace(
    'export const LIBRARY_PRESET_DIMENSIONS = LIBRARY_PRESET_POLICY;',
    'export const LIBRARY_PRESET_DIMENSIONS = Object.freeze({ ...LIBRARY_PRESET_POLICY });'
  );
  assert.ok(inspectFacade(facadeCopy).some(violation => violation.kind === 'facade-identity-alias'));

  const facadeLegacyView = facadeSource.replace(
    'export const LIBRARY_PRESET_DIMENSIONS = LIBRARY_PRESET_POLICY;',
    'export const LIBRARY_PRESET_DIMENSIONS = legacyDimensionNumberView(LIBRARY_PRESET_POLICY);'
  );
  assert.ok(inspectFacade(facadeLegacyView).some(violation => violation.kind === 'facade-identity-alias'));

  const facadeRemoval = facadeSource.replace(
    'export const LIBRARY_PRESET_DIMENSIONS = LIBRARY_PRESET_POLICY;\n',
    ''
  );
  assert.ok(
    inspectFacade(facadeRemoval).some(violation => violation.kind === 'facade-compatibility-export-missing')
  );
});

test('public barrel shadowing and mutable facade aliases are rejected while exact routes remain accepted', () => {
  const publicFile = path.join(root, publicDimensionsRel);
  const publicSource = read(publicDimensionsRel);
  assert.deepEqual(inspectPublicDimensionsBarrel(publicFile, publicSource), []);

  const publicBarrelCases = [
    {
      name: 'local const compatibility shadow',
      source: `${publicSource}
export const LIBRARY_PRESET_DIMENSIONS = Object.freeze({ shadowed: true });
`,
      expectedKind: 'public-barrel-local-shadow',
    },
    {
      name: 'local let compatibility shadow',
      source: `${publicSource}
export let LIBRARY_PRESET_DIMENSIONS = null;
`,
      expectedKind: 'public-barrel-local-shadow',
    },
    {
      name: 'local declaration exported later',
      source: `${publicSource}
const LIBRARY_PRESET_DIMENSIONS = Object.freeze({});
export { LIBRARY_PRESET_DIMENSIONS };
`,
      expectedKind: 'public-barrel-local-shadow',
    },
    {
      name: 'explicit alternate compatibility re-export',
      source: `${publicSource}
export { LIBRARY_PRESET_DIMENSIONS } from '../../../shared/library_preset_compatibility_bridge.js';
`,
      expectedKind: 'public-barrel-alternate-re-export',
    },
    {
      name: 'extra wildcard route',
      source: `${publicSource}
export * from '../../../shared/another_dimension_surface.js';
`,
      expectedKind: 'public-barrel-extra-route',
    },
    {
      name: 'missing facade wildcard',
      source: "export * from '../../../shared/another_dimension_surface.js';\n",
      expectedKind: 'public-barrel-facade-wildcard-missing',
    },
  ];
  for (const probe of publicBarrelCases) {
    assertProbeRejected({
      ...probe,
      file: publicFile,
      inspect: inspectPublicDimensionsBarrel,
    });
  }

  const facadeSource = read(facadeRel);
  assert.deepEqual(inspectFacade(facadeSource), []);

  const mutableAlias = facadeSource.replace(
    'export const LIBRARY_PRESET_DIMENSIONS = LIBRARY_PRESET_POLICY;',
    'export let LIBRARY_PRESET_DIMENSIONS = LIBRARY_PRESET_POLICY;'
  );
  assert.ok(
    inspectFacade(mutableAlias).some(violation => violation.kind === 'facade-compatibility-not-const')
  );

  const exportedLater = facadeSource.replace(
    'export const LIBRARY_PRESET_DIMENSIONS = LIBRARY_PRESET_POLICY;',
    'const LIBRARY_PRESET_DIMENSIONS = LIBRARY_PRESET_POLICY;\nexport { LIBRARY_PRESET_DIMENSIONS };'
  );
  assert.ok(
    inspectFacade(exportedLater).some(violation => violation.kind === 'facade-compatibility-not-inline')
  );

  const reassignedAlias = facadeSource.replace(
    'export const LIBRARY_PRESET_DIMENSIONS = LIBRARY_PRESET_POLICY;',
    'export let LIBRARY_PRESET_DIMENSIONS = LIBRARY_PRESET_POLICY;\nLIBRARY_PRESET_DIMENSIONS = Object.freeze({});'
  );
  const reassignmentViolations = inspectFacade(reassignedAlias);
  assert.ok(reassignmentViolations.some(violation => violation.kind === 'facade-compatibility-not-const'));
  assert.ok(reassignmentViolations.some(violation => violation.kind === 'facade-compatibility-reassignment'));
});

test('facade compatibility declaration preserves inferred owner type without local type layers', () => {
  const facadeSource = read(facadeRel);
  const canonicalDeclaration = 'export const LIBRARY_PRESET_DIMENSIONS = LIBRARY_PRESET_POLICY;';
  assert.deepEqual(inspectFacade(facadeSource), []);

  const sourceFile = createSourceFile(path.join(root, facadeRel), facadeSource);
  const exportStatement = (sourceFile.body ?? []).find(
    statement =>
      statement.type === 'ExportNamedDeclaration' &&
      statement.declaration?.type === 'VariableDeclaration' &&
      statement.declaration.declarations.some(
        declarator => identifierName(declarator.id) === compatibilitySymbol
      )
  );
  const declaration = exportStatement?.declaration?.declarations?.[0];
  assert.equal(exportStatement?.declaration?.kind, 'const');
  assert.equal(declaration?.id?.type, 'Identifier');
  assert.equal(declaration?.id?.typeAnnotation ?? null, null);
  assert.notEqual(declaration?.id?.optional, true);
  assert.notEqual(declaration?.id?.definite, true);
  assert.equal(identifierName(declaration?.init), 'LIBRARY_PRESET_POLICY');

  const annotationCases = [
    {
      name: 'unknown annotation',
      declaration: `export const LIBRARY_PRESET_DIMENSIONS:
  unknown =
    LIBRARY_PRESET_POLICY;`,
    },
    {
      name: 'any annotation',
      declaration: `export const LIBRARY_PRESET_DIMENSIONS:
  any =
    LIBRARY_PRESET_POLICY;`,
    },
    {
      name: 'broad object annotation',
      declaration: `export const LIBRARY_PRESET_DIMENSIONS:
  Readonly<Record<string, unknown>> =
    LIBRARY_PRESET_POLICY;`,
    },
    {
      name: 'explicit owner type annotation',
      declaration: `export const LIBRARY_PRESET_DIMENSIONS:
  typeof LIBRARY_PRESET_POLICY =
    LIBRARY_PRESET_POLICY;`,
    },
  ];
  for (const probe of annotationCases) {
    const source = facadeSource.replace(canonicalDeclaration, probe.declaration);
    const violations = inspectFacade(source);
    assert.ok(
      violations.some(violation => violation.kind === 'facade-compatibility-type-annotation'),
      `${probe.name}: expected facade-compatibility-type-annotation, got ${JSON.stringify(violations)}`
    );
  }

  const initializerWrapperCases = [
    {
      name: 'as assertion wrapper',
      declaration: 'export const LIBRARY_PRESET_DIMENSIONS = LIBRARY_PRESET_POLICY as unknown;',
    },
    {
      name: 'satisfies wrapper',
      declaration: 'export const LIBRARY_PRESET_DIMENSIONS = LIBRARY_PRESET_POLICY satisfies unknown;',
    },
    {
      name: 'angle-bracket assertion wrapper',
      declaration: 'export const LIBRARY_PRESET_DIMENSIONS = <unknown>LIBRARY_PRESET_POLICY;',
    },
  ];
  for (const probe of initializerWrapperCases) {
    const source = facadeSource.replace(canonicalDeclaration, probe.declaration);
    const violations = inspectFacade(source);
    assert.ok(
      violations.some(violation => violation.kind === 'facade-identity-alias'),
      `${probe.name}: expected facade-identity-alias, got ${JSON.stringify(violations)}`
    );
  }
});

test('Library Preset positive route proofs remain accepted', () => {
  for (const expected of expectedFocusedInventory) {
    const file = path.join(root, expected.file);
    assert.deepEqual(inspectFocusedModule(file, fs.readFileSync(file, 'utf8')), [], expected.file);
  }
  assert.deepEqual(inspectPresetComposition(read(presetOwnerRel)), []);
  assert.deepEqual(inspectPresetData(read(presetDataRel)), []);
  assert.deepEqual(inspectFacade(read(facadeRel)), []);
});
