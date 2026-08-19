import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const sourceFileExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const runtimeExtensionCandidates = Object.freeze({
  '.js': Object.freeze(['.ts', '.tsx', '.mts']),
  '.mjs': Object.freeze(['.mts', '.ts', '.tsx']),
  '.cjs': Object.freeze(['.cts', '.ts', '.tsx']),
});
const legacySymbols = new Set(['INTERIOR_FITTINGS_DIMENSIONS', 'LIBRARY_PRESET_DIMENSIONS']);
const aggregateOwnerSymbols = new Set([
  'INTERIOR_FITTINGS_POLICY',
  'INTERIOR_STORAGE_POLICY',
  'LIBRARY_PRESET_POLICY',
]);
const focusedOwnerSymbols = new Set([
  'INTERIOR_STORAGE_DEFAULTS_POLICY',
  'INTERIOR_STORAGE_GRID_POLICY',
  'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY',
]);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const consumers = Object.freeze([
  Object.freeze({
    rel: 'esm/native/features/modules_configuration/module_defaults.ts',
    imports: Object.freeze([
      Object.freeze({
        specifier: '../../../shared/dimensions/modules_configuration_defaults_dimension_policy.js',
        ownerRel: 'esm/shared/dimensions/modules_configuration_defaults_dimension_policy.ts',
        symbols: Object.freeze(['INTERIOR_STORAGE_GRID_POLICY', 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY']),
      }),
    ]),
    mappings: Object.freeze([
      Object.freeze({
        legacy: 'INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault',
        focused: 'INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault',
        count: 1,
      }),
      Object.freeze({
        legacy: 'LIBRARY_PRESET_DIMENSIONS.defaultModuleDoorsCount',
        focused: 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultModuleDoorsCount',
        count: 1,
      }),
    ]),
    numericLiterals: Object.freeze([0, 0, 0, 0, 0, 0, 0]),
    functions: Object.freeze([
      Object.freeze({
        name: 'createDefaultModuleCustomData',
        params: Object.freeze([Object.freeze({ name: 'cellCount', hasDefault: true })]),
        returnType: ':ModuleCustomDataLike',
        exported: true,
      }),
      Object.freeze({
        name: 'createDefaultTopModuleConfig',
        params: Object.freeze([
          Object.freeze({ name: 'index', hasDefault: false }),
          Object.freeze({ name: 'doors', hasDefault: false }),
        ]),
        returnType: ':NormalizedTopModuleConfigLike',
        exported: true,
      }),
    ]),
    returnShapes: Object.freeze({
      createDefaultModuleCustomData: Object.freeze([Object.freeze(['shelves', 'rods', 'storage'])]),
      createDefaultTopModuleConfig: Object.freeze([
        Object.freeze(['layout', 'extDrawersCount', 'hasShoeDrawer', 'isCustom', 'customData', 'doors']),
      ]),
    }),
    variableShapes: Object.freeze({}),
    nestedCustomDataShapes: Object.freeze([]),
  }),
  Object.freeze({
    rel: 'esm/native/features/stack_split/module_config.ts',
    imports: Object.freeze([
      Object.freeze({
        specifier: '../../../shared/dimensions/stack_split_module_config_dimension_policy.js',
        ownerRel: 'esm/shared/dimensions/stack_split_module_config_dimension_policy.ts',
        symbols: Object.freeze([
          'INTERIOR_STORAGE_DEFAULTS_POLICY',
          'INTERIOR_STORAGE_GRID_POLICY',
          'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY',
        ]),
      }),
    ]),
    mappings: Object.freeze([
      Object.freeze({
        legacy: 'INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault',
        focused: 'INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault',
        count: 7,
      }),
      Object.freeze({
        legacy: 'INTERIOR_FITTINGS_DIMENSIONS.storage.defaultLowerShelfSlots',
        focused: 'INTERIOR_STORAGE_DEFAULTS_POLICY.defaultLowerShelfSlots',
        count: 1,
      }),
      Object.freeze({
        legacy: 'LIBRARY_PRESET_DIMENSIONS.defaultModuleDoorsCount',
        focused: 'LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultModuleDoorsCount',
        count: 2,
      }),
    ]),
    numericLiterals: Object.freeze([0, 0, 0, 0, 0, 0, 0, 0, 1]),
    functions: Object.freeze([
      Object.freeze({
        name: 'isRecord',
        params: Object.freeze([Object.freeze({ name: 'v', hasDefault: false })]),
        returnType: ':visUnknownRecord',
        exported: false,
      }),
      Object.freeze({
        name: 'cloneRecord',
        params: Object.freeze([Object.freeze({ name: 'src', hasDefault: false })]),
        returnType: ':T',
        exported: false,
      }),
      Object.freeze({
        name: 'toInt',
        params: Object.freeze([
          Object.freeze({ name: 'v', hasDefault: false }),
          Object.freeze({ name: 'defaultValue', hasDefault: false }),
        ]),
        returnType: ':number',
        exported: false,
      }),
      Object.freeze({
        name: 'normalizeLowerWidthDepthSpecialDims',
        params: Object.freeze([Object.freeze({ name: 'src', hasDefault: false })]),
        returnType: ':UnknownRecord|null',
        exported: false,
      }),
      Object.freeze({
        name: 'cloneModuleCustomData',
        params: Object.freeze([
          Object.freeze({ name: 'src', hasDefault: false }),
          Object.freeze({ name: 'defaultCellCount', hasDefault: false }),
        ]),
        returnType: ':ModuleCustomDataLike',
        exported: false,
      }),
      Object.freeze({
        name: 'modulesConfigurationKeyForStack',
        params: Object.freeze([Object.freeze({ name: 'stackKey', hasDefault: false })]),
        returnType: ":'modulesConfiguration'|'stackSplitLowerModulesConfiguration'",
        exported: true,
      }),
      Object.freeze({
        name: 'createDefaultTopModuleConfig',
        params: Object.freeze([Object.freeze({ name: 'i', hasDefault: false })]),
        returnType: ':NormalizedTopModuleConfigLike',
        exported: true,
      }),
      Object.freeze({
        name: 'normalizeTopModuleConfig',
        params: Object.freeze([
          Object.freeze({ name: 'src', hasDefault: false }),
          Object.freeze({ name: 'i', hasDefault: false }),
        ]),
        returnType: ':NormalizedTopModuleConfigLike',
        exported: true,
      }),
      Object.freeze({
        name: 'createDefaultLowerModuleConfig',
        params: Object.freeze([Object.freeze({ name: '_i', hasDefault: false })]),
        returnType: ':ModuleConfigLike',
        exported: true,
      }),
      Object.freeze({
        name: 'normalizeLowerModuleConfig',
        params: Object.freeze([
          Object.freeze({ name: 'src', hasDefault: false }),
          Object.freeze({ name: 'i', hasDefault: false }),
        ]),
        returnType: ':ModuleConfigLike',
        exported: true,
      }),
      Object.freeze({
        name: 'createDefaultModuleCustomData',
        params: Object.freeze([Object.freeze({ name: 'cellCount', hasDefault: true })]),
        returnType: ':ModuleCustomDataLike',
        exported: false,
      }),
    ]),
    returnShapes: Object.freeze({
      isRecord: Object.freeze([]),
      cloneRecord: Object.freeze([]),
      toInt: Object.freeze([]),
      normalizeLowerWidthDepthSpecialDims: Object.freeze([]),
      cloneModuleCustomData: Object.freeze([Object.freeze(['...base', 'shelves', 'rods', 'storage'])]),
      modulesConfigurationKeyForStack: Object.freeze([]),
      createDefaultTopModuleConfig: Object.freeze([
        Object.freeze(['layout', 'extDrawersCount', 'hasShoeDrawer', 'isCustom', 'customData', 'doors']),
      ]),
      normalizeTopModuleConfig: Object.freeze([
        Object.freeze([
          '...base',
          'layout',
          'extDrawersCount',
          'hasShoeDrawer',
          'isCustom',
          'customData',
          'doors',
        ]),
      ]),
      createDefaultLowerModuleConfig: Object.freeze([
        Object.freeze([
          'layout',
          'extDrawersCount',
          'hasShoeDrawer',
          'isCustom',
          'gridDivisions',
          'customData',
        ]),
      ]),
      normalizeLowerModuleConfig: Object.freeze([]),
      createDefaultModuleCustomData: Object.freeze([Object.freeze(['shelves', 'rods', 'storage'])]),
    }),
    variableShapes: Object.freeze({
      out: Object.freeze([]),
      cfg: Object.freeze([
        '...base',
        'layout',
        'extDrawersCount',
        'hasShoeDrawer',
        'isCustom',
        'gridDivisions',
        'customData',
      ]),
    }),
    nestedCustomDataShapes: Object.freeze([Object.freeze(['shelves', 'rods', 'storage'])]),
  }),
]);

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
  if (cleanSpecifier.startsWith('@/')) raw = path.join(root, 'esm', cleanSpecifier.slice(2));
  else if (cleanSpecifier.startsWith('.')) raw = path.resolve(path.dirname(fromFile), cleanSpecifier);
  else return null;

  const candidates = [raw];
  const extension = path.extname(raw).toLowerCase();
  if (!extension) {
    candidates.push(...sourceFileExtensions.map(sourceExtension => `${raw}${sourceExtension}`));
  } else {
    const stem = raw.slice(0, -extension.length);
    candidates.push(
      ...(runtimeExtensionCandidates[extension] ?? []).map(sourceExtension => `${stem}${sourceExtension}`)
    );
  }
  if (fs.existsSync(raw) && fs.statSync(raw).isDirectory()) {
    candidates.push(
      ...sourceFileExtensions.map(sourceExtension => path.join(raw, `index${sourceExtension}`))
    );
  }
  const resolved = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  return resolved ? canonicalModuleTarget(resolved) : null;
}

function subtreeContainsFocusedOwner(node) {
  let found = false;
  walkAst(node, child => {
    const name = identifierName(child);
    const value = memberPath(child);
    if (
      focusedOwnerSymbols.has(name) ||
      [...focusedOwnerSymbols].some(symbol => value?.startsWith(`${symbol}.`))
    ) {
      found = true;
    }
  });
  return found;
}

function inspectOwnershipViolations(file, source, consumer) {
  const violations = [];
  const analysis = analyzeModuleDependencies(file, source);
  const facadeTarget = canonicalModuleTarget(path.join(root, facadeRel));
  const publicDimensionsTarget = canonicalModuleTarget(path.join(root, publicDimensionsRel));
  const expectedByTarget = new Map(
    consumer.imports.map(entry => [canonicalModuleTarget(path.join(root, entry.ownerRel)), entry])
  );

  for (const dependency of analysis.imports) {
    const target = resolveModuleTarget(file, dependency.specifier);
    if (target === facadeTarget) {
      violations.push({ kind: 'legacy-facade', syntax: dependency.syntax });
      continue;
    }
    if (target === publicDimensionsTarget) {
      violations.push({ kind: 'public-dimensions-barrel', syntax: dependency.syntax });
      continue;
    }
    if (dependency.syntax === 'dynamic-import') {
      violations.push({ kind: 'dynamic-import', specifier: dependency.specifier });
    }
    if (dependency.bindings.some(binding => binding.importedName === '*')) {
      violations.push({ kind: 'namespace-import', specifier: dependency.specifier });
    }
    for (const symbol of dependency.importedSymbols) {
      if (legacySymbols.has(symbol)) violations.push({ kind: 'legacy-symbol-import', symbol });
      if (aggregateOwnerSymbols.has(symbol)) violations.push({ kind: 'aggregate-owner', symbol });
      if (focusedOwnerSymbols.has(symbol) && !expectedByTarget.has(target)) {
        violations.push({ kind: 'owner-bridge-import', symbol, specifier: dependency.specifier });
      }
    }

    const expected = expectedByTarget.get(target);
    if (!expected) continue;
    const validBindings =
      dependency.bindings.length === expected.symbols.length &&
      dependency.bindings.every(
        (binding, index) =>
          binding.importedName === expected.symbols[index] &&
          binding.localName === expected.symbols[index] &&
          binding.exportedName === null
      );
    if (
      dependency.specifier !== expected.specifier ||
      dependency.kind !== 'value' ||
      dependency.syntax !== 'static-import' ||
      stableJson(dependency.importedSymbols) !== stableJson(expected.symbols) ||
      dependency.exportedSymbols.length !== 0 ||
      !validBindings
    ) {
      violations.push({
        kind: 'focused-import-shape',
        owner: expected.ownerRel,
        specifier: dependency.specifier,
      });
    }
  }

  const sourceFile = createSourceFile(file, source);
  walkAst(sourceFile, node => {
    const name = identifierName(node);
    if (legacySymbols.has(name)) violations.push({ kind: 'legacy-symbol-use', symbol: name });
    if (aggregateOwnerSymbols.has(name)) {
      violations.push({ kind: 'aggregate-owner-use', symbol: name });
    }

    if (node?.type === 'VariableDeclarator') {
      const localName = identifierName(node.id);
      const ownerName = identifierName(node.init);
      if (focusedOwnerSymbols.has(ownerName)) {
        violations.push({ kind: 'owner-object-alias', localName, ownerName });
      }
      if (
        node.init?.type === 'ObjectExpression' &&
        subtreeContainsFocusedOwner(node.init) &&
        ['defaults', 'libraryPreset', 'storage'].includes(localName)
      ) {
        violations.push({ kind: 'local-aggregate', localName });
      }
    }

    if (node?.type === 'ObjectExpression') {
      for (const property of node.properties ?? []) {
        if (property?.type !== 'Property') continue;
        const key = identifierName(property.key);
        const value = identifierName(property.value);
        if (
          (['defaults', 'libraryPreset', 'storage'].includes(key) &&
            subtreeContainsFocusedOwner(property.value)) ||
          focusedOwnerSymbols.has(value)
        ) {
          violations.push({ kind: 'local-aggregate', key });
        }
      }
    }
    if (node?.type === 'SpreadElement' && subtreeContainsFocusedOwner(node.argument)) {
      violations.push({ kind: 'owner-spread' });
    }
    if (node?.type === 'CallExpression') {
      const callee = memberPath(node.callee) ?? identifierName(node.callee);
      if (
        ['Object.assign', 'Object.freeze', 'structuredClone'].includes(callee) &&
        (node.arguments ?? []).some(subtreeContainsFocusedOwner)
      ) {
        violations.push({ kind: 'owner-wrapper', callee });
      }
    }
  });

  return { analysis, sourceFile, violations };
}

function parameterFacts(node) {
  if (node?.type === 'AssignmentPattern') {
    return { name: identifierName(node.left), hasDefault: true };
  }
  return { name: identifierName(node), hasDefault: false };
}

function objectKeys(node) {
  return (node?.properties ?? []).map(property =>
    property?.type === 'SpreadElement'
      ? `...${identifierName(property.argument) ?? memberPath(property.argument)}`
      : identifierName(property.key)
  );
}

function sourceFacts(rel) {
  const source = read(rel);
  const sourceFile = createSourceFile(rel, source);
  const memberCounts = new Map();
  const numericLiterals = [];
  const functions = [];
  const returnShapes = {};
  const variableShapes = {};
  const nestedCustomDataShapes = [];

  walkAst(sourceFile, node => {
    if (node?.type === 'MemberExpression') {
      const value = memberPath(node);
      if (value) memberCounts.set(value, (memberCounts.get(value) ?? 0) + 1);
    }
    if (node?.type === 'Literal' && typeof node.value === 'number') {
      numericLiterals.push(node.value);
    }
    if (node?.type === 'VariableDeclarator' && node.init?.type === 'ObjectExpression') {
      const name = identifierName(node.id);
      if (name) variableShapes[name] = objectKeys(node.init);
    }
    if (
      node?.type === 'Property' &&
      identifierName(node.key) === 'customData' &&
      node.value?.type === 'ObjectExpression'
    ) {
      nestedCustomDataShapes.push(objectKeys(node.value));
    }
    if (node?.type !== 'FunctionDeclaration') return;
    const name = identifierName(node.id);
    functions.push({
      name,
      params: node.params.map(parameterFacts),
      returnType: source.slice(node.returnType.start, node.returnType.end).replaceAll(/\s/gu, ''),
      exported: node.parent?.type === 'ExportNamedDeclaration',
    });
    const shapes = [];
    walkAst(node.body, child => {
      if (child?.type === 'ReturnStatement' && child.argument?.type === 'ObjectExpression') {
        shapes.push(objectKeys(child.argument));
      }
    });
    returnShapes[name] = shapes;
  });

  numericLiterals.sort((left, right) => left - right);
  return {
    source,
    sourceFile,
    memberCounts,
    numericLiterals,
    functions,
    returnShapes,
    variableShapes,
    nestedCustomDataShapes,
  };
}

test('Modules Configuration and Stack Split use exactly one composition owner per feature consumer', () => {
  assert.deepEqual(
    consumers.map(consumer => consumer.rel),
    [
      'esm/native/features/modules_configuration/module_defaults.ts',
      'esm/native/features/stack_split/module_config.ts',
    ]
  );

  for (const consumer of consumers) {
    const absolute = path.join(root, consumer.rel);
    const source = read(consumer.rel);
    const inspection = inspectOwnershipViolations(absolute, source, consumer);
    assert.deepEqual(inspection.violations, [], consumer.rel);
    assert.deepEqual(inspection.analysis.unresolvedDynamicImports, [], consumer.rel);
    assert.deepEqual(inspection.analysis.forbiddenModuleSyntax, [], consumer.rel);

    const focusedImports = inspection.analysis.imports.filter(dependency =>
      consumer.imports.some(
        expected =>
          resolveModuleTarget(absolute, dependency.specifier) ===
          canonicalModuleTarget(path.join(root, expected.ownerRel))
      )
    );
    assert.equal(focusedImports.length, 1, consumer.rel);
    assert.deepEqual(
      focusedImports.map(({ specifier, kind, syntax, importedSymbols, exportedSymbols, bindings }) => ({
        specifier,
        kind,
        syntax,
        importedSymbols,
        exportedSymbols,
        bindings,
      })),
      consumer.imports.map(expected => ({
        specifier: expected.specifier,
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: [...expected.symbols],
        exportedSymbols: [],
        bindings: expected.symbols.map(symbol => ({
          importedName: symbol,
          localName: symbol,
          exportedName: null,
        })),
      })),
      consumer.rel
    );
    assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u, consumer.rel);
    assert.doesNotMatch(
      source,
      /\b(?:INTERIOR_FITTINGS_DIMENSIONS|LIBRARY_PRESET_DIMENSIONS)\b/u,
      consumer.rel
    );
    assert.doesNotMatch(
      source,
      /\b(?:INTERIOR_FITTINGS_POLICY|INTERIOR_STORAGE_POLICY|LIBRARY_PRESET_POLICY)\b/u,
      consumer.rel
    );
  }
});

