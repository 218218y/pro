import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function listFilesRecursively(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFilesRecursively(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

const productDimensionTokenSources = [
  'esm/shared/wardrobe_dimension_tokens_shared.ts',
  'esm/shared/dimensions/door_system_policy.ts',
  'esm/shared/dimensions/door_mount_thickness_policy.ts',
  'esm/shared/dimensions/door_visual_policy.ts',
  'esm/shared/dimensions/door_trim_policy.ts',
  'esm/shared/dimensions/external_drawer_policy.ts',
  'esm/shared/dimensions/internal_drawer_policy.ts',
  'esm/shared/dimensions/interior_fittings_policy.ts',
  'esm/shared/dimensions/interior_storage_policy.ts',
  'esm/shared/dimensions/corner_system_policy.ts',
  'esm/shared/dimensions/corner_connector_interior_policy.ts',
  'esm/shared/dimensions/drawer_sketch_policy.ts',
  'esm/shared/dimensions/front_reveal_frame_policy.ts',
  'esm/shared/dimensions/handle_policy.ts',
  'esm/shared/dimensions/content_visual_policy.ts',
  'esm/shared/dimensions/sketch_box_classic_door_visual_policy.ts',
  'esm/shared/dimensions/sketch_box_geometry_policy.ts',
  'esm/shared/dimensions/sketch_box_divider_policy.ts',
  'esm/shared/dimensions/sketch_box_dimension_overlay_policy.ts',
  'esm/shared/dimensions/sketch_box_preview_policy.ts',
  'esm/shared/dimensions/sketch_box_free_placement_policy.ts',
];

function readProductDimensionTokens() {
  return productDimensionTokenSources.map(read).join('\n');
}

function assertUsesToken(rel, tokenName) {
  const src = read(rel);
  assert.match(src, new RegExp(`\\b${tokenName}\\b`), `${rel} should read ${tokenName}`);
}

function assertLinearDimensionsUseOwnersOrMeters(rel) {
  assert.doesNotMatch(
    read(rel),
    /^\s*[A-Za-z_$][\w$]*(?:M|YM|ZM):\s*-?(?:\d|\.\d)/mu,
    `${rel} must construct linear dimensions with meters(...) or reference a canonical owner`
  );
}

test('[dimension tokens] Preview aggregate guard uses real word boundaries', () => {
  const aggregatePattern = /\bSKETCH_BOX_PREVIEW_POLICY\b/u;
  assert.match('SKETCH_BOX_PREVIEW_POLICY', aggregatePattern);
  assert.doesNotMatch('SKETCH_BOX_PREVIEW_CORE_POLICY', aggregatePattern);
  assert.doesNotMatch('SKETCH_BOX_DOOR_PREVIEW_POLICY', aggregatePattern);
  assert.equal(
    fs.readFileSync(fileURLToPath(import.meta.url)).includes(0x08),
    false,
    'the Preview aggregate guard must not contain U+0008 backspace bytes'
  );
});

test('[dimension tokens] visual content product dimensions are centralized', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /export const CONTENT_VISUAL_DIMENSIONS[^=]*= Object\.freeze\(\{/);
  assert.match(tokens, /export const BOOK_CONTENT_VISUAL_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const FOLDED_CLOTHES_VISUAL_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const HANGER_VISUAL_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const HANGING_CLOTHES_VISUAL_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY = Object\.freeze\(\{/);

  for (const rel of [
    'esm/shared/dimensions/content_visual_policy.ts',
    'esm/shared/dimensions/sketch_box_classic_door_visual_policy.ts',
  ]) {
    assertLinearDimensionsUseOwnersOrMeters(rel);
  }

  assertUsesToken('esm/native/builder/visuals_contents_folded.ts', 'BOOK_CONTENT_VISUAL_POLICY');
  assertUsesToken('esm/native/builder/visuals_contents_folded.ts', 'FOLDED_CLOTHES_VISUAL_POLICY');
  assertUsesToken('esm/native/builder/visuals_contents_hanger.ts', 'HANGER_VISUAL_POLICY');
  assertUsesToken('esm/native/builder/visuals_contents_hanging.ts', 'HANGING_CLOTHES_VISUAL_POLICY');
  assertUsesToken(
    'esm/native/builder/render_interior_sketch_boxes_fronts_door_accents.ts',
    'SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY'
  );

  for (const rel of [
    'esm/native/builder/visuals_contents_folded.ts',
    'esm/native/builder/visuals_contents_hanger.ts',
    'esm/native/builder/visuals_contents_hanging.ts',
    'esm/native/builder/render_interior_sketch_boxes_fronts_door_accents.ts',
  ]) {
    assert.doesNotMatch(read(rel), /CONTENT_VISUAL_DIMENSIONS/);
  }
});

test('[dimension tokens] sketch box geometry and preview dimensions are centralized', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /export const SKETCH_BOX_DIMENSIONS = Object\.freeze\(\{/);

  for (const rel of [
    'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_shelf.ts',
    'esm/native/services/canvas_picking_sketch_module_surface_preview_content.ts',
    'esm/native/builder/render_interior_sketch_boxes_contents_parts_shelves.ts',
  ]) {
    assertUsesToken(rel, 'SKETCH_BOX_DIMENSIONS');
  }

  const focusedGeometryConsumers = new Map([
    [
      'esm/native/builder/render_interior_sketch_boxes_shell_geometry.ts',
      ['SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY'],
    ],
    ['esm/native/builder/render_interior_sketch_boxes_shell_height.ts', ['SKETCH_BOX_SHELL_GEOMETRY_POLICY']],
    [
      'esm/native/builder/render_interior_sketch_support_placement.ts',
      ['SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_runtime_geometry.ts',
      ['SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY', 'SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_free_box_geometry_box.ts',
      ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
    ],
    ['esm/native/builder/render_interior_sketch_layout_geometry.ts', ['SKETCH_BOX_SHELL_GEOMETRY_POLICY']],
    ['esm/native/builder/render_interior_sketch_boxes.ts', ['SKETCH_BOX_SHELL_GEOMETRY_POLICY']],
    [
      'esm/native/builder/render_interior_sketch_boxes_contents_depth.ts',
      ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_base.ts',
      ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_commit_shared.ts',
      ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
    ],
  ]);
  for (const [rel, symbols] of focusedGeometryConsumers) {
    const source = read(rel);
    assert.match(
      source,
      /from ['"]\.\.\/\.\.\/shared\/dimensions\/sketch_box_geometry_policy\.js['"]/u,
      `${rel} must import the canonical Sketch Box Geometry owner`
    );
    assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared|SKETCH_BOX_DIMENSIONS/u);
    assert.doesNotMatch(source, /SKETCH_BOX_GEOMETRY_POLICY/u);
    assert.doesNotMatch(source, /import\s+\*|export\s+(?:\*|\{[^}]*\})\s+from/u);
    for (const symbol of symbols) assertUsesToken(rel, symbol);
  }

  const focusedFreePlacementConsumers = new Map([
    [
      'esm/native/services/canvas_picking_cell_dims_free_box.ts',
      ['SKETCH_BOX_FREE_VERTICAL_POLICY', 'SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY'],
    ],
    ['esm/native/services/canvas_picking_sketch_free_box_gap.ts', ['SKETCH_BOX_FREE_PLACEMENT_GAP_POLICY']],
    [
      'esm/native/services/canvas_picking_sketch_free_box_geometry_vertical.ts',
      ['SKETCH_BOX_FREE_VERTICAL_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_free_box_geometry_zone.ts',
      ['SKETCH_BOX_FREE_REMOVE_POLICY', 'SKETCH_BOX_FREE_WALL_SNAP_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_free_box_placement_attach_candidates.ts',
      ['SKETCH_BOX_FREE_ATTACH_CANDIDATE_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_free_box_placement_intent.ts',
      ['SKETCH_BOX_FREE_ATTACH_INTENT_POLICY'],
    ],
    ['esm/native/builder/render_interior_sketch_layout_geometry.ts', ['SKETCH_BOX_FREE_VERTICAL_POLICY']],
    [
      'esm/native/services/canvas_picking_cell_dims_free_box_hover.ts',
      ['SKETCH_BOX_FREE_VERTICAL_POLICY', 'SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_free_box_hover_context.ts',
      ['SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY'],
    ],
  ]);
  for (const [rel, symbols] of focusedFreePlacementConsumers) {
    const source = read(rel);
    assert.match(
      source,
      /from ['"]\.\.\/\.\.\/shared\/dimensions\/sketch_box_free_placement_policy\.js['"]/u,
      `${rel} must import the canonical Free Placement owner`
    );
    assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared|SKETCH_BOX_DIMENSIONS/u);
    assert.doesNotMatch(source, /SKETCH_BOX_FREE_PLACEMENT_POLICY/u);
    assert.doesNotMatch(source, /import\s+\*|export\s+(?:\*|\{[^}]*\})\s+from/u);
    for (const symbol of symbols) assertUsesToken(rel, symbol);
  }

  const focusedPreviewConsumers = new Map([
    [
      'esm/native/builder/render_interior_sketch_boxes_fronts_door_layout.ts',
      ['SKETCH_BOX_DOOR_PREVIEW_POLICY'],
    ],
    [
      'esm/native/builder/render_preview_sketch_measurements_apply.ts',
      ['SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY'],
    ],
    [
      'esm/native/builder/render_preview_sketch_pipeline_box_content_box.ts',
      ['SKETCH_BOX_BOX_PREVIEW_POLICY', 'SKETCH_BOX_PREVIEW_CORE_POLICY'],
    ],
    [
      'esm/native/builder/render_preview_sketch_pipeline_linear.ts',
      ['SKETCH_BOX_PREVIEW_CORE_POLICY', 'SKETCH_BOX_ROD_PREVIEW_POLICY'],
    ],
    [
      'esm/native/builder/render_preview_sketch_pipeline_object_boxes.ts',
      ['SKETCH_BOX_BOX_PREVIEW_POLICY', 'SKETCH_BOX_PREVIEW_CORE_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_hover_clearance_measurements.ts',
      ['SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_preview_shared.ts',
      ['SKETCH_BOX_PREVIEW_CORE_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_divider_measurements.ts',
      ['SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_commit_vertical.ts',
      ['SKETCH_BOX_PREVIEW_CORE_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_preview_box.ts',
      ['SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY'],
    ],
    ['esm/native/builder/render_interior_sketch_boxes.ts', ['SKETCH_BOX_DOOR_PREVIEW_POLICY']],
    ['esm/native/builder/render_interior_sketch_boxes_contents_depth.ts', ['SKETCH_BOX_DOOR_PREVIEW_POLICY']],
    ['esm/native/builder/render_interior_sketch_boxes_door_geometry.ts', ['SKETCH_BOX_DOOR_PREVIEW_POLICY']],
    ['esm/native/builder/post_build_sketch_door_cuts_rebuild.ts', ['SKETCH_BOX_DOOR_PREVIEW_POLICY']],
    ['esm/native/services/canvas_picking_sketch_box_door_preview.ts', ['SKETCH_BOX_DOOR_PREVIEW_POLICY']],
    [
      'esm/native/services/canvas_picking_sketch_free_surface_preview_adornment_preview.ts',
      ['SKETCH_BOX_ADORNMENT_PREVIEW_POLICY', 'SKETCH_BOX_DOOR_PREVIEW_POLICY'],
    ],
  ]);
  for (const [rel, symbols] of focusedPreviewConsumers) {
    const source = read(rel);
    assert.match(
      source,
      /from ['"]\.\.\/\.\.\/shared\/dimensions\/sketch_box_preview_policy\.js['"]/u,
      `${rel} must import the canonical Sketch Box Preview owner`
    );
    assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared|SKETCH_BOX_DIMENSIONS/u);
    assert.doesNotMatch(source, /\bSKETCH_BOX_PREVIEW_POLICY\b/u);
    assert.doesNotMatch(source, /import\s+\*|export\s+(?:\*|\{[^}]*\})\s+from/u);
    const ownerStatements = source.match(
      /from ['"]\.\.\/\.\.\/shared\/dimensions\/sketch_box_preview_policy\.js['"]/gu
    );
    assert.equal(ownerStatements?.length ?? 0, 1, `${rel} must retain one Preview owner statement`);
    for (const symbol of symbols) assertUsesToken(rel, symbol);
  }

  const sharedPreview = read(
    'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_preview_shared.ts'
  );
  assert.match(sharedPreview, /export const REMOVE_EPS_SHELF: number\s*=/u);
  assert.match(sharedPreview, /export const REMOVE_EPS_BOX: number\s*=/u);
});

test('[dimension tokens] Sketch Box foundation owns policies while remaining compatibility consumers stay exact', () => {
  const facade = read('esm/shared/wardrobe_dimension_tokens_shared.ts');
  const focusedPolicyFiles = [
    'esm/shared/dimensions/sketch_box_geometry_policy.ts',
    'esm/shared/dimensions/sketch_box_divider_policy.ts',
    'esm/shared/dimensions/sketch_box_dimension_overlay_policy.ts',
    'esm/shared/dimensions/sketch_box_preview_policy.ts',
    'esm/shared/dimensions/sketch_box_free_placement_policy.ts',
  ];
  const aggregateOwners = new Map([
    ['SKETCH_BOX_GEOMETRY_POLICY', focusedPolicyFiles[0]],
    ['SKETCH_BOX_DIVIDER_POLICY', focusedPolicyFiles[1]],
    ['SKETCH_BOX_DIMENSION_OVERLAY_POLICY', focusedPolicyFiles[2]],
    ['SKETCH_BOX_PREVIEW_POLICY', focusedPolicyFiles[3]],
    ['SKETCH_BOX_FREE_PLACEMENT_POLICY', focusedPolicyFiles[4]],
  ]);

  assert.match(facade, /geometry:\s*SKETCH_BOX_GEOMETRY_DIMENSIONS/u);
  assert.match(facade, /dividers:\s*SKETCH_BOX_DIVIDER_DIMENSIONS/u);
  assert.match(facade, /dimensionOverlay:\s*SKETCH_BOX_DIMENSION_OVERLAY_DIMENSIONS/u);
  assert.match(facade, /preview:\s*SKETCH_BOX_PREVIEW_DIMENSIONS/u);
  assert.match(facade, /freePlacement:\s*SKETCH_BOX_FREE_PLACEMENT_DIMENSIONS/u);
  const projection = facade.slice(
    facade.indexOf('const SKETCH_BOX_GEOMETRY_DIMENSIONS'),
    facade.indexOf('export const CORNER_WING_DIMENSIONS')
  );
  assert.doesNotMatch(projection, /(?:^|\s)[A-Za-z_$][\w$]*:\s*-?(?:\d|\.\d)/mu);
  assert.doesNotMatch(
    projection,
    /MATERIAL_DIMENSIONS|INTERIOR_FITTINGS_DIMENSIONS|CARCASS_BASE_DIMENSIONS/u
  );

  for (const file of focusedPolicyFiles) {
    const source = read(file);
    assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
    assert.doesNotMatch(source, /import\s+\*/u);
    assert.doesNotMatch(source, /export\s+(?:\*|\{[^}]*\})\s+from/u);
    assertLinearDimensionsUseOwnersOrMeters(file);
  }

  const esmFiles = listFilesRecursively(path.join(ROOT, 'esm'))
    .filter(file => /\.(?:ts|tsx|js|mjs)$/u.test(file))
    .map(file => path.relative(ROOT, file).replaceAll(path.sep, '/'));
  for (const [aggregate, owner] of aggregateOwners) {
    const importers = esmFiles.filter(file => {
      const source = read(file);
      return new RegExp(`import[\\s\\S]*?\\b${aggregate}\\b[\\s\\S]*?from`, 'u').test(source);
    });
    assert.deepEqual(importers, ['esm/shared/wardrobe_dimension_tokens_shared.ts']);
    assert.match(read(owner), new RegExp(`export const ${aggregate} = Object\\.freeze`, 'u'));
  }

  const expectedConsumers = [
    'esm/native/builder/render_interior_sketch_boxes_contents_parts_shelves.ts',
    'esm/native/builder/render_preview_interior_hover_apply.ts',
    'esm/native/services/canvas_picking_interior_hover_manual_mode.ts',
    'esm/native/services/canvas_picking_manual_layout_free_box_content.ts',
    'esm/native/services/canvas_picking_manual_layout_free_box_plans.ts',
    'esm/native/services/canvas_picking_sketch_box_vertical_content_occupancy.ts',
    'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_shelf.ts',
    'esm/native/services/canvas_picking_sketch_module_surface_preview_content.ts',
    'esm/native/services/canvas_picking_sketch_module_surface_preview_rod.ts',
    'esm/native/services/canvas_picking_sketch_module_surface_preview_shelf.ts',
  ];
  const actualConsumers = esmFiles.filter(
    file =>
      file !== 'esm/shared/wardrobe_dimension_tokens_shared.ts' &&
      /\bSKETCH_BOX_DIMENSIONS\b/u.test(read(file))
  );
  assert.deepEqual(actualConsumers.sort(), expectedConsumers);
  assert.equal(actualConsumers.filter(file => file.startsWith('esm/native/builder/')).length, 2);
  assert.equal(actualConsumers.filter(file => file.startsWith('esm/native/services/')).length, 8);
  assert.equal(actualConsumers.filter(file => file.startsWith('esm/native/ui/')).length, 0);
  const remainingCleanPreviewOnlyConsumers = actualConsumers.filter(file => {
    const source = read(file);
    const facadeImport = source.match(
      /import\s*\{([\s\S]*?)\}\s*from\s*['"][^'"]*wardrobe_dimension_tokens_shared\.js['"]/u
    );
    const importedFacadeSymbols = facadeImport
      ? facadeImport[1]
          .split(',')
          .map(
            symbol =>
              symbol
                .trim()
                .replace(/^type\s+/u, '')
                .split(/\s+as\s+/u)[0]
          )
          .filter(Boolean)
      : [];
    const branches = new Set(
      Array.from(source.matchAll(/SKETCH_BOX_DIMENSIONS\.([A-Za-z0-9_]+)/gu), match => match[1])
    );
    return (
      importedFacadeSymbols.length === 1 &&
      importedFacadeSymbols[0] === 'SKETCH_BOX_DIMENSIONS' &&
      branches.size === 1 &&
      branches.has('preview')
    );
  });
  assert.deepEqual(remainingCleanPreviewOnlyConsumers, []);
  const remainingFreePlacementConsumers = esmFiles.filter(
    file =>
      file !== 'esm/shared/wardrobe_dimension_tokens_shared.ts' &&
      /SKETCH_BOX_DIMENSIONS\.freePlacement/u.test(read(file))
  );
  assert.deepEqual(remainingFreePlacementConsumers, []);
  const remainingGeometryConsumers = esmFiles.filter(
    file =>
      file !== 'esm/shared/wardrobe_dimension_tokens_shared.ts' &&
      /SKETCH_BOX_DIMENSIONS\.geometry/u.test(read(file))
  );
  assert.deepEqual(remainingGeometryConsumers, []);
  const remainingPreviewConsumers = esmFiles.filter(
    file =>
      file !== 'esm/shared/wardrobe_dimension_tokens_shared.ts' &&
      /SKETCH_BOX_DIMENSIONS\.preview/u.test(read(file))
  );
  assert.equal(remainingPreviewConsumers.length, 10);
  assert.deepEqual(remainingPreviewConsumers.sort(), actualConsumers.sort());
  for (const file of actualConsumers) {
    const branches = new Set(
      Array.from(read(file).matchAll(/SKETCH_BOX_DIMENSIONS\.([A-Za-z0-9_]+)/gu), match => match[1])
    );
    assert.deepEqual([...branches], ['preview'], `${file} must use only the Preview branch`);
  }
  assert.equal(
    esmFiles.filter(
      file =>
        file !== 'esm/shared/wardrobe_dimension_tokens_shared.ts' && /\bHANDLE_DIMENSIONS\b/u.test(read(file))
    ).length,
    0
  );
});

test('[dimension tokens] Sketch Box Measurement stack-preview quartet uses exactly two focused owners', () => {
  const consumers = new Map([
    [
      'esm/native/services/canvas_picking_sketch_box_stack_preview_drawers.ts',
      ['DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_stack_preview_ext_drawers.ts',
      [
        'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
        'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
        'DRAWER_SKETCH_SIZING_POLICY',
        'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
      ],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_stack_preview_drawers.ts',
      ['DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_stack_preview_ext_drawers.ts',
      [
        'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
        'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
        'DRAWER_SKETCH_SIZING_POLICY',
        'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
      ],
    ],
  ]);

  for (const [rel, drawerSymbols] of consumers) {
    const source = read(rel);
    const dependencies = analyzeModuleDependencies(path.join(ROOT, rel), source).imports;
    const focusedOwners = dependencies.filter(
      dependency =>
        dependency.syntax === 'static-import' &&
        (dependency.specifier.endsWith('/dimensions/drawer_sketch_policy.js') ||
          dependency.specifier.endsWith('/dimensions/sketch_box_preview_policy.js'))
    );
    assert.equal(focusedOwners.length, 2, `${rel} must retain exactly two focused-owner statements`);
    assert.deepEqual(
      focusedOwners.map(dependency => ({
        specifier: dependency.specifier,
        symbols: [...dependency.importedSymbols].sort(),
      })),
      [
        {
          specifier: '../../shared/dimensions/drawer_sketch_policy.js',
          symbols: [...drawerSymbols].sort(),
        },
        {
          specifier: '../../shared/dimensions/sketch_box_preview_policy.js',
          symbols: ['SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY'],
        },
      ]
    );
    assert.equal(
      dependencies.some(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared')),
      false,
      `${rel} must not import the legacy facade`
    );
    assert.doesNotMatch(
      source,
      /\b(?:DRAWER_DIMENSIONS|SKETCH_BOX_DIMENSIONS|DRAWER_SKETCH_POLICY|SKETCH_BOX_PREVIEW_POLICY)\b|import\s+\*\s+as|export\s+(?:type\s+)?(?:\*|\{)/u
    );
  }
});

test('[dimension tokens] Sketch Box stacked content preview renderer uses exactly two focused owners', () => {
  const rel = 'esm/native/builder/render_preview_sketch_pipeline_box_content_drawers.ts';
  const source = read(rel);
  const dependencies = analyzeModuleDependencies(path.join(ROOT, rel), source).imports;
  const focusedOwners = dependencies.filter(
    dependency =>
      dependency.syntax === 'static-import' &&
      (dependency.specifier.endsWith('/dimensions/drawer_sketch_policy.js') ||
        dependency.specifier.endsWith('/dimensions/sketch_box_preview_policy.js'))
  );

  assert.deepEqual(
    focusedOwners.map(dependency => ({
      specifier: dependency.specifier,
      symbols: [...dependency.importedSymbols],
    })),
    [
      {
        specifier: '../../shared/dimensions/drawer_sketch_policy.js',
        symbols: ['DRAWER_SKETCH_PREVIEW_RENDER_POLICY', 'DRAWER_SKETCH_SIZING_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/sketch_box_preview_policy.js',
        symbols: ['SKETCH_BOX_DOOR_PREVIEW_POLICY'],
      },
    ]
  );
  assert.equal(focusedOwners.length, 2);
  assert.equal(
    dependencies.some(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared')),
    false
  );
  assert.doesNotMatch(
    source,
    /\b(?:DRAWER_DIMENSIONS|SKETCH_BOX_DIMENSIONS|DRAWER_SKETCH_POLICY|SKETCH_BOX_PREVIEW_POLICY)\b|import\s+\*\s+as|export\s+(?:type\s+)?(?:\*|\{)/u
  );
  assert.doesNotMatch(
    source,
    /const\s+\w+\s*=\s*(?:DRAWER_SKETCH_PREVIEW_RENDER_POLICY|DRAWER_SKETCH_SIZING_POLICY|SKETCH_BOX_DOOR_PREVIEW_POLICY)\s*;/u
  );
});

test('[dimension tokens] Sketch Box Storage Preview pair uses exactly two focused owners', () => {
  const consumers = new Map([
    [
      'esm/native/builder/render_interior_sketch_boxes_contents_parts_barriers.ts',
      {
        storage: [
          'INTERIOR_STORAGE_BARRIER_POLICY',
          'INTERIOR_STORAGE_LAYOUT_POLICY',
          'INTERIOR_STORAGE_PREVIEW_POLICY',
        ],
        preview: ['SKETCH_BOX_STORAGE_PREVIEW_POLICY'],
      },
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_storage.ts',
      {
        storage: ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_PREVIEW_POLICY'],
        preview: [
          'SKETCH_BOX_PREVIEW_CORE_POLICY',
          'SKETCH_BOX_SHELF_PREVIEW_POLICY',
          'SKETCH_BOX_STORAGE_PREVIEW_POLICY',
        ],
      },
    ],
  ]);

  for (const [rel, symbols] of consumers) {
    const source = read(rel);
    const dependencies = analyzeModuleDependencies(path.join(ROOT, rel), source).imports;
    const focusedOwners = dependencies.filter(
      dependency =>
        dependency.syntax === 'static-import' &&
        (dependency.specifier.endsWith('/dimensions/interior_storage_policy.js') ||
          dependency.specifier.endsWith('/dimensions/sketch_box_preview_policy.js'))
    );

    assert.deepEqual(
      focusedOwners.map(dependency => ({
        specifier: dependency.specifier,
        symbols: [...dependency.importedSymbols],
      })),
      [
        {
          specifier: '../../shared/dimensions/interior_storage_policy.js',
          symbols: symbols.storage,
        },
        {
          specifier: '../../shared/dimensions/sketch_box_preview_policy.js',
          symbols: symbols.preview,
        },
      ]
    );
    assert.equal(focusedOwners.length, 2);
    assert.equal(
      dependencies.some(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared')),
      false
    );
    assert.doesNotMatch(
      source,
      /\b(?:INTERIOR_FITTINGS_DIMENSIONS|SKETCH_BOX_DIMENSIONS|INTERIOR_STORAGE_POLICY|SKETCH_BOX_PREVIEW_POLICY)\b|import\s+\*\s+as|export\s+(?:type\s+)?(?:\*|\{)/u
    );
    assert.doesNotMatch(
      source,
      /const\s+\w+\s*=\s*(?:INTERIOR_STORAGE_[A-Z_]+_POLICY|SKETCH_BOX_[A-Z_]+_PREVIEW_POLICY)\s*;/u
    );
  }
});

test('[dimension tokens] Sketch Box Rod Preview pair uses exactly two focused owners', () => {
  const consumers = new Map([
    [
      'esm/native/builder/render_interior_sketch_boxes_contents_parts_rods.ts',
      {
        interior: ['INTERIOR_ROD_RENDER_POLICY'],
        preview: ['SKETCH_BOX_ROD_PREVIEW_POLICY'],
      },
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_rod.ts',
      {
        interior: ['INTERIOR_ROD_RENDER_POLICY'],
        preview: ['SKETCH_BOX_PREVIEW_CORE_POLICY', 'SKETCH_BOX_ROD_PREVIEW_POLICY'],
      },
    ],
  ]);

  for (const [rel, symbols] of consumers) {
    const source = read(rel);
    const dependencies = analyzeModuleDependencies(path.join(ROOT, rel), source).imports;
    const focusedOwners = dependencies.filter(
      dependency =>
        dependency.syntax === 'static-import' &&
        (dependency.specifier.endsWith('/dimensions/interior_fittings_policy.js') ||
          dependency.specifier.endsWith('/dimensions/sketch_box_preview_policy.js'))
    );

    assert.deepEqual(
      focusedOwners.map(dependency => ({
        specifier: dependency.specifier,
        symbols: [...dependency.importedSymbols],
      })),
      [
        {
          specifier: '../../shared/dimensions/interior_fittings_policy.js',
          symbols: symbols.interior,
        },
        {
          specifier: '../../shared/dimensions/sketch_box_preview_policy.js',
          symbols: symbols.preview,
        },
      ]
    );
    assert.equal(focusedOwners.length, 2);
    assert.equal(
      dependencies.some(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared')),
      false
    );
    assert.doesNotMatch(
      source,
      /\b(?:INTERIOR_FITTINGS_DIMENSIONS|SKETCH_BOX_DIMENSIONS|INTERIOR_ROD_POLICY|SKETCH_BOX_PREVIEW_POLICY)\b|import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u
    );
    assert.doesNotMatch(
      source,
      /const\s+\w+\s*=\s*(?:INTERIOR_ROD_RENDER_POLICY|SKETCH_BOX_(?:PREVIEW_CORE|ROD_PREVIEW)_POLICY)\s*;/u
    );
  }
});

test('[dimension tokens] library presets and saved preset defaults read canonical dimensions', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /export const LIBRARY_PRESET_DIMENSIONS = Object\.freeze\(\{/);

  for (const rel of [
    'esm/native/features/library_preset/module_defaults.ts',
    'esm/native/features/library_preset/library_preset_flow_shared.ts',
    'esm/native/data/preset_models_data.ts',
  ]) {
    assertUsesToken(rel, 'LIBRARY_PRESET_DIMENSIONS');
  }

  const presetData = read('esm/native/data/preset_models_data.ts');
  assert.doesNotMatch(presetData, /doors: '4'/);
  assert.doesNotMatch(presetData, /width: '160'/);
  assert.doesNotMatch(presetData, /height: '240'/);
  assert.doesNotMatch(presetData, /depth: '55'/);
  assert.doesNotMatch(presetData, /cornerWidth: '120'/);
  assert.doesNotMatch(presetData, /cornerDoors: '3'/);
  assert.doesNotMatch(presetData, /drawersCount: '4'/);
});

test('[dimension tokens] interior presets and sketch drawer sizing read canonical dimensions', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /export const INTERIOR_PRESET_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /heightTokenEpsilonCm:/);

  for (const rel of [
    'esm/native/features/interior_layout_presets/ops.ts',
    'esm/native/features/sketch_drawer_sizing.ts',
    'esm/native/features/modules_configuration/module_defaults.ts',
    'esm/native/features/stack_split/module_config.ts',
  ]) {
    assertUsesToken(
      rel,
      rel.includes('sketch_drawer_sizing') ? 'DRAWER_DIMENSIONS' : 'INTERIOR_FITTINGS_DIMENSIONS'
    );
  }

  const presetOps = read('esm/native/features/interior_layout_presets/ops.ts');
  assert.doesNotMatch(presetOps, /pushRod\((3\.5|3\.8|4\.6|2\.3|1\.3)/);
  assert.doesNotMatch(presetOps, /barrierH = 0\.5/);
  assert.doesNotMatch(presetOps, /zFrontOffset: -0\.06/);

  const drawerSizing = read('esm/native/features/sketch_drawer_sizing.ts');
  assert.doesNotMatch(drawerSizing, /\/ 100/);
  assert.doesNotMatch(drawerSizing, /HEIGHT_TOKEN_EPSILON = 0\.0001/);
});

test('[dimension tokens] sketch divider, attachment, and free-box measurement overlays are centralized', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /export const SKETCH_BOX_DIVIDER_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const SKETCH_BOX_DIMENSION_OVERLAY_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /attachIntentMinOverlapMinM:/);
  assert.match(tokens, /placementGapDefaultM:/);

  const focusedConsumers = new Map([
    [
      'esm/native/builder/render_interior_sketch_layout_dimensions_grouping.ts',
      ['SKETCH_BOX_DIMENSION_GROUPING_POLICY'],
    ],
    [
      'esm/native/builder/render_interior_sketch_layout_dimensions_render.ts',
      ['SKETCH_BOX_DIMENSION_RENDER_POLICY'],
    ],
    ['esm/native/builder/render_interior_sketch_layout_dividers.ts', ['SKETCH_BOX_DIVIDER_GEOMETRY_POLICY']],
    [
      'esm/native/services/canvas_picking_sketch_box_divider_state_match.ts',
      ['SKETCH_BOX_DIVIDER_GEOMETRY_POLICY', 'SKETCH_BOX_DIVIDER_REMOVE_HIT_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_divider_state_placement.ts',
      ['SKETCH_BOX_DIVIDER_GEOMETRY_POLICY', 'SKETCH_BOX_DIVIDER_SNAP_POLICY'],
    ],
    ['esm/native/services/canvas_picking_sketch_box_segments.ts', ['SKETCH_BOX_DIVIDER_GEOMETRY_POLICY']],
  ]);
  for (const [rel, symbols] of focusedConsumers) {
    const source = read(rel);
    assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared|SKETCH_BOX_DIMENSIONS/u);
    assert.doesNotMatch(
      source,
      /SKETCH_BOX_(?:DIVIDER_POLICY|DIMENSION_OVERLAY_POLICY)\b/u,
      `${rel} must not import a compatibility aggregate`
    );
    assert.doesNotMatch(source, /import\s+\*|export\s+(?:\*|\{[^}]*\})\s+from/u);
    for (const symbol of symbols) assert.match(source, new RegExp(`\\b${symbol}\\b`, 'u'));
  }

  assertUsesToken(
    'esm/native/services/canvas_picking_sketch_free_box_placement_intent.ts',
    'SKETCH_BOX_FREE_ATTACH_INTENT_POLICY'
  );
  assertUsesToken(
    'esm/native/services/canvas_picking_sketch_free_box_gap.ts',
    'SKETCH_BOX_FREE_PLACEMENT_GAP_POLICY'
  );

  const freeBoxGap = read('esm/native/services/canvas_picking_sketch_free_box_gap.ts');
  assert.doesNotMatch(freeBoxGap, /return 0\.002/);
  assert.doesNotMatch(freeBoxGap, /Math\.max\(0\.0015, Math\.min\(0\.004/);

  const projectionFallback = read(
    'esm/native/services/canvas_picking_projection_runtime_box_no_main_workspace.ts'
  );
  assert.match(projectionFallback, /WARDROBE_DEFAULTS/);
  assert.match(projectionFallback, /NO_MAIN_SKETCH_DIMENSIONS/);
  assert.doesNotMatch(projectionFallback, /, 160\)/);
  assert.doesNotMatch(projectionFallback, /, 240\)/);
  assert.doesNotMatch(projectionFallback, /, 55\)/);
});

test('[dimension tokens] wardrobe dimension guide offsets are centralized', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /export const WARDROBE_DIMENSION_GUIDE_DIMENSIONS = Object\.freeze\(\{/);
  assert.match(tokens, /verticalPlacement: Object\.freeze\(\{/);
  assert.match(tokens, /expandedWidthYOffsetM:/);
  assert.match(tokens, /smallDepthStartYOffsetM:/);

  for (const rel of [
    'esm/native/builder/render_dimension_ops_shared.ts',
    'esm/native/builder/render_dimension_ops_main.ts',
    'esm/native/builder/render_dimension_ops_corner.ts',
  ]) {
    assertUsesToken(rel, 'WARDROBE_DIMENSION_GUIDE_DIMENSIONS');
  }

  const main = read('esm/native/builder/render_dimension_ops_main.ts');
  assert.doesNotMatch(main, /stackSplitActive \? 0\.54 : 0\.3/);
  assert.doesNotMatch(main, /displayH - 0\.35/);
  assert.doesNotMatch(main, /displayH - 0\.57/);

  const corner = read('esm/native/builder/render_dimension_ops_corner.ts');
  assert.doesNotMatch(corner, /cornerWallLenM > 0\.05/);
  assert.doesNotMatch(corner, /cornerWallLenM \* 0\.55/);
  assert.doesNotMatch(corner, /Math\.max\(0\.2, cornerWallLenM - 0\.08\)/);
});

test('[dimension tokens] mirror layout measurements read door visual dimension tokens', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /layoutFullInsetM:/);
  assert.match(tokens, /layoutRemoveToleranceSizeRatio:/);

  for (const rel of [
    'esm/shared/mirror_layout_contracts_shared.ts',
    'esm/native/features/door_authoring/internal/mirror_geometry.ts',
    'esm/native/builder/visuals_and_contents_door_visual_mirror_styled.ts',
  ]) {
    assertUsesToken(
      rel,
      rel.endsWith('mirror_layout_contracts_shared.ts')
        ? 'DOOR_MIRROR_LAYOUT_POLICY'
        : rel.endsWith('mirror_geometry.ts')
          ? 'MIRROR_REMOVE_TOLERANCE_SIZE_RATIO'
          : 'FULL_MIRROR_INSET_M'
    );
  }

  const contracts = read('esm/shared/mirror_layout_contracts_shared.ts');
  assert.match(contracts, /DOOR_MIRROR_LAYOUT_POLICY/);
  assert.doesNotMatch(contracts, /DOOR_VISUAL_DIMENSIONS/);
  assert.doesNotMatch(contracts, /FULL_MIRROR_INSET_M\s*=\s*0\.002/);
  assert.doesNotMatch(contracts, /MIN_MIRROR_SIZE_M\s*=\s*0\.02/);
  assert.doesNotMatch(contracts, /DEFAULT_REMOVE_TOLERANCE_M\s*=\s*0\.03/);

  const geometry = read('esm/native/features/door_authoring/internal/mirror_geometry.ts');
  assert.doesNotMatch(geometry, /\* 0\.18/);
});

test('[dimension tokens] door visual miter/profile/trim preview geometry is centralized', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /export const DOOR_MITER_RENDER_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /roundedBeadThicknessRatio:/);
  assert.match(tokens, /outerAccentLineThicknessM:/);
  assert.match(tokens, /frontSurfaceNudgeM:/);

  assertUsesToken(
    'esm/native/builder/visuals_and_contents_door_visual_miter_frame.ts',
    'DOOR_MITER_RENDER_POLICY'
  );
  assertUsesToken(
    'esm/native/builder/visuals_and_contents_door_visual_profile.ts',
    'DOOR_PROFILE_RENDER_POLICY'
  );
  assertUsesToken('esm/native/builder/door_trim_visuals.ts', 'DOOR_TRIM_RENDER_POLICY');

  const miter = read('esm/native/builder/visuals_and_contents_door_visual_miter_frame.ts');
  assert.doesNotMatch(miter, /Math\.max\(0\.001, Math\.min\(bandW/);
  assert.doesNotMatch(miter, /faceZ \+ 0\.0008 \* zSign/);
  assert.doesNotMatch(miter, /bevelOffset: -Math\.min\(0\.0006, bw \* 0\.03\)/);

  const profile = read('esm/native/builder/visuals_and_contents_door_visual_profile.ts');
  assert.doesNotMatch(profile, /lineT: 0\.0018/);
  assert.doesNotMatch(profile, /densityOverride: 12/);

  const trim = read('esm/native/builder/door_trim_visuals.ts');
  assert.doesNotMatch(trim, /frontZ = 0\.011/);
  assert.doesNotMatch(trim, /DEFAULT_DOOR_TRIM_DEPTH_M \* 0\.5 \+ 0\.0005/);
});

test('[dimension tokens] door split and cell dimension hover preview measurements are centralized', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /hoverStandardLineHeightRatio:/);
  assert.match(tokens, /cellDimsPreview: Object\.freeze\(\{/);

  assertUsesToken(
    'esm/native/services/canvas_picking_door_split_hover_flow.ts',
    'HINGED_DOOR_SPLIT_AUTHORING_POLICY'
  );
  assertUsesToken(
    'esm/native/services/canvas_picking_hover_preview_modes_cell_dims.ts',
    'WARDROBE_LAYOUT_DIMENSIONS'
  );

  const splitHover = read('esm/native/services/canvas_picking_door_split_hover_flow.ts');
  assert.doesNotMatch(splitHover, /maxY - minY < 0\.05/);
  assert.doesNotMatch(splitHover, /standardLineH = Math\.max\(0\.014, Math\.min\(0\.026/);
  assert.doesNotMatch(splitHover, /const zOff = 0\.02 \* \(zSign === -1 \? -1 : 1\)/);

  const cellDims = read('esm/native/services/canvas_picking_hover_preview_modes_cell_dims.ts');
  assert.doesNotMatch(cellDims, /w: Math\.max\(0\.03, Number\(previewTargetBox\.width\) - 0\.006\)/);
  assert.doesNotMatch(cellDims, /woodThick: Math\.max\(0\.004, Math\.min\(0\.01/);
});

test('[dimension tokens] door trim placement and front reveal frame geometry are centralized', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /export const DOOR_TRIM_REMOVE_TOLERANCE_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const DOOR_TRIM_NORMALIZATION_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const DOOR_TRIM_RENDER_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const DOOR_TRIM_DIMENSIONS = Object\.freeze\(\{/);
  assert.match(tokens, /export const FRONT_REVEAL_GEOMETRY_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const FRONT_REVEAL_PRESENCE_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const FRONT_REVEAL_THICKNESS_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const FRONT_REVEAL_FRAME_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /legacyDimensionNumberView\(FRONT_REVEAL_FRAME_POLICY\)/);

  assertUsesToken('esm/native/features/door_authoring/internal/trim_shared.ts', 'DOOR_TRIM_RENDER_POLICY');
  assertUsesToken(
    'esm/native/features/door_authoring/internal/trim_placement_geometry.ts',
    'DOOR_TRIM_SNAP_POLICY'
  );
  assertUsesToken(
    'esm/native/features/door_authoring/internal/trim_placement_match.ts',
    'DOOR_TRIM_REMOVE_TOLERANCE_POLICY'
  );
  assertUsesToken(
    'esm/native/features/door_authoring/internal/trim_placement_mirror.ts',
    'DOOR_TRIM_NORMALIZATION_POLICY'
  );

  assertUsesToken(
    'esm/native/builder/post_build_front_reveal_frames_runtime.ts',
    'FRONT_REVEAL_GEOMETRY_POLICY'
  );
  assertUsesToken(
    'esm/native/builder/post_build_front_reveal_frames_geometry.ts',
    'FRONT_REVEAL_GEOMETRY_POLICY'
  );
  assertUsesToken(
    'esm/native/builder/post_build_front_reveal_frames_doors.ts',
    'FRONT_REVEAL_THICKNESS_POLICY'
  );
  assertUsesToken(
    'esm/native/builder/post_build_front_reveal_frames_drawers.ts',
    'FRONT_REVEAL_PRESENCE_POLICY'
  );
  assertUsesToken(
    'esm/native/builder/post_build_front_reveal_frames_drawers.ts',
    'FRONT_REVEAL_THICKNESS_POLICY'
  );
  for (const rel of [
    'esm/native/builder/post_build_front_reveal_frames_runtime.ts',
    'esm/native/builder/post_build_front_reveal_frames_geometry.ts',
    'esm/native/builder/post_build_front_reveal_frames_doors.ts',
    'esm/native/builder/post_build_front_reveal_frames_drawers.ts',
  ]) {
    assert.doesNotMatch(read(rel), /FRONT_REVEAL_FRAME_DIMENSIONS/);
  }

  const trimShared = read('esm/native/features/door_authoring/internal/trim_shared.ts');
  assert.doesNotMatch(trimShared, /CENTER_EPSILON = 1e-4/);

  const trimMatch = read('esm/native/features/door_authoring/internal/trim_placement_match.ts');
  assert.doesNotMatch(trimMatch, /DEFAULT_DOOR_TRIM_THICKNESS_M \* 1\.15/);
  assert.doesNotMatch(trimMatch, /Math\.min\(0\.09, crossSpan \* 0\.12\)/);

  const revealGeometry = read('esm/native/builder/post_build_front_reveal_frames_geometry.ts');
  assert.doesNotMatch(revealGeometry, /const xyInset = 0\.0015/);
  assert.doesNotMatch(revealGeometry, /sign \* 0\.00008/);
  assert.doesNotMatch(revealGeometry, /makeRectGeom\(0\.0011, sign \* 0\.00016\)/);

  const revealDoors = read('esm/native/builder/post_build_front_reveal_frames_doors.ts');
  assert.doesNotMatch(revealDoors, /type === 'sliding' \? 0\.022 : 0\.018/);

  const revealDrawers = read('esm/native/builder/post_build_front_reveal_frames_drawers.ts');
  assert.doesNotMatch(revealDrawers, /Math\.abs\(explicitFrontMax\) > 1e-6/);
  assert.doesNotMatch(revealDrawers, /const thickness = Number\.isFinite\(t\) && t > 0 \? t : 0\.02/);
});

test('[dimension tokens] interior cylinder radial segments are owned by focused policies', () => {
  const rodOps = read('esm/native/builder/render_interior_rod_ops.ts');
  const sketchMaterials = read('esm/native/builder/render_interior_sketch_support_materials.ts');

  assert.match(
    rodOps,
    /new THREE\.CylinderGeometry\([\s\S]*?INTERIOR_ROD_RENDER_POLICY\.radialSegments\s*\)/u
  );
  assert.doesNotMatch(
    rodOps,
    /new THREE\.CylinderGeometry\([\s\S]*?innerW - INTERIOR_ROD_RENDER_POLICY\.widthClearanceM,\s*12\s*\)/u
  );

  assert.match(
    sketchMaterials,
    /new THREE\.CylinderGeometry\([\s\S]*?INTERIOR_SHELF_PIN_RENDER_POLICY\.radialSegments\s*\)/u
  );
  assert.doesNotMatch(
    sketchMaterials,
    /new THREE\.CylinderGeometry\(\s*pinRadius,\s*pinRadius,\s*pinLen,\s*12\s*\)/u
  );
});

test('[dimension tokens] corner wing and connector shell dimensions read canonical tokens', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /shellMinWallHeightM:/);
  assert.match(tokens, /shellPanelMinLengthM:/);
  assert.match(tokens, /minBlindWidthM:/);

  assertUsesToken(
    'esm/native/builder/corner_wing_carcass_shell_dividers.ts',
    'CORNER_CONNECTOR_SHELL_POLICY'
  );
  assertUsesToken('esm/native/builder/corner_wing_carcass_shell_dividers.ts', 'CORNER_WING_PANEL_POLICY');
  for (const token of [
    'BASE_PLATFORM_RENDER_POLICY',
    'BASE_PLINTH_POLICY',
    'CORNER_CONNECTOR_SHELL_POLICY',
    'CORNER_WING_PANEL_POLICY',
    'CORNER_WING_SELECTOR_POLICY',
  ]) {
    assertUsesToken('esm/native/builder/corner_wing_carcass_shell_floor_base.ts', token);
  }
  assertUsesToken(
    'esm/native/builder/corner_connector_emit_shell_panels.ts',
    'CORNER_CONNECTOR_SHELL_POLICY'
  );
  assertLinearDimensionsUseOwnersOrMeters('esm/shared/dimensions/corner_system_policy.ts');
  assertLinearDimensionsUseOwnersOrMeters('esm/shared/dimensions/corner_connector_interior_policy.ts');

  const dividers = read('esm/native/builder/corner_wing_carcass_shell_dividers.ts');
  assert.doesNotMatch(dividers, /Math\.max\(0\.001, woodThick\)/);
  assert.doesNotMatch(dividers, /leftHRaw - 0\.002/);
  assert.doesNotMatch(dividers, /Math\.max\(0\.2, leftCell\.depth\)/);
  assert.doesNotMatch(dividers, /resolveCornerWingWallPlacement\(params, metrics, .*?, 0\.05\)/);

  const floorBase = read('esm/native/builder/corner_wing_carcass_shell_floor_base.ts');
  assert.doesNotMatch(floorBase, /woodThick \/ 2 \+ 0\.002/);
  assert.doesNotMatch(floorBase, /blindWidth > 0\.001/);
  assert.doesNotMatch(floorBase, /Math\.max\(0\.2, d0\)/);
  assert.doesNotMatch(floorBase, /resolveCornerWingHorizPlacement\(params, metrics, .*?, 0\.05\)/);

  const connectorPanels = read('esm/native/builder/corner_connector_emit_shell_panels.ts');
  assert.doesNotMatch(connectorPanels, /len0 <= 0\.01/);
  assert.doesNotMatch(connectorPanels, /len <= 0\.01/);
});

test('[dimension tokens] Corner Connector Interior consumers use focused owners and direct unit constants', () => {
  const facade = read('esm/shared/wardrobe_dimension_tokens_shared.ts');
  assert.match(
    facade,
    /CORNER_CONNECTOR_INTERIOR_DIMENSIONS\s*=\s*legacyDimensionNumberView\(\s*CORNER_CONNECTOR_INTERIOR_POLICY\s*\)/u
  );
  assert.doesNotMatch(facade, /export const CORNER_CONNECTOR_INTERIOR_DIMENSIONS = Object\.freeze\(\{/u);

  const owner = read('esm/shared/dimensions/corner_connector_interior_policy.ts');
  assert.doesNotMatch(owner, /^\s*[A-Za-z_$][\w$]*Cm:\s*-?(?:\d|\.\d)/mu);
  assert.doesNotMatch(owner, /^\s*[A-Za-z_$][\w$]*Mm:\s*-?(?:\d|\.\d)/mu);
  assertLinearDimensionsUseOwnersOrMeters('esm/shared/dimensions/corner_connector_interior_policy.ts');

  const focusedConsumers = new Map([
    ['esm/native/builder/corner_connector_interior_rod.ts', ['CORNER_CONNECTOR_ATTACH_ROD_POLICY']],
    [
      'esm/native/builder/corner_connector_interior_special_apply.ts',
      ['CORNER_CONNECTOR_SPECIAL_POST_POLICY'],
    ],
    [
      'esm/native/builder/corner_connector_interior_special_contents.ts',
      ['CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY'],
    ],
    [
      'esm/native/builder/corner_connector_interior_special_metrics.ts',
      ['CORNER_CONNECTOR_SPECIAL_POST_POLICY'],
    ],
  ]);

  for (const [rel, symbols] of focusedConsumers) {
    for (const symbol of symbols) assertUsesToken(rel, symbol);
    assert.doesNotMatch(
      read(rel),
      /CORNER_CONNECTOR_INTERIOR_DIMENSIONS/u,
      `${rel} must not import or alias the legacy aggregate`
    );
  }

  const rod = read('esm/native/builder/corner_connector_interior_rod.ts');
  assert.match(rod, /from '\.\.\/\.\.\/shared\/dimensions\/units\.js';/u);
  assert.match(rod, /\bCM_PER_METER\b/u);
  assert.match(rod, /\bMM_PER_METER\b/u);
  assert.doesNotMatch(rod, /wardrobe_dimension_tokens_shared/u);

  const metrics = read('esm/native/builder/corner_connector_interior_special_metrics.ts');
  assert.match(metrics, /import \{ CM_PER_METER \} from '\.\.\/\.\.\/shared\/dimensions\/units\.js';/u);
  assert.doesNotMatch(metrics, /wardrobe_dimension_tokens_shared/u);

  const contents = read('esm/native/builder/corner_connector_interior_special_contents.ts');
  assert.doesNotMatch(contents, /const\s+\w+\s*=\s*CORNER_CONNECTOR_INTERIOR_POLICY/u);
});

test('[dimension tokens] Corner dimension/default readers use focused owners and canonical units/defaults', () => {
  const consumers = new Map([
    [
      'esm/native/builder/post_build_dimensions_corner.ts',
      ['CORNER_CONNECTOR_LAYOUT_POLICY', 'CORNER_WING_BODY_POLICY'],
    ],
    [
      'esm/native/features/modules_configuration/corner_cells_ui_defaults.ts',
      ['CORNER_WING_BODY_POLICY', 'CORNER_WING_CELL_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_cell_dims_corner_context.ts',
      ['CORNER_CONNECTOR_LAYOUT_POLICY', 'CORNER_WING_BODY_POLICY'],
    ],
  ]);

  for (const [rel, policies] of consumers) {
    const source = read(rel);
    for (const policy of policies) assertUsesToken(rel, policy);
    assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
    assert.doesNotMatch(source, /CORNER_WING_DIMENSIONS/u);
    assert.doesNotMatch(source, /CORNER_SYSTEM_POLICY/u);
    assert.match(source, /shared\/dimensions\/corner_system_policy\.js/u);
    assert.match(source, /shared\/dimensions\/units\.js/u);
  }

  const postBuild = read('esm/native/builder/post_build_dimensions_corner.ts');
  assert.match(postBuild, /shared\/dimensions\/wardrobe_defaults\.js/u);
  assert.match(postBuild, /CORNER_CONNECTOR_LAYOUT_POLICY\.defaultWallLengthM/u);
  assert.match(postBuild, /CORNER_CONNECTOR_LAYOUT_POLICY\.minWallLengthM/u);
  assert.match(postBuild, /CORNER_WING_BODY_POLICY\.defaultWidthCm/u);

  const uiDefaults = read('esm/native/features/modules_configuration/corner_cells_ui_defaults.ts');
  assert.match(uiDefaults, /CORNER_WING_BODY_POLICY\.defaultWidthCm/u);
  assert.match(uiDefaults, /CORNER_WING_BODY_POLICY\.minActiveWidthM/u);
  assert.match(uiDefaults, /CORNER_WING_CELL_POLICY\.doorsPerCell/u);
  assert.match(uiDefaults, /CORNER_WING_CELL_POLICY\.minDoorUnitWidthM/u);
  assert.doesNotMatch(uiDefaults, /wardrobe_defaults/u);

  const canvas = read('esm/native/services/canvas_picking_cell_dims_corner_context.ts');
  assert.match(canvas, /shared\/dimensions\/wardrobe_defaults\.js/u);
  assert.match(canvas, /CORNER_CONNECTOR_LAYOUT_POLICY\.defaultWallLengthM/u);
  assert.match(canvas, /CORNER_WING_BODY_POLICY\.defaultWidthCm/u);
});

test('[dimension tokens] migrated Corner mixed consumers use only canonical focused owners', () => {
  const consumers = new Map([
    [
      'esm/native/builder/corner_connector_cornice_shared.ts',
      ['CARCASS_CORNICE_COMMON_POLICY', 'CORNER_CONNECTOR_CORNICE_HIT_POLICY'],
    ],
    [
      'esm/native/builder/corner_state_normalize_layout.ts',
      [
        'BASE_PLATFORM_RENDER_POLICY',
        'CORNER_CONNECTOR_DOOR_RENDER_POLICY',
        'CORNER_CONNECTOR_LAYOUT_POLICY',
        'CORNER_WING_BODY_POLICY',
        'WARDROBE_DEFAULTS',
      ],
    ],
    [
      'esm/native/builder/corner_wing_carcass_shell_floor_base.ts',
      [
        'BASE_PLATFORM_RENDER_POLICY',
        'BASE_PLINTH_POLICY',
        'CORNER_CONNECTOR_SHELL_POLICY',
        'CORNER_WING_PANEL_POLICY',
        'CORNER_WING_SELECTOR_POLICY',
      ],
    ],
    [
      'esm/native/builder/corner_wing_cell_interiors_shelves.ts',
      [
        'CORNER_WING_INTERIOR_POLICY',
        'INTERIOR_SHELF_GEOMETRY_POLICY',
        'INTERIOR_SHELF_PIN_RENDER_POLICY',
        'MATERIAL_THICKNESS_POLICY',
      ],
    ],
    [
      'esm/native/builder/corner_wing_cell_interiors_storage.ts',
      ['CORNER_WING_DRAWER_POLICY', 'INTERIOR_ROD_RENDER_POLICY'],
    ],
    [
      'esm/native/builder/corner_wing_extension_cells_handles.ts',
      ['CORNER_WING_BODY_POLICY', 'CORNER_WING_CELL_POLICY', 'EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY'],
    ],
  ]);

  for (const [rel, policies] of consumers) {
    const source = read(rel);
    for (const policy of policies) assertUsesToken(rel, policy);
    assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
    assert.doesNotMatch(source, /CORNER_WING_DIMENSIONS/u);
    assert.doesNotMatch(source, /CORNER_SYSTEM_POLICY/u);
    assert.doesNotMatch(source, /export\s+(?:type\s+)?(?:\*|\{)/u);
  }

  const productionFiles = listFilesRecursively(path.join(ROOT, 'esm')).filter(
    file => !file.endsWith('wardrobe_dimension_tokens_shared.ts')
  );
  const productionConsumers = productionFiles.filter(file =>
    /CORNER_WING_DIMENSIONS/u.test(fs.readFileSync(file, 'utf8'))
  );
  assert.deepEqual(productionConsumers, [], 'CORNER_WING_DIMENSIONS must have no production consumers');
});

test('[dimension tokens] Drawer and Handle mixed consumers use only focused canonical owners', () => {
  const consumers = new Map([
    [
      'esm/shared/wardrobe_construction_validation_shared.ts',
      ['EXTERNAL_DRAWER_SIZE_POLICY', 'EDGE_HANDLE_SIZE_POLICY', 'STANDARD_HANDLE_RENDER_POLICY'],
    ],
    [
      'esm/native/builder/build_handle_policy.ts',
      ['EXTERNAL_DRAWER_SIZE_POLICY', 'EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY'],
    ],
    [
      'esm/native/builder/hinged_doors_module_ops_context.ts',
      [
        'HINGED_DOOR_MOUNT_POLICY',
        'HINGED_DOOR_RENDER_POLICY',
        'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
        'EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY',
      ],
    ],
    [
      'esm/native/builder/hinged_doors_module_ops_handle_policy.ts',
      ['EXTERNAL_DRAWER_SIZE_POLICY', 'EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY'],
    ],
    [
      'esm/native/builder/post_build_sketch_door_cuts_rebuild_handles.ts',
      ['DRAWER_SKETCH_DOOR_CUT_POLICY', 'EDGE_HANDLE_SIZE_POLICY', 'STANDARD_HANDLE_RENDER_POLICY'],
    ],
    [
      'esm/native/builder/post_build_sketch_door_cuts_rebuild_shared.ts',
      ['DRAWER_SKETCH_DOOR_CUT_POLICY', 'EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY'],
    ],
  ]);

  for (const [rel, policies] of consumers) {
    const source = read(rel);
    for (const policy of policies) assertUsesToken(rel, policy);
    assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
    assert.doesNotMatch(source, /\bDRAWER_DIMENSIONS\b/u);
    assert.doesNotMatch(source, /\bHANDLE_DIMENSIONS\b/u);
    assert.doesNotMatch(source, /\bDOOR_SYSTEM_DIMENSIONS\b/u);
    assert.doesNotMatch(
      source,
      /\b(?:EXTERNAL_DRAWER_POLICY|DRAWER_SKETCH_POLICY|HANDLE_POLICY|HINGED_DOOR_SYSTEM_POLICY)\b/u
    );
    assert.doesNotMatch(source, /import\s+\*\s+as/u);
    assert.doesNotMatch(source, /export\s+(?:type\s+)?(?:\*|\{)/u);
  }

  const remainingHandleConsumers = listFilesRecursively(path.join(ROOT, 'esm'))
    .filter(file => {
      if (file.endsWith('wardrobe_dimension_tokens_shared.ts')) return false;
      return /\bHANDLE_DIMENSIONS\b/u.test(fs.readFileSync(file, 'utf8'));
    })
    .map(file => path.relative(ROOT, file).replaceAll('\\', '/'));
  assert.deepEqual(remainingHandleConsumers, []);
});

test('[dimension tokens] Builder Interior ownership and render primitives use focused canonical owners', () => {
  const consumers = new Map([
    [
      'esm/native/builder/render_interior_custom_ops.ts',
      ['INTERIOR_SHELF_GEOMETRY_POLICY', 'INTERIOR_STORAGE_GRID_POLICY', 'MATERIAL_THICKNESS_POLICY'],
    ],
    [
      'esm/native/builder/render_interior_custom_ops_shelves.ts',
      [
        'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
        'INTERIOR_SHELF_GEOMETRY_POLICY',
        'INTERIOR_SHELF_PIN_RENDER_POLICY',
        'MATERIAL_THICKNESS_POLICY',
      ],
    ],
    [
      'esm/native/builder/render_interior_preset_ops.ts',
      [
        'INTERIOR_SHELF_GEOMETRY_POLICY',
        'INTERIOR_STORAGE_BARRIER_POLICY',
        'INTERIOR_STORAGE_GRID_POLICY',
        'MATERIAL_THICKNESS_POLICY',
      ],
    ],
    [
      'esm/native/builder/render_interior_sketch_ops_input.ts',
      ['INTERIOR_SHELF_GEOMETRY_POLICY', 'MATERIAL_THICKNESS_POLICY'],
    ],
    [
      'esm/native/builder/render_interior_sketch_support_shelves.ts',
      [
        'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
        'INTERIOR_SHELF_GEOMETRY_POLICY',
        'MATERIAL_THICKNESS_POLICY',
      ],
    ],
    [
      'esm/native/builder/render_ops_primitives.ts',
      ['INTERIOR_SHELF_ROUNDED_RENDER_POLICY', 'EDGE_HANDLE_SIZE_POLICY', 'STANDARD_HANDLE_RENDER_POLICY'],
    ],
  ]);

  for (const [rel, policies] of consumers) {
    const source = read(rel);
    for (const policy of policies) assertUsesToken(rel, policy);
    assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
    assert.doesNotMatch(
      source,
      /\b(?:INTERIOR_FITTINGS_DIMENSIONS|MATERIAL_DIMENSIONS|HANDLE_DIMENSIONS)\b/u
    );
    assert.doesNotMatch(source, /\b(?:INTERIOR_FITTINGS_POLICY|INTERIOR_STORAGE_POLICY|HANDLE_POLICY)\b/u);
    assert.doesNotMatch(source, /import\s+\*\s+as/u);
    assert.doesNotMatch(source, /export\s+(?:type\s+)?(?:\*|\{)/u);
  }

  const remainingHandleConsumers = listFilesRecursively(path.join(ROOT, 'esm'))
    .filter(file => {
      if (file.endsWith('wardrobe_dimension_tokens_shared.ts')) return false;
      return /\bHANDLE_DIMENSIONS\b/u.test(fs.readFileSync(file, 'utf8'));
    })
    .map(file => path.relative(ROOT, file).replaceAll('\\', '/'));
  assert.deepEqual(remainingHandleConsumers, []);
});

test('[dimension tokens] Service Interior and Material readers use focused canonical owners without Sketch Box', () => {
  const consumers = new Map([
    [
      'esm/native/services/canvas_picking_manual_layout_free_box_contracts.ts',
      ['INTERIOR_SHELF_GEOMETRY_POLICY', 'INTERIOR_STORAGE_GRID_POLICY', 'MATERIAL_THICKNESS_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_vertical_blockers.ts',
      [
        'INTERIOR_ROD_PLACEMENT_POLICY',
        'INTERIOR_ROD_RENDER_POLICY',
        'INTERIOR_SHELF_GEOMETRY_POLICY',
        'INTERIOR_STORAGE_BARRIER_POLICY',
        'INTERIOR_STORAGE_CLAMP_POLICY',
        'INTERIOR_STORAGE_GRID_POLICY',
        'INTERIOR_STORAGE_LAYOUT_POLICY',
        'MATERIAL_THICKNESS_POLICY',
      ],
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_content_commit_drawers.ts',
      ['INTERIOR_SHELF_GEOMETRY_POLICY', 'MATERIAL_THICKNESS_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_vertical_content_blockers.ts',
      [
        'INTERIOR_ROD_RENDER_POLICY',
        'INTERIOR_STORAGE_BARRIER_POLICY',
        'INTERIOR_STORAGE_LAYOUT_POLICY',
        'MATERIAL_THICKNESS_POLICY',
      ],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_vertical_content_collision.ts',
      [
        'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
        'INTERIOR_ROD_RENDER_POLICY',
        'INTERIOR_SHELF_GEOMETRY_POLICY',
        'MATERIAL_THICKNESS_POLICY',
      ],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_vertical_content_preview.ts',
      ['INTERIOR_SHELF_GEOMETRY_POLICY', 'MATERIAL_THICKNESS_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_neighbor_measurements.ts',
      ['INTERIOR_STORAGE_GRID_POLICY', 'MATERIAL_THICKNESS_POLICY'],
    ],
  ]);

  for (const [rel, policies] of consumers) {
    const source = read(rel);
    for (const policy of policies) assertUsesToken(rel, policy);
    assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
    assert.doesNotMatch(
      source,
      /\b(?:INTERIOR_FITTINGS_DIMENSIONS|MATERIAL_DIMENSIONS|DRAWER_DIMENSIONS|SKETCH_BOX_DIMENSIONS)\b/u
    );
    assert.doesNotMatch(
      source,
      /\b(?:INTERIOR_FITTINGS_POLICY|INTERIOR_STORAGE_POLICY|DRAWER_SKETCH_POLICY)\b/u
    );
    assert.doesNotMatch(source, /import\s+\*\s+as/u);
    assert.doesNotMatch(source, /export\s+(?:type\s+)?(?:\*|\{)/u);
  }

  const splitHover = read('esm/native/services/canvas_picking_split_hover_preview_line.ts');
  for (const policy of [
    'BASE_PLINTH_POLICY',
    'CARCASS_INTERIOR_GRID_POLICY',
    'CARCASS_SHELL_DIMENSIONS',
    'HINGED_DOOR_SPLIT_GEOMETRY_POLICY',
    'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
    'EXTERNAL_DRAWER_SIZE_POLICY',
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'MATERIAL_THICKNESS_POLICY',
  ]) {
    assertUsesToken('esm/native/services/canvas_picking_split_hover_preview_line.ts', policy);
  }
  assert.doesNotMatch(splitHover, /wardrobe_dimension_tokens_shared/u);
  assert.doesNotMatch(
    splitHover,
    /\b(?:CARCASS_BASE_DIMENSIONS|DOOR_SYSTEM_DIMENSIONS|DRAWER_DIMENSIONS|INTERIOR_FITTINGS_DIMENSIONS|MATERIAL_DIMENSIONS|SKETCH_BOX_DIMENSIONS)\b/u
  );
  assert.doesNotMatch(splitHover, /CARCASS_SHELL_DIMENSIONS\.drawer(?:GridDivisions|SplitGridLineIndex)/u);
  assert.match(splitHover, /CARCASS_INTERIOR_GRID_POLICY\.drawerSplitLineIndex/u);
  assert.match(splitHover, /CARCASS_INTERIOR_GRID_POLICY\.divisions/u);
  assert.doesNotMatch(
    splitHover,
    /\b(?:HINGED_DOOR_SYSTEM_POLICY|EXTERNAL_DRAWER_POLICY|INTERIOR_STORAGE_POLICY)\b/u
  );
  assert.doesNotMatch(splitHover, /import\s+\*\s+as/u);
  assert.doesNotMatch(splitHover, /export\s+(?:type\s+)?(?:\*|\{)/u);

  const remainingHandleConsumers = listFilesRecursively(path.join(ROOT, 'esm'))
    .filter(file => {
      if (file.endsWith('wardrobe_dimension_tokens_shared.ts')) return false;
      return /\bHANDLE_DIMENSIONS\b/u.test(fs.readFileSync(file, 'utf8'));
    })
    .map(file => path.relative(ROOT, file).replaceAll('\\', '/'));
  assert.deepEqual(remainingHandleConsumers, []);
});

test('[dimension tokens] Stack Split Lower uses only focused canonical owners', () => {
  const rel = 'esm/native/builder/build_stack_split_lower_setup.ts';
  const source = read(rel);
  for (const policy of [
    'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
    'CARCASS_INTERIOR_DIMENSIONS',
    'CARCASS_INTERIOR_GRID_POLICY',
    'EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY',
  ]) {
    assertUsesToken(rel, policy);
  }
  assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
  assert.doesNotMatch(source, /\b(?:HANDLE_DIMENSIONS|CARCASS_SHELL_DIMENSIONS)\b/u);
  assert.doesNotMatch(source, /\b(?:HANDLE_POLICY|STACK_SPLIT_POLICY)\b/u);
  assert.doesNotMatch(source, /CARCASS_SHELL_DIMENSIONS\.drawer(?:GridDivisions|SplitGridLineIndex)/u);
  assert.match(source, /CARCASS_INTERIOR_GRID_POLICY\.divisions/u);
  assert.match(source, /CARCASS_INTERIOR_GRID_POLICY\.drawerSplitLineIndex/u);
  assert.match(source, /CARCASS_INTERIOR_DIMENSIONS\.internalBackInsetM/u);
  assert.match(source, /EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY\.defaultGlobalAbsYM/u);
  assert.match(source, /EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY\.drawerLiftThresholdYM/u);
  assert.match(source, /EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY\.drawerLiftClearanceM/u);
  assert.doesNotMatch(source, /import\s+\*\s+as/u);
  assert.doesNotMatch(source, /export\s+(?:type\s+)?(?:\*|\{)/u);

  const remainingHandleConsumers = listFilesRecursively(path.join(ROOT, 'esm'))
    .filter(file => {
      if (file.endsWith('wardrobe_dimension_tokens_shared.ts')) return false;
      return /\bHANDLE_DIMENSIONS\b/u.test(fs.readFileSync(file, 'utf8'));
    })
    .map(file => path.relative(ROOT, file).replaceAll('\\', '/'));
  assert.deepEqual(remainingHandleConsumers, []);
});

test('[dimension tokens] sketch drawer cut, handle placement, rods, and storage dimensions are centralized', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /doorCutHorizontalOverlapMinM:/);
  assert.match(tokens, /rebuiltSegmentHandlePaddingHeightRatio:/);
  assert.match(tokens, /export const DRAWER_HANDLE_PLACEMENT_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /separatorBoardWidthClearanceM:/);
  assert.match(tokens, /clampPadWoodRatio:/);
  assertLinearDimensionsUseOwnersOrMeters('esm/shared/dimensions/handle_policy.ts');

  assertUsesToken('esm/native/builder/post_build_sketch_door_cuts_apply.ts', 'DRAWER_DIMENSIONS');
  for (const rel of [
    'esm/native/builder/post_build_sketch_door_cuts_rebuild_handles.ts',
    'esm/native/builder/post_build_sketch_door_cuts_rebuild_shared.ts',
  ]) {
    assertUsesToken(rel, 'DRAWER_SKETCH_DOOR_CUT_POLICY');
  }
  for (const rel of [
    'esm/native/builder/post_build_sketch_door_cuts_intervals.ts',
    'esm/native/builder/post_build_sketch_door_cuts_rebuild_visual.ts',
  ]) {
    assertUsesToken(rel, 'DRAWER_SKETCH_DOOR_CUT_POLICY');
  }

  assertUsesToken('esm/native/builder/handles_apply_drawers.ts', 'DRAWER_HANDLE_PLACEMENT_POLICY');
  assertUsesToken('esm/native/builder/handles_apply_shared.ts', 'DRAWER_HANDLE_PLACEMENT_POLICY');
  assertUsesToken('esm/native/builder/edge_handle_profile.ts', 'EDGE_HANDLE_PROFILE_RENDER_POLICY');
  assertUsesToken('esm/native/builder/handles_mesh.ts', 'EDGE_HANDLE_SIZE_POLICY');
  assertUsesToken('esm/native/builder/handles_mesh.ts', 'STANDARD_HANDLE_RENDER_POLICY');

  assertUsesToken('esm/native/builder/render_interior_sketch_support_rods.ts', 'INTERIOR_ROD_RENDER_POLICY');
  for (const tokenName of [
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_CLAMP_POLICY',
    'INTERIOR_STORAGE_LAYOUT_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]) {
    assertUsesToken('esm/native/builder/render_interior_sketch_support_storage.ts', tokenName);
  }

  assertUsesToken('esm/native/builder/external_drawer_shelf.ts', 'EXTERNAL_DRAWER_SEPARATOR_POLICY');

  const cutsApply = read('esm/native/builder/post_build_sketch_door_cuts_apply.ts');
  assert.doesNotMatch(cutsApply, /overlap > 0\.005/);
  assert.doesNotMatch(cutsApply, /<= 0\.002/);

  const intervals = read('esm/native/builder/post_build_sketch_door_cuts_intervals.ts');
  assert.doesNotMatch(intervals, /> 0\.01/);
  assert.doesNotMatch(intervals, /\+ 0\.002/);
  assert.doesNotMatch(intervals, /0\.012/);

  const rebuildHandles = read('esm/native/builder/post_build_sketch_door_cuts_rebuild_handles.ts');
  assert.doesNotMatch(rebuildHandles, /segHeight < 0\.12/);
  assert.doesNotMatch(rebuildHandles, /Math\.max\(0\.02, segHeight\)/);
  assert.doesNotMatch(rebuildHandles, /Math\.min\(0\.1, Math\.max\(0\.02, segHeight \* 0\.2\)\)/);

  const rebuildShared = read('esm/native/builder/post_build_sketch_door_cuts_rebuild_shared.ts');
  assert.doesNotMatch(rebuildShared, /Math\.max\(0\.02, width\)/);
  assert.doesNotMatch(rebuildShared, /Math\.max\(0\.002, thickness\)/);
  assert.doesNotMatch(rebuildShared, /padding = 0\.01/);

  const rebuildVisual = read('esm/native/builder/post_build_sketch_door_cuts_rebuild_visual.ts');
  assert.doesNotMatch(rebuildVisual, /Math\.max\(0\.02, width - 0\.004\)/);
  assert.doesNotMatch(rebuildVisual, /Math\.max\(0\.02, segHeight\)/);

  const handleDrawers = read('esm/native/builder/handles_apply_drawers.ts');
  assert.doesNotMatch(handleDrawers, /__doorWidth \|\| 0\.4/);
  assert.doesNotMatch(handleDrawers, /__doorHeight \|\| 0\.2/);
  assert.doesNotMatch(handleDrawers, /targetVisibleProtrusionZ = 0\.0135/);
  assert.doesNotMatch(handleDrawers, /drawH < 0\.21 \? 0\.02 : 0/);

  const handleShared = read('esm/native/builder/handles_apply_shared.ts');
  assert.doesNotMatch(handleShared, /H > 0\.05/);
  assert.doesNotMatch(handleShared, /Math\.min\(0\.1, Math\.max\(0\.02, H \* 0\.2\)\)/);

  const rods = read('esm/native/builder/render_interior_sketch_support_rods.ts');
  assert.doesNotMatch(rods, /Math\.max\(0\.05, innerW - 0\.06\)/);
  assert.doesNotMatch(rods, /CylinderGeometry\(0\.015, 0\.015, len, 12\)/);

  const storage = read('esm/native/builder/render_interior_sketch_support_storage.ts');
  assert.doesNotMatch(storage, /Math\.min\(0\.006, Math\.max\(0\.001, woodThick \* 0\.2\)\)/);
  assert.doesNotMatch(storage, /frontZ - 0\.06/);
  assert.doesNotMatch(storage, /Math\.max\(0\.05, innerW - 0\.025\)/);
  assert.doesNotMatch(storage, /woodThick \* 2 \+ 0\.02/);

  const externalPipeline = read('esm/native/builder/external_drawers_pipeline.ts');
  assert.doesNotMatch(externalPipeline, /innerW - 0\.025/);
});

test('[dimension tokens] External and Internal Drawer owners preserve focused production consumption', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /export const EXTERNAL_DRAWER_POLICY = Object\.freeze\(\{/u);
  assert.match(tokens, /export const INTERNAL_DRAWER_POLICY = Object\.freeze\(\{/u);
  assert.match(tokens, /doorTopGapM: STACK_SPLIT_POLICY\.seam\.gapM/u);

  const expectedConsumers = [
    ['esm/native/builder/external_drawer_shelf.ts', 'EXTERNAL_DRAWER_SEPARATOR_POLICY'],
    ['esm/native/builder/render_drawer_ops_external.ts', 'EXTERNAL_DRAWER_FRONT_RENDER_POLICY'],
    ['esm/native/builder/render_drawer_ops_external.ts', 'EXTERNAL_DRAWER_CONTENTS_POLICY'],
    [
      'esm/native/builder/render_interior_sketch_boxes_fronts_drawers_box.ts',
      'EXTERNAL_DRAWER_CONTENTS_POLICY',
    ],
    ['esm/native/builder/render_interior_sketch_drawers_external_box.ts', 'EXTERNAL_DRAWER_CONTENTS_POLICY'],
    ['esm/native/builder/render_interior_sketch_drawers_external_motion.ts', 'EXTERNAL_DRAWER_MOTION_POLICY'],
  ];
  for (const [file, symbol] of expectedConsumers) assertUsesToken(file, symbol);

  for (const file of new Set(expectedConsumers.map(([file]) => file))) {
    assert.doesNotMatch(read(file), /\bDRAWER_DIMENSIONS\b/u);
  }
});

test('[dimension tokens] Interior Storage owner preserves focused production consumption', () => {
  const tokens = readProductDimensionTokens();
  for (const policyName of [
    'INTERIOR_STORAGE_GRID_POLICY',
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
    'INTERIOR_STORAGE_CLAMP_POLICY',
    'INTERIOR_STORAGE_LAYOUT_POLICY',
    'INTERIOR_STORAGE_DEFAULTS_POLICY',
    'INTERIOR_STORAGE_POLICY',
  ]) {
    assert.match(tokens, new RegExp(`export const ${policyName} = Object\\.freeze\\(\\{`, 'u'));
  }

  const expectedConsumers = [
    ['esm/native/builder/render_interior_custom_ops_layout.ts', 'INTERIOR_STORAGE_BARRIER_POLICY'],
    ['esm/native/builder/render_interior_sketch_support_storage.ts', 'INTERIOR_STORAGE_BARRIER_POLICY'],
    ['esm/native/builder/render_interior_sketch_support_storage.ts', 'INTERIOR_STORAGE_CLAMP_POLICY'],
    ['esm/native/builder/render_interior_sketch_support_storage.ts', 'INTERIOR_STORAGE_LAYOUT_POLICY'],
    ['esm/native/builder/render_interior_sketch_support_storage.ts', 'INTERIOR_STORAGE_PREVIEW_POLICY'],
    [
      'esm/native/services/canvas_picking_manual_layout_free_box_commit.ts',
      'INTERIOR_STORAGE_BARRIER_POLICY',
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_stack_commit_drawers.ts',
      'INTERIOR_STORAGE_GRID_POLICY',
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_preview_storage.ts',
      'INTERIOR_STORAGE_BARRIER_POLICY',
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_preview_storage.ts',
      'INTERIOR_STORAGE_PREVIEW_POLICY',
    ],
  ];
  for (const [file, symbol] of expectedConsumers) assertUsesToken(file, symbol);

  for (const file of new Set(expectedConsumers.map(([file]) => file))) {
    assert.doesNotMatch(read(file), /\bINTERIOR_FITTINGS_DIMENSIONS\b/u);
  }
});

test('[dimension tokens] Remaining Interior Fittings owner preserves focused production consumption', () => {
  const tokens = readProductDimensionTokens();
  for (const policyName of [
    'INTERIOR_SHELF_GEOMETRY_POLICY',
    'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
    'INTERIOR_SHELF_ROUNDED_RENDER_POLICY',
    'INTERIOR_SHELF_POLICY',
    'INTERIOR_SHELF_PIN_RENDER_POLICY',
    'INTERIOR_ROD_RENDER_POLICY',
    'INTERIOR_ROD_PLACEMENT_POLICY',
    'INTERIOR_ROD_DEPTH_CLEARANCE_POLICY',
    'INTERIOR_ROD_CONTENT_CLEARANCE_POLICY',
    'INTERIOR_ROD_POLICY',
    'INTERIOR_PRESET_SHELF_ROWS_POLICY',
    'INTERIOR_PRESET_ROD_FACTORS_POLICY',
    'INTERIOR_PRESET_POLICY',
    'INTERIOR_FITTINGS_POLICY',
  ]) {
    assert.match(tokens, new RegExp(`export const ${policyName} = Object\\.freeze\\(\\{`, 'u'));
  }
  assertLinearDimensionsUseOwnersOrMeters('esm/shared/dimensions/interior_fittings_policy.ts');

  const expectedConsumers = [
    ['esm/native/builder/render_interior_preset_ops_shelves.ts', 'INTERIOR_SHELF_POLICY'],
    ['esm/native/builder/render_interior_preset_ops_shelves.ts', 'INTERIOR_SHELF_PIN_RENDER_POLICY'],
    ['esm/native/builder/render_interior_rod_ops.ts', 'INTERIOR_ROD_RENDER_POLICY'],
    ['esm/native/builder/render_interior_rod_ops.ts', 'INTERIOR_ROD_DEPTH_CLEARANCE_POLICY'],
    ['esm/native/builder/render_interior_rod_ops.ts', 'INTERIOR_ROD_CONTENT_CLEARANCE_POLICY'],
    ['esm/native/builder/render_interior_sketch_support_materials.ts', 'INTERIOR_SHELF_PIN_RENDER_POLICY'],
    ['esm/native/builder/render_interior_sketch_support_rods.ts', 'INTERIOR_ROD_RENDER_POLICY'],
    ['esm/native/builder/render_interior_sketch_support_rods.ts', 'INTERIOR_ROD_DEPTH_CLEARANCE_POLICY'],
    ['esm/native/builder/render_interior_sketch_support_rods.ts', 'INTERIOR_ROD_CONTENT_CLEARANCE_POLICY'],
    ['esm/native/builder/render_interior_sketch_support_shelf_pins.ts', 'INTERIOR_SHELF_PIN_RENDER_POLICY'],
  ];
  for (const [file, symbol] of expectedConsumers) assertUsesToken(file, symbol);
  for (const file of new Set(expectedConsumers.map(([file]) => file))) {
    assert.doesNotMatch(read(file), /\bINTERIOR_FITTINGS_DIMENSIONS\b/u);
  }
});

test('[dimension tokens] pure Material consumers use the canonical thickness owner', () => {
  const expectedConsumers = [
    'esm/native/builder/render_preview_sketch_pipeline_shared.ts',
    'esm/native/services/canvas_picking_hover_preview_modes_divider.ts',
    'esm/native/services/canvas_picking_sketch_free_box_content_preview_doors.ts',
    'esm/native/services/canvas_picking_sketch_free_box_content_preview_stack.ts',
    'esm/native/services/canvas_picking_sketch_free_box_content_preview_vertical.ts',
    'esm/native/services/canvas_picking_sketch_free_box_hover_finalize.ts',
    'esm/native/services/canvas_picking_sketch_free_box_hover_scan.ts',
    'esm/native/services/canvas_picking_sketch_free_surface_preview_divider.ts',
    'esm/native/services/canvas_picking_sketch_free_surface_preview_placement.ts',
    'esm/native/services/canvas_picking_sketch_free_surface_preview_placement_remove.ts',
    'esm/native/services/canvas_picking_sketch_free_surface_preview_target_candidate.ts',
    'esm/native/services/canvas_picking_sketch_module_box_blockers.ts',
  ];

  for (const file of expectedConsumers) {
    assertUsesToken(file, 'MATERIAL_THICKNESS_POLICY');
    assert.doesNotMatch(read(file), /\bMATERIAL_DIMENSIONS\b/u);
    assert.doesNotMatch(read(file), /\b0\.018\b/u);
  }
});

test('[dimension tokens] Drawer Sketch owner preserves focused production consumption', () => {
  const tokens = readProductDimensionTokens();
  for (const policyName of [
    'DRAWER_SKETCH_SIZING_POLICY',
    'DRAWER_SKETCH_PREVIEW_RENDER_POLICY',
    'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
    'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
    'DRAWER_SKETCH_DOOR_CUT_POLICY',
    'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
    'DRAWER_SKETCH_POLICY',
  ]) {
    assert.match(tokens, new RegExp(`export const ${policyName} = Object\\.freeze\\(\\{`, 'u'));
  }

  const expectedConsumers = [
    ['esm/native/builder/post_build_sketch_door_cuts_box.ts', 'DRAWER_SKETCH_DOOR_CUT_POLICY'],
    ['esm/native/builder/post_build_sketch_door_cuts_intervals.ts', 'DRAWER_SKETCH_DOOR_CUT_POLICY'],
    ['esm/native/builder/post_build_sketch_door_cuts_modules.ts', 'DRAWER_SKETCH_SIZING_POLICY'],
    ['esm/native/builder/post_build_sketch_door_cuts_rebuild_visual.ts', 'DRAWER_SKETCH_DOOR_CUT_POLICY'],
    [
      'esm/native/builder/render_interior_sketch_boxes_contents_drawers.ts',
      'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
    ],
    [
      'esm/native/builder/render_interior_sketch_drawers_internal.ts',
      'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
    ],
    [
      'esm/native/builder/render_interior_sketch_internal_drawer_cassette.ts',
      'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
    ],
    [
      'esm/native/builder/render_interior_sketch_shared_external_drawers.ts',
      'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
    ],
    [
      'esm/native/builder/render_interior_sketch_stack_collision.ts',
      'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
    ],
    ['esm/native/features/sketch_box_regular_external_drawers.ts', 'DRAWER_SKETCH_SIZING_POLICY'],
    [
      'esm/native/services/canvas_picking_drawer_cross_family_preview.ts',
      'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
    ],
    [
      'esm/native/services/canvas_picking_hover_preview_modes_ext_drawers.ts',
      'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_sketch_hover_standard_drawer.ts',
      'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_sketch_vertical_stack.ts',
      'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
    ],
  ];
  for (const [file, symbol] of expectedConsumers) assertUsesToken(file, symbol);

  for (const file of new Set(expectedConsumers.map(([file]) => file))) {
    assert.doesNotMatch(read(file), /\bDRAWER_DIMENSIONS\b/u);
  }
});

test('[dimension tokens] final preview/sketch/drawer/interior sweep reads canonical dimensions', () => {
  const tokens = readProductDimensionTokens();
  for (const tokenPattern of [
    /sketchBoxClassic: SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY/,
    /externalPreviewBoxMinDimensionM:/,
    /measurementLabelZOffsetM:/,
    /objectBoxPadXYWoodRatio:/,
    /barrierHeightMinM:/,
    /frontTrimZOffsetM:/,
    /opFrontZOffsetM:/,
    /renderMinSegmentHeightM:/,
    /placementClampPadMinM:/,
    /workspaceClampPadHeightRatio:/,
    /faceVerticalAlignmentEpsilonM:/,
    /panelMinLengthM:/,
    /shelfPlanMinDimensionM:/,
    /shelfCeilingClearanceM:/,
  ]) {
    assert.match(tokens, tokenPattern);
  }

  const expectedTokenUse = new Map([
    ['esm/native/builder/corner_wing_cell_layouts.ts', ['INTERIOR_FITTINGS_DIMENSIONS', 'presetDims']],
    ['esm/native/builder/render_door_ops_hinged.ts', ['HINGED_DOOR_RENDER_POLICY', 'hingedDims']],
    [
      'esm/native/builder/render_interior_preset_ops.ts',
      [
        'INTERIOR_SHELF_GEOMETRY_POLICY',
        'INTERIOR_STORAGE_BARRIER_POLICY',
        'INTERIOR_STORAGE_GRID_POLICY',
        'MATERIAL_THICKNESS_POLICY',
      ],
    ],
    [
      'esm/native/builder/render_interior_sketch_boxes_fronts_door_accents.ts',
      ['SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY'],
    ],
    ['esm/native/builder/render_interior_sketch_boxes_fronts_drawers_plan.ts', ['DRAWER_DIMENSIONS']],
    ['esm/native/builder/render_interior_sketch_drawers_external_plan.ts', ['DRAWER_DIMENSIONS']],
    ['esm/native/builder/render_interior_sketch_support_shelf_pins.ts', ['INTERIOR_SHELF_PIN_RENDER_POLICY']],
    [
      'esm/native/builder/render_interior_sketch_support_shelves.ts',
      [
        'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
        'INTERIOR_SHELF_GEOMETRY_POLICY',
        'MATERIAL_THICKNESS_POLICY',
      ],
    ],
    [
      'esm/native/builder/render_interior_sketch_boxes_shell_geometry.ts',
      ['SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/builder/render_interior_sketch_support_placement.ts',
      ['SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/builder/render_interior_sketch_shared_external_drawers.ts',
      ['DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY'],
    ],
    ['esm/native/builder/hinged_doors_module_ops_full.ts', ['HINGED_DOOR_SPLIT_GEOMETRY_POLICY']],
    ['esm/native/builder/hinged_doors_module_ops_segments.ts', ['HINGED_DOOR_SPLIT_GEOMETRY_POLICY']],
    ['esm/native/builder/hinged_doors_module_ops_split_routes.ts', ['HINGED_DOOR_SPLIT_GEOMETRY_POLICY']],
    ['esm/native/builder/corner_wing_cell_doors_context.ts', ['CORNER_CONNECTOR_DOOR_RENDER_POLICY']],
    [
      'esm/native/builder/corner_wing_cell_doors_split.ts',
      [
        'CORNER_CONNECTOR_LAYOUT_POLICY',
        'CORNER_CONNECTOR_DOOR_RENDER_POLICY',
        'CORNER_CONNECTOR_HANDLE_POLICY',
        'CORNER_WING_DRAWER_POLICY',
      ],
    ],
    [
      'esm/native/builder/corner_wing_cell_interiors_storage.ts',
      ['CORNER_WING_DRAWER_POLICY', 'INTERIOR_ROD_RENDER_POLICY'],
    ],
    [
      'esm/native/builder/corner_connector_interior_special_apply.ts',
      ['CORNER_CONNECTOR_SPECIAL_POST_POLICY'],
    ],
    [
      'esm/native/builder/render_preview_interior_hover_apply.ts',
      ['SKETCH_BOX_DIMENSIONS', 'INTERIOR_FITTINGS_DIMENSIONS'],
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_base.ts',
      [
        'cmToM',
        'INTERIOR_STORAGE_BARRIER_POLICY',
        'INTERIOR_STORAGE_CLAMP_POLICY',
        'SKETCH_BOX_SHELL_GEOMETRY_POLICY',
      ],
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_storage.ts',
      [
        'INTERIOR_STORAGE_BARRIER_POLICY',
        'INTERIOR_STORAGE_PREVIEW_POLICY',
        'SKETCH_BOX_PREVIEW_CORE_POLICY',
        'SKETCH_BOX_SHELF_PREVIEW_POLICY',
        'SKETCH_BOX_STORAGE_PREVIEW_POLICY',
      ],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_commit_shared.ts',
      ['cmToM', 'INTERIOR_STORAGE_BARRIER_POLICY', 'SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_preview_content.ts',
      ['SKETCH_BOX_DIMENSIONS', 'INTERIOR_FITTINGS_DIMENSIONS'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_preview_flow.ts',
      ['INTERIOR_SHELF_GEOMETRY_POLICY', 'SKETCH_BOX_PREVIEW_CORE_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_preview_rod.ts',
      ['SKETCH_BOX_DIMENSIONS', 'INTERIOR_FITTINGS_DIMENSIONS'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_preview_shelf.ts',
      ['SKETCH_BOX_DIMENSIONS', 'INTERIOR_FITTINGS_DIMENSIONS'],
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_sketch_tools.ts',
      ['MATERIAL_THICKNESS_POLICY', 'SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_selector_internal_metrics.ts',
      ['MATERIAL_THICKNESS_POLICY', 'SKETCH_BOX_SELECTOR_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_click_manual_sketch_free_box.ts',
      ['SKETCH_BOX_SHELL_GEOMETRY_POLICY', 'cmToM'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_content_commit_doors.ts',
      ['MATERIAL_THICKNESS_POLICY', 'SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts',
      ['SKETCH_BOX_SHELL_GEOMETRY_POLICY', 'mToCm'],
    ],
    [
      'esm/native/builder/render_interior_sketch_layout_geometry.ts',
      ['MATERIAL_THICKNESS_POLICY', 'SKETCH_BOX_FREE_VERTICAL_POLICY', 'SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_cell_dims_free_box_hover.ts',
      [
        'MATERIAL_THICKNESS_POLICY',
        'SKETCH_BOX_FREE_VERTICAL_POLICY',
        'SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY',
      ],
    ],
    [
      'esm/native/services/canvas_picking_sketch_free_box_hover_context.ts',
      ['MATERIAL_THICKNESS_POLICY', 'SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY'],
    ],
    ['esm/native/platform/render_loop_motion_doors.ts', ['DOOR_SYSTEM_DIMENSIONS', 'WARDROBE_DEFAULTS']],
  ]);

  for (const [rel, tokensToFind] of expectedTokenUse) {
    for (const tokenName of tokensToFind) assertUsesToken(rel, tokenName);
  }

  const previewHover = read('esm/native/builder/render_preview_interior_hover_apply.ts');
  assert.match(previewHover, /previewDims\.rodMinLengthM/);
  assert.match(previewHover, /storageDims\.barrierWidthClearanceM/);

  const measurements = read('esm/native/builder/render_preview_sketch_measurements_apply.ts');
  assert.match(measurements, /measurementLabelZOffsetM/);
  assert.match(measurements, /measurementScaleCellX/);

  const moduleRodPreview = read('esm/native/services/canvas_picking_sketch_module_surface_preview_rod.ts');
  assert.match(moduleRodPreview, /presetDims\.mixedRodYFactor/);
  assert.match(moduleRodPreview, /presetDims\.storageRodYFactor/);

  const commitShared = read('esm/native/services/canvas_picking_sketch_module_surface_commit_shared.ts');
  assert.match(commitShared, /cmToM\(n\)/);
  assert.match(commitShared, /INTERIOR_STORAGE_BARRIER_POLICY\.barrierHeightMaxM/);
  const hoverModuleContextBase = read(
    'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_base.ts'
  );
  for (const [rel, source, storageSymbols] of [
    [
      'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_base.ts',
      hoverModuleContextBase,
      ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_CLAMP_POLICY'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_commit_shared.ts',
      commitShared,
      ['INTERIOR_STORAGE_BARRIER_POLICY'],
    ],
  ]) {
    assert.match(source, /from '\.\.\/\.\.\/shared\/dimensions\/units\.js';/u, `${rel} Units owner`);
    assert.match(
      source,
      /from '\.\.\/\.\.\/shared\/dimensions\/sketch_box_geometry_policy\.js';/u,
      `${rel} Geometry owner`
    );
    assert.match(
      source,
      /from '\.\.\/\.\.\/shared\/dimensions\/interior_storage_policy\.js';/u,
      `${rel} Storage owner`
    );
    assert.equal((source.match(/from '\.\.\/\.\.\/shared\/dimensions\/units\.js'/gu) ?? []).length, 1);
    assert.equal(
      (source.match(/from '\.\.\/\.\.\/shared\/dimensions\/sketch_box_geometry_policy\.js'/gu) ?? []).length,
      1
    );
    assert.equal(
      (source.match(/from '\.\.\/\.\.\/shared\/dimensions\/interior_storage_policy\.js'/gu) ?? []).length,
      1
    );
    assert.match(source, /\bSKETCH_BOX_SHELL_GEOMETRY_POLICY\b/u);
    assert.match(source, /\bcmToM\b/u);
    for (const symbol of storageSymbols) assert.match(source, new RegExp(`\\b${symbol}\\b`, 'u'));
    assert.doesNotMatch(
      source,
      /wardrobe_dimension_tokens_shared|SKETCH_BOX_DIMENSIONS|SKETCH_BOX_GEOMETRY_POLICY|INTERIOR_FITTINGS_DIMENSIONS|INTERIOR_FITTINGS_POLICY|INTERIOR_STORAGE_POLICY/u
    );
    assert.doesNotMatch(source, /import\s+\*/u);
    assert.doesNotMatch(source, /export\s+(?:\*|\{[^}]*\})\s+from/u);
  }

  const shellGeometry = read('esm/native/builder/render_interior_sketch_boxes_shell_geometry.ts');
  assert.doesNotMatch(shellGeometry, /Math\.min\(0\.006, Math\.max\(0\.001, woodThick \* 0\.2\)\)/);

  const sketchShelves = read('esm/native/builder/render_interior_sketch_support_shelves.ts');
  assert.doesNotMatch(sketchShelves, /isBrace \? 0\.002 : 0\.014/);

  const hingedSegments = read('esm/native/builder/hinged_doors_module_ops_segments.ts');
  assert.doesNotMatch(hingedSegments, /segH > 0\.1/);
  assert.doesNotMatch(hingedSegments, /doorFrontZ \+ 0\.01/);

  const manualSketchTools = read('esm/native/services/canvas_picking_manual_layout_sketch_tools.ts');
  assert.doesNotMatch(manualSketchTools, /\?\? 0\.018/);
  assert.doesNotMatch(manualSketchTools, /woodThick \* 0\.2/);
  for (const rel of [
    'esm/native/services/canvas_picking_manual_layout_sketch_tools.ts',
    'esm/native/services/canvas_picking_selector_internal_metrics.ts',
    'esm/native/services/canvas_picking_sketch_box_content_commit_doors.ts',
  ]) {
    const source = read(rel);
    assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
    assert.doesNotMatch(
      source,
      /\b(?:MATERIAL_DIMENSIONS|SKETCH_BOX_DIMENSIONS|SKETCH_BOX_GEOMETRY_POLICY)\b/u
    );
    assert.doesNotMatch(source, /import\s+\*/u);
    assert.doesNotMatch(source, /export\s+(?:\*|\{[^}]*\})\s+from/u);
  }

  const frontOverlay = read('esm/native/services/canvas_picking_manual_layout_sketch_front_overlay.ts');
  assert.match(
    frontOverlay,
    /import \{ MATERIAL_THICKNESS_POLICY \} from '\.\.\/\.\.\/shared\/dimensions\/material_thickness_policy\.js';/u
  );
  assert.match(
    frontOverlay,
    /import \{ SKETCH_BOX_SHELL_GEOMETRY_POLICY \} from '\.\.\/\.\.\/shared\/dimensions\/sketch_box_geometry_policy\.js';/u
  );
  assert.match(
    frontOverlay,
    /import \{[\s\S]*SKETCH_BOX_DOOR_PREVIEW_POLICY,[\s\S]*SKETCH_BOX_DRAWER_PREVIEW_POLICY,[\s\S]*\} from '\.\.\/\.\.\/shared\/dimensions\/sketch_box_preview_policy\.js';/u
  );
  assert.doesNotMatch(
    frontOverlay,
    /wardrobe_dimension_tokens_shared|MATERIAL_DIMENSIONS|SKETCH_BOX_DIMENSIONS|SKETCH_BOX_GEOMETRY_POLICY|SKETCH_BOX_PREVIEW_POLICY/u
  );
  assert.equal(
    (frontOverlay.match(/from '\.\.\/\.\.\/shared\/dimensions\/material_thickness_policy\.js'/gu) ?? [])
      .length,
    1
  );
  assert.equal(
    (frontOverlay.match(/from '\.\.\/\.\.\/shared\/dimensions\/sketch_box_geometry_policy\.js'/gu) ?? [])
      .length,
    1
  );
  assert.equal(
    (frontOverlay.match(/from '\.\.\/\.\.\/shared\/dimensions\/sketch_box_preview_policy\.js'/gu) ?? [])
      .length,
    1
  );
  assert.doesNotMatch(frontOverlay, /import\s+\*/u);
  assert.doesNotMatch(frontOverlay, /export\s+(?:\*|\{[^}]*\})\s+from/u);

  for (const rel of [
    'esm/native/builder/post_build_sketch_door_cuts_rebuild.ts',
    'esm/native/services/canvas_picking_sketch_box_door_preview.ts',
  ]) {
    const source = read(rel);
    assert.match(
      source,
      /import \{ MATERIAL_THICKNESS_POLICY \} from '\.\.\/\.\.\/shared\/dimensions\/material_thickness_policy\.js';/u
    );
    assert.match(
      source,
      /import \{ SKETCH_BOX_DOOR_PREVIEW_POLICY \} from '\.\.\/\.\.\/shared\/dimensions\/sketch_box_preview_policy\.js';/u
    );
    assert.equal(
      (source.match(/from '\.\.\/\.\.\/shared\/dimensions\/material_thickness_policy\.js'/gu) ?? []).length,
      1
    );
    assert.equal(
      (source.match(/from '\.\.\/\.\.\/shared\/dimensions\/sketch_box_preview_policy\.js'/gu) ?? []).length,
      1
    );
    assert.doesNotMatch(
      source,
      /wardrobe_dimension_tokens_shared|MATERIAL_DIMENSIONS|SKETCH_BOX_DIMENSIONS|SKETCH_BOX_PREVIEW_POLICY/u
    );
    assert.doesNotMatch(source, /import\s+\*/u);
    assert.doesNotMatch(source, /export\s+(?:\*|\{[^}]*\})\s+from/u);
  }

  const adornmentPreview = read(
    'esm/native/services/canvas_picking_sketch_free_surface_preview_adornment_preview.ts'
  );
  assert.match(
    adornmentPreview,
    /import \{ MATERIAL_THICKNESS_POLICY \} from '\.\.\/\.\.\/shared\/dimensions\/material_thickness_policy\.js';/u
  );
  assert.match(
    adornmentPreview,
    /import \{[\s\S]*SKETCH_BOX_ADORNMENT_PREVIEW_POLICY,[\s\S]*SKETCH_BOX_DOOR_PREVIEW_POLICY,[\s\S]*\} from '\.\.\/\.\.\/shared\/dimensions\/sketch_box_preview_policy\.js';/u
  );
  assert.equal(
    (adornmentPreview.match(/from '\.\.\/\.\.\/shared\/dimensions\/material_thickness_policy\.js'/gu) ?? [])
      .length,
    1
  );
  assert.equal(
    (adornmentPreview.match(/from '\.\.\/\.\.\/shared\/dimensions\/sketch_box_preview_policy\.js'/gu) ?? [])
      .length,
    1
  );
  assert.doesNotMatch(
    adornmentPreview,
    /wardrobe_dimension_tokens_shared|MATERIAL_DIMENSIONS|SKETCH_BOX_DIMENSIONS|SKETCH_BOX_PREVIEW_POLICY/u
  );
  assert.doesNotMatch(adornmentPreview, /import\s+\*/u);
  assert.doesNotMatch(adornmentPreview, /export\s+(?:\*|\{[^}]*\})\s+from/u);

  const freeBoxHoverContext = read('esm/native/services/canvas_picking_sketch_free_box_hover_context.ts');
  assert.doesNotMatch(freeBoxHoverContext, /boxH \* 0\.02/);

  const clickFreeBox = read('esm/native/services/canvas_picking_click_manual_sketch_free_box.ts');
  assert.doesNotMatch(clickFreeBox, /Math\.max\(0\.05, \(heightCm \?\? 0\) \/ 100\)/);
  assert.match(
    clickFreeBox,
    /import \{ SKETCH_BOX_SHELL_GEOMETRY_POLICY \} from '\.\.\/\.\.\/shared\/dimensions\/sketch_box_geometry_policy\.js';/u
  );
  assert.match(clickFreeBox, /import \{ cmToM \} from '\.\.\/\.\.\/shared\/dimensions\/units\.js';/u);
  assert.doesNotMatch(
    clickFreeBox,
    /wardrobe_dimension_tokens_shared|SKETCH_BOX_DIMENSIONS|SKETCH_BOX_GEOMETRY_POLICY/u
  );
  assert.equal((clickFreeBox.match(/from '\.\.\/\.\.\/shared\/dimensions\/units\.js'/gu) ?? []).length, 1);
  assert.equal(
    (clickFreeBox.match(/from '\.\.\/\.\.\/shared\/dimensions\/sketch_box_geometry_policy\.js'/gu) ?? [])
      .length,
    1
  );

  const sketchToolHelpers = read('esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts');
  assert.match(
    sketchToolHelpers,
    /import \{ SKETCH_BOX_SHELL_GEOMETRY_POLICY \} from '\.\.\/\.\.\/\.\.\/\.\.\/shared\/dimensions\/sketch_box_geometry_policy\.js';/u
  );
  assert.match(
    sketchToolHelpers,
    /import \{ mToCm \} from '\.\.\/\.\.\/\.\.\/\.\.\/shared\/dimensions\/units\.js';/u
  );
  assert.doesNotMatch(
    sketchToolHelpers,
    /wardrobe_dimension_tokens_shared|SKETCH_BOX_DIMENSIONS|SKETCH_BOX_GEOMETRY_POLICY/u
  );
  assert.match(sketchToolHelpers, /export const DEFAULT_SKETCH_BOX_HEIGHT_CM: number = Math\.round/u);
  assert.match(sketchToolHelpers, /export const DEFAULT_SKETCH_BOX_WIDTH_CM: number = Math\.round/u);
  assert.match(sketchToolHelpers, /export const DEFAULT_SKETCH_BOX_DEPTH_CM: number = Math\.round/u);

  const cornerConnectorSpecial = read('esm/native/builder/corner_connector_interior_special_apply.ts');
  assert.doesNotMatch(cornerConnectorSpecial, /len <= 0\.01/);
  assert.doesNotMatch(cornerConnectorSpecial, /width <= 0\.05/);
  assert.doesNotMatch(cornerConnectorSpecial, /ceilBottomY - 0\.005/);

  const cornerWingSplit = read('esm/native/builder/corner_wing_cell_doors_split.ts');
  assert.doesNotMatch(cornerWingSplit, /0\.01 \+ state\.doorZShift/);

  const cornerWingStorage = read('esm/native/builder/corner_wing_cell_interiors_storage.ts');
  assert.doesNotMatch(cornerWingStorage, /cellRuntime\.__z\(0\.01\)/);

  const slidingMotion = read('esm/native/platform/render_loop_motion_doors.ts');
  assert.doesNotMatch(slidingMotion, /const overlap = 0\.03/);
  assert.doesNotMatch(slidingMotion, /d\.stackZStep, 0\.055/);
});

test('[dimension tokens] interior rod clearance uses seven focused owners without compatibility aggregates', () => {
  const file = 'esm/native/builder/render_interior_rod_clearance.ts';
  const source = read(file);
  const expectedImports = Object.freeze([
    Object.freeze({
      specifier: '../../shared/dimensions/carcass_interior_grid_policy.js',
      symbols: Object.freeze(['CARCASS_INTERIOR_GRID_POLICY']),
    }),
    Object.freeze({
      specifier: '../../shared/dimensions/content_visual_policy.js',
      symbols: Object.freeze(['FOLDED_CLOTHES_VISUAL_POLICY', 'HANGER_VISUAL_POLICY']),
    }),
    Object.freeze({
      specifier: '../../shared/dimensions/drawer_sketch_policy.js',
      symbols: Object.freeze(['DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY']),
    }),
    Object.freeze({
      specifier: '../../shared/dimensions/interior_fittings_policy.js',
      symbols: Object.freeze([
        'INTERIOR_PRESET_ROD_FACTORS_POLICY',
        'INTERIOR_PRESET_SHELF_ROWS_POLICY',
        'INTERIOR_ROD_PLACEMENT_POLICY',
        'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
      ]),
    }),
    Object.freeze({
      specifier: '../../shared/dimensions/interior_storage_policy.js',
      symbols: Object.freeze(['INTERIOR_STORAGE_BARRIER_POLICY']),
    }),
    Object.freeze({
      specifier: '../../shared/dimensions/material_thickness_policy.js',
      symbols: Object.freeze(['MATERIAL_THICKNESS_POLICY']),
    }),
    Object.freeze({
      specifier: '../../shared/dimensions/sketch_box_geometry_policy.js',
      symbols: Object.freeze(['SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY']),
    }),
  ]);

  assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
  assert.doesNotMatch(
    source,
    /\b(?:CARCASS_SHELL_DIMENSIONS|CONTENT_VISUAL_DIMENSIONS|DRAWER_DIMENSIONS|INTERIOR_FITTINGS_DIMENSIONS|MATERIAL_DIMENSIONS|SKETCH_BOX_DIMENSIONS|CONTENT_VISUAL_POLICY|DRAWER_SKETCH_POLICY|INTERIOR_FITTINGS_POLICY|INTERIOR_STORAGE_POLICY|SKETCH_BOX_GEOMETRY_POLICY)\b/u
  );
  assert.doesNotMatch(source, /import\s+\*/u);
  assert.doesNotMatch(source, /export\s+(?:\*|\{[^}]*\})\s+from/u);

  for (const expected of expectedImports) {
    const escapedSpecifier = expected.specifier.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const matches = Array.from(
      source.matchAll(new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${escapedSpecifier}['"];`, 'gu'))
    );
    assert.equal(matches.length, 1, `${file} must have one statement for ${expected.specifier}`);
    const symbols = matches[0][1]
      .split(',')
      .map(symbol => symbol.trim())
      .filter(Boolean)
      .sort();
    assert.deepEqual(symbols, [...expected.symbols].sort());
  }
});
