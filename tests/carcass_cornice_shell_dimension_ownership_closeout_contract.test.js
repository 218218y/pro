import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const runtimeApiRel = 'esm/native/runtime/api.ts';
const servicesApiRel = 'esm/native/services/api.ts';
const servicesBaseApiRel = 'esm/native/services/api_runtime_base_surface.ts';
const corniceOwnerRel = 'esm/shared/dimensions/carcass_cornice_render_policy.ts';
const shellOwnerRel = 'esm/shared/dimensions/carcass_shell_policy.ts';
const shellIdentityReexportOwners = new Set([
  'esm/shared/dimensions/core_carcass_dimension_policy.ts',
  'esm/shared/dimensions/split_hover_preview_line_dimension_policy.ts',
]);
const facadeAbsolute = path.join(root, facadeRel);
const publicDimensionsAbsolute = path.join(root, publicDimensionsRel);
const corniceOwnerAbsolute = path.join(root, corniceOwnerRel);
const shellOwnerAbsolute = path.join(root, shellOwnerRel);
const sourceFileExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const runtimeExtensionCandidates = Object.freeze({
  '.js': Object.freeze(['.ts', '.tsx', '.mts']),
  '.mjs': Object.freeze(['.mts', '.ts', '.tsx']),
  '.cjs': Object.freeze(['.cts', '.ts', '.tsx']),
});
const esmSourceFiles = listSourceFiles(path.join(root, 'esm'));
const sourceCache = new Map();
const sourceFileCache = new Map();
const analysisCache = new Map();

const expectedCorniceInventory = Object.freeze({
  'esm/native/builder/corner_connector_cornice_profile.ts': Object.freeze([
    'CARCASS_CORNICE_ANGLE_POLICY',
    'CARCASS_CORNICE_RENDER_POLICY',
  ]),
  'esm/native/builder/corner_connector_cornice_shared.ts': Object.freeze(['CARCASS_CORNICE_COMMON_POLICY']),
  'esm/native/builder/corner_connector_cornice_wave.ts': Object.freeze(['CARCASS_CORNICE_RENDER_POLICY']),
  'esm/native/builder/corner_wing_cornice_path.ts': Object.freeze(['CARCASS_CORNICE_RENDER_POLICY']),
  'esm/native/builder/corner_wing_cornice_profile.ts': Object.freeze(['CARCASS_CORNICE_RENDER_POLICY']),
  'esm/native/builder/corner_wing_cornice_wave.ts': Object.freeze(['CARCASS_CORNICE_RENDER_POLICY']),
  'esm/native/builder/core_carcass_cornice.ts': Object.freeze([
    'CARCASS_CORNICE_ANGLE_POLICY',
    'CARCASS_CORNICE_RENDER_POLICY',
  ]),
  [facadeRel]: Object.freeze(['CARCASS_CORNICE_RENDER_POLICY']),
});

const expectedShellInventory = Object.freeze({
  'esm/native/builder/carcass_pipeline.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  'esm/shared/dimensions/core_carcass_dimension_policy.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  'esm/native/builder/core_carcass_shell.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  'esm/native/builder/corner_wing_carcass_shell_metrics.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  'esm/native/builder/corner_wing_cornice_path.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  'esm/native/builder/corner_wing_cornice_profile.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  'esm/native/builder/corner_wing_cornice_wave.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  'esm/native/builder/module_loop_pipeline_hex_cell.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  'esm/native/builder/module_loop_pipeline_module_depth.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  'esm/shared/dimensions/split_hover_preview_line_dimension_policy.ts': Object.freeze([
    'CARCASS_SHELL_DIMENSIONS',
  ]),
  'esm/shared/dimensions/carcass_interior_policy.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  'esm/shared/dimensions/corner_system_policy.ts': Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
  [facadeRel]: Object.freeze(['CARCASS_SHELL_DIMENSIONS']),
});

function listSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(absolute);
    return entry.isFile() && /\.(?:[cm]?[jt]sx?)$/u.test(entry.name) ? [absolute] : [];
  });
}

