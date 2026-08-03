import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ownerRel = 'esm/shared/dimensions/library_preset_policy.ts';
const presetOwnerRel = 'esm/shared/dimensions/preset_models_dimension_defaults_policy.ts';
const presetDataRel = 'esm/native/data/preset_models_data.ts';

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

const ownerTarget = canonicalFileTarget(path.join(root, ownerRel));
const presetOwnerTarget = canonicalFileTarget(path.join(root, presetOwnerRel));

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

function frozenObjectProperties(node) {
  assert.equal(node?.type, 'CallExpression');
  assert.equal(memberPath(node.callee), 'Object.freeze');
  assert.equal(node.arguments?.length, 1);
  assert.equal(node.arguments?.[0]?.type, 'ObjectExpression');
  return node.arguments[0].properties ?? [];
}

function dependencyTargets(dependency, target, fromFile) {
  return target !== null && resolveModuleTarget(fromFile, dependency.specifier) === target;
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

function inspectFocusedModule(file, source) {
  const violations = [];
  for (const dependency of analyze(file, source).imports) {
    const targetsOwner = dependencyTargets(dependency, ownerTarget, file);
    const exposedFocusedSymbols = dependency.importedSymbols.filter(symbol => focusedSymbols.has(symbol));
    if (dependency.importedSymbols.includes('*') && targetsOwner) exposedFocusedSymbols.push('*');
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
  if (analysis.imports.some(dependency => dependencyTargets(dependency, ownerTarget, file))) {
    violations.push({ kind: 'preset-models-direct-library-owner' });
  }
  return violations;
}

const esmSourceFiles = listSourceFiles(path.join(root, 'esm'));

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
