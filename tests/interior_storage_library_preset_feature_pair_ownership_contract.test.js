import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const storageOwnerRel = 'esm/shared/dimensions/interior_storage_policy.ts';
const libraryOwnerRel = 'esm/shared/dimensions/library_preset_policy.ts';
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
const semanticMemberPaths = new Map([
  ['INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault', 'interiorStorage.gridDivisionsDefault'],
  ['INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault', 'interiorStorage.gridDivisionsDefault'],
  ['INTERIOR_FITTINGS_DIMENSIONS.storage.defaultLowerShelfSlots', 'interiorStorage.defaultLowerShelfSlots'],
  ['INTERIOR_STORAGE_DEFAULTS_POLICY.defaultLowerShelfSlots', 'interiorStorage.defaultLowerShelfSlots'],
  ['LIBRARY_PRESET_DIMENSIONS.defaultModuleDoorsCount', 'libraryPreset.defaultModuleDoorsCount'],
  ['LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultModuleDoorsCount', 'libraryPreset.defaultModuleDoorsCount'],
]);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const consumers = Object.freeze([
  Object.freeze({
    rel: 'esm/native/features/modules_configuration/module_defaults.ts',
    imports: Object.freeze([
      Object.freeze({
        specifier: '../../../shared/dimensions/interior_storage_policy.js',
        ownerRel: storageOwnerRel,
        symbols: Object.freeze(['INTERIOR_STORAGE_GRID_POLICY']),
      }),
      Object.freeze({
        specifier: '../../../shared/dimensions/library_preset_policy.js',
        ownerRel: libraryOwnerRel,
        symbols: Object.freeze(['LIBRARY_PRESET_MODULE_DEFAULTS_POLICY']),
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
    numericHash: '45851a4bf060e4f518fa118bdb445c52d1277513c84c117a262ddfcea1f11a89',
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
    functionHashes: Object.freeze({
      createDefaultModuleCustomData: '29165c9cb526b5cb5483abf7e3d7d46afba8134ba00e74f339bb5191336728b0',
      createDefaultTopModuleConfig: '25eac1a887e22dbfb76562f241c5b62761e592d6578f8316cb9d105ca0b1726f',
    }),
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
        specifier: '../../../shared/dimensions/interior_storage_policy.js',
        ownerRel: storageOwnerRel,
        symbols: Object.freeze(['INTERIOR_STORAGE_DEFAULTS_POLICY', 'INTERIOR_STORAGE_GRID_POLICY']),
      }),
      Object.freeze({
        specifier: '../../../shared/dimensions/library_preset_policy.js',
        ownerRel: libraryOwnerRel,
        symbols: Object.freeze(['LIBRARY_PRESET_MODULE_DEFAULTS_POLICY']),
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
    numericHash: 'dddb8ee3a90d7afafa7729023549a5b157aebed1c1088bb60eda4421ee3ee017',
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
    functionHashes: Object.freeze({
      isRecord: '935a666ed95bea045ab39daefba9ae13927f9b303b4b6df0564b9df25f121de6',
      cloneRecord: 'eae1ce01f4d5000071c80e4095a3ea65ec125e5f6ee4fe388bd4858712a71d4f',
      toInt: 'f0fe1581557ec38fd7bc3d0a2526c4da06624bd0e752c118b0419860e7b858d6',
      normalizeLowerWidthDepthSpecialDims: 'ce2bf5795590232f4e53f395e3d9832a6bbab05e3f50d80a0dc210e2018bdaae',
      cloneModuleCustomData: '4fb4a1af243498ad4478c9d25bce1322c2142f65e2f3a70b87734419750ef79c',
      modulesConfigurationKeyForStack: 'db29bde0f5368a61db350682fe17879f6369ef87fad44dcdf133788c85373db7',
      createDefaultTopModuleConfig: '6cb2f4d9429b2851136b0a67c25f8f5b486edc5c6895d5bc9ae63b48caf17d17',
      normalizeTopModuleConfig: '8a9c7b58a27bb316a5f31725f16ff57b1d571363423b117cd20546b5c6f0ba6a',
      createDefaultLowerModuleConfig: 'ed9ff1a43270202c38209a4c7937eaa5fd2854c7a21890cf5509f31ac0e6ef14',
      normalizeLowerModuleConfig: '05ee500f57912ea099f43655cab89911e2dfd9c152d2716058c72a400a542650',
      createDefaultModuleCustomData: 'bba6a00f02fbf328b10e2260193f5b31f60f6dca77f33a313d5fa2100c3fa50c',
    }),
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

const semanticSha256 = value => createHash('sha256').update(stableJson(value)).digest('hex');

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

function canonicalSemanticAst(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return value;
  const semanticPath = value.type === 'MemberExpression' ? semanticMemberPaths.get(memberPath(value)) : null;
  if (semanticPath) return { type: 'SemanticMember', path: semanticPath };
  if (seen.has(value)) return undefined;
  seen.add(value);
  if (Array.isArray(value)) return value.map(item => canonicalSemanticAst(item, seen));
  const result = {};
  for (const key of Object.keys(value).sort()) {
    if (omittedAstKeys.has(key)) continue;
    const next = canonicalSemanticAst(value[key], seen);
    if (next !== undefined) result[key] = next;
  }
  return result;
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
  const functionHashes = {};
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
    functionHashes[name] = semanticSha256(canonicalSemanticAst(node));
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
    numericHash: createHash('sha256').update(JSON.stringify(numericLiterals)).digest('hex'),
    functions,
    functionHashes,
    returnShapes,
    variableShapes,
    nestedCustomDataShapes,
  };
}

const removedImport = Object.freeze({
  toFile: facadeRel,
  kind: 'value',
  importedSymbols: ['INTERIOR_FITTINGS_DIMENSIONS', 'LIBRARY_PRESET_DIMENSIONS'],
  syntax: 'static-import',
});

function expectedEntry({ fromFile, storageSymbols, reason, removalCondition }) {
  return {
    from: 'features',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-26',
    reviewBy: '2026-10-18',
    fromFile,
    companionImport: {
      toFile: libraryOwnerRel,
      kind: 'value',
      importedSymbols: ['LIBRARY_PRESET_MODULE_DEFAULTS_POLICY'],
      syntax: 'static-import',
    },
    removedImport,
    addedImport: {
      toFile: storageOwnerRel,
      kind: 'value',
      importedSymbols: storageSymbols,
      syntax: 'static-import',
    },
    reason,
    removalCondition,
  };
}

const expectedEntries = Object.freeze([
  expectedEntry({
    fromFile: consumers[0].rel,
    storageSymbols: ['INTERIOR_STORAGE_GRID_POLICY'],
    reason:
      'The Modules Configuration feature consumer replaces one combined legacy facade statement with the focused Library Preset Module Defaults policy plus the focused Interior Storage Grid policy on the existing features to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Modules Configuration composition seam eliminates the extra Interior Storage statement without reintroducing the legacy facade.',
  }),
  expectedEntry({
    fromFile: consumers[1].rel,
    storageSymbols: ['INTERIOR_STORAGE_DEFAULTS_POLICY', 'INTERIOR_STORAGE_GRID_POLICY'],
    reason:
      'The Stack Split feature consumer replaces one combined legacy facade statement with the focused Library Preset Module Defaults policy plus the focused Interior Storage Defaults/Grid policies on the existing features to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Stack Split composition seam eliminates the extra Interior Storage statement without reintroducing the legacy facade.',
  }),
]);

const HISTORICAL_LEDGER_PREFIX_159_HASH = '7bb983429d5ea9cf6c8f4e6f44f8637a0d2841866d09bf9ddc8515dd230e16a8';
const HISTORICAL_LEDGER_PREFIX_161_HASH = 'acf971df9f7a96ec701270ed81b312863814a092835ce91a9c118779aca5f471';

function assertHistoricalFeaturePairLedger(migrationBudgets) {
  assert.ok(migrationBudgets.length >= 161);
  assert.equal(semanticSha256(migrationBudgets.slice(0, 159)), HISTORICAL_LEDGER_PREFIX_159_HASH);
  assert.deepEqual(migrationBudgets.slice(159, 161), expectedEntries);
  assert.equal(semanticSha256(migrationBudgets.slice(0, 161)), HISTORICAL_LEDGER_PREFIX_161_HASH);
}

test('Modules Configuration and Stack Split are exactly one two-file focused-owner migration pair', () => {
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
    assert.equal(focusedImports.length, 2, consumer.rel);
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

test('The feature pair preserves numeric literals, signatures, return shapes, and semantic function ASTs', () => {
  for (const consumer of consumers) {
    const facts = sourceFacts(consumer.rel);
    assert.equal(facts.numericHash, consumer.numericHash, `${consumer.rel} numeric literals`);
    assert.deepEqual(facts.functions, consumer.functions, `${consumer.rel} function signatures`);
    assert.deepEqual(facts.functionHashes, consumer.functionHashes, `${consumer.rel} semantic function AST`);
    assert.deepEqual(facts.returnShapes, consumer.returnShapes, `${consumer.rel} return shapes`);
    assert.deepEqual(facts.variableShapes, consumer.variableShapes, `${consumer.rel} variable shapes`);
    assert.deepEqual(
      facts.nestedCustomDataShapes,
      consumer.nestedCustomDataShapes,
      `${consumer.rel} nested customData shapes`
    );
  }
});

test('The feature pair rejects facade, aggregates, aliases, barrels, bridges, wrappers, and recomposition', () => {
  const modules = consumers[0];
  const cases = [
    {
      name: 'legacy facade import',
      expectedKind: 'legacy-facade',
      source:
        "import { INTERIOR_FITTINGS_DIMENSIONS, LIBRARY_PRESET_DIMENSIONS } from '../../../shared/wardrobe_dimension_tokens_shared.js';\nexport const value = [INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault, LIBRARY_PRESET_DIMENSIONS.defaultModuleDoorsCount];",
    },
    {
      name: 'focused owner alias',
      expectedKind: 'focused-import-shape',
      source:
        "import { INTERIOR_STORAGE_GRID_POLICY as grid } from '../../../shared/dimensions/interior_storage_policy.js';\nexport const value = grid.gridDivisionsDefault;",
    },
    {
      name: 'Interior Storage aggregate',
      expectedKind: 'aggregate-owner',
      source:
        "import { INTERIOR_STORAGE_POLICY } from '../../../shared/dimensions/interior_storage_policy.js';\nexport const value = INTERIOR_STORAGE_POLICY.gridDivisionsDefault;",
    },
    {
      name: 'Interior Fittings aggregate',
      expectedKind: 'aggregate-owner',
      source:
        "import { INTERIOR_FITTINGS_POLICY } from '../../../shared/dimensions/interior_fittings_policy.js';\nexport const value = INTERIOR_FITTINGS_POLICY.storage;",
    },
    {
      name: 'Library Preset aggregate',
      expectedKind: 'aggregate-owner',
      source:
        "import { LIBRARY_PRESET_POLICY } from '../../../shared/dimensions/library_preset_policy.js';\nexport const value = LIBRARY_PRESET_POLICY.defaultModuleDoorsCount;",
    },
    {
      name: 'public dimensions namespace',
      expectedKind: 'public-dimensions-barrel',
      source:
        "import * as dimensions from '../dimensions/index.js';\nexport const value = dimensions.LIBRARY_PRESET_DIMENSIONS;",
    },
    {
      name: 'extensionless compatibility import',
      expectedKind: 'legacy-facade',
      source:
        "import { LIBRARY_PRESET_DIMENSIONS } from '../../../shared/wardrobe_dimension_tokens_shared';\nexport const value = LIBRARY_PRESET_DIMENSIONS.defaultModuleDoorsCount;",
    },
    {
      name: 'dynamic focused-owner import',
      expectedKind: 'dynamic-import',
      source: "export const policy = await import('../../../shared/dimensions/library_preset_policy.js');",
    },
    {
      name: 'indirect focused-owner bridge',
      expectedKind: 'owner-bridge-import',
      source:
        "import { LIBRARY_PRESET_MODULE_DEFAULTS_POLICY } from './library_preset_defaults_bridge.js';\nexport const value = LIBRARY_PRESET_MODULE_DEFAULTS_POLICY.defaultModuleDoorsCount;",
    },
    {
      name: 'local policy aggregate',
      expectedKind: 'local-aggregate',
      source:
        "import { INTERIOR_STORAGE_GRID_POLICY } from '../../../shared/dimensions/interior_storage_policy.js';\nimport { LIBRARY_PRESET_MODULE_DEFAULTS_POLICY } from '../../../shared/dimensions/library_preset_policy.js';\nconst defaults = { storage: INTERIOR_STORAGE_GRID_POLICY, libraryPreset: LIBRARY_PRESET_MODULE_DEFAULTS_POLICY };\nexport const value = defaults;",
    },
    {
      name: 'focused policy wrapper',
      expectedKind: 'owner-wrapper',
      source:
        "import { INTERIOR_STORAGE_GRID_POLICY } from '../../../shared/dimensions/interior_storage_policy.js';\nexport const defaults = Object.freeze({ storage: INTERIOR_STORAGE_GRID_POLICY });",
    },
  ];

  for (const probe of cases) {
    const inspection = inspectOwnershipViolations(path.join(root, modules.rel), probe.source, modules);
    assert.equal(
      inspection.violations.some(violation => violation.kind === probe.expectedKind),
      true,
      probe.name
    );
  }
});

test('The feature pair locks Prefix 159, exact Entries 160-161, and Prefix 161 without owning the current Ledger total', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.ok(baseline.migrationBudgets.length >= 161);
  assert.equal(semanticSha256(baseline.migrationBudgets.slice(0, 159)), HISTORICAL_LEDGER_PREFIX_159_HASH);
  assert.deepEqual(baseline.migrationBudgets.slice(159, 161), expectedEntries);
  assert.equal(semanticSha256(baseline.migrationBudgets.slice(0, 161)), HISTORICAL_LEDGER_PREFIX_161_HASH);
});

test('The historical feature-pair Ledger contract accepts a synthetic future Entry 162', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  const futureEntry = {
    ...structuredClone(baseline.migrationBudgets[160]),
    fromFile: 'esm/native/features/future_feature/module_config.ts',
    reason: 'Synthetic future migration entry appended after the historical feature-pair prefix.',
    removalCondition: 'Synthetic future removal condition.',
  };
  const withFutureEntry = [...structuredClone(baseline.migrationBudgets), futureEntry];

  assert.equal(withFutureEntry.length, 162);
  assert.equal(
    semanticSha256(withFutureEntry.slice(0, 161)),
    semanticSha256(baseline.migrationBudgets.slice(0, 161))
  );
  assert.deepEqual(withFutureEntry.slice(159, 161), expectedEntries);
  assert.doesNotThrow(() => assertHistoricalFeaturePairLedger(withFutureEntry));
});

test('The historical feature-pair Ledger contract rejects a synthetic Entry 160 mutation', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  const mutated = structuredClone(baseline.migrationBudgets);
  mutated[159].reason = `${mutated[159].reason} Synthetic mutation.`;

  assert.notEqual(semanticSha256(mutated.slice(0, 161)), HISTORICAL_LEDGER_PREFIX_161_HASH);
  assert.notDeepEqual(mutated.slice(159, 161), expectedEntries);
  assert.throws(() => assertHistoricalFeaturePairLedger(mutated));
});

test('The historical feature-pair Ledger contract rejects a synthetic Entry 161 mutation', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  const mutated = structuredClone(baseline.migrationBudgets);
  mutated[160].removalCondition = `${mutated[160].removalCondition} Synthetic mutation.`;

  assert.notEqual(semanticSha256(mutated.slice(0, 161)), HISTORICAL_LEDGER_PREFIX_161_HASH);
  assert.notDeepEqual(mutated.slice(159, 161), expectedEntries);
  assert.throws(() => assertHistoricalFeaturePairLedger(mutated));
});

test('The historical feature-pair Ledger contract detects a synthetic Prefix 159 mutation', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  const mutated = structuredClone(baseline.migrationBudgets);
  mutated[0].reason = `${mutated[0].reason} Synthetic mutation.`;

  assert.notEqual(semanticSha256(mutated.slice(0, 159)), HISTORICAL_LEDGER_PREFIX_159_HASH);
  assert.equal(semanticSha256(baseline.migrationBudgets.slice(0, 159)), HISTORICAL_LEDGER_PREFIX_159_HASH);
  assert.throws(() => assertHistoricalFeaturePairLedger(mutated));
});
