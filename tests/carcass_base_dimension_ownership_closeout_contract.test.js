import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';
import { DIMENSION_COMPOSITION_CONTRACTS } from '../tools/wp_dimension_composition_contract_manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';

const plinthOwnerRel = 'esm/shared/dimensions/base_plinth_policy.ts';
const legOwnerRel = 'esm/shared/dimensions/base_leg_policy.ts';
const platformOwnerRel = 'esm/shared/dimensions/base_platform_render_policy.ts';
const chestOwnerRel = 'esm/shared/dimensions/chest_structural_policy.ts';
const declarativeCompositionOwners = new Set(DIMENSION_COMPOSITION_CONTRACTS.map(contract => contract.owner));

const facadeAbsolute = path.join(root, facadeRel);

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
  'esm/native/builder/corner_connector_emit_shell_base.ts': Object.freeze(['BASE_PLINTH_POLICY']),
  'esm/native/builder/corner_wing_carcass_shell_floor_base.ts': Object.freeze(['BASE_PLINTH_POLICY']),
  'esm/native/features/base_plinth_support.ts': Object.freeze([
    'BASE_PLINTH_POLICY',
    'basePlinthCentimetersToMeters',
    'basePlinthMetersToCentimeters',
  ]),
  'esm/shared/dimensions/sketch_box_preview_policy.ts': Object.freeze(['BASE_PLINTH_POLICY']),
});

const expectedLegInventory = Object.freeze({
  'esm/native/builder/corner_connector_emit_shell_base.ts': Object.freeze(['BASE_LEG_LAYOUT_POLICY']),
  'esm/native/features/base_leg_support.ts': Object.freeze([
    'BASE_LEG_DIMENSIONS',
    'DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM',
    'DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM',
  ]),
  'esm/shared/dimensions/corner_system_policy.ts': Object.freeze(['BASE_LEG_LAYOUT_POLICY']),
});

const expectedPlatformInventory = Object.freeze({
  'esm/native/builder/corner_connector_emit_shell_base.ts': Object.freeze(['BASE_PLATFORM_RENDER_POLICY']),
  'esm/native/builder/corner_state_normalize_layout.ts': Object.freeze(['BASE_PLATFORM_RENDER_POLICY']),
  'esm/native/builder/corner_wing_carcass_shell_floor_base.ts': Object.freeze([
    'BASE_PLATFORM_RENDER_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_visuals_adornments_normalize.ts': Object.freeze([
    'BASE_PLATFORM_RENDER_POLICY',
  ]),
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
    if (declarativeCompositionOwners.has(fileRel)) continue;
    assert.equal(
      dependency.syntax,
      'static-import',
      `${fileRel} must use a direct static import from ${ownerRel}`
    );
    result[fileRel] = dependency.importedSymbols;

    for (const binding of dependency.bindings) {
      assert.equal(
        binding.importedName === binding.localName,
        true,
        `${fileRel} aliases ${binding.importedName}`
      );
    }
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
}

test('Base Plinth, Base Leg, and Base Platform focused-owner inventories are exact', () => {
  assert.deepEqual(ownerInventory(plinthOwnerRel), expectedPlinthInventory);
  assert.deepEqual(ownerInventory(legOwnerRel), expectedLegInventory);
  assert.deepEqual(ownerInventory(platformOwnerRel), expectedPlatformInventory);
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
