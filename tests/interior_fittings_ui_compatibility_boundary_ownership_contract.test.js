import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  analyzeModuleDependencies,
  buildLayerContractProposal,
  collectLayerContractGraph,
  collectNamedModuleExports,
  evaluateLayerContract,
} from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const boundaryRel = 'esm/native/features/interior_tab_defaults.ts';
const uiRel = 'esm/native/ui/react/tabs/interior_tab_local_state_shared.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const ownerRel = 'esm/shared/dimensions/interior_fittings_policy.ts';
const unitsRel = 'esm/shared/dimensions/units.ts';
const boundarySpecifier = '../../../features/interior_tab_defaults.js';
const ownerSpecifier = '../../shared/dimensions/interior_fittings_policy.js';
const unitsSpecifier = '../../shared/dimensions/units.js';
const depthSymbol = 'DEFAULT_SKETCH_SHELF_DEPTH_EDIT_CM';
const ownerSymbol = 'INTERIOR_SHELF_GEOMETRY_POLICY';
const compatibilitySymbol = 'INTERIOR_FITTINGS_DIMENSIONS';
const expectedUiSemanticFingerprint = '79d940c75bcbb0ab6a3cffad85a29fca5736b267aac082074f86fdf655939dfa';
const expectedUiLiteralInventoryFingerprint =
  '3727d19fe3ae740e7f6336c07e0ac5d02ad839d82bc686ba309763e70bdd732b';
const prefix163Sha256 = '8c4c04e56a8b991d81537127adc69c5dc42b4e7ed3de4fe81258a67b01ad8341';
const prefix164Sha256 = '55c2e7abbae3cdba828c41a48ed759d457079d0021fe21fc2a1ebf7a08e2e231';
const prefix165Sha256 = '3b685a291fdbfa4ae0fd66b8b4744116598a81e236e8f449facc89714802a807';
const sourceExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const expectedBoundarySymbols = Object.freeze([
  'DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM',
  'DEFAULT_BASE_LEG_PLATFORM_MODE',
  'DEFAULT_BASE_LEG_PLATFORM_SIDE_MODE',
  'DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM',
  'DEFAULT_BASE_PLINTH_HEIGHT_CM',
  'DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM',
  'DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM',
  depthSymbol,
]);
const expectedBoundaryDependencies = Object.freeze([
  Object.freeze({
    specifier: ownerSpecifier,
    kind: 'value',
    syntax: 'static-import',
    importedSymbols: Object.freeze([ownerSymbol]),
    exportedSymbols: Object.freeze([]),
  }),
  Object.freeze({
    specifier: unitsSpecifier,
    kind: 'value',
    syntax: 'static-import',
    importedSymbols: Object.freeze(['mToCm']),
    exportedSymbols: Object.freeze([]),
  }),
  Object.freeze({
    specifier: './sketch_drawer_sizing.js',
    kind: 'value',
    syntax: 'static-re-export',
    importedSymbols: Object.freeze([
      'DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM',
      'DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM',
    ]),
    exportedSymbols: Object.freeze([
      'DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM',
      'DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM',
    ]),
  }),
  Object.freeze({
    specifier: './base_plinth_support.js',
    kind: 'value',
    syntax: 'static-re-export',
    importedSymbols: Object.freeze(['DEFAULT_BASE_PLINTH_HEIGHT_CM']),
    exportedSymbols: Object.freeze(['DEFAULT_BASE_PLINTH_HEIGHT_CM']),
  }),
  Object.freeze({
    specifier: './base_leg_support.js',
    kind: 'value',
    syntax: 'static-re-export',
    importedSymbols: Object.freeze(['DEFAULT_BASE_LEG_PLATFORM_MODE', 'DEFAULT_BASE_LEG_PLATFORM_SIDE_MODE']),
    exportedSymbols: Object.freeze(['DEFAULT_BASE_LEG_PLATFORM_MODE', 'DEFAULT_BASE_LEG_PLATFORM_SIDE_MODE']),
  }),
  Object.freeze({
    specifier: './platform_overhang_support.js',
    kind: 'value',
    syntax: 'static-re-export',
    importedSymbols: Object.freeze([
      'DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM',
      'DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM',
    ]),
    exportedSymbols: Object.freeze([
      'DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM',
      'DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM',
    ]),
  }),
]);
const expectedUiExports = Object.freeze({
  type: Object.freeze([
    'HandleTypeOption',
    'InteriorTabLocalStateDefaults',
    'LayoutTypeOption',
    'ManualToolOption',
  ]),
  value: Object.freeze([
    'DEFAULT_SKETCH_SHELF_DEPTH_EDIT_CM',
    'DEFAULT_SKETCH_SHELF_DEPTH_OVERRIDE',
    'DEFAULT_SKETCH_STORAGE_HEIGHT_CM',
    'INTERIOR_EXT_COUNTS',
    'INTERIOR_GRID_DIVS',
    'INTERIOR_HANDLE_TYPES',
    'INTERIOR_LAYOUT_TYPES',
    'INTERIOR_MANUAL_TOOLS',
    'createInteriorTabLocalStateDefaults',
  ]),
});

