import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, bundleSources, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const audit = readSource('../docs/layering_completion_audit.md', import.meta.url);

const coreOwner = readSource('../esm/native/services/canvas_picking_core_shared.ts', import.meta.url);
const coreBundle = bundleSources(
  [
    '../esm/native/services/canvas_picking_core_shared.ts',
    '../esm/native/services/canvas_picking_core_support.ts',
    '../esm/native/services/canvas_picking_core_support_errors.ts',
    '../esm/native/services/canvas_picking_core_support_meta.ts',
    '../esm/native/services/canvas_picking_core_support_numbers.ts',
    '../esm/native/services/canvas_picking_core_support_records.ts',
    '../esm/native/services/canvas_picking_core_runtime.ts',
    '../esm/native/services/canvas_picking_core_raycast.ts',
  ],
  import.meta.url
);
const interiorHoverOwner = readSource(
  '../esm/native/services/canvas_picking_interior_hover_flow.ts',
  import.meta.url
);
const interiorHoverShared = readSource(
  '../esm/native/services/canvas_picking_interior_hover_shared.ts',
  import.meta.url
);
const interiorHoverContracts = readSource(
  '../esm/native/services/canvas_picking_interior_hover_contracts.ts',
  import.meta.url
);
const interiorHoverPreview = readSource(
  '../esm/native/services/canvas_picking_interior_hover_preview.ts',
  import.meta.url
);
const interiorHoverState = readSource(
  '../esm/native/services/canvas_picking_interior_hover_state.ts',
  import.meta.url
);
const interiorHoverConfig = readSource(
  '../esm/native/services/canvas_picking_interior_hover_config.ts',
  import.meta.url
);
const interiorHoverIntDrawer = readSource(
  '../esm/native/services/canvas_picking_interior_hover_int_drawer.ts',
  import.meta.url
);
const interiorHoverLayoutFamily = readSource(
  '../esm/native/services/canvas_picking_interior_hover_layout_family.ts',
  import.meta.url
);
const interiorHoverLayoutMode = readSource(
  '../esm/native/services/canvas_picking_interior_hover_layout_mode.ts',
  import.meta.url
);
const interiorHoverManualMode = readSource(
  '../esm/native/services/canvas_picking_interior_hover_manual_mode.ts',
  import.meta.url
);
const interiorHoverBraceMode = readSource(
  '../esm/native/services/canvas_picking_interior_hover_brace_mode.ts',
  import.meta.url
);
const interiorHoverLayoutShared = readSource(
  '../esm/native/services/canvas_picking_interior_hover_layout_family_shared.ts',
  import.meta.url
);

const layoutEditOwner = readSource(
  '../esm/native/services/canvas_picking_layout_edit_flow.ts',
  import.meta.url
);
const layoutEditBundle = bundleSources(
  [
    '../esm/native/services/canvas_picking_layout_edit_flow.ts',
    '../esm/native/services/canvas_picking_layout_edit_flow_manual.ts',
    '../esm/native/services/canvas_picking_layout_edit_flow_brace.ts',
    '../esm/native/services/canvas_picking_layout_edit_flow_shared.ts',
  ],
  import.meta.url
);

const manualFreeHover = readSource(
  '../esm/native/services/canvas_picking_manual_layout_sketch_hover_free_flow.ts',
  import.meta.url
);
const manualFreeHoverContext = readSource(
  '../esm/native/services/canvas_picking_manual_layout_sketch_hover_free_context.ts',
  import.meta.url
);
const manualFreeHoverContent = readSource(
  '../esm/native/services/canvas_picking_manual_layout_sketch_hover_free_content.ts',
  import.meta.url
);
const manualFreeHoverBox = readSource(
  '../esm/native/services/canvas_picking_manual_layout_sketch_hover_free_box.ts',
  import.meta.url
);
const manualFreeClick = readSource(
  '../esm/native/services/canvas_picking_click_manual_sketch_free_flow.ts',
  import.meta.url
);
const manualFreeClickContent = readSource(
  '../esm/native/services/canvas_picking_click_manual_sketch_free_content.ts',
  import.meta.url
);
const manualFreeClickBox = readSource(
  '../esm/native/services/canvas_picking_click_manual_sketch_free_box.ts',
  import.meta.url
);
const manualFreeClickRecent = readSource(
  '../esm/native/services/canvas_picking_click_manual_sketch_free_recent.ts',
  import.meta.url
);
const manualFreeClickReset = readSource(
  '../esm/native/services/canvas_picking_click_manual_sketch_free_reset.ts',
  import.meta.url
);