test('The feature pair maps every legacy field to its exact focused owner without recomposition', () => {
  for (const consumer of consumers) {
    const facts = sourceFacts(consumer.rel);
    const expectedFocusedMembers = Object.fromEntries(
      consumer.mappings.map(mapping => [mapping.focused, mapping.count])
    );
    const actualFocusedMembers = Object.fromEntries(
      [...facts.memberCounts]
        .filter(([value]) => [...focusedOwnerSymbols].some(symbol => value.startsWith(`${symbol}.`)))
        .sort(([left], [right]) => left.localeCompare(right))
    );
    assert.deepEqual(actualFocusedMembers, expectedFocusedMembers, consumer.rel);
    for (const mapping of consumer.mappings) {
      assert.equal(
        facts.memberCounts.get(mapping.focused),
        mapping.count,
        `${consumer.rel}: ${mapping.legacy} -> ${mapping.focused}`
      );
      assert.equal(facts.memberCounts.has(mapping.legacy), false, `${consumer.rel}: ${mapping.legacy}`);
    }
  }

  const modulesFacts = sourceFacts(consumers[0].rel);
  const modulesDefault = modulesFacts.sourceFile.body.find(
    node =>
      node?.type === 'ExportNamedDeclaration' &&
      node.declaration?.type === 'VariableDeclaration' &&
      identifierName(node.declaration.declarations?.[0]?.id) === 'DEFAULT_MODULE_CELL_COUNT'
  );
  assert.equal(
    memberPath(modulesDefault?.declaration?.declarations?.[0]?.init),
    'INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault'
  );
  assert.match(modulesFacts.source, /: LIBRARY_PRESET_MODULE_DEFAULTS_POLICY\.defaultModuleDoorsCount;/u);

  const stackSource = sourceFacts(consumers[1].rel).source;
  assert.match(
    stackSource,
    /shelves: Array\.from\(INTERIOR_STORAGE_DEFAULTS_POLICY\.defaultLowerShelfSlots\)/u
  );
  assert.match(
    stackSource,
    /rods: Array\.from\(\{ length: INTERIOR_STORAGE_GRID_POLICY\.gridDivisionsDefault \}, \(\) => false\)/u
  );
  assert.match(stackSource, /Math\.max\(\s*1,/u);
  assert.match(stackSource, /delete cfg\.specialDims;/u);
  assert.match(stackSource, /delete cfg\.savedDims;/u);
});

test('The feature pair preserves numeric literals, signatures, return shapes, and object-shape contracts', () => {
  for (const consumer of consumers) {
    const facts = sourceFacts(consumer.rel);
    assert.deepEqual(facts.numericLiterals, consumer.numericLiterals, `${consumer.rel} numeric literals`);
    assert.deepEqual(facts.functions, consumer.functions, `${consumer.rel} function signatures`);
    assert.deepEqual(facts.returnShapes, consumer.returnShapes, `${consumer.rel} return shapes`);
    assert.deepEqual(facts.variableShapes, consumer.variableShapes, `${consumer.rel} variable shapes`);
    assert.deepEqual(
      facts.nestedCustomDataShapes,
      consumer.nestedCustomDataShapes,
      `${consumer.rel} nested customData shapes`
    );
  }
});