const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');

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

function listSourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(absolute));
    else if (entry.isFile() && sourceExtensions.includes(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

function normalizeRel(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

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
  const object = memberPath(node.object);
  const property = staticMemberName(node);
  return object && property ? `${object}.${property}` : null;
}

function findVariable(sourceFile, name) {
  let found = null;
  walkAst(sourceFile, node => {
    if (!found && node?.type === 'VariableDeclarator' && identifierName(node.id) === name) found = node;
  });
  return found;
}

function dependencyFacts(sourceFile, source) {
  return analyzeModuleDependencies(sourceFile, source).imports.map(dependency => ({
    specifier: dependency.specifier,
    kind: dependency.kind,
    syntax: dependency.syntax,
    importedSymbols: [...dependency.importedSymbols],
    exportedSymbols: [...dependency.exportedSymbols],
  }));
}

function isImportBinding(node) {
  return (
    node?.parent?.type === 'ImportSpecifier' ||
    node?.parent?.type === 'ImportDefaultSpecifier' ||
    node?.parent?.type === 'ImportNamespaceSpecifier'
  );
}

function inspectBoundary(source) {
  const violations = [];
  const add = (kind, detail = '') => violations.push({ kind, detail });
  const analysis = analyzeModuleDependencies(boundaryRel, source);
  const sourceFile = createSourceFile(boundaryRel, source);
  const facts = dependencyFacts(boundaryRel, source);

  if (stableJson(facts) !== stableJson(expectedBoundaryDependencies)) {
    add('boundary-dependency-inventory', stableJson(facts));
  }
  for (const dependency of analysis.imports) {
    if (dependency.specifier.includes('wardrobe_dimension_tokens_shared')) {
      add('feature-boundary-facade-import', dependency.specifier);
    }
    if (dependency.specifier.includes('/features/dimensions')) add('public-dimensions-barrel');
    if (dependency.syntax === 'dynamic-import' || dependency.kind === 'dynamic') add('dynamic-import');
    if (dependency.importedSymbols.includes('*')) add('namespace-import');
    for (const binding of dependency.bindings) {
      if (binding.importedName === ownerSymbol && binding.localName !== ownerSymbol) add('owner-alias');
      if (binding.importedName === 'mToCm' && binding.localName !== 'mToCm') add('units-alias');
    }
    if (dependency.importedSymbols.includes('INTERIOR_FITTINGS_POLICY')) {
      add('aggregate-interior-fittings-policy');
    }
  }

  const declaration = findVariable(sourceFile, depthSymbol);
  const initializer = declaration?.init;
  if (
    declaration?.id?.type !== 'Identifier' ||
    declaration.id.name !== depthSymbol ||
    declaration.parent?.type !== 'VariableDeclaration' ||
    declaration.parent.kind !== 'const' ||
    declaration.parent.declarations?.length !== 1 ||
    declaration.parent.parent?.type !== 'ExportNamedDeclaration'
  ) {
    add('boundary-depth-export-shape');
  }
  if (
    initializer?.type !== 'CallExpression' ||
    identifierName(initializer.callee) !== 'mToCm' ||
    initializer.arguments?.length !== 1 ||
    memberPath(initializer.arguments[0]) !== `${ownerSymbol}.regularDepthM` ||
    initializer.arguments[0]?.computed
  ) {
    add('boundary-depth-formula');
  }
  if (initializer?.arguments?.[0]?.computed) add('computed-regular-depth');
  if (initializer?.type === 'BinaryExpression' && initializer.operator === '*') {
    add('numeric-conversion-literal');
  }

  walkAst(sourceFile, node => {
    if (
      node?.type === 'VariableDeclarator' &&
      identifierName(node.id) !== depthSymbol &&
      identifierName(node.init) === ownerSymbol
    ) {
      add('local-owner-copy', identifierName(node.id) ?? 'pattern');
    }
    if (
      node?.type === 'Property' &&
      identifierName(node.value) === ownerSymbol &&
      node.parent?.type === 'ObjectExpression'
    ) {
      add('object-wrapper', identifierName(node.key) ?? 'property');
    }
    if (node?.type !== 'Identifier' || node.name !== ownerSymbol || isImportBinding(node)) return;
    const parent = node.parent;
    if (
      parent?.type === 'MemberExpression' &&
      parent.object === node &&
      !parent.computed &&
      identifierName(parent.property) === 'regularDepthM'
    ) {
      return;
    }
    add('local-owner-escape', parent?.type ?? 'missing');
  });

  const exports = collectNamedModuleExports(boundaryRel, source)
    .filter(entry => entry.kind === 'value')
    .map(entry => entry.exportedName)
    .sort();
  if (stableJson(exports) !== stableJson([...expectedBoundarySymbols].sort())) {
    add('boundary-export-inventory', stableJson(exports));
  }
  return violations;
}

function migratedDepthExportStatement(statement) {
  if (statement?.type !== 'ExportNamedDeclaration' || statement.source) return false;
  if (
    statement.declaration?.type === 'VariableDeclaration' &&
    statement.declaration.declarations?.some(entry => identifierName(entry.id) === depthSymbol)
  ) {
    return true;
  }
  return (statement.specifiers ?? []).some(
    specifier =>
      identifierName(specifier.local) === depthSymbol && identifierName(specifier.exported) === depthSymbol
  );
}

function preservedUiSource(source) {
  const sourceFile = createSourceFile(uiRel, source);
  return (sourceFile.body ?? [])
    .filter(statement => statement.type !== 'ImportDeclaration' && !migratedDepthExportStatement(statement))
    .map(statement => source.slice(statement.start, statement.end))
    .join('\n');
}

function uiSemanticFingerprint(source) {
  return sha256(preservedUiSource(source).replace(/\s+/gu, ' ').trim());
}

function uiLiteralInventoryFingerprint(source) {
  const literals = Array.from(
    preservedUiSource(source).matchAll(
      /'(?:\\.|[^'\\])*'|\b(?:true|false|null)\b|(?<![\w.])-?(?:\d+(?:\.\d+)?|\.\d+)(?![\w.])/gu
    ),
    match => match[0]
  );
  return sha256(JSON.stringify(literals));
}

