import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { normalizeWhitespace } from './_source_bundle.js';

const hoverFlow = readFileSync('esm/native/services/canvas_picking_hover_flow.ts', 'utf8');
const hoverFlowCore = readFileSync('esm/native/services/canvas_picking_hover_flow_core.ts', 'utf8');
const hoverFlowNonSplit = readFileSync('esm/native/services/canvas_picking_hover_flow_nonsplit.ts', 'utf8');
const hoverFlowNonSplitPreview = readFileSync(
  'esm/native/services/canvas_picking_hover_flow_nonsplit_preview.ts',
  'utf8'
);
const hoverFlowNonSplitPreviewDoor = readFileSync(
  'esm/native/services/canvas_picking_hover_flow_nonsplit_preview_door.ts',
  'utf8'
);
const hoverTargets = readFileSync('esm/native/services/canvas_picking_door_hover_targets.ts', 'utf8');
const hoverTargetsHit = readFileSync('esm/native/services/canvas_picking_door_hover_targets_hit.ts', 'utf8');
const hoverTargetsHitPaint = readFileSync(
  'esm/native/services/canvas_picking_door_hover_targets_hit_paint.ts',
  'utf8'
);
const hoverTargetsHitScan = readFileSync(
  'esm/native/services/canvas_picking_door_hover_targets_hit_scan.ts',
  'utf8'
);
const hoverModes = readFileSync('esm/native/services/canvas_picking_door_hover_modes.ts', 'utf8');
const genericPaintHover = readFileSync('esm/native/services/canvas_picking_generic_paint_hover.ts', 'utf8');
const genericPaintHoverFlow = readFileSync(
  'esm/native/services/canvas_picking_generic_paint_hover_flow.ts',
  'utf8'
);
const genericPaintHoverPreview = readFileSync(
  'esm/native/services/canvas_picking_generic_paint_hover_preview.ts',
  'utf8'
);
const genericPaintHoverPreviewObjects = readFileSync(
  'esm/native/services/canvas_picking_generic_paint_hover_preview_objects.ts',
  'utf8'
);
const genericPaintHoverPreviewCorner = readFileSync(
  'esm/native/services/canvas_picking_generic_paint_hover_preview_corner.ts',
  'utf8'
);
const genericPaintHoverPreviewBounds = readFileSync(
  'esm/native/services/canvas_picking_generic_paint_hover_preview_bounds.ts',
  'utf8'
);
const genericPaintHoverShared = readFileSync(
  'esm/native/services/canvas_picking_generic_paint_hover_shared.ts',
  'utf8'
);
const genericPaintHoverTarget = readFileSync(
  'esm/native/services/canvas_picking_generic_paint_hover_target.ts',
  'utf8'
);
const materialsApply = [
  readFileSync('esm/native/builder/materials_apply.ts', 'utf8'),
  readFileSync('esm/native/builder/materials_apply_color_policy.ts', 'utf8'),
  readFileSync('esm/native/builder/materials_apply_traversal.ts', 'utf8'),
].join('\n');
const renderPreviewSketchOps = [
  'esm/native/builder/render_preview_sketch_ops.ts',
  'esm/native/builder/render_preview_sketch_ops_factory.ts',
  'esm/native/builder/render_preview_sketch_ops_context.ts',
  'esm/native/builder/render_preview_sketch_ops_state.ts',
  'esm/native/builder/render_preview_sketch_ops_materials.ts',
  'esm/native/builder/render_preview_sketch_ops_meshes.ts',
  'esm/native/builder/render_preview_sketch_ops_apply.ts',
]
  .map(file => readFileSync(file, 'utf8'))
  .join('\n');
const renderPreviewSketchPipeline = readFileSync(
  'esm/native/builder/render_preview_sketch_pipeline.ts',
  'utf8'
);
const renderPreviewSketchPipelineShared = readFileSync(
  'esm/native/builder/render_preview_sketch_pipeline_shared.ts',
  'utf8'
);
const renderPreviewSketchPipelineObjectBoxes = readFileSync(
  'esm/native/builder/render_preview_sketch_pipeline_object_boxes.ts',
  'utf8'
);
const renderPreviewSketchPipelineBoxContent = readFileSync(
  'esm/native/builder/render_preview_sketch_pipeline_box_content.ts',
  'utf8'
);
const renderPreviewSketchPipelineBoxContentDrawers = readFileSync(
  'esm/native/builder/render_preview_sketch_pipeline_box_content_drawers.ts',
  'utf8'
);
const renderPreviewSketchPipelineBoxContentBox = readFileSync(
  'esm/native/builder/render_preview_sketch_pipeline_box_content_box.ts',
  'utf8'
);
const renderPreviewSketchPipelineLinear = readFileSync(
  'esm/native/builder/render_preview_sketch_pipeline_linear.ts',
  'utf8'
);
const renderPreviewSketchShared = readFileSync('esm/native/builder/render_preview_sketch_shared.ts', 'utf8');