function rel(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function sourceFor(file) {
  if (!sourceCache.has(file)) sourceCache.set(file, fs.readFileSync(file, 'utf8'));
  return sourceCache.get(file);
}

function sourceFileFor(file) {
  if (!sourceFileCache.has(file)) sourceFileCache.set(file, createSourceFile(file, sourceFor(file)));
  return sourceFileCache.get(file);
}

function analysisFor(file) {
  if (!analysisCache.has(file)) analysisCache.set(file, analyzeModuleDependencies(file, sourceFor(file)));
  return analysisCache.get(file);
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
    const replacementExtensions = runtimeExtensionCandidates[extension] ?? [];
    const stem = raw.slice(0, -extension.length);
    candidates.push(...replacementExtensions.map(sourceExtension => `${stem}${sourceExtension}`));
  }

  if (fs.existsSync(raw) && fs.statSync(raw).isDirectory()) {
    candidates.push(
      ...sourceFileExtensions.map(sourceExtension => path.join(raw, `index${sourceExtension}`))
    );
  }

  const resolved = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  return resolved ? canonicalModuleTarget(resolved) : null;
}

function isTarget(fromFile, specifier, target) {
  return resolveModuleTarget(fromFile, specifier) === canonicalModuleTarget(target);
}

function isApprovedPublicWildcardProjection(file, dependency) {
  return (
    rel(file) === publicDimensionsRel &&
    isTarget(file, dependency.specifier, facadeAbsolute) &&
    dependency.kind === 'value' &&
    dependency.syntax === 'static-re-export' &&
    dependency.importedSymbols.length === 1 &&
    dependency.importedSymbols[0] === '*' &&
    dependency.exportedSymbols.length === 1 &&
    dependency.exportedSymbols[0] === '*' &&
    dependency.bindings.length === 1 &&
    dependency.bindings[0].importedName === '*' &&
    dependency.bindings[0].localName === null &&
    dependency.bindings[0].exportedName === '*'
  );
}

function inspectCompatibilitySymbolAccess({ file, source, symbol }) {
  const violations = [];
  const approvedProjections = [];
  const analysis = analyzeModuleDependencies(file, source);

  for (const dependency of analysis.imports) {
    const targetsFacade = isTarget(file, dependency.specifier, facadeAbsolute);
    const targetsPublicBarrel = isTarget(file, dependency.specifier, publicDimensionsAbsolute);
    if (!targetsFacade && !targetsPublicBarrel) continue;

    if (isApprovedPublicWildcardProjection(file, dependency)) {
      approvedProjections.push(rel(file));
      continue;
    }

    const namedSymbolAccess =
      dependency.importedSymbols.includes(symbol) ||
      dependency.bindings.some(binding => binding.importedName === symbol || binding.exportedName === symbol);
    const broadCompatibilityAccess =
      dependency.syntax === 'dynamic-import' || dependency.importedSymbols.includes('*');
    if (!namedSymbolAccess && !broadCompatibilityAccess) continue;

    violations.push({
      file: rel(file),
      target: targetsFacade ? 'legacy-facade' : 'public-dimensions-barrel',
      syntax: dependency.syntax,
      importedSymbols: dependency.importedSymbols,
      bindings: dependency.bindings,
    });
  }

  return { violations, approvedProjections };
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
  assert.equal(node.arguments[0]?.type, 'ObjectExpression');
  return node.arguments[0].properties ?? [];
}

function assertDirectLegacyView(sourceFile, name, ownerName) {
  const declaration = findVariableDeclarator(sourceFile, name);
  assert.ok(declaration, `missing ${name}`);
  assert.equal(declaration.parent?.kind, 'const');
  assert.equal(declaration.init?.type, 'CallExpression');
  assert.equal(identifierName(declaration.init.callee), 'legacyDimensionNumberView');
  assert.deepEqual((declaration.init.arguments ?? []).map(identifierName), [ownerName]);

  const forbiddenNodes = [];
  walkAst(declaration.init, node => {
    if (
      node?.type === 'SpreadElement' ||
      node?.type === 'ObjectExpression' ||
      (node?.type === 'Literal' && typeof node.value === 'number') ||
      (node?.type === 'CallExpression' && node !== declaration.init)
    ) {
      forbiddenNodes.push(node.type);
    }
  });
  assert.deepEqual(forbiddenNodes, [], name);
}