function inspectUi(source) {
  const violations = [];
  const add = (kind, detail = '') => violations.push({ kind, detail });
  const analysis = analyzeModuleDependencies(uiRel, source);
  const sourceFile = createSourceFile(uiRel, source);
  const boundaryImports = analysis.imports.filter(
    dependency => dependency.syntax === 'static-import' && dependency.specifier === boundarySpecifier
  );

  for (const dependency of analysis.imports) {
    if (dependency.specifier.includes('wardrobe_dimension_tokens_shared')) add('ui-facade-import');
    if (dependency.specifier.includes('/features/dimensions')) add('ui-public-dimensions-barrel');
    if (
      dependency.specifier.includes('interior_fittings_policy') ||
      dependency.importedSymbols.some(symbol =>
        [ownerSymbol, 'INTERIOR_FITTINGS_POLICY', 'INTERIOR_SHELF_POLICY'].includes(symbol)
      )
    ) {
      add('ui-direct-focused-owner-import');
    }
    if (dependency.syntax === 'dynamic-import' || dependency.kind === 'dynamic') add('ui-dynamic-import');
    if (dependency.importedSymbols.includes('*')) add('ui-namespace-import');
  }

  const featureValueImports = analysis.imports.filter(
    dependency =>
      dependency.syntax === 'static-import' &&
      dependency.kind === 'value' &&
      dependency.specifier.startsWith('../../../features/')
  );
  if (featureValueImports.length !== 1 || featureValueImports[0]?.specifier !== boundarySpecifier) {
    add('ui-feature-import-consolidation', stableJson(featureValueImports.map(entry => entry.specifier)));
  }
  if (boundaryImports.length !== 1) {
    add('ui-boundary-import-count', String(boundaryImports.length));
  } else {
    const dependency = boundaryImports[0];
    const bindings = dependency.bindings.map(binding => [binding.importedName, binding.localName]);
    if (
      dependency.kind !== 'value' ||
      stableJson(dependency.importedSymbols) !== stableJson(expectedBoundarySymbols) ||
      dependency.bindings.length !== expectedBoundarySymbols.length ||
      bindings.some(([importedName, localName]) => importedName !== localName)
    ) {
      add('ui-boundary-import-inventory', stableJson({ symbols: dependency.importedSymbols, bindings }));
    }
  }

  const localDepthExports = (sourceFile.body ?? []).filter(statement =>
    migratedDepthExportStatement(statement)
  );
  if (
    localDepthExports.length !== 1 ||
    localDepthExports[0].declaration ||
    localDepthExports[0].specifiers?.length !== 1 ||
    identifierName(localDepthExports[0].specifiers[0].local) !== depthSymbol ||
    identifierName(localDepthExports[0].specifiers[0].exported) !== depthSymbol
  ) {
    add('ui-depth-local-re-export');
  }
  if (findVariable(sourceFile, depthSymbol)) add('ui-wrapper-constant');

  const exportFacts = collectNamedModuleExports(uiRel, source);
  const inventory = {
    type: exportFacts
      .filter(entry => entry.kind === 'type')
      .map(entry => entry.exportedName)
      .sort(),
    value: exportFacts
      .filter(entry => entry.kind === 'value')
      .map(entry => entry.exportedName)
      .sort(),
  };
  if (stableJson(inventory) !== stableJson(expectedUiExports)) {
    add('ui-export-inventory', stableJson(inventory));
  }
  if (uiSemanticFingerprint(source) !== expectedUiSemanticFingerprint) {
    add('ui-semantic-fingerprint', uiSemanticFingerprint(source));
  }
  if (uiLiteralInventoryFingerprint(source) !== expectedUiLiteralInventoryFingerprint) {
    add('ui-literal-inventory', uiLiteralInventoryFingerprint(source));
  }
  return violations;
}

