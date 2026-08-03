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
const uiHelpersRel = 'esm/native/ui/react/tabs/interior_tab_helpers.tsx';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const ownerRel = 'esm/shared/dimensions/interior_fittings_policy.ts';
const unitsRel = 'esm/shared/dimensions/units.ts';
const compositionOwnerRel = 'esm/shared/dimensions/interior_tab_defaults_dimension_policy.ts';

const compatibilitySymbol = 'INTERIOR_FITTINGS_DIMENSIONS';

const geometryPolicySymbol = 'INTERIOR_SHELF_GEOMETRY_POLICY';
const depthDefaultSymbol = 'DEFAULT_SKETCH_SHELF_DEPTH_EDIT_CM';
const boundarySpecifier = '../../../features/interior_tab_defaults.js';
const uiHelpersSpecifier = './interior_tab_helpers.js';

const unitsSpecifierFromBoundary = '../../shared/dimensions/units.js';
const compositionOwnerSpecifierFromBoundary =
  '../../shared/dimensions/interior_tab_defaults_dimension_policy.js';

const prefix163Sha256 = '8c4c04e56a8b991d81537127adc69c5dc42b4e7ed3de4fe81258a67b01ad8341';
const prefix164Sha256 = '55c2e7abbae3cdba828c41a48ed759d457079d0021fe21fc2a1ebf7a08e2e231';
const prefix165Sha256 = '3b685a291fdbfa4ae0fd66b8b4744116598a81e236e8f449facc89714802a807';

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

function assertHistoricalPrefixes(migrationBudgets) {
  assert.ok(migrationBudgets.length >= 165);
  assert.equal(sha256(stableJson(migrationBudgets.slice(0, 163))), prefix163Sha256);
  assert.equal(sha256(stableJson(migrationBudgets.slice(0, 164))), prefix164Sha256);
  assert.equal(sha256(stableJson(migrationBudgets.slice(0, 165))), prefix165Sha256);
}

function syntheticEntry167() {
  return Object.freeze({
    from: 'services',
    to: 'shared',
    additionalStatements: 1,
    owner: 'synthetic-append-safe-proof',
    reviewedAt: '2099-01-01',
    reviewBy: '2099-04-01',
    fromFile: 'esm/native/services/synthetic_entry_167.ts',
    companionImport: {
      toFile: 'esm/shared/synthetic_companion_167.ts',
      kind: 'value',
      importedSymbols: ['SYNTHETIC_COMPANION_167'],
      syntax: 'static-import',
    },
    removedImport: {
      toFile: facadeRel,
      kind: 'value',
      importedSymbols: ['SYNTHETIC_LEGACY_167'],
      syntax: 'static-import',
    },
    addedImport: {
      toFile: 'esm/shared/synthetic_owner_167.ts',
      kind: 'value',
      importedSymbols: ['SYNTHETIC_OWNER_167'],
      syntax: 'static-import',
    },
    reason: 'In-memory append-safe proof only.',
    removalCondition: 'Remove the in-memory proof after the assertion.',
  });
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

test('Ledger Entries 164-165 and Prefixes 163-165 remain exact and append-safe for Entry 167', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.ok(baseline.migrationBudgets.length >= 165);
  assertHistoricalPrefixes(baseline.migrationBudgets);

  const entries = baseline.migrationBudgets.slice(163, 165);
  assert.deepEqual(
    entries.map(entry => ({
      from: entry.from,
      to: entry.to,
      fromFile: entry.fromFile,
      companionFile: entry.companionImport.toFile,
      companionSymbols: entry.companionImport.importedSymbols,
      addedFile: entry.addedImport.toFile,
      addedSymbols: entry.addedImport.importedSymbols,
      removedFile: entry.removedImport.toFile,
      removedSymbols: entry.removedImport.importedSymbols,
      additionalStatements: entry.additionalStatements,
      owner: entry.owner,
      reviewedAt: entry.reviewedAt,
      reviewBy: entry.reviewBy,
      removalCondition: entry.removalCondition,
    })),
    [
      {
        from: 'features',
        to: 'shared',
        fromFile: boundaryRel,
        companionFile: unitsRel,
        companionSymbols: ['mToCm'],
        addedFile: ownerRel,
        addedSymbols: [geometryPolicySymbol],
        removedFile: facadeRel,
        removedSymbols: [compatibilitySymbol, 'mToCm'],
        additionalStatements: 1,
        owner: 'dimension-ownership-migration',
        reviewedAt: '2026-07-28',
        reviewBy: '2026-10-18',
        removalCondition:
          'Remove this entry when a reviewed Interior Tab defaults composition seam eliminates the extra Interior Fittings owner statement without reintroducing the legacy facade or a direct shared owner import in UI.',
      },
      {
        from: 'features',
        to: 'shared',
        fromFile: boundaryRel,
        companionFile: ownerRel,
        companionSymbols: [geometryPolicySymbol],
        addedFile: unitsRel,
        addedSymbols: ['mToCm'],
        removedFile: facadeRel,
        removedSymbols: [compatibilitySymbol, 'mToCm'],
        additionalStatements: 1,
        owner: 'dimension-ownership-migration',
        reviewedAt: '2026-07-28',
        reviewBy: '2026-10-18',
        removalCondition:
          'Remove this entry when a reviewed Interior Tab defaults composition seam eliminates the extra units statement without reintroducing the legacy facade, numeric conversion literals, or a direct shared import in UI.',
      },
    ]
  );

  const historicalPrefix166 = structuredClone(baseline.migrationBudgets.slice(0, 166));
  const withEntry167 = [...historicalPrefix166, syntheticEntry167()];
  assert.equal(withEntry167.length, 167);
  assert.doesNotThrow(() => assertHistoricalPrefixes(withEntry167));

  const withMutatedEntry165 = structuredClone(historicalPrefix166);
  withMutatedEntry165[164].owner = 'mutated-owner-probe';
  assert.throws(() => assertHistoricalPrefixes(withMutatedEntry165));
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