function ownerInventory(ownerRel) {
  const ownerAbsolute = path.join(root, ownerRel);
  const result = {};
  for (const file of esmSourceFiles) {
    const dependencies = analysisFor(file).imports.filter(dependency =>
      isTarget(file, dependency.specifier, ownerAbsolute)
    );
    if (!dependencies.length) continue;
    assert.equal(dependencies.length, 1, `${rel(file)} must use one ${ownerRel} statement`);
    const [dependency] = dependencies;
    assert.equal(dependency.kind, 'value', `${rel(file)} must use a value import from ${ownerRel}`);
    const fileRel = rel(file);
    const expectedSyntax = shellIdentityReexportOwners.has(fileRel) ? 'static-re-export' : 'static-import';
    assert.equal(
      dependency.syntax,
      expectedSyntax,
      `${fileRel} must use its reviewed statement form from ${ownerRel}`
    );
    assert.equal(
      dependency.bindings.every(binding =>
        expectedSyntax === 'static-re-export'
          ? binding.localName === null && binding.importedName === binding.exportedName
          : binding.importedName === binding.localName && binding.exportedName === null
      ),
      true,
      `${fileRel} must preserve unaliased ${ownerRel} identity`
    );
    result[rel(file)] = dependency.importedSymbols;
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
}

function compatibilityViolations(symbol) {
  const violations = [];
  const approvedProjections = [];
  for (const file of esmSourceFiles) {
    const inspection = inspectCompatibilitySymbolAccess({
      file,
      source: sourceFor(file),
      symbol,
    });
    violations.push(...inspection.violations);
    approvedProjections.push(...inspection.approvedProjections);
  }
  return { violations, approvedProjections };
}

test('CARCASS_CORNICE_DIMENSIONS is facade-only with no production or compatibility-path consumer', () => {
  const compatibility = compatibilityViolations('CARCASS_CORNICE_DIMENSIONS');
  assert.deepEqual(compatibility.violations, []);
  assert.deepEqual(compatibility.approvedProjections, [publicDimensionsRel]);

  const occurrenceFiles = esmSourceFiles
    .filter(file => /\bCARCASS_CORNICE_DIMENSIONS\b/u.test(sourceFor(file)))
    .map(rel)
    .sort();
  assert.deepEqual(occurrenceFiles, [facadeRel]);
  assert.equal(
    (sourceFor(facadeAbsolute).match(/\bCARCASS_CORNICE_DIMENSIONS\b/gu) ?? []).length,
    2,
    'the facade must contain only the compatibility declaration and public export'
  );

  const astViolations = [];
  for (const file of esmSourceFiles) {
    if (rel(file) === facadeRel) continue;
    walkAst(sourceFileFor(file), node => {
      if (identifierName(node) === 'CARCASS_CORNICE_DIMENSIONS') {
        astViolations.push({ file: rel(file), kind: node.type });
      }
      const pathValue = memberPath(node);
      if (pathValue?.includes('CARCASS_CORNICE_DIMENSIONS.')) {
        astViolations.push({ file: rel(file), kind: 'member-chain', path: pathValue });
      }
    });
  }
  assert.deepEqual(astViolations, []);
});

test('CARCASS_SHELL_DIMENSIONS has no legacy-facade or public-barrel import, re-export, or bypass', () => {
  const compatibility = compatibilityViolations('CARCASS_SHELL_DIMENSIONS');
  assert.deepEqual(compatibility.violations, []);
  assert.deepEqual(compatibility.approvedProjections, [publicDimensionsRel]);

  for (const apiRel of [runtimeApiRel, servicesApiRel, servicesBaseApiRel]) {
    const source = sourceFor(path.join(root, apiRel));
    const exports = collectNamedModuleExports(apiRel, source).map(entry => entry.exportedName);
    assert.equal(exports.includes('CARCASS_CORNICE_DIMENSIONS'), false, apiRel);
    assert.equal(exports.includes('CARCASS_SHELL_DIMENSIONS'), false, apiRel);
    assert.doesNotMatch(source, /\bCARCASS_(?:CORNICE|SHELL)_DIMENSIONS\b/u, apiRel);
  }

  const publicProjection = analysisFor(publicDimensionsAbsolute).imports.filter(dependency =>
    isTarget(publicDimensionsAbsolute, dependency.specifier, facadeAbsolute)
  );
  assert.deepEqual(
    publicProjection.map(({ kind, syntax, importedSymbols, exportedSymbols }) => ({
      kind,
      syntax,
      importedSymbols,
      exportedSymbols,
    })),
    [
      {
        kind: 'value',
        syntax: 'static-re-export',
        importedSymbols: ['*'],
        exportedSymbols: ['*'],
      },
    ]
  );
});

test('Cornice and Shell compatibility guards resolve aliases, extensions, and directory indexes canonically', () => {
  const probeFile = path.join(root, 'esm/native/services/__carcass_cornice_shell_closeout_probe.ts');
  const publicBarrelSpecifiers = [
    '../features/dimensions/index.js',
    '../features/dimensions/index.ts',
    '../features/dimensions/index',
    '../features/dimensions',
    '../features/dimensions/index.mjs',
    '../features/dimensions/index.cjs',
    '../features/./dimensions/../dimensions?compatibility#guard',
    '@/native/features/dimensions',
  ];
  const facadeSpecifiers = [
    '../../shared/wardrobe_dimension_tokens_shared.js',
    '../../shared/wardrobe_dimension_tokens_shared.ts',
    '../../shared/wardrobe_dimension_tokens_shared',
    '../../shared/wardrobe_dimension_tokens_shared.mjs',
    '../../shared/wardrobe_dimension_tokens_shared.cjs',
    '@/shared/wardrobe_dimension_tokens_shared',
  ];

  for (const specifier of publicBarrelSpecifiers) {
    assert.equal(resolveModuleTarget(probeFile, specifier), canonicalModuleTarget(publicDimensionsAbsolute));
  }
  for (const specifier of facadeSpecifiers) {
    assert.equal(resolveModuleTarget(probeFile, specifier), canonicalModuleTarget(facadeAbsolute));
  }
});

test('Cornice and Shell compatibility guards reject named, aliased, broad, dynamic, and bridge access', () => {
  const probeFile = path.join(root, 'esm/native/services/__carcass_cornice_shell_closeout_probe.ts');
  const cases = [
    {
      name: 'Cornice named facade import',
      symbol: 'CARCASS_CORNICE_DIMENSIONS',
      target: 'legacy-facade',
      syntax: 'static-import',
      source:
        "import { CARCASS_CORNICE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared';\nexport const value = CARCASS_CORNICE_DIMENSIONS.common.epsilonM;",
    },
    {
      name: 'Cornice aliased facade import',
      symbol: 'CARCASS_CORNICE_DIMENSIONS',
      target: 'legacy-facade',
      syntax: 'static-import',
      source:
        "import { CARCASS_CORNICE_DIMENSIONS as CORNICE } from '../../shared/wardrobe_dimension_tokens_shared.js';\nexport const value = CORNICE.common.epsilonM;",
    },
    {
      name: 'Cornice namespace public-barrel access',
      symbol: 'CARCASS_CORNICE_DIMENSIONS',
      target: 'public-dimensions-barrel',
      syntax: 'static-import',
      source:
        "import * as dimensions from '../features/dimensions';\nexport const value = dimensions.CARCASS_CORNICE_DIMENSIONS.common.epsilonM;",
    },
    {
      name: 'Cornice dynamic public-barrel access',
      symbol: 'CARCASS_CORNICE_DIMENSIONS',
      target: 'public-dimensions-barrel',
      syntax: 'dynamic-import',
      source:
        "const dimensions = await import('../features/dimensions/index');\nexport const value = dimensions.CARCASS_CORNICE_DIMENSIONS.common.epsilonM;",
    },
    {
      name: 'Cornice named facade re-export',
      symbol: 'CARCASS_CORNICE_DIMENSIONS',
      target: 'legacy-facade',
      syntax: 'static-re-export',
      source: "export { CARCASS_CORNICE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared';",
    },
    {
      name: 'Shell named facade import',
      symbol: 'CARCASS_SHELL_DIMENSIONS',
      target: 'legacy-facade',
      syntax: 'static-import',
      source:
        "import { CARCASS_SHELL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared';\nexport const value = CARCASS_SHELL_DIMENSIONS.frontInsetZM;",
    },
    {
      name: 'Shell aliased facade import',
      symbol: 'CARCASS_SHELL_DIMENSIONS',
      target: 'legacy-facade',
      syntax: 'static-import',
      source:
        "import { CARCASS_SHELL_DIMENSIONS as SHELL } from '../../shared/wardrobe_dimension_tokens_shared.js';\nexport const value = SHELL.frontInsetZM;",
    },
    {
      name: 'Shell namespace public-barrel access',
      symbol: 'CARCASS_SHELL_DIMENSIONS',
      target: 'public-dimensions-barrel',
      syntax: 'static-import',
      source:
        "import * as dimensions from '../features/dimensions/index';\nexport const value = dimensions.CARCASS_SHELL_DIMENSIONS.frontInsetZM;",
    },
    {
      name: 'Shell dynamic destructuring from public barrel',
      symbol: 'CARCASS_SHELL_DIMENSIONS',
      target: 'public-dimensions-barrel',
      syntax: 'dynamic-import',
      source:
        "const { CARCASS_SHELL_DIMENSIONS } = await import('../features/dimensions');\nexport const value = CARCASS_SHELL_DIMENSIONS.frontInsetZM;",
    },
    {
      name: 'Shell extensionless named public-barrel re-export',
      symbol: 'CARCASS_SHELL_DIMENSIONS',
      target: 'public-dimensions-barrel',
      syntax: 'static-re-export',
      source: "export { CARCASS_SHELL_DIMENSIONS } from '../features/dimensions/index';",
    },
    {
      name: 'wildcard public-barrel bridge',
      symbol: 'CARCASS_SHELL_DIMENSIONS',
      target: 'public-dimensions-barrel',
      syntax: 'static-re-export',
      source: "export * from '../features/dimensions';",
    },
    {
      name: 'wildcard facade bridge',
      symbol: 'CARCASS_CORNICE_DIMENSIONS',
      target: 'legacy-facade',
      syntax: 'static-re-export',
      source: "export * from '../../shared/wardrobe_dimension_tokens_shared';",
    },
  ];

  for (const probe of cases) {
    const inspection = inspectCompatibilitySymbolAccess({
      file: probeFile,
      source: probe.source,
      symbol: probe.symbol,
    });
    assert.deepEqual(inspection.approvedProjections, [], probe.name);
    assert.equal(inspection.violations.length, 1, probe.name);
    assert.equal(inspection.violations[0].target, probe.target, probe.name);
    assert.equal(inspection.violations[0].syntax, probe.syntax, probe.name);
  }

  const aliasInspection = inspectCompatibilitySymbolAccess({
    file: probeFile,
    source:
      "import { CARCASS_CORNICE_DIMENSIONS as CORNICE } from '../../shared/wardrobe_dimension_tokens_shared';\nexport const value = CORNICE.common.epsilonM;",
    symbol: 'CARCASS_CORNICE_DIMENSIONS',
  });
  assert.deepEqual(aliasInspection.violations[0].bindings, [
    {
      importedName: 'CARCASS_CORNICE_DIMENSIONS',
      localName: 'CORNICE',
      exportedName: null,
    },
  ]);
});

test('Carcass Cornice and Carcass Shell focused-owner inventories are exact and alias-free', () => {
  assert.deepEqual(ownerInventory(corniceOwnerRel), expectedCorniceInventory);
  assert.deepEqual(ownerInventory(shellOwnerRel), expectedShellInventory);
});

test('Cornice and Shell owners retain exact dependencies and direct frozen owner shapes', () => {
  const expectedDependencies = new Map([
    [corniceOwnerRel, ['./material_thickness_policy.js', './units.js']],
    [shellOwnerRel, ['./carcass_interior_grid_policy.js', './units.js']],
  ]);

  for (const [ownerRel, expectedSpecifiers] of expectedDependencies) {
    const ownerAbsolute = path.join(root, ownerRel);
    const analysis = analysisFor(ownerAbsolute);
    assert.deepEqual(
      [...new Set(analysis.imports.map(dependency => dependency.specifier))],
      expectedSpecifiers,
      ownerRel
    );
    assert.equal(
      analysis.imports.some(dependency => isTarget(ownerAbsolute, dependency.specifier, facadeAbsolute)),
      false,
      ownerRel
    );
    assert.deepEqual(analysis.unresolvedDynamicImports, [], ownerRel);
    assert.deepEqual(analysis.forbiddenModuleSyntax, [], ownerRel);
  }

  const corniceOwner = sourceFileFor(corniceOwnerAbsolute);
  const corniceAggregate = findVariableDeclarator(corniceOwner, 'CARCASS_CORNICE_RENDER_POLICY');
  assert.ok(corniceAggregate);
  assert.equal(corniceAggregate.parent?.kind, 'const');
  assert.equal(corniceAggregate.parent?.parent?.type, 'ExportNamedDeclaration');
  const corniceProperties = frozenObjectProperties(corniceAggregate.init);
  assert.deepEqual(
    corniceProperties.map(property => [identifierName(property.key), identifierName(property.value)]),
    [
      ['common', 'CARCASS_CORNICE_COMMON_POLICY'],
      ['wave', 'CARCASS_CORNICE_WAVE_POLICY'],
      ['profile', 'CARCASS_CORNICE_PROFILE_POLICY'],
    ]
  );

  const forbiddenCorniceNodes = [];
  walkAst(corniceAggregate.init, node => {
    if (
      node?.type === 'SpreadElement' ||
      (node?.type === 'Literal' && typeof node.value === 'number') ||
      (node?.type === 'CallExpression' && node !== corniceAggregate.init) ||
      (node?.type === 'ObjectExpression' && node !== corniceAggregate.init.arguments[0])
    ) {
      forbiddenCorniceNodes.push(node.type);
    }
  });
  assert.deepEqual(forbiddenCorniceNodes, []);

  const shellOwner = sourceFileFor(shellOwnerAbsolute);
  const shellDeclaration = findVariableDeclarator(shellOwner, 'CARCASS_SHELL_DIMENSIONS');
  assert.ok(shellDeclaration);
  assert.equal(shellDeclaration.parent?.kind, 'const');
  assert.equal(shellDeclaration.parent?.parent?.type, 'ExportNamedDeclaration');
  assert.deepEqual(
    frozenObjectProperties(shellDeclaration.init).map(property => identifierName(property.key)),
    [
      'frontInsetZM',
      'backInsetZM',
      'boardMinDimensionM',
      'boardMinDepthM',
      'bodyMinDepthM',
      'bodyMinHeightM',
      'floorCeilWidthClearanceM',
      'backPanelWidthClearanceM',
      'backPanelSegmentWidthClearanceM',
      'backPanelThicknessM',
      'backPanelZM',
      'sideDepthClearanceM',
      'sideZOffsetM',
      'internalBackInsetM',
      'drawerGridDivisions',
      'drawerSplitGridLineIndex',
    ]
  );
});

test('facade Cornice projection and direct Shell import/export preserve the public compatibility surface', () => {
  const facadeSource = sourceFor(facadeAbsolute);
  const facadeSourceFile = sourceFileFor(facadeAbsolute);
  assertDirectLegacyView(facadeSourceFile, 'CARCASS_CORNICE_DIMENSIONS', 'CARCASS_CORNICE_RENDER_POLICY');
  assert.equal(findVariableDeclarator(facadeSourceFile, 'CARCASS_SHELL_DIMENSIONS'), null);

  const focusedImports = analysisFor(facadeAbsolute).imports.filter(
    dependency =>
      isTarget(facadeAbsolute, dependency.specifier, corniceOwnerAbsolute) ||
      isTarget(facadeAbsolute, dependency.specifier, shellOwnerAbsolute)
  );
  assert.deepEqual(
    focusedImports.map(({ specifier, kind, syntax, importedSymbols, bindings }) => ({
      specifier,
      kind,
      syntax,
      importedSymbols,
      bindings,
    })),
    [
      {
        specifier: './dimensions/carcass_shell_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CARCASS_SHELL_DIMENSIONS'],
        bindings: [
          {
            importedName: 'CARCASS_SHELL_DIMENSIONS',
            localName: 'CARCASS_SHELL_DIMENSIONS',
            exportedName: null,
          },
        ],
      },
      {
        specifier: './dimensions/carcass_cornice_render_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CARCASS_CORNICE_RENDER_POLICY'],
        bindings: [
          {
            importedName: 'CARCASS_CORNICE_RENDER_POLICY',
            localName: 'CARCASS_CORNICE_RENDER_POLICY',
            exportedName: null,
          },
        ],
      },
    ]
  );

  assert.deepEqual(
    collectNamedModuleExports(facadeRel, facadeSource)
      .filter(entry =>
        ['CARCASS_CORNICE_DIMENSIONS', 'CARCASS_SHELL_DIMENSIONS'].includes(entry.exportedName)
      )
      .map(({ localName, exportedName, source, kind }) => ({
        localName,
        exportedName,
        source,
        kind,
      })),
    [
      {
        localName: 'CARCASS_SHELL_DIMENSIONS',
        exportedName: 'CARCASS_SHELL_DIMENSIONS',
        source: null,
        kind: 'value',
      },
      {
        localName: 'CARCASS_CORNICE_DIMENSIONS',
        exportedName: 'CARCASS_CORNICE_DIMENSIONS',
        source: null,
        kind: 'value',
      },
    ]
  );
});