function assertViolation(violations, kind, label) {
  assert.equal(
    violations.some(violation => violation.kind === kind),
    true,
    `${label}: ${JSON.stringify(violations)}`
  );
}

function assertHistoricalInteriorTabLedger(migrationBudgets) {
  assert.ok(migrationBudgets.length >= 165);
  assert.equal(sha256(stableJson(migrationBudgets.slice(0, 163))), prefix163Sha256);
  assert.equal(sha256(stableJson(migrationBudgets.slice(0, 164))), prefix164Sha256);
  assert.equal(sha256(stableJson(migrationBudgets.slice(0, 165))), prefix165Sha256);
}

function syntheticFutureEntry166() {
  return {
    from: 'services',
    to: 'shared',
    additionalStatements: 1,
    owner: 'synthetic-future-migration',
    reviewedAt: '2099-01-01',
    reviewBy: '2099-04-01',
    fromFile: 'esm/native/services/future_consumer_166.ts',
    companionImport: {
      toFile: 'esm/shared/future_companion.ts',
      kind: 'value',
      importedSymbols: ['FUTURE_COMPANION_166'],
      syntax: 'static-import',
    },
    removedImport: {
      toFile: 'esm/shared/future_facade.ts',
      kind: 'value',
      importedSymbols: ['FUTURE_FACADE_166'],
      syntax: 'static-import',
    },
    addedImport: {
      toFile: 'esm/shared/future_owner.ts',
      kind: 'value',
      importedSymbols: ['FUTURE_OWNER_166'],
      syntax: 'static-import',
    },
    reason: 'Synthetic Entry 166 proves append-safe historical ownership.',
    removalCondition: 'Remove the synthetic Entry 166 after the append-safe proof.',
  };
}

