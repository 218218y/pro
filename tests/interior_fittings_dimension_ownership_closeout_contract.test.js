import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const boundaryRel = 'esm/native/features/interior_tab_defaults.ts';
const uiRel = 'esm/native/ui/react/tabs/interior_tab_local_state_shared.ts';
const uiHelpersRel = 'esm/native/ui/react/tabs/interior_tab_helpers.tsx';
const compositionOwnerRel = 'esm/shared/dimensions/interior_tab_defaults_dimension_policy.ts';

const geometryPolicySymbol = 'INTERIOR_SHELF_GEOMETRY_POLICY';
const depthDefaultSymbol = 'DEFAULT_SKETCH_SHELF_DEPTH_EDIT_CM';
const boundarySpecifier = '../../../features/interior_tab_defaults.js';
const uiHelpersSpecifier = './interior_tab_helpers.js';

const unitsSpecifierFromBoundary = '../../shared/dimensions/units.js';
const compositionOwnerSpecifierFromBoundary =
  '../../shared/dimensions/interior_tab_defaults_dimension_policy.js';

const expectedBoundaryImports = Object.freeze([
  Object.freeze({
    importKind: 'value',
    source: compositionOwnerSpecifierFromBoundary,
    specifiers: Object.freeze([
      Object.freeze({
        type: 'ImportSpecifier',
        imported: geometryPolicySymbol,
        local: geometryPolicySymbol,
      }),
      Object.freeze({ type: 'ImportSpecifier', imported: 'mToCm', local: 'mToCm' }),
    ]),
  }),
]);

const expectedBoundaryReExports = Object.freeze([
  Object.freeze({
    source: './sketch_drawer_sizing.js',
    symbols: Object.freeze([
      'DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM',
      'DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM',
    ]),
  }),
  Object.freeze({
    source: './base_plinth_support.js',
    symbols: Object.freeze(['DEFAULT_BASE_PLINTH_HEIGHT_CM']),
  }),
  Object.freeze({
    source: './base_leg_support.js',
    symbols: Object.freeze(['DEFAULT_BASE_LEG_PLATFORM_MODE', 'DEFAULT_BASE_LEG_PLATFORM_SIDE_MODE']),
  }),
  Object.freeze({
    source: './platform_overhang_support.js',
    symbols: Object.freeze([
      'DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM',
      'DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM',
    ]),
  }),
]);

const expectedBoundaryValueSymbols = Object.freeze([
  'DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM',
  'DEFAULT_BASE_LEG_PLATFORM_MODE',
  'DEFAULT_BASE_LEG_PLATFORM_SIDE_MODE',
  'DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM',
  'DEFAULT_BASE_PLINTH_HEIGHT_CM',
  'DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM',
  'DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM',
  depthDefaultSymbol,
]);

const expectedUiTypeSymbols = Object.freeze([
  'DoorTrimUiColor',
  'DoorTrimUiSpan',
  'ExtDrawerType',
  'HandleType',
  'LayoutTypeId',
  'ManualToolId',
  'SketchBoxBaseType',
  'SketchBoxCorniceType',
  'SketchBoxLegColor',
  'SketchBoxLegPlatformMode',
  'SketchBoxLegPlatformSideMode',
  'SketchBoxLegStyle',
]);

const expectedUiValueSymbols = Object.freeze([...expectedBoundaryValueSymbols]);

const expectedUiImports = Object.freeze([
  Object.freeze({
    importKind: 'type',
    source: uiHelpersSpecifier,
    specifiers: Object.freeze(
      expectedUiTypeSymbols.map(symbol =>
        Object.freeze({ type: 'ImportSpecifier', imported: symbol, local: symbol })
      )
    ),
  }),
  Object.freeze({
    importKind: 'value',
    source: boundarySpecifier,
    specifiers: Object.freeze(
      expectedUiValueSymbols.map(symbol =>
        Object.freeze({ type: 'ImportSpecifier', imported: symbol, local: symbol })
      )
    ),
  }),
]);

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

function canonicalFileTarget(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  return path.normalize(fs.realpathSync.native(file)).toLowerCase();
}