const paintSeam = readSource('../esm/native/services/canvas_picking_paint_flow.ts', import.meta.url);
const paintTargets = readSource('../esm/native/services/canvas_picking_paint_targets.ts', import.meta.url);
const paintShared = readSource('../esm/native/services/canvas_picking_paint_flow_shared.ts', import.meta.url);
const paintMirror = readSource('../esm/native/services/canvas_picking_paint_flow_mirror.ts', import.meta.url);
const paintApply = readSource('../esm/native/services/canvas_picking_paint_flow_apply.ts', import.meta.url);
const paintApplyState = readSource(
  '../esm/native/services/canvas_picking_paint_flow_apply_state.ts',
  import.meta.url
);
const paintApplyTargets = readSource(
  '../esm/native/services/canvas_picking_paint_flow_apply_targets.ts',
  import.meta.url
);
const paintApplySpecial = readSource(
  '../esm/native/services/canvas_picking_paint_flow_apply_special.ts',
  import.meta.url
);
const paintApplyDoorStyle = readSource(
  '../esm/native/services/canvas_picking_paint_flow_apply_door_style.ts',
  import.meta.url
);
const paintApplyCommit = readSource(
  '../esm/native/services/canvas_picking_paint_flow_apply_commit.ts',
  import.meta.url
);

const overlapOwner = readSource(
  '../esm/native/services/canvas_picking_sketch_box_overlap.ts',
  import.meta.url
);
const overlapShared = readSource(
  '../esm/native/services/canvas_picking_sketch_box_overlap_shared.ts',
  import.meta.url
);
const overlapPlacement = readSource(
  '../esm/native/services/canvas_picking_sketch_box_overlap_placement.ts',
  import.meta.url
);
const overlapBundle = bundleSources(
  [
    '../esm/native/services/canvas_picking_sketch_box_overlap.ts',
    '../esm/native/services/canvas_picking_sketch_box_overlap_shared.ts',
    '../esm/native/services/canvas_picking_sketch_box_overlap_contracts.ts',
    '../esm/native/services/canvas_picking_sketch_box_overlap_records.ts',
    '../esm/native/services/canvas_picking_sketch_box_overlap_bounds.ts',
    '../esm/native/services/canvas_picking_sketch_box_overlap_resolved_boxes.ts',
    '../esm/native/services/canvas_picking_sketch_box_overlap_geometry.ts',
    '../esm/native/services/canvas_picking_sketch_box_overlap_hit.ts',
    '../esm/native/services/canvas_picking_sketch_box_overlap_placement.ts',
    '../esm/native/services/canvas_picking_sketch_box_overlap_placement_block.ts',
    '../esm/native/services/canvas_picking_sketch_box_overlap_placement_resolve.ts',
  ],
  import.meta.url
);

const splitHoverHelpers = readSource(
  '../esm/native/services/canvas_picking_split_hover_helpers.ts',
  import.meta.url
);
const splitHoverBounds = readSource(
  '../esm/native/services/canvas_picking_split_hover_bounds.ts',
  import.meta.url
);
const splitHoverPreviewLine = readSource(
  '../esm/native/services/canvas_picking_split_hover_preview_line.ts',
  import.meta.url
);
const splitHoverRoots = readSource(
  '../esm/native/services/canvas_picking_split_hover_roots.ts',
  import.meta.url
);

