const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

function bundle(...rels) {
  return rels.map(read).join('\n');
}

function sketchBoxFrontsBundle() {
  return bundle(
    'esm/native/builder/render_interior_sketch_boxes_fronts.ts',
    'esm/native/builder/render_interior_sketch_boxes_fronts_support.ts',
    'esm/native/builder/render_interior_sketch_boxes_fronts_door_contracts.ts',
    'esm/native/builder/render_interior_sketch_boxes_fronts_door_layout.ts',
    'esm/native/builder/render_interior_sketch_boxes_fronts_door_accents.ts',
    'esm/native/builder/render_interior_sketch_boxes_fronts_door_visuals.ts',
    'esm/native/builder/render_interior_sketch_boxes_fronts_doors.ts',
    'esm/native/builder/render_interior_sketch_boxes_fronts_drawers.ts'
  );
}

test('manual sketch box UI exposes 40cm default and box-door controls', () => {
  const view = bundle(
    'esm/native/ui/react/tabs/InteriorTab.view.tsx',
    'esm/native/ui/react/tabs/use_interior_tab_view_state.ts',
    'esm/native/ui/react/tabs/interior_tab_local_state_runtime.ts',
    'esm/native/ui/react/tabs/interior_tab_local_state_shared.ts'
  );
  const sections = bundle(
    'esm/native/ui/react/tabs/interior_tab_sections.tsx',
    'esm/native/ui/react/tabs/interior_layout_sketch_controls.tsx',
    'esm/native/ui/react/tabs/interior_layout_sketch_sections.tsx',
    'esm/native/ui/react/tabs/interior_layout_door_trim_section.tsx',
    'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_section.tsx',
    'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime.ts',
    'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_components.tsx',
    'esm/native/ui/react/tabs/interior_layout_sketch_drawers_section.tsx',
    'esm/native/ui/react/tabs/interior_layout_sketch_shelves_section.tsx',
    'esm/native/ui/react/tabs/interior_layout_sketch_section_types.ts'
  );
  const helpers = bundle(
    'esm/native/ui/react/tabs/interior_tab_helpers.tsx',
    'esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts'
  );

  assert.match(view, /sketchBoxHeightCm: 40,/);
  assert.match(view, /sketchBoxHeightDraft: '40',/);
  assert.match(helpers, /SKETCH_TOOL_BOX_DOOR = 'sketch_box_door'/);
  assert.match(helpers, /SKETCH_TOOL_BOX_DOOR_HINGE = 'sketch_box_door_hinge'/);
  assert.match(sections, /דלת לקופסא/);
  assert.match(sections, /כיוון פתיחת דלת לקופסא/);
  assert.match(sections, /מחיצה לקופסא/);
});