function identifierName(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function memberPath(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type !== 'MemberExpression') return null;
  const object = memberPath(node.object);
  const property = node.computed
    ? node.property?.type === 'Literal' && typeof node.property.value === 'string'
      ? node.property.value
      : null
    : identifierName(node.property);
  return object && property ? `${object}.${property}` : null;
}

function findVariable(sourceFile, name) {
  let result = null;
  walkAst(sourceFile, node => {
    if (!result && node?.type === 'VariableDeclarator' && identifierName(node.id) === name) {
      result = node;
    }
  });
  return result;
}

function importShape(statement) {
  return {
    importKind: statement.importKind,
    source: identifierName(statement.source),
    specifiers: (statement.specifiers ?? []).map(specifier => ({
      type: specifier.type,
      imported: identifierName(specifier.imported),
      local: identifierName(specifier.local),
    })),
  };
}

function reExportShape(statement) {
  return {
    source: identifierName(statement.source),
    symbols: (statement.specifiers ?? []).map(specifier => {
      const local = identifierName(specifier.local);
      const exported = identifierName(specifier.exported);
      return local === exported ? exported : `${local} as ${exported}`;
    }),
  };
}

function addViolation(violations, kind, detail = '') {
  violations.push({ kind, detail });
}

function inspectBoundary(source) {
  const violations = [];
  const sourceFile = createSourceFile(boundaryRel, source);
  const body = sourceFile.body ?? [];
  const imports = body.filter(statement => statement.type === 'ImportDeclaration');
  const directReExports = body.filter(
    statement => statement.type === 'ExportNamedDeclaration' && statement.source
  );
  const localExports = body.filter(
    statement => statement.type === 'ExportNamedDeclaration' && !statement.source
  );

  if (
    stableJson(imports.map(importShape)) !== stableJson(expectedBoundaryImports) ||
    imports.some(statement => statement.specifiers?.length === 0)
  ) {
    addViolation(violations, 'boundary-import-inventory', stableJson(imports.map(importShape)));
  }
  if (
    stableJson(directReExports.map(reExportShape)) !== stableJson(expectedBoundaryReExports) ||
    directReExports.some(
      statement =>
        statement.exportKind !== 'value' ||
        statement.declaration ||
        statement.specifiers?.some(
          specifier =>
            specifier.type !== 'ExportSpecifier' ||
            specifier.exportKind !== 'value' ||
            identifierName(specifier.local) !== identifierName(specifier.exported)
        )
    )
  ) {
    addViolation(
      violations,
      'boundary-direct-re-export-inventory',
      stableJson(directReExports.map(reExportShape))
    );
  }

  const declaration = findVariable(sourceFile, depthDefaultSymbol);
  if (
    localExports.length !== 1 ||
    declaration?.parent?.type !== 'VariableDeclaration' ||
    declaration.parent.kind !== 'const' ||
    declaration.parent.declarations?.length !== 1 ||
    declaration.parent.parent !== localExports[0] ||
    declaration.id?.type !== 'Identifier' ||
    declaration.id.name !== depthDefaultSymbol ||
    declaration.id.typeAnnotation?.typeAnnotation?.type !== 'TSNumberKeyword'
  ) {
    addViolation(violations, 'boundary-local-export-shape');
  }

  const initializer = declaration?.init;
  if (
    initializer?.type !== 'CallExpression' ||
    identifierName(initializer.callee) !== 'mToCm' ||
    initializer.arguments?.length !== 1 ||
    initializer.arguments[0]?.type !== 'MemberExpression' ||
    initializer.arguments[0].computed ||
    memberPath(initializer.arguments[0]) !== `${geometryPolicySymbol}.regularDepthM`
  ) {
    addViolation(violations, 'boundary-depth-formula');
  }

  const dependencies = analyzeModuleDependencies(boundaryRel, source).imports;
  if (dependencies.length !== expectedBoundaryImports.length + expectedBoundaryReExports.length) {
    addViolation(violations, 'boundary-dependency-count', String(dependencies.length));
  }

  const namedExports = collectNamedModuleExports(boundaryRel, source);
  const valueSymbols = namedExports
    .filter(entry => entry.kind === 'value')
    .map(entry => entry.exportedName)
    .sort();
  if (stableJson(valueSymbols) !== stableJson([...expectedBoundaryValueSymbols].sort())) {
    addViolation(violations, 'boundary-value-export-inventory', stableJson(valueSymbols));
  }
  if (
    namedExports.some(entry => entry.kind === 'type') ||
    body.some(
      statement =>
        statement.type === 'ExportDefaultDeclaration' ||
        statement.type === 'ExportAllDeclaration' ||
        statement.exportKind === 'type'
    )
  ) {
    addViolation(violations, 'boundary-default-type-or-wildcard-export');
  }

  const expectedTopology = [
    'ImportDeclaration',
    'ExportNamedDeclaration',
    'ExportNamedDeclaration',
    'ExportNamedDeclaration',
    'ExportNamedDeclaration',
    'ExportNamedDeclaration',
  ];
  if (stableJson(body.map(statement => statement.type)) !== stableJson(expectedTopology)) {
    addViolation(violations, 'boundary-top-level-topology');
  }

  return violations;
}

