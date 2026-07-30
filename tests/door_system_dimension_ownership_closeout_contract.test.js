import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ownerRel = 'esm/shared/dimensions/door_system_policy.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const publicDimensionsRel = 'esm/native/features/dimensions/index.ts';
const runtimeApiRel = 'esm/native/runtime/api.ts';
const renderLoopDoorMotionOwnerRel = 'esm/shared/dimensions/render_loop_door_motion_dimension_policy.ts';
const identityReexportOwners = new Set([
  'esm/shared/dimensions/chest_mode_build_dimension_policy.ts',
  'esm/shared/dimensions/split_hover_preview_line_dimension_policy.ts',
]);
const identityCompositionRoutes = new Map([
  [
    'esm/native/builder/visuals_chest_mode_build.ts',
    'esm/shared/dimensions/chest_mode_build_dimension_policy.ts',
  ],
  [
    'esm/native/services/canvas_picking_split_hover_preview_line.ts',
    'esm/shared/dimensions/split_hover_preview_line_dimension_policy.ts',
  ],
]);
const ownerAbsolute = path.join(root, ownerRel);
const facadeAbsolute = path.join(root, facadeRel);
const publicDimensionsAbsolute = path.join(root, publicDimensionsRel);
const runtimeApiAbsolute = path.join(root, runtimeApiRel);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const esmSourceFiles = listSourceFiles(path.join(root, 'esm'));
const sourceCache = new Map();
const sourceFileCache = new Map();
const analysisCache = new Map();

const focusedInventories = new Map([
  [
    'HINGED_DOOR_RENDER_POLICY',
    [
      'esm/native/builder/hinged_doors_module_ops_context.ts',
      'esm/native/builder/render_door_ops_hinged.ts',
      ownerRel,
    ],
  ],
  [
    'HINGED_DOOR_MOUNT_POLICY',
    [
      'esm/native/builder/core_doors_compute.ts',
      'esm/native/builder/hinged_doors_module_ops_context.ts',
      'esm/native/builder/render_interior_sketch_boxes_door_geometry.ts',
      'esm/native/builder/visuals_chest_mode_build.ts',
      'esm/shared/dimensions/chest_mode_build_dimension_policy.ts',
      'esm/shared/dimensions/door_mount_thickness_policy.ts',
      ownerRel,
      'esm/shared/dimensions/external_drawer_policy.ts',
    ],
  ],
  [
    'HINGED_DOOR_SPLIT_GEOMETRY_POLICY',
    [
      'esm/native/builder/hinged_doors_module_ops_full.ts',
      'esm/native/builder/hinged_doors_module_ops_segments.ts',
      'esm/native/builder/hinged_doors_module_ops_split.ts',
      'esm/native/builder/hinged_doors_module_ops_split_policy.ts',
      'esm/native/builder/hinged_doors_module_ops_split_routes.ts',
      'esm/native/builder/post_build_sketch_door_cuts_apply.ts',
      'esm/native/services/canvas_picking_door_split_click_custom.ts',
      'esm/native/services/canvas_picking_door_split_click_toggle.ts',
      'esm/native/services/canvas_picking_split_hover_preview_line.ts',
      'esm/shared/dimensions/split_hover_preview_line_dimension_policy.ts',
      ownerRel,
    ],
  ],
  [
    'HINGED_DOOR_SPLIT_AUTHORING_POLICY',
    [
      'esm/native/services/canvas_picking_door_split_hover_feedback.ts',
      'esm/native/services/canvas_picking_door_split_hover_flow.ts',
      'esm/native/services/canvas_picking_door_split_pointer_y.ts',
      'esm/native/services/canvas_picking_door_split_remove_target.ts',
      ownerRel,
    ],
  ],
  [
    'SLIDING_DOOR_CONSTRUCTION_POLICY',
    [
      'esm/native/builder/core_doors_compute.ts',
      'esm/native/builder/render_door_ops_sliding.ts',
      'esm/native/builder/sliding_doors_pipeline.ts',
      'esm/native/platform/render_loop_motion_doors.ts',
      renderLoopDoorMotionOwnerRel,
      'esm/native/runtime/sliding_door_motion.ts',
      'esm/native/services/doors_runtime_visuals_shared.ts',
      ownerRel,
      'esm/shared/dimensions/front_reveal_frame_policy.ts',
    ],
  ],
  ['SLIDING_DOOR_HANDLE_RENDER_POLICY', ['esm/native/builder/render_door_ops_sliding.ts', ownerRel]],
  [
    'SLIDING_DOOR_MOTION_POLICY',
    ['esm/native/builder/render_door_ops_sliding.ts', 'esm/native/runtime/sliding_door_motion.ts', ownerRel],
  ],
]);

function listSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(absolute);
    return entry.isFile() && /\.(?:js|mjs|ts|tsx)$/u.test(entry.name) ? [absolute] : [];
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

function resolveModuleTarget(fromFile, specifier) {
  if (typeof specifier !== 'string') return null;
  let absolute;
  if (specifier.startsWith('@/')) absolute = path.join(root, 'esm', specifier.slice(2));
  else if (specifier.startsWith('.')) absolute = path.resolve(path.dirname(fromFile), specifier);
  else return null;
  return path
    .normalize(absolute)
    .replace(/\.(?:js|mjs|cjs)$/u, '.ts')
    .toLowerCase();
}

function isTarget(fromFile, specifier, target) {
  return resolveModuleTarget(fromFile, specifier) === path.normalize(target).toLowerCase();
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

function frozenProperties(sourceFile, name) {
  const declaration = findVariableDeclarator(sourceFile, name);
  assert.ok(declaration, `missing ${name}`);
  assert.equal(declaration.parent?.kind, 'const');
  assert.equal(declaration.parent?.parent?.type, 'ExportNamedDeclaration');
  return frozenObjectProperties(declaration.init);
}

function propertyNames(properties) {
  return properties.map(property => identifierName(property.key));
}

function projectionPairs(properties) {
  return properties.map(property => [identifierName(property.key), memberPath(property.value)]);
}

function importedConsumers(symbol) {
  return esmSourceFiles
    .flatMap(file =>
      analysisFor(file)
        .imports.filter(dependency => dependency.importedSymbols.includes(symbol))
        .map(dependency => ({
          file: rel(file),
          target: resolveModuleTarget(file, dependency.specifier),
          kind: dependency.kind,
          syntax: dependency.syntax,
          bindings: dependency.bindings.filter(binding => binding.importedName === symbol),
        }))
    )
    .sort((left, right) => left.file.localeCompare(right.file));
}

test('DOOR_SYSTEM_DIMENSIONS has no production consumer or facade/barrel bypass', () => {
  const occurrenceFiles = esmSourceFiles
    .filter(file => /\bDOOR_SYSTEM_DIMENSIONS\b/u.test(sourceFor(file)))
    .map(rel)
    .sort();
  assert.deepEqual(occurrenceFiles, [ownerRel, facadeRel].sort());

  const directImports = importedConsumers('DOOR_SYSTEM_DIMENSIONS');
  assert.deepEqual(
    directImports.map(imported => ({
      file: imported.file,
      kind: imported.kind,
      syntax: imported.syntax,
      bindings: imported.bindings,
    })),
    [
      {
        file: facadeRel,
        kind: 'value',
        syntax: 'static-import',
        bindings: [
          {
            importedName: 'DOOR_SYSTEM_DIMENSIONS',
            localName: 'DOOR_SYSTEM_DIMENSIONS_OWNER',
            exportedName: null,
          },
        ],
      },
    ]
  );

  const violations = [];
  for (const file of esmSourceFiles) {
    const fileRel = rel(file);
    if (![ownerRel, facadeRel].includes(fileRel)) {
      walkAst(sourceFileFor(file), node => {
        if (identifierName(node) === 'DOOR_SYSTEM_DIMENSIONS') {
          violations.push({ file: fileRel, kind: node.type, symbol: 'DOOR_SYSTEM_DIMENSIONS' });
        }
        const pathValue = memberPath(node);
        if (pathValue?.includes('DOOR_SYSTEM_DIMENSIONS.')) {
          violations.push({ file: fileRel, kind: 'member-chain', symbol: pathValue });
        }
      });
    }

    for (const dependency of analysisFor(file).imports) {
      const targetsFacade = isTarget(file, dependency.specifier, facadeAbsolute);
      const targetsDimensionsBarrel = isTarget(file, dependency.specifier, publicDimensionsAbsolute);
      const targetsRuntimeApi = isTarget(file, dependency.specifier, runtimeApiAbsolute);
      const approvedWildcardProjection =
        fileRel === publicDimensionsRel &&
        targetsFacade &&
        dependency.syntax === 'static-re-export' &&
        dependency.kind === 'value' &&
        dependency.importedSymbols.length === 1 &&
        dependency.importedSymbols[0] === '*';
      if (approvedWildcardProjection) continue;
      if (dependency.kind === 'type') continue;

      const exposesDoorSystem =
        dependency.syntax === 'dynamic-import' ||
        dependency.importedSymbols.includes('*') ||
        dependency.importedSymbols.includes('DOOR_SYSTEM_DIMENSIONS');
      if ((targetsFacade || targetsDimensionsBarrel || targetsRuntimeApi) && exposesDoorSystem) {
        violations.push({
          file: fileRel,
          kind: dependency.syntax,
          specifier: dependency.specifier,
          symbols: dependency.importedSymbols,
        });
      }
    }
  }
  assert.deepEqual(violations, []);

  const dimensionsProjection = analysisFor(publicDimensionsAbsolute).imports.filter(dependency =>
    isTarget(publicDimensionsAbsolute, dependency.specifier, facadeAbsolute)
  );
  assert.deepEqual(
    dimensionsProjection.map(({ kind, syntax, importedSymbols }) => ({
      kind,
      syntax,
      importedSymbols,
    })),
    [{ kind: 'value', syntax: 'static-re-export', importedSymbols: ['*'] }]
  );
  assert.equal(read(runtimeApiRel).includes('DOOR_SYSTEM_DIMENSIONS'), false);
});

test('Door System aggregate objects remain definition/facade-only with no aggregate bridge', () => {
  const aggregateOccurrences = new Map(
    [
      'HINGED_DOOR_SPLIT_POLICY',
      'HINGED_DOOR_SYSTEM_POLICY',
      'SLIDING_DOOR_SYSTEM_POLICY',
      'DOOR_SYSTEM_DIMENSIONS',
    ].map(symbol => [
      symbol,
      esmSourceFiles
        .filter(file => new RegExp(`\\b${symbol}\\b`, 'u').test(sourceFor(file)))
        .map(rel)
        .sort(),
    ])
  );
  assert.deepEqual(aggregateOccurrences.get('HINGED_DOOR_SPLIT_POLICY'), [ownerRel]);
  assert.deepEqual(aggregateOccurrences.get('HINGED_DOOR_SYSTEM_POLICY'), [ownerRel]);
  assert.deepEqual(aggregateOccurrences.get('SLIDING_DOOR_SYSTEM_POLICY'), [ownerRel]);
  assert.deepEqual(aggregateOccurrences.get('DOOR_SYSTEM_DIMENSIONS'), [ownerRel, facadeRel].sort());

  for (const symbol of [
    'HINGED_DOOR_SPLIT_POLICY',
    'HINGED_DOOR_SYSTEM_POLICY',
    'SLIDING_DOOR_SYSTEM_POLICY',
  ]) {
    assert.deepEqual(importedConsumers(symbol), []);
  }

  const exportedValues = collectNamedModuleExports(ownerRel, read(ownerRel))
    .filter(entry => entry.kind === 'value')
    .map(entry => entry.exportedName)
    .sort();
  assert.deepEqual(
    exportedValues,
    [
      'DOOR_SYSTEM_DIMENSIONS',
      'HINGED_DOOR_MOUNT_POLICY',
      'HINGED_DOOR_RENDER_POLICY',
      'HINGED_DOOR_SPLIT_AUTHORING_POLICY',
      'HINGED_DOOR_SPLIT_GEOMETRY_POLICY',
      'HINGED_DOOR_SPLIT_POLICY',
      'HINGED_DOOR_SYSTEM_POLICY',
      'SLIDING_DOOR_CONSTRUCTION_POLICY',
      'SLIDING_DOOR_HANDLE_RENDER_POLICY',
      'SLIDING_DOOR_MOTION_POLICY',
      'SLIDING_DOOR_SYSTEM_POLICY',
    ].sort()
  );
});

test('Door System focused-owner inventory is exact, reviewed, and alias-free', () => {
  for (const [symbol, expectedFiles] of focusedInventories) {
    const consumers = importedConsumers(symbol);
    assert.deepEqual(
      [ownerRel, ...consumers.map(consumer => consumer.file)].sort(),
      [...expectedFiles].sort(),
      symbol
    );
    const compositionConsumers = consumers.filter(consumer => consumer.file === renderLoopDoorMotionOwnerRel);
    const platformConsumers = consumers.filter(
      consumer => consumer.file === 'esm/native/platform/render_loop_motion_doors.ts'
    );
    const identityCompositionConsumers = consumers.filter(consumer =>
      identityCompositionRoutes.has(consumer.file)
    );
    const directConsumers = consumers.filter(
      consumer =>
        consumer.file !== renderLoopDoorMotionOwnerRel &&
        consumer.file !== 'esm/native/platform/render_loop_motion_doors.ts' &&
        !identityCompositionRoutes.has(consumer.file)
    );
    const usesDoorMotionComposition = symbol === 'SLIDING_DOOR_CONSTRUCTION_POLICY';

    assert.equal(
      directConsumers.every(consumer => consumer.target === path.normalize(ownerAbsolute).toLowerCase()),
      true,
      `${symbol} direct consumers must target the focused owner module`
    );
    assert.equal(
      directConsumers.every(consumer => {
        const identityReexport = identityReexportOwners.has(consumer.file);
        return (
          consumer.kind === 'value' &&
          consumer.syntax === (identityReexport ? 'static-re-export' : 'static-import')
        );
      }),
      true,
      `${symbol} direct consumers must use their reviewed static statement form`
    );
    assert.equal(
      directConsumers.every(consumer => {
        const identityReexport = identityReexportOwners.has(consumer.file);
        return (
          consumer.bindings.length === 1 &&
          consumer.bindings[0].importedName === symbol &&
          consumer.bindings[0].localName === (identityReexport ? null : symbol) &&
          consumer.bindings[0].exportedName === (identityReexport ? symbol : null)
        );
      }),
      true,
      `${symbol} direct consumers must preserve the binding identity without aliases`
    );

    const expectedIdentityCompositionConsumer = [...identityCompositionRoutes.entries()].find(
      ([consumerFile]) => consumers.some(consumer => consumer.file === consumerFile)
    );
    assert.equal(identityCompositionConsumers.length, expectedIdentityCompositionConsumer ? 1 : 0, symbol);
    if (expectedIdentityCompositionConsumer) {
      const [consumerFile, identityOwnerFile] = expectedIdentityCompositionConsumer;
      const [identityConsumer] = identityCompositionConsumers;
      assert.equal(identityConsumer.file, consumerFile, symbol);
      assert.equal(
        identityConsumer.target,
        path.normalize(path.join(root, identityOwnerFile)).toLowerCase(),
        symbol
      );
      assert.equal(identityConsumer.kind, 'value', symbol);
      assert.equal(identityConsumer.syntax, 'static-import', symbol);
      assert.deepEqual(identityConsumer.bindings, [
        { importedName: symbol, localName: symbol, exportedName: null },
      ]);
    }

    assert.equal(compositionConsumers.length, usesDoorMotionComposition ? 1 : 0, symbol);
    assert.equal(platformConsumers.length, usesDoorMotionComposition ? 1 : 0, symbol);
    if (usesDoorMotionComposition) {
      const [compositionConsumer] = compositionConsumers;
      assert.equal(compositionConsumer.target, path.normalize(ownerAbsolute).toLowerCase());
      assert.equal(compositionConsumer.kind, 'value');
      assert.equal(compositionConsumer.syntax, 'static-re-export');
      assert.deepEqual(compositionConsumer.bindings, [
        {
          importedName: symbol,
          localName: null,
          exportedName: symbol,
        },
      ]);

      const [platformConsumer] = platformConsumers;
      assert.equal(
        platformConsumer.target,
        path.normalize(path.join(root, renderLoopDoorMotionOwnerRel)).toLowerCase()
      );
      assert.equal(platformConsumer.kind, 'value');
      assert.equal(platformConsumer.syntax, 'static-import');
      assert.deepEqual(platformConsumer.bindings, [
        {
          importedName: symbol,
          localName: symbol,
          exportedName: null,
        },
      ]);
    }
  }
});

test('Door System owner imports only canonical dependencies and aggregates direct focused projections', () => {
  const source = read(ownerRel);
  const sourceFile = sourceFileFor(ownerAbsolute);
  const analysis = analysisFor(ownerAbsolute);
  assert.deepEqual(
    analysis.imports.map(({ specifier, kind, syntax, importedSymbols }) => ({
      specifier,
      kind,
      syntax,
      importedSymbols,
    })),
    [
      {
        specifier: './material_thickness_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['MATERIAL_THICKNESS_POLICY'],
      },
      {
        specifier: './units.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['meters'],
      },
      {
        specifier: './wardrobe_defaults.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['WARDROBE_DEFAULTS'],
      },
    ]
  );
  assert.deepEqual(analysis.unresolvedDynamicImports, []);
  assert.deepEqual(analysis.forbiddenModuleSyntax, []);
  assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);

  const geometryFields = propertyNames(frozenProperties(sourceFile, 'HINGED_DOOR_SPLIT_GEOMETRY_POLICY'));
  const authoringFields = propertyNames(frozenProperties(sourceFile, 'HINGED_DOOR_SPLIT_AUTHORING_POLICY'));
  assert.deepEqual(projectionPairs(frozenProperties(sourceFile, 'HINGED_DOOR_SPLIT_POLICY')), [
    ...geometryFields.map(field => [field, `HINGED_DOOR_SPLIT_GEOMETRY_POLICY.${field}`]),
    ...authoringFields.map(field => [field, `HINGED_DOOR_SPLIT_AUTHORING_POLICY.${field}`]),
  ]);

  assert.deepEqual(projectionPairs(frozenProperties(sourceFile, 'HINGED_DOOR_SYSTEM_POLICY')), [
    ['visualWidthClearanceM', 'HINGED_DOOR_RENDER_POLICY.visualWidthClearanceM'],
    ['visualHeightClearanceM', 'HINGED_DOOR_RENDER_POLICY.visualHeightClearanceM'],
    ['visualThicknessM', 'HINGED_DOOR_RENDER_POLICY.visualThicknessM'],
    ['insetFrameThicknessM', 'HINGED_DOOR_MOUNT_POLICY.insetFrameThicknessM'],
    ['insetRevealM', 'HINGED_DOOR_MOUNT_POLICY.insetRevealM'],
    ['frontTrimZOffsetM', 'HINGED_DOOR_RENDER_POLICY.frontTrimZOffsetM'],
    ['opFrontZOffsetM', 'HINGED_DOOR_RENDER_POLICY.opFrontZOffsetM'],
    ['sameModuleLeafGapMaxM', 'HINGED_DOOR_MOUNT_POLICY.sameModuleLeafGapMaxM'],
    ['sameModuleLeafGapWoodDivisor', 'HINGED_DOOR_MOUNT_POLICY.sameModuleLeafGapWoodDivisor'],
    ['sameModuleLeafGapSpanRatioMax', 'HINGED_DOOR_MOUNT_POLICY.sameModuleLeafGapSpanRatioMax'],
    ['split', 'HINGED_DOOR_SPLIT_POLICY'],
  ]);

  const constructionFields = propertyNames(frozenProperties(sourceFile, 'SLIDING_DOOR_CONSTRUCTION_POLICY'));
  const handleFields = propertyNames(frozenProperties(sourceFile, 'SLIDING_DOOR_HANDLE_RENDER_POLICY'));
  const motionFields = propertyNames(frozenProperties(sourceFile, 'SLIDING_DOOR_MOTION_POLICY'));
  assert.deepEqual(projectionPairs(frozenProperties(sourceFile, 'SLIDING_DOOR_SYSTEM_POLICY')), [
    ...constructionFields.map(field => [field, `SLIDING_DOOR_CONSTRUCTION_POLICY.${field}`]),
    ...handleFields.map(field => [field, `SLIDING_DOOR_HANDLE_RENDER_POLICY.${field}`]),
    ...motionFields.map(field => [field, `SLIDING_DOOR_MOTION_POLICY.${field}`]),
  ]);
  assert.deepEqual(projectionPairs(frozenProperties(sourceFile, 'DOOR_SYSTEM_DIMENSIONS')), [
    ['hinged', 'HINGED_DOOR_SYSTEM_POLICY'],
    ['sliding', 'SLIDING_DOOR_SYSTEM_POLICY'],
  ]);

  for (const aggregateName of [
    'HINGED_DOOR_SPLIT_POLICY',
    'HINGED_DOOR_SYSTEM_POLICY',
    'SLIDING_DOOR_SYSTEM_POLICY',
    'DOOR_SYSTEM_DIMENSIONS',
  ]) {
    const declaration = findVariableDeclarator(sourceFile, aggregateName);
    const forbiddenNodes = [];
    walkAst(declaration.init, node => {
      if (
        node?.type === 'SpreadElement' ||
        (node?.type === 'Literal' && typeof node.value === 'number') ||
        (node?.type === 'CallExpression' && node !== declaration.init)
      ) {
        forbiddenNodes.push(node.type);
      }
    });
    assert.deepEqual(forbiddenNodes, [], aggregateName);
  }
});

