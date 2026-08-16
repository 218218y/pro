import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';

const MODULE_CONTRACTS = [
  {
    file: 'esm/native/services/canvas_picking_hover_flow_nonsplit.ts',
    exports: ['tryHandleCanvasNonSplitHover'],
    imports: {
      './canvas_picking_hover_flow_nonsplit_preview.js': ['tryHandleCanvasNonSplitPreviewRoutes'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_hover_flow_nonsplit_preview.ts',
    exports: ['tryHandleCanvasNonSplitPreviewRoutes'],
    imports: {
      './canvas_picking_hover_flow_nonsplit_preview_paint.js': ['tryHandleCanvasNonSplitPaintPreviewRoute'],
      './canvas_picking_hover_flow_nonsplit_preview_door.js': ['tryHandleCanvasNonSplitDoorPreviewRoute'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_hover_flow_nonsplit_preview_paint.ts',
    exports: ['tryHandleCanvasNonSplitPaintPreviewRoute'],
    imports: {
      './canvas_picking_generic_paint_hover.js': ['tryHandleGenericPartPaintHover'],
    },
    forbiddenImports: ['./canvas_picking_generic_paint_hover_flow.js'],
  },
  {
    file: 'esm/native/services/canvas_picking_generic_paint_hover.ts',
    exports: ['tryHandleGenericPartPaintHover'],
    imports: {
      './canvas_picking_generic_paint_hover_flow.js': ['tryHandleGenericPartPaintHover'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_generic_paint_hover_flow.ts',
    exports: ['tryHandleGenericPartPaintHover'],
    imports: {
      './canvas_picking_click_hit_flow.js': ['resolveCanvasPickingClickHitState'],
      './canvas_picking_paint_flow.js': ['resolvePaintPreviewKeysForTarget', 'resolvePaintTargetKeys'],
      './canvas_picking_generic_paint_target_resolution.js': ['resolveGenericPartPaintTarget'],
      './canvas_picking_generic_paint_hover_preview.js': ['resolvePaintPreviewGroupBox'],
      './canvas_picking_part_hover_preview_runtime.js': ['createPartHoverPreviewRuntime'],
    },
    forbiddenImports: ['../builder/render_preview_sketch_pipeline.js'],
  },
  {
    file: 'esm/native/services/canvas_picking_generic_paint_hover_preview.ts',
    exports: ['resolvePaintPreviewGroupBox'],
    imports: {
      './canvas_picking_generic_paint_hover_preview_objects.js': ['collectPaintPreviewPartObjects'],
      './canvas_picking_generic_paint_hover_preview_corner.js': [
        'resolveCornerCorniceFrontObjectLocalPreview',
        'resolveCornerCorniceGroupObjectPreview',
      ],
      './canvas_picking_generic_paint_hover_preview_bounds.js': [
        'resolvePaintPreviewGroupBoxFromAnchor',
        'resolvePaintPreviewGroupBoxFromObjects',
        'resolvePaintPreviewObjectBoxesFromAnchor',
      ],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_door_hover_targets_hit.ts',
    exports: ['__resolveHoverHit'],
    imports: {
      './canvas_picking_door_hover_targets_hit_paint.js': [
        '__isEligiblePaintIntersect',
        '__readPrimaryBlockingPaintPartId',
      ],
      './canvas_picking_door_hover_targets_hit_scan.js': ['__resolveHoverHitFromRaycastHit'],
    },
  },
  {
    file: 'esm/native/builder/render_preview_sketch_pipeline.ts',
    exports: ['applySketchPlacementPreview'],
    imports: {
      './render_preview_sketch_pipeline_object_boxes.js': ['applyObjectBoxesSketchPlacementPreview'],
    },
  },
];

function readAnalysis(file) {
  const source = fs.readFileSync(file, 'utf8');
  return {
    dependencies: analyzeModuleDependencies(file, source),
    exports: collectNamedModuleExports(file, source),
  };
}

function importSymbols(dependencies, specifier) {
  const dependency = dependencies.imports.find(entry => entry.specifier === specifier);
  return dependency ? new Set(dependency.importedSymbols) : null;
}

test('paint-hover architecture keeps the canonical routing and preview owners', () => {
  for (const contract of MODULE_CONTRACTS) {
    const analysis = readAnalysis(contract.file);
    const exportedNames = new Set(analysis.exports.map(entry => entry.exportedName));

    for (const exportedName of contract.exports) {
      assert.equal(exportedNames.has(exportedName), true, `${contract.file} must export ${exportedName}`);
    }

    for (const [specifier, symbols] of Object.entries(contract.imports)) {
      const actualSymbols = importSymbols(analysis.dependencies, specifier);
      assert.ok(actualSymbols, `${contract.file} must import ${specifier}`);
      for (const symbol of symbols) {
        assert.equal(
          actualSymbols.has(symbol),
          true,
          `${contract.file} must import ${symbol} from ${specifier}`
        );
      }
    }

    for (const specifier of contract.forbiddenImports || []) {
      assert.equal(
        analysis.dependencies.imports.some(entry => entry.specifier === specifier),
        false,
        `${contract.file} must not bypass the canonical owner through ${specifier}`
      );
    }

    assert.deepEqual(
      analysis.dependencies.unresolvedDynamicImports,
      [],
      `${contract.file} has dynamic import drift`
    );
    assert.deepEqual(
      analysis.dependencies.forbiddenModuleSyntax,
      [],
      `${contract.file} has module syntax drift`
    );
  }
});