function expectedLedgerEntries() {
  const common = {
    from: 'features',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-28',
    reviewBy: '2026-10-18',
    fromFile: boundaryRel,
    removedImport: {
      toFile: facadeRel,
      kind: 'value',
      importedSymbols: [compatibilitySymbol, 'mToCm'],
      syntax: 'static-import',
    },
  };
  return [
    {
      ...common,
      companionImport: {
        toFile: unitsRel,
        kind: 'value',
        importedSymbols: ['mToCm'],
        syntax: 'static-import',
      },
      addedImport: {
        toFile: ownerRel,
        kind: 'value',
        importedSymbols: [ownerSymbol],
        syntax: 'static-import',
      },
      reason:
        'The Interior Tab defaults feature boundary moves the combined UI facade statement behind a feature-owned composition seam, adding the focused Interior Shelf Geometry owner alongside the canonical units conversion without returning the facade to UI.',
      removalCondition:
        'Remove this entry when a reviewed Interior Tab defaults composition seam eliminates the extra Interior Fittings owner statement without reintroducing the legacy facade or a direct shared owner import in UI.',
    },
    {
      ...common,
      companionImport: {
        toFile: ownerRel,
        kind: 'value',
        importedSymbols: [ownerSymbol],
        syntax: 'static-import',
      },
      addedImport: {
        toFile: unitsRel,
        kind: 'value',
        importedSymbols: ['mToCm'],
        syntax: 'static-import',
      },
      reason:
        'The Interior Tab defaults feature boundary moves the combined UI facade statement behind a feature-owned composition seam, adding the canonical meter-to-centimeter conversion alongside the focused Interior Shelf Geometry owner without returning the facade to UI.',
      removalCondition:
        'Remove this entry when a reviewed Interior Tab defaults composition seam eliminates the extra units statement without reintroducing the legacy facade, numeric conversion literals, or a direct shared import in UI.',
    },
  ];
}

test('Interior Tab feature boundary has two focused shared dependencies and seven exact re-exports', () => {
  const source = read(boundaryRel);
  assert.deepEqual(inspectBoundary(source), []);
  assert.equal(
    memberPath(findVariable(createSourceFile(boundaryRel, source), depthSymbol)?.init?.arguments?.[0]),
    `${ownerSymbol}.regularDepthM`
  );
});

test('Interior Tab UI imports all eight defaults through one feature-owned boundary and preserves binding identity', () => {
  const source = read(uiRel);
  assert.deepEqual(inspectUi(source), []);
  assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared|INTERIOR_FITTINGS_DIMENSIONS/u);
  assert.match(source, /export\s*\{\s*DEFAULT_SKETCH_SHELF_DEPTH_EDIT_CM,?\s*\};/u);

  const publicFeatureManifest = JSON.parse(read('tools/wp_features_public_api_manifest.json'));
  assert.equal(
    publicFeatureManifest.publicEntries.filter(entry => entry === 'interior_tab_defaults.js').length,
    1
  );
});

test('Interior Fittings compatibility aggregate has zero native production consumers', () => {
  const consumers = [];
  for (const file of listSourceFiles(path.join(root, 'esm/native'))) {
    const source = fs.readFileSync(file, 'utf8');
    if (/\bINTERIOR_FITTINGS_DIMENSIONS\b/u.test(source)) consumers.push(normalizeRel(file));
  }
  assert.deepEqual(consumers, []);
});

