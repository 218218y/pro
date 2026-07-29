import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';
import { createTsRuntimeModuleLoader } from './_ts_runtime_module_loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyRel = 'esm/shared/dimensions/structure_tab_auto_width_policy.ts';
const ownerRel = 'esm/shared/dimensions/wardrobe_default_resolution_policy.ts';
const featureRel = 'esm/native/features/structure_tab_dimension_support.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const runtimeApiRel = 'esm/native/runtime/api.ts';
const servicesBaseRel = 'esm/native/services/api_runtime_base_surface.ts';
const servicesApiRel = 'esm/native/services/api.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const baselineRel = 'tools/wp_layer_baseline.json';
const ownerSpecifier = './wardrobe_default_resolution_policy.js';
const featurePolicySpecifier = '../../shared/dimensions/structure_tab_auto_width_policy.js';
const adapterFeatureSpecifier = '../../../features/structure_tab_dimension_support.js';
const policySymbol = 'STRUCTURE_TAB_AUTO_WIDTH_POLICY';
const functionNames = Object.freeze(['resolveAutoWidthForDoors', 'isAutoWidthForDoors']);
const prefix171 = '2fadcd1f9b416aefc7f79d4d074b52eac9e64dea5bc1dd35e486a843264a0088';
const prefix172 = '3ab71bc2e36c7c225c754defcd9734e2a62dd44a96139eea00d8d26e059add5f';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

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

function addViolation(violations, kind, detail) {
  violations.push(detail === undefined ? { kind } : { kind, detail });
}

function listSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(absolute);
    return entry.isFile() && /\.(?:[cm]?[jt]sx?)$/u.test(entry.name) ? [absolute] : [];
  });
}

