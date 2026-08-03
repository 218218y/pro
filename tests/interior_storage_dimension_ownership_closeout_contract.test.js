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
const storageOwnerRel = 'esm/shared/dimensions/interior_storage_policy.ts';
const fittingsOwnerRel = 'esm/shared/dimensions/interior_fittings_policy.ts';

const sourceFileExtensions = Object.freeze(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.jsx']);
const runtimeExtensionCandidates = Object.freeze({
  '.js': Object.freeze(['.ts', '.tsx', '.mts']),
  '.mjs': Object.freeze(['.mts', '.ts', '.tsx']),
  '.cjs': Object.freeze(['.cts', '.ts', '.tsx']),
});
const focusedPolicySymbols = new Set([
  'INTERIOR_STORAGE_GRID_POLICY',
  'INTERIOR_STORAGE_BARRIER_POLICY',
  'INTERIOR_STORAGE_PREVIEW_POLICY',
  'INTERIOR_STORAGE_CLAMP_POLICY',
  'INTERIOR_STORAGE_LAYOUT_POLICY',
  'INTERIOR_STORAGE_DEFAULTS_POLICY',
]);
const publicStorageSymbols = new Set([...focusedPolicySymbols, 'INTERIOR_STORAGE_POLICY']);
const forbiddenApiExports = new Set([...publicStorageSymbols, 'INTERIOR_FITTINGS_DIMENSIONS']);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const expectedFocusedOwnerRoutes = Object.freeze({
  'esm/native/builder/core_storage_compute_custom.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/builder/corner_wing_cell_layouts.ts': Object.freeze(['INTERIOR_STORAGE_BARRIER_POLICY']),
  'esm/native/builder/render_interior_custom_ops_layout.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
  ]),
  'esm/native/builder/render_interior_custom_ops.ts': Object.freeze(['INTERIOR_STORAGE_GRID_POLICY']),
  'esm/native/builder/render_interior_preset_ops.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/shared/dimensions/interior_rod_clearance_dimension_policy.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_contents_parts_barriers.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_LAYOUT_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_support_storage.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_CLAMP_POLICY',
    'INTERIOR_STORAGE_LAYOUT_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/shared/dimensions/preview_interior_hover_apply_dimension_policy.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/shared/dimensions/interior_layout_presets_dimension_policy.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
  ]),
  'esm/shared/dimensions/modules_configuration_defaults_dimension_policy.ts': Object.freeze([
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/shared/dimensions/stack_split_module_config_dimension_policy.ts': Object.freeze([
    'INTERIOR_STORAGE_DEFAULTS_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/shared/dimensions/interior_hover_manual_mode_dimension_policy.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_internal_drawer_existing_fittings.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_free_box_commit.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_free_box_content.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_free_box_contracts.ts': Object.freeze([
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/shared/dimensions/manual_layout_free_box_plans_dimension_policy.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_base.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_CLAMP_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_vertical_blockers.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_CLAMP_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
    'INTERIOR_STORAGE_LAYOUT_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_blockers.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_LAYOUT_POLICY',
  ]),
  'esm/shared/dimensions/sketch_box_vertical_content_occupancy_dimension_policy.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_storage.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_stack_commit_drawers.ts': Object.freeze([
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_commit_shared.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_content.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_rod.ts': Object.freeze([
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_shelf.ts': Object.freeze([
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_storage.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_neighbor_measurements.ts': Object.freeze([
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/shared/dimensions/split_hover_preview_line_dimension_policy.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
  ]),
  'esm/shared/dimensions/drawer_sketch_policy.ts': Object.freeze([
    'INTERIOR_STORAGE_CLAMP_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  [fittingsOwnerRel]: Object.freeze(['INTERIOR_STORAGE_POLICY']),
});

const expectedFocusedOwnerReExports = new Set([
  'esm/shared/dimensions/interior_layout_presets_dimension_policy.ts',
  'esm/shared/dimensions/modules_configuration_defaults_dimension_policy.ts',
  'esm/shared/dimensions/stack_split_module_config_dimension_policy.ts',
  'esm/shared/dimensions/interior_hover_manual_mode_dimension_policy.ts',
  'esm/shared/dimensions/interior_rod_clearance_dimension_policy.ts',
  'esm/shared/dimensions/manual_layout_free_box_plans_dimension_policy.ts',
  'esm/shared/dimensions/preview_interior_hover_apply_dimension_policy.ts',
  'esm/shared/dimensions/sketch_box_vertical_content_occupancy_dimension_policy.ts',
  'esm/shared/dimensions/split_hover_preview_line_dimension_policy.ts',
]);

const expectedPolicyShapes = Object.freeze({
  INTERIOR_STORAGE_GRID_POLICY: Object.freeze(['gridDivisionsDefault']),
  INTERIOR_STORAGE_BARRIER_POLICY: Object.freeze([
    'barrierHeightM',
    'barrierHeightMinM',
    'barrierHeightMaxM',
    'barrierFrontZOffsetM',
    'barrierWidthMinM',
    'barrierWidthClearanceM',
  ]),
  INTERIOR_STORAGE_PREVIEW_POLICY: Object.freeze(['previewThicknessMinM']),
  INTERIOR_STORAGE_CLAMP_POLICY: Object.freeze(['clampPadMinM', 'clampPadMaxM', 'clampPadWoodRatio']),
  INTERIOR_STORAGE_LAYOUT_POLICY: Object.freeze(['minHeightExtraM', 'minHeightWoodMultiplier']),
  INTERIOR_STORAGE_DEFAULTS_POLICY: Object.freeze(['defaultLowerShelfSlots']),
});

const aggregateProjections = Object.freeze({
  gridDivisionsDefault: 'INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault',
  barrierHeightM: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM',
  barrierHeightMinM: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightMinM',
  barrierHeightMaxM: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightMaxM',
  barrierFrontZOffsetM: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierFrontZOffsetM',
  barrierWidthMinM: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthMinM',
  barrierWidthClearanceM: 'INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthClearanceM',
  previewThicknessMinM: 'INTERIOR_STORAGE_PREVIEW_POLICY.previewThicknessMinM',
  clampPadMinM: 'INTERIOR_STORAGE_CLAMP_POLICY.clampPadMinM',
  clampPadMaxM: 'INTERIOR_STORAGE_CLAMP_POLICY.clampPadMaxM',
  clampPadWoodRatio: 'INTERIOR_STORAGE_CLAMP_POLICY.clampPadWoodRatio',
  minHeightExtraM: 'INTERIOR_STORAGE_LAYOUT_POLICY.minHeightExtraM',
  minHeightWoodMultiplier: 'INTERIOR_STORAGE_LAYOUT_POLICY.minHeightWoodMultiplier',
  defaultLowerShelfSlots: 'INTERIOR_STORAGE_DEFAULTS_POLICY.defaultLowerShelfSlots',
});

function normalizeRel(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function listSourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(absolute));
    else if (entry.isFile() && sourceFileExtensions.includes(path.extname(entry.name))) files.push(absolute);
  }
  return files;
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

function existingFile(candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function resolveModuleTarget(fromFile, specifier) {
  if (typeof specifier !== 'string') return null;
  const clean = stripQueryHash(specifier);
  if (!clean.startsWith('.')) return null;
  const rawTarget = path.resolve(path.dirname(fromFile), clean);
  const extension = path.extname(rawTarget);
  const candidates = [rawTarget];
  if (runtimeExtensionCandidates[extension]) {
    const stem = rawTarget.slice(0, -extension.length);
    for (const candidateExtension of runtimeExtensionCandidates[extension]) {
      candidates.push(`${stem}${candidateExtension}`);
    }
  } else if (!extension) {
    for (const candidateExtension of sourceFileExtensions) {
      candidates.push(`${rawTarget}${candidateExtension}`);
      candidates.push(path.join(rawTarget, `index${candidateExtension}`));
    }
  }
  return canonicalModuleTarget(existingFile(candidates) ?? rawTarget);
}

const facadeTarget = canonicalModuleTarget(path.join(root, facadeRel));
const publicDimensionsTarget = canonicalModuleTarget(path.join(root, publicDimensionsRel));
const storageOwnerTarget = canonicalModuleTarget(path.join(root, storageOwnerRel));

function dependencyTarget(fromFile, dependency) {
  return resolveModuleTarget(fromFile, dependency.specifier);
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
  const objectPath = memberPath(node.object);
  const propertyName = staticMemberName(node);
  return objectPath && propertyName ? `${objectPath}.${propertyName}` : null;
}

function unwrapObjectFreeze(node) {
  if (
    node?.type !== 'CallExpression' ||
    memberPath(node.callee) !== 'Object.freeze' ||
    node.arguments?.length !== 1
  ) {
    return null;
  }
  return node.arguments[0];
}

function objectExpression(node) {
  const unwrapped = unwrapObjectFreeze(node) ?? node;
  return unwrapped?.type === 'ObjectExpression' ? unwrapped : null;
}

function findVariable(sourceFile, name) {
  let found = null;
  walkAst(sourceFile, node => {
    if (
      !found &&
      node?.type === 'VariableDeclarator' &&
      node.id?.type === 'Identifier' &&
      node.id.name === name
    ) {
      found = node;
    }
  });
  return found;
}

function objectPropertyFacts(object) {
  return (object?.properties ?? []).map(property => ({
    type: property?.type,
    key: identifierName(property?.key),
    value: property?.value,
  }));
}

test('Interior Storage focused ownership is exactly 33 direct unaliased static value routes', () => {
  const actual = {};
  let statements = 0;

  for (const file of listSourceFiles(path.join(root, 'esm'))) {
    const rel = normalizeRel(file);
    const analysis = analyzeModuleDependencies(file, fs.readFileSync(file, 'utf8'));
    const dependencies = analysis.imports.filter(
      dependency => dependencyTarget(file, dependency) === storageOwnerTarget
    );
    if (!dependencies.length) continue;

    assert.equal(dependencies.length, 1, rel);
    const dependency = dependencies[0];
    statements += 1;
    const expectedSyntax = expectedFocusedOwnerReExports.has(rel) ? 'static-re-export' : 'static-import';
    assert.equal(dependency.kind, 'value', rel);
    assert.equal(dependency.syntax, expectedSyntax, rel);
    assert.deepEqual(
      dependency.exportedSymbols,
      expectedSyntax === 'static-re-export' ? dependency.importedSymbols : [],
      rel
    );
    assert.equal(dependency.importedSymbols.includes('*'), false, rel);
    assert.deepEqual(
      dependency.bindings.map(binding => ({
        importedName: binding.importedName,
        localName: binding.localName,
        exportedName: binding.exportedName,
      })),
      dependency.importedSymbols.map(symbol => ({
        importedName: symbol,
        localName: expectedSyntax === 'static-re-export' ? null : symbol,
        exportedName: expectedSyntax === 'static-re-export' ? symbol : null,
      })),
      rel
    );
    actual[rel] = dependency.importedSymbols;
  }

  assert.equal(Object.keys(actual).length, 33);
  assert.equal(statements, 33);
  assert.deepEqual(
    Object.fromEntries(Object.entries(actual).sort(([left], [right]) => left.localeCompare(right))),
    Object.fromEntries(
      Object.entries(expectedFocusedOwnerRoutes)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([rel, symbols]) => [rel, [...symbols]])
    )
  );
  assert.deepEqual(
    Object.entries(actual)
      .filter(([, symbols]) => symbols.includes('INTERIOR_STORAGE_POLICY'))
      .map(([rel]) => rel),
    [fittingsOwnerRel]
  );
});

test('Interior Storage owner has one dependency, exact focused shapes, frozen defaults, and direct aggregate projections', () => {
  const source = read(storageOwnerRel);
  const absolute = path.join(root, storageOwnerRel);
  const analysis = analyzeModuleDependencies(absolute, source);
  assert.deepEqual(
    analysis.imports.map(({ specifier, kind, syntax, importedSymbols, exportedSymbols, bindings }) => ({
      specifier,
      kind,
      syntax,
      importedSymbols,
      exportedSymbols,
      bindings,
    })),
    [
      {
        specifier: './units.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['meters'],
        exportedSymbols: [],
        bindings: [{ importedName: 'meters', localName: 'meters', exportedName: null }],
      },
    ]
  );
  assert.deepEqual(analysis.unresolvedDynamicImports, []);
  assert.deepEqual(analysis.forbiddenModuleSyntax, []);
  assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared|interior_fittings_policy/u);

  const sourceFile = createSourceFile(storageOwnerRel, source);
  for (const [name, expectedKeys] of Object.entries(expectedPolicyShapes)) {
    const declaration = findVariable(sourceFile, name);
    assert.ok(declaration, name);
    const object = objectExpression(declaration.init);
    assert.ok(object, name);
    assert.deepEqual(
      objectPropertyFacts(object).map(property => property.key),
      expectedKeys,
      name
    );
  }

  const defaultSlots = findVariable(sourceFile, 'DEFAULT_LOWER_SHELF_SLOTS');
  assert.ok(defaultSlots);
  const defaultArray = unwrapObjectFreeze(defaultSlots.init);
  assert.equal(defaultArray?.type, 'ArrayExpression');
  assert.deepEqual(
    defaultArray.elements.map(element => element?.value),
    [false, true, false, true, false, false]
  );

  const defaultsObject = objectExpression(findVariable(sourceFile, 'INTERIOR_STORAGE_DEFAULTS_POLICY')?.init);
  const defaultsFacts = objectPropertyFacts(defaultsObject);
  assert.equal(defaultsFacts[0]?.key, 'defaultLowerShelfSlots');
  assert.equal(identifierName(defaultsFacts[0]?.value), 'DEFAULT_LOWER_SHELF_SLOTS');

  const aggregateObject = objectExpression(findVariable(sourceFile, 'INTERIOR_STORAGE_POLICY')?.init);
  assert.ok(aggregateObject);
  const aggregateFacts = objectPropertyFacts(aggregateObject);
  assert.deepEqual(
    aggregateFacts.map(property => property.key),
    Object.keys(aggregateProjections)
  );
  assert.deepEqual(
    Object.fromEntries(aggregateFacts.map(property => [property.key, memberPath(property.value)])),
    aggregateProjections
  );
  assert.equal(
    aggregateFacts.every(
      property => property.type === 'Property' && property.value?.type === 'MemberExpression'
    ),
    true
  );

  const forbiddenAggregateNodes = [];
  walkAst(aggregateObject, node => {
    if (
      node !== aggregateObject &&
      (node?.type === 'Literal' ||
        node?.type === 'ArrayExpression' ||
        node?.type === 'SpreadElement' ||
        memberPath(node) === 'Object.assign')
    ) {
      forbiddenAggregateNodes.push(node.type);
    }
  });
  assert.deepEqual(forbiddenAggregateNodes, []);
});

