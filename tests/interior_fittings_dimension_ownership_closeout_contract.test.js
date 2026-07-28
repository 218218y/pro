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
const esmRoot = path.join(root, 'esm');
const boundaryRel = 'esm/native/features/interior_tab_defaults.ts';
const uiRel = 'esm/native/ui/react/tabs/interior_tab_local_state_shared.ts';
const uiHelpersRel = 'esm/native/ui/react/tabs/interior_tab_helpers.tsx';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const ownerRel = 'esm/shared/dimensions/interior_fittings_policy.ts';
const unitsRel = 'esm/shared/dimensions/units.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const manifestRel = 'tools/wp_features_public_api_manifest.json';
const auditDocRel = 'docs/layering_completion_audit.md';

const compatibilitySymbol = 'INTERIOR_FITTINGS_DIMENSIONS';
const aggregatePolicySymbol = 'INTERIOR_FITTINGS_POLICY';
const geometryPolicySymbol = 'INTERIOR_SHELF_GEOMETRY_POLICY';
const depthDefaultSymbol = 'DEFAULT_SKETCH_SHELF_DEPTH_EDIT_CM';
const boundarySpecifier = '../../../features/interior_tab_defaults.js';
const uiHelpersSpecifier = './interior_tab_helpers.js';
const facadeSpecifierFromNative = '../../shared/wardrobe_dimension_tokens_shared.js';
const publicDimensionsSpecifierFromUi = '../features/dimensions';
const ownerSpecifierFromBoundary = '../../shared/dimensions/interior_fittings_policy.js';
const unitsSpecifierFromBoundary = '../../shared/dimensions/units.js';
const publicEntry = 'interior_tab_defaults.js';
const publicFamily = 'interior_tab_defaults';

const prefix163Sha256 = '8c4c04e56a8b991d81537127adc69c5dc42b4e7ed3de4fe81258a67b01ad8341';
const prefix164Sha256 = '55c2e7abbae3cdba828c41a48ed759d457079d0021fe21fc2a1ebf7a08e2e231';
const prefix165Sha256 = '3b685a291fdbfa4ae0fd66b8b4744116598a81e236e8f449facc89714802a807';

const retirementRule =
  'Entries 164–165 remain temporary: when a future composition seam retires both entries, the same review must run the Layer proposal and explicitly attempt to lower the `features → shared` importer and value-importer ceilings from 41 to 40; retaining 41 requires separately reviewed graph evidence.';

const sourceExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const runtimeExtensionCandidates = Object.freeze({
  '.js': Object.freeze(['.ts', '.tsx', '.js', '.jsx']),
  '.mjs': Object.freeze(['.mts', '.mjs']),
  '.cjs': Object.freeze(['.cts', '.cjs']),
  '.jsx': Object.freeze(['.tsx', '.jsx']),
});