const hoverBundle = `${hoverFlow}
${hoverFlowCore}
${hoverFlowNonSplit}
${hoverFlowNonSplitPreview}
${hoverFlowNonSplitPreviewDoor}`;
const hoverTargetsNorm = normalizeWhitespace(hoverTargetsHit);
const hoverModesNorm = normalizeWhitespace(hoverModes);
const genericPaintHoverNorm = normalizeWhitespace(genericPaintHover);
const genericPaintHoverFlowNorm = normalizeWhitespace(genericPaintHoverFlow);
const genericPaintHoverPreviewNorm = normalizeWhitespace(genericPaintHoverPreview);
const genericPaintHoverPreviewObjectsNorm = normalizeWhitespace(genericPaintHoverPreviewObjects);
const genericPaintHoverPreviewCornerNorm = normalizeWhitespace(genericPaintHoverPreviewCorner);
const genericPaintHoverPreviewBoundsNorm = normalizeWhitespace(genericPaintHoverPreviewBounds);
const genericPaintHoverSharedNorm = normalizeWhitespace(genericPaintHoverShared);
const materialsApplyNorm = normalizeWhitespace(materialsApply);
const renderPreviewSketchOpsNorm = normalizeWhitespace(`${renderPreviewSketchOps}
${renderPreviewSketchPipeline}
${renderPreviewSketchPipelineShared}
${renderPreviewSketchPipelineObjectBoxes}
${renderPreviewSketchPipelineBoxContent}
${renderPreviewSketchPipelineBoxContentDrawers}
${renderPreviewSketchPipelineBoxContentBox}
${renderPreviewSketchPipelineLinear}
${renderPreviewSketchShared}`);

test('paint hover uses full wardrobe raycast roots so drawer fronts are hoverable', () => {
  assert.match(
    hoverTargetsHit,
    /const raycastRoots = args\.paintUsesWardrobeGroup \? \[wardrobeGroup\] : getSplitHoverRaycastRoots\(App\);/
  );
  assert.match(hoverBundle, /paintUsesWardrobeGroup: !!paintSelection,/);
});

