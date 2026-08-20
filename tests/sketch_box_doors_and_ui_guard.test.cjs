const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const semanticContracts = import('./_semantic_source_contracts.js');

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
    'esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_materials.ts',
    'esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_routes.ts',
    'esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_core.ts',
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
    'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_types.ts',
    'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_sync.ts',
    'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_dimensions.ts',
    'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_panels.ts',
    'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_base.ts',
    'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_cornice.ts',
    'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_state.ts',
    'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_options.ts',
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
  assert.match(sections, /מחיצה עומדת/);
  assert.match(sections, /מחיצה שוכבת/);
});

test('sketch box renderer keeps the flat-slab path but upgrades free-box profile/double_profile doors through the canonical door visual factory', async () => {
  const {
    assertCallObjectContract,
    getCallFacts,
    getFunctionVariableFacts,
    getVariableFunctionSignatureFact,
  } = await semanticContracts;
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
  const dividerSignature = getVariableFunctionSignatureFact(
    read('esm/native/builder/render_interior_sketch_layout_dividers.ts'),
    'resolveSketchBoxVerticalSegments',
    'render_interior_sketch_layout_dividers.ts'
  );
  assert.ok(dividerSignature?.params[0]?.type?.includes('xNorm?:unknown'));
  assert.match(render, /const doorPid = `\$\{boxPid\}_door_\$\{doorId\}`/);
  assert.match(render, /const doorGroup = new THREE\.Group\(\)/);
  assert.match(render, /segment: resolveSketchBoxSegmentForContent\(/);
  assert.match(
    render,
    /const effectiveDoorStyle = resolveEffectiveDoorStyle\(doorStyle, doorStyleMap, doorPid\);/
  );
  assert.match(render, /export function resolveSketchBoxDoorVisualRoute\(/);
  const visualRouteSource = read(
    'esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_routes.ts'
  );
  const visualRouteVars = getFunctionVariableFacts(
    visualRouteSource,
    'resolveSketchBoxDoorVisualRoute',
    'render_interior_sketch_boxes_fronts_door_visual_routes.ts'
  );
  const styledGate = JSON.stringify(visualRouteVars?.canUseStyledDoorVisual);
  assert.ok(styledGate.includes('hasDoorVisualFactory'));
  assert.ok(styledGate.includes('effectiveDoorStyle'));
  assert.ok(styledGate.includes('profile'));
  assert.ok(styledGate.includes('double_profile'));
  assert.ok(styledGate.includes('isSpecialVisual'));

  const visualCoreSource = read('esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_core.ts');
  const styledVisualCall = getCallFacts(
    visualCoreSource,
    'visualRoute.createDoorVisual',
    'render_interior_sketch_boxes_fronts_door_visual_core.ts'
  ).find(call => call.args[4]?.kind === 'member' && call.args[4]?.path === 'visualRoute.effectiveDoorStyle');
  assert.deepEqual(styledVisualCall?.args[4], { kind: 'member', path: 'visualRoute.effectiveDoorStyle' });
  assert.equal(styledVisualCall?.args[5]?.kind, 'binary');
  assert.deepEqual(styledVisualCall?.args[12], { kind: 'identifier', name: 'doorPid' });
  assert.match(
    render,
    /const doorSlab = new THREE\.Mesh\(new THREE\.BoxGeometry\(doorW, doorH, doorD\), materials\.doorMat\)/
  );
  assert.match(render, /shouldUseClassicAccents: !isSpecialVisual/);
  assert.match(
    render,
    /import \{ appendGrooveStrips \} from '\.\/visuals_and_contents_door_visual_grooves\.js';/
  );
  const accentsSource = read('esm/native/builder/render_interior_sketch_boxes_fronts_door_accents.ts');
  assertCallObjectContract(assert, accentsSource, 'appendGrooveStrips', {
    argIndex: 0,
    requiredProperties: { isSketch: true, groovePartId: true, hasGrooves: true, grooveLayout: true },
    requiredIdentifiers: ['groovesEnabled', 'boxDoor.groove', 'args.grooveLayout'],
    label: 'sketch box groove strips',
  });
  assert.doesNotMatch(render, /if \(groovesEnabled && boxDoor\.groove === true\) \{/);
  assert.match(render, /addAccent\(`\$\{doorPid\}_accent_top`/);
  assert.doesNotMatch(render, /const handlePid = `\$\{doorPid\}_handle`/);
  const doorsSource = read('esm/native/builder/render_interior_sketch_boxes_fronts_doors.ts');
  const doorPush = getCallFacts(doorsSource, 'doorsArray.push').find(call => {
    const entry = call.args[0];
    return (
      entry?.kind === 'object' &&
      entry.properties.type?.kind === 'literal' &&
      entry.properties.type.value === 'hinged' &&
      entry.properties.isOpen?.kind === 'member' &&
      entry.properties.isOpen.path === 'layout.doorOpen' &&
      entry.properties.noGlobalOpen?.kind === 'literal' &&
      entry.properties.noGlobalOpen.value === true
    );
  });
  assert.ok(doorPush, 'sketch box doors should register canonical hinged runtime metadata');
});

test('free box hover preview stays on the classic path and sketch box clicks toggle box doors', async () => {
  const { assertCallObjectContract } = await semanticContracts;
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
    read('esm/native/services/canvas_picking_modules_patch_meta.ts'),
  ].join('\n');
  const render = [
    read('esm/native/builder/render_interior_sketch_ops.ts'),
    read('esm/native/builder/render_interior_sketch_boxes.ts'),
    sketchBoxFrontsBundle(),
  ].join('\n');
  assertCallObjectContract(
    assert,
    read('esm/native/services/canvas_picking_manual_layout_sketch_hover_free_content.ts'),
    'resolveSketchFreeBoxContentPreview',
    {
      argIndex: 0,
      requiredProperties: { contentKind: true },
      requiredIdentifiers: ['basePreviewArgs', 'freeContentKind'],
      label: 'free-box content preview',
    }
  );
  assertCallObjectContract(
    assert,
    read('esm/native/services/canvas_picking_manual_layout_sketch_hover_free_box.ts'),
    'resolveSketchFreePlacementBoxPreview',
    {
      argIndex: 0,
      requiredProperties: { boxH: true, widthOverrideM: true, depthOverrideM: true },
      requiredIdentifiers: ['App', 'tool', 'host', 'planeHit'],
      label: 'free-box placement preview',
    }
  );
  assert.match(toggle, /resolveSketchBoxToggleTarget\(/);
  assert.match(toggle, /seedSketchBoxDoorMotion\(App, runtimeTarget, nextOpen\)/);
  assert.match(toggle, /createCanvasPickingModulesMotionPatchMeta\('sketchBoxDoorToggle'\)/);
  assert.match(
    render,
    /const motionSeed = consumeSketchBoxDoorMotionSeed\(App, moduleKeyStr, bid, (?:doorId|layout\.doorId)\);/
  );
  assert.match(render, /doorGroup\.rotation\.y = motionSeed\.rotationY/);
});

test('sketch box door toggles preserve motion seeds for free boxes, patch saved state without rebuild, and allow handle assignment', async () => {
  const { getFunctionSignatureFact } = await semanticContracts;
  const toggle = [
    read('esm/native/services/canvas_picking_toggle_flow.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box_target.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box_runtime.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box_toggle.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_shared.ts'),
    read('esm/native/services/canvas_picking_modules_patch_meta.ts'),
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

  assert.deepEqual(
    getFunctionSignatureFact(
      read('esm/native/services/canvas_picking_toggle_flow_sketch_box_runtime.ts'),
      'getSketchBoxDoorMotionSeedKey'
    ),
    {
      name: 'getSketchBoxDoorMotionSeedKey',
      async: false,
      params: [
        { name: 'moduleKey', optional: false, type: 'null|string|undefined' },
        { name: 'boxId', optional: false, type: 'string' },
        { name: 'doorId', optional: true, type: 'null|string' },
      ],
      returnType: 'string',
    }
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
  assert.deepEqual(
    getFunctionSignatureFact(
      read('esm/native/builder/render_interior_sketch_pick_meta.ts'),
      'consumeSketchBoxDoorMotionSeed'
    ),
    {
      name: 'consumeSketchBoxDoorMotionSeed',
      async: false,
      params: [
        { name: 'App', optional: false, type: 'AppContainer' },
        { name: 'moduleKey', optional: false, type: 'string' },
        { name: 'boxId', optional: false, type: 'string' },
        { name: 'doorId', optional: true, type: 'null|string' },
      ],
      returnType: 'null|type{rotationY:number;nextOpen:boolean}',
    }
  );
  assert.match(renderSharedBundle, /const key = getSketchBoxDoorMotionSeedKey\(moduleKey, boxId, doorId\);/);
  assert.match(handleAssign, /function isDoorPartId\(partId: string\): boolean \{/);
  assert.match(handleAssign, /return __wp_isDoorLikePartId\(partId\);/);
  assert.match(handleAssign, /function isDrawerPartId\(partId: string\): boolean \{/);
  assert.match(handleAssign, /return __wp_isDrawerLikePartId\(partId\);/);
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
  assert.match(doorEdit, /patchSketchBoxDoor\(/);
  // Groove on/off/count semantics are covered by the segmented sketch-box groove runtime tests
  // and canvas_picking_door_groove_click_refresh_runtime; avoid freezing the callback body syntax here.
});

test('door-action hover supports dedicated handle and hinge face previews', async () => {
  const { assertCallObjectContract, getFunctionSignatureFact, getFunctionVariableFacts } =
    await semanticContracts;
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

  assert.match(hoverFlowCore, /const __isHandleEditMode = __pm === \(getModeId\('HANDLE'\) \|\| 'handle'\);/);
  assert.match(hoverFlowCore, /const __isHingeEditMode = __pm === \(getModeId\('HINGE'\) \|\| 'hinge'\);/);
  assert.match(hoverFlowCore, /isHandleEditMode: __isHandleEditMode,/);
  assert.match(hoverFlowCore, /isHingeEditMode: __isHingeEditMode,/);
  assert.match(hoverFlowNonSplit, /resolveNonSplitPreferredFacePreviewState\(args\)/);
  assertCallObjectContract(assert, hoverFlowNonSplitFace, 'resolveCanvasPickingClickHitState', {
    argIndex: 0,
    requiredProperties: {
      App: true,
      ndcX: true,
      ndcY: true,
      isRemoveDoorMode: false,
      raycaster: true,
      mouse: true,
    },
    label: 'preferred-face hover hit-state',
  });
  assert.match(hoverFlowNonSplitPreview, /preferredFacePreviewPartId,/);
  assert.match(hoverFlowNonSplitPreview, /preferredFacePreviewHitObject,/);
  assert.match(hoverModes, /const isHandleHoverMode = args\.isHandleEditMode === true;/);
  assert.match(hoverModes, /const isHingeHoverMode = args\.isHingeEditMode === true;/);
  assert.match(hoverModes, /const isFacePreviewMode = isHandleHoverMode \|\| isHingeHoverMode;/);
  assert.match(hoverTargetsFace, /export function __resolvePreferredFacePreviewHit\(args:/);
  assert.match(
    hoverModes,
    /const preferredFacePreviewPartId = hoverArgs\.preferredFacePreviewPartId \|\| null;/
  );
  const hoverStateSource = read('esm/native/services/canvas_picking_door_action_hover_state.ts');
  const hoverStateVars = getFunctionVariableFacts(
    hoverStateSource,
    'resolveDoorActionHoverState',
    'canvas_picking_door_action_hover_state.ts'
  );
  const preferredGate = JSON.stringify(hoverStateVars?.canUsePreferredFacePreviewHit);
  assert.ok(preferredGate.includes('modeState.isFacePreviewMode'));
  assert.ok(preferredGate.includes('preferredFacePreviewPartId'));
  assert.equal(hoverStateVars?.preferredFaceHit?.kind, 'conditional');
  assert.equal(hoverStateVars?.preferredFaceHit?.consequent?.callee, '__resolvePreferredFacePreviewHit');
  const matcherFact = JSON.stringify(hoverStateVars?.hoverPartMatcher);
  assert.ok(matcherFact.includes('__wp_isDoorTrimActionTargetPartId'));
  assert.ok(matcherFact.includes('hoverArgs.isDoorOrDrawerLikePartId'));
  assert.ok(matcherFact.includes('hoverArgs.isDoorLikePartId'));
  assert.match(
    hoverModes,
    /if \(modeState\.isHingeHoverMode && !__isSingleDoorHingeTarget\(App, hitDoorPid, hitDoorGroup\)\) return null;/
  );
  assert.deepEqual(
    getFunctionSignatureFact(
      read('esm/native/services/canvas_picking_door_hover_targets_policy.ts'),
      '__isSingleDoorHingeTarget'
    ),
    {
      name: '__isSingleDoorHingeTarget',
      async: false,
      params: [
        { name: 'App', optional: false, type: 'AppContainer' },
        { name: 'hitDoorPid', optional: false, type: 'string' },
        { name: 'hitDoorGroup', optional: false, type: 'HitObjectLike' },
      ],
      returnType: 'boolean',
    }
  );
  assert.match(
    hoverTargets,
    /function __readHingeTargetDoorCount\(App: AppContainer, hitDoorGroup: HitObjectLike\): number \| null \{/
  );
  assert.match(hoverModes, /if \(modeState\.isFacePreviewMode\) \{/);
});

test('sticky edit-mode toast shows a visible stop hint under the main line', async () => {
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
  const { getFunctionVariableFacts } = await semanticContracts;
  const hostVars = getFunctionVariableFacts(
    feedbackToast,
    'resolveStickyStatusToastHost',
    'feedback_toast_sticky.ts'
  );
  const viewerFact = JSON.stringify(hostVars?.viewer);
  assert.ok(viewerFact.includes('asHTMLElement'));
  assert.ok(viewerFact.includes('viewer-container'));
  assert.ok(viewerFact.includes('doc.getElementById'));
  assert.match(feedbackToast, /host\.appendChild\(el\);/);
  assert.match(styles, /align-items: center;/);
  assert.match(styles, /text-align: center;/);
  assert.match(styles, /position: absolute;/);
  assert.match(styles, /\.sticky-status-toast \.status-texts \{/);
  assert.match(styles, /\.sticky-status-toast \.status-hint \{/);
  assert.match(styles, /\.sticky-status-toast \.status-dot \{/);
});