const expectedBoundaryImports = Object.freeze([
  Object.freeze({
    importKind: 'value',
    source: ownerSpecifierFromBoundary,
    specifiers: Object.freeze([
      Object.freeze({
        type: 'ImportSpecifier',
        imported: geometryPolicySymbol,
        local: geometryPolicySymbol,
      }),
    ]),
  }),
  Object.freeze({
    importKind: 'value',
    source: unitsSpecifierFromBoundary,
    specifiers: Object.freeze([
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

function listSourceFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) listSourceFiles(absolute, files);
    else if (entry.isFile() && sourceExtensions.includes(path.extname(entry.name).toLowerCase())) {
      files.push(absolute);
    }
  }
  return files.sort();
}

function relativePath(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function stripQueryHash(specifier) {
  const queryIndex = specifier.indexOf('?');
  const hashIndex = specifier.indexOf('#');
  const cutIndex =
    queryIndex === -1 ? hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
  return cutIndex === -1 ? specifier : specifier.slice(0, cutIndex);
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

const boundaryTarget = canonicalFileTarget(path.join(root, boundaryRel));
const facadeTarget = canonicalFileTarget(path.join(root, facadeRel));
const ownerTarget = canonicalFileTarget(path.join(root, ownerRel));
const publicDimensionsTarget = canonicalFileTarget(path.join(root, publicDimensionsRel));

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

function dependencyTargets(dependency, target, fromFile) {
  return resolveModuleTarget(fromFile, dependency.specifier) === target;
}

function boundaryDependenciesFor(file, source) {
  return analyzeModuleDependencies(file, source).imports.filter(dependency =>
    dependencyTargets(dependency, boundaryTarget, file)
  );
}

function collectBoundaryConsumerInventory(files) {
  const inventory = [];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const dependency of boundaryDependenciesFor(file, source)) {
      inventory.push({
        file: relativePath(file),
        specifier: dependency.specifier,
        kind: dependency.kind,
        syntax: dependency.syntax,
        importedSymbols: [...dependency.importedSymbols],
        bindings: dependency.bindings.map(binding => ({
          importedName: binding.importedName,
          localName: binding.localName,
          exportedName: binding.exportedName,
        })),
      });
    }
  }
  return inventory;
}

function isExactPublicDimensionsRoute(file, dependency) {
  return (
    relativePath(file) === publicDimensionsRel &&
    dependencyTargets(dependency, facadeTarget, file) &&
    dependency.kind === 'value' &&
    dependency.syntax === 'static-re-export' &&
    stableJson(dependency.importedSymbols) === stableJson(['*']) &&
    stableJson(dependency.exportedSymbols) === stableJson(['*'])
  );
}

function isExactFacadePolicyImport(file, dependency) {
  return (
    relativePath(file) === facadeRel &&
    dependencyTargets(dependency, ownerTarget, file) &&
    dependency.kind === 'value' &&
    dependency.syntax === 'static-import' &&
    stableJson(dependency.importedSymbols) === stableJson([aggregatePolicySymbol]) &&
    dependency.bindings.length === 1 &&
    dependency.bindings[0].importedName === aggregatePolicySymbol &&
    dependency.bindings[0].localName === aggregatePolicySymbol &&
    dependency.bindings[0].exportedName === null
  );
}

function inspectCompatibilitySource(file, source) {
  const violations = [];
  const rel = relativePath(file);
  const sourceFile = createSourceFile(file, source);
  const dependencies = analyzeModuleDependencies(file, source).imports;

  for (const dependency of dependencies) {
    const targetsFacade = dependencyTargets(dependency, facadeTarget, file);
    const targetsOwner = dependencyTargets(dependency, ownerTarget, file);
    const targetsPublicDimensions = dependencyTargets(dependency, publicDimensionsTarget, file);
    const exposesCompatibility =
      dependency.importedSymbols.includes(compatibilitySymbol) ||
      ((targetsFacade || targetsPublicDimensions) && dependency.importedSymbols.includes('*'));
    const exposesAggregatePolicy =
      dependency.importedSymbols.includes(aggregatePolicySymbol) ||
      (targetsOwner && dependency.importedSymbols.includes('*'));

    if (exposesCompatibility && !isExactPublicDimensionsRoute(file, dependency)) {
      addViolation(
        violations,
        'compatibility-consumer',
        `${rel}:${dependency.syntax}:${dependency.specifier}`
      );
    }
    if (exposesAggregatePolicy && !isExactFacadePolicyImport(file, dependency)) {
      addViolation(
        violations,
        'aggregate-policy-consumer',
        `${rel}:${dependency.syntax}:${dependency.specifier}`
      );
    }
    if (
      dependency.syntax === 'dynamic-import' &&
      (targetsFacade || targetsOwner || targetsPublicDimensions)
    ) {
      addViolation(violations, 'compatibility-dynamic-route', `${rel}:${dependency.specifier}`);
    }
  }

  if (rel !== facadeRel && rel !== ownerRel) {
    walkAst(sourceFile, node => {
      if (node?.type === 'Identifier' && node.name === compatibilitySymbol) {
        addViolation(violations, 'compatibility-symbol-reference', rel);
      }
      if (node?.type === 'Literal' && typeof node.value === 'string' && node.value === compatibilitySymbol) {
        addViolation(violations, 'compatibility-computed-reference', rel);
      }
      if (node?.type === 'Identifier' && node.name === aggregatePolicySymbol) {
        addViolation(violations, 'aggregate-policy-reference', rel);
      }
      if (
        node?.type === 'Literal' &&
        typeof node.value === 'string' &&
        node.value === aggregatePolicySymbol
      ) {
        addViolation(violations, 'aggregate-policy-computed-reference', rel);
      }
    });
  }

  return violations;
}

function inspectFacade(source) {
  const violations = [];
  const file = path.join(root, facadeRel);
  const sourceFile = createSourceFile(facadeRel, source);
  const policyImports = analyzeModuleDependencies(facadeRel, source).imports.filter(dependency =>
    dependencyTargets(dependency, ownerTarget, file)
  );
  if (
    policyImports.length !== 1 ||
    !isExactFacadePolicyImport(file, policyImports[0]) ||
    policyImports[0].specifier !== './dimensions/interior_fittings_policy.js'
  ) {
    addViolation(violations, 'facade-policy-import');
  }

  const declaration = findVariable(sourceFile, compatibilitySymbol);
  if (
    declaration?.parent?.type !== 'VariableDeclaration' ||
    declaration.parent.kind !== 'const' ||
    declaration.parent.declarations?.length !== 1 ||
    declaration.parent.parent?.type === 'ExportNamedDeclaration' ||
    declaration.id?.type !== 'Identifier' ||
    declaration.id.name !== compatibilitySymbol ||
    declaration.id.typeAnnotation
  ) {
    addViolation(violations, 'facade-compatibility-declaration');
  }
  if (
    declaration?.init?.type !== 'CallExpression' ||
    identifierName(declaration.init.callee) !== 'legacyDimensionNumberView' ||
    declaration.init.arguments?.length !== 1 ||
    declaration.init.arguments[0]?.type !== 'Identifier' ||
    declaration.init.arguments[0].name !== aggregatePolicySymbol
  ) {
    addViolation(violations, 'facade-legacy-number-view');
  }

  const exports = collectNamedModuleExports(facadeRel, source).filter(
    entry => entry.exportedName === compatibilitySymbol
  );
  if (exports.length !== 1 || exports[0].kind !== 'value') {
    addViolation(violations, 'facade-compatibility-export');
  }
  const directExportSpecifiers = (sourceFile.body ?? []).flatMap(statement =>
    statement.type === 'ExportNamedDeclaration' && !statement.source && !statement.declaration
      ? (statement.specifiers ?? []).filter(
          specifier =>
            identifierName(specifier.local) === compatibilitySymbol ||
            identifierName(specifier.exported) === compatibilitySymbol
        )
      : []
  );
  if (
    directExportSpecifiers.length !== 1 ||
    identifierName(directExportSpecifiers[0].local) !== compatibilitySymbol ||
    identifierName(directExportSpecifiers[0].exported) !== compatibilitySymbol ||
    directExportSpecifiers[0].exportKind === 'type'
  ) {
    addViolation(violations, 'facade-direct-export-shape');
  }

  return violations;
}

function inspectPublicDimensionsBarrel(source) {
  const violations = [];
  const file = path.join(root, publicDimensionsRel);
  const sourceFile = createSourceFile(publicDimensionsRel, source);
  const dependencies = analyzeModuleDependencies(publicDimensionsRel, source).imports;
  if (
    dependencies.length !== 1 ||
    !isExactPublicDimensionsRoute(file, dependencies[0]) ||
    dependencies[0].specifier !== '../../../shared/wardrobe_dimension_tokens_shared.js'
  ) {
    addViolation(violations, 'public-dimensions-route');
  }
  const body = sourceFile.body ?? [];
  if (
    body.length !== 1 ||
    body[0].type !== 'ExportAllDeclaration' ||
    body[0].exportKind === 'type' ||
    body[0].exported != null
  ) {
    addViolation(violations, 'public-dimensions-topology');
  }
  return violations;
}

function inspectManifest(manifest) {
  const violations = [];
  const publicEntries = Array.isArray(manifest.publicEntries) ? manifest.publicEntries : [];
  const families = manifest.families && typeof manifest.families === 'object' ? manifest.families : {};
  const exactEntryCount = publicEntries.filter(entry => entry === publicEntry).length;
  const alternateEntries = publicEntries.filter(
    entry => entry !== publicEntry && String(entry).includes(publicFamily)
  );
  if (exactEntryCount !== 1 || alternateEntries.length > 0) {
    addViolation(violations, 'manifest-public-entry', stableJson({ exactEntryCount, alternateEntries }));
  }

  const familyKeys = Object.keys(families).filter(key => key.includes(publicFamily));
  if (
    stableJson(familyKeys) !== stableJson([publicFamily]) ||
    stableJson(families[publicFamily]) !== stableJson([publicEntry])
  ) {
    addViolation(violations, 'manifest-family', stableJson({ familyKeys, family: families[publicFamily] }));
  }
  const familyOwners = Object.entries(families).flatMap(([family, entries]) =>
    Array.isArray(entries) && entries.includes(publicEntry) ? [family] : []
  );
  if (stableJson(familyOwners) !== stableJson([publicFamily])) {
    addViolation(violations, 'manifest-reverse-family-ownership', stableJson(familyOwners));
  }

  return violations;
}

function assertHistoricalPrefixes(migrationBudgets) {
  assert.ok(migrationBudgets.length >= 165);
  assert.equal(sha256(stableJson(migrationBudgets.slice(0, 163))), prefix163Sha256);
  assert.equal(sha256(stableJson(migrationBudgets.slice(0, 164))), prefix164Sha256);
  assert.equal(sha256(stableJson(migrationBudgets.slice(0, 165))), prefix165Sha256);
}

function syntheticEntry166() {
  return Object.freeze({
    from: 'services',
    to: 'shared',
    additionalStatements: 1,
    owner: 'synthetic-append-safe-proof',
    reviewedAt: '2099-01-01',
    reviewBy: '2099-04-01',
    fromFile: 'esm/native/services/synthetic_entry_166.ts',
    companionImport: {
      toFile: 'esm/shared/synthetic_companion_166.ts',
      kind: 'value',
      importedSymbols: ['SYNTHETIC_COMPANION_166'],
      syntax: 'static-import',
    },
    removedImport: {
      toFile: facadeRel,
      kind: 'value',
      importedSymbols: ['SYNTHETIC_LEGACY_166'],
      syntax: 'static-import',
    },
    addedImport: {
      toFile: 'esm/shared/synthetic_owner_166.ts',
      kind: 'value',
      importedSymbols: ['SYNTHETIC_OWNER_166'],
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

const esmFiles = listSourceFiles(esmRoot);

test('Interior Fittings closeout owns zero compatibility consumers and the sole boundary consumer', () => {
  const compatibilityViolations = esmFiles.flatMap(file =>
    inspectCompatibilitySource(file, fs.readFileSync(file, 'utf8')).map(violation => ({
      file: relativePath(file),
      ...violation,
    }))
  );
  assert.deepEqual(compatibilityViolations, []);

  const nativeFiles = esmFiles.filter(file => relativePath(file).startsWith('esm/native/'));
  const nativeSymbolReferences = [];
  for (const file of nativeFiles) {
    const rel = relativePath(file);
    if (rel === publicDimensionsRel) continue;
    const sourceFile = createSourceFile(file, fs.readFileSync(file, 'utf8'));
    walkAst(sourceFile, node => {
      if (
        (node?.type === 'Identifier' || node?.type === 'Literal') &&
        [compatibilitySymbol, aggregatePolicySymbol].includes(identifierName(node))
      ) {
        nativeSymbolReferences.push({ file: rel, symbol: identifierName(node) });
      }
    });
  }
  assert.deepEqual(nativeSymbolReferences, []);

  assert.deepEqual(collectBoundaryConsumerInventory(esmFiles), [
    {
      file: uiRel,
      specifier: boundarySpecifier,
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: [...expectedUiValueSymbols],
      bindings: expectedUiValueSymbols.map(symbol => ({
        importedName: symbol,
        localName: symbol,
        exportedName: null,
      })),
    },
  ]);
});

test('Interior Tab feature boundary has the exact side-effect-free topology', () => {
  assert.deepEqual(inspectBoundary(read(boundaryRel)), []);
});

test('Interior Tab UI has exactly one type import and one eight-symbol boundary import', () => {
  assert.deepEqual(inspectUiImports(read(uiRel)), []);
  assert.ok(canonicalFileTarget(path.join(root, uiHelpersRel)));
});

test('Features manifest and compatibility facade preserve their exact public routes', () => {
  assert.deepEqual(inspectManifest(JSON.parse(read(manifestRel))), []);
  assert.deepEqual(inspectFacade(read(facadeRel)), []);
  assert.deepEqual(inspectPublicDimensionsBarrel(read(publicDimensionsRel)), []);

  const facadeExports = collectNamedModuleExports(facadeRel, read(facadeRel));
  assert.equal(
    new Set(facadeExports.filter(entry => entry.kind === 'value').map(entry => entry.exportedName)).size,
    89
  );
  assert.equal(
    new Set(facadeExports.filter(entry => entry.kind === 'type').map(entry => entry.exportedName)).size,
    10
  );
});

test('Ledger Entries 164-165, Prefixes 163-165, Entry 166 append safety, and ceiling retirement stay exact', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.ok(baseline.migrationBudgets.length >= 165);
  assert.equal(new Set(baseline.migrationBudgets.slice(0, 165).map(entry => entry.fromFile)).size, 104);
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

  const historicalPrefix165 = structuredClone(baseline.migrationBudgets.slice(0, 165));
  const withEntry166 = [...historicalPrefix165, syntheticEntry166()];
  assert.equal(withEntry166.length, 166);
  assert.doesNotThrow(() => assertHistoricalPrefixes(withEntry166));

  const featuresSharedRule = baseline.rules.find(rule => rule.from === 'features' && rule.to === 'shared');
  assert.ok(featuresSharedRule);
  assert.equal(featuresSharedRule.maxImporterCount, 41);
  assert.equal(featuresSharedRule.maxValueImporterCount, 41);
  assert.ok(read(auditDocRel).includes(retirementRule));
});

test('Layer, facade dependency, and proposal counts stay at the current audited topology', () => {
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
  for (const [key, expectedImportCount] of expectedEdges) {
    const [from, to] = key.split('>');
    const edge = graph.edges.find(entry => entry.from === from && entry.to === to);
    assert.ok(edge, key);
    assert.equal(edge.importCount, expectedImportCount, key);
    if (key === 'features>shared') {
      assert.equal(edge.importerCount, 41);
      assert.equal(edge.valueImporterCount, 41);
      assert.equal(edge.valueImportCount, 67);
      assert.equal(edge.typeImporterCount, 1);
      assert.equal(edge.typeImportCount, 2);
      assert.equal(edge.dynamicImportCount, 0);
    }
  }

  const facadeDependencies = esmFiles.flatMap(file =>
    analyzeModuleDependencies(file, fs.readFileSync(file, 'utf8'))
      .imports.filter(dependency => dependencyTargets(dependency, facadeTarget, file))
      .map(dependency => ({ file, ...dependency }))
  );
  const staticFacadeImports = facadeDependencies.filter(dependency => dependency.syntax === 'static-import');
  assert.equal(new Set(staticFacadeImports.map(dependency => dependency.file)).size, 1);
  assert.equal(staticFacadeImports.length, 1);
  assert.equal(new Set(facadeDependencies.map(dependency => dependency.file)).size, 3);
  assert.equal(facadeDependencies.length, 4);

  const proposal = buildLayerContractProposal(graph, baseline, { currentDate: '2026-07-28' });
  assert.equal(proposal.reviewRequired, false);
  assert.deepEqual(proposal.diff.addedEdges, []);
  assert.deepEqual(proposal.diff.ratchetViolations, []);
  assert.deepEqual(proposal.diff.requiresFacadeDecision, []);
  assert.deepEqual(proposal.diff.migrationBudgetFailures, []);
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

test('mutation probes reject extra consumers, feature bridges, compatibility routes, and aggregate access', () => {
  const extraConsumerFile = path.join(root, 'esm/native/services/interior_defaults_probe.ts');
  const extraConsumerSource = `import { ${depthDefaultSymbol} } from '../features/interior_tab_defaults.js';\nexport const depth = ${depthDefaultSymbol};`;
  assert.equal(boundaryDependenciesFor(extraConsumerFile, extraConsumerSource).length, 1);

  const featureBridgeFile = path.join(root, 'esm/native/features/interior_defaults_api_probe.ts');
  for (const source of [
    `export { ${depthDefaultSymbol} } from './interior_tab_defaults.js';`,
    `export * from './interior_tab_defaults.js';`,
    `import { ${depthDefaultSymbol} } from './interior_tab_defaults.js';\nexport { ${depthDefaultSymbol} };`,
    `const defaults = await import('./interior_tab_defaults.js');\nexport const depth = defaults.${depthDefaultSymbol};`,
  ]) {
    assert.equal(boundaryDependenciesFor(featureBridgeFile, source).length, 1, source);
  }

  const nativeProbeFile = path.join(root, 'esm/native/builder/interior_fittings_probe.ts');
  const uiProbeFile = path.join(root, 'esm/native/ui/interior_fittings_probe.ts');
  const compatibilityProbes = [
    `import { ${compatibilitySymbol} } from '${facadeSpecifierFromNative}';\nexport const value = ${compatibilitySymbol};`,
    `import { ${compatibilitySymbol} as fittings } from '../../shared/wardrobe_dimension_tokens_shared';\nexport const value = fittings;`,
    `import * as dimensions from '${facadeSpecifierFromNative}';\nexport const value = dimensions.${compatibilitySymbol};`,
    `const dimensions = await import('${facadeSpecifierFromNative}');\nexport const value = dimensions['${compatibilitySymbol}'];`,
    `export { ${compatibilitySymbol} } from '${facadeSpecifierFromNative}';`,
    `export * from '${facadeSpecifierFromNative}';`,
    `import { ${compatibilitySymbol} } from '${facadeSpecifierFromNative}';\nexport { ${compatibilitySymbol} };`,
    `import { ${compatibilitySymbol} } from '${facadeSpecifierFromNative}';\nexport const bridge = { dimensions: ${compatibilitySymbol} };`,
    `import { ${compatibilitySymbol} } from '${facadeSpecifierFromNative}';\nexport const bridge = { ...${compatibilitySymbol} };`,
    `import { ${compatibilitySymbol} } from '${facadeSpecifierFromNative}';\nconst { shelves } = ${compatibilitySymbol};\nexport { shelves };`,
    `import { ${compatibilitySymbol} } from '${facadeSpecifierFromNative}';\nexport const shelves = ${compatibilitySymbol}['shelves'];`,
  ];
  for (const source of compatibilityProbes) {
    assert.notDeepEqual(inspectCompatibilitySource(nativeProbeFile, source), [], source);
  }

  const directoryIndexProbe = `import { ${compatibilitySymbol} } from '${publicDimensionsSpecifierFromUi}';\nexport const value = ${compatibilitySymbol};`;
  assert.notDeepEqual(inspectCompatibilitySource(uiProbeFile, directoryIndexProbe), []);

  const aggregateProbe = `import { ${aggregatePolicySymbol} } from '../../shared/dimensions/interior_fittings_policy.js';\nexport const value = ${aggregatePolicySymbol};`;
  assert.notDeepEqual(inspectCompatibilitySource(nativeProbeFile, aggregateProbe), []);
});

test('mutation probes reject manifest loss/duplication and facade compatibility drift', () => {
  const manifest = JSON.parse(read(manifestRel));
  const removedEntry = structuredClone(manifest);
  removedEntry.publicEntries = removedEntry.publicEntries.filter(entry => entry !== publicEntry);
  assertRejected(inspectManifest, removedEntry, 'manifest-public-entry', 'removed manifest entry');

  const duplicateEntry = structuredClone(manifest);
  duplicateEntry.publicEntries.push(publicEntry);
  assertRejected(inspectManifest, duplicateEntry, 'manifest-public-entry', 'duplicate manifest entry');

  const duplicateFamily = structuredClone(manifest);
  duplicateFamily.families.interior_tab_defaults_alias = [publicEntry];
  assertRejected(inspectManifest, duplicateFamily, 'manifest-family', 'duplicate manifest family');

  const alternateEntry = structuredClone(manifest);
  alternateEntry.publicEntries.push('interior_tab_defaults/index.js');
  assertRejected(inspectManifest, alternateEntry, 'manifest-public-entry', 'alternate public entry');

  const facadeSource = read(facadeRel);
  assertRejected(
    inspectFacade,
    facadeSource.replace(
      `legacyDimensionNumberView(${aggregatePolicySymbol})`,
      `legacyDimensionNumberView({ ...${aggregatePolicySymbol} })`
    ),
    'facade-legacy-number-view',
    'facade object copy'
  );
  assertRejected(
    inspectFacade,
    facadeSource.replace(`  ${compatibilitySymbol},\n`, ''),
    'facade-compatibility-export',
    'facade compatibility removal'
  );
});
