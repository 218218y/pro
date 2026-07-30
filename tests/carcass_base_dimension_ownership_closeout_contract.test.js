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
const plinthOwnerRel = 'esm/shared/dimensions/base_plinth_policy.ts';
const legOwnerRel = 'esm/shared/dimensions/base_leg_policy.ts';
const platformOwnerRel = 'esm/shared/dimensions/base_platform_render_policy.ts';
const chestOwnerRel = 'esm/shared/dimensions/chest_structural_policy.ts';
const runtimeDefaultStateOwnerRel = 'esm/shared/dimensions/runtime_default_state_dimension_policy.ts';
const facadeAbsolute = path.join(root, facadeRel);
const publicDimensionsAbsolute = path.join(root, publicDimensionsRel);
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

const expectedPlinthInventory = Object.freeze({
  'esm/native/builder/core_carcass_shared.ts': Object.freeze(['BASE_PLINTH_POLICY']),
  'esm/native/builder/corner_connector_emit_shell_base.ts': Object.freeze(['BASE_PLINTH_POLICY']),
  'esm/native/builder/corner_wing_carcass_shell_floor_base.ts': Object.freeze(['BASE_PLINTH_POLICY']),
  'esm/native/builder/visuals_chest_mode_build.ts': Object.freeze(['BASE_PLINTH_POLICY']),
  'esm/native/features/base_plinth_support.ts': Object.freeze([
    'BASE_PLINTH_POLICY',
    'basePlinthCentimetersToMeters',
    'basePlinthMetersToCentimeters',
  ]),
  [runtimeDefaultStateOwnerRel]: Object.freeze(['BASE_PLINTH_POLICY']),
  'esm/native/services/canvas_picking_split_hover_preview_line.ts': Object.freeze(['BASE_PLINTH_POLICY']),
  'esm/shared/dimensions/sketch_box_preview_policy.ts': Object.freeze(['BASE_PLINTH_POLICY']),
  [facadeRel]: Object.freeze(['BASE_PLINTH_POLICY']),
});

const expectedLegInventory = Object.freeze({
  'esm/native/builder/core_carcass_shared.ts': Object.freeze(['BASE_LEG_LAYOUT_POLICY']),
  'esm/native/builder/corner_connector_emit_shell_base.ts': Object.freeze(['BASE_LEG_LAYOUT_POLICY']),
  'esm/native/builder/visuals_chest_mode_build.ts': Object.freeze(['BASE_LEG_LAYOUT_POLICY']),
  'esm/native/features/base_leg_support.ts': Object.freeze([
    'BASE_LEG_DIMENSIONS',
    'DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM',
    'DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM',
  ]),
  [runtimeDefaultStateOwnerRel]: Object.freeze(['BASE_LEG_DIMENSIONS']),
  'esm/shared/dimensions/corner_system_policy.ts': Object.freeze(['BASE_LEG_LAYOUT_POLICY']),
  [facadeRel]: Object.freeze(['BASE_LEG_DIMENSIONS', 'BASE_LEG_LAYOUT_POLICY']),
});