test('public DOOR_SYSTEM_DIMENSIONS remains the single direct owner projection', () => {
  const source = read(facadeRel);
  const sourceFile = sourceFileFor(facadeAbsolute);
  const analysis = analysisFor(facadeAbsolute);
  const ownerImport = analysis.imports.filter(dependency =>
    isTarget(facadeAbsolute, dependency.specifier, ownerAbsolute)
  );
  assert.deepEqual(
    ownerImport.map(({ specifier, kind, syntax, importedSymbols, bindings }) => ({
      specifier,
      kind,
      syntax,
      importedSymbols,
      bindings: bindings.filter(binding => binding.importedName === 'DOOR_SYSTEM_DIMENSIONS'),
    })),
    [
      {
        specifier: './dimensions/door_system_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['DOOR_SYSTEM_DIMENSIONS'],
        bindings: [
          {
            importedName: 'DOOR_SYSTEM_DIMENSIONS',
            localName: 'DOOR_SYSTEM_DIMENSIONS_OWNER',
            exportedName: null,
          },
        ],
      },
    ]
  );

  const projection = findVariableDeclarator(sourceFile, 'DOOR_SYSTEM_DIMENSIONS');
  assert.ok(projection);
  assert.equal(projection.parent?.kind, 'const');
  assert.equal(projection.init?.type, 'CallExpression');
  assert.equal(identifierName(projection.init.callee), 'legacyDimensionNumberView');
  assert.deepEqual((projection.init.arguments ?? []).map(identifierName), ['DOOR_SYSTEM_DIMENSIONS_OWNER']);
  assert.match(
    source,
    /const DOOR_SYSTEM_DIMENSIONS = legacyDimensionNumberView\(DOOR_SYSTEM_DIMENSIONS_OWNER\);/u
  );

  const forbiddenProjectionNodes = [];
  walkAst(projection.init, node => {
    if (
      node?.type === 'SpreadElement' ||
      node?.type === 'ObjectExpression' ||
      (node?.type === 'Literal' && typeof node.value === 'number') ||
      (node?.type === 'CallExpression' && node !== projection.init)
    ) {
      forbiddenProjectionNodes.push(node.type);
    }
  });
  assert.deepEqual(forbiddenProjectionNodes, []);

  const valueExports = new Set(
    collectNamedModuleExports(facadeRel, source)
      .filter(entry => entry.kind === 'value')
      .map(entry => entry.exportedName)
  );
  assert.equal(valueExports.has('DOOR_SYSTEM_DIMENSIONS'), true);
});