test('Interior Tab boundary rejects direct owners, facade routes, aliases, wrappers, and formula drift', () => {
  const source = read(boundaryRel);
  assertViolation(
    inspectBoundary(source.replace(ownerSpecifier, '../../shared/wardrobe_dimension_tokens_shared.js')),
    'feature-boundary-facade-import',
    'feature facade import'
  );
  assertViolation(
    inspectBoundary(source.replace(ownerSymbol, 'INTERIOR_FITTINGS_POLICY')),
    'aggregate-interior-fittings-policy',
    'aggregate owner import'
  );
  assertViolation(
    inspectBoundary(source.replace(ownerSymbol, `${ownerSymbol} as shelfGeometry`)),
    'owner-alias',
    'owner alias'
  );
  assertViolation(
    inspectBoundary(source.replace('mToCm }', 'mToCm as convertToCm }')),
    'units-alias',
    'mToCm alias'
  );
  assertViolation(
    inspectBoundary(
      source.replace(
        `import { ${ownerSymbol} } from '${ownerSpecifier}';`,
        `import * as interiorFittings from '${ownerSpecifier}';`
      )
    ),
    'namespace-import',
    'namespace import'
  );
  assertViolation(
    inspectBoundary(`${source}\nvoid import('${ownerSpecifier}');\n`),
    'dynamic-import',
    'dynamic import'
  );
  assertViolation(
    inspectBoundary(
      source.replace(
        `export const ${depthSymbol}: number = mToCm(${ownerSymbol}.regularDepthM);`,
        `const shelfGeometry = ${ownerSymbol};\nexport const ${depthSymbol}: number = mToCm(shelfGeometry.regularDepthM);`
      )
    ),
    'local-owner-copy',
    'local owner copy'
  );
  assertViolation(
    inspectBoundary(
      source.replace(
        `export const ${depthSymbol}: number = mToCm(${ownerSymbol}.regularDepthM);`,
        `const wrapper = { shelfGeometry: ${ownerSymbol} };\nexport const ${depthSymbol}: number = mToCm(wrapper.shelfGeometry.regularDepthM);`
      )
    ),
    'object-wrapper',
    'object wrapper'
  );
  assertViolation(
    inspectBoundary(source.replace('.regularDepthM', "['regularDepthM']")),
    'computed-regular-depth',
    'computed depth access'
  );
  assertViolation(
    inspectBoundary(
      source.replace(`mToCm(${ownerSymbol}.regularDepthM)`, `${ownerSymbol}.regularDepthM * 100`)
    ),
    'numeric-conversion-literal',
    'numeric conversion literal'
  );
  assertViolation(
    inspectBoundary(source.replace(ownerSpecifier, '../dimensions/index.js')),
    'boundary-dependency-inventory',
    'public dimensions barrel'
  );
});

test('Interior Tab UI rejects facade routes, direct shared owners, wrappers, and split feature imports', () => {
  const source = read(uiRel);
  assertViolation(
    inspectUi(
      source.replace(
        `} from '${boundarySpecifier}';`,
        `} from '../../../../shared/wardrobe_dimension_tokens_shared.js';`
      )
    ),
    'ui-facade-import',
    'UI facade import'
  );
  assertViolation(
    inspectUi(
      source.replace(
        `} from '${boundarySpecifier}';`,
        `} from '../../../../shared/dimensions/interior_fittings_policy.js';`
      )
    ),
    'ui-direct-focused-owner-import',
    'UI direct focused owner import'
  );
  assertViolation(
    inspectUi(source.replace(boundarySpecifier, '../../../features/dimensions/index.js')),
    'ui-public-dimensions-barrel',
    'UI public dimensions barrel'
  );
  assertViolation(
    inspectUi(`${source}\nvoid import('${boundarySpecifier}');\n`),
    'ui-dynamic-import',
    'UI dynamic import'
  );
  const boundaryImport = `import {
  ${expectedBoundarySymbols.join(',\n  ')},
} from '${boundarySpecifier}';`;
  assertViolation(
    inspectUi(source.replace(boundaryImport, `import * as defaults from '${boundarySpecifier}';`)),
    'ui-namespace-import',
    'UI namespace import'
  );
  assertViolation(
    inspectUi(source.replace(`export { ${depthSymbol} };`, `export const ${depthSymbol} = 45;`)),
    'ui-wrapper-constant',
    'UI wrapper constant'
  );
  assertViolation(
    inspectUi(
      `${source}\nimport { DEFAULT_BASE_PLINTH_HEIGHT_CM } from '../../../features/base_plinth_support.js';\n`
    ),
    'ui-feature-import-consolidation',
    'duplicate feature import'
  );
  assertViolation(
    inspectUi(`${source}\nimport { EXTRA_DEFAULT } from '../../../features/extra_defaults.js';\n`),
    'ui-feature-import-consolidation',
    'fifth separate feature import'
  );
});

