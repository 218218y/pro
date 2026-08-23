import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const MODULE_CONTRACTS = [
  {
    file: 'esm/native/services/canvas_picking_core.ts',
    exports: ['handleCanvasClickNDC', 'handleCanvasHoverNDC'],
    imports: {
      './canvas_picking_click_flow.js': ['__coreHandleCanvasClickNDC'],
      './canvas_picking_hover_flow.js': ['__coreHandleCanvasHoverNDC'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_click_flow.ts',
    exports: ['__coreHandleCanvasClickNDC'],
    imports: {
      './canvas_picking_click_hit_flow.js': ['resolveCanvasPickingClickHitState'],
      './canvas_picking_click_mode_state.js': ['resolveCanvasPickingClickModeState'],
      './canvas_picking_click_module_refs.js': ['createCanvasPickingClickModuleRefs'],
      './canvas_picking_click_route.js': ['routeCanvasPickingClick'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_click_mode_state.ts',
    exports: ['resolveCanvasPickingClickModeState'],
    imports: {
      './canvas_picking_core_helpers.js': ['__wp_primaryMode'],
      '../runtime/api_browser_surface.js': ['getModeId'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_click_module_refs.ts',
    exports: ['createCanvasPickingClickModuleRefs'],
    imports: {
      './canvas_picking_structural_commit.js': [
        'commitCanvasModuleStructuralPatch',
        'readCanvasModuleConfigForStack',
      ],
    },
    forbiddenImports: ['../runtime/actions_access_domains.js'],
  },
  {
    file: 'esm/native/services/canvas_picking_click_route.ts',
    exports: ['routeCanvasPickingClick'],
    imports: {
      './canvas_picking_click_route_actions.js': ['tryHandleCanvasPickingActionRoute'],
      './canvas_picking_click_route_cell_dims.js': ['tryHandleCanvasPickingCellDimsRoute'],
      './canvas_picking_click_manual_sketch_free_reset.js': ['resetCanvasPickingEmptyClick'],
      './canvas_picking_interior_extension_registry.js': [
        'isCanvasPickingInteriorClickMode',
        'requireCanvasPickingInteriorExtension',
      ],
      './viewer_measurement_tool.js': ['tryHandleViewerMeasurementClick'],
    },
    forbiddenImports: [
      './canvas_picking_click_route_manual.js',
      './canvas_picking_click_route_layout.js',
      './canvas_picking_layout_edit_flow.js',
      './canvas_picking_drawer_mode_flow.js',
      './canvas_picking_door_edit_flow.js',
      './canvas_picking_paint_flow.js',
      './canvas_picking_handle_assign_flow.js',
      './canvas_picking_toggle_flow.js',
    ],
  },
  {
    file: 'esm/native/services/canvas_picking_click_route_cell_dims.ts',
    exports: ['tryHandleCanvasPickingCellDimsRoute'],
    imports: {
      './canvas_picking_cell_dims_flow.js': ['handleCanvasCellDimsClick'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_interior_extension_loader.ts',
    exports: ['loadCanvasPickingInteriorExtension'],
    imports: {
      './canvas_picking_interior_extension_registry.js': ['CanvasPickingInteriorExtension'],
    },
    forbiddenImports: [
      './canvas_picking_click_route_manual.js',
      './canvas_picking_click_route_layout.js',
      './canvas_picking_hover_flow_nonsplit_sketch.js',
      './canvas_picking_hover_flow_nonsplit_preview_interior.js',
    ],
  },
  {
    file: 'esm/native/services/canvas_picking_interior_extension.ts',
    exports: ['installCanvasPickingInteriorExtension'],
    imports: {
      './canvas_picking_click_route_manual.js': ['tryHandleCanvasPickingManualOrEmptyRoute'],
      './canvas_picking_click_route_layout.js': ['tryHandleCanvasPickingLayoutRoute'],
      './canvas_picking_hover_flow_nonsplit_sketch.js': ['tryHandleCanvasNonSplitSketchHover'],
      './canvas_picking_hover_flow_nonsplit_preview_interior.js': [
        'tryHandleCanvasNonSplitInteriorPreviewRoutes',
      ],
      './canvas_picking_interior_extension_registry.js': ['registerCanvasPickingInteriorExtension'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_click_route_manual.ts',
    exports: ['tryHandleCanvasPickingManualOrEmptyRoute'],
    imports: {
      './canvas_picking_click_manual_sketch_free_flow.js': [
        'resetCanvasPickingEmptyClick',
        'tryHandleCanvasManualSketchFreeClick',
      ],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_click_route_layout.ts',
    exports: ['tryHandleCanvasPickingLayoutRoute'],
    imports: {
      './canvas_picking_layout_edit_flow.js': ['tryHandleCanvasLayoutEditClick'],
      './canvas_picking_drawer_mode_flow.js': ['tryHandleCanvasDrawerModeClick'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_click_route_actions.ts',
    exports: ['tryHandleCanvasPickingActionRoute'],
    imports: {
      './canvas_picking_door_edit_flow.js': ['tryHandleCanvasDoorEditClick'],
      './canvas_picking_paint_flow.js': ['tryHandleCanvasPaintClick'],
      './canvas_picking_handle_assign_flow.js': ['tryHandleCanvasHandleAssignClick'],
      './canvas_picking_toggle_flow.js': ['handleCanvasDoorToggleClick'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_structural_commit.ts',
    exports: [
      'commitCanvasModuleStructuralPatch',
      'commitCanvasModuleStructuralReplacement',
      'readCanvasModuleConfigForStack',
    ],
    imports: {
      '../runtime/actions_access_domains.js': ['getModulesActionFn'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_cell_dims_flow.ts',
    exports: ['handleCanvasCellDimsClick'],
    imports: {
      './canvas_picking_cell_dims_corner.js': ['handleCanvasCornerCellDimsClick'],
      './canvas_picking_cell_dims_linear.js': ['handleCanvasLinearCellDimsClick'],
      './canvas_picking_cell_dims_free_box.js': ['tryHandleCanvasFreeBoxCellDimsClick'],
      './canvas_picking_cell_dims_post_click_hover.js': ['rememberCellDimsPostClickHoverTarget'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_cell_dims_corner.ts',
    exports: ['handleCanvasCornerCellDimsClick'],
    imports: {
      './canvas_picking_cell_dims_corner_cell.js': ['handleCornerPerCellDimsClick'],
      './canvas_picking_cell_dims_corner_global.js': ['handleCornerGlobalDimsClick'],
      './canvas_picking_cell_dims_corner_shared.js': ['buildCornerCellDimsContext', 'reportCornerDimsIssue'],
    },
    forbiddenImports: ['./canvas_picking_config_patch_meta.js', '../runtime/builder_service_access.js'],
  },
  {
    file: 'esm/native/services/canvas_picking_layout_edit_flow.ts',
    exports: ['tryHandleCanvasLayoutEditClick'],
    imports: {
      './canvas_picking_layout_edit_flow_manual.js': ['tryHandleCanvasManualLayoutClick'],
      './canvas_picking_layout_edit_flow_brace.js': ['tryHandleCanvasBraceShelvesClick'],
      './canvas_picking_config_patch_meta.js': ['createCanvasPickingConfigStructuralPatchMeta'],
      './canvas_picking_manual_layout_free_box_content.js': ['tryCommitPresetLayoutFreeBoxFromHover'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_drawer_mode_flow.ts',
    exports: ['tryHandleCanvasDrawerModeClick'],
    imports: {
      './canvas_picking_drawer_mode_flow_external.js': ['tryHandleExternalDrawerModeClick'],
      './canvas_picking_drawer_mode_flow_divider.js': ['tryHandleDrawerDividerModeClick'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_door_edit_flow.ts',
    exports: ['tryHandleCanvasDoorEditClick'],
    imports: {
      './canvas_picking_door_trim_click.js': ['handleCanvasDoorTrimClick'],
      './canvas_picking_door_split_click.js': ['handleCanvasDoorSplitClick'],
      './canvas_picking_door_remove_click.js': ['handleCanvasDoorRemoveClick'],
      './canvas_picking_removable_part_remove_click.js': ['handleCanvasRemovablePartRemoveClick'],
      './canvas_picking_door_hinge_groove_click.js': [
        'handleCanvasDoorHingeClick',
        'handleCanvasDoorGrooveClick',
      ],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_paint_flow.ts',
    exports: ['tryHandleCanvasPaintClick', 'resolvePaintTargetKeys', 'resolvePaintPreviewKeysForTarget'],
    imports: {
      './canvas_picking_paint_flow_apply.js': ['tryHandleCanvasPaintClick'],
      './canvas_picking_paint_targets.js': ['resolvePaintTargetKeys', 'resolvePaintPreviewKeysForTarget'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_toggle_flow.ts',
    exports: ['handleCanvasDoorToggleClick'],
    imports: {
      './canvas_picking_toggle_flow_shared.js': ['toggleDoorsState', 'tryHandleDirectDoorOrDrawerToggle'],
      './canvas_picking_toggle_flow_sketch_box.js': ['resolveSketchBoxToggleTarget', 'toggleSketchBoxDoor'],
      './canvas_picking_toggle_flow_sketch_free_box.js': [
        'resolveSketchFreeBoxToggleScope',
        'toggleSketchFreeBoxOpen',
      ],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_manual_layout_sketch_hover_intent_readers.ts',
    exports: [
      'readManualLayoutSketchBoxHoverIntent',
      'readManualLayoutSketchStackHoverIntent',
      'readManualLayoutSketchShelfHoverIntent',
      'readManualLayoutSketchStorageHoverIntent',
      'readManualLayoutSketchRodHoverIntent',
    ],
    imports: {
      './canvas_picking_manual_layout_command.js': ['decodeManualLayoutCommand'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_manual_layout_sketch_click_hover_apply.ts',
    exports: ['tryApplyManualLayoutSketchHoverClick'],
    imports: {
      './canvas_picking_manual_layout_command.js': ['decodeManualLayoutCommand'],
      './canvas_picking_manual_layout_sketch_hover_intent.js': [
        'readManualLayoutSketchRodHoverIntent',
        'readManualLayoutSketchShelfHoverIntent',
        'readManualLayoutSketchStackHoverIntent',
        'readManualLayoutSketchStorageHoverIntent',
      ],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_hover_flow.ts',
    exports: ['__coreHandleCanvasHoverNDC'],
    imports: {
      './canvas_picking_hover_flow_core.js': ['handleCanvasHoverNDCImpl'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_hover_flow_core.ts',
    exports: ['handleCanvasHoverNDCImpl'],
    imports: {
      './canvas_picking_hover_flow_shared.js': [
        'asHoverRenderOps',
        'asPreviewCallback',
        'createPreviewOpsArgs',
        'readSplitVariant',
      ],
      './canvas_picking_hover_flow_nonsplit.js': ['tryHandleCanvasNonSplitHover'],
      './canvas_picking_hover_flow_split.js': ['tryHandleCanvasSplitHover'],
      './canvas_picking_click_hit_flow.js': ['resolveCanvasPickingClickHitState'],
    },
    forbiddenImports: [
      './canvas_picking_generic_paint_hover.js',
      './canvas_picking_interior_hover_flow.js',
      './canvas_picking_door_action_hover_flow.js',
    ],
  },
  {
    file: 'esm/native/services/canvas_picking_hover_flow_nonsplit.ts',
    exports: ['tryHandleCanvasNonSplitHover'],
    imports: {
      './canvas_picking_hover_flow_nonsplit_face.js': ['resolveNonSplitPreferredFacePreviewState'],
      './canvas_picking_hover_flow_nonsplit_preview.js': ['tryHandleCanvasNonSplitPreviewRoutes'],
      './canvas_picking_interior_extension_registry.js': [
        'isCanvasPickingInteriorHoverMode',
        'requireCanvasPickingInteriorExtension',
      ],
    },
    forbiddenImports: ['./canvas_picking_hover_flow_nonsplit_sketch.js'],
  },
  {
    file: 'esm/native/services/canvas_picking_hover_flow_nonsplit_preview.ts',
    exports: ['tryHandleCanvasNonSplitPreviewRoutes'],
    imports: {
      './canvas_picking_hover_flow_nonsplit_preview_door.js': ['tryHandleCanvasNonSplitDoorPreviewRoute'],
      './canvas_picking_hover_flow_nonsplit_preview_cell_dims.js': ['tryHandleCanvasNonSplitCellDimsPreview'],
      './canvas_picking_interior_extension_registry.js': [
        'isCanvasPickingInteriorHoverMode',
        'requireCanvasPickingInteriorExtension',
      ],
      './canvas_picking_hover_flow_nonsplit_preview_paint.js': ['tryHandleCanvasNonSplitPaintPreviewRoute'],
    },
    forbiddenImports: ['./canvas_picking_hover_flow_nonsplit_preview_interior.js'],
  },
  {
    file: 'esm/native/services/canvas_picking_hover_preview_modes.ts',
    exports: [
      'tryHandleExtDrawersHoverPreview',
      'tryHandleDrawerDividerHoverPreview',
      'tryHandleCellDimsHoverPreview',
    ],
    imports: {
      './canvas_picking_hover_preview_modes_ext_drawers.js': ['tryHandleExtDrawersHoverPreview'],
      './canvas_picking_hover_preview_modes_divider.js': ['tryHandleDrawerDividerHoverPreview'],
      './canvas_picking_hover_preview_modes_cell_dims.js': ['tryHandleCellDimsHoverPreview'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_door_action_hover_flow.ts',
    exports: ['tryHandleDoorActionHover'],
    imports: {
      './canvas_picking_door_action_hover_state.js': [
        'resolveDoorActionHoverModeState',
        'resolveDoorActionHoverState',
      ],
      './canvas_picking_door_action_hover_marker.js': ['tryHandleDoorActionHoverMarkerRoute'],
      './canvas_picking_door_action_hover_remove.js': ['applyDoorActionHoverMarkerMaterial'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_door_hover_targets.ts',
    exports: ['__resolveHoverHit', '__resolvePreferredFacePreviewHit'],
    imports: {
      './canvas_picking_door_hover_targets_shared.js': ['__callMaybe', '__readHoverThree'],
      './canvas_picking_door_hover_targets_hit.js': ['__resolveHoverHit'],
      './canvas_picking_door_hover_targets_preferred_face.js': ['__resolvePreferredFacePreviewHit'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_interior_hover_flow.ts',
    exports: ['tryHandleCanvasLayoutFamilyHover'],
    imports: {
      './canvas_picking_interior_hover_layout_family.js': ['tryHandleCanvasLayoutFamilyHover'],
    },
    forbiddenImports: [
      '../runtime/api.js',
      './canvas_picking_interior_hover_layout_mode.js',
      './canvas_picking_interior_hover_manual_mode.js',
      './canvas_picking_interior_hover_brace_mode.js',
    ],
  },
  {
    file: 'esm/native/services/canvas_picking_interior_hover_layout_family.ts',
    exports: ['tryHandleCanvasLayoutFamilyHover'],
    imports: {
      './canvas_picking_interior_hover_layout_mode.js': ['tryHandleCanvasPresetLayoutHover'],
      './canvas_picking_interior_hover_manual_mode.js': ['tryHandleCanvasManualLayoutHover'],
      './canvas_picking_interior_hover_brace_mode.js': ['tryHandleCanvasBraceShelvesHover'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_hover_targets.ts',
    exports: [
      'estimateVisibleModuleFrontZ',
      'resolveInteriorHoverTarget',
      'resolveDrawerHoverPreviewTarget',
      'readInteriorModuleConfigRef',
    ],
    imports: {
      './canvas_picking_hover_targets_interior.js': [
        'estimateVisibleModuleFrontZ',
        'resolveInteriorHoverTarget',
      ],
      './canvas_picking_hover_targets_drawer.js': ['resolveDrawerHoverPreviewTarget'],
      './canvas_picking_hover_targets_config.js': ['readInteriorModuleConfigRef'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_hover_targets_interior.ts',
    exports: ['resolveInteriorHoverTarget', 'estimateVisibleModuleFrontZ'],
    imports: {
      './canvas_picking_hover_targets_interior_front.js': ['estimateVisibleModuleFrontZ'],
      './canvas_picking_hover_targets_interior_scan.js': ['scanInteriorHoverHit'],
      './canvas_picking_hover_targets_interior_target.js': ['buildInteriorHoverTarget'],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_manual_layout_sketch_hover_tools.ts',
    exports: ['tryHandleManualLayoutSketchHoverPreview'],
    imports: {
      './canvas_picking_manual_layout_sketch_hover_tools_router.js': [
        'tryHandleManualLayoutSketchHoverPreviewImpl',
      ],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_manual_layout_sketch_hover_tools_router.ts',
    exports: ['tryHandleManualLayoutSketchHoverPreviewImpl'],
    imports: {
      './canvas_picking_manual_layout_sketch_hover_free_flow.js': [
        'tryHandleManualLayoutSketchHoverFreeFlow',
      ],
      './canvas_picking_manual_layout_sketch_hover_module_flow.js': [
        'tryHandleManualLayoutSketchHoverModuleFlow',
      ],
      './canvas_picking_manual_layout_sketch_hover_tools_shared.js': ['readManualLayoutSketchHoverRuntime'],
      './canvas_picking_manual_layout_sketch_hover_tools_selector.js': [
        'resolvePreferredManualLayoutSketchSelectorHit',
      ],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_flow.ts',
    exports: [
      'resolveManualLayoutSketchHoverModuleContext',
      'tryHandleManualLayoutSketchHoverModuleDividerFlow',
      'tryHandleManualLayoutSketchHoverModulePreviewFlow',
      'tryHandleManualLayoutSketchHoverModuleFlow',
    ],
    imports: {
      './canvas_picking_manual_layout_sketch_hover_module_context.js': [
        'resolveManualLayoutSketchHoverModuleContext',
      ],
      './canvas_picking_manual_layout_sketch_hover_module_divider_flow.js': [
        'tryHandleManualLayoutSketchHoverModuleDividerFlow',
      ],
      './canvas_picking_manual_layout_sketch_hover_module_preview_flow.js': [
        'tryHandleManualLayoutSketchHoverModulePreviewFlow',
      ],
    },
  },
  {
    file: 'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_preview_flow.ts',
    exports: ['tryHandleManualLayoutSketchHoverModulePreviewFlow'],
    imports: {
      './canvas_picking_manual_layout_sketch_hover_module_preview_box.js': [
        'tryHandleManualLayoutSketchHoverModuleBoxPreview',
      ],
      './canvas_picking_manual_layout_sketch_hover_module_preview_stack.js': [
        'tryHandleManualLayoutSketchHoverModuleStackPreview',
      ],
      './canvas_picking_manual_layout_sketch_hover_module_preview_surface.js': [
        'handleManualLayoutSketchHoverModuleSurfacePreview',
      ],
    },
  },
];

const SOURCE_CACHE = new Map();

function readSource(file) {
  if (!SOURCE_CACHE.has(file)) SOURCE_CACHE.set(file, fs.readFileSync(file, 'utf8'));
  return SOURCE_CACHE.get(file);
}

function analyze(file) {
  const source = readSource(file);
  return {
    dependencies: analyzeModuleDependencies(file, source),
    exports: collectNamedModuleExports(file, source),
  };
}

function symbolsFor(dependencies, specifier) {
  const out = new Set();
  for (const dependency of dependencies.imports) {
    if (dependency.specifier !== specifier) continue;
    for (const symbol of dependency.importedSymbols) out.add(symbol);
  }
  return out;
}

function assertTopology(contract) {
  const analysis = analyze(contract.file);
  const exportedNames = new Set(analysis.exports.map(entry => entry.exportedName));

  for (const exportedName of contract.exports || []) {
    assert.equal(exportedNames.has(exportedName), true, `${contract.file} must export ${exportedName}`);
  }

  for (const [specifier, expectedSymbols] of Object.entries(contract.imports || {})) {
    const actualSymbols = symbolsFor(analysis.dependencies, specifier);
    assert.ok(actualSymbols.size > 0, `${contract.file} must depend on ${specifier}`);
    for (const symbol of expectedSymbols) {
      assert.equal(
        actualSymbols.has(symbol),
        true,
        `${contract.file} must depend on ${symbol} from ${specifier}`
      );
    }
  }

  for (const specifier of contract.forbiddenImports || []) {
    assert.equal(
      analysis.dependencies.imports.some(entry => entry.specifier === specifier),
      false,
      `${contract.file} must not bypass its canonical owner through ${specifier}`
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
    `${contract.file} has forbidden module syntax`
  );
}

function containsStringLiteral(file, value) {
  const source = readSource(file);
  const sourceFile = createSourceFile(file, source, { label: 'canvas_picking_topology' });
  let found = false;
  walkAst(sourceFile, node => {
    if (node?.type === 'Literal' && node.value === value) found = true;
  });
  return found;
}

test('canvas picking click and hover flows keep canonical owner topology without source-shape coupling', () => {
  for (const contract of MODULE_CONTRACTS) assertTopology(contract);
});

test('canvas structural module writes keep a single patchForStack owner', () => {
  const servicesDir = 'esm/native/services';
  const owners = fs
    .readdirSync(servicesDir)
    .filter(name => name.startsWith('canvas_picking') && name.endsWith('.ts'))
    .map(name => path.posix.join(servicesDir, name))
    .filter(file => containsStringLiteral(file, 'patchForStack'))
    .sort();

  assert.deepEqual(owners, ['esm/native/services/canvas_picking_structural_commit.ts']);
});