test('Interior Fittings projects the canonical storage aggregate directly and public APIs do not export it', () => {
  const source = read(fittingsOwnerRel);
  const absolute = path.join(root, fittingsOwnerRel);
  const analysis = analyzeModuleDependencies(absolute, source);
  const storageDependencies = analysis.imports.filter(
    dependency => dependencyTarget(absolute, dependency) === storageOwnerTarget
  );
  assert.deepEqual(
    storageDependencies.map(({ specifier, kind, syntax, importedSymbols, exportedSymbols, bindings }) => ({
      specifier,
      kind,
      syntax,
      importedSymbols,
      exportedSymbols,
      bindings,
    })),
    [
      {
        specifier: './interior_storage_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['INTERIOR_STORAGE_POLICY'],
        exportedSymbols: [],
        bindings: [
          {
            importedName: 'INTERIOR_STORAGE_POLICY',
            localName: 'INTERIOR_STORAGE_POLICY',
            exportedName: null,
          },
        ],
      },
    ]
  );

  const sourceFile = createSourceFile(fittingsOwnerRel, source);
  const fittingsObject = objectExpression(findVariable(sourceFile, 'INTERIOR_FITTINGS_POLICY')?.init);
  assert.ok(fittingsObject);
  const storageProperties = objectPropertyFacts(fittingsObject).filter(
    property => property.key === 'storage'
  );
  assert.equal(storageProperties.length, 1);
  assert.equal(identifierName(storageProperties[0].value), 'INTERIOR_STORAGE_POLICY');
  assert.equal(
    fittingsObject.properties.some(property => property?.type === 'SpreadElement'),
    false
  );

  for (const rel of [
    'esm/native/runtime/api.ts',
    'esm/native/services/api.ts',
    'esm/native/services/api_runtime_base_surface.ts',
  ]) {
    const apiSource = read(rel);
    const apiExports = collectNamedModuleExports(rel, apiSource);
    assert.deepEqual(
      apiExports
        .map(entry => entry.exportedName)
        .filter(exportedName => forbiddenApiExports.has(exportedName)),
      [],
      rel
    );
    const apiFile = path.join(root, rel);
    const forbiddenReExports = analyzeModuleDependencies(apiFile, apiSource).imports.filter(dependency => {
      if (!dependency.exportedSymbols.length) return false;
      const target = dependencyTarget(apiFile, dependency);
      if (![storageOwnerTarget, facadeTarget, publicDimensionsTarget].includes(target)) return false;
      return (
        dependency.importedSymbols.includes('*') ||
        dependency.importedSymbols.some(symbol => forbiddenApiExports.has(symbol)) ||
        dependency.exportedSymbols.some(symbol => forbiddenApiExports.has(symbol))
      );
    });
    assert.deepEqual(forbiddenReExports, [], rel);
  }
});