function inspectUiImports(source) {
  const violations = [];
  const sourceFile = createSourceFile(uiRel, source);
  const imports = (sourceFile.body ?? []).filter(statement => statement.type === 'ImportDeclaration');
  if (stableJson(imports.map(importShape)) !== stableJson(expectedUiImports)) {
    addViolation(violations, 'ui-import-declaration-inventory', stableJson(imports.map(importShape)));
  }

  const dependencies = analyzeModuleDependencies(uiRel, source).imports;
  if (
    dependencies.length !== 2 ||
    dependencies[0]?.specifier !== uiHelpersSpecifier ||
    dependencies[0]?.kind !== 'type' ||
    dependencies[0]?.syntax !== 'type-import' ||
    stableJson(dependencies[0]?.importedSymbols) !== stableJson(expectedUiTypeSymbols) ||
    dependencies[1]?.specifier !== boundarySpecifier ||
    dependencies[1]?.kind !== 'value' ||
    dependencies[1]?.syntax !== 'static-import' ||
    stableJson(dependencies[1]?.importedSymbols) !== stableJson(expectedUiValueSymbols) ||
    dependencies.some(dependency =>
      dependency.bindings.some(
        binding =>
          binding.importedName !== binding.localName ||
          binding.exportedName !== null ||
          binding.importedName === '*'
      )
    )
  ) {
    addViolation(
      violations,
      'ui-dependency-inventory',
      stableJson(
        dependencies.map(dependency => ({
          specifier: dependency.specifier,
          kind: dependency.kind,
          syntax: dependency.syntax,
          importedSymbols: dependency.importedSymbols,
        }))
      )
    );
  }

  const localDepthExports = (sourceFile.body ?? []).filter(
    statement =>
      statement.type === 'ExportNamedDeclaration' &&
      !statement.source &&
      !statement.declaration &&
      statement.specifiers?.some(
        specifier =>
          identifierName(specifier.local) === depthDefaultSymbol ||
          identifierName(specifier.exported) === depthDefaultSymbol
      )
  );
  if (
    localDepthExports.length !== 1 ||
    localDepthExports[0].specifiers?.length !== 1 ||
    identifierName(localDepthExports[0].specifiers[0].local) !== depthDefaultSymbol ||
    identifierName(localDepthExports[0].specifiers[0].exported) !== depthDefaultSymbol
  ) {
    addViolation(violations, 'ui-depth-re-export-shape');
  }
  if (findVariable(sourceFile, depthDefaultSymbol)) {
    addViolation(violations, 'ui-wrapper-constant');
  }

  return violations;
}

function assertRejected(inspect, source, expectedKind, label) {
  const violations = inspect(source);
  assert.equal(
    violations.some(violation => violation.kind === expectedKind),
    true,
    `${label}: ${JSON.stringify(violations)}`
  );
}

test('Interior Tab feature boundary has the exact side-effect-free topology', () => {
  assert.deepEqual(inspectBoundary(read(boundaryRel)), []);
});

