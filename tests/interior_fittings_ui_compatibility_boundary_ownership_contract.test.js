import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const boundaryRel = 'esm/native/features/interior_tab_defaults.ts';
const uiRel = 'esm/native/ui/react/tabs/interior_tab_local_state_shared.ts';
const compositionOwnerRel = 'esm/shared/dimensions/interior_tab_defaults_dimension_policy.ts';
const boundarySpecifier = '../../../features/interior_tab_defaults.js';
const compositionOwnerSpecifier = '../../shared/dimensions/interior_tab_defaults_dimension_policy.js';
const depthSymbol = 'DEFAULT_SKETCH_SHELF_DEPTH_EDIT_CM';
const ownerSymbol = 'INTERIOR_SHELF_GEOMETRY_POLICY';
const expectedUiSemanticFingerprint = 'f16e56048cf07f84bc3efbb762107b6473ca6ce0ddf57beed0a3981714d7a934';
const expectedUiLiteralInventoryFingerprint =
  '2a4f0188a66b4a12d2c650b08aa460070ed15a87d065f523d79056bf1c7f92db';
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
    specifier: compositionOwnerSpecifier,
    kind: 'value',
    syntax: 'static-import',
    importedSymbols: Object.freeze([ownerSymbol, 'mToCm']),
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

test('Interior Tab feature boundary has one focused composition dependency and seven exact re-exports', () => {
  const source = read(boundaryRel);
  assert.deepEqual(inspectBoundary(source), []);
  assert.equal(
    memberPath(findVariable(createSourceFile(boundaryRel, source), depthSymbol)?.init?.arguments?.[0]),
    `${ownerSymbol}.regularDepthM`
  );
});

test('Interior Tab defaults composition owner is an exact identity-only two-source boundary', () => {
  const facts = dependencyFacts(compositionOwnerRel, read(compositionOwnerRel));
  assert.deepEqual(facts, [
    {
      specifier: './interior_fittings_policy.js',
      kind: 'value',
      syntax: 'static-re-export',
      importedSymbols: [ownerSymbol],
      exportedSymbols: [ownerSymbol],
    },
    {
      specifier: './units.js',
      kind: 'value',
      syntax: 'static-re-export',
      importedSymbols: ['mToCm'],
      exportedSymbols: ['mToCm'],
    },
  ]);
  const sourceFile = createSourceFile(compositionOwnerRel, read(compositionOwnerRel));
  assert.equal(sourceFile.body.length, 2);
  assert.equal(
    sourceFile.body.every(statement => statement.type === 'ExportNamedDeclaration' && !statement.declaration),
    true
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