test('generic part paint hover resolves shared paint groups and previews grouped shell bounds', () => {
  assert.match(hoverFlowNonSplit, /canvas_picking_hover_flow_nonsplit_preview\.js/);
  assert.match(hoverFlowNonSplitPreview, /tryHandleCanvasNonSplitPaintPreviewRoute\(args\.hoverArgs\)/);
  assert.match(genericPaintHover, /canvas_picking_generic_paint_hover_flow/);
  assert.match(
    genericPaintHoverFlow,
    /resolvePaintTargetKeys\(resolvedTarget\.partId, resolvedTarget\.stackKey\)/
  );
  assert.match(
    genericPaintHoverFlowNorm,
    /__resolvePaintPreviewTargetKeys\(resolvedTarget\.partId, resolvedTarget\.stackKey, targetKeys\)/
  );
  assert.match(genericPaintHoverFlow, /partKeys: previewTargetKeys,/);
  assert.match(genericPaintHoverFlow, /const isCornicePreview = effectiveKeys\.some\(__isCornicePaintKey\);/);
  assert.match(
    genericPaintHoverFlow,
    /const isGroupedShellPreview = effectiveKeys\.length > 1 && !isCornicePreview;/
  );
  assert.match(genericPaintHoverFlow, /fillFront: !isGroupedShellPreview && !isCornicePreview,/);
  assert.match(genericPaintHoverFlow, /fillBack: !isGroupedShellPreview && !isCornicePreview,/);
  assert.match(genericPaintHoverShared, /export function __readPaintHoverOp\(/);
  assert.match(genericPaintHoverFlow, /const op = __readPaintHoverOp\(colors, effectiveKeys, selection\);/);
});

test('corner and pentagon cornice hover now follows the shared paint group by previewing every visible cornice segment as oriented object boxes instead of collapsing the group into one inflated world-axis square', () => {
  const wingCornice = [
    readFileSync('esm/native/builder/corner_wing_cornice_emit.ts', 'utf8'),
    readFileSync('esm/native/builder/corner_wing_cornice_wave.ts', 'utf8'),
    readFileSync('esm/native/builder/corner_wing_cornice_profile.ts', 'utf8'),
  ].join('\n');
  const connectorCornice = [
    readFileSync('esm/native/builder/corner_connector_cornice_emit.ts', 'utf8'),
    readFileSync('esm/native/builder/corner_connector_cornice_shared.ts', 'utf8'),
    readFileSync('esm/native/builder/corner_connector_cornice_wave.ts', 'utf8'),
    readFileSync('esm/native/builder/corner_connector_cornice_profile.ts', 'utf8'),
  ].join('\n');
  assert.match(
    genericPaintHoverShared,
    /export function __isScopedCornerCornicePreviewKeyList\(partKeys: string\[\]\): boolean \{/
  );
  assert.match(genericPaintHoverPreview, /collectPaintPreviewPartObjects\(/);
  assert.match(genericPaintHoverPreview, /resolveCornerCorniceGroupObjectPreview\(/);
  assert.match(genericPaintHoverPreview, /resolvePaintPreviewGroupBoxFromObjects\(/);
  assert.match(
    genericPaintHoverPreviewObjectsNorm,
    /export function appendUniquePartObjects\(out: UnknownRecord\[\], value: unknown\): void \{/
  );
  assert.match(
    genericPaintHoverPreviewObjectsNorm,
    /function appendScenePartObjectsByKeySet\(out: UnknownRecord\[\], node: unknown, partKeySet: Set<string>\): void \{/
  );
  assert.match(
    genericPaintHoverPreviewObjectsNorm,
    /export function appendFallbackPartObjectsFromScene\(out: UnknownRecord\[\], wardrobeGroup: UnknownRecord, partKeys: string\[\]\): void \{/
  );
  assert.match(
    genericPaintHoverPreviewObjects,
    /appendScenePartObjectsByKeySet\(out, wardrobeGroup, partKeySet\);/
  );
  assert.match(
    genericPaintHoverPreviewCorner,
    /export function resolveCornerCorniceGroupObjectPreview\(args: \{/
  );
  assert.match(genericPaintHoverPreviewCorner, /appendUniquePartObjects\(previewObjects, objects\);/);
  assert.match(genericPaintHoverPreviewCorner, /kind: 'object_boxes',/);
  assert.match(
    genericPaintHoverPreviewBounds,
    /export function resolvePaintPreviewGroupBoxFromObjects\(args: \{/
  );
  assert.match(genericPaintHoverFlow, /previewObjects: previewGroup\.previewObjects,/);
  assert.match(
    renderPreviewSketchOpsNorm,
    /const readPreviewObjectList = \(value: unknown\): PreviewMeshLike\[\] => \{/
  );
  assert.match(
    renderPreviewSketchOpsNorm,
    /const resetMeshOrientation = \(m: PreviewMeshLike \| null\) => \{/
  );
  assert.match(renderPreviewSketchPipelineObjectBoxes, /if \(ctx\.kind !== 'object_boxes'\) return false;/);
  assert.match(
    renderPreviewSketchOpsNorm,
    /const previewObjects = ctx\.readPreviewObjectList\(ctx\.input\.previewObjects\);/
  );
  assert.match(
    renderPreviewSketchPipelineObjectBoxes,
    /rel\.multiplyMatrices\(parentInv, obj\.matrixWorld\);/
  );
  assert.match(
    renderPreviewSketchPipelineObjectBoxes,
    /if \(typeof helperQuat\?\.copy === 'function'\) helperQuat\.copy\(quat\);/
  );
  assert.match(wingCornice, /partId: 'corner_cornice_front'/);
  assert.match(wingCornice, /partId: 'corner_cornice_side_left'/);
  assert.match(wingCornice, /partId: 'corner_cornice_side_right'/);
  assert.match(connectorCornice, /getCornerMat\('corner_cornice_front', baseCorniceMat\)/);
  assert.match(connectorCornice, /m\.userData = \{ partId: 'corner_cornice_front' \};/);
});

test('paint door hover is suppressed when a closer non-door part blocks the ray, so side-frame paint does not preview inner door faces', () => {
  assert.match(hoverTargetsHitPaint, /function __readPrimaryBlockingPaintPartId\(/);
  assert.match(
    normalizeWhitespace(hoverTargetsHitPaint),
    /const \{ nearestPartId, actionablePartId \} = __wp_resolveNearestActionablePartFromHit\(App, __asObject<HitObjectLike>\(obj\)\);/
  );
  assert.match(
    hoverTargetsHitPaint,
    /if \(actionablePartId && matchesPartId\(actionablePartId\)\) return null;/
  );
  assert.match(
    hoverTargetsHitPaint,
    /if \(nearestPartId && !matchesPartId\(nearestPartId\)\) return nearestPartId;/
  );
  assert.match(
    hoverTargetsHit,
    /if \(args\.paintUsesWardrobeGroup\) \{[\s\S]*const blockingPartId = __readPrimaryBlockingPaintPartId\(/
  );
});

test('paint door hover in paint mode resolves only the topmost eligible hit, so deep inner doors do not preview through the wardrobe', () => {
  assert.match(hoverTargetsHitPaint, /function __isEligiblePaintIntersect\(/);
  assert.match(hoverTargetsHitScan, /function __resolveHoverHitFromRaycastHit\(/);
  assert.match(
    hoverTargetsHit,
    /if \(args\.paintUsesWardrobeGroup\) \{[\s\S]*for \(let i = 0; i < intersects\.length; i \+= 1\) \{[\s\S]*if \(!__isEligiblePaintIntersect\(\{ App, hit, isViewportRoot, allowTransparentRestoreTargets \}\)\) continue;[\s\S]*return __resolveHoverHitFromRaycastHit\(\{/
  );
});

test('cornice paint groups classic and wave parts together so click, hover, render, and live material refresh operate on one cornice group', () => {
  const paintFlow = readFileSync('esm/native/services/canvas_picking_paint_targets.ts', 'utf8');
  const paintApply = readFileSync('esm/native/services/canvas_picking_paint_flow_apply.ts', 'utf8');
  const paintApplyTargets = readFileSync(
    'esm/native/services/canvas_picking_paint_flow_apply_targets.ts',
    'utf8'
  );
  const carcassFlow = [
    readFileSync('esm/native/builder/render_carcass_ops.ts', 'utf8'),
    readFileSync('esm/native/builder/render_carcass_ops_cornice.ts', 'utf8'),
    readFileSync('esm/native/builder/render_carcass_ops_cornice_apply.ts', 'utf8'),
  ].join('\n');
  assert.match(
    normalizeWhitespace(paintFlow),
    /const CORNICE_PARTS = \['cornice_color', 'cornice_wave_front', 'cornice_wave_side_left', 'cornice_wave_side_right',?\];/
  );
  assert.match(
    normalizeWhitespace(paintFlow),
    /const CORNER_CORNICE_PARTS = \['corner_cornice', 'corner_cornice_front', 'corner_cornice_side_left', 'corner_cornice_side_right',?\];/
  );
  assert.match(
    normalizeWhitespace(paintFlow),
    /if \(__isCornicePart\(partId\)\) return \[\.\.\.CORNICE_PARTS\];/
  );
  assert.match(
    normalizeWhitespace(paintFlow),
    /if \(__isCornerCornicePart\(partId\)\) return __wp_scopeCornerPartKeysForStack\(CORNER_CORNICE_PARTS, activeStack\);/
  );
  assert.match(
    normalizeWhitespace(readFileSync('esm/native/services/canvas_picking_paint_flow_shared.ts', 'utf8')),
    /export function toggleCorniceGroupPaint\(__colors: IndividualColorsMap, paint: string\): void/
  );
  assert.match(normalizeWhitespace(paintApplyTargets), /if \(__isCornicePart\(foundPartId\)\) \{/);
  assert.match(
    normalizeWhitespace(paintApplyTargets),
    /toggleCorniceGroupPaint\(state\.ensureColors\(\), paintSelection\);/
  );
  assert.match(carcassFlow, /const segMat = corniceMat \|\| ctx\.bodyMat;/);
  assert.match(materialsApplyNorm, /export function readPartColorEntry\(args: \{/);
  assert.match(materialsApplyNorm, /partId === 'cornice_wave_front'/);
  assert.match(materialsApplyNorm, /individualColors\.cornice_color/);
  assert.match(materialsApplyNorm, /partId === 'corner_cornice_front'/);
  assert.match(
    materialsApplyNorm,
    /const groupKey = partId\.startsWith\('lower_'\) \? 'lower_corner_cornice' : 'corner_cornice';/
  );
});

test('generic part paint hover resolves the same primary hit target as click flow before building grouped previews', () => {
  assert.match(genericPaintHoverFlow, /resolveCanvasPickingClickHitState\(\{/);
  assert.match(genericPaintHoverFlow, /const foundPartId = typeof hitState\?\.foundPartId === 'string'/);
  assert.match(
    genericPaintHoverFlow,
    /resolveNonDoorHoverTargetFromObject\(App, primaryHitObject, foundPartId\)/
  );
  assert.match(genericPaintHoverTarget, /export function resolveNonDoorHoverTargetFromObject\(/);
});