test('Interior Tab defaults composition owner has exactly two identity re-exports', () => {
  const dependencies = analyzeModuleDependencies(compositionOwnerRel, read(compositionOwnerRel)).imports;
  assert.deepEqual(
    dependencies.map(dependency => ({
      specifier: dependency.specifier,
      kind: dependency.kind,
      syntax: dependency.syntax,
      importedSymbols: dependency.importedSymbols,
      exportedSymbols: dependency.exportedSymbols,
    })),
    [
      {
        specifier: './interior_fittings_policy.js',
        kind: 'value',
        syntax: 'static-re-export',
        importedSymbols: [geometryPolicySymbol],
        exportedSymbols: [geometryPolicySymbol],
      },
      {
        specifier: './units.js',
        kind: 'value',
        syntax: 'static-re-export',
        importedSymbols: ['mToCm'],
        exportedSymbols: ['mToCm'],
      },
    ]
  );
  const sourceFile = createSourceFile(compositionOwnerRel, read(compositionOwnerRel));
  assert.equal(sourceFile.body.length, 2);
  assert.equal(
    sourceFile.body.every(statement => statement.type === 'ExportNamedDeclaration' && !statement.declaration),
    true
  );
});

test('Interior Tab UI has exactly one type import and one eight-symbol boundary import', () => {
  assert.deepEqual(inspectUiImports(read(uiRel)), []);
  assert.ok(canonicalFileTarget(path.join(root, uiHelpersRel)));
});

test('mutation probes reject UI import drift, boundary dependency growth, formula drift, and wrappers', () => {
  const uiSource = read(uiRel);
  assertRejected(
    inspectUiImports,
    `${uiSource}\nimport './interior_tab_side_effect.js';\n`,
    'ui-import-declaration-inventory',
    'UI side-effect import'
  );
  assertRejected(
    inspectUiImports,
    uiSource.replace(uiHelpersSpecifier, './interior_tab_types.js'),
    'ui-import-declaration-inventory',
    'UI type source change'
  );
  assertRejected(
    inspectUiImports,
    `${uiSource}\nimport type { LayoutTypeId } from './interior_tab_helpers.js';\n`,
    'ui-import-declaration-inventory',
    'UI third same-layer import'
  );
  assertRejected(
    inspectUiImports,
    `${uiSource}\nimport { DEFAULT_BASE_PLINTH_HEIGHT_CM as directPlinthDefault } from '../../../features/base_plinth_support.js';\n`,
    'ui-import-declaration-inventory',
    'UI direct additional feature import'
  );
  assertRejected(
    inspectUiImports,
    uiSource.replace(`export { ${depthDefaultSymbol} };`, `export const ${depthDefaultSymbol} = 45;`),
    'ui-wrapper-constant',
    'UI wrapper constant'
  );

  const boundarySource = read(boundaryRel);
  assertRejected(
    inspectBoundary,
    `${boundarySource}\nimport { cmToM } from '${unitsSpecifierFromBoundary}';\n`,
    'boundary-import-inventory',
    'boundary dependency growth'
  );
  assertRejected(
    inspectBoundary,
    boundarySource.replace(
      `mToCm(${geometryPolicySymbol}.regularDepthM)`,
      `Number(mToCm(${geometryPolicySymbol}.regularDepthM))`
    ),
    'boundary-depth-formula',
    'formula wrapper'
  );
  assertRejected(
    inspectBoundary,
    boundarySource.replace(
      `mToCm(${geometryPolicySymbol}.regularDepthM)`,
      `${geometryPolicySymbol}.regularDepthM * 100`
    ),
    'boundary-depth-formula',
    'conversion literal'
  );
  assertRejected(
    inspectBoundary,
    `${boundarySource}\nexport type BoundaryLeak = number;\n`,
    'boundary-default-type-or-wildcard-export',
    'type export'
  );
  assertRejected(
    inspectBoundary,
    `${boundarySource}\ninitializeInteriorDefaults();\n`,
    'boundary-top-level-topology',
    'boundary side effect'
  );
});