const expectedPlatformInventory = Object.freeze({
  'esm/native/builder/core_carcass_shared.ts': Object.freeze(['BASE_PLATFORM_RENDER_POLICY']),
  'esm/native/builder/corner_connector_emit_shell_base.ts': Object.freeze(['BASE_PLATFORM_RENDER_POLICY']),
  'esm/native/builder/corner_state_normalize_layout.ts': Object.freeze(['BASE_PLATFORM_RENDER_POLICY']),
  'esm/native/builder/corner_wing_carcass_shell_floor_base.ts': Object.freeze([
    'BASE_PLATFORM_RENDER_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_visuals_adornments_normalize.ts': Object.freeze([
    'BASE_PLATFORM_RENDER_POLICY',
  ]),
  'esm/native/builder/visuals_chest_mode_build.ts': Object.freeze(['BASE_PLATFORM_RENDER_POLICY']),
  'esm/native/builder/visuals_chest_mode_inputs.ts': Object.freeze(['BASE_PLATFORM_RENDER_POLICY']),
  'esm/native/services/canvas_picking_sketch_box_content_commit_adornments.ts': Object.freeze([
    'BASE_PLATFORM_RENDER_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_surface_preview_adornments.ts': Object.freeze([
    'BASE_PLATFORM_RENDER_POLICY',
  ]),
  [legOwnerRel]: Object.freeze([
    'BASE_PLATFORM_RENDER_POLICY',
    'DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM',
    'DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM',
  ]),
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
  else if (cleanSpecifier.startsWith('.')) {
    raw = path.resolve(path.dirname(fromFile), cleanSpecifier);
  } else return null;

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
    const approvedCompositionReexport =
      fileRel === runtimeDefaultStateOwnerRel &&
      ((ownerRel === plinthOwnerRel &&
        dependency.importedSymbols.length === 1 &&
        dependency.importedSymbols[0] === 'BASE_PLINTH_POLICY') ||
        (ownerRel === legOwnerRel &&
          dependency.importedSymbols.length === 1 &&
          dependency.importedSymbols[0] === 'BASE_LEG_DIMENSIONS'));
    assert.equal(
      dependency.syntax,
      approvedCompositionReexport ? 'static-re-export' : 'static-import',
      `${fileRel} must use its reviewed statement form from ${ownerRel}`
    );
    result[fileRel] = dependency.importedSymbols;

    for (const binding of dependency.bindings) {
      if (approvedCompositionReexport) {
        assert.equal(binding.localName, null, `${fileRel} must not create a local owner alias`);
        assert.equal(
          binding.importedName === binding.exportedName,
          true,
          `${fileRel} must preserve ${binding.importedName} identity`
        );
        continue;
      }
      const approvedFacadeOwnerAlias =
        fileRel === facadeRel &&
        ((binding.importedName === 'BASE_LEG_DIMENSIONS' &&
          binding.localName === 'BASE_LEG_DIMENSIONS_OWNER') ||
          (binding.importedName === 'CHEST_STRUCTURAL_DIMENSIONS' &&
            binding.localName === 'CHEST_STRUCTURAL_DIMENSIONS_OWNER'));
      assert.equal(
        binding.importedName === binding.localName || approvedFacadeOwnerAlias,
        true,
        `${fileRel} aliases ${binding.importedName}`
      );
    }
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
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

test('CARCASS_BASE_DIMENSIONS has no production consumer or facade/barrel bypass', () => {
  const occurrenceFiles = esmSourceFiles
    .filter(file => /\bCARCASS_BASE_DIMENSIONS\b/u.test(sourceFor(file)))
    .map(rel)
    .sort();
  assert.deepEqual(occurrenceFiles, [facadeRel]);

  const violations = [];
  const compatibilityPaths = [];
  for (const file of esmSourceFiles) {
    const fileRel = rel(file);
    if (fileRel !== facadeRel) {
      walkAst(sourceFileFor(file), node => {
        if (identifierName(node) === 'CARCASS_BASE_DIMENSIONS') {
          violations.push({ file: fileRel, kind: node.type, symbol: 'CARCASS_BASE_DIMENSIONS' });
        }
        const pathValue = memberPath(node);
        if (pathValue?.includes('CARCASS_BASE_DIMENSIONS.')) {
          violations.push({ file: fileRel, kind: 'member-chain', symbol: pathValue });
        }
      });
    }

    const inspection = inspectCompatibilitySymbolAccess({
      file,
      source: sourceFor(file),
      symbol: 'CARCASS_BASE_DIMENSIONS',
    });
    violations.push(...inspection.violations);
    compatibilityPaths.push(...inspection.approvedProjections);
  }

  assert.deepEqual(violations, []);
  assert.deepEqual(compatibilityPaths, [publicDimensionsRel]);

  for (const apiRel of [runtimeApiRel, servicesApiRel]) {
    const source = sourceFor(path.join(root, apiRel));
    const exports = collectNamedModuleExports(apiRel, source).map(entry => entry.exportedName);
    assert.equal(exports.includes('CARCASS_BASE_DIMENSIONS'), false, apiRel);
    assert.doesNotMatch(source, /\bCARCASS_BASE_DIMENSIONS\b/u);
  }
});

test('BASE_LEG_DIMENSIONS cannot be consumed through either compatibility path', () => {
  const violations = [];
  const compatibilityPaths = [];
  for (const file of esmSourceFiles) {
    const inspection = inspectCompatibilitySymbolAccess({
      file,
      source: sourceFor(file),
      symbol: 'BASE_LEG_DIMENSIONS',
    });
    violations.push(...inspection.violations);
    compatibilityPaths.push(...inspection.approvedProjections);
  }
  assert.deepEqual(violations, []);
  assert.deepEqual(compatibilityPaths, [publicDimensionsRel]);
});

test('compatibility targets resolve explicit, extensionless, directory-index, runtime-extension, and alias paths canonically', () => {
  const probeFile = path.join(root, 'esm/native/services/__carcass_base_compatibility_probe.ts');
  const publicBarrelSpecifiers = [
    '../features/dimensions/index.js',
    '../features/dimensions/index.ts',
    '../features/dimensions/index',
    '../features/dimensions',
    '../features/dimensions/index.mjs',
    '../features/dimensions/index.cjs',
    '../features/./dimensions/../dimensions/index?compatibility#guard',
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

test('BASE_LEG_DIMENSIONS compatibility guard rejects named, aliased, broad, re-exported, and dynamic access', () => {
  const probeFile = path.join(root, 'esm/native/services/__carcass_base_compatibility_probe.ts');
  const cases = [
    {
      name: 'named import from public barrel',
      syntax: 'static-import',
      source:
        "import { BASE_LEG_DIMENSIONS } from '../features/dimensions/index.js';\nexport const value = BASE_LEG_DIMENSIONS.defaults.heightCm;",
    },
    {
      name: 'aliased import from public barrel',
      syntax: 'static-import',
      source:
        "import { BASE_LEG_DIMENSIONS as LEGS } from '../features/dimensions/index.js';\nexport const value = LEGS.defaults.heightCm;",
    },
    {
      name: 'namespace import from public barrel',
      syntax: 'static-import',
      source:
        "import * as dimensions from '../features/dimensions/index.js';\nexport const value = dimensions.BASE_LEG_DIMENSIONS.defaults.heightCm;",
    },
    {
      name: 'namespace destructuring from public barrel',
      syntax: 'static-import',
      source:
        "import * as dimensions from '../features/dimensions/index.js';\nconst { BASE_LEG_DIMENSIONS } = dimensions;\nexport const value = BASE_LEG_DIMENSIONS.defaults.heightCm;",
    },
    {
      name: 'named re-export from public barrel',
      syntax: 'static-re-export',
      source: "export { BASE_LEG_DIMENSIONS } from '../features/dimensions/index.js';",
    },
    {
      name: 'wildcard re-export from public barrel',
      syntax: 'static-re-export',
      source: "export * from '../features/dimensions/index.js';",
    },
    {
      name: 'dynamic import from public barrel',
      syntax: 'dynamic-import',
      source:
        "const dimensions = await import('../features/dimensions/index.js');\nexport const value = dimensions.BASE_LEG_DIMENSIONS.defaults.heightCm;",
    },
    {
      name: 'dynamic destructuring from public barrel',
      syntax: 'dynamic-import',
      source:
        "const { BASE_LEG_DIMENSIONS } = await import('../features/dimensions/index.js');\nexport const value = BASE_LEG_DIMENSIONS.defaults.heightCm;",
    },
    {
      name: 'wildcard bridge from legacy facade',
      syntax: 'static-re-export',
      source: "export * from '../../shared/wardrobe_dimension_tokens_shared.js';",
    },
    {
      name: 'extensionless named import from public barrel index',
      syntax: 'static-import',
      source:
        "import { BASE_LEG_DIMENSIONS } from '../features/dimensions/index';\nexport const value = BASE_LEG_DIMENSIONS.defaults.heightCm;",
    },
    {
      name: 'extensionless aliased import from public barrel index',
      syntax: 'static-import',
      source:
        "import { BASE_LEG_DIMENSIONS as LEGS } from '../features/dimensions/index';\nexport const value = LEGS.defaults.heightCm;",
    },
    {
      name: 'directory named import from public barrel',
      syntax: 'static-import',
      source:
        "import { BASE_LEG_DIMENSIONS } from '../features/dimensions';\nexport const value = BASE_LEG_DIMENSIONS.defaults.heightCm;",
    },
    {
      name: 'extensionless namespace import from public barrel index',
      syntax: 'static-import',
      source:
        "import * as dimensions from '../features/dimensions/index';\nexport const value = dimensions.BASE_LEG_DIMENSIONS.defaults.heightCm;",
    },
    {
      name: 'extensionless named re-export from public barrel index',
      syntax: 'static-re-export',
      source: "export { BASE_LEG_DIMENSIONS } from '../features/dimensions/index';",
    },
    {
      name: 'directory wildcard re-export from public barrel',
      syntax: 'static-re-export',
      source: "export * from '../features/dimensions';",
    },
    {
      name: 'extensionless named import from legacy facade',
      syntax: 'static-import',
      source:
        "import { BASE_LEG_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared';\nexport const value = BASE_LEG_DIMENSIONS.defaults.heightCm;",
    },
  ];

  for (const probe of cases) {
    const inspection = inspectCompatibilitySymbolAccess({
      file: probeFile,
      source: probe.source,
      symbol: 'BASE_LEG_DIMENSIONS',
    });
    assert.deepEqual(inspection.approvedProjections, [], probe.name);
    assert.equal(inspection.violations.length, 1, probe.name);
    assert.equal(inspection.violations[0].syntax, probe.syntax, probe.name);
  }

  const aliasInspection = inspectCompatibilitySymbolAccess({
    file: probeFile,
    source:
      "import { BASE_LEG_DIMENSIONS as LEGS } from '../features/dimensions/index';\nexport const value = LEGS.defaults.heightCm;",
    symbol: 'BASE_LEG_DIMENSIONS',
  });
  assert.deepEqual(aliasInspection.violations[0].bindings, [
    {
      importedName: 'BASE_LEG_DIMENSIONS',
      localName: 'LEGS',
      exportedName: null,
    },
  ]);
});

test('Base Plinth, Base Leg, and Base Platform focused-owner inventories are exact', () => {
  assert.deepEqual(ownerInventory(plinthOwnerRel), expectedPlinthInventory);
  assert.deepEqual(ownerInventory(legOwnerRel), expectedLegInventory);
  assert.deepEqual(ownerInventory(platformOwnerRel), expectedPlatformInventory);
});

test('Chest Structural aggregate is definition/facade-only while focused subpolicies remain separate', () => {
  const imports = [];
  for (const file of esmSourceFiles) {
    for (const dependency of analysisFor(file).imports) {
      if (!dependency.importedSymbols.includes('CHEST_STRUCTURAL_DIMENSIONS')) continue;
      imports.push({
        file: rel(file),
        specifier: dependency.specifier,
        kind: dependency.kind,
        syntax: dependency.syntax,
        importedSymbols: dependency.importedSymbols,
        bindings: dependency.bindings,
      });
    }
  }
  assert.deepEqual(imports, [
    {
      file: facadeRel,
      specifier: './dimensions/chest_structural_policy.js',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['CHEST_STRUCTURAL_DIMENSIONS'],
      bindings: [
        {
          importedName: 'CHEST_STRUCTURAL_DIMENSIONS',
          localName: 'CHEST_STRUCTURAL_DIMENSIONS_OWNER',
          exportedName: null,
        },
      ],
    },
  ]);
});

test('Carcass Base owners have only their reviewed dependencies and no facade back-edge', () => {
  const expectedTargets = new Map([
    [plinthOwnerRel, ['./units.js']],
    [platformOwnerRel, ['./units.js']],
    [legOwnerRel, ['./base_platform_render_policy.js', './units.js']],
    [chestOwnerRel, ['./units.js']],
  ]);

  for (const [ownerRel, expectedSpecifiers] of expectedTargets) {
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

  const legOwner = sourceFileFor(path.join(root, legOwnerRel));
  const layout = findVariableDeclarator(legOwner, 'BASE_LEG_LAYOUT_POLICY');
  const layoutProperties = frozenObjectProperties(layout.init);
  const platform = layoutProperties.find(property => identifierName(property.key) === 'platform');
  assert.equal(identifierName(platform?.value), 'BASE_PLATFORM_RENDER_POLICY');
});

test('Chest Structural aggregate is a direct focused-policy projection without copied values', () => {
  const sourceFile = sourceFileFor(path.join(root, chestOwnerRel));
  const declaration = findVariableDeclarator(sourceFile, 'CHEST_STRUCTURAL_DIMENSIONS');
  const properties = frozenObjectProperties(declaration.init);
  assert.deepEqual(
    properties.map(property => [identifierName(property.key), memberPath(property.value)]),
    [
      ['backThicknessM', 'CHEST_SHELL_POLICY.backThicknessM'],
      ['backInsetM', 'CHEST_SHELL_POLICY.backInsetM'],
      ['backPanelWidthClearanceM', 'CHEST_SHELL_POLICY.backPanelWidthClearanceM'],
      ['backPanelHeightClearanceM', 'CHEST_SHELL_POLICY.backPanelHeightClearanceM'],
      ['drawerGapM', 'CHEST_DRAWER_GEOMETRY_POLICY.drawerGapM'],
      ['drawerWidthClearanceM', 'CHEST_DRAWER_GEOMETRY_POLICY.drawerWidthClearanceM'],
      ['drawerFrontThicknessM', 'CHEST_DRAWER_GEOMETRY_POLICY.drawerFrontThicknessM'],
      ['drawerShadowLineThicknessM', 'CHEST_DRAWER_GEOMETRY_POLICY.drawerShadowLineThicknessM'],
      ['drawerBoxWidthClearanceM', 'CHEST_DRAWER_GEOMETRY_POLICY.drawerBoxWidthClearanceM'],
      ['drawerBoxHeightClearanceM', 'CHEST_DRAWER_GEOMETRY_POLICY.drawerBoxHeightClearanceM'],
      ['drawerBoxDepthClearanceM', 'CHEST_DRAWER_GEOMETRY_POLICY.drawerBoxDepthClearanceM'],
      ['connectorDepthM', 'CHEST_CONNECTOR_POLICY.connectorDepthM'],
      ['connectorBackInsetM', 'CHEST_CONNECTOR_POLICY.connectorBackInsetM'],
      ['connectorWidthClearanceM', 'CHEST_CONNECTOR_POLICY.connectorWidthClearanceM'],
      ['connectorHeightClearanceM', 'CHEST_CONNECTOR_POLICY.connectorHeightClearanceM'],
      ['openOffsetZM', 'CHEST_MOTION_POLICY.openOffsetZM'],
      ['wheels', 'CHEST_CASTER_RENDER_POLICY'],
    ]
  );

  const forbiddenNodes = [];
  walkAst(declaration.init, node => {
    if (
      node?.type === 'SpreadElement' ||
      (node?.type === 'Literal' && typeof node.value === 'number') ||
      (node?.type === 'CallExpression' && node !== declaration.init) ||
      (node?.type === 'ObjectExpression' && node !== declaration.init.arguments[0])
    ) {
      forbiddenNodes.push(node.type);
    }
  });
  assert.deepEqual(forbiddenNodes, []);
});

test('public Carcass Base compatibility views remain direct frozen owner projections', () => {
  const source = sourceFor(facadeAbsolute);
  const sourceFile = sourceFileFor(facadeAbsolute);
  assertDirectLegacyView(sourceFile, 'BASE_LEG_DIMENSIONS', 'BASE_LEG_DIMENSIONS_OWNER');
  assertDirectLegacyView(sourceFile, 'BASE_PLINTH_DIMENSIONS', 'BASE_PLINTH_POLICY');
  assertDirectLegacyView(sourceFile, 'BASE_LEG_LAYOUT_DIMENSIONS', 'BASE_LEG_LAYOUT_POLICY');
  assertDirectLegacyView(sourceFile, 'CHEST_STRUCTURAL_DIMENSIONS', 'CHEST_STRUCTURAL_DIMENSIONS_OWNER');

  const aggregate = findVariableDeclarator(sourceFile, 'CARCASS_BASE_DIMENSIONS');
  assert.ok(aggregate);
  assert.equal(aggregate.parent?.kind, 'const');
  assert.equal(aggregate.parent?.parent?.type, 'ExportNamedDeclaration');
  const properties = frozenObjectProperties(aggregate.init);
  assert.deepEqual(
    properties.map(property => [identifierName(property.key), identifierName(property.value)]),
    [
      ['plinth', 'BASE_PLINTH_DIMENSIONS'],
      ['legs', 'BASE_LEG_LAYOUT_DIMENSIONS'],
      ['chest', 'CHEST_STRUCTURAL_DIMENSIONS'],
    ]
  );

  const forbiddenNodes = [];
  walkAst(aggregate.init, node => {
    if (
      node?.type === 'SpreadElement' ||
      (node?.type === 'Literal' && typeof node.value === 'number') ||
      (node?.type === 'CallExpression' && node !== aggregate.init) ||
      (node?.type === 'ObjectExpression' && node !== aggregate.init.arguments[0])
    ) {
      forbiddenNodes.push(node.type);
    }
  });
  assert.deepEqual(forbiddenNodes, []);

  const valueExports = new Set(
    collectNamedModuleExports(facadeRel, source)
      .filter(entry => entry.kind === 'value')
      .map(entry => entry.exportedName)
  );
  assert.equal(valueExports.has('CARCASS_BASE_DIMENSIONS'), true);
  assert.equal(valueExports.has('BASE_LEG_DIMENSIONS'), true);
});