test('sketch box renderer keeps the flat-slab path but upgrades free-box profile/tom doors through the canonical door visual factory', () => {
  const render = [
    read('esm/native/builder/render_interior_sketch_ops.ts'),
    read('esm/native/builder/render_interior_sketch_boxes.ts'),
    sketchBoxFrontsBundle(),
  ].join('\n');
  const renderSharedBundle = [
    read('esm/native/builder/render_interior_sketch_shared.ts'),
    read('esm/native/builder/render_interior_sketch_shared_types.ts'),
    read('esm/native/builder/render_interior_sketch_shared_records.ts'),
    read('esm/native/builder/render_interior_sketch_shared_numbers.ts'),
    read('esm/native/builder/render_interior_sketch_shared_external_drawers.ts'),
    read('esm/native/builder/render_interior_sketch_shared_box_doors.ts'),
    read('esm/native/builder/render_interior_sketch_layout.ts'),
    read('esm/native/builder/render_interior_sketch_layout_dividers.ts'),
    sketchBoxFrontsBundle(),
  ].join('\n');
  assert.match(render, /const boxDoors = readSketchBoxDoors\(box\);/);
  assert.match(renderSharedBundle, /xNorm\?: unknown;/);
  assert.match(render, /const doorPid = `\$\{boxPid\}_door_\$\{doorId\}`/);
  assert.match(render, /const doorGroup = new THREE\.Group\(\)/);
  assert.match(render, /segment: resolveSketchBoxSegmentForContent\(/);
  assert.match(render, /const doorStyle = resolveSketchDoorStyle\(App, input\);/);
  assert.match(
    render,
    /const canUseStyledDoorVisual = !!\([\s\S]*isFreePlacement === true[\s\S]*effectiveDoorStyle === 'profile' \|\| effectiveDoorStyle === 'tom'/
  );
  assert.match(
    render,
    /const styledVisual = createDoorVisual\([\s\S]*effectiveDoorStyle,[\s\S]*boxDoor\.groove === true,[\s\S]*doorPid/
  );
  assert.match(
    render,
    /const doorSlab = new THREE\.Mesh\(new THREE\.BoxGeometry\(doorW, doorH, doorD\), doorMat\)/
  );
  assert.match(
    render,
    /if \(!doorVisualState\.isMirror && !doorVisualState\.isGlass && !canUseStyledDoorVisual\) \{/
  );
  assert.match(render, /if \(boxDoor\.groove === true\) \{/);
  assert.match(render, /addAccent\(`\$\{doorPid\}_accent_top`/);
  assert.doesNotMatch(render, /const handlePid = `\$\{doorPid\}_handle`/);
  assert.match(
    render,
    /doorsArray\.push\(\{[\s\S]*type: 'hinged',[\s\S]*isOpen: (?:doorOpen|layout\.doorOpen),[\s\S]*noGlobalOpen: true,[\s\S]*\}\)/
  );
});

test('free box hover preview stays on the classic path and sketch box clicks toggle box doors', () => {
  const freeHover = [
    read('esm/native/services/canvas_picking_manual_layout_sketch_hover_free_content.ts'),
    read('esm/native/services/canvas_picking_manual_layout_sketch_hover_free_box.ts'),
  ].join('\n');
  const toggle = [
    read('esm/native/services/canvas_picking_toggle_flow.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box_target.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box_runtime.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box_toggle.ts'),
  ].join('\n');
  const render = [
    read('esm/native/builder/render_interior_sketch_ops.ts'),
    read('esm/native/builder/render_interior_sketch_boxes.ts'),
    sketchBoxFrontsBundle(),
  ].join('\n');
  assert.match(freeHover, /resolveSketchFreeBoxContentPreview\(\{/);
  assert.match(freeHover, /resolveSketchFreePlacementBoxPreview\(\{/);
  assert.match(toggle, /resolveSketchBoxToggleTarget\(/);
  assert.match(toggle, /seedSketchBoxDoorMotion\(App, runtimeTarget, nextOpen\)/);
  assert.match(toggle, /source: 'sketchBoxDoorToggle'/);
  assert.match(
    render,
    /const motionSeed = consumeSketchBoxDoorMotionSeed\(App, moduleKeyStr, bid, (?:doorId|layout\.doorId)\);/
  );
  assert.match(render, /doorGroup\.rotation\.y = motionSeed\.rotationY/);
});

test('sketch box door toggles preserve motion seeds for free boxes, patch saved state without rebuild, and allow handle assignment', () => {
  const toggle = [
    read('esm/native/services/canvas_picking_toggle_flow.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box_target.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box_runtime.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box_toggle.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_shared.ts'),
  ].join('\n');
  const render = [
    read('esm/native/builder/render_interior_sketch_ops.ts'),
    read('esm/native/builder/render_interior_sketch_boxes.ts'),
    sketchBoxFrontsBundle(),
  ].join('\n');
  const renderSharedBundle = [
    read('esm/native/builder/render_interior_sketch_shared.ts'),
    read('esm/native/builder/render_interior_sketch_shared_types.ts'),
    read('esm/native/builder/render_interior_sketch_shared_records.ts'),
    read('esm/native/builder/render_interior_sketch_shared_numbers.ts'),
    read('esm/native/builder/render_interior_sketch_shared_external_drawers.ts'),
    read('esm/native/builder/render_interior_sketch_shared_box_doors.ts'),
    read('esm/native/builder/render_interior_sketch_pick_meta.ts'),
  ].join('\n');
  const handleAssign = read('esm/native/services/canvas_picking_handle_assign_flow.ts');

  assert.match(
    toggle,
    /function getSketchBoxDoorMotionSeedKey\([\s\S]*boxId: string,[\s\S]*doorId\?: string \| null[\s\S]*\): string \{/
  );
  assert.match(
    toggle,
    /const scope = moduleKey == null \|\| moduleKey === '' \? '__free__' : String\(moduleKey\);/
  );
  assert.match(toggle, /function applySketchBoxDoorRuntimeState\(/);
  assert.match(toggle, /doorRec\.isOpen = !!nextOpen;/);
  assert.match(toggle, /doorRec\.noGlobalOpen = true;/);
  assert.match(toggle, /noBuild: true,/);
  assert.match(toggle, /noHistory: true,/);
  assert.match(
    renderSharedBundle,
    /export const __SKETCH_BOX_DOOR_MOTION_SEED_KEY = '__wpSketchBoxDoorMotionSeed';/
  );
  assert.match(
    renderSharedBundle,
    /export function consumeSketchBoxDoorMotionSeed\([\s\S]*boxId: string,[\s\S]*doorId\?: string \| null[\s\S]*\):/
  );
  assert.match(renderSharedBundle, /const key = getSketchBoxDoorMotionSeedKey\(moduleKey, boxId, doorId\);/);
  assert.match(handleAssign, /partId\.startsWith\('sketch_box_'\)/);
  assert.match(handleAssign, /partId\.startsWith\('sketch_box_free_'\)/);
});

test('sketch box door preview and edit flows track segment xNorm and route groove/remove through regular door modes', () => {
  const doorPreview = read('esm/native/services/canvas_picking_sketch_box_door_preview.ts');
  const commit = [
    read('esm/native/services/canvas_picking_sketch_box_content_commit.ts'),
    read('esm/native/services/canvas_picking_sketch_box_content_commit_doors.ts'),
    read('esm/native/services/canvas_picking_sketch_box_content_commit_vertical.ts'),
  ].join('\n');
  const coreHelpers = [
    read('esm/native/services/canvas_picking_core_helpers.ts'),
    read('esm/native/services/canvas_picking_door_part_helpers.ts'),
  ].join('\n');
  const hoverTargets = [
    read('esm/native/services/canvas_picking_door_hover_targets_shared.ts'),
    read('esm/native/services/canvas_picking_door_hover_targets_policy.ts'),
  ].join('\n');
  const hoverTargetsFace = read('esm/native/services/canvas_picking_door_hover_targets_preferred_face.ts');
  const doorEdit = read('esm/native/services/canvas_picking_door_hinge_groove_click.ts');

  assert.match(doorPreview, /contentXNorm,/);
  assert.match(commit, /xNorm: contentXNorm,/);
  assert.match(commit, /xNorm: contentXNorm,/);
  assert.match(coreHelpers, /\^sketch_box\(\?:_free\)\?_\.\+_door\(\?:_\|\$\)/);
  assert.match(hoverTargets, /__wpSketchBoxDoor === true/);
  assert.match(
    doorEdit,
    /const nextGroove = !\(current\.groove === true\);[\s\S]*if \(!nextGroove\) return \{ \.\.\.current, groove: false, grooveLinesCount: null \};[\s\S]*return \{[\s\S]*groove: true,[\s\S]*grooveLinesCount: grooveLinesCountForClick,/
  );
});

test('door-action hover supports dedicated handle and hinge face previews', () => {
  const hoverFlow = read('esm/native/services/canvas_picking_hover_flow.ts');
  const hoverFlowCore = read('esm/native/services/canvas_picking_hover_flow_core.ts');
  const hoverFlowNonSplit = read('esm/native/services/canvas_picking_hover_flow_nonsplit.ts');
  const hoverFlowNonSplitFace = read('esm/native/services/canvas_picking_hover_flow_nonsplit_face.ts');
  const hoverFlowNonSplitPreview = bundle(
    'esm/native/services/canvas_picking_hover_flow_nonsplit_preview.ts',
    'esm/native/services/canvas_picking_hover_flow_nonsplit_preview_door.ts'
  );
  const hoverModes = [
    'esm/native/services/canvas_picking_door_action_hover_flow.ts',
    'esm/native/services/canvas_picking_door_action_hover_state.ts',
    'esm/native/services/canvas_picking_door_action_hover_marker.ts',
  ]
    .map(read)
    .join('\n');
  const hoverTargets = [
    read('esm/native/services/canvas_picking_door_hover_targets_shared.ts'),
    read('esm/native/services/canvas_picking_door_hover_targets_policy.ts'),
  ].join('\n');
  const hoverTargetsFace = read('esm/native/services/canvas_picking_door_hover_targets_preferred_face.ts');

  assert.match(
    hoverFlowCore,
    /const __isHandleEditMode = __pm === \(getModeId\(App, 'HANDLE'\) \|\| 'handle'\);/
  );
  assert.match(
    hoverFlowCore,
    /const __isHingeEditMode = __pm === \(getModeId\(App, 'HINGE'\) \|\| 'hinge'\);/
  );
  assert.match(hoverFlowCore, /isHandleEditMode: __isHandleEditMode,/);
  assert.match(hoverFlowCore, /isHingeEditMode: __isHingeEditMode,/);
  assert.match(hoverFlowNonSplit, /resolveNonSplitPreferredFacePreviewState\(args\)/);
  assert.match(hoverFlowNonSplitFace, /const facePreviewHitState = resolveCanvasPickingClickHitState\(\{/);
  assert.match(hoverFlowNonSplitPreview, /preferredFacePreviewPartId,/);
  assert.match(hoverFlowNonSplitPreview, /preferredFacePreviewHitObject,/);
  assert.match(hoverModes, /const isHandleHoverMode = args\.isHandleEditMode === true;/);
  assert.match(hoverModes, /const isHingeHoverMode = args\.isHingeEditMode === true;/);
  assert.match(hoverModes, /const isFacePreviewMode = isHandleHoverMode \|\| isHingeHoverMode;/);
  assert.match(hoverTargetsFace, /export function __resolvePreferredFacePreviewHit\(args:/);
  assert.match(
    hoverModes,
    /const preferredFaceHit =[\s\S]*hoverArgs\.preferredFacePreviewPartId[\s\S]*\? __resolvePreferredFacePreviewHit\(/
  );
  assert.match(
    hoverModes,
    /modeState\.isPaintHoverMode \|\| modeState\.isHandleHoverMode[\s\S]*hoverArgs\.isDoorOrDrawerLikePartId[\s\S]*hoverArgs\.isDoorLikePartId/
  );
  assert.match(
    hoverModes,
    /if \(modeState\.isHingeHoverMode && !__isSingleDoorHingeTarget\(App, hitDoorPid, hitDoorGroup\)\) return null;/
  );
  assert.match(
    hoverTargets,
    /export function __isSingleDoorHingeTarget\([\s\S]*App: AppContainer,[\s\S]*hitDoorPid: string,[\s\S]*hitDoorGroup: HitObjectLike[\s\S]*\): boolean \{/
  );
  assert.match(
    hoverTargets,
    /function __readHingeTargetDoorCount\(App: AppContainer, hitDoorGroup: HitObjectLike\): number \| null \{/
  );
  assert.match(hoverModes, /if \(modeState\.isFacePreviewMode\) \{/);
});

test('sticky edit-mode toast shows a visible stop hint under the main line', () => {
  const feedbackToast = read('esm/native/ui/feedback_toast_sticky.ts');
  const styles = read('css/react_styles.css');

  assert.match(feedbackToast, /el\.className = 'status-texts';/);
  assert.ok(
    feedbackToast.includes("ensureStickyChild(doc, textWrap, '.status-label', 'span', 'status-label')")
  );
  assert.ok(feedbackToast.includes("ensureStickyChild(doc, textWrap, '.status-hint', 'div', 'status-hint')"));
  assert.match(feedbackToast, /hint\.textContent = 'לחץ על ההודעה כדי לצאת ממצב העריכה';/);
  assert.match(
    feedbackToast,
    /export function resolveStickyStatusToastHost\(App: AppContainer, doc: Document\): HTMLElement \{/
  );
  assert.match(
    feedbackToast,
    /const viewer =[\s\S]*asHTMLElement\(\$\('viewer-container'\)\)[\s\S]*asHTMLElement\(doc\.getElementById\('viewer-container'\)\);/
  );
  assert.match(feedbackToast, /host\.appendChild\(el\);/);
  assert.match(styles, /align-items: center;/);
  assert.match(styles, /text-align: center;/);
  assert.match(styles, /position: absolute;/);
  assert.match(styles, /\.sticky-status-toast \.status-texts \{/);
  assert.match(styles, /\.sticky-status-toast \.status-hint \{/);
  assert.match(styles, /\.sticky-status-toast \.status-dot \{/);
});