function inspectPolicy(source, expectedOwnerSpecifier = ownerSpecifier) {
  const violations = [];
  let analysis;
  let exports;
  let sourceFile;
  try {
    analysis = analyzeModuleDependencies(policyRel, source);
    exports = collectNamedModuleExports(policyRel, source);
    sourceFile = createSourceFile(policyRel, source);
  } catch (error) {
    return [{ kind: 'policy-parse', detail: error.message }];
  }

  const [dependency] = analysis.imports;
  if (
    analysis.imports.length !== 1 ||
    dependency?.specifier !== expectedOwnerSpecifier ||
    dependency?.kind !== 'value' ||
    dependency?.syntax !== 'static-import' ||
    stableJson(dependency?.importedSymbols ?? []) !==
      stableJson(['isAutoWidthForDoors', 'resolveAutoWidthForDoors'])
  ) {
    addViolation(violations, 'policy-owner-dependency');
  }
  if (dependency?.bindings.some(binding => binding.importedName !== binding.localName)) {
    addViolation(violations, 'policy-owner-alias');
  }
  if (
    analysis.unresolvedDynamicImports.length ||
    analysis.forbiddenModuleSyntax.length ||
    analysis.imports.some(candidate =>
      ['dynamic-import', 'static-namespace-import'].includes(candidate.syntax)
    )
  ) {
    addViolation(violations, 'policy-forbidden-module-syntax');
  }
  if (
    exports.length !== 1 ||
    exports[0]?.source !== null ||
    exports[0]?.kind !== 'value' ||
    exports[0]?.exportedName !== policySymbol ||
    exports[0]?.localName !== policySymbol
  ) {
    addViolation(violations, 'policy-export-surface');
  }

  const exportStatement = sourceFile.body[1];
  const declaration = exportStatement?.declaration;
  const [declarator] = declaration?.declarations ?? [];
  const init = declarator?.init;
  const object = init?.arguments?.[0];
  if (
    sourceFile.body.length !== 2 ||
    sourceFile.body[0]?.type !== 'ImportDeclaration' ||
    exportStatement?.type !== 'ExportNamedDeclaration' ||
    declaration?.type !== 'VariableDeclaration' ||
    declaration.kind !== 'const' ||
    declaration.declarations.length !== 1 ||
    declarator?.id?.type !== 'Identifier' ||
    declarator.id.name !== policySymbol ||
    init?.type !== 'CallExpression' ||
    init.optional ||
    init.callee?.type !== 'MemberExpression' ||
    init.callee.computed ||
    init.callee.object?.type !== 'Identifier' ||
    init.callee.object.name !== 'Object' ||
    init.callee.property?.type !== 'Identifier' ||
    init.callee.property.name !== 'freeze' ||
    init.arguments.length !== 1 ||
    object?.type !== 'ObjectExpression'
  ) {
    addViolation(violations, 'policy-frozen-object');
  }
  const properties = object?.properties ?? [];
  if (
    properties.length !== 2 ||
    stableJson(properties.map(property => property.key?.name)) !== stableJson(functionNames) ||
    properties.some(
      (property, index) =>
        property.type !== 'Property' ||
        property.kind !== 'init' ||
        property.method ||
        property.computed ||
        !property.shorthand ||
        property.value?.type !== 'Identifier' ||
        property.value.name !== functionNames[index]
    )
  ) {
    addViolation(violations, 'policy-direct-key-identities');
  }

  let freezeCalls = 0;
  let runtimeLiterals = 0;
  let functionNodes = 0;
  walkAst(sourceFile, node => {
    if (
      node.type === 'CallExpression' &&
      node.callee?.type === 'MemberExpression' &&
      node.callee.object?.type === 'Identifier' &&
      node.callee.object.name === 'Object' &&
      node.callee.property?.type === 'Identifier' &&
      node.callee.property.name === 'freeze'
    ) {
      freezeCalls += 1;
    }
    if (['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node.type)) {
      functionNodes += 1;
    }
    if (node.type === 'Literal') {
      for (let current = node.parent; current; current = current.parent) {
        if (current.type === 'ImportDeclaration') return;
      }
      runtimeLiterals += 1;
    }
  });
  if (freezeCalls !== 1 || runtimeLiterals !== 0 || functionNodes !== 0) {
    addViolation(violations, 'policy-wrapper-literal-or-extra-freeze', {
      freezeCalls,
      runtimeLiterals,
      functionNodes,
    });
  }
  return violations;
}

function productionEntries(overrides = {}) {
  return listSourceFiles(path.join(root, 'esm')).map(file => {
    const rel = path.relative(root, file).replaceAll('\\', '/');
    return [rel, Object.hasOwn(overrides, rel) ? overrides[rel] : fs.readFileSync(file, 'utf8')];
  });
}

function inspectPolicyRoute(entries) {
  const violations = [];
  const consumers = [];
  for (const [rel, source] of entries) {
    const dependencies = analyzeModuleDependencies(rel, source).imports.filter(
      dependency =>
        dependency.specifier.includes('structure_tab_auto_width_policy') ||
        dependency.importedSymbols.includes(policySymbol)
    );
    for (const dependency of dependencies) {
      consumers.push({
        file: rel,
        specifier: dependency.specifier,
        kind: dependency.kind,
        syntax: dependency.syntax,
        symbols: dependency.importedSymbols,
      });
    }
  }
  const expected = [
    {
      file: featureRel,
      specifier: featurePolicySpecifier,
      kind: 'value',
      syntax: 'static-import',
      symbols: [policySymbol],
    },
  ];
  if (stableJson(consumers) !== stableJson(expected)) {
    addViolation(violations, 'policy-consumer-inventory', consumers);
  }
  for (const rel of [facadeRel, runtimeApiRel, servicesBaseRel, servicesApiRel, publicDimensionsRel]) {
    const source = entries.find(([candidate]) => candidate === rel)?.[1] ?? '';
    if (source.includes(policySymbol) || source.includes('structure_tab_auto_width_policy')) {
      addViolation(violations, 'policy-public-export', rel);
    }
  }
  return violations;
}

function expectedEntry172() {
  return {
    from: 'features',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-29',
    reviewBy: '2026-10-18',
    fromFile: featureRel,
    companionImport: {
      toFile: ownerRel,
      kind: 'value',
      importedSymbols: ['getDefaultDepthForWardrobeType'],
      syntax: 'static-import',
    },
    removedImport: {
      toFile: facadeRel,
      kind: 'value',
      importedSymbols: ['isAutoWidthForDoors', 'resolveAutoWidthForDoors'],
      syntax: 'static-import',
    },
    addedImport: {
      toFile: policyRel,
      kind: 'value',
      importedSymbols: [policySymbol],
      syntax: 'static-import',
    },
    reason:
      'The Structure Tab Dimension Support feature boundary replaces the auto-width function group from the legacy shared facade route with the private Structure Tab Auto Width composition policy alongside the canonical focused default-depth resolver, without exposing shared ownership or function references to UI.',
    removalCondition:
      'Remove this entry when a reviewed Structure Tab Dimension Support composition seam eliminates the extra Structure Tab Auto Width policy statement without reintroducing the legacy facade, a direct shared owner import in UI, escaped function references, copied values, or a general dimension barrel.',
  };
}

function inspectLedger(entries) {
  const violations = [];
  if (entries.length < 172) addViolation(violations, 'ledger-history-length');
  const actualPrefix171 = semanticSha256(entries.slice(0, 171));
  if (actualPrefix171 !== prefix171) addViolation(violations, 'prefix-171', actualPrefix171);
  if (stableJson(entries[171]) !== stableJson(expectedEntry172())) {
    addViolation(violations, 'entry-172');
  }
  const actualPrefix172 = semanticSha256(entries.slice(0, 172));
  if (actualPrefix172 !== prefix172) addViolation(violations, 'prefix-172', actualPrefix172);
  return violations;
}

function assertRejected(violations, kind, label) {
  assert.equal(
    violations.some(violation => violation.kind === kind),
    true,
    `${label}: ${JSON.stringify(violations)}`
  );
}

test('private Structure Tab auto-width policy has one exact owner import and frozen identity surface', () => {
  assert.deepEqual(inspectPolicy(read(policyRel)), []);
  assert.deepEqual(inspectPolicyRoute(productionEntries()), []);

  const loader = createTsRuntimeModuleLoader();
  const owner = loader.load(path.join(root, ownerRel));
  const policy = loader.load(path.join(root, policyRel))[policySymbol];
  assert.equal(Object.isFrozen(policy), true);
  assert.deepEqual(Object.keys(policy), functionNames);
  for (const name of functionNames) assert.strictEqual(policy[name], owner[name], name);

  const feature = createTsRuntimeModuleLoader({
    mock: specifier => {
      if (specifier === featurePolicySpecifier) return { [policySymbol]: policy };
      return {};
    },
  }).load(path.join(root, featureRel));
  for (const name of functionNames) assert.strictEqual(feature[name], owner[name], name);

  const adapter = createTsRuntimeModuleLoader({
    mock: specifier => (specifier === adapterFeatureSpecifier ? feature : undefined),
  }).load(path.join(root, 'esm/native/ui/react/tabs/structure_tab_dimension_defaults.ts'));
  for (const name of functionNames) assert.strictEqual(adapter[name], owner[name], name);
});

test('Entry 172 is exact, preserves Prefix 171, and accepts append-safe Entry 173', () => {
  const entries = JSON.parse(read(baselineRel)).migrationBudgets;
  assert.deepEqual(inspectLedger(entries), []);
  const futureEntry173 = {
    ...entries[171],
    fromFile: 'esm/native/features/future_append_safe_dimension_consumer.ts',
  };
  assert.deepEqual(inspectLedger([...entries, futureEntry173]), []);
});

test('policy mutations reject wrappers, bind, aliases, key drift, owner drift, and public export', () => {
  const source = read(policyRel);
  assertRejected(
    inspectPolicy(
      source.replace(
        'resolveAutoWidthForDoors,\n  isAutoWidthForDoors,',
        'resolveAutoWidthForDoors: (...args) => resolveAutoWidthForDoors(...args),\n  isAutoWidthForDoors,'
      )
    ),
    'policy-direct-key-identities',
    'wrapper'
  );
  assertRejected(
    inspectPolicy(
      source.replace(
        'resolveAutoWidthForDoors,\n  isAutoWidthForDoors,',
        'resolveAutoWidthForDoors: resolveAutoWidthForDoors.bind(null),\n  isAutoWidthForDoors,'
      )
    ),
    'policy-direct-key-identities',
    'bind'
  );
  assertRejected(
    inspectPolicy(source.replace('isAutoWidthForDoors,', 'isAutoWidthForDoors as autoWidthCheck,')),
    'policy-owner-alias',
    'alias'
  );
  assertRejected(
    inspectPolicy(
      source.replace(
        'isAutoWidthForDoors,\n});',
        'isAutoWidthForDoors,\n  extra: resolveAutoWidthForDoors,\n});'
      )
    ),
    'policy-direct-key-identities',
    'extra key'
  );
  assertRejected(
    inspectPolicy(source.replace('  isAutoWidthForDoors,\n});', '});')),
    'policy-direct-key-identities',
    'missing key'
  );
  assertRejected(
    inspectPolicy(source.replace(ownerSpecifier, './wardrobe_defaults.js')),
    'policy-owner-dependency',
    'wrong owner'
  );

  const publicBridge = `${read(publicDimensionsRel)}\nexport { ${policySymbol} } from '../../../shared/dimensions/structure_tab_auto_width_policy.js';\n`;
  assertRejected(
    inspectPolicyRoute(productionEntries({ [publicDimensionsRel]: publicBridge })),
    'policy-public-export',
    'public export'
  );
});

test('Entry 172 mutation changes its owned entry while unrelated future entries remain append-safe', () => {
  const entries = JSON.parse(read(baselineRel)).migrationBudgets;
  const mutated = structuredClone(entries);
  mutated[171].addedImport.importedSymbols = ['MUTATED_POLICY'];
  assertRejected(inspectLedger(mutated), 'entry-172', 'Entry 172');
});