const toggleOwner = readSource('../esm/native/services/canvas_picking_toggle_flow.ts', import.meta.url);
const toggleBundle = bundleSources(
  [
    '../esm/native/services/canvas_picking_toggle_flow.ts',
    '../esm/native/services/canvas_picking_toggle_flow_shared.ts',
    '../esm/native/services/canvas_picking_toggle_flow_sketch_box.ts',
    '../esm/native/services/canvas_picking_toggle_flow_sketch_box_target.ts',
    '../esm/native/services/canvas_picking_toggle_flow_sketch_box_runtime.ts',
    '../esm/native/services/canvas_picking_toggle_flow_sketch_box_toggle.ts',
  ],
  import.meta.url
);

test('[canvas-family] core + interior-hover seams stay thin over focused owners', () => {
  assertMatchesAll(
    assert,
    coreOwner,
    [
      /canvas_picking_core_support\.js/,
      /canvas_picking_core_runtime\.js/,
      /canvas_picking_core_raycast\.js/,
      /__wp_reportPickingIssue/,
      /__wp_primaryMode/,
      /__wp_ensurePickingRefs/,
    ],
    'canvas core owner'
  );
  assertLacksAll(
    assert,
    coreOwner,
    [
      /function __wp_reportPickingIssue\(/,
      /function __wp_primaryMode\(/,
      /function __wp_ensurePickingRefs\(/,
      /const __wpPickingWarnThrottle = new Map/,
      /function __wp_raycastReuse\(/,
    ],
    'canvas core owner inline helpers'
  );
  assert.ok(coreOwner.split('\n').length < 60, 'canvas core owner should stay thin');

  assertMatchesAll(
    assert,
    coreBundle,
    [
      /function __wp_reportPickingIssue\(/,
      /function __wp_metaUiOnly\(App: AppContainer, source: string, meta\?: ActionMetaLike \| UnknownRecord\): ActionMetaLike/,
      /function __wp_primaryMode\(/,
      /function __wp_map\(App: AppContainer, mapName: string\): UnknownRecord/,
      /function __wp_ensurePickingRefs\(/,
      /function __wp_raycastReuse\(/,
    ],
    'canvas core bundle'
  );

  assertMatchesAll(
    assert,
    interiorHoverOwner,
    [
      /canvas_picking_interior_hover_int_drawer\.js/,
      /canvas_picking_interior_hover_layout_family\.js/,
      /canvas_picking_interior_hover_shared\.js/,
    ],
    'interior hover owner'
  );
  assertLacksAll(
    assert,
    interiorHoverOwner,
    [
      /const\s+__intDrawerMode\s*=\s*getModeId\(App, 'INT_DRAWER'/,
      /const\s+__layoutMode\s*=\s*getModeId\(App, 'LAYOUT'/,
    ],
    'interior hover owner inline mode reads'
  );

  assertMatchesAll(
    assert,
    interiorHoverShared,
    [
      /canvas_picking_interior_hover_contracts\.js/,
      /canvas_picking_interior_hover_preview\.js/,
      /canvas_picking_interior_hover_state\.js/,
      /canvas_picking_interior_hover_config\.js/,
    ],
    'interior hover shared seam'
  );
  assertLacksAll(
    assert,
    interiorHoverShared,
    [
      /export interface CanvasInteriorHoverFlowArgs/,
      /export function readHoverModuleConfig\(/,
      /export function getSketchPreviewFns\(/,
    ],
    'interior hover shared inline helpers'
  );

  assertMatchesAll(
    assert,
    interiorHoverContracts,
    [/export interface CanvasInteriorHoverFlowArgs/, /export type LayoutPreviewPayload =/],
    'interior hover contracts'
  );
  assertMatchesAll(
    assert,
    interiorHoverPreview,
    [/export function previewArgs\(/, /export function getSketchPreviewFns\(/],
    'interior hover preview'
  );
  assertMatchesAll(
    assert,
    interiorHoverState,
    [/export function readLayoutType\(/, /export function readManualTool\(/],
    'interior hover state'
  );
  assertMatchesAll(
    assert,
    interiorHoverConfig,
    [
      /export function readHoverModuleConfig\(/,
      /readModulesConfigurationListFromConfigSnapshot\(cfg, bucket\)/,
      /readCornerConfigurationCellForStack\(cfg, isBottom \? 'bottom' : 'top', idx\)/,
    ],
    'interior hover config'
  );
  assertMatchesAll(
    assert,
    interiorHoverIntDrawer,
    [
      /canvas_picking_interior_hover_shared\.js/,
      /readModuleSelectorHit\(intersects\[i\], __wp_toModuleKey\)/,
      /const selectorMetrics = resolveSelectorInternalMetrics\(\{/,
    ],
    'interior hover int-drawer mode'
  );

  assertMatchesAll(
    assert,
    interiorHoverLayoutFamily,
    [
      /canvas_picking_interior_hover_layout_mode\.js/,
      /canvas_picking_interior_hover_manual_mode\.js/,
      /canvas_picking_interior_hover_brace_mode\.js/,
    ],
    'interior hover layout family seam'
  );
  assertLacksAll(
    assert,
    interiorHoverLayoutFamily,
    [/computeInteriorPresetOps\(/, /readSavedGridDivisions\(/, /hasShelfAtIndex\(/],
    'interior hover layout family inline helpers'
  );
  assertMatchesAll(
    assert,
    interiorHoverLayoutMode,
    [/computeInteriorPresetOps\(/, /buildLayoutPreviewPayload\(/],
    'interior hover layout mode'
  );
  assertMatchesAll(
    assert,
    interiorHoverManualMode,
    [/readSavedGridDivisions\(/, /readExistingShelfVariant\(/],
    'interior hover manual mode'
  );
  assertMatchesAll(assert, interiorHoverBraceMode, [/hasShelfAtIndex\(/], 'interior hover brace mode');
  assertMatchesAll(
    assert,
    interiorHoverLayoutShared,
    [
      /export function buildLayoutPreviewPayload\(/,
      /export function readSavedGridDivisions\(/,
      /export function readExistingShelfVariant\(/,
      /export function hasShelfAtIndex\(/,
    ],
    'interior hover layout shared'
  );
  assert.ok(
    audit.includes(
      '`services/canvas_picking_interior_hover_layout_family.ts` is now a thin canonical seam over focused `canvas_picking_interior_hover_layout_mode.ts`, `canvas_picking_interior_hover_manual_mode.ts`, `canvas_picking_interior_hover_brace_mode.ts`, and `canvas_picking_interior_hover_layout_family_shared.ts` owners'
    )
  );
});

test('[canvas-family] layout-edit + manual/free sketch flows stay decomposed by concern', () => {
  assertMatchesAll(
    assert,
    layoutEditOwner,
    [
      /canvas_picking_layout_edit_flow_manual\.js/,
      /canvas_picking_layout_edit_flow_brace\.js/,
      /export function tryHandleCanvasLayoutEditClick\(/,
      /tryHandleCanvasLayoutPresetClick\(args\)/,
      /tryHandleCanvasManualLayoutClick\(args\)/,
      /tryHandleCanvasBraceShelvesClick\(args\)/,
    ],
    'layout-edit owner'
  );
  assertLacksAll(
    assert,
    layoutEditOwner,
    [
      /function ensureCustomData\(/,
      /function ensureBraceShelves\(/,
      /function readGridInfo\(/,
      /tryHandleManualLayoutSketchToolClick\(/,
      /source: 'braceShelves\.toggle'/,
      /source: 'manualLayout\.fillAllShelves'/,
    ],
    'layout-edit owner inline helpers'
  );
  assert.ok(layoutEditOwner.split('\n').length < 80, 'layout-edit owner should stay thin');
  assertMatchesAll(
    assert,
    layoutEditBundle,
    [
      /export function tryHandleCanvasManualLayoutClick\(/,
      /export function tryHandleCanvasBraceShelvesClick\(/,
      /export function ensureCustomData\(/,
      /export function ensureBraceShelves\(/,
      /export function readGridInfo\(/,
      /source: 'manualLayout\.fillAllShelves'/,
      /source: 'manualLayout\.toggleItem'/,
      /source: 'braceShelves\.toggle'/,
      /tryHandleManualLayoutSketchToolClick\(/,
    ],
    'layout-edit bundle'
  );

  assertMatchesAll(
    assert,
    manualFreeHover,
    [
      /from '\.\/canvas_picking_manual_layout_sketch_hover_free_context\.js';/,
      /from '\.\/canvas_picking_manual_layout_sketch_hover_free_content\.js';/,
      /from '\.\/canvas_picking_manual_layout_sketch_hover_free_box\.js';/,
    ],
    'manual/free hover seam'
  );
  assertLacksAll(
    assert,
    manualFreeHover,
    [
      /function readRecordArray\(/,
      /resolveSketchFreeBoxContentPreview\(/,
      /resolveSketchFreePlacementBoxPreview\(/,
    ],
    'manual/free hover inline helpers'
  );
  assertMatchesAll(
    assert,
    manualFreeHoverContext,
    [/export function resolveManualLayoutSketchHoverFreePlaneContext\(/],
    'manual/free hover context'
  );
  assertMatchesAll(
    assert,
    manualFreeHoverContent,
    [/export function tryHandleManualLayoutSketchHoverFreeContentPreview\(/],
    'manual/free hover content'
  );
  assertMatchesAll(
    assert,
    manualFreeHoverBox,
    [/export function tryHandleManualLayoutSketchHoverFreePlacementPreview\(/],
    'manual/free hover box'
  );

  assertMatchesAll(
    assert,
    manualFreeClick,
    [
      /from '\.\/canvas_picking_click_manual_sketch_free_content\.js';/,
      /from '\.\/canvas_picking_click_manual_sketch_free_box\.js';/,
      /from '\.\/canvas_picking_click_manual_sketch_free_recent\.js';/,
      /from '\.\/canvas_picking_click_manual_sketch_free_reset\.js';/,
    ],
    'manual/free click seam'
  );
  assertLacksAll(
    assert,
    manualFreeClick,
    [
      /function isRecentModuleScopedSketchHover\(/,
      /createSketchFreePlacementBoxHoverRecord\(/,
      /commitSketchFreePlacementHoverRecord\(/,
      /setModePrimary\(/,
    ],
    'manual/free click inline helpers'
  );
  assertMatchesAll(
    assert,
    manualFreeClickContent,
    [/export function tryHandleCanvasManualSketchFreeContentClick\(/],
    'manual/free click content'
  );
  assertMatchesAll(
    assert,
    manualFreeClickBox,
    [/export function tryHandleCanvasManualSketchFreeBoxClick\(/],
    'manual/free click box'
  );
  assertMatchesAll(
    assert,
    manualFreeClickRecent,
    [/export function isRecentModuleScopedSketchHover\(/],
    'manual/free click recent'
  );
  assertMatchesAll(
    assert,
    manualFreeClickReset,
    [/export function resetCanvasPickingEmptyClick\(/],
    'manual/free click reset'
  );
});

test('[canvas-family] paint + overlap + split-hover + toggle seams stay thin over dedicated owners', () => {
  assert.ok(paintSeam.trim().split(/\r?\n/).length <= 10, 'expected thin paint seam');
  assertMatchesAll(
    assert,
    paintSeam,
    [/canvas_picking_paint_flow_apply\.js/, /canvas_picking_paint_targets\.js/],
    'paint seam'
  );
  assertMatchesAll(
    assert,
    paintTargets,
    [
      /export const CORNICE_PARTS/,
      /export const CORNER_CORNICE_PARTS/,
      /export function resolvePaintTargetKeys\(/,
      /export function __isCornicePart\(/,
    ],
    'paint targets'
  );
  assertMatchesAll(
    assert,
    paintShared,
    [
      /export type PaintMetaLike = ActionMetaLike & \{ immediate\?: boolean \};/,
      /export function toggleCorniceGroupPaint/,
      /export function getPaintSourceTag/,
      /export function isSpecialPart/,
    ],
    'paint shared'
  );
  assertMatchesAll(
    assert,
    paintMirror,
    [
      /export function resolveMirrorLayoutForPaintClick\(/,
      /buildMirrorLayoutFromHit/,
      /findMirrorLayoutMatchInRect/,
    ],
    'paint mirror'
  );
  assertMatchesAll(
    assert,
    paintApply,
    [
      /export function tryHandleCanvasPaintClick\(args: CanvasPaintClickArgs\): boolean/,
      /createPaintFlowMutableState\(/,
      /applyGroupedOrCornerPaintTarget\(/,
      /applyPaintPartMutation\(/,
      /tryHandleDoorStyleOverridePaintClick\(/,
      /commitPaintFlowState\(/,
    ],
    'paint apply'
  );
  assertMatchesAll(
    assert,
    paintApplyState,
    [/export function createPaintFlowMutableState\(/, /export function summarizePaintFlowChanges\(/],
    'paint apply state'
  );
  assertMatchesAll(
    assert,
    paintApplyTargets,
    [/export function applyGroupedOrCornerPaintTarget\(/],
    'paint apply targets'
  );
  assertMatchesAll(
    assert,
    paintApplySpecial,
    [/export function applyPaintPartMutation\(/, /resolveMirrorLayoutForPaintClick/],
    'paint apply special'
  );
  assertMatchesAll(
    assert,
    paintApplyDoorStyle,
    [/export function tryHandleDoorStyleOverridePaintClick\(/],
    'paint apply door-style'
  );
  assertMatchesAll(
    assert,
    paintApplyCommit,
    [/export function commitPaintFlowState\(/, /applyPaintConfigSnapshot\(/],
    'paint apply commit'
  );
  assert.ok(
    audit.includes(
      '`canvas_picking_paint_flow.ts` is now a thin canonical seam over focused paint-target, paint-shared, paint-mirror, and paint-apply owners'
    )
  );

  assertMatchesAll(
    assert,
    overlapOwner,
    [
      /canvas_picking_sketch_box_overlap_shared\.js/,
      /canvas_picking_sketch_box_overlap_hit\.js/,
      /canvas_picking_sketch_box_overlap_placement\.js/,
      /doSketchBoxesOverlap/,
      /findSketchModuleBoxHit/,
      /resolveSketchModuleBoxPlacement/,
    ],
    'overlap owner'
  );
  assertLacksAll(
    assert,
    overlapOwner,
    [
      /function resolveModuleBoxes\(/,
      /function findSketchModuleBoxHit\(/,
      /function isSketchModuleBoxPlacementBlocked\(/,
      /function resolveSketchModuleBoxPlacement\(/,
      /function doSketchBoxesOverlap\(/,
    ],
    'overlap owner inline helpers'
  );
  assert.ok(overlapOwner.split('\n').length < 12, 'overlap owner should stay thin');
  assertMatchesAll(
    assert,
    overlapShared,
    [
      /canvas_picking_sketch_box_overlap_contracts\.js/,
      /canvas_picking_sketch_box_overlap_records\.js/,
      /canvas_picking_sketch_box_overlap_bounds\.js/,
      /canvas_picking_sketch_box_overlap_resolved_boxes\.js/,
      /canvas_picking_sketch_box_overlap_geometry\.js/,
    ],
    'overlap shared seam'
  );
  assertLacksAll(
    assert,
    overlapShared,
    [
      /function resolveModuleBoxes\(/,
      /function doSketchBoxesOverlap\(/,
      /function collectOverlaps\(/,
      /function clampSketchModuleBoxCenterY\(/,
    ],
    'overlap shared seam inline helpers'
  );
  assert.ok(overlapShared.split('\n').length <= 25, 'overlap shared seam should stay thin');
  assertMatchesAll(
    assert,
    overlapPlacement,
    [
      /canvas_picking_sketch_box_overlap_placement_block\.js/,
      /canvas_picking_sketch_box_overlap_placement_resolve\.js/,
      /isSketchModuleBoxPlacementBlocked/,
      /resolveSketchModuleBoxPlacement/,
    ],
    'overlap placement seam'
  );
  assertLacksAll(
    assert,
    overlapPlacement,
    [
      /function isSketchModuleBoxPlacementBlocked\(/,
      /function resolveSketchModuleBoxPlacement\(/,
      /function pickNextAnchor\(/,
    ],
    'overlap placement seam inline helpers'
  );
  assert.ok(overlapPlacement.split('\n').length < 10, 'overlap placement seam should stay thin');
  assertMatchesAll(
    assert,
    overlapBundle,
    [
      /export type ResolveSketchBoxGeometryFn =/,
      /export function asRecord\(/,
      /export function clampSketchModuleBoxCenterY\(/,
      /export function resolveModuleBoxes\(/,
      /export function doSketchBoxesOverlap\(/,
      /export function findSketchModuleBoxHit\(/,
      /export function isSketchModuleBoxPlacementBlocked\(/,
      /export function resolveSketchModuleBoxPlacement\(/,
      /function pickNextAnchor\(/,
      /function resolvePlacementCandidateY\(/,
    ],
    'overlap bundle'
  );

  assert.ok(splitHoverHelpers.trim().split(/\r?\n/).length <= 20, 'expected thin split-hover seam');
  assertMatchesAll(
    assert,
    splitHoverHelpers,
    [
      /canvas_picking_split_hover_bounds\.js/,
      /canvas_picking_split_hover_preview_line\.js/,
      /canvas_picking_split_hover_roots\.js/,
    ],
    'split-hover seam'
  );
  assertMatchesAll(
    assert,
    splitHoverBounds,
    [
      /export type SplitHoverDoorBounds = \{ minY: number; maxY: number \};/,
      /export function __wp_getSplitHoverDoorBaseKey\(/,
      /export function __wp_readSplitHoverDoorBounds\(/,
    ],
    'split-hover bounds'
  );
  assertMatchesAll(
    assert,
    splitHoverPreviewLine,
    [
      /export function __wp_getRegularSplitPreviewLineY\(/,
      /function readSplitHoverPreviewMetrics\(/,
      /function readSplitHoverPreviewModuleConfig\(/,
    ],
    'split-hover preview line'
  );
  assertLacksAll(
    assert,
    splitHoverPreviewLine,
    [/function __wp_getSplitHoverRaycastRoots\(/],
    'split-hover preview-line cross leak'
  );
  assertMatchesAll(
    assert,
    splitHoverRoots,
    [
      /export function __wp_getSplitHoverRaycastRoots\(/,
      /const addDoorRoot = \(node: UnknownRecord \| null\) => \{/,
      /setRenderSlot\(App, '__splitHoverPickablesDirty', false\);/,
    ],
    'split-hover roots'
  );
  assertLacksAll(
    assert,
    splitHoverRoots,
    [/function __wp_getRegularSplitPreviewLineY\(/],
    'split-hover roots cross leak'
  );
  assert.ok(
    audit.includes(
      '`services/canvas_picking_split_hover_helpers.ts` is now a thin canonical seam over focused split-hover bounds/base-key, preview-line policy, and raycast-root owners'
    )
  );

  assertMatchesAll(
    assert,
    toggleOwner,
    [
      /canvas_picking_toggle_flow_shared\.js/,
      /canvas_picking_toggle_flow_sketch_box\.js/,
      /export function handleCanvasDoorToggleClick\(/,
      /toggleDoorsState\(App\);/,
    ],
    'toggle owner'
  );
  assertLacksAll(
    assert,
    toggleOwner,
    [
      /function markLocalDoorMotion\(/,
      /function parseSketchBoxPartId\(/,
      /function resolveSketchBoxPatchTargets\(/,
      /function tryHandleDirectDoorOrDrawerToggle\(/,
      /function tryHandleGlobalCornerPentToggle\(/,
    ],
    'toggle owner inline helpers'
  );
  assert.ok(toggleOwner.split('\n').length < 80, 'toggle owner should stay thin');
  assertMatchesAll(
    assert,
    toggleBundle,
    [
      /export function markLocalDoorMotion\(/,
      /export function tryHandleDirectDoorOrDrawerToggle\(/,
      /export function tryHandleGlobalCornerPentToggle\(/,
      /export function parseSketchBoxPartId\(/,
      /export function resolveSketchBoxPatchTargets\(/,
      /export function resolveSketchBoxToggleTarget\(/,
      /export function toggleSketchBoxDoor\(/,
      /const __SKETCH_BOX_DOOR_MOTION_SEED_KEY = '__wpSketchBoxDoorMotionSeed';/,
    ],
    'toggle bundle'
  );
});