test('Interior Tab boundary rejects missing or extra owner re-exports', () => {
  const source = read(boundaryRel);
  assertViolation(
    inspectBoundary(
      source.replace("export { DEFAULT_BASE_PLINTH_HEIGHT_CM } from './base_plinth_support.js';\n", '')
    ),
    'boundary-dependency-inventory',
    'missing boundary re-export'
  );
  assertViolation(
    inspectBoundary(`${source}\nexport { EXTRA_DEFAULT } from './extra_defaults.js';\n`),
    'boundary-dependency-inventory',
    'extra boundary re-export'
  );
});

test('Interior Tab migration owns exact Ledger Entries 164 and 165 and remains append-safe for Entry 166', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assertHistoricalInteriorTabLedger(baseline.migrationBudgets);
  assert.deepEqual(baseline.migrationBudgets.slice(163, 165), expectedLedgerEntries());

  const historicalPrefix165 = structuredClone(baseline.migrationBudgets.slice(0, 165));
  const withFutureEntry166 = [...historicalPrefix165, syntheticFutureEntry166()];
  assert.equal(historicalPrefix165.length, 165);
  assert.equal(withFutureEntry166.length, 166);
  assert.equal(sha256(stableJson(withFutureEntry166.slice(0, 163))), prefix163Sha256);
  assert.equal(sha256(stableJson(withFutureEntry166.slice(0, 164))), prefix164Sha256);
  assert.equal(sha256(stableJson(withFutureEntry166.slice(0, 165))), prefix165Sha256);
  assert.doesNotThrow(() => assertHistoricalInteriorTabLedger(withFutureEntry166));
});

test('Interior Tab migration preserves Layer, Facade, public-surface, and ratchet invariants', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  const graph = collectLayerContractGraph({ root });
  const report = evaluateLayerContract(graph, baseline, { currentDate: '2026-07-28' });
  assert.equal(report.ok, true);
  assert.equal(report.migrationBudgets.length, 166);

  const expectedEdges = new Map([
    ['builder>shared', 305],
    ['features>shared', 68],
    ['services>shared', 230],
    ['ui>shared', 27],
    ['platform>shared', 6],
    ['runtime>shared', 36],
    ['ui>features', 75],
  ]);
  for (const [key, expected] of expectedEdges) {
    const [from, to] = key.split('>');
    const edge = graph.edges.find(entry => entry.from === from && entry.to === to);
    assert.ok(edge, key);
    assert.equal(edge.importCount, expected, key);
  }
  const featuresSharedRule = baseline.rules.find(entry => entry.from === 'features' && entry.to === 'shared');
  assert.ok(featuresSharedRule);
  assert.equal(featuresSharedRule.maxImporterCount, 41);
  assert.equal(featuresSharedRule.maxValueImporterCount, 41);

  const uiFeaturesRule = baseline.rules.find(entry => entry.from === 'ui' && entry.to === 'features');
  assert.ok(uiFeaturesRule);
  assert.equal(uiFeaturesRule.maxImportCount, 78);

  const facadeDependencies = listSourceFiles(path.join(root, 'esm')).flatMap(file =>
    analyzeModuleDependencies(file, fs.readFileSync(file, 'utf8'))
      .imports.filter(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared'))
      .map(dependency => ({ file, ...dependency }))
  );
  const staticFacadeDependencies = facadeDependencies.filter(
    dependency => dependency.syntax === 'static-import'
  );
  assert.equal(new Set(staticFacadeDependencies.map(entry => entry.file)).size, 4);
  assert.equal(staticFacadeDependencies.length, 4);
  assert.equal(new Set(facadeDependencies.map(entry => entry.file)).size, 6);
  assert.equal(facadeDependencies.length, 7);

  const facadeExports = collectNamedModuleExports(facadeRel, read(facadeRel));
  assert.equal(
    new Set(facadeExports.filter(entry => entry.kind === 'value').map(entry => entry.exportedName)).size,
    89
  );
  assert.equal(
    new Set(facadeExports.filter(entry => entry.kind === 'type').map(entry => entry.exportedName)).size,
    10
  );

  const proposal = buildLayerContractProposal(graph, baseline, { currentDate: '2026-07-28' });
  assert.equal(proposal.reviewRequired, false);
  assert.deepEqual(proposal.diff.addedEdges, []);
  assert.deepEqual(proposal.diff.ratchetViolations, []);
  assert.deepEqual(proposal.diff.migrationBudgetFailures, []);
});
